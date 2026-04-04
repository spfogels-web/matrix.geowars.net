'use client';
import { useEffect, useState } from 'react';

interface Props {
  active: boolean;
  color: string;
  eventTitle: string;
  targetLabel: string;
  eventType: string;
  impact: number;
  onComplete: () => void;
}

type FeedType = 'satellite' | 'drone' | 'broadcast';

const FEED_DURATION = 4500; // ms per feed clip
const FEEDS: FeedType[] = ['satellite', 'drone', 'broadcast'];

function SatelliteFeed({ targetLabel }: { color: string; targetLabel: string }) {
  // Fixed values so they don't change on re-render
  const lat = '34.7192';
  const lon = '36.4842';
  const orbit = '247';
  const alt = 'KH-12 · ALT 423km · RES 0.15m/px';

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: '#010a04', fontFamily: 'Share Tech Mono, monospace' }}>

      {/* Full terrain scene — richly detailed satellite view */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="sg1" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0a1a08"/>
            <stop offset="100%" stopColor="#020a02"/>
          </radialGradient>
          <radialGradient id="craterGrad" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
            <stop offset="15%" stopColor="#ff8800" stopOpacity="0.8"/>
            <stop offset="40%" stopColor="#cc3300" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="fireGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffff00" stopOpacity="0.95"/>
            <stop offset="30%" stopColor="#ff6600" stopOpacity="0.8"/>
            <stop offset="70%" stopColor="#cc2200" stopOpacity="0.5"/>
            <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
          </radialGradient>
          <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
          <filter id="blur5"><feGaussianBlur stdDeviation="5"/></filter>
          <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
        </defs>

        {/* Base terrain */}
        <rect width="800" height="500" fill="url(#sg1)"/>

        {/* Terrain patches — vegetation, farmland, scrub */}
        {[[60,40,180,90],[280,30,140,70],[500,20,160,80],[650,60,120,60],
          [40,160,100,80],[600,140,130,70],[700,200,90,60],
          [50,320,150,80],[680,300,100,70],[200,420,180,60],[550,380,140,70]
        ].map(([x,y,w,h],i)=>(
          <rect key={`t${i}`} x={x} y={y} width={w} height={h}
            fill={i%3===0?'rgba(20,55,10,0.6)':i%3===1?'rgba(35,70,15,0.5)':'rgba(55,80,20,0.4)'}
            rx="4"/>
        ))}

        {/* Road network */}
        {[
          'M 0,210 L 800,195','M 0,290 L 800,310',           // horizontal highways
          'M 310,0 L 325,500','M 490,0 L 475,500',           // vertical roads
          'M 0,150 L 310,210','M 490,210 L 800,180',         // diagonal feeders
          'M 325,290 L 490,290',                              // cross street
          'M 250,195 L 250,290','M 560,195 L 560,310',       // side streets
          'M 325,195 L 490,195','M 325,310 L 490,310',       // block edges
        ].map((d,i)=>(
          <path key={`r${i}`} d={d} stroke="rgba(180,160,80,0.45)" strokeWidth={i<4?2.5:1.2} fill="none"/>
        ))}

        {/* Urban block grid (city area surrounding impact) */}
        {[
          [330,200,30,20],[365,200,30,20],[400,200,28,20],
          [330,225,30,18],[365,225,30,18],[400,225,28,18],
          [330,248,30,16],[365,248,30,16],
          [432,200,25,20],[460,200,25,20],
          [432,225,25,18],[460,225,25,18],
          [330,270,30,15],[365,270,25,15],[432,270,25,15],
        ].map(([x,y,w,h],i)=>(
          <rect key={`b${i}`} x={x} y={y} width={w} height={h}
            fill="rgba(80,90,70,0.65)" stroke="rgba(120,130,90,0.3)" strokeWidth="0.5"/>
        ))}

        {/* River / water body */}
        <path d="M 0,380 C 150,370 200,390 300,375 S 450,355 550,365 S 700,380 800,370"
          fill="none" stroke="rgba(30,80,160,0.7)" strokeWidth="8"/>
        <path d="M 0,383 C 150,373 200,393 300,378 S 450,358 550,368 S 700,383 800,373"
          fill="none" stroke="rgba(50,120,200,0.3)" strokeWidth="3"/>

        {/* Airport / airfield tarmac */}
        <rect x="580" y="60" width="180" height="80" rx="2" fill="rgba(60,60,50,0.7)" stroke="rgba(150,150,100,0.3)" strokeWidth="1"/>
        <line x1="590" y1="100" x2="750" y2="100" stroke="rgba(255,255,200,0.4)" strokeWidth="1.5" strokeDasharray="8,6"/>

        {/* ── IMPACT ZONE (center) ── */}
        {/* Blast radius outer glow */}
        <circle cx="400" cy="248" r="80" fill="url(#craterGrad)" filter="url(#blur8)" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.9;0.7" dur="1.8s" repeatCount="indefinite"/>
        </circle>

        {/* Destroyed buildings (dark rubble patches) */}
        {[[375,225,18,12],[398,218,16,14],[362,240,20,10],[388,240,22,12],[412,236,14,10],
          [370,253,16,8],[395,255,18,10],[416,248,12,12]].map(([x,y,w,h],i)=>(
          <rect key={`rb${i}`} x={x} y={y} width={w} height={h}
            fill="rgba(20,10,5,0.85)" stroke="rgba(80,40,0,0.4)" strokeWidth="0.5" rx="1"/>
        ))}

        {/* Crater */}
        <circle cx="400" cy="248" r="28" fill="rgba(5,2,0,0.95)" stroke="rgba(100,50,0,0.6)" strokeWidth="1.5"/>
        <circle cx="400" cy="248" r="18" fill="rgba(0,0,0,0.98)"/>

        {/* Fire — center bloom */}
        <circle cx="400" cy="248" r="22" fill="url(#fireGrad)" filter="url(#blur2)">
          <animate attributeName="r" values="22;30;22;18;25;22" dur="0.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.6;0.95;0.7;0.85;0.9" dur="0.8s" repeatCount="indefinite"/>
        </circle>

        {/* Secondary fires */}
        {[[372,228,8],[418,238,6],[382,262,7],[414,258,5],[365,252,6],[395,232,7]].map(([cx,cy,r],i)=>(
          <circle key={`f${i}`} cx={cx} cy={cy} r={r} fill="url(#fireGrad)" filter="url(#blur2)" opacity="0.75">
            <animate attributeName="r" values={`${r};${r+3};${r-1};${r+2};${r}`} dur={`${0.6+i*0.13}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.75;0.5;0.9;0.6;0.75" dur={`${0.6+i*0.13}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* Smoke plumes — rising from crater and secondaries */}
        {[[400,248],[372,228],[418,238],[382,262]].map(([sx,sy],pi)=>(
          [...Array(5)].map((_,i)=>(
            <ellipse key={`sm${pi}_${i}`}
              cx={sx+(i-2)*4} cy={sy-i*18-10} rx={8+i*5} ry={5+i*3}
              fill={`rgba(${40+i*8},${40+i*8},${40+i*8},${0.55-i*0.09})`}
              filter="url(#blur2)"/>
          ))
        ))}

        {/* Debris scatter */}
        {[[350,205,3],[425,215,2],[345,262,2.5],[432,268,2],[360,278,3],
          [418,278,2],[442,242,2.5],[356,232,2],[422,256,3],[376,215,2]].map(([cx,cy,r],i)=>(
          <circle key={`d${i}`} cx={cx} cy={cy} r={r}
            fill={i%2===0?'rgba(200,100,0,0.7)':'rgba(80,60,20,0.6)'}/>
        ))}

        {/* Impact pulse ring */}
        <circle cx="400" cy="248" r="35" fill="none" stroke="rgba(255,120,0,0.7)" strokeWidth="1.5">
          <animate attributeName="r" values="35;75;35" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="400" cy="248" r="55" fill="none" stroke="rgba(255,60,0,0.4)" strokeWidth="1">
          <animate attributeName="r" values="55;110;55" dur="2s" begin="0.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" begin="0.5s" repeatCount="indefinite"/>
        </circle>

        {/* Targeting reticle overlay */}
        <g opacity="0.9">
          <circle cx="400" cy="248" r="48" fill="none" stroke="rgba(0,255,80,0.6)" strokeWidth="0.8" strokeDasharray="6,4"/>
          <line x1="370" y1="248" x2="352" y2="248" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <line x1="430" y1="248" x2="448" y2="248" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <line x1="400" y1="218" x2="400" y2="200" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <line x1="400" y1="278" x2="400" y2="296" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <text x="454" y="245" fill="rgba(0,255,80,0.9)" fontSize="8" fontFamily="Share Tech Mono">◉ IMPACT</text>
        </g>

        {/* Measurement grid overlay */}
        {[...Array(9)].map((_,i)=>(
          <line key={`gi${i}`} x1={200+i*50} y1="100" x2={200+i*50} y2="400"
            stroke="rgba(0,255,80,0.04)" strokeWidth="0.5"/>
        ))}
        {[...Array(7)].map((_,i)=>(
          <line key={`gh${i}`} x1="150" y1={120+i*45} x2="650" y2={120+i*45}
            stroke="rgba(0,255,80,0.04)" strokeWidth="0.5"/>
        ))}
      </svg>

      {/* Horizontal scan line sweep */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{
        height: '2px',
        background: 'linear-gradient(90deg,transparent,rgba(0,255,80,0.5),transparent)',
        animation: 'sat-scan 3s linear infinite',
        zIndex: 3,
      }}/>

      {/* CRT scan-line texture */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        zIndex: 4,
      }}/>

      {/* Corner brackets */}
      {[{t:10,l:10,br:'8px 0 0 0'},{t:10,r:10,br:'0 8px 0 0'},{b:44,l:10,br:'0 0 0 8px'},{b:44,r:10,br:'0 0 8px 0'}].map((c,i)=>(
        <div key={i} className="absolute" style={{
          width:32,height:32,top:c.t,bottom:c.b,left:c.l,right:c.r,
          border:`2px solid rgba(0,255,80,0.75)`,borderRadius:c.br,zIndex:5,
        }}/>
      ))}

      {/* HUD — top left */}
      <div className="absolute z-10" style={{top:14,left:50,color:'rgba(0,255,80,0.95)',fontSize:'10px',lineHeight:'1.9',letterSpacing:'0.12em'}}>
        <div>{alt}</div>
        <div>ORBIT INCLINATION: {orbit}°</div>
        <div style={{color:'rgba(0,255,80,0.55)'}}>SENSOR: THERMAL+OPTICAL FUSION</div>
      </div>

      {/* HUD — top right */}
      <div className="absolute z-10 text-right" style={{top:14,right:50,color:'rgba(0,255,80,0.95)',fontSize:'10px',lineHeight:'1.9',letterSpacing:'0.12em'}}>
        <div>LAT: {lat}°N</div>
        <div>LON: {lon}°E</div>
        <div style={{color:'rgba(255,80,0,0.9)',fontWeight:'bold'}}>⬤ IMPACT CONFIRMED</div>
      </div>

      {/* Target label */}
      <div className="absolute z-10" style={{
        bottom:50, left:'50%', transform:'translateX(-50%)',
        color:'#ff4400', fontSize:'12px', letterSpacing:'0.25em',
        textAlign:'center', textShadow:'0 0 14px #ff4400', fontWeight:'bold',
      }}>
        ◉ TARGET: {targetLabel.toUpperCase()} · STRIKE CONFIRMED
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2" style={{
        background:'rgba(0,0,0,0.9)', borderTop:'1px solid rgba(0,255,80,0.35)',
      }}>
        <span style={{color:'rgba(0,255,80,0.75)',fontSize:'9px',letterSpacing:'0.18em'}}>NRO · SAT-7 · CLASSIFICATION: TOP SECRET//SCI · SIMULATION ONLY</span>
        <span className="status-blink" style={{color:'#ff3c00',fontSize:'10px',letterSpacing:'0.2em',fontWeight:'bold'}}>● LIVE</span>
        <span style={{color:'rgba(0,255,80,0.5)',fontSize:'9px'}}>{new Date().toUTCString().slice(0,25)} UTC</span>
      </div>
    </div>
  );
}

