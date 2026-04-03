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

function SatelliteFeed({ color, targetLabel }: { color: string; targetLabel: string }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: '#000a06', fontFamily: 'Share Tech Mono, monospace' }}>

      {/* Terrain grid — simulated satellite terrain */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice">
        {/* Grid */}
        <defs>
          <pattern id="satgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,255,80,0.12)" strokeWidth="0.5"/>
          </pattern>
          <radialGradient id="terrainGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,40,10,0.8)"/>
            <stop offset="100%" stopColor="rgba(0,10,4,0.95)"/>
          </radialGradient>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
            <feBlend in="SourceGraphic" mode="overlay" result="blend"/>
            <feComposite in="blend" in2="SourceGraphic"/>
          </filter>
        </defs>
        <rect width="800" height="500" fill="url(#terrainGrad)"/>
        <rect width="800" height="500" fill="url(#satgrid)"/>
        {/* Terrain blobs — simulated landmass */}
        {[
          [320,180,140,80],[200,260,100,60],[450,220,120,70],
          [380,320,90,50],[520,280,110,65],[250,350,80,45],
        ].map(([x,y,rx,ry],i)=>(
          <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} fill="rgba(0,60,20,0.35)" stroke="rgba(0,255,80,0.08)" strokeWidth="0.5"/>
        ))}
        {/* Impact zone highlight */}
        <circle cx="400" cy="250" r="18" fill="rgba(255,60,0,0.3)" stroke="#ff3c00" strokeWidth="1">
          <animate attributeName="r" values="18;28;18" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="400" cy="250" r="6" fill="#ff3c00" opacity="0.9"/>
        {/* Damage scatter */}
        {[[390,240],[412,258],[382,262],[418,242],[395,270]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r="2.5" fill="#ff6a00" opacity={0.5+i*0.08}/>
        ))}
      </svg>

      {/* Scan line sweep */}
      <div className="absolute left-0 right-0 pointer-events-none" style={{
        height: '3px',
        background: 'linear-gradient(90deg,transparent,rgba(0,255,80,0.6),transparent)',
        animation: 'sat-scan 2s linear infinite',
        zIndex: 3,
      }}/>

      {/* Grain overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
        zIndex: 4,
        opacity: 0.4,
      }}/>

      {/* Corner brackets */}
      {[{t:12,l:12,br:'8px 0 0 0'},{t:12,r:12,br:'0 8px 0 0'},{b:12,l:12,br:'0 0 0 8px'},{b:12,r:12,br:'0 0 8px 0'}].map((c,i)=>(
        <div key={i} className="absolute" style={{
          width:28,height:28,top:c.t,bottom:c.b,left:c.l,right:c.r,
          border:`2px solid rgba(0,255,80,0.7)`,borderRadius:c.br,zIndex:5,
        }}/>
      ))}

      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{zIndex:5}}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="16" fill="none" stroke="#ff3c00" strokeWidth="1" opacity="0.9">
            <animate attributeName="r" values="16;22;16" dur="1s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="1s" repeatCount="indefinite"/>
          </circle>
          <circle cx="40" cy="40" r="2" fill="#ff3c00"/>
          <line x1="0" y1="40" x2="24" y2="40" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <line x1="56" y1="40" x2="80" y2="40" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <line x1="40" y1="0" x2="40" y2="24" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
          <line x1="40" y1="56" x2="40" y2="80" stroke="rgba(0,255,80,0.8)" strokeWidth="1"/>
        </svg>
      </div>

      {/* HUD overlays */}
      <div className="absolute top-4 left-12 z-10" style={{color:'rgba(0,255,80,0.9)',fontSize:'10px',letterSpacing:'0.15em'}}>
        <div>ALT: 423km</div>
        <div>RES: 0.3m/px</div>
        <div style={{color:'rgba(0,255,80,0.5)',marginTop:'2px'}}>ORBIT: {Math.floor(Math.random()*90+200)}°</div>
      </div>
      <div className="absolute top-4 right-12 z-10 text-right" style={{color:'rgba(0,255,80,0.9)',fontSize:'10px',letterSpacing:'0.15em'}}>
        <div>LAT: {(Math.random()*60-30).toFixed(4)}°N</div>
        <div>LON: {(Math.random()*360-180).toFixed(4)}°E</div>
        <div style={{color:'rgba(0,255,80,0.5)',marginTop:'2px'}}>SAT-7 CLASSIFIED</div>
      </div>

      {/* Target label */}
      <div className="absolute z-10" style={{bottom:70,left:'50%',transform:'translateX(-50%)',color:'#ff3c00',fontSize:'11px',letterSpacing:'0.2em',textAlign:'center',textShadow:'0 0 10px #ff3c00'}}>
        TARGET: {targetLabel.toUpperCase()}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2" style={{background:'rgba(0,0,0,0.85)',borderTop:'1px solid rgba(0,255,80,0.3)'}}>
        <span style={{color:'rgba(0,255,80,0.7)',fontSize:'9px',letterSpacing:'0.2em'}}>SATFEED · CLASSIFIED · SIMULATION ONLY</span>
        <span className="status-blink" style={{color:'#ff3c00',fontSize:'9px',letterSpacing:'0.2em',fontWeight:'bold'}}>● LIVE</span>
        <span style={{color:'rgba(0,255,80,0.5)',fontSize:'9px'}}>{new Date().toUTCString().slice(0,25)} UTC</span>
      </div>
    </div>
  );
}

function DroneFeed({ color, eventTitle }: { color: string; eventTitle: string }) {
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

export default function CinematicFeed({ active, color, eventTitle, targetLabel, eventType, impact, onComplete }: Props) {
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
