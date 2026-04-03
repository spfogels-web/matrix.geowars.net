'use client';
import { useState, useEffect } from 'react';
import { WorldState } from '@/lib/engine/types';

interface Props {
  state: WorldState;
  onInitiate: () => void;
}

const LEADER_FLAGS: Record<string, string> = {
  usa:'🇺🇸', china:'🇨🇳', russia:'🇷🇺', iran:'🇮🇷', israel:'🇮🇱',
  uk:'🇬🇧', france:'🇫🇷', germany:'🇩🇪', turkey:'🇹🇷', saudiarabia:'🇸🇦',
  india:'🇮🇳', pakistan:'🇵🇰', japan:'🇯🇵', southkorea:'🇰🇷',
  northkorea:'🇰🇵', ukraine:'🇺🇦', taiwan:'🇹🇼', nato:'🏛',
};
const LEADER_NAMES: Record<string, string> = {
  usa:'United States', china:'China', russia:'Russia', iran:'Iran', israel:'Israel',
  uk:'United Kingdom', france:'France', germany:'Germany', turkey:'Türkiye',
  saudiarabia:'Saudi Arabia', india:'India', pakistan:'Pakistan', japan:'Japan',
  southkorea:'South Korea', northkorea:'North Korea', ukraine:'Ukraine',
  taiwan:'Taiwan', nato:'NATO',
};
const SEV_COLOR: Record<string, string> = {
  low:'#00ff9d', medium:'#ffd700', high:'#ff6a00', critical:'#ff2d55',
};

