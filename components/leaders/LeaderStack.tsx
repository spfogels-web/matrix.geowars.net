'use client';
import { Leader, LeaderMessage } from '@/lib/engine/types';
import { useState, useEffect, useRef } from 'react';

interface Props {
  leaders: Leader[];
  activeIds: string[];
  allLeaders: Leader[];
  isRunning: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  messages: LeaderMessage[];
}

const STATUS_COLORS: Record<string, string> = {
  stable:'#00ff9d', alert:'#ffd700', hostile:'#ff6a00',
  critical:'#ff2d55', diplomatic:'#b44fff', mobilizing:'#ff6a00', at_war:'#ff2d55',
};

const FLAG_CODE: Record<string, string> = {
  usa:'us', china:'cn', russia:'ru', iran:'ir', israel:'il',
  uk:'gb', france:'fr', germany:'de', turkey:'tr', saudiarabia:'sa',
  india:'in', pakistan:'pk', japan:'jp', southkorea:'kr',
  northkorea:'kp', ukraine:'ua', taiwan:'tw', nato:'un', europe:'eu',
};

// Typing speed (ms per character) — varies by leader personality
const TYPING_SPEEDS: Record<string, number> = {
  usa: 38, uk: 40, france: 42, germany: 44, japan: 40,
  china: 58, russia: 62, iran: 72, northkorea: 80,
  israel: 44, india: 50, pakistan: 68, ukraine: 46,
  southkorea: 48, taiwan: 46, nato: 36, europe: 38,
};

const THINKING_PHRASES = [
  'Analyzing situation...', 'Drafting response...', 'Assessing threat level...',
  'Consulting intelligence...', 'Evaluating options...', 'Processing briefing...',
];

const SETTLED_LABELS = [
  'Response transmitted', 'Statement logged', 'Communication sent',
  'Position recorded', 'Dispatch confirmed',
];

type SpeakPhase = 'idle' | 'thinking' | 'typing' | 'settled';

