'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Line } from 'react-simple-maps';
import { ConflictZone, GeoEvent, Leader } from '@/lib/engine/types';
import NewsMarquee from './NewsMarquee';
import CrisisLog from './CrisisLog';
import CinematicFeed from './CinematicFeed';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface Props {
  conflictZones: ConflictZone[];
  events: GeoEvent[];
  tension: number;
  isRunning: boolean;
  leaders: Leader[];
  isExpanded: boolean;
  onExpandToggle: () => void;
  breakingIntel?: string[];
}

const ISO_TO_LEADER: Record<string, string> = {
  '840':'usa','156':'china','643':'russia','364':'iran','376':'israel','275':'israel',
  '826':'uk','250':'france','276':'germany','792':'turkey','682':'saudiarabia',
  '356':'india','586':'pakistan','392':'japan','410':'southkorea','408':'northkorea',
  '804':'ukraine','616':'nato','208':'nato','246':'nato','578':'nato','233':'nato',
  '428':'nato','440':'nato','348':'nato','703':'nato','203':'nato',
  '528':'europe','056':'europe','040':'europe','724':'europe',
};

const REGION_COORDS: Record<string, [number, number]> = {
  'Taiwan Strait':    [121.0, 23.5], 'Eastern Europe':   [31.0, 50.5],
  'Persian Gulf':     [51.5,  26.5], 'Korean Peninsula': [127.5, 38.5],
  'Gaza & Lebanon':   [35.5,  32.5], 'South China Sea':  [113.0, 12.0],
  'Arctic':           [15.0,  78.0], 'Global':           [0.0,  20.0],
  'Middle East':      [45.0,  30.0], 'Europe':           [15.0, 50.0],
  'Asia-Pacific':     [135.0, 25.0], 'Asia':             [90.0, 35.0],
  'Pacific':          [170.0, 15.0],
};

const LEADER_COORDS: Record<string, [number, number]> = {
  usa:[-98,38], china:[104,35], russia:[90,60], iran:[54,32], israel:[35,31.5],
  uk:[-1,52], france:[2,46], germany:[10,51], turkey:[35,39], saudiarabia:[45,24],
  india:[78,20], pakistan:[70,30], japan:[138,36], southkorea:[128,36],
  northkorea:[127,40], ukraine:[31,49], taiwan:[121,23.5], nato:[15,50],
  europe:[15,50], un:[0,20], imf:[-77,38.9],
};

const LEADER_NAMES: Record<string, string> = {
  usa:'USA', china:'CHINA', russia:'RUSSIA', iran:'IRAN', israel:'ISRAEL',
  uk:'UK', france:'FRANCE', germany:'GERMANY', turkey:'TÜRKIYE', saudiarabia:'SAUDI ARABIA',
  india:'INDIA', pakistan:'PAKISTAN', japan:'JAPAN', southkorea:'S.KOREA',
  northkorea:'N.KOREA', ukraine:'UKRAINE', taiwan:'TAIWAN', nato:'NATO HQ',
};

// Naval base positions [lng, lat]
const NAVAL_BASES: Record<string, [number, number][]> = {
  usa:         [[-65,36],[-124,35],[-88,24]],
  russia:      [[29,69],[155,50],[22,60]],
  china:       [[122,28],[113,20],[121,13]],
  uk:          [[-4,54],[-2,50]],
  france:      [[5,43],[-2,47]],
  india:       [[72,18],[80,11]],
  iran:        [[56,23],[52,27]],
  northkorea:  [[129,39]],
  saudiarabia: [[37,22],[50,26]],
  israel:      [[34,29]],
  japan:       [[135,34],[140,38]],
  taiwan:      [[121,22]],
};

// Submarine patrol positions
const SUB_PATROL: Record<string, [number, number]> = {
  usa:    [-50, 42], russia: [18, 73], china: [130, 16],
  uk:     [-16, 58], france: [-10, 49], india: [76, 8],
  northkorea: [133, 35],
};

const COUNTRY_LABELS: [string, number, number][] = [
  ['UNITED STATES',-98,38],['CANADA',-96,58],['MEXICO',-102,23],
  ['BRAZIL',-52,-10],['ARGENTINA',-65,-34],['UNITED KINGDOM',-2,54],
  ['FRANCE',2,46],['GERMANY',10,51],['SPAIN',-4,40],['ITALY',12,42],
  ['POLAND',20,52],['UKRAINE',31,49],['TURKEY',35,39],['RUSSIA',90,60],
  ['IRAN',54,32],['IRAQ',44,33],['ISRAEL',35,31.5],['SAUDI ARABIA',45,24],
  ['PAKISTAN',70,30],['INDIA',78,20],['CHINA',104,35],['NORTH KOREA',127,40],
  ['SOUTH KOREA',128,36],['JAPAN',138,36],['TAIWAN',121,23.5],
  ['AUSTRALIA',134,-25],['SOUTH AFRICA',25,-29],['EGYPT',30,26],['NIGERIA',8,10],
];

// ISO 3166-1 numeric → display name (for hover tooltip)
const ISO_NAMES: Record<string, string> = {
  '004':'Afghanistan','008':'Albania','012':'Algeria','024':'Angola','032':'Argentina',
  '036':'Australia','040':'Austria','050':'Bangladesh','056':'Belgium','068':'Bolivia',
  '076':'Brazil','100':'Bulgaria','116':'Cambodia','120':'Cameroon','124':'Canada',
  '152':'Chile','156':'China','170':'Colombia','191':'Croatia','192':'Cuba',
  '203':'Czech Republic','208':'Denmark','218':'Ecuador','818':'Egypt','231':'Ethiopia',
  '246':'Finland','250':'France','276':'Germany','288':'Ghana','300':'Greece',
  '320':'Guatemala','344':'Hong Kong','348':'Hungary','356':'India','360':'Indonesia',
  '364':'Iran','368':'Iraq','372':'Ireland','376':'Israel','380':'Italy',
  '388':'Jamaica','392':'Japan','400':'Jordan','398':'Kazakhstan','404':'Kenya',
  '408':'North Korea','410':'South Korea','414':'Kuwait','422':'Lebanon','428':'Latvia',
  '440':'Lithuania','458':'Malaysia','484':'Mexico','498':'Moldova','504':'Morocco',
  '508':'Mozambique','524':'Nepal','528':'Netherlands','554':'New Zealand','566':'Nigeria',
  '578':'Norway','586':'Pakistan','591':'Panama','604':'Peru','608':'Philippines',
  '616':'Poland','620':'Portugal','642':'Romania','643':'Russia','682':'Saudi Arabia',
  '703':'Slovakia','710':'South Africa','724':'Spain','752':'Sweden','756':'Switzerland',
  '760':'Syria','764':'Thailand','788':'Tunisia','792':'Turkey','800':'Uganda',
  '804':'Ukraine','784':'United Arab Emirates','826':'United Kingdom','840':'United States',
  '858':'Uruguay','862':'Venezuela','704':'Vietnam','887':'Yemen','894':'Zambia',
  '716':'Zimbabwe','275':'Palestine','158':'Taiwan','729':'Sudan','144':'Sri Lanka',
  '051':'Armenia','031':'Azerbaijan','112':'Belarus','070':'Bosnia and Herzegovina',
  '196':'Cyprus','268':'Georgia','352':'Iceland',
  '807':'North Macedonia','499':'Montenegro','688':'Serbia','705':'Slovenia',
};

