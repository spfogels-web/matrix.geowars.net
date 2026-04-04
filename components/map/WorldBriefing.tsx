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

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('transmitting'), 1200);
    const t2 = setTimeout(() => setPhase('briefing'), 2400);
    const t3 = setTimeout(() => setPhase('ready'), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

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
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(2,6,20,0.98) 0%, rgba(1,3,10,0.99) 100%)',
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center fade-in">
            <div className="font-orbitron font-bold mb-4" style={{ color: '#00f5ff', fontSize: '22px', letterSpacing: '0.4em' }}>
              ESTABLISHING SECURE CHANNEL
            </div>
            <div className="flex items-center justify-center gap-3">
              {[0,1,2].map(i => (
                <div key={i} className="typing-dot" style={{
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: '#00f5ff', opacity: 0,
                  boxShadow: '0 0 10px #00f5ff',
                }}/>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TRANSMITTING phase ── */}
      {phase === 'transmitting' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center fade-in">
            <div className="font-mono mb-3" style={{ color: 'rgba(0,245,255,0.5)', fontSize: '16px', letterSpacing: '0.3em' }}>
              GLOBAL INTELLIGENCE NETWORK
            </div>
            <div className="font-orbitron font-bold" style={{ color: '#00f5ff', fontSize: '24px', letterSpacing: '0.4em' }}>
              RECEIVING TRANSMISSION<span className="status-blink">_</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN BRIEFING ── */}
      {(phase === 'briefing' || phase === 'ready') && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Fixed Header */}
          <div className="shrink-0 text-center pt-6 pb-4 px-6">
            <div className="font-mono mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '0.3em' }}>
              GEOWARS MATRIX · CLASSIFIED INTELLIGENCE BRIEF · {new Date().toUTCString().slice(0,16).toUpperCase()} UTC
            </div>
            <div className="font-orbitron font-black mb-2" style={{
              color: '#00f5ff', fontSize: 'clamp(28px,4vw,52px)',
              letterSpacing: '0.2em',
              textShadow: '0 0 30px rgba(0,245,255,0.5)',
            }}>
              WORLD SITUATION REPORT
            </div>
            <div className="font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', letterSpacing: '0.2em' }}>
              PRE-SIMULATION INTELLIGENCE BRIEFING
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,245,255,0.2) transparent' }}>
            <div className="max-w-4xl mx-auto space-y-4">

              {/* ── PREDICTIONS CHALLENGE ── */}
              <div className="rounded-2xl p-6" style={{
                background: 'linear-gradient(135deg, rgba(180,79,255,0.12) 0%, rgba(120,60,255,0.06) 100%)',
                border: '1px solid rgba(180,79,255,0.4)',
                boxShadow: '0 0 30px rgba(180,79,255,0.08)',
              }}>
                <div className="flex items-center gap-3 mb-4">
                  <span style={{ fontSize: '30px' }}>🎯</span>
                  <div>
                    <div className="font-orbitron font-black" style={{ color: '#b44fff', fontSize: '18px', letterSpacing: '0.25em', textShadow: '0 0 16px rgba(180,79,255,0.6)' }}>
                      PREDICTIONS CHALLENGE
                    </div>
                    <div className="font-mono mt-0.5" style={{ color: 'rgba(180,79,255,0.6)', fontSize: '13px', letterSpacing: '0.15em' }}>
                      EARN GWM · CLIMB THE LEADERBOARD
                    </div>
                  </div>
                </div>

                <div className="font-mono mb-5" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.8' }}>
                  Each simulation, you get <span style={{ color: '#b44fff', fontWeight: 'bold' }}>3 predictions</span> to place before and during the conflict unfolds.
                  Call the outcome correctly — YES or NO — and double your GWM stake.
                  Call it wrong and you lose your wager. Use them wisely.
                </div>

                {/* 3 prediction slots */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[1,2,3].map(n => (
                    <div key={n} className="rounded-xl p-4 text-center" style={{
                      background: 'rgba(180,79,255,0.08)',
                      border: '1px solid rgba(180,79,255,0.25)',
                    }}>
                      <div className="font-orbitron font-bold mb-1" style={{ color: '#b44fff', fontSize: '28px' }}>#{n}</div>
                      <div className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', letterSpacing: '0.1em' }}>PREDICTION</div>
                      <div className="font-mono mt-1" style={{ color: 'rgba(0,255,157,0.7)', fontSize: '12px', letterSpacing: '0.1em' }}>AVAILABLE</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { icon: '💰', label: 'Starting balance', val: '500 GWM' },
                    { icon: '✅', label: 'Correct call payout', val: '2× your bet' },
                    { icon: '🏆', label: 'Best strategists', val: 'Leaderboard' },
                  ].map(({ icon, label, val }) => (
                    <div key={label} className="rounded-xl p-4" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(180,79,255,0.15)' }}>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
                      <div className="font-mono" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>{label}</div>
                      <div className="font-orbitron font-bold mt-1" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tension bar */}
              <div className="rounded-2xl px-6 py-5" style={{
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${tc}40`,
              }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', letterSpacing: '0.15em' }}>
                    GLOBAL TENSION INDEX
                  </span>
                  <span className="font-orbitron font-bold" style={{ color: tc, fontSize: '34px', textShadow: `0 0 14px ${tc}` }}>
                    {state.globalTension}<span style={{ fontSize: '18px', opacity: 0.5 }}>/100</span>
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${state.globalTension}%`, height: '100%',
                    background: `linear-gradient(90deg,#00ff9d,${tc})`,
                    boxShadow: `0 0 10px ${tc}`,
                    borderRadius: '4px',
                    transition: 'width 1s ease',
                  }}/>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>LOW</span>
                  <span className="font-orbitron font-bold" style={{ color: tc, fontSize: '14px', letterSpacing: '0.15em' }}>
                    {state.threatLevel.replace('_', ' ')}
                  </span>
                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>DEFCON 1</span>
                </div>
              </div>

              {/* Two columns: situation + active zones */}
              <div className="grid grid-cols-2 gap-4">

                {/* Current world situation */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(0,245,255,0.15)' }}>
                  <div className="font-orbitron font-bold mb-3" style={{ color: '#00f5ff', fontSize: '14px', letterSpacing: '0.2em' }}>
                    ◆ CURRENT SITUATION
                  </div>
                  {rwc ? (
                    <>
                      <div className="font-mono mb-3" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: '1.75' }}>
                        {rwc.summary}
                      </div>
                      <div className="font-mono px-3 py-2 rounded-lg" style={{
                        background: `${tc}15`, border: `1px solid ${tc}30`,
                        color: tc, fontSize: '13px', letterSpacing: '0.1em',
                      }}>
                        DOMINANT CRISIS: {rwc.dominantTheme.toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <div className="font-mono" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', lineHeight: '1.75' }}>
                      Global tensions remain elevated across multiple theatres. Multiple conflict zones active.
                      Nuclear-armed states on heightened alert.
                    </div>
                  )}
                </div>

                {/* Active conflict zones */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,45,85,0.2)' }}>
                  <div className="font-orbitron font-bold mb-3" style={{ color: '#ff2d55', fontSize: '14px', letterSpacing: '0.2em' }}>
                    ◆ ACTIVE CONFLICT ZONES
                  </div>
                  <div className="space-y-3">
                    {state.conflictZones.slice(0, 4).map(z => (
                      <div key={z.id} className="flex items-center gap-3">
                        <div style={{ width: '11px', height: '11px', borderRadius: '50%', background: SEV_COLOR[z.severity], flexShrink: 0, boxShadow: `0 0 8px ${SEV_COLOR[z.severity]}` }}/>
                        <div className="min-w-0">
                          <div className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', letterSpacing: '0.05em' }}>{z.name}</div>
                          <div className="font-mono" style={{ color: SEV_COLOR[z.severity], fontSize: '13px', textTransform: 'uppercase' }}>{z.severity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active leaders */}
              <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(180,79,255,0.2)' }}>
                <div className="font-orbitron font-bold mb-4" style={{ color: '#b44fff', fontSize: '14px', letterSpacing: '0.2em' }}>
                  ◆ KEY ACTORS BEING MONITORED
                </div>
                <div className="flex flex-wrap gap-3">
                  {state.activeLeaderIds.map(id => {
                    const leader = state.leaders.find(l => l.id === id);
                    if (!leader) return null;
                    const sc = leader.aggression >= 70 ? '#ff2d55' : leader.aggression >= 45 ? '#ff6a00' : '#ffd700';
                    return (
                      <div key={id} className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{
                        background: 'rgba(0,0,0,0.6)',
                        border: `1px solid ${sc}35`,
                      }}>
                        <span style={{ fontSize: '22px' }}>{LEADER_FLAGS[id] || '🌐'}</span>
                        <div>
                          <div className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>{LEADER_NAMES[id] || id}</div>
                          <div className="font-mono" style={{ color: sc, fontSize: '12px' }}>AGG {leader.aggression}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live headlines */}
              <div className="rounded-2xl p-6" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,215,0,0.2)' }}>
                <div className="font-orbitron font-bold mb-4" style={{ color: '#ffd700', fontSize: '14px', letterSpacing: '0.2em' }}>
                  ◆ LIVE INTELLIGENCE FEED
                </div>
                <div className="space-y-3">
                  {headlines.slice(0, lineIndex).map((h, i) => (
                    <div key={i} className="flex items-start gap-3 fade-in">
                      <span style={{ color: '#ffd700', fontSize: '13px', flexShrink: 0, marginTop: '3px' }}>▶</span>
                      <span className="font-mono" style={{ color: 'rgba(255,255,255,0.82)', fontSize: '15px', lineHeight: '1.6' }}>
                        {h.replace(/^\[.*?\]\s*/, '')}
                      </span>
                    </div>
                  ))}
                  {lineIndex < headlines.length && (
                    <div className="font-mono" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px' }}>
                      <span className="status-blink">■</span> loading...
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 text-center py-5 px-6" style={{
            background: 'linear-gradient(to top, rgba(1,3,10,0.98) 80%, transparent)',
          }}>
            {phase === 'ready' ? (
              <div className="fade-in">
                <div className="font-mono mb-3" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', letterSpacing: '0.2em' }}>
                  BRIEFING COMPLETE · AI AGENTS STANDING BY · 3 PREDICTIONS AVAILABLE
                </div>
                <button
                  onClick={handleInitiate}
                  className="font-orbitron font-black px-16 py-5 rounded-2xl transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #00ff9d 0%, #00d4aa 100%)',
                    color: '#000',
                    fontSize: '20px',
                    letterSpacing: '0.25em',
                    boxShadow: '0 0 50px rgba(0,255,157,0.5), 0 0 100px rgba(0,255,157,0.2)',
                    border: 'none',
                    cursor: 'pointer',
                  }}>
                  ▶ INITIATE SIMULATION
                </button>
                <div className="font-mono mt-3" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '13px', letterSpacing: '0.1em' }}>
                  SCENARIO: {(state.realWorldContext?.scenarioId || state.activeScenario).replace(/_/g,' ').toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="font-mono" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '14px', letterSpacing: '0.2em' }}>
                <span className="status-blink">■</span> RECEIVING INTELLIGENCE...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