function DroneFeed({ eventTitle }: { color: string; eventTitle: string }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{background:'#04080a',fontFamily:'Share Tech Mono, monospace'}}>

      {/* Simulated terrain from drone angle */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="droneGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#060c10"/>
            <stop offset="60%" stopColor="#030608"/>
            <stop offset="100%" stopColor="#010204"/>
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#droneGrad)"/>
        {/* Perspective grid — drone looking down at angle */}
        {[0,1,2,3,4,5,6,7,8,9,10].map(i=>(
          <line key={`h${i}`} x1="0" y1={150+i*35} x2="800" y2={150+i*35} stroke="rgba(0,200,255,0.07)" strokeWidth="0.5"/>
        ))}
        {[-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6].map(i=>(
          <line key={`v${i}`} x1={400+i*60} y1="150" x2={400+i*100} y2="500" stroke="rgba(0,200,255,0.07)" strokeWidth="0.5"/>
        ))}
        {/* Impact site */}
        <ellipse cx="400" cy="340" rx="55" ry="25" fill="rgba(255,80,0,0.2)" stroke="#ff5000" strokeWidth="1.5">
          <animate attributeName="rx" values="55;70;55" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.7;0.3;0.7" dur="1.5s" repeatCount="indefinite"/>
        </ellipse>
        {/* Smoke plume simulation */}
        {[0,1,2,3,4].map(i=>(
          <ellipse key={i} cx={400+i*8-16} cy={320-i*28} rx={12+i*6} ry={8+i*3} fill="rgba(80,80,80,0.25)" opacity={0.6-i*0.1}/>
        ))}
        {/* Structure outlines */}
        {[[340,290,40,25],[430,300,35,20],[370,320,25,15],[410,315,30,18]].map(([x,y,w,h],i)=>(
          <rect key={i} x={x} y={y} width={w} height={h} fill="rgba(40,40,60,0.6)" stroke="rgba(0,200,255,0.2)" strokeWidth="0.5"/>
        ))}
      </svg>

      {/* Motion blur vignette edges */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:'radial-gradient(ellipse 80% 80% at 50% 50%,transparent 50%,rgba(0,0,0,0.7) 100%)',
        zIndex:3,
      }}/>

      {/* Scan line */}
      <div className="absolute left-0 right-0" style={{
        height:'2px',
        background:'linear-gradient(90deg,transparent,rgba(0,200,255,0.4),transparent)',
        animation:'sat-scan 3s linear infinite',
        zIndex:4,
      }}/>

      {/* HUD readouts */}
      <div className="absolute top-4 left-4 z-10" style={{color:'rgba(0,200,255,0.85)',fontSize:'10px',lineHeight:'1.8',letterSpacing:'0.1em'}}>
        <div>DRONE-9 · UAV FEED</div>
        <div>ALT: {Math.floor(Math.random()*500+800)}m AGL</div>
        <div>SPD: {Math.floor(Math.random()*40+80)} kn</div>
        <div>HDG: {Math.floor(Math.random()*360)}°</div>
      </div>
      <div className="absolute top-4 right-4 z-10 text-right" style={{color:'rgba(0,200,255,0.85)',fontSize:'10px',lineHeight:'1.8',letterSpacing:'0.1em'}}>
        <div>ARMED: ACTIVE</div>
        <div>TGT LOCK: ✓</div>
        <div>IR: ON</div>
        <div style={{color:'rgba(255,80,0,0.9)'}}>STRIKE: CONFIRMED</div>
      </div>

      {/* Center reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{zIndex:5}}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <rect x="20" y="20" width="60" height="60" fill="none" stroke="rgba(0,200,255,0.5)" strokeWidth="0.8" strokeDasharray="4,8"/>
          <line x1="0" y1="50" x2="30" y2="50" stroke="rgba(0,200,255,0.7)" strokeWidth="0.8"/>
          <line x1="70" y1="50" x2="100" y2="50" stroke="rgba(0,200,255,0.7)" strokeWidth="0.8"/>
          <line x1="50" y1="0" x2="50" y2="30" stroke="rgba(0,200,255,0.7)" strokeWidth="0.8"/>
          <line x1="50" y1="70" x2="50" y2="100" stroke="rgba(0,200,255,0.7)" strokeWidth="0.8"/>
          <circle cx="50" cy="50" r="3" fill="none" stroke="#ff5000" strokeWidth="1.5"/>
        </svg>
      </div>

      {/* Event label */}
      <div className="absolute z-10 px-3 py-1 rounded" style={{
        bottom:60, left:'50%', transform:'translateX(-50%)',
        background:'rgba(0,0,0,0.8)', border:'1px solid rgba(255,80,0,0.5)',
        color:'#ff5000', fontSize:'10px', letterSpacing:'0.15em', whiteSpace:'nowrap',
      }}>
        {eventTitle.toUpperCase().slice(0,50)}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2" style={{background:'rgba(0,0,0,0.9)',borderTop:'1px solid rgba(0,200,255,0.2)'}}>
        <span style={{color:'rgba(0,200,255,0.6)',fontSize:'9px',letterSpacing:'0.15em'}}>UAV SURVEILLANCE · SIMULATION ONLY · NOT REAL FOOTAGE</span>
        <span className="status-blink" style={{color:'#ff5000',fontSize:'9px',letterSpacing:'0.2em',fontWeight:'bold'}}>⬤ LIVE FEED</span>
      </div>
    </div>
  );
}

