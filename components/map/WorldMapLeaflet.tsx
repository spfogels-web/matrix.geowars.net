'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ConflictZone, GeoEvent, Leader, WorldState } from '@/lib/engine/types';
import { REGION_COORDS, LEADER_COORDS, LEADER_NAMES, LEADER_FLAGS } from '@/lib/engine/mapConstants';
import CrisisLog from './CrisisLog';
import CinematicFeed from './CinematicFeed';
import NewsMarquee from './NewsMarquee';
import BlackoutLayer, { BlackoutZone } from './layers/BlackoutLayer';
import EventFocusController from './layers/EventFocusController';
import MissileArcLayer from './layers/MissileArcLayer';
import ImpactPulseLayer from './layers/ImpactPulseLayer';
import CinematicGoogleMap from './layers/CinematicGoogleMap';

// ── Constants ─────────────────────────────────────────────────────────────────
// REGION_COORDS, LEADER_COORDS, LEADER_NAMES, LEADER_FLAGS imported from @/lib/engine/mapConstants
// Named naval vessels: [lng, lat, shipName, type]
const NAVAL_VESSELS: Record<string, [number,number,string,'carrier'|'destroyer'|'frigate'][]> = {
  usa:[
    [-65,36,'USS Gerald R. Ford','carrier'],
    [-124,35,'USS Ronald Reagan','carrier'],
    [-88,24,'USS Arleigh Burke','destroyer'],
    [-30,38,'USS Nimitz','carrier'],
    [130,32,'USS Carl Vinson','carrier'],
  ],
  russia:[
    [29,69,'Admiral Kuznetsov','carrier'],
    [155,50,'Marshal Ustinov','destroyer'],
    [22,60,'Admiral Nakhimov','destroyer'],
  ],
  china:[
    [122,28,'CNS Fujian','carrier'],
    [113,20,'CNS Liaoning','carrier'],
    [121,13,'CNS Shandong','carrier'],
  ],
  uk:[[-4,54,'HMS Queen Elizabeth','carrier'],[-2,50,'HMS Prince of Wales','carrier']],
  france:[[5,43,'FS Charles de Gaulle','carrier'],[-2,47,'FS Aquitaine','frigate']],
  india:[[72,18,'INS Vikrant','carrier'],[80,11,'INS Kolkata','destroyer']],
  iran:[[56,23,'IRIS Jamaran','frigate'],[52,27,'IRIS Alborz','frigate']],
  northkorea:[[129,39,'KPN Paektusan','destroyer']],
  saudiarabia:[[37,22,'HNS Makkah','frigate'],[50,26,'HNS Tabuk','frigate']],
  israel:[[34,29,'INS Leviathan','destroyer']],
  japan:[[135,34,'JS Kaga','carrier'],[140,38,'JS Izumo','carrier']],
  taiwan:[[121,22,'ROCS Yi Hua','frigate']],
};

// Named submarines: [lng, lat, subName]
const NAMED_SUBS: Record<string, [number,number,string][]> = {
  usa:[[-50,42,'USS Ohio (SSBN)'],[- 35,55,'USS Michigan (SSBN)'],[-120,40,'USS Connecticut (SSN)']],
  russia:[[18,73,'K-18 Karelia (SSBN)'],[35,68,'K-560 Severodvinsk (SSN)']],
  china:[[130,16,'Type 094 Jin-class'],[118,22,'Type 093 Shang-class']],
  uk:[[-16,58,'HMS Vanguard (SSBN)'],[- 5,54,'HMS Astute (SSN)']],
  france:[[-10,49,'FS Le Triomphant'],[- 5,47,'FS Barracuda']],
  india:[[76,8,'INS Arihant (SSBN)']],
  northkorea:[[133,35,'Sinpo-class SSBN']],
};
const TYPE_COLORS: Record<string, string> = {
  military:'#ff2d55',economic:'#ffd700',cyber:'#00f5ff',
  diplomatic:'#b44fff',intelligence:'#00ff9d',nuclear:'#ff2d55',humanitarian:'#ff6a00',
};
const SEV_COLORS: Record<string, string> = {
  low:'#00ff9d',medium:'#ffd700',high:'#ff6a00',critical:'#ff2d55',
};

// ── Types ────────────────────────────────────────────────────────────────────
type UnitKind = 'jet'|'missile'|'nuclear'|'naval'|'submarine'|'troops';
interface MapUnit {
  id:string; kind:UnitKind; from:[number,number]; to:[number,number];
  originLabel:string; progress:number; color:string; speed:number; exploding:boolean;
}
interface Arc { id:string; from:[number,number]; to:[number,number]; color:string; }
interface StrikeRecord {
  id:string; title:string; origin:string; target:string;
  type:string; impact:number; timestamp:number; color:string;
}
// Tracks active cyber/EMP events for the blackout overlay
interface ActiveBlackout {
  id:string; lat:number; lng:number; radiusKm:number;
  color:string; label:string; type:'cyber'|'emp'|'blackout';
  createdAt:number; duration:number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
// lerp / easeInOut live in ImpactPulseLayer — not needed here
function getUnitConfig(ev:GeoEvent){
  const t=(ev.title+ev.description).toLowerCase();
  if(ev.type==='nuclear') return {kind:'nuclear' as UnitKind,speed:0.004};
  if(t.includes('submarine')||t.includes('sub ')) return {kind:'submarine' as UnitKind,speed:0.007};
  if(t.includes('naval')||t.includes('fleet')||t.includes('carrier')||t.includes('ship')) return {kind:'naval' as UnitKind,speed:0.007};
  if(t.includes('missile')||t.includes('rocket')||t.includes('hypersonic')||t.includes('ballistic')) return {kind:'missile' as UnitKind,speed:0.022};
  if(t.includes('air')||t.includes('jet')||t.includes('fighter')||t.includes('bomber')||t.includes('strike')) return {kind:'jet' as UnitKind,speed:0.014};
  return {kind:'jet' as UnitKind,speed:0.014};
}

function playSound(soundType:string, impact:number, ctxRef:React.MutableRefObject<AudioContext|null>){
  try {
    if(!ctxRef.current) ctxRef.current=new AudioContext();
    const ctx=ctxRef.current;
    if(ctx.state==='suspended') ctx.resume();
    const vol=0.07+(impact/10)*0.13, now=ctx.currentTime;
    if(soundType==='nuclear'){
      [40,60,80,160,320].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(ctx.destination);
        o.type='sawtooth';o.frequency.setValueAtTime(f,now+i*0.06);
        o.frequency.exponentialRampToValueAtTime(f*1.6,now+i*0.06+0.6);
        g.gain.setValueAtTime(vol*1.4,now+i*0.06);
        g.gain.exponentialRampToValueAtTime(0.0001,now+i*0.06+1.0);
        o.start(now+i*0.06);o.stop(now+i*0.06+1.0);
      });
    } else if(soundType==='jet'){
      const osc=ctx.createOscillator(),noise=ctx.createOscillator(),g=ctx.createGain();
      osc.type='sawtooth';noise.type='square';
      osc.frequency.setValueAtTime(120,now);osc.frequency.exponentialRampToValueAtTime(340,now+0.3);
      osc.frequency.exponentialRampToValueAtTime(80,now+1.0);
      noise.frequency.setValueAtTime(1800,now);noise.frequency.exponentialRampToValueAtTime(400,now+1.0);
      g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(vol,now+0.12);
      g.gain.setValueAtTime(vol,now+0.5);g.gain.exponentialRampToValueAtTime(0.0001,now+1.2);
      osc.connect(g);noise.connect(g);g.connect(ctx.destination);
      osc.start(now);noise.start(now);osc.stop(now+1.2);noise.stop(now+1.2);
    } else if(soundType==='missile'){
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sawtooth';o.connect(g);g.connect(ctx.destination);
      o.frequency.setValueAtTime(200,now);o.frequency.exponentialRampToValueAtTime(900,now+0.25);
      g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(0.0001,now+0.28);
      o.start(now);o.stop(now+0.28);
    } else if(soundType==='sonar'){
      [0,0.6,1.2].forEach(delay=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sine';o.frequency.value=840;o.connect(g);g.connect(ctx.destination);
        g.gain.setValueAtTime(vol*0.6,now+delay);g.gain.exponentialRampToValueAtTime(0.0001,now+delay+0.4);
        o.start(now+delay);o.stop(now+delay+0.4);
      });
    } else {
      [220,330,440].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sawtooth';o.frequency.value=f;o.connect(g);g.connect(ctx.destination);
        g.gain.setValueAtTime(vol,now+i*0.07);g.gain.exponentialRampToValueAtTime(0.0001,now+i*0.07+0.15);
        o.start(now+i*0.07);o.stop(now+i*0.07+0.15);
      });
    }
  } catch(_){}
}