// Major world cities  [name, lng, lat, isCapital, minZoom]
const CITIES: Array<{name:string; coords:[number,number]; capital?:boolean; dc?:boolean}> = [
  {name:'Washington D.C.', coords:[-77.04,38.91], capital:true, dc:true},
  {name:'New York',        coords:[-74.00,40.71]},
  {name:'Los Angeles',     coords:[-118.24,34.05]},
  {name:'Chicago',         coords:[-87.63,41.88]},
  {name:'Houston',         coords:[-95.37,29.76]},
  {name:'Miami',           coords:[-80.19,25.77]},
  {name:'London',          coords:[-0.13,51.51],  capital:true},
  {name:'Paris',           coords:[2.35,48.85],   capital:true},
  {name:'Berlin',          coords:[13.40,52.52],  capital:true},
  {name:'Rome',            coords:[12.50,41.90],  capital:true},
  {name:'Madrid',          coords:[-3.70,40.42],  capital:true},
  {name:'Warsaw',          coords:[21.01,52.23],  capital:true},
  {name:'Moscow',          coords:[37.62,55.75],  capital:true},
  {name:'St. Petersburg',  coords:[30.32,59.93]},
  {name:'Beijing',         coords:[116.41,39.91], capital:true},
  {name:'Shanghai',        coords:[121.47,31.23]},
  {name:'Hong Kong',       coords:[114.17,22.32]},
  {name:'Tokyo',           coords:[139.69,35.69], capital:true},
  {name:'Osaka',           coords:[135.50,34.69]},
  {name:'Seoul',           coords:[126.98,37.57], capital:true},
  {name:'Pyongyang',       coords:[125.75,39.02], capital:true},
  {name:'Tehran',          coords:[51.42,35.70],  capital:true},
  {name:'Baghdad',         coords:[44.39,33.34],  capital:true},
  {name:'Jerusalem',       coords:[35.22,31.77],  capital:true},
  {name:'Tel Aviv',        coords:[34.78,32.07]},
  {name:'Beirut',          coords:[35.50,33.89],  capital:true},
  {name:'Damascus',        coords:[36.29,33.51],  capital:true},
  {name:'Riyadh',          coords:[46.72,24.69],  capital:true},
  {name:'Dubai',           coords:[55.30,25.20]},
  {name:'Kabul',           coords:[69.18,34.52],  capital:true},
  {name:'Islamabad',       coords:[73.04,33.69],  capital:true},
  {name:'Karachi',         coords:[66.99,24.86]},
  {name:'New Delhi',       coords:[77.21,28.61],  capital:true},
  {name:'Mumbai',          coords:[72.88,19.08]},
  {name:'Kyiv',            coords:[30.52,50.45],  capital:true},
  {name:'Ankara',          coords:[32.86,39.93],  capital:true},
  {name:'Istanbul',        coords:[28.97,41.01]},
  {name:'Taipei',          coords:[121.56,25.04], capital:true},
  {name:'Bangkok',         coords:[100.52,13.75], capital:true},
  {name:'Singapore',       coords:[103.82,1.35],  capital:true},
  {name:'Jakarta',         coords:[106.84,-6.21], capital:true},
  {name:'Manila',          coords:[120.98,14.60], capital:true},
  {name:'Hanoi',           coords:[105.85,21.03], capital:true},
  {name:'Sydney',          coords:[151.21,-33.87]},
  {name:'Canberra',        coords:[149.13,-35.28], capital:true},
  {name:'Cairo',           coords:[31.24,30.04],  capital:true},
  {name:'Lagos',           coords:[3.38,6.45]},
  {name:'Johannesburg',    coords:[28.04,-26.20]},
  {name:'Nairobi',         coords:[36.82,-1.29],  capital:true},
  {name:'Addis Ababa',     coords:[38.74,9.03],   capital:true},
];

// US state abbreviation labels [abbrev, lng, lat]
const US_STATES: [string,number,number][] = [
  ['AL',-86.7,32.8],['AK',-153,64],['AZ',-111.1,34.3],['AR',-92.4,34.9],
  ['CA',-119.4,36.8],['CO',-105.5,39],['CT',-72.7,41.6],['DE',-75.5,39.1],
  ['FL',-81.5,27.8],['GA',-83.4,32.7],['HI',-157,20.3],['ID',-114.5,44.4],
  ['IL',-89.2,40.3],['IN',-86.1,40.3],['IA',-93.1,42.1],['KS',-98.4,38.5],
  ['KY',-84.3,37.5],['LA',-91.8,31.1],['ME',-69.4,45.3],['MD',-76.6,39.0],
  ['MA',-71.6,42.2],['MI',-84.7,44.3],['MN',-93.9,46.4],['MS',-89.6,32.7],
  ['MO',-92.5,38.4],['MT',-110.5,46.9],['NE',-99.9,41.5],['NV',-116.4,38.5],
  ['NH',-71.6,43.7],['NJ',-74.4,40.1],['NM',-106.1,34.3],['NY',-75.5,43.3],
  ['NC',-79,35.5],['ND',-100.3,47.5],['OH',-82.8,40.4],['OK',-96.9,35.6],
  ['OR',-120.6,44],['PA',-77.2,40.9],['RI',-71.5,41.7],['SC',-80.9,33.8],
  ['SD',-100.2,44.4],['TN',-86.7,35.8],['TX',-99,31.5],['UT',-111.9,39.3],
  ['VT',-72.7,44.1],['VA',-78.5,37.5],['WA',-120.7,47.4],['WV',-80.6,38.6],
  ['WI',-89.6,44.6],['WY',-107.6,43.1],
];

const TYPE_COLORS: Record<string, string> = {
  military:'#ff2d55', economic:'#ffd700', cyber:'#00f5ff',
  diplomatic:'#b44fff', intelligence:'#00ff9d', nuclear:'#ff2d55', humanitarian:'#ff6a00',
};
const SEV_COLORS: Record<string, string> = {
  low:'#00ff9d', medium:'#ffd700', high:'#ff6a00', critical:'#ff2d55',
};

type UnitKind = 'jet'|'missile'|'nuclear'|'naval'|'submarine'|'troops';

interface MapUnit {
  id: string;
  kind: UnitKind;
  from: [number, number];
  to: [number, number];
  originLabel: string;
  progress: number;
  labelOpacity: number;
  color: string;
  speed: number;
  exploding: boolean;
  angle: number; // degrees for jet rotation
}

interface Arc { id: string; from:[number,number]; to:[number,number]; color:string; }

function lerp(a:number,b:number,t:number){ return a+(b-a)*t; }
function easeInOut(t:number){ return t<0.5?2*t*t:-1+(4-2*t)*t; }
function travelAngle(from:[number,number],to:[number,number]){
  const dx=to[0]-from[0], dy=-(to[1]-from[1]);
  return Math.atan2(dy,dx)*180/Math.PI;
}

function getUnitConfig(ev: GeoEvent): { kind: UnitKind; symbol: string; speed: number; soundType: string } {
  const t = (ev.title+ev.description).toLowerCase();
  if (ev.type==='nuclear') return {kind:'nuclear',symbol:'☢',speed:0.006,soundType:'nuclear'};
  if (t.includes('submarine')||t.includes('sub ')) return {kind:'submarine',symbol:'◎',speed:0.009,soundType:'sonar'};
  if (t.includes('naval')||t.includes('fleet')||t.includes('carrier')||t.includes('warship')||t.includes('ship')) return {kind:'naval',symbol:'⚓',speed:0.009,soundType:'naval'};
  if (t.includes('missile')||t.includes('rocket')||t.includes('hypersonic')||t.includes('ballistic')) return {kind:'missile',symbol:'⟶',speed:0.028,soundType:'missile'};
  if (t.includes('air')||t.includes('jet')||t.includes('fighter')||t.includes('bomber')||t.includes('strike')||t.includes('aircraft')) return {kind:'jet',symbol:'✈',speed:0.018,soundType:'jet'};
  if (ev.type==='military') return {kind:'troops',symbol:'▲',speed:0.012,soundType:'military'};
  return {kind:'jet',symbol:'✈',speed:0.018,soundType:'jet'};
}