export default function WorldBriefing({ state, onInitiate }: Props) {
  const [phase, setPhase] = useState<'connecting'|'transmitting'|'briefing'|'ready'>('connecting');
  const [lineIndex, setLineIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const tc = state.globalTension >= 75 ? '#ff2d55'
    : state.globalTension >= 55 ? '#ff6a00'
    : state.globalTension >= 30 ? '#ffd700' : '#00f5ff';

  const rwc = state.realWorldContext;
  const headlines = rwc?.headlines?.slice(0, 6) ?? state.breakingIntel.slice(0, 6);

  // Intro sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('transmitting'), 1200);
    const t2 = setTimeout(() => setPhase('briefing'), 2400);
    const t3 = setTimeout(() => setPhase('ready'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Animate headlines in one by one
  useEffect(() => {
    if (phase !== 'briefing' && phase !== 'ready') return;
    if (lineIndex >= headlines.length) return;
    const t = setTimeout(() => setLineIndex(i => i + 1), 300);
    return () => clearTimeout(t);
  }, [phase, lineIndex, headlines.length]);

  function handleInitiate() {
    setVisible(false);
    setTimeout(onInitiate, 500);
  }

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(2,6,20,0.97) 0%, rgba(1,3,10,0.99) 100%)',
        transition: 'opacity 0.5s ease',
        opacity: visible ? 1 : 0,
      }}>

      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.025) 1px,transparent 1px)',
        backgroundSize: '50px 50px',
      }}/>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
      }}/>

      {/* ── CONNECTING phase ── */}
      {phase === 'connecting' && (
        <div className="text-center fade-in">
          <div className="font-orbitron font-bold mb-3" style={{ color: '#00f5ff', fontSize: '13px', letterSpacing: '0.4em' }}>
            ESTABLISHING SECURE CHANNEL
          </div>
          <div className="flex items-center justify-center gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="typing-dot" style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#00f5ff', opacity: 0,
                boxShadow: '0 0 8px #00f5ff',
              }}/>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSMITTING phase ── */}
      {phase === 'transmitting' && (
        <div className="text-center fade-in">
          <div className="font-mono mb-2" style={{ color: 'rgba(0,245,255,0.5)', fontSize: '10px', letterSpacing: '0.3em' }}>
            GLOBAL INTELLIGENCE NETWORK
          </div>
          <div className="font-orbitron font-bold" style={{ color: '#00f5ff', fontSize: '15px', letterSpacing: '0.4em' }}>
            RECEIVING TRANSMISSION<span className="status-blink">_</span>
          </div>
        </div>
      )}

      {/* ── MAIN BRIEFING ── */}
      {(phase === 'briefing' || phase === 'ready') && (
        <div className="w-full max-w-3xl mx-auto px-6 fade-in" style={{ maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="font-mono mb-1" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '0.3em' }}>
              GEOWARS MATRIX · CLASSIFIED INTELLIGENCE BRIEF · {new Date().toUTCString().slice(0,16).toUpperCase()} UTC
            </div>
            <div className="font-orbitron font-black mb-1" style={{
              color: '#00f5ff', fontSize: 'clamp(18px,3vw,28px)',
              letterSpacing: '0.2em',
              textShadow: '0 0 30px rgba(0,245,255,0.5)',
            }}>
              WORLD SITUATION REPORT
            </div>
            <div className="font-mono" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.2em' }}>
              PRE-SIMULATION INTELLIGENCE BRIEFING
            </div>
          </div>

          {/* Tension bar */}
          <div className="mb-5 px-4 py-3 rounded-xl" style={{
            background: 'rgba(0,0,0,0.6)',
            border: `1px solid ${tc}40`,
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '0.15em' }}>
                GLOBAL TENSION INDEX
              </span>
              <span className="font-orbitron font-bold" style={{ color: tc, fontSize: '20px', textShadow: `0 0 14px ${tc}` }}>
                {state.globalTension}<span style={{ fontSize: '12px', opacity: 0.5 }}>/100</span>
              </span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${state.globalTension}%`, height: '100%',
                background: `linear-gradient(90deg,#00ff9d,${tc})`,
                boxShadow: `0 0 8px ${tc}`,
                borderRadius: '2px',
                transition: 'width 1s ease',
              }}/>
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>LOW</span>
              <span className="font-orbitron font-bold" style={{ color: tc, fontSize: '9px', letterSpacing: '0.15em' }}>
                {state.threatLevel.replace('_', ' ')}
              </span>
              <span className="font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px' }}>DEFCON 1</span>
            </div>
          </div>

          {/* Two columns: situation + active zones */}
          <div className="grid grid-cols-2 gap-4 mb-4">

            {/* Current world situation */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(0,245,255,0.15)' }}>
              <div className="font-orbitron font-bold mb-3" style={{ color: '#00f5ff', fontSize: '10px', letterSpacing: '0.2em' }}>
                ◆ CURRENT SITUATION
              </div>
              {rwc ? (
                <>
                  <div className="font-mono mb-2" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', lineHeight: '1.6' }}>
                    {rwc.summary}
                  </div>
                  <div className="font-mono mt-2 px-2 py-1 rounded" style={{
                    background: `${tc}15`, border: `1px solid ${tc}30`,
                    color: tc, fontSize: '10px', letterSpacing: '0.1em',
                  }}>
                    DOMINANT CRISIS: {rwc.dominantTheme.toUpperCase()}
                  </div>
                </>
              ) : (
                <div className="font-mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', lineHeight: '1.6' }}>
                  Global tensions remain elevated across multiple theatres. Multiple conflict zones active.
                  Nuclear-armed states on heightened alert.
                </div>
              )}
            </div>

            {/* Active conflict zones */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,45,85,0.2)' }}>
              <div className="font-orbitron font-bold mb-3" style={{ color: '#ff2d55', fontSize: '10px', letterSpacing: '0.2em' }}>
                ◆ ACTIVE CONFLICT ZONES
              </div>
              <div className="space-y-2">
                {state.conflictZones.slice(0, 4).map(z => (
                  <div key={z.id} className="flex items-center gap-2">
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: SEV_COLOR[z.severity], flexShrink: 0, boxShadow: `0 0 6px ${SEV_COLOR[z.severity]}` }}/>
                    <div className="min-w-0">
                      <div className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.88)', fontSize: '10px', letterSpacing: '0.05em' }}>{z.name}</div>
                      <div className="font-mono" style={{ color: SEV_COLOR[z.severity], fontSize: '9px', textTransform: 'uppercase' }}>{z.severity}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active leaders */}
          <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(180,79,255,0.2)' }}>
            <div className="font-orbitron font-bold mb-3" style={{ color: '#b44fff', fontSize: '10px', letterSpacing: '0.2em' }}>
              ◆ KEY ACTORS BEING MONITORED
            </div>
            <div className="flex flex-wrap gap-2">
              {state.activeLeaderIds.map(id => {
                const leader = state.leaders.find(l => l.id === id);
                if (!leader) return null;
                const sc = leader.aggression >= 70 ? '#ff2d55' : leader.aggression >= 45 ? '#ff6a00' : '#ffd700';
                return (
                  <div key={id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: `1px solid ${sc}35`,
                  }}>
                    <span style={{ fontSize: '14px' }}>{LEADER_FLAGS[id] || '🌐'}</span>
                    <div>
                      <div className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px' }}>{LEADER_NAMES[id] || id}</div>
                      <div className="font-mono" style={{ color: sc, fontSize: '9px' }}>AGG {leader.aggression}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live headlines */}
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <div className="font-orbitron font-bold mb-3" style={{ color: '#ffd700', fontSize: '10px', letterSpacing: '0.2em' }}>
              ◆ LIVE INTELLIGENCE FEED
            </div>
            <div className="space-y-1.5">
              {headlines.slice(0, lineIndex).map((h, i) => (
                <div key={i} className="flex items-start gap-2 fade-in">
                  <span style={{ color: '#ffd700', fontSize: '9px', flexShrink: 0, marginTop: '1px' }}>▶</span>
                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10.5px', lineHeight: '1.5' }}>
                    {h.replace(/^\[.*?\]\s*/, '')}
                  </span>
                </div>
              ))}
              {lineIndex < headlines.length && (
                <div className="font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
                  <span className="status-blink">■</span> loading...
                </div>
              )}
            </div>
          </div>

          {/* Initiate button */}
          {phase === 'ready' && (
            <div className="text-center fade-in">
              <div className="font-mono mb-3" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '9px', letterSpacing: '0.2em' }}>
                BRIEFING COMPLETE · AI AGENTS STANDING BY
              </div>
              <button
                onClick={handleInitiate}
                className="font-orbitron font-black px-10 py-4 rounded-xl transition-all"
                style={{
                  background: 'linear-gradient(135deg, #00ff9d 0%, #00d4aa 100%)',
                  color: '#000',
                  fontSize: '15px',
                  letterSpacing: '0.25em',
                  boxShadow: '0 0 40px rgba(0,255,157,0.5), 0 0 80px rgba(0,255,157,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                }}>
                ▶ INITIATE SIMULATION
              </button>
              <div className="font-mono mt-3" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', letterSpacing: '0.1em' }}>
                SCENARIO: {(state.realWorldContext?.scenarioId || state.activeScenario).replace(/_/g,' ').toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
