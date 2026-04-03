'use client';
import { useGame } from '@/lib/predict/GameContext';

export default function Leaderboard() {
  const { leaderboard, wallet, totalPredictions, wins, totalEarned, balance, showLeaderboard, setShowLeaderboard } = useGame();

  if (!showLeaderboard) return null;

  const short = (addr: string) => addr.length > 12 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={() => setShowLeaderboard(false)}>
      <div className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: '820px', maxHeight: '88vh',
          background: 'linear-gradient(160deg, rgba(8,3,22,0.99) 0%, rgba(4,2,14,0.99) 100%)',
          border: '1px solid rgba(180,79,255,0.4)',
          boxShadow: '0 0 100px rgba(120,60,255,0.25), 0 0 40px rgba(180,79,255,0.1), 0 24px 80px rgba(0,0,0,0.95)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-8 py-5 border-b flex items-center gap-4" style={{ borderColor: 'rgba(120,60,255,0.2)', background: 'rgba(120,60,255,0.05)' }}>
          <span style={{ fontSize: '30px' }}>🏆</span>
          <div>
            <div className="font-orbitron font-bold" style={{ color: '#b44fff', fontSize: '20px', letterSpacing: '0.25em', textShadow: '0 0 20px rgba(180,79,255,0.5)' }}>
              LEADERBOARD
            </div>
            <div className="font-mono" style={{ color: 'rgba(180,79,255,0.45)', fontSize: '11px', letterSpacing: '0.15em', marginTop: '2px' }}>
              TOP 10 GLOBAL PREDICTORS
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="font-mono px-3 py-1 rounded" style={{ color: 'rgba(0,245,255,0.6)', background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.2)', fontSize: '11px' }}>
              SEASON 1 ACTIVE
            </div>
            <button onClick={() => setShowLeaderboard(false)}
              className="hdr-btn hdr-btn-red"
              style={{ fontSize: '13px', padding: '8px 16px' }}>
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* Current user stats */}
        {wallet && (
          <div className="px-8 py-4 border-b grid grid-cols-4 gap-4" style={{ borderColor: 'rgba(120,60,255,0.12)', background: 'rgba(180,79,255,0.06)' }}>
            {[
              { label: 'GWM BALANCE', value: `${balance.toFixed(0)}`, suffix: 'GWM', color: '#00ff9d' },
              { label: 'PREDICTIONS', value: String(totalPredictions), suffix: '', color: '#00f5ff' },
              { label: 'WINS', value: String(wins), suffix: '', color: '#ffd700' },
              { label: 'NET EARNED', value: `${totalEarned > 0 ? '+' : ''}${totalEarned}`, suffix: 'GWM', color: totalEarned >= 0 ? '#00ff9d' : '#ff2d55' },
            ].map(({ label, value, suffix, color }) => (
              <div key={label} className="rounded-xl px-4 py-3 text-center" style={{ background: `${color}0a`, border: `1px solid ${color}20` }}>
                <div className="font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.12em', marginBottom: '4px' }}>{label}</div>
                <div className="font-orbitron font-bold" style={{ color, fontSize: '22px', textShadow: `0 0 14px ${color}60` }}>
                  {value} <span style={{ fontSize: '12px', opacity: 0.6 }}>{suffix}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table header */}
        <div className="grid px-8 py-3 border-b"
          style={{ gridTemplateColumns: '60px 1fr 100px 90px 100px 120px', borderColor: 'rgba(120,60,255,0.15)', background: 'rgba(0,0,0,0.4)' }}>
          {['#', 'ADDRESS', 'PREDS', 'WINS', 'WIN %', 'EARNED'].map(h => (
            <span key={h} className="font-orbitron font-bold" style={{ color: 'rgba(180,79,255,0.7)', fontSize: '11px', letterSpacing: '0.15em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="overflow-y-auto flex-1">
          {leaderboard.map((entry, i) => {
            const winRate = entry.predictions > 0 ? Math.round((entry.wins / entry.predictions) * 100) : 0;
            const isUser = entry.isCurrentUser;
            const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.35)';
            const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
            const winColor = winRate >= 60 ? '#00ff9d' : winRate >= 40 ? '#ffd700' : '#ff6a00';

            return (
              <div key={entry.address}
                className="grid px-8 py-4 border-b transition-all"
                style={{
                  gridTemplateColumns: '60px 1fr 100px 90px 100px 120px',
                  borderColor: 'rgba(120,60,255,0.08)',
                  background: isUser
                    ? 'linear-gradient(90deg, rgba(180,79,255,0.12) 0%, rgba(120,60,255,0.06) 100%)'
                    : i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                  borderLeft: isUser ? '4px solid rgba(180,79,255,0.6)' : '4px solid transparent',
                }}>

                {/* Rank */}
                <div className="flex items-center">
                  <span className="font-orbitron font-bold" style={{ color: rankColor, fontSize: i < 3 ? '22px' : '16px' }}>
                    {rankLabel}
                  </span>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold" style={{ color: isUser ? '#b44fff' : 'rgba(255,255,255,0.85)', fontSize: '15px', textShadow: isUser ? '0 0 12px rgba(180,79,255,0.4)' : 'none' }}>
                    {short(entry.displayName)}
                  </span>
                  {isUser && (
                    <span className="font-orbitron font-bold" style={{ fontSize: '10px', color: '#b44fff', background: 'rgba(180,79,255,0.2)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(180,79,255,0.4)', letterSpacing: '0.1em' }}>
                      YOU
                    </span>
                  )}
                </div>

                {/* Predictions */}
                <div className="flex items-center">
                  <span className="font-mono font-bold" style={{ color: '#00f5ff', fontSize: '16px' }}>{entry.predictions}</span>
                </div>

                {/* Wins */}
                <div className="flex items-center">
                  <span className="font-mono font-bold" style={{ color: '#ffd700', fontSize: '16px' }}>{entry.wins}</span>
                </div>

                {/* Win % with bar */}
                <div className="flex flex-col justify-center gap-1">
                  <span className="font-orbitron font-bold" style={{ color: winColor, fontSize: '16px' }}>{winRate}%</span>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', width: '60px' }}>
                    <div style={{ height: '100%', width: `${winRate}%`, background: winColor, borderRadius: '2px', boxShadow: `0 0 6px ${winColor}` }} />
                  </div>
                </div>

                {/* Earned */}
                <div className="flex items-center">
                  <span className="font-orbitron font-bold" style={{ color: entry.totalEarned >= 0 ? '#00ff9d' : '#ff2d55', fontSize: '17px', textShadow: entry.totalEarned >= 0 ? '0 0 12px rgba(0,255,157,0.4)' : '0 0 12px rgba(255,45,85,0.4)' }}>
                    {entry.totalEarned > 0 ? '+' : ''}{entry.totalEarned}
                  </span>
                </div>
              </div>
            );
          })}

          {leaderboard.length === 0 && (
            <div className="text-center py-16">
              <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.25)', fontSize: '15px', letterSpacing: '0.2em' }}>NO PREDICTIONS YET</div>
              <div className="font-mono mt-2" style={{ color: 'rgba(255,255,255,0.15)', fontSize: '12px' }}>Connect wallet and place your first prediction</div>
            </div>
          )}
        </div>

        <div className="px-8 py-3 border-t text-center" style={{ borderColor: 'rgba(120,60,255,0.12)', background: 'rgba(0,0,0,0.3)' }}>
          <span className="font-mono" style={{ color: 'rgba(120,60,255,0.4)', fontSize: '10px', letterSpacing: '0.12em' }}>
            GEOWARS MATRIX — PREDICTION INTELLIGENCE NETWORK // ENCRYPTED
          </span>
        </div>
      </div>
    </div>
  );
}
