'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ConflictZone, GeoEvent, Leader, WorldState } from '@/lib/engine/types';
import CrisisLog from './CrisisLog';
import CinematicFeed from './CinematicFeed';
import NewsMarquee from './NewsMarquee';

// ── Constants ─────────────────────────────────────────────────────────────────
const REGION_COORDS: Record<string, [number, number]> = {
  'Taiwan Strait':[121.0,23.5],'Eastern Europe':[31.0,50.5],'Persian Gulf':[51.5,26.5],
  'Korean Peninsula':[127.5,38.5],'Gaza & Lebanon':[35.5,32.5],'South China Sea':[113.0,12.0],
  'Arctic':[15.0,78.0],'Global':[0.0,20.0],'Middle East':[45.0,30.0],'Europe':[15.0,50.0],
  'Asia-Pacific':[135.0,25.0],'Asia':[90.0,35.0],'Pacific':[170.0,15.0],
};
const LEADER_COORDS: Record<string, [number, number]> = {
  usa:[-98,38],china:[104,35],russia:[90,60],iran:[54,32],israel:[35,31.5],
  uk:[-1,52],france:[2,46],germany:[10,51],turkey:[35,39],saudiarabia:[45,24],
  india:[78,20],pakistan:[70,30],japan:[138,36],southkorea:[128,36],
  northkorea:[127,40],ukraine:[31,49],taiwan:[121,23.5],nato:[15,50],
  europe:[15,50],un:[0,20],imf:[-77,38.9],
};
const LEADER_NAMES: Record<string, string> = {
  usa:'USA',china:'CHINA',russia:'RUSSIA',iran:'IRAN',israel:'ISRAEL',
  uk:'UK',france:'FRANCE',germany:'GERMANY',turkey:'TÜRKIYE',saudiarabia:'SAUDI ARABIA',
  india:'INDIA',pakistan:'PAKISTAN',japan:'JAPAN',southkorea:'S.KOREA',
  northkorea:'N.KOREA',ukraine:'UKRAINE',taiwan:'TAIWAN',nato:'NATO',
};
const LEADER_FLAGS: Record<string, string> = {
  usa:'🇺🇸',china:'🇨🇳',russia:'🇷🇺',iran:'🇮🇷',israel:'🇮🇱',uk:'🇬🇧',
  france:'🇫🇷',germany:'🇩🇪',turkey:'🇹🇷',saudiarabia:'🇸🇦',india:'🇮🇳',
  pakistan:'🇵🇰',japan:'🇯🇵',southkorea:'🇰🇷',northkorea:'🇰🇵',
  ukraine:'🇺🇦',taiwan:'🇹🇼',nato:'🏛',
};
const NAVAL_BASES: Record<string, [number, number][]> = {
  usa:[[-65,36],[-124,35],[-88,24]],russia:[[29,69],[155,50],[22,60]],
  china:[[122,28],[113,20],[121,13]],uk:[[-4,54],[-2,50]],france:[[5,43],[-2,47]],
  india:[[72,18],[80,11]],iran:[[56,23],[52,27]],northkorea:[[129,39]],
  saudiarabia:[[37,22],[50,26]],israel:[[34,29]],japan:[[135,34],[140,38]],
  taiwan:[[121,22]],
};
const SUB_PATROL: Record<string, [number, number]> = {
  usa:[-50,42],russia:[18,73],china:[130,16],uk:[-16,58],france:[-10,49],
  india:[76,8],northkorea:[133,35],
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function lerp(a:number,b:number,t:number){ return a+(b-a)*t; }
function easeInOut(t:number){ return t<0.5?2*t*t:-1+(4-2*t)*t; }
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
  units: MapUnit[];
  arcs: Arc[];
  leaders: Leader[];
  conflictZones: ConflictZone[];
  isRunning: boolean;
  tension: number;
}
function GameOverlay({ map, units, arcs, leaders, conflictZones, isRunning, tension }: OverlayProps) {
  const size = map.getSize();
  const W = size.x, H = size.y;

  // Convert [lng, lat] → container pixel [x, y]
  const px = useCallback((lng: number, lat: number): [number, number] => {
    const pt = map.latLngToContainerPoint(L.latLng(lat, lng));
    return [pt.x, pt.y];
  }, [map]);

  const tc = tension>=75?'#ff2d55':tension>=55?'#ff6a00':tension>=30?'#ffd700':'#00f5ff';
  const activeLeaderIds = new Set(leaders.filter(l=>l.status==='at_war'||l.status==='mobilizing'||l.status==='hostile').map(l=>l.id));

  return (
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

      {/* ── Arcs — glowing Bezier trails ── */}
      {arcs.map(arc=>{
        const [x1,y1]=px(arc.from[0],arc.from[1]);
        const [x2,y2]=px(arc.to[0],arc.to[1]);
        const mx=(x1+x2)/2, dist=Math.sqrt((x2-x1)**2+(y2-y1)**2);
        const my=(y1+y2)/2-Math.max(30,dist*0.3);
        const d=`M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
        const pathLen=Math.round(dist*1.3);
        return(
          <g key={arc.id} filter="url(#arc-glow)">
            {/* Glow halo */}
            <path d={d} fill="none" stroke={arc.color} strokeWidth={5} strokeOpacity={0.18} strokeLinecap="round"/>
            {/* Core line */}
            <path d={d} fill="none" stroke={arc.color} strokeWidth={1.5} strokeOpacity={0.9}
              strokeDasharray="8,5" strokeLinecap="round"/>
            {/* Animated travelling pulse */}
            <path id={`arc-path-${arc.id}`} d={d} fill="none"/>
            <circle r="3.5" fill={arc.color} opacity="0.95" filter="url(#glow-sm)">
              <animateMotion dur="2.5s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#arc-path-${arc.id}`}/>
              </animateMotion>
            </circle>
            {/* Origin dot */}
            <circle cx={x1} cy={y1} r="4" fill={arc.color} opacity="0.7" filter="url(#glow-sm)"/>
            {/* Destination ring */}
            <circle cx={x2} cy={y2} r="0" fill="none" stroke={arc.color} strokeWidth="1.5">
              <animate attributeName="r" values={`0;${Math.max(12,pathLen*0.04)}`} dur="1.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite"/>
            </circle>
          </g>
        );
      })}

      {/* ── Moving units ── */}
      {units.map(u=>{
        const t=easeInOut(Math.min(u.progress,1));
        const [ux,uy]=px(lerp(u.from[0],u.to[0],t),lerp(u.from[1],u.to[1],t));
        if(u.exploding){
          const r=10+u.progress*60;
          const op=Math.max(0,0.9-u.progress);
          return(
            <g key={u.id} filter="url(#glow-md)">
              <circle cx={ux} cy={uy} r={r} fill="none" stroke={u.color} strokeWidth={2.5} opacity={op}/>
              <circle cx={ux} cy={uy} r={r*0.55} fill={u.color} opacity={Math.max(0,0.65-u.progress)}/>
              <circle cx={ux} cy={uy} r={r*0.8} fill="none" stroke={u.color} strokeWidth={1} opacity={Math.max(0,0.4-u.progress*0.6)}/>
              {/* Secondary ring */}
              <circle cx={ux} cy={uy} r={r*1.4} fill="none" stroke={u.color} strokeWidth={0.8} opacity={Math.max(0,0.25-u.progress*0.3)}/>
              {/* Core flash */}
              <circle cx={ux} cy={uy} r={r*0.2} fill="white" opacity={Math.max(0,0.9-u.progress*2)}/>
            </g>
          );
        }
        const sym = u.kind==='nuclear'?'☢':u.kind==='submarine'?'◎':u.kind==='naval'?'⚓':u.kind==='missile'?'▶':u.kind==='troops'?'▲':'✈';
        return(
          <g key={u.id} transform={`translate(${ux},${uy})`} filter="url(#glow-sm)">
            {/* Glow halo */}
            <circle r={9} fill={u.color} opacity={0.12}/>
            {/* Core dot */}
            <circle r={4} fill={u.color} opacity={0.95}/>
            <circle r={2} fill="white" opacity={0.8}/>
            {/* Symbol */}
            <text textAnchor="middle" y={-10} style={{fontSize:'11px',fill:u.color,fontFamily:'Share Tech Mono, monospace',fontWeight:'bold'}}>
              {sym}
            </text>
            {/* Label */}
            <text textAnchor="middle" y={18} style={{
              fontSize:'7px',fill:'rgba(255,255,255,0.7)',fontFamily:'Share Tech Mono, monospace',
              paintOrder:'stroke',stroke:'rgba(0,0,0,0.9)',strokeWidth:'2px',
            }}>
              {u.originLabel}
            </text>
          </g>
        );
      })}

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

      {/* ── Naval bases ── */}
      {isRunning && leaders.map(leader=>{
        const bases=NAVAL_BASES[leader.id];
        if(!bases) return null;
        const lc=leader.color||tc;
        return bases.map((b,i)=>{
          const [bx,by]=px(b[0],b[1]);
          return(
            <g key={`nav_${leader.id}_${i}`}>
              <circle cx={bx} cy={by} r={3.5} fill={lc} opacity={0.65}/>
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="central" style={{fontSize:'5px',fill:'rgba(0,0,0,0.9)'}}>⚓</text>
            </g>
          );
        });
      })}

      {/* ── Submarine patrol positions ── */}
      {isRunning && leaders.map(leader=>{
        const sub=SUB_PATROL[leader.id];
        if(!sub) return null;
        const [sx,sy]=px(sub[0],sub[1]);
        const lc=leader.color||tc;
        return(
          <g key={`sub_${leader.id}`}>
            <circle cx={sx} cy={sy} r={0} fill="none" stroke={lc} strokeWidth={1} opacity={0.5}>
              <animate attributeName="r" values="0;14" dur="4s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0" dur="4s" repeatCount="indefinite"/>
            </circle>
            <ellipse cx={sx} cy={sy} rx={7} ry={2.5} fill={lc} opacity={0.7}/>
            <rect x={sx-1} y={sy-5} width={2} height={3} fill={lc} opacity={0.9}/>
          </g>
        );
      })}
    </svg>
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
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function WorldMapLeaflet({ conflictZones, events, tension, isRunning, leaders, breakingIntel=[] }: Props) {
  const [arcs, setArcs]   = useState<Arc[]>([]);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [flashColor, setFlashColor] = useState<string|null>(null);
  const [feedActive, setFeedActive] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const [leafletMap, setLeafletMap] = useState<L.Map|null>(null);
  const [mousePos, setMousePos] = useState({x:0,y:0});
  const [hoveredCity] = useState<string|null>(null);

  type CinPhase = 'alert'|'zoom'|'missile'|'impact'|'shockwave'|'report'|'done';
  const [cinematic, setCinematic] = useState<{
    active:boolean; phase:CinPhase; color:string; label:string;
    originLabel:string; targetLabel:string; eventType:string; impact:number;
    ox:number; oy:number; tx:number; ty:number;
    cinW:number; cinH:number;
    casualties:string;
  }>({active:false,phase:'done',color:'#ff2d55',label:'',originLabel:'',targetLabel:'',
    eventType:'military',impact:8,ox:200,oy:400,tx:700,ty:250,cinW:900,cinH:500,casualties:''});

  const mapDivRef          = useRef<HTMLDivElement>(null);
  const leafletMapRef      = useRef<L.Map|null>(null);
  const audioCtxRef        = useRef<AudioContext|null>(null);
  const cinematicRef       = useRef<ReturnType<typeof setTimeout>[]>([]);
  const unitAnimRef        = useRef<ReturnType<typeof setInterval>|null>(null);
  const unitsRef           = useRef<MapUnit[]>([]);
  const lastEvIdRef        = useRef<string|null>(null);
  const cinematicActiveRef = useRef(false);
  const lastPanTimeRef     = useRef(0);

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

    // CartoDB Dark Matter — deep navy oceans, muted land, neon labels
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
      { attribution: '© CARTO', maxZoom: 18, subdomains: 'abcd' }
    ).addTo(map);

    // CartoDB dark labels (city names, borders) at reduced opacity for the tactical look
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { attribution: '© CARTO', maxZoom: 18, opacity: 0.55, subdomains: 'abcd' }
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

  // ── Event handler ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(!isRunning||events.length===0) return;
    const ev=events[0];
    if(ev.id===lastEvIdRef.current) return;
    lastEvIdRef.current=ev.id;

    const cfg=getUnitConfig(ev);
    const color=TYPE_COLORS[ev.type]||'#00f5ff';
    playSound(ev.type==='nuclear'?'nuclear':cfg.kind==='submarine'?'sonar':cfg.kind==='naval'?'naval':cfg.kind==='missile'?'missile':'jet', ev.impact, audioCtxRef);

    // ── Cinematic (impact >= 9 only, no concurrent) ──
    const isMajorStrike = ev.impact>=9 && (ev.type==='military'||ev.type==='nuclear') && !cinematicActiveRef.current;
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
      let ox=W*0.25, oy=H*0.6, tx=W*0.75, ty=H*0.35;
      if(leafletMapRef.current){
        const op=leafletMapRef.current.latLngToContainerPoint(L.latLng(originC[1],originC[0]));
        const tp=leafletMapRef.current.latLngToContainerPoint(L.latLng(targetC[1],targetC[0]));
        ox=op.x; oy=op.y; tx=tp.x; ty=tp.y;
      }

      const casualties=ev.impact>=9
        ?'Mass casualties confirmed — emergency response mobilized, hospitals overwhelmed'
        :'Multiple casualties reported — rescue operations underway, hospitals on alert';

      setCinematic({active:true,phase:'alert',color,label,
        originLabel:LEADER_NAMES[originLead]||ev.region,
        targetLabel:LEADER_NAMES[targetLead]||ev.region,
        eventType:ev.type,impact:ev.impact,
        ox,oy,tx,ty,cinW:W,cinH:H,casualties,
      });

      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'zoom'})),2200));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'missile'})),4800));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'impact'})),8000));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'shockwave'})),9200));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'report'})),11500));
      cinematicRef.current.push(setTimeout(()=>{
        setCinematic(p=>({...p,active:false,phase:'done'}));
        setFeedActive(true);
        setTimeout(()=>{ cinematicActiveRef.current=false; },7500);
      },17000));
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

    const now=Date.now();
    if(ev.impact>=7&&(now-lastPanTimeRef.current)>20000&&leafletMapRef.current){
      lastPanTimeRef.current=now;
      const map=leafletMapRef.current;

      // Frame BOTH origin and target so the full strike corridor is visible
      const targetLid2=ev.affectedLeaders[1];
      const dest2=targetLid2
        ?(LEADER_COORDS[targetLid2]||REGION_COORDS[ev.region]||origin)
        :(REGION_COORDS[ev.region]||origin);

      const originLL=L.latLng(origin[1],origin[0]);
      const destLL=L.latLng(dest2[1],dest2[0]);

      // If origin === dest (same country event), just fly to that point zoomed in
      const isSamePoint=originLL.distanceTo(destLL)<500000; // < 500 km apart
      if(isSamePoint){
        map.flyTo(destLL, ev.impact>=9?7:6, {duration:3,easeLinearity:0.2});
      } else {
        // fitBounds frames both countries with padding — auto-picks zoom
        const bounds=L.latLngBounds([originLL,destLL]);
        map.flyToBounds(bounds,{
          padding:[60,60],
          maxZoom: ev.impact>=9?7:6,
          duration:3,
          easeLinearity:0.2,
        });
      }

      // Return to overview after cinematic
      setTimeout(()=>{
        if(leafletMapRef.current) leafletMapRef.current.flyTo(L.latLng(35,30),4,{duration:4,easeLinearity:0.25});
      },16000);
    }

    return()=>{ cinematicRef.current.forEach(t=>clearTimeout(t)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[events.length,isRunning]);

  const tc=tension>=75?'#ff2d55':tension>=55?'#ff6a00':tension>=30?'#ffd700':'#00f5ff';

  const cinMidX=(cinematic.ox+cinematic.tx)/2;
  const cinDist=Math.sqrt((cinematic.tx-cinematic.ox)**2+(cinematic.ty-cinematic.oy)**2);
  const cinArcH=Math.max(60,cinDist*0.45);
  const cinMidY=(cinematic.oy+cinematic.ty)/2-cinArcH;
  const cinArcPath=`M ${cinematic.ox.toFixed(0)},${cinematic.oy.toFixed(0)} Q ${cinMidX.toFixed(0)},${cinMidY.toFixed(0)} ${cinematic.tx.toFixed(0)},${cinematic.ty.toFixed(0)}`;
  const cinLx=Math.min(cinematic.cinW-80,Math.max(10,cinematic.tx+10));
  const cinLy=Math.max(20,cinematic.ty-14);

  return (
    <div
      ref={mapDivRef}
      className="w-full h-full relative overflow-hidden"
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
        @keyframes data-stream {
          0%{ stroke-dashoffset: 400 }
          100%{ stroke-dashoffset: 0 }
        }
      `}</style>

      {/* ── Base tint: deep navy over CartoDB dark tiles ── */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'rgba(0,4,18,0.38)',
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

      {/* ── Animated game overlay (SVG) ── */}
      {leafletMap && (
        <GameOverlay
          map={leafletMap}
          mapVersion={mapVersion}
          units={units}
          arcs={arcs}
          leaders={leaders}
          conflictZones={conflictZones}
          isRunning={isRunning}
          tension={tension}
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
              <div className="absolute inset-0 impact-flash" style={{background:`${cinematic.color}28`,zIndex:701}}/>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{zIndex:702}}>
                <div className="font-orbitron font-black alert-pulse text-center px-10 py-7 rounded-2xl"
                  style={{background:'rgba(0,0,0,0.92)',border:`2px solid ${cinematic.color}`,
                    boxShadow:`0 0 60px ${cinematic.color}60,inset 0 0 40px ${cinematic.color}10`,
                    letterSpacing:'0.3em',fontSize:'clamp(18px,3vw,32px)',color:cinematic.color,
                    textShadow:`0 0 30px ${cinematic.color}`}}>
                  {cinematic.eventType==='nuclear'?'☢ NUCLEAR LAUNCH DETECTED':'⚠ STRIKE EVENT DETECTED'}
                </div>
                <div className="font-mono mt-4 px-6 py-2 rounded-lg"
                  style={{background:'rgba(0,0,0,0.8)',border:`1px solid ${cinematic.color}40`,
                    color:'rgba(255,255,255,0.8)',fontSize:'13px',letterSpacing:'0.1em'}}>
                  {cinematic.label}
                </div>
              </div>
            </>
          )}

          {(cinematic.phase==='zoom'||cinematic.phase==='missile'||cinematic.phase==='impact'||cinematic.phase==='shockwave'||cinematic.phase==='report')&&(
            <div className="absolute inset-0" style={{
              background:'radial-gradient(ellipse at center,transparent 30%,rgba(0,0,0,0.65) 100%)',
              zIndex:701,transition:'all 1s ease'}}/>
          )}

          {cinematic.phase==='zoom'&&(
            <div className="absolute left-1/2 top-14" style={{transform:'translateX(-50%)',zIndex:703,
              background:'rgba(0,0,0,0.9)',border:`1px solid ${cinematic.color}70`,borderRadius:'8px',
              padding:'8px 20px',backdropFilter:'blur(14px)',boxShadow:`0 0 24px ${cinematic.color}25`,whiteSpace:'nowrap'}}>
              <div className="font-orbitron font-bold text-center" style={{color:cinematic.color,fontSize:'12px',letterSpacing:'0.2em'}}>
                TRACKING TARGET — {cinematic.originLabel} → {cinematic.targetLabel}
              </div>
              <div className="font-mono text-center mt-0.5" style={{color:'rgba(255,255,255,0.55)',fontSize:'10px'}}>
                {cinematic.label}
              </div>
            </div>
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
              <circle cx={cinematic.ox} cy={cinematic.oy} r="7" fill={cinematic.color} opacity="0.6"/>
              <circle cx={cinematic.ox} cy={cinematic.oy} r="14" fill="none" stroke={cinematic.color} strokeWidth="1" opacity="0.3"/>
              <text x={cinematic.ox+12} y={cinematic.oy-8} fill={cinematic.color} fontSize="12"
                fontFamily="Share Tech Mono" opacity="0.85">{cinematic.originLabel}</text>
              <circle cx={cinematic.tx} cy={cinematic.ty} r="20" fill="none" stroke={cinematic.color} strokeWidth="1.5">
                <animate attributeName="r" values="20;40;20" dur="0.9s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.9;0.2;0.9" dur="0.9s" repeatCount="indefinite"/>
              </circle>
              <circle cx={cinematic.tx} cy={cinematic.ty} r="6" fill={cinematic.color}/>
              <line x1={cinematic.tx-12} y1={cinematic.ty} x2={cinematic.tx-28} y2={cinematic.ty} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <line x1={cinematic.tx+12} y1={cinematic.ty} x2={cinematic.tx+28} y2={cinematic.ty} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <line x1={cinematic.tx} y1={cinematic.ty-12} x2={cinematic.tx} y2={cinematic.ty-28} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <line x1={cinematic.tx} y1={cinematic.ty+12} x2={cinematic.tx} y2={cinematic.ty+28} stroke={cinematic.color} strokeWidth="1.5" opacity="0.8"/>
              <text x={cinLx} y={cinLy} fill={cinematic.color} fontSize="13" fontFamily="Share Tech Mono" opacity="0.9">
                ◉ {cinematic.targetLabel}
              </text>
              <text x={cinematic.tx-30} y={cinematic.ty+50} fill={cinematic.color} fontSize="10" fontFamily="Share Tech Mono" opacity="0.7">
                🚀 STRIKE IN PROGRESS
              </text>
            </svg>
          )}

          {cinematic.phase==='impact'&&(
            <>
              <div className="absolute inset-0 impact-flash" style={{background:'rgba(255,255,255,0.15)',zIndex:702}}/>
              <div className="absolute flex items-center justify-center pointer-events-none" style={{
                zIndex:703,left:cinematic.tx-100,top:cinematic.ty-100,width:200,height:200}}>
                <div className="impact-flash" style={{width:160,height:160,borderRadius:'50%',
                  background:`radial-gradient(circle,#ffffff 0%,${cinematic.color} 30%,transparent 70%)`,
                  boxShadow:`0 0 100px ${cinematic.color},0 0 200px ${cinematic.color}40`}}/>
              </div>
            </>
          )}

          {cinematic.phase==='shockwave'&&(
            <div className="absolute flex items-center justify-center pointer-events-none" style={{
              zIndex:702,left:cinematic.tx-300,top:cinematic.ty-300,width:600,height:600}}>
              {[0,1,2,3].map(i=>(
                <div key={i} className="absolute rounded-full" style={{
                  width:`${120+i*220}px`,height:`${120+i*220}px`,
                  border:`${i===0?'3px':'1.5px'} solid ${cinematic.color}`,
                  animation:`shockwave-ring ${1.4+i*0.35}s ${i*0.2}s cubic-bezier(0,0,0.2,1) forwards`,
                  opacity:0,boxShadow:`0 0 20px ${cinematic.color}60`}}/>
              ))}
            </div>
          )}

          {cinematic.phase==='report'&&(
            <div className="absolute inset-0 flex items-center justify-center" style={{zIndex:703}}>
              <div className="font-mono rounded-2xl px-8 py-7 fade-in" style={{
                background:'rgba(0,0,0,0.96)',border:`1px solid ${cinematic.color}70`,
                boxShadow:`0 0 60px ${cinematic.color}30,0 0 120px rgba(0,0,0,0.9)`,
                backdropFilter:'blur(20px)',maxWidth:'520px',width:'92%'}}>
                <div className="font-orbitron font-bold mb-1 text-center" style={{color:cinematic.color,fontSize:'11px',letterSpacing:'0.3em'}}>
                  ■ STRIKE ASSESSMENT REPORT ■
                </div>
                <div className="text-center mb-4" style={{color:`${cinematic.color}60`,fontSize:'9px',letterSpacing:'0.2em'}}>
                  {new Date().toUTCString().slice(0,25).toUpperCase()} UTC
                </div>
                <div style={{borderTop:`1px solid ${cinematic.color}30`,paddingTop:'14px'}}>
                  {[
                    {l:'EVENT',v:cinematic.label,hi:false},
                    {l:'STRIKE ORIGIN',v:cinematic.originLabel,hi:false},
                    {l:'TARGET ZONE',v:cinematic.targetLabel,hi:false},
                    {l:'TYPE',v:cinematic.eventType.toUpperCase(),hi:false},
                    {l:'IMPACT LEVEL',v:`${cinematic.impact}/10 — ${cinematic.impact>=9?'CATASTROPHIC':'SEVERE'}`,hi:true},
                    {l:'CASUALTIES',v:cinematic.casualties,hi:true},
                    {l:'STATUS',v:'IMPACT CONFIRMED · DAMAGE ASSESSMENT ONGOING',hi:false},
                  ].map(({l,v,hi})=>(
                    <div key={l} className="flex gap-3 mb-2.5">
                      <span style={{color:'rgba(255,255,255,0.3)',fontSize:'10px',width:'110px',flexShrink:0,letterSpacing:'0.08em'}}>{l}</span>
                      <span style={{color:hi?cinematic.color:'rgba(255,255,255,0.88)',fontSize:'10px',lineHeight:'1.5',fontWeight:hi?'bold':'normal'}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 py-3 text-center rounded-lg" style={{background:`${cinematic.color}10`,border:`1px solid ${cinematic.color}25`}}>
                  <div className="font-orbitron" style={{color:cinematic.color,fontSize:'10px',letterSpacing:'0.2em'}}>
                    INTELLIGENCE FEED INCOMING — SATELLITE COVERAGE ACTIVE
                  </div>
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

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        zIndex:600,
        background:'linear-gradient(to top, rgba(0,2,12,0.92) 0%, transparent 100%)',
        borderTop:'1px solid rgba(0,200,255,0.15)',
        padding:'5px 14px',display:'flex',alignItems:'center',gap:'16px'}}>
        <div className="font-mono" style={{color:'rgba(0,200,255,0.55)',fontSize:'9px',letterSpacing:'0.18em'}}>
          <span className="status-blink" style={{marginRight:'6px',color:'rgba(0,200,255,0.7)'}}>⬤</span>
          TACTICAL GRID ACTIVE
        </div>
        <div style={{flex:1,height:'1px',background:'linear-gradient(90deg,rgba(0,200,255,0.2),transparent)'}}/>
        <div className="font-mono" style={{color:`${tc}`,fontSize:'9px',letterSpacing:'0.14em'}}>
          TENSION <span style={{fontWeight:'bold'}}>{tension}</span>/100
        </div>
        <div style={{width:'80px',height:'3px',background:'rgba(255,255,255,0.08)',borderRadius:'2px',overflow:'hidden'}}>
          <div style={{width:`${tension}%`,height:'100%',background:`linear-gradient(90deg,#00ff9d,${tc})`,boxShadow:`0 0 6px ${tc}`}}/>
        </div>
        <div className="font-mono" style={{color:'rgba(255,255,255,0.3)',fontSize:'9px',letterSpacing:'0.12em'}}>
          ZONES: {conflictZones.length}
        </div>
        <div style={{flex:1,height:'1px',background:'linear-gradient(90deg,transparent,rgba(0,200,255,0.2))'}}/>
        <div className="font-mono" style={{color:'rgba(0,200,255,0.3)',fontSize:'9px',letterSpacing:'0.12em'}}>
          GEOWARS MATRIX · LIVE INTELLIGENCE
        </div>
      </div>
    </div>
  );
}