// ── Web Audio ─────────────────────────────────────────────────────────────────
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
      // Engine roar + doppler sweep
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
    } else if(soundType==='naval'){
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=80;o.connect(g);g.connect(ctx.destination);
      g.gain.setValueAtTime(vol*0.5,now);g.gain.exponentialRampToValueAtTime(0.0001,now+0.8);
      o.start(now);o.stop(now+0.8);
    } else { // military/troops
      [220,330,440].forEach((f,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='sawtooth';o.frequency.value=f;o.connect(g);g.connect(ctx.destination);
        g.gain.setValueAtTime(vol,now+i*0.07);g.gain.exponentialRampToValueAtTime(0.0001,now+i*0.07+0.15);
        o.start(now+i*0.07);o.stop(now+i*0.07+0.15);
      });
    }
  } catch(_){}
}

export default function WorldMap({ conflictZones, events, tension, isRunning, leaders, isExpanded, onExpandToggle, breakingIntel = [] }: Props) {
  const [arcs, setArcs]             = useState<Arc[]>([]);
  const [units, setUnits]           = useState<MapUnit[]>([]);
  const [hoveredZone, setHoveredZone]     = useState<string|null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<{id:string; label:string; desc:string; x:number; y:number}|null>(null);
  type CinPhase = 'alert'|'zoom'|'satellite'|'missile'|'impact'|'shockwave'|'damage'|'report'|'done';
  const [cinematic, setCinematic] = useState<{
    active:boolean; phase:CinPhase; color:string; label:string;
    originDir:[number,number]; targetLabel:string; eventType:string; impact:number;
  }>({active:false,phase:'done',color:'#ff2d55',label:'',originDir:[0,1],targetLabel:'',eventType:'military',impact:8});
  const cinematicRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<string|null>(null);
  const [mousePos, setMousePos]     = useState<{x:number;y:number}>({x:0,y:0});
  const [zoom, setZoom]             = useState(1);
  const [center, setCenter]         = useState<[number,number]>([10,25]);
  const [flashColor, setFlashColor] = useState<string|null>(null);
  const [feedActive, setFeedActive] = useState(false);
  const mapDivRef = useRef<HTMLDivElement>(null);

  const audioCtxRef  = useRef<AudioContext|null>(null);
  const panAnimRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const unitAnimRef  = useRef<ReturnType<typeof setInterval>|null>(null);
  const unitsRef     = useRef<MapUnit[]>([]);
  const zoomRef      = useRef(1);
  const centerRef    = useRef<[number,number]>([10,25]);
  const lastEvIdRef  = useRef<string|null>(null);

  useEffect(()=>{ zoomRef.current=zoom; },[zoom]);
  useEffect(()=>{ centerRef.current=center; },[center]);

  // ── New event handler ──────────────────────────────────────────────────────
  useEffect(()=>{
    if(!isRunning||events.length===0) return;
    const ev=events[0];
    if(ev.id===lastEvIdRef.current) return;
    lastEvIdRef.current=ev.id;

    const cfg=getUnitConfig(ev);
    const color=TYPE_COLORS[ev.type]||'#00f5ff';

    // Sound
    playSound(cfg.soundType,ev.impact,audioCtxRef);

    // Cinematic sequence — only for major strikes (impact >= 7)
    const isMajorStrike = ev.impact >= 7 && (ev.type === 'military' || ev.type === 'nuclear');
    if(isMajorStrike){
      cinematicRef.current.forEach(t=>clearTimeout(t));
      cinematicRef.current=[];
      const label = ev.title.length>42 ? ev.title.slice(0,42)+'…' : ev.title;
      const originLead = ev.affectedLeaders[0];
      const targetLead = ev.affectedLeaders[1] || ev.affectedLeaders[0];
      const originC = LEADER_COORDS[originLead] || REGION_COORDS[ev.region] || [0,20] as [number,number];
      const targetC = LEADER_COORDS[targetLead] || REGION_COORDS[ev.region] || [0,20] as [number,number];
      // Direction vector from origin to target (normalized, for arrow display)
      const dx = targetC[0]-originC[0], dy = targetC[1]-originC[1];
      const dist = Math.sqrt(dx*dx+dy*dy)||1;
      const originDir:[number,number] = [dx/dist, dy/dist];
      setCinematic({active:true,phase:'alert',color,label,originDir,targetLabel:LEADER_NAMES[targetLead]||ev.region,eventType:ev.type,impact:ev.impact});
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'zoom'})),900));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'satellite'})),1800));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'missile'})),2600));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'impact'})),4200));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'shockwave'})),4700));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'damage'})),5200));
      cinematicRef.current.push(setTimeout(()=>setCinematic(p=>({...p,phase:'report'})),7000));
      cinematicRef.current.push(setTimeout(()=>{setCinematic(p=>({...p,active:false,phase:'done'}));setFeedActive(true);},12000));
    }

    // Flash
    setFlashColor(color);
    setTimeout(()=>setFlashColor(null),900);

    // Origin: use first affectedLeader's position or region
    const originLid = ev.affectedLeaders[0];
    const origin: [number,number] = LEADER_COORDS[originLid] || REGION_COORDS[ev.region] || REGION_COORDS['Global'];
    const originName = LEADER_NAMES[originLid] || ev.region || 'UNKNOWN';

    // Spawn 1-3 units
    const count = ev.impact>=8 ? 3 : ev.impact>=5 ? 2 : 1;
    const newUnits: MapUnit[] = ev.affectedLeaders.slice(1,1+count).map((lid,i)=>{
      const dest = LEADER_COORDS[lid] || LEADER_COORDS['usa'];
      return {
        id:`u_${Date.now()}_${i}`,
        kind:cfg.kind,
        from:origin,
        to:dest,
        originLabel:originName,
        progress:0,
        labelOpacity:1,
        color,
        speed:cfg.speed,
        exploding:false,
        angle:travelAngle(origin,dest),
      };
    });

    if(newUnits.length>0){
      unitsRef.current=[...unitsRef.current.slice(-9),...newUnits];
      setUnits([...unitsRef.current]);
    }

    // Arcs
    const newArcs:Arc[]=ev.affectedLeaders.slice(0,5).map((lid,i)=>({
      id:`arc_${Date.now()}_${i}`,
      from:origin,
      to:LEADER_COORDS[lid]||LEADER_COORDS['usa'],
      color,
    }));
    setArcs(newArcs);
    setTimeout(()=>setArcs([]),5000);

    // Auto-pan
    const tgtC:[number,number]=[...origin] as [number,number];
    const tgtZ=ev.impact>=8?3.8:ev.impact>=5?3.0:2.3;
    if(panAnimRef.current) clearInterval(panAnimRef.current);
    const sC:[number,number]=[...centerRef.current] as [number,number];
    const sZ=zoomRef.current; let step=0;
    panAnimRef.current=setInterval(()=>{
      step++;const t=easeInOut(step/40);
      const nc:[number,number]=[lerp(sC[0],tgtC[0],t),lerp(sC[1],tgtC[1],t)];
      const nz=lerp(sZ,tgtZ,t);
      setCenter(nc);setZoom(nz);centerRef.current=nc;zoomRef.current=nz;
      if(step>=40){
        clearInterval(panAnimRef.current!);
        setTimeout(()=>{
          let s2=0;const hC:[number,number]=[...centerRef.current] as [number,number];const hZ=zoomRef.current;
          panAnimRef.current=setInterval(()=>{
            s2++;const bt=easeInOut(s2/40);
            const bc:[number,number]=[lerp(hC[0],lerp(hC[0],10,0.4),bt),lerp(hC[1],lerp(hC[1],25,0.4),bt)];
            setCenter(bc);setZoom(lerp(hZ,2.2,bt));centerRef.current=bc;zoomRef.current=lerp(hZ,2.2,bt);
            if(s2>=40) clearInterval(panAnimRef.current!);
          },50);
        },4500);
      }
    },50);
    return () => { cinematicRef.current.forEach(t=>clearTimeout(t)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[events.length,isRunning]);

  // ── Unit animation loop ────────────────────────────────────────────────────
  useEffect(()=>{
    if(unitAnimRef.current) clearInterval(unitAnimRef.current);
    unitAnimRef.current=setInterval(()=>{
      if(unitsRef.current.length===0) return;
      let changed=false;
      unitsRef.current=unitsRef.current.map(u=>{
        if(u.exploding){changed=true;return{...u,progress:u.progress+0.07};}
        if(u.progress>=1) return u;
        changed=true;
        const np=u.progress+u.speed;
        const lo=Math.max(0,u.labelOpacity-0.035);
        if(np>=1) return{...u,progress:1,labelOpacity:0,exploding:true};
        return{...u,progress:np,labelOpacity:lo};
      }).filter(u=>!(u.exploding&&u.progress>1.6));
      if(changed) setUnits([...unitsRef.current]);
    },50);
    return()=>{if(unitAnimRef.current) clearInterval(unitAnimRef.current);};
  },[]);

  const handleMoveEnd=useCallback(({zoom:z,coordinates}:{zoom:number;coordinates:[number,number]})=>{
    setZoom(z);zoomRef.current=z;setCenter(coordinates);centerRef.current=coordinates;
  },[]);

  const getFill=useCallback((geoId:string)=>{
    const lid=ISO_TO_LEADER[geoId];
    if(!lid) return 'rgba(6,14,30,0.95)';
    const leader=leaders.find(l=>l.id===lid);
    if(!leader) return 'rgba(8,18,40,0.9)';
    const a=leader.aggression;
    if(a>=80) return 'rgba(255,45,85,0.45)';
    if(a>=60) return 'rgba(255,106,0,0.38)';
    if(a>=40) return 'rgba(255,215,0,0.28)';
    return 'rgba(0,245,255,0.18)';
  },[leaders]);

  const getStroke=useCallback((geoId:string)=>{
    const lid=ISO_TO_LEADER[geoId];
    if(!lid) return 'rgba(0,245,255,0.12)';
    const leader=leaders.find(l=>l.id===lid);
    return leader?leader.color+'70':'rgba(0,245,255,0.2)';
  },[leaders]);

  const tc=tension>=75?'#ff2d55':tension>=55?'#ff6a00':tension>=30?'#ffd700':'#00f5ff';

  function unitPos(u:MapUnit):[number,number]{
    const t=easeInOut(Math.min(u.progress,1));
    return [lerp(u.from[0],u.to[0],t),lerp(u.from[1],u.to[1],t)];
  }

  // Static assets: naval ships and subs from active leaders
  const activeLeaderIds=new Set(leaders.filter(l=>l.status==='at_war'||l.status==='mobilizing'||l.status==='hostile').map(l=>l.id));
  const navalMarkers:Array<{id:string;coords:[number,number];lid:string;isSub:boolean}>=[];
  if(isRunning){
    leaders.forEach(l=>{
      const bases=NAVAL_BASES[l.id];
      if(bases) bases.forEach((b,i)=>navalMarkers.push({id:`nav_${l.id}_${i}`,coords:b,lid:l.id,isSub:false}));
      const sub=SUB_PATROL[l.id];
      if(sub) navalMarkers.push({id:`sub_${l.id}`,coords:sub,lid:l.id,isSub:true});
    });
  }

  // Ground troops for at_war leaders
  const troopMarkers:Array<{id:string;coords:[number,number];color:string}>=[];
  if(isRunning){
    leaders.filter(l=>activeLeaderIds.has(l.id)).forEach(l=>{
      const base=LEADER_COORDS[l.id];
      if(!base) return;
      [[0,0],[1.8,1],[-1.8,1],[0.5,-2],[-1,2]].forEach(([dx,dy],i)=>{
        troopMarkers.push({id:`trp_${l.id}_${i}`,coords:[base[0]+dx,base[1]+dy] as [number,number],color:l.color});
      });
    });
  }

  return (
    <div ref={mapDivRef} className="w-full h-full relative overflow-hidden"
      style={{background:'linear-gradient(180deg,#010c1e 0%,#010408 100%)'}}
      onMouseMove={(e)=>{
        if(!mapDivRef.current) return;
        const r=mapDivRef.current.getBoundingClientRect();
        setMousePos({x:e.clientX-r.left, y:e.clientY-r.top});
      }}>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:'linear-gradient(rgba(0,245,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.022) 1px,transparent 1px)',
        backgroundSize:'60px 60px',
      }}/>

      {/* Event flash */}
      {flashColor&&(
        <div className="absolute inset-0 pointer-events-none z-10" style={{
          background:`radial-gradient(ellipse at center,${flashColor}20 0%,transparent 70%)`,
          animation:'fade-out 0.9s ease-out forwards',
        }}/>
      )}

      {/* Tension vignette */}
      {tension>45&&(
        <div className="absolute inset-0 pointer-events-none" style={{
          background:`radial-gradient(ellipse at center,transparent 45%,rgba(255,45,85,${(tension-45)/550}) 100%)`,
        }}/>
      )}

      {/* ── CINEMATIC STRIKE SEQUENCE ── */}
      {cinematic.active&&(
        <div className="absolute inset-0 pointer-events-none" style={{zIndex:25}}>

          {/* Phase: ALERT — full-screen red flash + warning banner */}
          {cinematic.phase==='alert'&&(
            <>
              <div className="absolute inset-0 impact-flash" style={{background:`${cinematic.color}28`,zIndex:26}}/>
              <div className="absolute inset-x-0 top-0 flex flex-col items-center justify-center" style={{height:'100%',zIndex:27}}>
                <div className="font-orbitron font-black alert-pulse text-center px-8 py-6 rounded-2xl"
                  style={{
                    background:'rgba(0,0,0,0.92)',
                    border:`2px solid ${cinematic.color}`,
                    boxShadow:`0 0 60px ${cinematic.color}60, inset 0 0 40px ${cinematic.color}10`,
                    letterSpacing:'0.3em',
                    fontSize:'clamp(18px,3vw,32px)',
                    color:cinematic.color,
                    textShadow:`0 0 30px ${cinematic.color}`,
                  }}>
                  {cinematic.eventType==='nuclear'?'☢ NUCLEAR LAUNCH DETECTED':'⚠ STRIKE EVENT DETECTED'}
                </div>
                <div className="font-mono mt-4 px-6 py-2 rounded-lg" style={{background:'rgba(0,0,0,0.8)',border:`1px solid ${cinematic.color}40`,color:'rgba(255,255,255,0.8)',fontSize:'13px',letterSpacing:'0.1em'}}>
                  {cinematic.label}
                </div>
              </div>
            </>
          )}

          {/* Persistent dark vignette during active phases */}
          {(cinematic.phase==='zoom'||cinematic.phase==='satellite'||cinematic.phase==='missile'||cinematic.phase==='impact'||cinematic.phase==='shockwave'||cinematic.phase==='damage'||cinematic.phase==='report')&&(
            <div className="absolute inset-0" style={{
              background:'radial-gradient(ellipse at center,transparent 25%,rgba(0,0,0,0.72) 100%)',
              transition:'all 1s ease',
              zIndex:26,
            }}/>
          )}

          {/* Phase: SATELLITE — scan line effect + grid overlay */}
          {(cinematic.phase==='satellite'||cinematic.phase==='missile')&&(
            <>
              {/* Satellite scan line */}
              <div className="absolute left-0 right-0 sat-scan" style={{
                height:'2px',
                background:`linear-gradient(90deg,transparent,${cinematic.color}80,${cinematic.color},${cinematic.color}80,transparent)`,
                zIndex:27,
                boxShadow:`0 0 12px ${cinematic.color}`,
              }}/>
              {/* Satellite grid */}
              <div className="absolute inset-0" style={{
                backgroundImage:`linear-gradient(${cinematic.color}08 1px,transparent 1px),linear-gradient(90deg,${cinematic.color}08 1px,transparent 1px)`,
                backgroundSize:'30px 30px',
                zIndex:26,
              }}/>
              {/* Corner brackets — war-room targeting reticle */}
              {[['top-6 left-6','0 0','12px 0 0 12px'],['top-6 right-6','0 0','0 12px 12px 0'],['bottom-6 left-6','0 0','0 0 12px 12px'],['bottom-6 right-6','0 0','0 0 12px 12px']].map((_,i)=>{
                const corners=[{t:6,l:6,br:'12px 0 0 0'},{t:6,r:6,br:'0 12px 0 0'},{b:6,l:6,br:'0 0 0 12px'},{b:6,r:6,br:'0 0 12px 0'}];
                const c=corners[i];
                return(
                  <div key={i} className="absolute" style={{
                    width:'32px',height:'32px',
                    top:c.t,bottom:c.b,left:c.l,right:c.r,
                    border:`2px solid ${cinematic.color}`,
                    borderRadius:c.br,
                    zIndex:28,
                    boxShadow:`0 0 12px ${cinematic.color}50`,
                  }}/>
                );
              })}
            </>
          )}

          {/* Phase: MISSILE — SVG arc trajectory */}
          {cinematic.phase==='missile'&&(
            <svg className="absolute inset-0 w-full h-full" style={{zIndex:29}} viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Trajectory arc — quadratic bezier */}
              <path
                d={`M 15,85 Q 50,10 85,50`}
                fill="none"
                stroke={cinematic.color}
                strokeWidth="0.4"
                strokeDasharray="1200"
                strokeDashoffset="1200"
                strokeLinecap="round"
                opacity="0.9"
                className="arc-draw"
                style={{filter:`drop-shadow(0 0 3px ${cinematic.color})`}}
              />
              {/* Missile head dot traveling along arc */}
              <circle r="1.2" fill={cinematic.color} opacity="0.95" style={{filter:`drop-shadow(0 0 4px ${cinematic.color})`}}>
                <animateMotion dur="1.4s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1">
                  <mpath xlinkHref="#missileArc"/>
                </animateMotion>
              </circle>
              <path id="missileArc" d="M 15,85 Q 50,10 85,50" fill="none"/>
              {/* Origin point */}
              <circle cx="15" cy="85" r="1.5" fill={cinematic.color} opacity="0.6"/>
              {/* Target reticle */}
              <g opacity="0.85">
                <circle cx="85" cy="50" r="4" fill="none" stroke={cinematic.color} strokeWidth="0.3">
                  <animate attributeName="r" values="4;7;4" dur="0.8s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.8s" repeatCount="indefinite"/>
                </circle>
                <circle cx="85" cy="50" r="1.2" fill={cinematic.color}/>
                <line x1="82" y1="50" x2="78" y2="50" stroke={cinematic.color} strokeWidth="0.3" opacity="0.7"/>
                <line x1="88" y1="50" x2="92" y2="50" stroke={cinematic.color} strokeWidth="0.3" opacity="0.7"/>
                <line x1="85" y1="47" x2="85" y2="43" stroke={cinematic.color} strokeWidth="0.3" opacity="0.7"/>
                <line x1="85" y1="53" x2="85" y2="57" stroke={cinematic.color} strokeWidth="0.3" opacity="0.7"/>
              </g>
              {/* Target label */}
              <text x="87" y="48" fill={cinematic.color} fontSize="2.2" fontFamily="Share Tech Mono" opacity="0.8">
                {cinematic.targetLabel}
              </text>
            </svg>
          )}

          {/* Phase: IMPACT — white core flash + radial burst */}
          {cinematic.phase==='impact'&&(
            <>
              <div className="absolute inset-0 impact-flash" style={{
                background:'rgba(255,255,255,0.18)',
                zIndex:27,
              }}/>
              <div className="absolute inset-0 flex items-center justify-center" style={{zIndex:28}}>
                <div className="impact-flash" style={{
                  width:'120px',height:'120px',borderRadius:'50%',
                  background:`radial-gradient(circle,#ffffff 0%,${cinematic.color} 35%,transparent 70%)`,
                  boxShadow:`0 0 80px ${cinematic.color},0 0 160px ${cinematic.color}40`,
                }}/>
              </div>
            </>
          )}

          {/* Phase: SHOCKWAVE — expanding rings */}
          {(cinematic.phase==='shockwave'||cinematic.phase==='damage')&&(
            <div className="absolute inset-0 flex items-center justify-center" style={{zIndex:27}}>
              {[0,1,2,3].map(i=>(
                <div key={i} className="absolute rounded-full" style={{
                  width:`${100+i*180}px`,
                  height:`${100+i*180}px`,
                  border:`${i===0?'3px':'1.5px'} solid ${cinematic.color}`,
                  animation:`shockwave-ring ${1.2+i*0.3}s ${i*0.15}s cubic-bezier(0,0,0.2,1) forwards`,
                  opacity:0,
                  boxShadow:`0 0 20px ${cinematic.color}60`,
                }}/>
              ))}
              {/* Inner blast core */}
              <div style={{
                width:'60px',height:'60px',borderRadius:'50%',
                background:`radial-gradient(circle,${cinematic.color}80 0%,transparent 70%)`,
                animation:'damage-pulse 2s ease-in-out infinite',
              }}/>
            </div>
          )}

          {/* Phase: DAMAGE — red zone overlay */}
          {cinematic.phase==='damage'&&(
            <div className="absolute inset-0 flex items-center justify-center" style={{zIndex:26}}>
              <div className="damage-pulse" style={{
                width:'280px',height:'180px',
                borderRadius:'50%',
                background:`radial-gradient(ellipse,${cinematic.color}35 0%,${cinematic.color}15 45%,transparent 70%)`,
                border:`1px solid ${cinematic.color}50`,
              }}/>
            </div>
          )}

          {/* Phase: REPORT — intel summary panel */}
          {cinematic.phase==='report'&&(
            <div className="absolute inset-0 flex items-center justify-center" style={{zIndex:29}}>
              <div className="font-mono rounded-2xl px-8 py-6 fade-in" style={{
                background:'rgba(0,0,0,0.94)',
                border:`1px solid ${cinematic.color}60`,
                boxShadow:`0 0 50px ${cinematic.color}25,0 0 100px rgba(0,0,0,0.8)`,
                backdropFilter:'blur(16px)',
                maxWidth:'460px',
                width:'90%',
              }}>
                <div className="font-orbitron font-bold mb-4" style={{color:cinematic.color,fontSize:'13px',letterSpacing:'0.25em',textAlign:'center'}}>
                  ■ STRIKE ASSESSMENT REPORT
                </div>
                <div style={{borderTop:`1px solid ${cinematic.color}30`,paddingTop:'12px'}}>
                  {[
                    {l:'EVENT',v:cinematic.label},
                    {l:'TYPE',v:cinematic.eventType.toUpperCase()},
                    {l:'IMPACT LEVEL',v:`${cinematic.impact}/10 — ${cinematic.impact>=9?'CATASTROPHIC':cinematic.impact>=7?'SEVERE':'SIGNIFICANT'}`},
                    {l:'TARGET ZONE',v:cinematic.targetLabel},
                    {l:'STATUS',v:'IMPACT CONFIRMED · DAMAGE ASSESSMENT ONGOING'},
                  ].map(({l,v})=>(
                    <div key={l} className="flex gap-3 mb-2">
                      <span style={{color:'rgba(255,255,255,0.35)',fontSize:'10px',width:'100px',flexShrink:0,letterSpacing:'0.08em'}}>{l}</span>
                      <span style={{color:'rgba(255,255,255,0.88)',fontSize:'10px',lineHeight:'1.4'}}>{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center font-orbitron" style={{color:`${cinematic.color}80`,fontSize:'9px',letterSpacing:'0.2em'}}>
                  RETURNING TO COMMAND VIEW...
                </div>
              </div>
            </div>
          )}

          {/* Persistent status banner (all phases except alert/done) */}
          {(cinematic.phase==='zoom'||cinematic.phase==='satellite'||cinematic.phase==='missile')&&(
            <div className="absolute left-1/2" style={{
              zIndex:30, top:'52px', transform:'translateX(-50%)',
              background:'rgba(0,0,0,0.9)',
              border:`1px solid ${cinematic.color}70`,
              borderRadius:'8px', padding:'7px 18px',
              backdropFilter:'blur(14px)',
              boxShadow:`0 0 24px ${cinematic.color}25`,
              whiteSpace:'nowrap',
            }}>
              <div className="font-orbitron font-bold text-center" style={{color:cinematic.color,fontSize:'12px',letterSpacing:'0.2em'}}>
                {cinematic.phase==='zoom'?'TRACKING TARGET — CAMERA LOCK':''}
                {cinematic.phase==='satellite'?'⬢ SATELLITE VIEW ENGAGED':''}
                {cinematic.phase==='missile'?'🚀 STRIKE IN PROGRESS':''}
              </div>
              <div className="font-mono text-center mt-0.5" style={{color:'rgba(255,255,255,0.55)',fontSize:'10px'}}>
                {cinematic.label}
              </div>
            </div>
          )}
        </div>
      )}

      <ComposableMap projection="geoNaturalEarth1" projectionConfig={{scale:148,center:[0,10]}} style={{width:'100%',height:'100%'}}>
        <ZoomableGroup zoom={zoom} center={center} onMoveEnd={handleMoveEnd} minZoom={0.5} maxZoom={20}>

          {/* Country fills */}
          <Geographies geography={GEO_URL}>
            {({geographies}:{geographies:{rsmKey:string;id:string;[k:string]:unknown}[]})=>
              geographies.map((geo:{rsmKey:string;id:string;[k:string]:unknown})=>(
                <Geography key={geo.rsmKey} geography={geo}
                  fill={getFill(geo.id)} stroke={getStroke(geo.id)} strokeWidth={0.4}
                  onMouseEnter={()=>{ const n=ISO_NAMES[geo.id]; if(n) setHoveredCountry(n); }}
                  onMouseLeave={()=>setHoveredCountry(null)}
                  style={{
                    default:{outline:'none',transition:'fill 0.6s ease'},
                    hover:{fill:'rgba(0,245,255,0.28)',outline:'none',cursor:'crosshair'},
                    pressed:{outline:'none'},
                  }}
                />
              ))
            }
          </Geographies>

          {/* Arcs */}
          {arcs.map(arc=>(
            <Line key={arc.id} coordinates={[arc.from,arc.to]}
              stroke={arc.color} strokeWidth={1.0} strokeOpacity={0.7} strokeLinecap="round" className="arc-fade"/>
          ))}

          {/* Country labels */}
          {COUNTRY_LABELS.map(([name,lng,lat])=>(
            <Marker key={name} coordinates={[lng,lat]}>
              <text textAnchor="middle" style={{fontFamily:'"Share Tech Mono",monospace',fontSize:`${3.5/zoom}px`,fill:'rgba(0,245,255,0.4)',letterSpacing:'0.05em',pointerEvents:'none',userSelect:'none'}}>
                {name}
              </text>
            </Marker>
          ))}

          {/* ── Major cities ── */}
          {CITIES.map(city=>{
            const showLabel = zoom >= (city.dc ? 0.5 : city.capital ? 0.7 : 1.2);
            const dotR   = city.dc ? 2.4/zoom : city.capital ? 1.7/zoom : 1.2/zoom;
            const dotColor = city.dc ? '#ffd700' : city.capital ? '#00f5ff' : 'rgba(100,220,255,0.7)';
            const labelFs  = `${city.dc ? 5.5 : city.capital ? 4.5 : 3.8}px`;
            return(
              <Marker key={city.name} coordinates={city.coords}>
                <g>
                  {/* Glow ring for capitals */}
                  {city.capital&&(
                    <circle r={dotR*2.8} fill="none" stroke={dotColor} strokeWidth={0.5/zoom} opacity={0.35}/>
                  )}
                  {/* DC special pulse */}
                  {city.dc&&(
                    <circle r={0} fill="none" stroke="#ffd700" strokeWidth={0.6/zoom} opacity={0}>
                      <animate attributeName="r" values={`${dotR};${dotR*6}`} dur="2.2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite"/>
                    </circle>
                  )}
                  <circle r={dotR} fill={dotColor} opacity={city.dc?1:0.9}
                    style={{filter:`drop-shadow(0 0 ${2/zoom}px ${dotColor})`}}/>
                  {showLabel&&(
                    <text textAnchor="middle" y={-(dotR+1.5/zoom)}
                      style={{
                        fontFamily:'"Share Tech Mono",monospace', fontSize:labelFs,
                        fill:dotColor, pointerEvents:'none', userSelect:'none',
                        fontWeight: city.dc||city.capital ? 'bold' : 'normal',
                        paintOrder:'stroke', stroke:'rgba(0,0,0,0.95)', strokeWidth:`${1.8/zoom}px`,
                      }}>
                      {city.name}
                    </text>
                  )}
                </g>
              </Marker>
            );
          })}

          {/* ── US State labels (visible when zoomed in over USA) ── */}
          {zoom >= 1.5 && US_STATES.map(([abbrev,lng,lat])=>(
            <Marker key={`us_${abbrev}`} coordinates={[lng,lat]}>
              <text textAnchor="middle" dominantBaseline="central"
                style={{
                  fontFamily:'"Share Tech Mono",monospace',
                  fontSize:'4px',
                  fill:'rgba(255,255,255,0.72)',
                  fontWeight:'bold',
                  pointerEvents:'none', userSelect:'none',
                  paintOrder:'stroke', stroke:'rgba(0,0,0,0.9)', strokeWidth:`${0.8/zoom}px`,
                }}>
                {abbrev}
              </text>
            </Marker>
          ))}

          {/* ── Static naval ships & submarines ── */}
          {navalMarkers.map(nm=>{
            const leader=leaders.find(l=>l.id===nm.lid);
            const c=leader?.color||'#00f5ff';
            const s=1/zoom;
            return(
              <Marker key={nm.id} coordinates={nm.coords}
                onMouseEnter={(e:React.MouseEvent)=>{
                  const r=mapDivRef.current?.getBoundingClientRect();
                  if(!r) return;
                  if(nm.isSub){
                    setHoveredUnit({id:nm.id,label:`${leader?.flag||'🌊'} SUBMARINE`,desc:`${leader?.name||''} patrol submarine · stealth depth patrol · armed`,x:e.clientX-r.left,y:e.clientY-r.top});
                  } else {
                    const isCarrier=nm.id.endsWith('_0');
                    setHoveredUnit({id:nm.id,label:`${leader?.flag||'⚓'} ${isCarrier?'AIRCRAFT CARRIER':'BATTLESHIP'}`,desc:`${leader?.name||''} naval group · ${isCarrier?'carrier strike group, 80 aircraft':'destroyer class, armed with cruise missiles'}`,x:e.clientX-r.left,y:e.clientY-r.top});
                  }
                }}
                onMouseLeave={()=>setHoveredUnit(null)}>
                {nm.isSub?(
                  // Submarine shape: elongated hull + conning tower
                  <g opacity={0.85}>
                    <circle r={4*s} fill="none" stroke={c} strokeWidth={0.4*s} opacity={0.4}>
                      <animate attributeName="r" values={`${3*s};${7*s};${3*s}`} dur="4s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="4s" repeatCount="indefinite"/>
                    </circle>
                    {/* Hull */}
                    <ellipse rx={5*s} ry={2*s} fill={c} opacity={0.9}/>
                    {/* Conning tower */}
                    <rect x={-1*s} y={-3.5*s} width={2*s} height={2*s} fill={c} opacity={0.9}/>
                    {/* Periscope */}
                    <line x1={0} y1={-3.5*s} x2={0} y2={-5*s} stroke={c} strokeWidth={0.5*s} opacity={0.7}/>
                    <circle r={0.7*s} cx={0} cy={-5.2*s} fill={c} opacity={0.9}/>
                  </g>
                ):(
                  // Surface ship / battleship / carrier shape
                  <g opacity={0.82}>
                    {/* Hull */}
                    <path d={`M${-7*s},${1*s} L${7*s},${1*s} L${6*s},${2.5*s} L${-6*s},${2.5*s} Z`} fill={c} opacity={0.9}/>
                    {/* Superstructure */}
                    <rect x={-3*s} y={-1.5*s} width={6*s} height={2.5*s} fill={c} opacity={0.9}/>
                    {/* Mast */}
                    <line x1={0} y1={-1.5*s} x2={0} y2={-4*s} stroke={c} strokeWidth={0.5*s} opacity={0.8}/>
                    {/* Radar dish */}
                    <circle r={1*s} cx={0} cy={-4.5*s} fill="none" stroke={c} strokeWidth={0.5*s} opacity={0.7}/>
                    {/* Bow point */}
                    <path d={`M${6*s},${1.5*s} L${9*s},${1.5*s} L${7*s},${-0.5*s} Z`} fill={c} opacity={0.8}/>
                  </g>
                )}
              </Marker>
            );
          })}

          {/* ── Ground troops ── */}
          {troopMarkers.map(tm=>(
            <Marker key={tm.id} coordinates={tm.coords}>
              <g>
                <circle r={1.5/zoom} fill={tm.color} opacity={0.5}>
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <text textAnchor="middle" dominantBaseline="central"
                  style={{fontSize:`${3.5/zoom}px`,fill:tm.color,pointerEvents:'none',fontWeight:'bold'}}>▲</text>
              </g>
            </Marker>
          ))}

          {/* ── Moving units ── */}
          {units.map(u=>{
            const [lng,lat]=unitPos(u);
            const exR=u.exploding?(u.progress-1)*10:0;
            const exOp=u.exploding?Math.max(0,1-(u.progress-1)*1.1):1;

            if(u.exploding){
              return(
                <Marker key={u.id} coordinates={[lng,lat]}>
                  <g>
                    <circle r={exR} fill="none" stroke={u.color} strokeWidth={0.8/zoom} opacity={exOp*0.8}/>
                    <circle r={exR*0.6} fill="none" stroke={u.color} strokeWidth={0.5/zoom} opacity={exOp*0.5}/>
                    <circle r={exR*0.25} fill={u.color} opacity={exOp*0.7}/>
                    <text textAnchor="middle" dominantBaseline="central"
                      style={{fontSize:`${5/zoom}px`,fill:'#fff',opacity:exOp*0.9,pointerEvents:'none'}}>✦</text>
                  </g>
                </Marker>
              );
            }

            const s=1/zoom;
            const ang=-(u.angle); // SVG rotation

            // Unit-specific SVG shapes
            function UnitShape(){
              if(u.kind==='jet'||u.kind==='nuclear'){
                // Fighter jet / bomber silhouette
                return(
                  <g transform={`rotate(${ang} 0 0)`}>
                    {/* Fuselage */}
                    <ellipse rx={5*s} ry={1.2*s} fill={u.color} opacity={0.95}/>
                    {/* Wings */}
                    <path d={`M${-1*s},${0} L${-4*s},${4*s} L${-1*s},${1.5*s} Z`} fill={u.color} opacity={0.85}/>
                    <path d={`M${-1*s},${0} L${-4*s},${-4*s} L${-1*s},${-1.5*s} Z`} fill={u.color} opacity={0.85}/>
                    {/* Tail fins */}
                    <path d={`M${-4*s},${0} L${-6*s},${2*s} L${-5*s},${0} Z`} fill={u.color} opacity={0.75}/>
                    <path d={`M${-4*s},${0} L${-6*s},${-2*s} L${-5*s},${0} Z`} fill={u.color} opacity={0.75}/>
                    {/* Engine glow */}
                    <circle r={1*s} cx={-5.5*s} cy={0} fill={u.kind==='nuclear'?'#ff2d55':'#ffd700'} opacity={0.9}/>
                    {/* Trail */}
                    <line x1={-6*s} y1={0} x2={-14*s} y2={0} stroke={u.color} strokeWidth={0.8*s} strokeOpacity={0.35}/>
                  </g>
                );
              }
              if(u.kind==='missile'){
                return(
                  <g transform={`rotate(${ang} 0 0)`}>
                    {/* Body */}
                    <ellipse rx={4.5*s} ry={1*s} fill={u.color} opacity={0.95}/>
                    {/* Nose */}
                    <path d={`M${4.5*s},${0} L${7*s},${0}`} stroke={u.color} strokeWidth={1.5*s} strokeLinecap="round" opacity={0.95}/>
                    {/* Fins */}
                    <path d={`M${-4*s},${0} L${-6*s},${2.5*s} L${-3.5*s},${0.5*s} Z`} fill={u.color} opacity={0.8}/>
                    <path d={`M${-4*s},${0} L${-6*s},${-2.5*s} L${-3.5*s},${-0.5*s} Z`} fill={u.color} opacity={0.8}/>
                    {/* Exhaust trail */}
                    <line x1={-4.5*s} y1={0} x2={-18*s} y2={0} stroke={u.color} strokeWidth={1.2*s} strokeOpacity={0.4}/>
                    <circle r={1.5*s} cx={-18*s} cy={0} fill={u.color} opacity={0.15}/>
                  </g>
                );
              }
              if(u.kind==='naval'){
                // Moving carrier/battleship — side profile
                return(
                  <g>
                    <ellipse rx={6*s} ry={2*s} fill={u.color} opacity={0.9}/>
                    <rect x={-2*s} y={-3.5*s} width={4*s} height={2*s} fill={u.color} opacity={0.9}/>
                    <line x1={0} y1={-3.5*s} x2={0} y2={-5.5*s} stroke={u.color} strokeWidth={0.5*s} opacity={0.7}/>
                    <path d={`M${5*s},${0.5*s} L${8*s},${0.5*s} L${6.5*s},${-1*s} Z`} fill={u.color} opacity={0.8}/>
                  </g>
                );
              }
              if(u.kind==='submarine'){
                return(
                  <g>
                    <ellipse rx={5*s} ry={2*s} fill={u.color} opacity={0.9}/>
                    <rect x={-0.8*s} y={-3.5*s} width={1.6*s} height={1.8*s} fill={u.color} opacity={0.9}/>
                    <line x1={0} y1={-3.5*s} x2={0} y2={-5*s} stroke={u.color} strokeWidth={0.5*s} opacity={0.7}/>
                  </g>
                );
              }
              // troops
              return(
                <g>
                  <polygon points={`0,${-4*s} ${3.5*s},${3*s} ${-3.5*s},${3*s}`} fill={u.color} opacity={0.9}/>
                  <circle r={1.5*s} cy={-5.5*s} fill={u.color} opacity={0.85}/>
                </g>
              );
            }

            return(
              <Marker key={u.id} coordinates={[lng,lat]}>
                <g>
                  {/* Glow halo */}
                  <circle r={4*s} fill={u.color} opacity={0.15}>
                    <animate attributeName="opacity" values="0.15;0.35;0.15" dur="0.8s" repeatCount="indefinite"/>
                  </circle>
                  {/* Unit shape */}
                  <UnitShape/>
                  {/* Dispatch label: FROM → TO */}
                  {u.labelOpacity>0.05&&(
                    <g transform={`translate(0,${-11*s})`}>
                      <rect x={-18*s} y={-4*s} width={36*s} height={6*s} rx={1.5*s}
                        fill="rgba(0,0,0,0.88)" stroke={u.color} strokeWidth={0.4*s} opacity={u.labelOpacity}/>
                      <text textAnchor="middle" y={1*s}
                        style={{fontFamily:'"Share Tech Mono",monospace',fontSize:`${3.5*s}px`,fill:u.color,opacity:u.labelOpacity,fontWeight:'bold'}}>
                        {u.originLabel} →
                      </text>
                    </g>
                  )}
                </g>
              </Marker>
            );
          })}

          {/* Conflict zone hotspots */}
          {conflictZones.map(zone=>{
            const coords=(REGION_COORDS[zone.name]||REGION_COORDS[zone.region]||[0,20]) as [number,number];
            const color=SEV_COLORS[zone.severity];
            const r=zone.severity==='critical'?3.5:zone.severity==='high'?2.8:2;
            const isHov=hoveredZone===zone.id;
            return(
              <Marker key={zone.id} coordinates={coords}
                onMouseEnter={()=>setHoveredZone(zone.id)} onMouseLeave={()=>setHoveredZone(null)}>
                <circle r={r} fill="none" stroke={color} strokeWidth={0.7} opacity={0}>
                  <animate attributeName="r" values={`${r};${r*5}`} dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.7;0" dur="2.5s" repeatCount="indefinite"/>
                </circle>
                <circle r={r} fill="none" stroke={color} strokeWidth={0.5} opacity={0}>
                  <animate attributeName="r" values={`${r};${r*3.5}`} dur="2.5s" begin="0.9s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.5;0" dur="2.5s" begin="0.9s" repeatCount="indefinite"/>
                </circle>
                <circle r={r} fill={color} opacity={0.9} style={{cursor:'pointer'}}/>
                <circle r={r*0.4} fill="white" opacity={0.95}/>
                {(isHov||zone.severity==='critical')&&(
                  <g transform={`translate(${r+1.5},0)`}>
                    <rect x={0} y={-4.5} width={zone.name.length*2.2+5} height={9} rx={1.2}
                      fill="rgba(1,4,10,0.92)" stroke={color} strokeWidth={0.3}/>
                    <text x={2.5} y={2} style={{fontFamily:'"Share Tech Mono",monospace',fontSize:'3px',fill:color}}>
                      {zone.name}
                    </text>
                  </g>
                )}
              </Marker>
            );
          })}

        </ZoomableGroup>
      </ComposableMap>

      {/* News marquee overlay — top of map */}
      <NewsMarquee simIntel={breakingIntel} tension={tension} />

      {/* Cinematic feed — triggers after major strike sequence */}
      <CinematicFeed
        active={feedActive}
        color={cinematic.color}
        eventTitle={cinematic.label}
        targetLabel={cinematic.targetLabel}
        eventType={cinematic.eventType}
        impact={cinematic.impact}
        onComplete={() => setFeedActive(false)}
      />

      {/* Crisis log — bottom left */}
      <CrisisLog events={events} />

      {/* Country hover tooltip */}
      {hoveredCountry && (
        <div className="absolute pointer-events-none z-30 font-mono"
          style={{
            left: Math.min(mousePos.x + 12, (mapDivRef.current?.clientWidth ?? 800) - 160),
            top: Math.max(mousePos.y - 32, 8),
            background: 'rgba(0,4,12,0.94)',
            border: '1px solid rgba(0,245,255,0.45)',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#00f5ff',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            boxShadow: '0 0 16px rgba(0,245,255,0.2)',
          }}>
          <span style={{color:'rgba(0,245,255,0.5)', marginRight:'6px'}}>◆</span>
          {hoveredCountry.toUpperCase()}
        </div>
      )}

      {/* Unit hover tooltip */}
      {hoveredUnit&&(
        <div className="absolute pointer-events-none z-30 font-mono"
          style={{
            left:Math.min(hoveredUnit.x+14,(mapDivRef.current?.clientWidth??800)-220),
            top:Math.max(hoveredUnit.y-60,8),
            background:'rgba(0,4,12,0.96)',
            border:'1px solid rgba(0,245,255,0.5)',
            padding:'8px 14px',
            borderRadius:'8px',
            minWidth:'180px',
            boxShadow:'0 0 20px rgba(0,245,255,0.2)',
            backdropFilter:'blur(12px)',
          }}>
          <div className="font-orbitron font-bold" style={{color:'#00f5ff',fontSize:'11px',letterSpacing:'0.12em',marginBottom:'4px'}}>
            {hoveredUnit.label}
          </div>
          <div style={{color:'rgba(255,255,255,0.6)',fontSize:'10px',lineHeight:'1.5'}}>
            {hoveredUnit.desc}
          </div>
        </div>
      )}

      {/* HUD top — offset below the 40px marquee */}
      <div className="absolute left-0 right-0 flex items-center justify-between px-3 py-1.5 pointer-events-none"
        style={{top:'40px', background:'linear-gradient(180deg,rgba(1,4,10,0.5) 0%,transparent 100%)'}}>
        <span className="font-mono" style={{color:'rgba(0,245,255,0.3)',fontSize:'7.5px',letterSpacing:'0.2em'}}>
          GLOBAL INTELLIGENCE NETWORK // CLASSIFIED
        </span>
        <span className="font-mono font-bold" style={{color:tc,fontSize:'8px',letterSpacing:'0.15em'}}>
          TENSION {tension}/100
        </span>
      </div>

      {/* Expand button */}
      <button onClick={onExpandToggle}
        className="absolute font-mono px-2 py-0.5 rounded border z-20 transition-all"
        style={{top:'44px',right:'8px',fontSize:'8.5px',letterSpacing:'0.1em',color:'rgba(0,245,255,0.65)',borderColor:'rgba(0,245,255,0.2)',background:'rgba(0,0,0,0.7)'}}>
        {isExpanded?'⊠ EXIT FULLSCREEN':'⊡ EXPAND MAP'}
      </button>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
        {[{label:'+',action:()=>setZoom(z=>Math.min(z+0.75,10))},{label:'−',action:()=>setZoom(z=>Math.max(z-0.75,0.5))},{label:'⌂',action:()=>{setZoom(1);setCenter([10,25]);}}]
          .map(({label,action})=>(
            <button key={label} onClick={action}
              className="w-6 h-6 flex items-center justify-center font-mono rounded border"
              style={{fontSize:label==='⌂'?'11px':'14px',color:'rgba(0,245,255,0.55)',borderColor:'rgba(0,245,255,0.18)',background:'rgba(0,0,0,0.75)'}}>
              {label}
            </button>
          ))}
      </div>

      {/* Bottom HUD */}
      <div className="absolute bottom-3 left-3 font-mono pointer-events-none"
        style={{color:'rgba(0,245,255,0.2)',fontSize:'7px',letterSpacing:'0.1em'}}>
        NUC RISK: {tension>=85?'DEFCON 1':tension>=70?'CRITICAL':tension>=50?'ELEVATED':'MONITORED'} ·
        ACTIVE ZONES: {conflictZones.length} · ▲ GROUND  ⚓ NAVAL  ◎ SUB  ✈ AIR  ☢ NUC
      </div>
    </div>
  );
}