// ── Game overlay: all animated elements as SVG ────────────────────────────────
interface OverlayProps {
  map: L.Map;
  mapVersion: number;
  leaders: Leader[];
  conflictZones: ConflictZone[];
  isRunning: boolean;
  tension: number;
}
function GameOverlay({ map, mapVersion, leaders, conflictZones, isRunning, tension }: OverlayProps) {
  void mapVersion; // forces re-render on map pan/zoom
  const size = map.getSize();
  const W = size.x, H = size.y;
  const [hoveredVessel, setHoveredVessel] = useState<{label:string;x:number;y:number}|null>(null);

  // Convert [lng, lat] → container pixel [x, y]
  const px = useCallback((lng: number, lat: number): [number, number] => {
    const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
    return [pt.x, pt.y];
  }, [map]);

  const tc = tension>=75?'#ff2d55':tension>=55?'#ff6a00':tension>=30?'#ffd700':'#00f5ff';
  const activeLeaderIds = new Set(leaders.filter(l=>l.status==='at_war'||l.status==='mobilizing'||l.status==='hostile').map(l=>l.id));

  return (
    <>
    {/* Vessel hover tooltip */}
    {hoveredVessel && (
      <div style={{
        position:'absolute', zIndex:900,
        left: Math.min(hoveredVessel.x+12, W-240),
        top: Math.max(hoveredVessel.y-48, 44),
        pointerEvents:'none',
        background:'rgba(2,8,24,0.97)',
        border:'1px solid rgba(0,200,255,0.55)',
        borderRadius:'7px', padding:'7px 13px',
        fontFamily:'Share Tech Mono, monospace',
        fontSize:'12px', color:'#00f5ff',
        letterSpacing:'0.08em', whiteSpace:'nowrap',
        boxShadow:'0 0 20px rgba(0,200,255,0.25)',
      }}>
        {hoveredVessel.label}
      </div>
    )}
    <svg
      style={{ position:'absolute', top:0, left:0, width:W, height:H, pointerEvents:'none', zIndex:500, overflow:'visible' }}
    >
      <defs>
        {/* Glow filter for all SVG elements */}
        <filter id="glow-sm" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-md" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="glow-lg" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="arc-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Arcs and moving units rendered by dedicated layer components ── */}
      {/* See MissileArcLayer and ImpactPulseLayer mounted in WorldMapLeaflet */}

      {/* ── Conflict zone pulses ── */}
      {conflictZones.map(zone=>{
        const coords=(REGION_COORDS[zone.name]||REGION_COORDS[zone.region]||[0,20]) as [number,number];
        const [cx,cy]=px(coords[0],coords[1]);
        const color=SEV_COLORS[zone.severity];
        const r=zone.severity==='critical'?16:zone.severity==='high'?12:9;
        const isCrit=zone.severity==='critical';
        return(
          <g key={zone.id}>
            {/* Heatmap glow under high-conflict regions */}
            <radialGradient id={`heat-${zone.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </radialGradient>
            <circle cx={cx} cy={cy} r={r*5} fill={`url(#heat-${zone.id})`}/>

            {/* Slow outer ring */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={isCrit?2:1.5} opacity={0}>
              <animate attributeName="r" values={`${r};${r*4.5}`} dur={isCrit?'1.8s':'2.8s'} repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.8;0" dur={isCrit?'1.8s':'2.8s'} repeatCount="indefinite"/>
            </circle>
            {/* Mid ring offset */}
            <circle cx={cx} cy={cy} r={r*0.7} fill="none" stroke={color} strokeWidth={1} opacity={0}>
              <animate attributeName="r" values={`${r*0.7};${r*3}`} dur={isCrit?'1.8s':'2.8s'} begin="0.6s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0" dur={isCrit?'1.8s':'2.8s'} begin="0.6s" repeatCount="indefinite"/>
            </circle>
            {/* Inner ring */}
            <circle cx={cx} cy={cy} r={r*0.4} fill="none" stroke={color} strokeWidth={1} opacity={0}>
              <animate attributeName="r" values={`${r*0.4};${r*1.8}`} dur={isCrit?'1.8s':'2.8s'} begin="1.1s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0" dur={isCrit?'1.8s':'2.8s'} begin="1.1s" repeatCount="indefinite"/>
            </circle>

            {/* Core marker */}
            <circle cx={cx} cy={cy} r={r*0.55} fill={color} opacity={0.9} filter="url(#glow-md)"/>
            <circle cx={cx} cy={cy} r={r*0.22} fill="white" opacity={0.95}/>

            {/* Labels with stroke outline for readability */}
            <text x={cx+r*0.7} y={cy-r*0.4} style={{
              fontSize:'10px',fill:color,fontFamily:'Share Tech Mono, monospace',fontWeight:'bold',
              paintOrder:'stroke',stroke:'rgba(0,0,0,0.95)',strokeWidth:'3px',
            }}>
              {zone.name}
            </text>
            <text x={cx+r*0.7} y={cy+r*0.8} style={{
              fontSize:'8px',fill:`${color}cc`,fontFamily:'Share Tech Mono, monospace',
              paintOrder:'stroke',stroke:'rgba(0,0,0,0.9)',strokeWidth:'2px',
            }}>
              {zone.severity.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* ── Active leader capitals ── */}
      {isRunning && leaders.slice(0,18).map(leader=>{
        const coords=LEADER_COORDS[leader.id];
        if(!coords) return null;
        const [cx,cy]=px(coords[0],coords[1]);
        const isWar=activeLeaderIds.has(leader.id);
        const lc=leader.color||tc;
        return(
          <g key={`cap_${leader.id}`}>
            {isWar&&(
              <circle cx={cx} cy={cy} r={0} fill="none" stroke={lc} strokeWidth={1}>
                <animate attributeName="r" values="0;20" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="indefinite"/>
              </circle>
            )}
            <circle cx={cx} cy={cy} r={isWar?6:4} fill={lc} opacity={0.9} filter={isWar?'url(#glow-md)':'url(#glow-sm)'}/>
            <circle cx={cx} cy={cy} r={isWar?3:2} fill="white" opacity={0.95}/>
            <text x={cx+8} y={cy-5} style={{fontSize:'9px',fill:lc,fontFamily:'Share Tech Mono, monospace',fontWeight:'bold',
              paintOrder:'stroke',stroke:'rgba(0,0,10,0.98)',strokeWidth:'4px'}}>
              {LEADER_FLAGS[leader.id]||''} {LEADER_NAMES[leader.id]||leader.id.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* ── Naval vessels (carriers, destroyers, frigates) ── */}
      {isRunning && leaders.map(leader=>{
        const vessels=NAVAL_VESSELS[leader.id];
        if(!vessels) return null;
        const lc=leader.color||tc;
        return vessels.map(([lng,lat,shipName,shipType],i)=>{
          const [bx,by]=px(lng,lat);
          const sym=shipType==='carrier'?'⬟':shipType==='destroyer'?'▶':'◆';
          const r=shipType==='carrier'?7:shipType==='destroyer'?5.5:4.5;
          const label=`${LEADER_NAMES[leader.id]||leader.id.toUpperCase()} · ${shipName} · ${shipType.toUpperCase()}`;
          return(
            <g key={`nav_${leader.id}_${i}`}
              style={{cursor:'pointer',pointerEvents:'all'}}
              onMouseEnter={()=>setHoveredVessel({label,x:bx,y:by})}
              onMouseLeave={()=>setHoveredVessel(null)}>
              {/* Sonar ping */}
              <circle cx={bx} cy={by} r={r} fill="none" stroke={lc} strokeWidth={1} opacity={0}>
                <animate attributeName="r" values={`${r};${r*3.5}`} dur="3s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7;0" dur="3s" repeatCount="indefinite"/>
              </circle>
              {/* Hull */}
              <circle cx={bx} cy={by} r={r} fill={lc} opacity={0.85} filter="url(#glow-sm)"/>
              <circle cx={bx} cy={by} r={r*0.45} fill="white" opacity={0.9}/>
              {/* Symbol */}
              <text x={bx} y={by-r-3} textAnchor="middle" style={{
                fontSize:'8px',fill:lc,fontFamily:'Share Tech Mono,monospace',fontWeight:'bold',
                paintOrder:'stroke',stroke:'rgba(0,0,0,0.95)',strokeWidth:'3px',
              }}>{sym}</text>
            </g>
          );
        });
      })}

      {/* ── Submarines ── */}
      {isRunning && leaders.map(leader=>{
        const subs=NAMED_SUBS[leader.id];
        if(!subs) return null;
        const lc=leader.color||tc;
        return subs.map(([lng,lat,subName],i)=>{
          const [sx,sy]=px(lng,lat);
          const label=`${LEADER_NAMES[leader.id]||leader.id.toUpperCase()} · ${subName} · SUBMARINE`;
          return(
            <g key={`sub_${leader.id}_${i}`}
              style={{cursor:'pointer',pointerEvents:'all'}}
              onMouseEnter={()=>setHoveredVessel({label,x:sx,y:sy})}
              onMouseLeave={()=>setHoveredVessel(null)}>
              {/* Sonar ping */}
              <circle cx={sx} cy={sy} r={0} fill="none" stroke={lc} strokeWidth={1} opacity={0.5}>
                <animate attributeName="r" values="0;18" dur="4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0" dur="4s" repeatCount="indefinite"/>
              </circle>
              {/* Sub hull — elongated */}
              <ellipse cx={sx} cy={sy} rx={9} ry={3.5} fill={lc} opacity={0.8} filter="url(#glow-sm)"/>
              <ellipse cx={sx} cy={sy} rx={4} ry={1.5} fill="white" opacity={0.7}/>
              {/* Conning tower */}
              <rect x={sx-1.5} y={sy-7} width={3} height={4} rx={1} fill={lc} opacity={0.9}/>
            </g>
          );
        });
      })}
    </svg>
    </>
  );
}

// ── Death Toll Counter ────────────────────────────────────────────────────────
function DeathTollCounter({ deaths, isRunning }: { deaths: number; isRunning: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(0);

  useEffect(() => {
    if (deaths === prevRef.current) return;
    const delta = deaths - prevRef.current;
    prevRef.current = deaths;
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
    // Animate count up over ~600ms
    const steps = 24;
    const stepSize = delta / steps;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(prev => Math.round(prev + stepSize));
      if (i >= steps) clearInterval(interval);
    }, 25);
    return () => clearInterval(interval);
  }, [deaths]);

  function fmt(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toLocaleString();
  }

  const deathColor = deaths >= 500000 ? '#ff2d55' : deaths >= 50000 ? '#ff6a00' : deaths >= 1000 ? '#ffd700' : '#ff6a00';

  return (
    <div className="absolute pointer-events-none" style={{
      top: 48, right: 12, zIndex: 500,
      background: 'rgba(0,0,0,0.88)',
      border: `1px solid ${flash ? deathColor : deathColor + '60'}`,
      borderRadius: '8px',
      padding: '8px 14px',
      backdropFilter: 'blur(10px)',
      boxShadow: flash ? `0 0 20px ${deathColor}60` : `0 0 8px rgba(0,0,0,0.6)`,
      transition: 'border-color 0.3s, box-shadow 0.3s',
      minWidth: '140px',
    }}>
      <div className="font-mono" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '8px', letterSpacing: '0.22em', marginBottom: '3px' }}>
        ☠ SIMULATION CASUALTIES
      </div>
      <div className="font-orbitron font-black" style={{
        color: deathColor, fontSize: '22px', lineHeight: 1, letterSpacing: '0.04em',
        textShadow: flash ? `0 0 20px ${deathColor}` : 'none',
        transition: 'text-shadow 0.3s',
      }}>
        {fmt(displayed)}
      </div>
      {!isRunning && displayed === 0 && (
        <div className="font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', marginTop: '2px' }}>
          AWAITING SIM
        </div>
      )}
    </div>
  );
}

// ── World Population Counter ───────────────────────────────────────────────────
const WORLD_POP_BASE = 8_119_000_000;

function WorldPopCounter({ deaths, isRunning }: { deaths: number; isRunning: boolean }) {
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevDeaths = useRef(0);

  // Natural births add ~4.4 people/sec, deaths ~1.8/sec = net +2.6/sec
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (deaths !== prevDeaths.current) {
      prevDeaths.current = deaths;
      setFlash(true);
      setTimeout(() => setFlash(false), 800);
    }
  }, [deaths]);

  const naturalBirths = tick * 4.4;
  const naturalDeaths = tick * 1.8;
  const currentPop = Math.round(WORLD_POP_BASE + naturalBirths - naturalDeaths - deaths);

  function fmtPop(n: number) {
    if (expanded) return n.toLocaleString();
    return (n / 1_000_000_000).toFixed(6) + 'B';
  }

  const borderColor = flash ? '#ff2d55' : expanded ? 'rgba(0,245,255,0.5)' : 'rgba(0,245,255,0.25)';
  const glowShadow  = flash
    ? '0 0 22px rgba(255,45,85,0.55)'
    : expanded
      ? '0 0 22px rgba(0,245,255,0.2), 0 0 8px rgba(0,0,0,0.7)'
      : '0 0 8px rgba(0,0,0,0.6)';

  return (
    <div
      className="absolute"
      style={{
        bottom: 36, left: 12, zIndex: 500,
        background: expanded ? 'rgba(0,0,0,0.95)' : 'rgba(0,0,0,0.88)',
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        padding: expanded ? '14px 20px' : '9px 16px',
        backdropFilter: 'blur(12px)',
        boxShadow: glowShadow,
        transition: 'border-color 0.3s, box-shadow 0.3s, padding 0.25s',
        minWidth: expanded ? '280px' : '190px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => setExpanded(e => !e)}
      title={expanded ? 'Collapse' : 'Expand'}
    >
      {/* Label row */}
      <div className="flex items-center justify-between" style={{ marginBottom: expanded ? '8px' : '4px' }}>
        <div className="font-mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: expanded ? '9px' : '8px', letterSpacing: '0.22em' }}>
          🌍 WORLD POPULATION
        </div>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginLeft: '8px' }}>
          {expanded ? '▼' : '▲'}
        </span>
      </div>

      {/* Main number */}
      <div className="font-orbitron font-black" style={{
        color: '#ffffff',
        fontSize: expanded ? '22px' : '17px',
        lineHeight: 1,
        letterSpacing: expanded ? '0.03em' : '0.04em',
        fontVariantNumeric: 'tabular-nums',
        textShadow: flash
          ? '0 0 18px rgba(255,106,0,0.9)'
          : expanded
            ? '0 0 14px rgba(255,255,255,0.25)'
            : '0 0 6px rgba(255,255,255,0.15)',
        transition: 'color 0.3s, text-shadow 0.3s, font-size 0.25s',
      }}>
        {isRunning || deaths > 0 ? fmtPop(currentPop) : fmtPop(WORLD_POP_BASE)}
      </div>

      {/* Stats row — always visible */}
      <div className="flex items-center gap-3 mt-2">
        <span className="font-mono" style={{ color: '#00ff9d', fontSize: expanded ? '10px' : '8px' }}>
          ▲ {isRunning ? '+4.4/s births' : 'STANDBY'}
        </span>
        {deaths > 0 && (
          <span className="font-mono" style={{ color: '#ff2d55', fontSize: expanded ? '10px' : '8px' }}>
            ▼ {deaths >= 1_000_000 ? (deaths / 1_000_000).toFixed(2) + 'M' : deaths >= 1000 ? (deaths / 1000).toFixed(1) + 'K' : deaths} sim deaths
          </span>
        )}
      </div>

      {/* Expanded detail rows */}
      {expanded && (
        <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="flex justify-between font-mono" style={{ fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Session births</span>
            <span style={{ color: '#00ff9d' }}>+{Math.round(naturalBirths).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-mono" style={{ fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Natural deaths</span>
            <span style={{ color: 'rgba(255,100,100,0.7)' }}>−{Math.round(naturalDeaths).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-mono" style={{ fontSize: '10px' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Conflict casualties</span>
            <span style={{ color: deaths > 0 ? '#ff2d55' : 'rgba(255,255,255,0.25)' }}>
              −{deaths.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between font-mono" style={{ fontSize: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>Net change</span>
            <span style={{ color: (naturalBirths - naturalDeaths - deaths) >= 0 ? '#00ff9d' : '#ff2d55' }}>
              {(naturalBirths - naturalDeaths - deaths) >= 0 ? '+' : ''}
              {Math.round(naturalBirths - naturalDeaths - deaths).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  conflictZones: ConflictZone[];
  events: GeoEvent[];
  tension: number;
  isRunning: boolean;
  leaders: Leader[];
  isExpanded: boolean;
  onExpandToggle: () => void;
  breakingIntel?: string[];
  worldState?: WorldState;
  onInitiate?: () => void;
  /** When set, the map pans/zooms to this event's location */
  focusedEvent?: GeoEvent | null;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WorldMapLeaflet({ conflictZones, events, tension, isRunning, leaders, breakingIntel=[], worldState, focusedEvent }: Props) {
  const [arcs, setArcs]   = useState<Arc[]>([]);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [flashColor, setFlashColor] = useState<string|null>(null);
  const [feedActive, setFeedActive] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const [leafletMap, setLeafletMap] = useState<L.Map|null>(null);
  const [mousePos, setMousePos] = useState({x:0,y:0});
  const [hoveredCity] = useState<string|null>(null);
  const [strikeLog, setStrikeLog] = useState<StrikeRecord[]>([]);
  const [strikeReportOpen, setStrikeReportOpen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [activeBlackouts, setActiveBlackouts] = useState<ActiveBlackout[]>([]);
  const [gmapEvent, setGmapEvent] = useState<GeoEvent | null>(null);

  type CinPhase = 'alert'|'zoom'|'missile'|'impact'|'shockwave'|'report'|'done';
  const [cinematic, setCinematic] = useState<{
    active:boolean; phase:CinPhase; color:string; label:string;
    originLabel:string; targetLabel:string; eventType:string; impact:number;
    // Store geographic coords so pixel positions stay accurate after map pans/zooms
    originLatLng:[number,number]; targetLatLng:[number,number]; // [lat, lng]
    cinW:number; cinH:number;
    casualties:string;
  }>({active:false,phase:'done',color:'#ff2d55',label:'',originLabel:'',targetLabel:'',
    eventType:'military',impact:8,
    originLatLng:[31.5,35],targetLatLng:[32,54],
    cinW:900,cinH:500,casualties:''});

  const mapDivRef          = useRef<HTMLDivElement>(null);
  const leafletMapRef      = useRef<L.Map|null>(null);
  const audioCtxRef        = useRef<AudioContext|null>(null);
  const cinematicRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const unitAnimRef        = useRef<ReturnType<typeof setInterval>|null>(null);
  const unitsRef           = useRef<MapUnit[]>([]);
  const lastEvIdRef        = useRef<string|null>(null);
  const cinematicActiveRef = useRef(false);

  // ── Initialize Leaflet map imperatively (no react-leaflet) ─────────────────
  useEffect(() => {
    if (!mapDivRef.current || leafletMapRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [35, 30],
      zoom: 4,
      minZoom: 3,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: false,
      zoomSnap: 0.5,
    });

    // ESRI World Topo Map — terrain relief, mountains, vivid colors (free, no API key)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { attribution: '© Esri', maxZoom: 18 }
    ).addTo(map);

    const onMove = () => setMapVersion(v => v + 1);
    map.on('move', onMove);
    map.on('zoom', onMove);
    map.on('moveend', onMove);
    map.on('zoomend', onMove);

    leafletMapRef.current = map;
    setLeafletMap(map);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Unit animation loop ────────────────────────────────────────────────────
  useEffect(()=>{
    if(unitAnimRef.current) clearInterval(unitAnimRef.current);
    unitAnimRef.current=setInterval(()=>{
      if(unitsRef.current.length===0) return;
      let changed=false;
      unitsRef.current=unitsRef.current.map(u=>{
        if(u.exploding){changed=true;return{...u,progress:u.progress+0.05};}
        if(u.progress>=1) return u;
        changed=true;
        const np=u.progress+u.speed;
        if(np>=1) return{...u,progress:1,exploding:true};
        return{...u,progress:np};
      }).filter(u=>!(u.exploding&&u.progress>1.8));
      if(changed){unitsRef.current=[...unitsRef.current];setUnits([...unitsRef.current]);}
    },50);
    return()=>{if(unitAnimRef.current) clearInterval(unitAnimRef.current);};
  },[]);

  // ── Expire old blackout zones every 2s ────────────────────────────────────
  useEffect(()=>{
    const id=setInterval(()=>{
      setActiveBlackouts(prev=>prev.filter(b=>Date.now()-b.createdAt<b.duration));
    },2000);
    return()=>clearInterval(id);
  },[]);

  // External event focus delegated to EventFocusController

  // ── Event handler ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!isRunning||events.length===0) return;
    const ev=events[0];
    if(ev.id===lastEvIdRef.current) return;
    lastEvIdRef.current=ev.id;

    const cfg=getUnitConfig(ev);
    const color=TYPE_COLORS[ev.type]||'#00f5ff';
    playSound(ev.type==='nuclear'?'nuclear':cfg.kind==='submarine'?'sonar':cfg.kind==='naval'?'naval':cfg.kind==='missile'?'missile':'jet', ev.impact, audioCtxRef);

    // Log strikes to the Strike Report
    if(ev.impact>=6){
      setStrikeLog(prev=>[{
        id:ev.id, title:ev.title,
        origin:LEADER_NAMES[ev.affectedLeaders[0]]||ev.region,
        target:LEADER_NAMES[ev.affectedLeaders[1]]||ev.region||'UNKNOWN',
        type:ev.type, impact:ev.impact, timestamp:Date.now(), color,
      },...prev].slice(0,50));
    }

    // ── Google Maps satellite cinematic (cinematic=true events) ──────────
    if (ev.cinematic && !cinematicActiveRef.current) {
      setGmapEvent(ev);
    }

    // ── SVG Cinematic (impact >= 9, only when NOT a Google Maps cinematic) ──
    const isMajorStrike = ev.impact>=9 && (ev.type==='military'||ev.type==='nuclear') && !ev.cinematic && !cinematicActiveRef.current;
    if(isMajorStrike){
      cinematicActiveRef.current=true;
      cinematicRef.current.forEach(t=>clearTimeout(t));
      cinematicRef.current=[];

      const label=ev.title.length>48?ev.title.slice(0,48)+'…':ev.title;
      const originLead=ev.affectedLeaders[0];
      const targetLead=(ev.affectedLeaders[1]&&ev.affectedLeaders[1]!==originLead)?ev.affectedLeaders[1]:ev.affectedLeaders[0];
      const originC=(LEADER_COORDS[originLead]||REGION_COORDS[ev.region]||[0,20]) as [number,number];
      const rawTargetC=targetLead!==originLead?(LEADER_COORDS[targetLead]||REGION_COORDS[ev.region]||[0,20]):(REGION_COORDS[ev.region]||[0,20]);
      const targetC=rawTargetC as [number,number];

      const W=mapDivRef.current?.clientWidth??900;
      const H=mapDivRef.current?.clientHeight??500;

      const casualties=ev.impact>=9
        ?'Mass casualties confirmed — emergency response mobilized, hospitals overwhelmed'
        :'Multiple casualties reported — rescue operations underway, hospitals on alert';

      // Store lat/lng so pixel coords reproject correctly as map pans/zooms
      setCinematic({active:true,phase:'alert',color,label,
        originLabel:LEADER_NAMES[originLead]||ev.region,
        targetLabel:LEADER_NAMES[targetLead]||ev.region,
        eventType:ev.type,impact:ev.impact,
        originLatLng:[originC[1],originC[0]],  // [lat, lng]
        targetLatLng:[targetC[1],targetC[0]],  // [lat, lng]
        cinW:W,cinH:H,casualties,
      });

      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'zoom'})),2200));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'missile'})),4800));
      cinematicRef.current.push(setTimeout(()=>{
        setCinematic(p=>({...p,phase:'impact'}));
        setIsShaking(true);
        setTimeout(()=>setIsShaking(false),900);
      },8000));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'shockwave'})),9200));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'report'})),11500));
      cinematicRef.current.push(setTimeout(()=>{
        setCinematic(p=>({...p,active:false,phase:'done'}));
        setFeedActive(true);
        setTimeout(()=>{ cinematicActiveRef.current=false; },6000);
      },16200));  // report shows 4.7s then sequence ends
    }

    if(ev.impact>=9||ev.type==='nuclear'){
      setFlashColor(color);
      setTimeout(()=>setFlashColor(null),600);
    }

    const originLid=ev.affectedLeaders[0];
    const origin=(LEADER_COORDS[originLid]||REGION_COORDS[ev.region]||REGION_COORDS['Global']) as [number,number];
    const originName=LEADER_NAMES[originLid]||ev.region||'UNKNOWN';

    const count=ev.impact>=8?3:ev.impact>=5?2:1;
    const newUnits:MapUnit[]=ev.affectedLeaders.slice(1,1+count).map((lid,i)=>{
      const dest=(LEADER_COORDS[lid]||LEADER_COORDS['usa']) as [number,number];
      return {id:`u_${Date.now()}_${i}`,kind:cfg.kind,from:origin,to:dest,originLabel:originName,progress:0,color,speed:cfg.speed,exploding:false};
    });
    if(newUnits.length>0){unitsRef.current=[...unitsRef.current.slice(-8),...newUnits];setUnits([...unitsRef.current]);}

    const arcTargets=ev.affectedLeaders.slice(1,5).filter(l=>l!==originLid);
    const newArcs:Arc[]=arcTargets.length>0
      ?arcTargets.map((lid,i)=>({id:`arc_${Date.now()}_${i}`,from:origin,to:(LEADER_COORDS[lid]||REGION_COORDS[ev.region]||origin) as [number,number],color}))
      :[{id:`arc_${Date.now()}_0`,from:origin,to:(REGION_COORDS[ev.region]||[0,20]) as [number,number],color}];
    setArcs(newArcs);
    setTimeout(()=>setArcs([]),6000);

    // ── Blackout / EMP overlay ─────────────────────────────────────────────
    const isCyberOrEmp=ev.type==='cyber'||(ev.type==='nuclear'&&(ev.title+ev.description).toLowerCase().includes('emp'));
    if(isCyberOrEmp||ev.type==='intelligence'&&ev.impact>=8){
      const tLid=ev.affectedLeaders[0];
      const coords=(ev.lat&&ev.lng)?[ev.lng,ev.lat]:(LEADER_COORDS[tLid]||REGION_COORDS[ev.region]||[0,20]);
      const isEmp=(ev.title+ev.description).toLowerCase().includes('emp');
      const newZone:ActiveBlackout={
        id:`bo_${ev.id}`,
        lat:coords[1], lng:coords[0],
        radiusKm:ev.radiusKm??(350+ev.impact*55),
        color:ev.type==='cyber'?'#00f5ff':'#b44fff',
        label:ev.cityName??ev.region??ev.title.slice(0,20),
        type:isEmp?'emp':'cyber',
        createdAt:Date.now(),
        duration:14000,
      };
      setActiveBlackouts(prev=>[...prev.filter(b=>b.id!==newZone.id).slice(-3),newZone]);
    }

    // Pan logic delegated to EventFocusController

    return()=>{ cinematicRef.current.forEach(t=>clearTimeout(t)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[events.length,isRunning]);

  const tc=tension>=75?'#ff2d55':tension>=55?'#ff6a00':tension>=30?'#ffd700':'#00f5ff';

  // Reproject cinematic coordinates from lat/lng every render (mapVersion triggers re-render on map move)
  const [cinOx, cinOy, cinTx, cinTy] = (() => {
    void mapVersion; // ensures re-render on every map move/zoom
    if (!leafletMap || !cinematic.active) return [200, 400, 700, 250];
    try {
      const op = leafletMap.latLngToContainerPoint(L.latLng(cinematic.originLatLng[0], cinematic.originLatLng[1]));
      const tp = leafletMap.latLngToContainerPoint(L.latLng(cinematic.targetLatLng[0], cinematic.targetLatLng[1]));
      return [op.x, op.y, tp.x, tp.y];
    } catch { return [200, 400, 700, 250]; }
  })();

  const cinMidX=(cinOx+cinTx)/2;
  const cinDist=Math.sqrt((cinTx-cinOx)**2+(cinTy-cinOy)**2);
  const cinArcH=Math.max(60,cinDist*0.45);
  const cinMidY=(cinOy+cinTy)/2-cinArcH;
  const cinArcPath=`M ${cinOx.toFixed(0)},${cinOy.toFixed(0)} Q ${cinMidX.toFixed(0)},${cinMidY.toFixed(0)} ${cinTx.toFixed(0)},${cinTy.toFixed(0)}`;
  const cinLx=Math.min(cinematic.cinW-80,Math.max(10,cinTx+10));
  const cinLy=Math.max(20,cinTy-14);

  // ── Compute blackout zones in pixel space (re-runs on every map move via mapVersion) ──
  void mapVersion; // dependency — re-evaluates on map pan/zoom
  const mapW=mapDivRef.current?.clientWidth??0;
  const mapH=mapDivRef.current?.clientHeight??0;
  const blackoutPixelZones:BlackoutZone[]=leafletMap?activeBlackouts.map(b=>{
    try{
      const center=leafletMap.latLngToContainerPoint(L.latLng(b.lat,b.lng));
      // Project a point 1° north to get a pixel/degree ratio, then scale by radius
      const northPt=leafletMap.latLngToContainerPoint(L.latLng(b.lat+1,b.lng));
      const pxPerDeg=Math.abs(center.y-northPt.y);
      const r=Math.max(45,pxPerDeg*(b.radiusKm/111));
      return{id:b.id,cx:center.x,cy:center.y,r,color:b.color,label:b.label,
        type:b.type,createdAt:b.createdAt,duration:b.duration};
    }catch{return null;}
  }).filter(Boolean) as BlackoutZone[]:[];

  return (
    <div
      ref={mapDivRef}
      className="w-full h-full relative overflow-hidden"
      style={isShaking ? {animation:'cam-shake 0.9s ease-in-out'} : undefined}
      onMouseMove={e=>{
        if(!mapDivRef.current) return;
        const r=mapDivRef.current.getBoundingClientRect();
        setMousePos({x:e.clientX-r.left,y:e.clientY-r.top});
      }}>

      {/* Leaflet renders into this div via useEffect — do NOT add children here */}

      {/* ── Injected animation keyframes ── */}
      <style>{`
        @keyframes grid-drift { 0%{transform:translate(0,0)} 100%{transform:translate(50px,50px)} }
        @keyframes scanline-move { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes radar-sweep {
          0%  { transform: rotate(0deg); opacity: 0.7; }
          100%{ transform: rotate(360deg); opacity: 0.7; }
        }
        @keyframes grain-shift {
          0%,100%{ transform: translate(0,0) }
          10%    { transform: translate(-1%,-1%) }
          30%    { transform: translate(1%,0.5%) }
          50%    { transform: translate(-0.5%,1%) }
          70%    { transform: translate(0.5%,-0.5%) }
          90%    { transform: translate(-1%,0.5%) }
        }
        @keyframes border-glow-pulse {
          0%,100%{ opacity:0.55 } 50%{ opacity:1 }
        }
        @keyframes toast-slide-in {
          0%{transform:translateX(-120%) scale(0.9);opacity:0}
          100%{transform:translateX(0) scale(1);opacity:1}
        }
        @keyframes cam-shake {
          0%,100%{transform:translate(0,0) rotate(0deg)}
          10%{transform:translate(-7px,-4px) rotate(-0.3deg)}
          20%{transform:translate(6px,5px) rotate(0.2deg)}
          30%{transform:translate(-5px,6px) rotate(-0.2deg)}
          40%{transform:translate(7px,-4px) rotate(0.3deg)}
          50%{transform:translate(-6px,5px) rotate(-0.1deg)}
          60%{transform:translate(5px,-6px) rotate(0.2deg)}
          70%{transform:translate(-4px,4px) rotate(-0.1deg)}
          80%{transform:translate(6px,-3px) rotate(0.1deg)}
          90%{transform:translate(-3px,2px) rotate(0deg)}
        }
        @keyframes reticle-spin {
          0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)}
        }
        @keyframes reticle-pulse {
          0%,100%{opacity:0.9;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.08)}
        }
        @keyframes sat-scan {
          0%{stroke-dashoffset:400} 100%{stroke-dashoffset:0}
        }
        @keyframes data-stream {
          0%{ stroke-dashoffset: 400 }
          100%{ stroke-dashoffset: 0 }
        }
      `}</style>

      {/* ── Light military tint — keeps colors vivid ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'rgba(0,10,30,0.18)',
        zIndex:400,
        mixBlendMode:'multiply',
      }}/>

      {/* ── Tactical grid overlay ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex:402,
        overflow:'hidden',
      }}>
        {/* Primary grid */}
        <div style={{
          position:'absolute', inset:'-50px',
          backgroundImage:`
            linear-gradient(rgba(0,200,255,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.055) 1px, transparent 1px)
          `,
          backgroundSize:'60px 60px',
          animation:'grid-drift 18s linear infinite',
        }}/>
        {/* Fine grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`
            linear-gradient(rgba(0,200,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.022) 1px, transparent 1px)
          `,
          backgroundSize:'15px 15px',
        }}/>
      </div>

      {/* ── Scanline effect ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex:403,
        overflow:'hidden',
        opacity:0.4,
      }}>
        <div style={{
          position:'absolute',
          left:0, right:0, height:'3px',
          background:'linear-gradient(transparent, rgba(0,200,255,0.18) 50%, transparent)',
          animation:'scanline-move 8s linear infinite',
        }}/>
      </div>

      {/* ── Animated noise/grain ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex:404,
        opacity:0.025,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize:'180px 180px',
        animation:'grain-shift 0.4s steps(1) infinite',
      }}/>

      {/* ── Edge vignette (always-on) ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex:405,
        background:'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.72) 100%)',
      }}/>

      {/* ── Tension vignette (red pulse when hot) ── */}
      {tension>40&&(
        <div className="absolute inset-0 pointer-events-none" style={{
          background:`radial-gradient(ellipse at center,transparent 38%,rgba(255,45,85,${Math.min((tension-40)/400,0.35)}) 100%)`,
          zIndex:406,
          animation:'border-glow-pulse 3s ease-in-out infinite',
        }}/>
      )}

      {/* ── Corner HUD decorations (CSS borders, no SVG calc) ── */}
      {/* Top-left */}
      <div className="absolute pointer-events-none" style={{top:0,left:0,width:60,height:60,zIndex:407,
        borderTop:'1.5px solid rgba(0,200,255,0.5)',borderLeft:'1.5px solid rgba(0,200,255,0.5)'}}/>
      {/* Top-right */}
      <div className="absolute pointer-events-none" style={{top:0,right:0,width:60,height:60,zIndex:407,
        borderTop:'1.5px solid rgba(0,200,255,0.5)',borderRight:'1.5px solid rgba(0,200,255,0.5)'}}/>
      {/* Bottom-left */}
      <div className="absolute pointer-events-none" style={{bottom:0,left:0,width:60,height:60,zIndex:407,
        borderBottom:'1.5px solid rgba(0,200,255,0.5)',borderLeft:'1.5px solid rgba(0,200,255,0.5)'}}/>
      {/* Bottom-right */}
      <div className="absolute pointer-events-none" style={{bottom:0,right:0,width:60,height:60,zIndex:407,
        borderBottom:'1.5px solid rgba(0,200,255,0.5)',borderRight:'1.5px solid rgba(0,200,255,0.5)'}}/>
      {/* Center crosshair ticks */}
      <div className="absolute pointer-events-none" style={{top:0,left:'50%',width:1,height:14,zIndex:407,background:'rgba(0,200,255,0.3)'}}/>
      <div className="absolute pointer-events-none" style={{bottom:0,left:'50%',width:1,height:14,zIndex:407,background:'rgba(0,200,255,0.3)'}}/>
      <div className="absolute pointer-events-none" style={{left:0,top:'50%',height:1,width:14,zIndex:407,background:'rgba(0,200,255,0.3)'}}/>
      <div className="absolute pointer-events-none" style={{right:0,top:'50%',height:1,width:14,zIndex:407,background:'rgba(0,200,255,0.3)'}}/>
      {/* Top HUD label */}
      <div className="absolute pointer-events-none font-mono" style={{
        top:6,left:'50%',transform:'translateX(-50%)',zIndex:408,
        color:'rgba(0,200,255,0.4)',fontSize:'9px',letterSpacing:'0.3em',whiteSpace:'nowrap',
      }}>
        GEOWARS MATRIX · GLOBAL TACTICAL OVERVIEW
      </div>

      {/* ── DEATH TOLL — top right ── */}
      <DeathTollCounter deaths={worldState?.cumulativeDeaths ?? 0} isRunning={isRunning} />

      {/* ── WORLD POPULATION — bottom left ── */}
      <WorldPopCounter deaths={worldState?.cumulativeDeaths ?? 0} isRunning={isRunning} />

      {/* ── Animated game overlay: conflict zones, leaders, naval, subs ── */}
      {leafletMap && (
        <GameOverlay
          map={leafletMap}
          mapVersion={mapVersion}
          leaders={leaders}
          conflictZones={conflictZones}
          isRunning={isRunning}
          tension={tension}
        />
      )}

      {/* ── Missile arc layer ── */}
      {leafletMap && arcs.length > 0 && (
        <MissileArcLayer arcs={arcs} map={leafletMap} mapVersion={mapVersion} />
      )}

      {/* ── Impact pulse layer ── */}
      {leafletMap && units.length > 0 && (
        <ImpactPulseLayer units={units} map={leafletMap} mapVersion={mapVersion} />
      )}

      {/* ── Blackout / EMP overlay (cyber + EMP events) ── */}
      {blackoutPixelZones.length>0 && (
        <BlackoutLayer zones={blackoutPixelZones} width={mapW} height={mapH} />
      )}

      {/* ── Event focus controller (pan/zoom on new events) ── */}
      {leafletMap && (
        <EventFocusController
          events={events}
          isRunning={isRunning}
          map={leafletMap}
          focusedEvent={focusedEvent}
        />
      )}

      {/* ── Flash ── */}
      {flashColor&&(
        <div className="absolute inset-0 pointer-events-none" style={{
          background:`radial-gradient(ellipse at center,${flashColor}25 0%,transparent 70%)`,
          animation:'fade-out 0.6s ease-out forwards',
          zIndex:600,
        }}/>
      )}

      {/* ── CINEMATIC STRIKE SEQUENCE ── */}
      {cinematic.active&&(
        <div className="absolute inset-0 pointer-events-none" style={{zIndex:700}}>

          {cinematic.phase==='alert'&&(
            <>
              {/* Subtle screen flash — doesn't block map view */}
              <div className="absolute inset-0 impact-flash pointer-events-none" style={{background:`${cinematic.color}14`,zIndex:701}}/>
              {/* TOP-LEFT TOAST — small, non-blocking, 2.5s then advances to zoom */}
              <div className="absolute pointer-events-none fade-in" style={{
                top:48,left:12,zIndex:703,maxWidth:'300px',
                animation:'toast-slide-in 0.3s ease-out',
              }}>
                <div className="rounded-xl overflow-hidden" style={{
                  background:'rgba(0,0,0,0.94)',
                  border:`1.5px solid ${cinematic.color}`,
                  boxShadow:`0 0 24px ${cinematic.color}50, 0 4px 20px rgba(0,0,0,0.8)`,
                  backdropFilter:'blur(12px)',
                }}>
                  {/* Flashing top bar */}
                  <div style={{height:'3px',background:cinematic.color,animation:'alert-pulse 0.4s ease-in-out infinite'}}/>
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="status-blink" style={{display:'inline-block',width:'8px',height:'8px',
                        borderRadius:'50%',background:cinematic.color,boxShadow:`0 0 8px ${cinematic.color}`,flexShrink:0}}/>
                      <span className="font-orbitron font-black" style={{
                        color:cinematic.color,fontSize:'11px',letterSpacing:'0.22em',
                        textShadow:`0 0 14px ${cinematic.color}`}}>
                        {cinematic.eventType==='nuclear'?'☢ NUCLEAR LAUNCH':'⚡ STRIKE DETECTED'}
                      </span>
                    </div>
                    <div className="font-mono" style={{color:'rgba(255,255,255,0.82)',fontSize:'11px',
                      lineHeight:'1.4',letterSpacing:'0.03em'}}>
                      {cinematic.label}
                    </div>
                    <div className="font-mono mt-1.5" style={{color:`${cinematic.color}90`,fontSize:'10px',letterSpacing:'0.08em'}}>
                      {cinematic.originLabel} → {cinematic.targetLabel}
                    </div>
                  </div>
                  {/* Auto-dismiss progress bar */}
                  <div style={{height:'2px',background:'rgba(255,255,255,0.08)'}}>
                    <div style={{height:'100%',background:cinematic.color,
                      animation:'shrink-bar 2.5s linear forwards',transformOrigin:'left'}}/>
                  </div>
                </div>
              </div>
              {/* Reticle on target — stays on map, small */}
              <svg className="absolute inset-0" style={{zIndex:702,pointerEvents:'none'}}
                viewBox={`0 0 ${cinematic.cinW} ${cinematic.cinH}`} preserveAspectRatio="xMidYMid meet">
                <circle cx={cinTx} cy={cinTy} r="55" fill="none" stroke={cinematic.color}
                  strokeWidth="1" strokeDasharray="10,7" opacity="0.65"
                  style={{transformOrigin:`${cinTx}px ${cinTy}px`,animation:'reticle-spin 3s linear infinite'}}/>
                <circle cx={cinTx} cy={cinTy} r="32" fill="none" stroke={cinematic.color}
                  strokeWidth="1.5" opacity="0.75"
                  style={{animation:'reticle-pulse 0.9s ease-in-out infinite'}}/>
                <circle cx={cinTx} cy={cinTy} r="5" fill={cinematic.color} opacity="0.9"
                  style={{filter:`drop-shadow(0 0 6px ${cinematic.color})`}}/>
                <line x1={cinTx-65} y1={cinTy} x2={cinTx-40} y2={cinTy} stroke={cinematic.color} strokeWidth="1.5" opacity="0.6"/>
                <line x1={cinTx+40} y1={cinTy} x2={cinTx+65} y2={cinTy} stroke={cinematic.color} strokeWidth="1.5" opacity="0.6"/>
                <line x1={cinTx} y1={cinTy-65} x2={cinTx} y2={cinTy-40} stroke={cinematic.color} strokeWidth="1.5" opacity="0.6"/>
                <line x1={cinTx} y1={cinTy+40} x2={cinTx} y2={cinTy+65} stroke={cinematic.color} strokeWidth="1.5" opacity="0.6"/>
              </svg>
            </>
          )}

          {(cinematic.phase==='zoom'||cinematic.phase==='missile'||cinematic.phase==='impact'||cinematic.phase==='shockwave'||cinematic.phase==='report')&&(
            <div className="absolute inset-0" style={{
              background:'radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.65) 100%)',
              zIndex:701,transition:'all 1s ease'}}/>
          )}

          {cinematic.phase==='zoom'&&(
            <>
              {/* Satellite Feed Active banner */}
              <div className="absolute top-12 left-1/2" style={{transform:'translateX(-50%)',zIndex:703,
                background:'rgba(0,0,0,0.95)',border:`1px solid ${cinematic.color}80`,borderRadius:'8px',
                padding:'10px 28px',backdropFilter:'blur(16px)',boxShadow:`0 0 30px ${cinematic.color}30`,whiteSpace:'nowrap'}}>
                <div className="font-orbitron font-bold text-center" style={{color:cinematic.color,fontSize:'11px',letterSpacing:'0.28em'}}>
                  <span style={{marginRight:'8px',animation:'reticle-pulse 0.8s ease-in-out infinite',display:'inline-block'}}>◉</span>
                  SATELLITE FEED ACTIVE
                </div>
                <div className="font-mono text-center mt-1" style={{color:'rgba(255,255,255,0.6)',fontSize:'10px',letterSpacing:'0.12em'}}>
                  TRACKING: {cinematic.originLabel} → {cinematic.targetLabel}
                </div>
              </div>
              {/* Targeting reticle over target */}
              <svg className="absolute inset-0" style={{zIndex:702,pointerEvents:'none'}}
                viewBox={`0 0 ${cinematic.cinW} ${cinematic.cinH}`} preserveAspectRatio="xMidYMid meet">
                <circle cx={cinTx} cy={cinTy} r="100" fill="none" stroke={cinematic.color}
                  strokeWidth="1" strokeDasharray="16,10" opacity="0.5"
                  style={{transformOrigin:`${cinTx}px ${cinTy}px`,animation:'reticle-spin 4s linear infinite'}}/>
                <circle cx={cinTx} cy={cinTy} r="60" fill="none" stroke={cinematic.color}
                  strokeWidth="1.5" strokeDasharray="6,6" opacity="0.7"
                  style={{transformOrigin:`${cinTx}px ${cinTy}px`,animation:'reticle-spin 2s linear infinite reverse'}}/>
                <circle cx={cinTx} cy={cinTy} r="30" fill="none" stroke={cinematic.color}
                  strokeWidth="2" opacity="0.8" style={{animation:'reticle-pulse 1s ease-in-out infinite'}}/>
                <circle cx={cinTx} cy={cinTy} r="5" fill={cinematic.color} opacity="1"
                  style={{filter:`drop-shadow(0 0 10px ${cinematic.color})`}}/>
                {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],_i)=>(
                  <g key={_i}>
                    <line x1={cinTx+sx*35} y1={cinTy+sy*25} x2={cinTx+sx*20} y2={cinTy+sy*25} stroke={cinematic.color} strokeWidth="2" opacity="0.9"/>
                    <line x1={cinTx+sx*35} y1={cinTy+sy*25} x2={cinTx+sx*35} y2={cinTy+sy*10} stroke={cinematic.color} strokeWidth="2" opacity="0.9"/>
                  </g>
                ))}
                <text x={cinTx+40} y={cinTy+80} fill={cinematic.color} fontSize="10"
                  fontFamily="Share Tech Mono" opacity="0.75">
                  {`LAT: ${cinematic.targetLatLng[0].toFixed(2)}° · LON: ${cinematic.targetLatLng[1].toFixed(2)}°`}
                </text>
              </svg>
            </>
          )}

          {cinematic.phase==='missile'&&(
            <svg className="absolute inset-0" style={{zIndex:703,pointerEvents:'none'}}
              viewBox={`0 0 ${cinematic.cinW} ${cinematic.cinH}`} preserveAspectRatio="none">
              <path d={cinArcPath} fill="none" stroke={cinematic.color} strokeWidth="2.5"
                strokeDasharray="800" strokeDashoffset="800" strokeLinecap="round" opacity="0.95"
                className="arc-draw" style={{filter:`drop-shadow(0 0 4px ${cinematic.color})`}}/>
              <path id="cinArc" d={cinArcPath} fill="none"/>
              <circle r="5" fill={cinematic.color} opacity="0.95" style={{filter:`drop-shadow(0 0 8px ${cinematic.color})`}}>
                <animateMotion dur="3s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.6 1">
                  <mpath xlinkHref="#cinArc"/>
                </animateMotion>
              </circle>
              <circle r="3" fill="white" opacity="0.8">
                <animateMotion dur="3s" fill="freeze" begin="0.05s" calcMode="spline" keySplines="0.4 0 0.6 1">
                  <mpath xlinkHref="#cinArc"/>
                </animateMotion>
              </circle>
              <circle cx={cinOx} cy={cinOy} r="7" fill={cinematic.color} opacity="0.6"/>
              <circle cx={cinOx} cy={cinOy} r="14" fill="none" stroke={cinematic.color} strokeWidth="1" opacity="0.3"/>
              <text x={cinOx+12} y={cinOy-8} fill={cinematic.color} fontSize="12"
                fontFamily="Share Tech Mono" opacity="0.85">{cinematic.originLabel}</text>
              <circle cx={cinTx} cy={cinTy} r="20" fill="none" stroke={cinematic.color} strokeWidth="1.5">
                <animate attributeName="r" values="20;40;20" dur="0.9s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.9s" repeatCount="indefinite"/>
              </circle>
              <circle cx={cinTx} cy={cinTy} r="6" fill={cinematic.color}/>
              <line x1={cinTx-12} y1={cinTy} x2={cinTx-28} y2={cinTy} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <line x1={cinTx+12} y1={cinTy} x2={cinTx+28} y2={cinTy} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <line x1={cinTx} y1={cinTy-12} x2={cinTx} y2={cinTy-28} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <line x1={cinTx} y1={cinTy+12} x2={cinTx} y2={cinTy+28} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <text x={cinLx} y={cinLy} fill={cinematic.color} fontSize="13" fontFamily="Share Tech Mono" opacity="0.9">
                ◉ {cinematic.targetLabel}
              </text>
              <text x={cinTx-30} y={cinTy+50} fill={cinematic.color} fontSize="10" fontFamily="Share Tech Mono" opacity="0.7">
                🚀 STRIKE IN PROGRESS
              </text>
            </svg>
          )}

          {cinematic.phase==='impact'&&(
            <>
              <div className="absolute inset-0 impact-flash" style={{background:'rgba(255,255,255,0.15)',zIndex:702}}/>
              <div className="absolute flex items-center justify-center pointer-events-none" style={{
                zIndex:703,left:cinTx-100,top:cinTy-100,width:200,height:200}}>
                <div className="impact-flash" style={{width:160,height:160,borderRadius:'50%',
                  background:`radial-gradient(circle,#ffffff 0%,${cinematic.color} 30%,transparent 70%)`,
                  boxShadow:`0 0 100px ${cinematic.color},0 0 200px ${cinematic.color}40`}}/>
              </div>
            </>
          )}

          {cinematic.phase==='shockwave'&&(
            <>
              {/* Shockwave rings */}
              <div className="absolute flex items-center justify-center pointer-events-none" style={{
                zIndex:702,left:cinTx-300,top:cinTy-300,width:600,height:600}}>
                {[0,1,2,3].map(i=>(
                  <div key={i} className="absolute rounded-full" style={{
                    width:`${120+i*220}px`,height:`${120+i*220}px`,
                    border:`${i===0?'3px':'1.5px'} solid ${cinematic.color}`,
                    animation:`shockwave-ring ${1.4+i*0.35}s ${i*0.2}s cubic-bezier(0,0,0.2,1) forwards`,
                    opacity:0,boxShadow:`0 0 20px ${cinematic.color}60`}}/>
                ))}
                {/* Heat zone */}
                <div className="absolute rounded-full" style={{
                  width:'160px',height:'160px',
                  background:`radial-gradient(circle,${cinematic.color}55 0%,${cinematic.color}20 50%,transparent 70%)`,
                  animation:'reticle-pulse 0.6s ease-in-out infinite',
                }}/>
              </div>
              {/* TACTICAL REPLAY banner */}
              <div className="absolute top-10 left-1/2" style={{transform:'translateX(-50%)',zIndex:704,
                background:'rgba(0,0,0,0.96)',border:`1px solid ${cinematic.color}60`,borderRadius:'6px',
                padding:'8px 24px',backdropFilter:'blur(14px)',whiteSpace:'nowrap',
                boxShadow:`0 0 20px ${cinematic.color}25`}}>
                <div className="font-orbitron font-bold text-center" style={{color:cinematic.color,fontSize:'10px',letterSpacing:'0.3em'}}>
                  ▶ SIMULATION FEED · TACTICAL REPLAY
                </div>
                <div className="font-mono text-center mt-1" style={{color:'rgba(255,255,255,0.5)',fontSize:'9px',letterSpacing:'0.15em'}}>
                  {new Date().toUTCString().slice(0,25).toUpperCase()} UTC · {cinematic.targetLabel}
                </div>
              </div>
            </>
          )}

          {cinematic.phase==='report'&&(
            /* Small top-left card — non-blocking, auto-dismisses with countdown bar */
            <div className="absolute fade-in" style={{top:48,left:12,zIndex:720,width:310,pointerEvents:'none'}}>
              <div className="rounded-xl overflow-hidden" style={{
                background:'rgba(0,0,0,0.96)',
                border:`1.5px solid ${cinematic.color}`,
                boxShadow:`0 0 28px ${cinematic.color}45,0 4px 24px rgba(0,0,0,0.85)`,
                backdropFilter:'blur(14px)',
              }}>
                {/* Pulsing top bar */}
                <div style={{height:'3px',background:cinematic.color,animation:'alert-pulse 0.6s ease-in-out infinite'}}/>
                <div className="px-3.5 py-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="status-blink" style={{display:'inline-block',width:'8px',height:'8px',
                      borderRadius:'50%',background:cinematic.color,boxShadow:`0 0 8px ${cinematic.color}`,flexShrink:0}}/>
                    <span className="font-orbitron font-black" style={{
                      color:cinematic.color,fontSize:'10px',letterSpacing:'0.22em',
                      textShadow:`0 0 12px ${cinematic.color}`}}>
                      ■ STRIKE ASSESSMENT
                    </span>
                    <span className="font-mono ml-auto" style={{color:'rgba(255,255,255,0.25)',fontSize:'9px'}}>
                      {new Date().toUTCString().slice(17,22)} UTC
                    </span>
                  </div>
                  {/* Compact data rows */}
                  {[
                    {l:'EVENT',    v:cinematic.label.length>38?cinematic.label.slice(0,38)+'…':cinematic.label},
                    {l:'ORIGIN',   v:cinematic.originLabel},
                    {l:'TARGET',   v:cinematic.targetLabel},
                    {l:'IMPACT',   v:`${cinematic.impact}/10 — ${cinematic.impact>=9?'CATASTROPHIC':'SEVERE'}`},
                    {l:'CASUALTIES',v:cinematic.casualties},
                  ].map(({l,v})=>(
                    <div key={l} className="flex gap-2 mb-1">
                      <span style={{color:'rgba(255,255,255,0.28)',fontSize:'9px',width:'70px',flexShrink:0,letterSpacing:'0.06em'}}>{l}</span>
                      <span style={{color:l==='IMPACT'||l==='CASUALTIES'?cinematic.color:'rgba(255,255,255,0.82)',
                        fontSize:'9px',lineHeight:'1.4',fontWeight:l==='IMPACT'?'bold':'normal'}}>{v}</span>
                    </div>
                  ))}
                  <div className="mt-2 font-mono text-center py-1 rounded" style={{
                    background:`${cinematic.color}12`,border:`1px solid ${cinematic.color}25`,
                    color:`${cinematic.color}90`,fontSize:'8px',letterSpacing:'0.12em'}}>
                    FULL REPORT IN STRIKE LOG ↓
                  </div>
                </div>
                {/* Auto-dismiss countdown bar — 4.5s */}
                <div style={{height:'2px',background:'rgba(255,255,255,0.06)'}}>
                  <div style={{height:'100%',background:cinematic.color,
                    animation:'shrink-bar 4.5s linear forwards',transformOrigin:'left'}}/>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Overlays ── */}
      <NewsMarquee simIntel={breakingIntel} tension={tension} />
      <CinematicFeed active={feedActive} color={cinematic.color} eventTitle={cinematic.label}
        targetLabel={cinematic.targetLabel} eventType={cinematic.eventType} impact={cinematic.impact}
        onComplete={()=>setFeedActive(false)}/>
      <CrisisLog events={events} />

      {hoveredCity&&(
        <div className="absolute pointer-events-none font-mono" style={{
          left:Math.min(mousePos.x+14,(mapDivRef.current?.clientWidth??800)-220),
          top:Math.max(mousePos.y-38,8),zIndex:800,
          background:'rgba(4,2,14,0.95)',border:'1px solid rgba(255,215,0,0.5)',
          borderRadius:'6px',padding:'5px 10px',fontSize:'11px',color:'#ffd700',
          letterSpacing:'0.1em',whiteSpace:'nowrap',boxShadow:'0 0 16px rgba(255,215,0,0.15)'}}>
          <span style={{color:'rgba(255,215,0,0.5)',marginRight:'6px'}}>◆</span>
          {hoveredCity.toUpperCase()}
        </div>
      )}

      {/* ── Last-strike persistent badge (top-left, clickable → opens strike log) ── */}
      {strikeLog.length > 0 && !cinematic.active && (
        <button
          onClick={() => setStrikeReportOpen(v => !v)}
          className="absolute fade-in"
          style={{
            top: 48, left: 12, zIndex: 510,
            background: strikeReportOpen ? 'rgba(255,45,85,0.18)' : 'rgba(0,0,0,0.88)',
            border: `1px solid ${strikeReportOpen ? 'rgba(255,45,85,0.65)' : 'rgba(255,45,85,0.35)'}`,
            borderRadius: '8px',
            padding: '7px 12px',
            backdropFilter: 'blur(12px)',
            boxShadow: strikeReportOpen ? '0 0 18px rgba(255,45,85,0.35)' : '0 0 8px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            transition: 'all 0.25s',
            display: 'flex', alignItems: 'center', gap: '8px',
            maxWidth: '220px',
          }}>
          <div className="shrink-0" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#ff2d55', boxShadow: '0 0 8px #ff2d55',
          }} />
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div className="font-orbitron font-bold" style={{
              color: '#ff2d55', fontSize: '9px', letterSpacing: '0.18em', lineHeight: 1.2,
            }}>
              ⚡ LAST STRIKE
            </div>
            <div className="font-mono" style={{
              color: 'rgba(255,255,255,0.65)', fontSize: '9px', lineHeight: 1.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {strikeLog[0].origin} → {strikeLog[0].target}
            </div>
          </div>
          <div className="font-orbitron font-bold shrink-0" style={{
            color: strikeLog[0].impact >= 9 ? '#ff2d55' : '#ff6a00',
            fontSize: '14px', marginLeft: 2,
          }}>
            {strikeLog[0].impact}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', flexShrink: 0 }}>
            {strikeReportOpen ? '▼' : '▲'}
          </span>
        </button>
      )}

      {/* ── Strike Report Panel (slide up) ── */}
      <div style={{
        position:'absolute',bottom:'32px',left:0,right:0,zIndex:610,
        maxHeight: strikeReportOpen ? '340px' : '0px',
        overflow:'hidden',
        transition:'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
        background:'rgba(2,1,14,0.98)',
        borderTop: strikeReportOpen ? '1px solid rgba(255,45,85,0.3)' : 'none',
        backdropFilter:'blur(16px)',
        boxShadow: strikeReportOpen ? '0 -12px 40px rgba(0,0,0,0.7)' : 'none',
      }}>
        <div style={{maxHeight:'340px',overflowY:'auto',padding:'12px 16px'}}>
          {/* Panel header */}
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px',paddingBottom:'8px',borderBottom:'1px solid rgba(255,45,85,0.2)'}}>
            <span className="status-blink" style={{display:'inline-block',width:'7px',height:'7px',borderRadius:'50%',background:'#ff2d55',boxShadow:'0 0 8px #ff2d55'}}/>
            <span className="font-orbitron font-bold" style={{color:'#ff2d55',fontSize:'11px',letterSpacing:'0.22em'}}>STRIKE REPORT</span>
            <span className="font-mono" style={{marginLeft:'auto',color:'rgba(255,45,85,0.5)',fontSize:'10px'}}>{strikeLog.length} EVENTS</span>
          </div>
          {strikeLog.length===0&&(
            <div className="font-mono" style={{color:'rgba(255,255,255,0.2)',fontSize:'11px',textAlign:'center',padding:'20px 0'}}>
              NO STRIKES RECORDED — AWAITING SIMULATION
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {strikeLog.map((s)=>{
              const ec=s.impact>=9?'#ff2d55':s.impact>=7?'#ff6a00':s.impact>=5?'#ffd700':'#00ff9d';
              return(
                <div key={s.id} style={{
                  display:'flex',alignItems:'flex-start',gap:'10px',
                  padding:'8px 12px',borderRadius:'6px',
                  background:`${s.color}08`,border:`1px solid ${s.color}25`,
                }}>
                  <span className="font-orbitron font-bold" style={{color:ec,fontSize:'15px',flexShrink:0,lineHeight:'1.2'}}>{s.impact}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="font-mono" style={{color:'rgba(255,255,255,0.9)',fontSize:'11px',lineHeight:'1.4',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.title}</div>
                    <div className="font-mono" style={{color:'rgba(200,210,240,0.5)',fontSize:'10px',marginTop:'2px'}}>
                      {s.origin} → {s.target} · {s.type.toUpperCase()} · {new Date(s.timestamp).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                    </div>
                  </div>
                  <span className="font-orbitron" style={{color:s.color,fontSize:'8px',letterSpacing:'0.1em',
                    background:`${s.color}15`,padding:'2px 6px',borderRadius:'3px',border:`1px solid ${s.color}30`,flexShrink:0}}>
                    {s.type.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Google Maps satellite cinematic overlay ── */}
      {gmapEvent && (
        <CinematicGoogleMap
          event={gmapEvent}
          onClose={() => setGmapEvent(null)}
        />
      )}

      {/* ── Bottom HUD ── */}
      <div className="absolute bottom-0 left-0 right-0" style={{
        zIndex:611,
        background:'linear-gradient(to top, rgba(0,2,12,0.95) 0%, rgba(0,2,12,0.8) 100%)',
        borderTop:'1px solid rgba(0,200,255,0.15)',
        padding:'4px 14px',display:'flex',alignItems:'center',gap:'12px'}}>
        <div className="font-mono" style={{color:'rgba(0,200,255,0.55)',fontSize:'9px',letterSpacing:'0.18em',pointerEvents:'none'}}>
          <span className="status-blink" style={{marginRight:'6px',color:'rgba(0,200,255,0.7)'}}>⬤</span>
          TACTICAL GRID ACTIVE
        </div>
        <div style={{flex:1,height:'1px',background:'linear-gradient(90deg,rgba(0,200,255,0.2),transparent)',pointerEvents:'none'}}/>
        {/* Strike Report toggle button */}
        <button onClick={()=>setStrikeReportOpen(v=>!v)}
          style={{
            fontFamily:'Share Tech Mono, monospace',fontSize:'9px',letterSpacing:'0.18em',
            color: strikeReportOpen ? '#ff2d55' : 'rgba(255,45,85,0.65)',
            background: strikeReportOpen ? 'rgba(255,45,85,0.15)' : 'rgba(255,45,85,0.05)',
            border:`1px solid ${strikeReportOpen?'rgba(255,45,85,0.5)':'rgba(255,45,85,0.2)'}`,
            borderRadius:'4px',padding:'3px 10px',cursor:'pointer',transition:'all 0.2s',
            display:'flex',alignItems:'center',gap:'5px',
          }}>
          {strikeReportOpen?'▼':'▲'} STRIKE REPORT
          {strikeLog.length>0&&(
            <span style={{
              background:'#ff2d55',color:'white',borderRadius:'10px',
              padding:'0 5px',fontSize:'8px',lineHeight:'14px',
            }}>{strikeLog.length}</span>
          )}
        </button>
        <div className="font-mono" style={{color:`${tc}`,fontSize:'9px',letterSpacing:'0.14em',pointerEvents:'none'}}>
          TENSION <span style={{fontWeight:'bold'}}>{tension}</span>/100
        </div>
        <div style={{width:'80px',height:'3px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden',pointerEvents:'none'}}>
          <div style={{width:`${tension}%`,height:'100%',background:`linear-gradient(90deg,#00ff9d,${tc})`,boxShadow:`0 0 6px ${tc}`}}/>
        </div>
        <div className="font-mono" style={{color:'rgba(255,255,255,0.3)',fontSize:'9px',letterSpacing:'0.12em',pointerEvents:'none'}}>
          ZONES: {conflictZones.length}
        </div>
        <div style={{flex:1,height:'1px',background:'linear-gradient(90deg,transparent,rgba(0,200,255,0.2))',pointerEvents:'none'}}/>
        <div className="font-mono" style={{color:'rgba(0,200,255,0.3)',fontSize:'9px',letterSpacing:'0.12em',pointerEvents:'none'}}>
          GEOWARS MATRIX · LIVE INTELLIGENCE
        </div>
      </div>
    </div>
  );
}