function BroadcastFeed({ color, eventTitle, targetLabel, impact }: { color: string; eventTitle: string; targetLabel: string; impact: number }) {
  const severity = impact >= 9 ? 'CRITICAL' : impact >= 7 ? 'BREAKING' : 'ALERT';
  const sevColor = impact >= 9 ? '#ff2d55' : impact >= 7 ? '#ff6a00' : '#ffd700';

  return (
    <div className="w-full h-full relative overflow-hidden" style={{background:'#030508',fontFamily:'Share Tech Mono, monospace'}}>

      {/* Static background — news studio simulation */}
      <div className="absolute inset-0" style={{
        background:'linear-gradient(135deg,#040610 0%,#02030a 60%,#050210 100%)',
        zIndex:1,
      }}/>

      {/* Animated vertical light bars */}
      {[15,35,55,75,90].map((x,i)=>(
        <div key={i} className="absolute top-0 bottom-0" style={{
          left:`${x}%`, width:'1px',
          background:`linear-gradient(180deg,transparent,${color}15,transparent)`,
          animation:`status-blink ${1.5+i*0.3}s ease-in-out infinite`,
          zIndex:2,
        }}/>
      ))}

      {/* Channel logo area — top left */}
      <div className="absolute top-5 left-6 z-10 flex items-center gap-3">
        <div className="flex items-center justify-center rounded font-bold" style={{
          width:52,height:36,
          background:'rgba(255,255,255,0.08)',
          border:`1px solid ${color}40`,
          color:color,fontSize:'14px',letterSpacing:'0.05em',
        }}>GWM</div>
        <div>
          <div style={{color:'rgba(255,255,255,0.9)',fontSize:'11px',letterSpacing:'0.15em',fontWeight:'bold'}}>GEOWARS MATRIX</div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'9px',letterSpacing:'0.1em'}}>SIMULATION NETWORK · NOT REAL NEWS</div>
        </div>
      </div>

      {/* LIVE badge — top right */}
      <div className="absolute top-5 right-6 z-10 flex items-center gap-2 px-3 py-1.5 rounded" style={{
        background: sevColor, color:'#000',fontWeight:'bold',fontSize:'12px',letterSpacing:'0.2em',
      }}>
        <span className="status-blink">●</span> {severity}
      </div>

      {/* Main content area */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center px-12">
          <div style={{
            color: sevColor, fontSize:'clamp(11px,2vw,18px)',
            letterSpacing:'0.25em', fontWeight:'bold',
            textShadow:`0 0 20px ${sevColor}`,
            marginBottom:'16px',
          }}>
            {severity} · SIMULATION EVENT
          </div>
          <div style={{
            color:'rgba(255,255,255,0.95)',
            fontSize:'clamp(14px,2.5vw,24px)',
            fontWeight:'bold',
            lineHeight:1.3,
            marginBottom:'12px',
            fontFamily:'Orbitron, sans-serif',
            letterSpacing:'0.05em',
          }}>
            {eventTitle}
          </div>
          <div style={{color:'rgba(255,255,255,0.5)',fontSize:'11px',letterSpacing:'0.1em'}}>
            REGION: {targetLabel.toUpperCase()} · IMPACT LEVEL: {impact}/10
          </div>
        </div>
      </div>

      {/* Bottom ticker */}
      <div className="absolute bottom-10 left-0 right-0 z-10" style={{
        background: sevColor, padding:'6px 0', overflow:'hidden',
      }}>
        <div style={{
          color:'#000', fontWeight:'bold', fontSize:'11px',
          letterSpacing:'0.12em', whiteSpace:'nowrap',
          animation:'ticker-move 12s linear infinite',
          display:'inline-block',
        }}>
          {`⬤ SIMULATION ONLY — NOT REAL FOOTAGE ⬤ ${eventTitle.toUpperCase()} ⬤ REGION: ${targetLabel.toUpperCase()} ⬤ GEOWARS MATRIX INTELLIGENCE SIMULATION ⬤ THIS IS A FICTIONAL SCENARIO ⬤ `.repeat(2)}
        </div>
      </div>

      {/* Sub-ticker */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center px-4" style={{
        height:'40px', background:'rgba(0,0,0,0.95)', borderTop:`2px solid ${sevColor}`,
      }}>
        <span style={{color:sevColor,fontSize:'10px',letterSpacing:'0.15em',marginRight:'16px',fontWeight:'bold',flexShrink:0}}>
          SIM INTEL
        </span>
        <div style={{overflow:'hidden',flex:1}}>
          <span style={{
            color:'rgba(255,255,255,0.75)',fontSize:'10px',letterSpacing:'0.08em',
            animation:'ticker-move 20s linear infinite', display:'inline-block', whiteSpace:'nowrap',
          }}>
            {`GEOWARS MATRIX SIMULATION · AI-POWERED SCENARIO · ALL EVENTS ARE FICTIONAL · ${new Date().toUTCString()} · INTELLIGENCE SIMULATION NETWORK · NOT AFFILIATED WITH ANY REAL NEWS ORGANIZATION · `}
          </span>
        </div>
        <span className="status-blink" style={{color:sevColor,fontSize:'10px',letterSpacing:'0.1em',marginLeft:'16px',flexShrink:0}}>● ON AIR</span>
      </div>
    </div>
  );
}