function LeaderAvatar({ leader, size = 72, isActive }: { leader: Leader; size?: number; isActive?: boolean }) {
  const [imgError, setImgError] = useState(false);
  const c = leader.color;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {isActive && (
        <div className="absolute inset-0 rounded-full" style={{
          border: `1.5px solid ${c}`, animation: 'spin 8s linear infinite', opacity: 0.8,
        }} />
      )}
      <div className="w-full h-full rounded-full overflow-hidden" style={{
        border: `3px solid ${c}80`,
        boxShadow: isActive
          ? `0 0 20px ${c}60, 0 0 6px ${c}90, inset 0 0 10px rgba(0,0,0,0.5)`
          : `0 0 10px ${c}35, inset 0 0 6px rgba(0,0,0,0.5)`,
        background: `linear-gradient(135deg, ${c}25, rgba(0,0,0,0.95))`,
      }}>
        {!imgError ? (
          <img src={`/leaders/${leader.id}.jpg`} alt={leader.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span style={{ fontSize: size * 0.46 }}>{leader.flag}</span>
          </div>
        )}
      </div>
      {isActive && (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div style={{
            position: 'absolute', left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent, ${c}90, transparent)`,
            animation: 'scanbeam 1.6s linear infinite',
          }} />
        </div>
      )}
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1" style={{ verticalAlign: 'middle' }}>
      {[0,1,2].map(i => (
        <span key={i} className="typing-dot" style={{
          display: 'inline-block', width: '5px', height: '5px',
          borderRadius: '50%', background: 'currentColor', opacity: 0,
        }} />
      ))}
    </span>
  );
}

function LeaderCard({
  leader, isActive, rank, isExpanded, latestMessage,
}: {
  leader: Leader; isActive: boolean; rank: number; isExpanded: boolean; latestMessage?: LeaderMessage;
}) {
  const [expanded, setExpanded] = useState(false);
  const [phase, setPhase] = useState<SpeakPhase>('idle');
  const [displayedText, setDisplayedText] = useState('');
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0]);
  const [settledLabel, setSettledLabel] = useState(SETTLED_LABELS[0]);
  const prevMsgId = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sc = STATUS_COLORS[leader.status] || '#00f5ff';
  const ac = leader.aggression >= 75 ? '#ff2d55' : leader.aggression >= 50 ? '#ff6a00' : leader.aggression >= 30 ? '#ffd700' : '#00ff9d';
  const role = (leader as Leader & { role?: string }).role;
  const flagCode = FLAG_CODE[leader.id];

  const nm  = isExpanded ? '17px' : '15px';
  const rl  = isExpanded ? '12px' : '11px';
  const ct  = isExpanded ? '11px' : '10px';
  const st  = isExpanded ? '11px' : '10px';
  const ag  = isExpanded ? '34px' : '28px';
  const qt  = isExpanded ? '14px' : '13px';
  const ac2 = isExpanded ? '12px' : '11px';
  const stmLen  = isExpanded ? 300 : 180;
  const avatarSize = isExpanded ? 80 : 70;

  const isSpeaking = phase === 'thinking' || phase === 'typing';
  const cardIsActive = isActive || isSpeaking;

  // Detect new message and trigger animation
  useEffect(() => {
    if (!latestMessage || latestMessage.id === prevMsgId.current) return;
    prevMsgId.current = latestMessage.id;

    // Clear any running animation
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setPhase('thinking');
    setDisplayedText('');
    setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    setSettledLabel(SETTLED_LABELS[Math.floor(Math.random() * SETTLED_LABELS.length)]);

    const thinkDuration = 1400 + Math.random() * 1200;

    timeoutRef.current = setTimeout(() => {
      const fullText = latestMessage.content;
      const speed = TYPING_SPEEDS[leader.id] ?? 55;
      let i = 0;
      setPhase('typing');
      setDisplayedText('');

      intervalRef.current = setInterval(() => {
        i++;
        setDisplayedText(fullText.substring(0, i));
        if (i >= fullText.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          timeoutRef.current = setTimeout(() => setPhase('settled'), 500);
        }
      }, speed);
    }, thinkDuration);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [latestMessage?.id]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const speakColor = `${sc}50`;

  return (
    <div
      className={`rounded-xl cursor-pointer overflow-hidden relative transition-all duration-300 ${cardIsActive ? 'scale-[1.005]' : ''} ${isSpeaking ? 'speak-glow' : ''}`}
      style={{
        border: isSpeaking ? `1.5px solid ${sc}` : `1.5px solid ${sc}55`,
        // @ts-ignore
        '--speak-color': speakColor,
        boxShadow: isSpeaking
          ? `0 0 40px ${sc}40, 0 0 80px ${sc}15, inset 0 0 40px rgba(0,0,0,0.2)`
          : cardIsActive
            ? `0 0 35px ${sc}30, 0 0 70px ${sc}10, inset 0 0 40px rgba(0,0,0,0.2)`
            : `0 0 14px rgba(0,0,0,0.7)`,
        minHeight: '210px',
        background: '#070310',
        transition: 'border-color 0.4s ease, box-shadow 0.4s ease',
      }}
      onClick={() => setExpanded(!expanded)}>

      {/* Flag background */}
      {flagCode && (
        <img
          src={`https://flagcdn.com/w640/${flagCode}.png`}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center top', opacity: isSpeaking ? 0.75 : 0.60, pointerEvents: 'none', userSelect: 'none', transition: 'opacity 0.4s ease' }}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.88) 62%, rgba(0,0,0,0.97) 100%)',
        zIndex: 1,
      }} />

      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-14 h-14 pointer-events-none" style={{ zIndex: 2 }}>
        <svg viewBox="0 0 56 56" className="w-full h-full">
          <path d="M56,0 L56,18 L38,0 Z" fill={sc} opacity={isSpeaking ? 0.6 : 0.3}/>
          <path d="M56,0 L56,7 L49,0 Z" fill={sc} opacity={isSpeaking ? 1 : 0.7}/>
        </svg>
      </div>

      {/* Scan line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${sc},transparent)`, opacity: cardIsActive ? 1 : 0.4, zIndex: 3 }} />
      {cardIsActive && (
        <div className="absolute left-0 right-0 h-px" style={{
          background: `linear-gradient(90deg,transparent,${sc},transparent)`,
          animation: 'scanbeam 1.8s linear infinite', top: 0, zIndex: 3,
        }} />
      )}

      {/* Speaking phase indicator bar at top */}
      {isSpeaking && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{
          background: `linear-gradient(90deg, transparent, ${sc}, ${sc}, transparent)`,
          zIndex: 4,
          animation: 'speak-glow 1.8s ease-in-out infinite',
        }} />
      )}

      {/* Content */}
      <div className="relative p-4" style={{ zIndex: 4 }}>

        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative shrink-0">
            <LeaderAvatar leader={leader} size={avatarSize} isActive={cardIsActive} />
            <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center font-orbitron font-bold"
              style={{ background: `linear-gradient(135deg,${sc},${sc}bb)`, color: '#000', fontSize: '11px', boxShadow: `0 0 12px ${sc}` }}>
              {rank}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-orbitron font-bold" style={{
              color: leader.color, fontSize: nm, letterSpacing: '0.025em',
              textShadow: `0 2px 14px rgba(0,0,0,0.95), 0 0 22px ${leader.color}55`,
              lineHeight: 1.15,
            }}>
              {leader.name}
            </div>
            {role && (
              <div className="font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.72)', fontSize: rl, textShadow: '0 1px 6px rgba(0,0,0,0.95)' }}>
                {role}
              </div>
            )}
            <div className="font-mono" style={{ color: 'rgba(255,255,255,0.42)', fontSize: ct, textShadow: '0 1px 4px rgba(0,0,0,0.95)' }}>
              {leader.country.toUpperCase()}
            </div>
            {/* Phase-aware status */}
            <div className="flex items-center gap-1.5 mt-1">
              {phase === 'thinking' && (
                <>
                  <div className="w-2 h-2 rounded-full status-blink" style={{ backgroundColor: sc, boxShadow: `0 0 7px ${sc}` }} />
                  <span className="font-mono font-bold" style={{ color: sc, fontSize: st, letterSpacing: '0.1em' }}>
                    {thinkingPhrase}<ThinkingDots />
                  </span>
                </>
              )}
              {phase === 'typing' && (
                <>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc, boxShadow: `0 0 10px ${sc}` }} />
                  <span className="font-mono font-bold" style={{ color: sc, fontSize: st, letterSpacing: '0.1em' }}>
                    TRANSMITTING<ThinkingDots />
                  </span>
                </>
              )}
              {phase === 'settled' && (
                <>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00ff9d', boxShadow: '0 0 7px #00ff9d' }} />
                  <span className="font-mono font-bold" style={{ color: '#00ff9d', fontSize: st, letterSpacing: '0.1em' }}>
                    ✓ {settledLabel.toUpperCase()}
                  </span>
                </>
              )}
              {phase === 'idle' && (
                <>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${cardIsActive ? 'status-blink' : ''}`}
                    style={{ backgroundColor: sc, boxShadow: `0 0 7px ${sc}` }} />
                  <span className="font-mono font-bold" style={{ color: sc, fontSize: st, letterSpacing: '0.1em', textShadow: `0 0 10px ${sc}80` }}>
                    {leader.status.replace('_', ' ').toUpperCase()}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="font-orbitron font-black" style={{
              color: ac, fontSize: ag, lineHeight: 1,
              textShadow: `0 0 28px ${ac}, 0 0 55px ${ac}50, 0 2px 8px rgba(0,0,0,0.9)`,
            }}>
              {leader.aggression}
            </div>
            <div className="font-mono" style={{ color: 'rgba(255,255,255,0.38)', fontSize: '10px' }}>AGG %</div>
          </div>
        </div>

        {/* Aggression bar */}
        <div className="mb-3" style={{ height: '3px', background: 'rgba(255,255,255,0.12)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${leader.aggression}%`, height: '100%',
            background: `linear-gradient(90deg,#00ff9d,${ac})`,
            boxShadow: `0 0 8px ${ac}`, borderRadius: '2px', transition: 'width 0.7s ease',
          }} />
        </div>

        {/* Quote / Typing area */}
        <div className="rounded-xl p-3 mb-2.5" style={{
          background: isSpeaking ? `rgba(0,0,0,0.75)` : 'rgba(0,0,0,0.65)',
          borderLeft: `3px solid ${isSpeaking ? sc : sc + '60'}`,
          backdropFilter: 'blur(8px)',
          minHeight: '52px',
          transition: 'border-color 0.3s ease',
        }}>
          {phase === 'thinking' && (
            <div className="flex items-center gap-2 py-2">
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0,1,2].map(i => (
                  <div key={i} className="typing-dot" style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: sc, opacity: 0,
                    boxShadow: `0 0 6px ${sc}`,
                  }} />
                ))}
              </div>
              <span className="font-mono" style={{ color: `${sc}80`, fontSize: '11px', fontStyle: 'italic' }}>
                composing...
              </span>
            </div>
          )}
          {(phase === 'typing' || phase === 'settled') && (
            <p className="font-exo italic" style={{ color: 'rgba(240,238,255,0.93)', fontSize: qt, lineHeight: '1.55' }}>
              &ldquo;{displayedText}
              {phase === 'typing' && (
                <span className="cursor-blink" style={{ display: 'inline-block', width: '2px', height: '1em', background: sc, marginLeft: '2px', verticalAlign: 'text-bottom' }} />
              )}
              &rdquo;
            </p>
          )}
          {phase === 'idle' && (
            <p className="font-exo italic" style={{ color: 'rgba(240,238,255,0.93)', fontSize: qt, lineHeight: '1.55' }}>
              &ldquo;{leader.lastStatement.substring(0, stmLen)}{leader.lastStatement.length > stmLen ? '…' : ''}&rdquo;
            </p>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-start gap-2 rounded-lg px-3 py-2.5"
          style={{ background: `${sc}12`, borderLeft: `3px solid ${sc}60`, backdropFilter: 'blur(6px)' }}>
          <span style={{ color: sc, fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>▶</span>
          <span className="font-mono" style={{ color: 'rgba(228,232,255,0.88)', fontSize: ac2, lineHeight: '1.45' }}>
            {(phase === 'typing' || phase === 'settled') && latestMessage
              ? latestMessage.action
              : leader.lastAction}
          </span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-4 pt-3.5 border-t grid grid-cols-2 gap-4 fade-in" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
            <div>
              <div className="font-mono mb-2" style={{ color: 'rgba(0,245,255,0.65)', fontSize: '11px', letterSpacing: '0.1em' }}>ECONOMY</div>
              {[
                { l:'GDP GROWTH', v:`${leader.economy.gdpGrowth>0?'+':''}${leader.economy.gdpGrowth}%` },
                { l:'INFLATION',  v:`${leader.economy.inflationRate}%` },
                { l:'SANCTIONS',  v:`${leader.economy.sanctionsImpact}%` },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between mb-1">
                  <span className="font-mono" style={{ color:'rgba(255,255,255,0.42)', fontSize:'11px' }}>{l}</span>
                  <span className="font-mono font-bold" style={{ color:'rgba(230,235,255,0.92)', fontSize:'11px' }}>{v}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="font-mono mb-2" style={{ color:'rgba(180,79,255,0.65)', fontSize:'11px', letterSpacing:'0.1em' }}>MILITARY</div>
              {[
                { l:'READINESS', v:`${leader.military.readiness}%` },
                { l:'NUCLEAR',   v:leader.military.nuclearCapable?'YES':'NO' },
                { l:'ALERT',     v:leader.military.nuclearAlert?'🔴 ACTIVE':'🟢 NORMAL' },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between mb-1">
                  <span className="font-mono" style={{ color:'rgba(255,255,255,0.42)', fontSize:'11px' }}>{l}</span>
                  <span className="font-mono font-bold" style={{ color:'rgba(230,235,255,0.92)', fontSize:'11px' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LeaderStack({ leaders, activeIds, allLeaders: _allLeaders, isRunning, isExpanded, onToggleExpand, messages }: Props) {
  const [showAll, setShowAll] = useState(false);
  const activeLeaders = leaders.filter(l => activeIds.includes(l.id));
  const watchlist = leaders.filter(l => !activeIds.includes(l.id)).slice(0, 10);

  // Build a map of leaderId → latest message
  const latestMsgMap = messages.reduce<Record<string, LeaderMessage>>((acc, m) => {
    if (!acc[m.leaderId] || m.timestamp > acc[m.leaderId].timestamp) acc[m.leaderId] = m;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">

      {/* Panel header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 rounded-xl panel"
        style={{ borderColor: 'rgba(120,60,255,0.25)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full status-blink" style={{ backgroundColor: '#b44fff', boxShadow: '0 0 8px #b44fff' }} />
          <span className="font-orbitron font-bold" style={{ color: '#b44fff', fontSize: '12px', letterSpacing: '0.2em' }}>
            WORLD LEADERS
          </span>
        </div>
        <button onClick={onToggleExpand}
          className="font-mono px-3 py-1 rounded border transition-all"
          style={{ fontSize: '11px', color: 'rgba(180,79,255,0.9)', borderColor: 'rgba(120,60,255,0.35)', background: 'rgba(120,60,255,0.12)' }}>
          {isExpanded ? '◀ COLLAPSE' : '▶ EXPAND'}
        </button>
      </div>

      {/* Active leader cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
        {activeLeaders.map((l, i) => (
          <LeaderCard
            key={l.id} leader={l} rank={i + 1}
            isActive={isRunning && l.lastActiveAt > Date.now() - 15000}
            isExpanded={isExpanded}
            latestMessage={latestMsgMap[l.id]}
          />
        ))}
      </div>

      {/* Watchlist */}
      <div className="shrink-0">
        <button onClick={() => setShowAll(!showAll)}
          className="w-full text-center font-mono py-2 rounded border mb-2 transition-all"
          style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(180,79,255,0.6)', borderColor: 'rgba(120,60,255,0.2)', background: 'rgba(120,60,255,0.06)' }}>
          {showAll ? '▲ HIDE' : '▼ WATCHLIST'} ({watchlist.length})
        </button>
        {showAll && (
          <div className="grid grid-cols-2 gap-1.5 fade-in max-h-52 overflow-y-auto">
            {watchlist.map(l => {
              const sc = STATUS_COLORS[l.status] || '#00f5ff';
              const fc = FLAG_CODE[l.id];
              return (
                <div key={l.id} className="rounded-lg overflow-hidden relative"
                  style={{ border: `1px solid ${sc}30`, minHeight: '54px', background: '#070310' }}>
                  {fc && (
                    <img src={`https://flagcdn.com/w320/${fc}.png`} alt="" className="absolute inset-0 w-full h-full"
                      style={{ objectFit:'cover', objectPosition:'center', opacity:0.4, pointerEvents:'none' }} />
                  )}
                  <div className="absolute inset-0" style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.55),rgba(0,0,0,0.82))' }}/>
                  <div className="relative p-2 flex items-center gap-2" style={{ zIndex:1 }}>
                    <span style={{ fontSize: '18px' }}>{l.flag}</span>
                    <div className="min-w-0">
                      <div className="font-orbitron truncate" style={{ color: l.color, fontSize: '11px', textShadow:`0 0 8px ${l.color}60` }}>{l.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
                        <span className="font-mono" style={{ color: sc, fontSize: '9px' }}>{l.status.toUpperCase()}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold ml-auto shrink-0" style={{ color:'rgba(220,225,248,0.8)', fontSize:'11px' }}>
                      {l.aggression}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
