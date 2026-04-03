'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/lib/predict/GameContext';

const SCENARIO_QUESTIONS: Record<string, string> = {
  global_tension:    'Will global tensions escalate to direct military conflict this cycle?',
  taiwan_crisis:     'Will the Taiwan Strait crisis trigger PLA military action this cycle?',
  hormuz_blockade:   'Will the Hormuz Blockade escalate to open naval warfare this cycle?',
  nato_conflict:     'Will NATO forces engage in direct combat operations this cycle?',
  nuclear_standoff:  'Will a nuclear-armed state launch or authorise a nuclear strike this cycle?',
  economic_collapse: 'Will the economic crisis trigger a major government collapse this cycle?',
  middle_east_war:   'Will the Middle East conflict spread to a new country this cycle?',
};

interface Props {
  scenarioId: string;
  cycleNumber: number;
  globalTension: number;
  isRunning: boolean;
}

export default function PredictionPanel({ scenarioId, cycleNumber, globalTension, isRunning }: Props) {
  const { wallet, balance, activePrediction, placePrediction, resolvePrediction, showPrediction, setShowPrediction } = useGame();
  const [choice, setChoice] = useState<'yes' | 'no' | null>(null);
  const [amount, setAmount] = useState('50');
  const [submitted, setSubmitted] = useState(false);
  const [lastCycle, setLastCycle] = useState(cycleNumber);

  // Drag state
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    setPos({ x: window.innerWidth - 420, y: window.innerHeight - 520 });
  }, []);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag if clicking interactive elements
    if ((e.target as HTMLElement).closest('button, input, select')) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const pw = panelRef.current?.offsetWidth ?? 400;
      const ph = panelRef.current?.offsetHeight ?? 500;
      const nx = Math.max(0, Math.min(window.innerWidth - pw, e.clientX - dragOffset.current.x));
      const ny = Math.max(0, Math.min(window.innerHeight - ph, e.clientY - dragOffset.current.y));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const question = SCENARIO_QUESTIONS[scenarioId] ?? 'Will this scenario escalate to military conflict this cycle?';

  // Resolve every cycle AND allow a new bet each cycle
  useEffect(() => {
    if (cycleNumber > lastCycle) {
      if (activePrediction && !activePrediction.resolved) {
        const outcome: 'yes' | 'no' = globalTension > 65 ? 'yes' : 'no';
        resolvePrediction(outcome);
      }
      setLastCycle(cycleNumber);
      // Allow a new prediction immediately after resolution
      setTimeout(() => {
        setSubmitted(false);
        setChoice(null);
      }, 3000);
    }
  }, [cycleNumber, lastCycle, activePrediction, globalTension, resolvePrediction]);

  useEffect(() => {
    setSubmitted(false);
    setChoice(null);
  }, [scenarioId]);

  function handleSubmit() {
    const amt = parseInt(amount, 10);
    if (!choice || isNaN(amt) || amt <= 0 || amt > balance) return;
    placePrediction(choice, amt, scenarioId, cycleNumber);
    setSubmitted(true);
  }

  const tc = '#b44fff';
  const resolved = activePrediction?.resolved;
  const isWin = activePrediction?.result === 'win';
  const borderColor = resolved ? (isWin ? 'rgba(0,255,157,0.5)' : 'rgba(255,45,85,0.5)') : 'rgba(120,60,255,0.4)';

  if (!showPrediction) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-40 flex flex-col"
      style={{
        left: pos.x, top: pos.y,
        width: '400px',
        background: 'linear-gradient(160deg, rgba(8,3,22,0.98) 0%, rgba(4,2,14,0.98) 100%)',
        border: `1px solid ${borderColor}`,
        borderRadius: '18px',
        backdropFilter: 'blur(24px)',
        boxShadow: `0 12px 50px rgba(0,0,0,0.9), 0 0 60px rgba(120,60,255,0.1), 0 0 0 1px rgba(120,60,255,0.08)`,
        userSelect: 'none',
      }}>

      {/* Drag handle / Header */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center gap-3 px-5 py-4 border-b"
        style={{
          borderColor: 'rgba(120,60,255,0.2)',
          cursor: 'grab',
          background: 'rgba(120,60,255,0.06)',
          borderRadius: '18px 18px 0 0',
        }}>
        <span style={{ fontSize: '20px' }}>🎯</span>
        <div>
          <div className="font-orbitron font-bold" style={{ color: tc, fontSize: '14px', letterSpacing: '0.2em', textShadow: '0 0 16px rgba(180,79,255,0.5)' }}>
            PREDICTION
          </div>
          <div className="font-mono" style={{ color: 'rgba(180,79,255,0.45)', fontSize: '10px', letterSpacing: '0.1em', marginTop: '1px' }}>
            CYCLE {cycleNumber} · DRAG TO MOVE
          </div>
        </div>
        {/* Drag grip indicator */}
        <div className="ml-auto flex items-center gap-3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', opacity: 0.3 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: '18px', height: '2px', background: '#b44fff', borderRadius: '1px' }} />)}
          </div>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setShowPrediction(false)}
            className="font-mono px-2 py-1 rounded transition-all"
            style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      <div className="px-5 py-5" style={{ userSelect: 'text' }}>

        {/* WIN / LOSS banner */}
        {resolved && activePrediction && (
          <div className="rounded-2xl px-5 py-5 mb-4 text-center"
            style={{
              background: isWin ? 'rgba(0,255,157,0.1)' : 'rgba(255,45,85,0.1)',
              border: `1.5px solid ${isWin ? 'rgba(0,255,157,0.5)' : 'rgba(255,45,85,0.5)'}`,
              boxShadow: isWin ? '0 0 30px rgba(0,255,157,0.1)' : '0 0 30px rgba(255,45,85,0.1)',
            }}>
            <div className="font-orbitron font-bold" style={{ color: isWin ? '#00ff9d' : '#ff2d55', fontSize: '36px', letterSpacing: '0.12em', textShadow: isWin ? '0 0 24px rgba(0,255,157,0.5)' : '0 0 24px rgba(255,45,85,0.5)' }}>
              {isWin ? '✓ WIN' : '✗ LOSS'}
            </div>
            <div className="font-mono mt-2" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
              {isWin
                ? `+${activePrediction.payout - activePrediction.amount} GWM earned`
                : `-${activePrediction.amount} GWM lost`}
            </div>
            <div className="font-mono mt-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
              Next prediction available in cycle {cycleNumber + 1}
            </div>
          </div>
        )}

        {/* Question */}
        {(!resolved || !activePrediction) && (
          <>
            <p className="font-exo mb-5" style={{ color: 'rgba(238,235,255,0.9)', fontSize: '15px', lineHeight: '1.7' }}>
              {question}
            </p>

            {!wallet ? (
              <div className="text-center py-6 rounded-xl" style={{ background: 'rgba(120,60,255,0.06)', border: '1px solid rgba(120,60,255,0.15)' }}>
                <div className="font-orbitron font-bold" style={{ color: 'rgba(180,79,255,0.5)', fontSize: '13px', letterSpacing: '0.15em' }}>CONNECT WALLET TO PREDICT</div>
              </div>
            ) : submitted && activePrediction && !activePrediction.resolved ? (
              <div className="rounded-2xl px-5 py-5 text-center"
                style={{ background: 'rgba(120,60,255,0.1)', border: '1px solid rgba(120,60,255,0.35)' }}>
                <div className="font-orbitron font-bold" style={{ color: tc, fontSize: '18px', letterSpacing: '0.1em' }}>
                  {activePrediction.choice.toUpperCase()}
                </div>
                <div className="font-orbitron font-bold mt-1" style={{ color: '#00ff9d', fontSize: '22px' }}>
                  {activePrediction.amount} GWM
                </div>
                <div className="font-mono mt-3 status-blink" style={{ color: 'rgba(180,79,255,0.7)', fontSize: '11px', letterSpacing: '0.12em' }}>
                  AWAITING CYCLE RESOLUTION...
                </div>
                <div className="font-mono mt-2" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                  Potential payout: <span style={{ color: '#00ff9d', fontWeight: 'bold' }}>{activePrediction.amount * 2} GWM</span>
                </div>
              </div>
            ) : !isRunning ? (
              <div className="text-center py-6 rounded-xl" style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.15)' }}>
                <div className="font-orbitron font-bold" style={{ color: 'rgba(255,215,0,0.6)', fontSize: '13px', letterSpacing: '0.15em' }}>START SIMULATION TO PREDICT</div>
              </div>
            ) : (
              <>
                {/* YES / NO */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(['yes', 'no'] as const).map(c => {
                    const isYes = c === 'yes';
                    const active = choice === c;
                    const color = isYes ? '#00ff9d' : '#ff2d55';
                    return (
                      <button key={c} onClick={() => setChoice(c)}
                        className="rounded-xl font-orbitron font-bold transition-all"
                        style={{
                          fontSize: '18px', letterSpacing: '0.15em',
                          padding: '16px',
                          color: active ? color : 'rgba(255,255,255,0.3)',
                          background: active ? `${color}1a` : 'rgba(255,255,255,0.03)',
                          border: `2px solid ${active ? color : 'rgba(255,255,255,0.08)'}`,
                          boxShadow: active ? `0 0 28px ${color}35, inset 0 0 20px ${color}0a` : 'none',
                          transform: active ? 'scale(1.02)' : 'scale(1)',
                        }}>
                        {isYes ? '▲ YES' : '▼ NO'}
                      </button>
                    );
                  })}
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.08em' }}>AMOUNT (GWM)</span>
                    <span className="font-mono font-bold" style={{ color: '#b44fff', fontSize: '12px' }}>BAL: {balance.toFixed(0)} GWM</span>
                  </div>
                  <input
                    type="number" min="1" max={balance}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 font-orbitron font-bold"
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(120,60,255,0.4)',
                      color: '#ffffff', fontSize: '22px',
                      outline: 'none',
                      letterSpacing: '0.05em',
                    }}
                  />
                  {/* Quick amounts */}
                  <div className="flex gap-2 mt-3">
                    {[25, 50, 100, 200].map(v => (
                      <button key={v} onClick={() => setAmount(String(Math.min(v, balance)))}
                        className="flex-1 font-orbitron font-bold rounded-lg py-2 transition-all"
                        style={{ fontSize: '12px', color: 'rgba(180,79,255,0.8)', background: 'rgba(120,60,255,0.1)', border: '1px solid rgba(120,60,255,0.25)', letterSpacing: '0.05em' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payout preview */}
                {choice && parseInt(amount) > 0 && (
                  <div className="flex justify-between items-center mb-4 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.2)' }}>
                    <span className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Potential payout</span>
                    <span className="font-orbitron font-bold" style={{ color: '#00ff9d', fontSize: '20px', textShadow: '0 0 14px rgba(0,255,157,0.4)' }}>
                      {parseInt(amount) * 2} GWM
                    </span>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!choice || !parseInt(amount) || parseInt(amount) > balance}
                  className="w-full font-orbitron font-bold rounded-xl transition-all"
                  style={{
                    fontSize: '15px', letterSpacing: '0.18em',
                    padding: '16px',
                    color: choice ? '#fff' : 'rgba(255,255,255,0.2)',
                    background: choice ? 'linear-gradient(135deg,#b44fff 0%,#7c3aed 100%)' : 'rgba(255,255,255,0.04)',
                    border: choice ? '1px solid rgba(180,79,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: choice ? '0 6px 28px rgba(180,79,255,0.45), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                    cursor: choice ? 'pointer' : 'not-allowed',
                    transform: choice ? 'scale(1)' : 'scale(1)',
                  }}>
                  PLACE PREDICTION
                </button>
              </>
            )}
          </>
        )}

        {resolved && (
          <button
            onClick={() => { setSubmitted(false); setChoice(null); }}
            className="w-full font-orbitron font-bold rounded-xl mt-3 transition-all"
            style={{ fontSize: '13px', letterSpacing: '0.12em', padding: '14px', color: tc, background: 'rgba(120,60,255,0.1)', border: '1px solid rgba(120,60,255,0.3)' }}>
            NEW PREDICTION NEXT CYCLE
          </button>
        )}
      </div>
    </div>
  );
}
