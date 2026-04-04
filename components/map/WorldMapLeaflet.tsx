'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { ConflictZone, GeoEvent, Leader, WorldState } from '@/lib/engine/types';
import CrisisLog from './CrisisLog';
import CinematicFeed from './CinematicFeed';
import WorldBriefing from './WorldBriefing';
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

// ── Map controller (inside MapContainer) ──────────────────────────────────────
function MapController({ mapRef, onMove }: { mapRef: React.MutableRefObject<L.Map|null>; onMove: ()=>void }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map, mapRef]);
  useMapEvents({ move: onMove, zoom: onMove, moveend: onMove, zoomend: onMove });
  return null;
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
      {/* ── Arcs (curved Bezier) ── */}
      {arcs.map(arc=>{
        const [x1,y1]=px(arc.from[0],arc.from[1]);
        const [x2,y2]=px(arc.to[0],arc.to[1]);
        const mx=(x1+x2)/2, dist=Math.sqrt((x2-x1)**2+(y2-y1)**2);
        const my=(y1+y2)/2-Math.max(30,dist*0.3);
        return(
          <path key={arc.id} d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
            fill="none" stroke={arc.color} strokeWidth={1.8} strokeOpacity={0.75}
            strokeDasharray="6,4" strokeLinecap="round"/>
        );
      })}

      {/* ── Moving units ── */}
      {units.map(u=>{
        const t=easeInOut(Math.min(u.progress,1));
        const [ux,uy]=px(lerp(u.from[0],u.to[0],t),lerp(u.from[1],u.to[1],t));
        if(u.exploding){
          const r=8+u.progress*40;
          return(
            <g key={u.id}>
              <circle cx={ux} cy={uy} r={r} fill="none" stroke={u.color} strokeWidth={2} opacity={Math.max(0,0.9-u.progress)}/>
              <circle cx={ux} cy={uy} r={r*0.35} fill={u.color} opacity={Math.max(0,0.7-u.progress)}/>
              <circle cx={ux} cy={uy} r={r*0.6} fill="none" stroke={u.color} strokeWidth={1} opacity={Math.max(0,0.5-u.progress*0.7)}/>
            </g>
          );
        }
        const sym = u.kind==='nuclear'?'☢':u.kind==='submarine'?'◎':u.kind==='naval'?'⚓':u.kind==='missile'?'⟶':u.kind==='troops'?'▲':'✈';
        return(
          <g key={u.id} transform={`translate(${ux},${uy})`}>
            <circle r={5} fill={u.color} opacity={0.2}/>
            <circle r={3} fill={u.color} opacity={0.9} style={{filter:`drop-shadow(0 0 4px ${u.color})`}}/>
            <text textAnchor="middle" y={-8} style={{fontSize:'10px',fill:u.color,fontFamily:'Share Tech Mono, monospace',fontWeight:'bold'}}>
              {sym}
            </text>
            <text textAnchor="middle" y={16} style={{fontSize:'7px',fill:'rgba(255,255,255,0.7)',fontFamily:'Share Tech Mono, monospace'}}>
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
        const r=zone.severity==='critical'?14:zone.severity==='high'?11:8;
        return(
          <g key={zone.id}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={1.5} opacity={0}>
              <animate attributeName="r" values={`${r};${r*3.5}`} dur="2.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.7;0" dur="2.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx={cx} cy={cy} r={r*0.6} fill="none" stroke={color} strokeWidth={1} opacity={0}>
              <animate attributeName="r" values={`${r*0.6};${r*2.2}`} dur="2.5s" begin="1s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0" dur="2.5s" begin="1s" repeatCount="indefinite"/>
            </circle>
            <circle cx={cx} cy={cy} r={r*0.45} fill={color} opacity={0.9} style={{filter:`drop-shadow(0 0 6px ${color})`}}/>
            <circle cx={cx} cy={cy} r={r*0.18} fill="white" opacity={0.95}/>
            <text x={cx+r*0.6} y={cy-r*0.5} style={{fontSize:'9px',fill:color,fontFamily:'Share Tech Mono, monospace',fontWeight:'bold'}}>
              {zone.name}
            </text>
            <text x={cx+r*0.6} y={cy+r*0.6} style={{fontSize:'8px',fill:`${color}aa`,fontFamily:'Share Tech Mono, monospace'}}>
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
            <circle cx={cx} cy={cy} r={isWar?5:3.5} fill={lc} opacity={0.85}
              style={{filter:`drop-shadow(0 0 ${isWar?6:3}px ${lc})`}}/>
            <circle cx={cx} cy={cy} r={isWar?2.5:1.8} fill="white" opacity={0.9}/>
            <text x={cx+7} y={cy-5} style={{fontSize:'9px',fill:lc,fontFamily:'Share Tech Mono, monospace',fontWeight:'bold',
              paintOrder:'stroke',stroke:'rgba(0,0,0,0.95)',strokeWidth:'3px'}}>
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
export default function WorldMapLeaflet({ conflictZones, events, tension, isRunning, leaders, breakingIntel=[], worldState, onInitiate }: Props) {
  const [arcs, setArcs]   = useState<Arc[]>([]);
  const [units, setUnits] = useState<MapUnit[]>([]);
  const [flashColor, setFlashColor] = useState<string|null>(null);
  const [feedActive, setFeedActive] = useState(false);
  const [mapVersion, setMapVersion] = useState(0); // increments on map move → redraws overlay
  const [leafletMap, setLeafletMap] = useState<L.Map|null>(null);
  const [mousePos, setMousePos] = useState({x:0,y:0});
  const [hoveredCity, setHoveredCity] = useState<string|null>(null);

  type CinPhase = 'alert'|'zoom'|'missile'|'impact'|'shockwave'|'report'|'done';
  const [cinematic, setCinematic] = useState<{
    active:boolean; phase:CinPhase; color:string; label:string;
    originLabel:string; targetLabel:string; eventType:string; impact:number;
    // Pixel coords for missile arc (set from Leaflet projection at cinematic start)
    ox:number; oy:number; tx:number; ty:number;
    cinW:number; cinH:number; // container size at cinematic start
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

  const onMapMove = useCallback(() => setMapVersion(v => v+1), []);

  // Sync leafletMap ref and state
  const handleMapReady = useCallback((map: L.Map) => {
    leafletMapRef.current = map;
    setLeafletMap(map);
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

      // Get actual pixel positions from Leaflet (accurate to real satellite map)
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

    // Spawn units
    const count=ev.impact>=8?3:ev.impact>=5?2:1;
    const newUnits:MapUnit[]=ev.affectedLeaders.slice(1,1+count).map((lid,i)=>{
      const dest=(LEADER_COORDS[lid]||LEADER_COORDS['usa']) as [number,number];
      return {id:`u_${Date.now()}_${i}`,kind:cfg.kind,from:origin,to:dest,originLabel:originName,progress:0,color,speed:cfg.speed,exploding:false};
    });
    if(newUnits.length>0){unitsRef.current=[...unitsRef.current.slice(-8),...newUnits];setUnits([...unitsRef.current]);}

    // Arcs
    const arcTargets=ev.affectedLeaders.slice(1,5).filter(l=>l!==originLid);
    const newArcs:Arc[]=arcTargets.length>0
      ?arcTargets.map((lid,i)=>({id:`arc_${Date.now()}_${i}`,from:origin,to:(LEADER_COORDS[lid]||REGION_COORDS[ev.region]||origin) as [number,number],color}))
      :[{id:`arc_${Date.now()}_0`,from:origin,to:(REGION_COORDS[ev.region]||[0,20]) as [number,number],color}];
    setArcs(newArcs);
    setTimeout(()=>setArcs([]),6000);

    // Pan using Leaflet's flyTo (smooth, native) — rate-limited
    const now=Date.now();
    if(ev.impact>=8&&(now-lastPanTimeRef.current)>20000&&leafletMapRef.current){
      lastPanTimeRef.current=now;
      const panTarget=ev.affectedLeaders[1]
        ?(LEADER_COORDS[ev.affectedLeaders[1]]||REGION_COORDS[ev.region]||origin)
        :(REGION_COORDS[ev.region]||origin);
      const zoom=ev.impact>=9?5:4;
      leafletMapRef.current.flyTo(L.latLng(panTarget[1],panTarget[0]),zoom,{duration:3,easeLinearity:0.2});
      // Return to world view after 12s
      setTimeout(()=>{
        if(leafletMapRef.current) leafletMapRef.current.flyTo(L.latLng(20,15),2,{duration:4,easeLinearity:0.25});
      },14000);
    }

    return()=>{ cinematicRef.current.forEach(t=>clearTimeout(t)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[events.length,isRunning]);

  const tc=tension>=75?'#ff2d55':tension>=55?'#ff6a00':tension>=30?'#ffd700':'#00f5ff';

  // Cinematic missile arc computed values
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

      {/* ── Leaflet map ── */}
      <MapContainer
        center={[20,15]} zoom={2} minZoom={1} maxZoom={16}
        zoomControl={false} attributionControl={true}
        style={{width:'100%',height:'100%',background:'#010a04'}}
        worldCopyJump={false}>

        {/* ESRI World Imagery (satellite) */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="&copy; Esri &mdash; Source: Esri, DigitalGlobe, USDA, AeroGRID &amp; the GIS User Community"
          maxZoom={18}
        />
        {/* CartoDB dark labels on top */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          maxZoom={18}
          opacity={0.85}
        />

        <MapController mapRef={leafletMapRef} onMove={()=>{ onMapMove(); if(leafletMapRef.current) handleMapReady(leafletMapRef.current); }}/>
      </MapContainer>

      {/* ── Dark military overlay ── (mutes satellite to match UI theme) */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'rgba(0,5,15,0.42)',
        zIndex:400,
        mixBlendMode:'multiply',
      }}/>

      {/* ── Tension vignette ── */}
      {tension>40&&(
        <div className="absolute inset-0 pointer-events-none" style={{
          background:`radial-gradient(ellipse at center,transparent 40%,rgba(255,45,85,${(tension-40)/600}) 100%)`,
          zIndex:401,
        }}/>
      )}

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

          {/* Zoom phase banner */}
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

          {/* Missile phase — pixel-accurate arc on real satellite map */}
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
              {/* Origin */}
              <circle cx={cinematic.ox} cy={cinematic.oy} r="7" fill={cinematic.color} opacity="0.6"/>
              <circle cx={cinematic.ox} cy={cinematic.oy} r="14" fill="none" stroke={cinematic.color} strokeWidth="1" opacity="0.3"/>
              <text x={cinematic.ox+12} y={cinematic.oy-8} fill={cinematic.color} fontSize="12"
                fontFamily="Share Tech Mono" opacity="0.85">{cinematic.originLabel}</text>
              {/* Target reticle */}
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

      {/* ── Overlays (unchanged) ── */}
      <NewsMarquee simIntel={breakingIntel} tension={tension} />
      {!isRunning && worldState && onInitiate && <WorldBriefing state={worldState} onInitiate={onInitiate} />}
      <CinematicFeed active={feedActive} color={cinematic.color} eventTitle={cinematic.label}
        targetLabel={cinematic.targetLabel} eventType={cinematic.eventType} impact={cinematic.impact}
        onComplete={()=>setFeedActive(false)}/>
      <CrisisLog events={events} />

      {/* City hover tooltip */}
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

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
        zIndex:600,background:'rgba(0,0,0,0.75)',borderTop:'1px solid rgba(0,245,255,0.12)',
        padding:'4px 10px',display:'flex',alignItems:'center',gap:'14px'}}>
        <span className="font-mono" style={{color:'rgba(0,245,255,0.5)',fontSize:'9px',letterSpacing:'0.12em'}}>
          GEOWARS MATRIX · SATELLITE INTELLIGENCE VIEW · ESRI WORLD IMAGERY
        </span>
        <span className="font-mono" style={{color:`${tc}80`,fontSize:'9px',letterSpacing:'0.1em'}}>
          TENSION: {tension}/100 · ACTIVE ZONES: {conflictZones.length}
        </span>
      </div>
    </div>
  );
}