export default function CinematicFeed({ active, color, eventTitle, targetLabel, impact, onComplete }: Props) {
  const [feedIndex, setFeedIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!active) { setVisible(false); setFeedIndex(0); return; }

    setVisible(true);
    setFading(false);
    setFeedIndex(0);

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Cycle through feeds
    FEEDS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setFeedIndex(i), FEED_DURATION * i));
    });

    // Fade out before completing
    const totalDuration = FEED_DURATION * FEEDS.length;
    timers.push(setTimeout(() => setFading(true), totalDuration - 600));
    timers.push(setTimeout(() => { setVisible(false); onComplete(); }, totalDuration));

    return () => timers.forEach(clearTimeout);
  }, [active]);

  if (!visible) return null;

  const feedType = FEEDS[feedIndex];

  return (
    <div className="absolute inset-0 z-50" style={{
      opacity: fading ? 0 : 1,
      transition: fading ? 'opacity 0.6s ease-out' : 'opacity 0.4s ease-in',
    }}>
      {/* Fade-in overlay */}
      <div className="absolute inset-0" style={{
        animation: 'fade-in 0.4s ease-out forwards',
        zIndex: 51,
        pointerEvents: 'none',
      }}/>

      {/* Feed content */}
      <div className="absolute inset-0" style={{ zIndex: 52 }}>
        {feedType === 'satellite' && (
          <SatelliteFeed color={color} targetLabel={targetLabel} />
        )}
        {feedType === 'drone' && (
          <DroneFeed color={color} eventTitle={eventTitle} />
        )}
        {feedType === 'broadcast' && (
          <BroadcastFeed color={color} eventTitle={eventTitle} targetLabel={targetLabel} impact={impact} />
        )}
      </div>

      {/* Feed label top-center */}
      <div className="absolute top-3 left-1/2 z-60 px-3 py-1 rounded font-mono text-center" style={{
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.8)',
        border: `1px solid ${color}50`,
        fontSize: '9px', letterSpacing: '0.2em',
        color: 'rgba(255,255,255,0.5)',
        zIndex: 60,
      }}>
        {feedType === 'satellite' ? '🛰 SATELLITE INTELLIGENCE FEED' : feedType === 'drone' ? '🚁 UAV SURVEILLANCE FEED' : '📡 SIMULATION BROADCAST'} · {feedIndex + 1}/{FEEDS.length}
      </div>

      {/* Feed progress dots */}
      <div className="absolute flex gap-1.5" style={{ bottom: 52, right: 10, zIndex: 60 }}>
        {FEEDS.map((_, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: i === feedIndex ? color : 'rgba(255,255,255,0.2)',
            transition: 'background 0.3s ease',
          }}/>
        ))}
      </div>
    </div>
  );
}
