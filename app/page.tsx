'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import WorldMap from '@/components/map/WorldMap';
import LeaderStack from '@/components/leaders/LeaderStack';
import LiveFeed from '@/components/feed/LiveFeed';
import IntelPanel from '@/components/intel/IntelPanel';
import LeaderPopup from '@/components/leaders/LeaderPopup';
import LeaderChat from '@/components/chat/LeaderChat';
import WalletButton from '@/components/wallet/WalletButton';
import PredictionPanel from '@/components/predict/PredictionPanel';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import { useGame } from '@/lib/predict/GameContext';
import { WorldState } from '@/lib/engine/types';
import WorldBriefing from '@/components/map/WorldBriefing';
import BotPanel from '@/components/bots/BotPanel';


async function runTick(pendingRef: React.MutableRefObject<boolean>, setProcessing: (v: boolean) => void) {
  if (pendingRef.current) return;
  pendingRef.current = true;
  setProcessing(true);
  try { await fetch('/api/tick', { method: 'POST' }); }
  catch { /* network error — silently skip this tick, next interval will retry */ }
  finally { pendingRef.current = false; setProcessing(false); }
}

export default function Home() {
  const { setShowLeaderboard, resetSimPredictions } = useGame();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab]   = useState<'feed'|'leaders'|'intel'>('feed');
  const [state, setState]           = useState<WorldState | null>(null);
  const [mapExpanded, setMapExpanded]   = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const [botPanelOpen, setBotPanelOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simStartTime, setSimStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const tickPendingRef = useRef(false);
  const wasRunningRef  = useRef(false);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => { try { setState(JSON.parse(e.data)); } catch {} };
    return () => es.close();
  }, []);

  // Tick timer — 30s between AI ticks (was 15s) for slower escalation
  useEffect(() => {
    const running = !!(state?.isRunning && !state?.isPaused);
    if (running && !wasRunningRef.current) {
      setSimStartTime(Date.now());
      setElapsed(0);
      resetSimPredictions();
      setTimeout(() => runTick(tickPendingRef, setIsProcessing), 8000);
    }
    if (!running && wasRunningRef.current) setSimStartTime(null);
    wasRunningRef.current = running;
    if (!running) return;
    const timer = setInterval(() => runTick(tickPendingRef, setIsProcessing), 45000);
    return () => clearInterval(timer);
  }, [state?.isRunning, state?.isPaused]);

  // Elapsed time counter
  useEffect(() => {
    if (!simStartTime) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - simStartTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [simStartTime]);

  const control = useCallback(async (action: string, scenarioId?: string) => {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, scenarioId }),
    });
  }, []);

  if (!state) {
    return (
      <div className="w-screen h-screen flex items-center justify-center" style={{ background: '#06030f' }}>
        <div className="text-center">
          <div className="font-orbitron font-black neon-purple mb-3" style={{ fontSize: '22px', letterSpacing: '0.3em' }}>
            GEOWARS MATRIX
          </div>
          <div className="font-mono" style={{ color: 'rgba(180,79,255,0.4)', fontSize: '11px', letterSpacing: '0.2em' }}>
            CONNECTING TO INTELLIGENCE NETWORK
            <span className="status-blink" style={{ display: 'inline-block', marginLeft: '4px' }}>_</span>
          </div>
        </div>
      </div>
    );
  }

  const tc = state.globalTension >= 75 ? '#ff2d55'
    : state.globalTension >= 55 ? '#ff6a00'
    : state.globalTension >= 30 ? '#ffd700'
    : '#00f5ff';

  const runLabel = isProcessing ? '⟳ PROCESSING'
    : state.isRunning && !state.isPaused ? '● LIVE'
    : state.isPaused ? '⏸ PAUSED'
    : '○ STANDBY';

  const mapProps = {
    conflictZones:  state.conflictZones,
    events:         state.events,
    tension:        state.globalTension,
    isRunning:      state.isRunning && !state.isPaused,
    leaders:        state.leaders,
    breakingIntel:  state.breakingIntel ?? [],
  };

  // Latest high-escalation message for popup
  const latestMsg = state.messages.length > 0 ? state.messages[0] : null;

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#06030f 0%,#0d0620 45%,#060c18 100%)' }}>

      {/* ── Fullscreen map overlay ── */}
      {mapExpanded && (
        <div className="fixed inset-0 z-50" style={{ background: '#010408' }}>
          <WorldMap {...mapProps} isExpanded={true} onExpandToggle={() => setMapExpanded(false)} />
        </div>
      )}

      {/* ── Leader popup (portrait flies in when speaking) ── */}
      <LeaderPopup message={latestMsg} />

      {/* ── Prediction panel ── */}
      <PredictionPanel
        scenarioId={state.activeScenario}
        cycleNumber={state.currentCycleNumber}
        globalTension={state.globalTension}
        isRunning={state.isRunning && !state.isPaused}
      />

      {/* ── Leaderboard modal ── */}
      <Leaderboard />

      {/* ── Agent comms chat panel ── */}
      <LeaderChat
        messages={state.messages}
        leaders={state.leaders}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* ── Bot deployment panel ── */}
      <BotPanel isOpen={botPanelOpen} onClose={() => setBotPanelOpen(false)} />

      {isMobile ? (
        /* ── MOBILE LAYOUT ─────────────────────────────────────────────── */
        <>
          {/* Mobile header — single row + action row */}
          <header className="shrink-0" style={{ background: 'rgba(8,3,20,0.98)', borderBottom: '1px solid rgba(120,60,255,0.18)', position: 'relative', zIndex: 80 }}>

            {/* Row 1: title · tension · threat · status · sim controls */}
            <div className="flex items-center gap-2 px-3" style={{ height: '48px' }}>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2 h-2 rounded-full status-blink" style={{ backgroundColor: tc, boxShadow: `0 0 8px ${tc}` }} />
                <span className="font-orbitron font-black neon-cyan" style={{ fontSize: '13px', letterSpacing: '0.22em' }}>GWM</span>
              </div>

              <div className="h-5 w-px shrink-0" style={{ background: 'rgba(120,60,255,0.3)' }} />

              <span className="font-orbitron font-bold shrink-0" style={{ color: tc, fontSize: '22px', lineHeight: 1, textShadow: `0 0 14px ${tc}` }}>
                {state.globalTension}
              </span>
              <span className="font-mono shrink-0" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '10px' }}>/100</span>
              <span className="font-mono px-1.5 py-0.5 rounded border shrink-0"
                style={{ color: tc, borderColor: `${tc}60`, background: `${tc}10`, fontSize: '8px', letterSpacing: '0.1em' }}>
                {state.threatLevel.replace('_', ' ')}
              </span>

              <div className="flex-1" />

              <span className="font-mono font-bold shrink-0" style={{
                color: isProcessing ? '#ffd700' : state.isRunning && !state.isPaused ? '#00ff9d' : 'rgba(200,210,240,0.3)',
                fontSize: '9px', letterSpacing: '0.06em',
              }}>
                {runLabel}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                {!state.isRunning ? (
                  <button onClick={() => control('start')} className="hdr-btn hdr-btn-green font-orbitron font-bold"
                    style={{ fontSize: '10px', padding: '5px 11px' }}>
                    ▶ START
                  </button>
                ) : (
                  <>
                    <button onClick={() => control('pause')} className="hdr-btn hdr-btn-yellow"
                      style={{ fontSize: '10px', padding: '5px 9px' }}>
                      {state.isPaused ? '▶' : '⏸'}
                    </button>
                    <button onClick={() => control('stop')} className="hdr-btn hdr-btn-orange"
                      style={{ fontSize: '10px', padding: '5px 9px' }}>
                      ■
                    </button>
                  </>
                )}
                <button onClick={() => control('reset')} className="hdr-btn hdr-btn-purple"
                  style={{ fontSize: '10px', padding: '5px 9px' }}>
                  ↺
                </button>
              </div>
            </div>

          </header>

          {/* Mobile main */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ position: 'relative' }}>

            {/* World Briefing — covers main area only, header stays interactive */}
            {!state.isRunning && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
                <WorldBriefing state={state} onInitiate={() => control('start')} />
              </div>
            )}

            {/* Map — fixed height */}
            <div className="shrink-0 overflow-hidden panel relative"
              style={{ height: '38vh', borderLeft: 'none', borderRight: 'none', borderRadius: 0, borderColor: 'rgba(120,60,255,0.18)' }}>
              <WorldMap
                {...mapProps}
                isExpanded={false}
                onExpandToggle={() => setMapExpanded(true)}
                worldState={state}
                onInitiate={() => control('start')}
              />
            </div>

            {/* Action bar: AGENTS · COMMS · LEADERBOARD · WALLET */}
            <div className="shrink-0 grid px-2 py-1.5 gap-1.5" style={{
              gridTemplateColumns: 'repeat(4, 1fr)',
              background: 'rgba(6,3,15,0.98)',
              borderBottom: '1px solid rgba(120,60,255,0.1)',
              position: 'relative', zIndex: 55,
            }}>
              <button onClick={() => setBotPanelOpen(v => !v)}
                className="font-orbitron font-bold"
                style={{
                  fontSize: '9px', padding: '6px 4px', borderRadius: '7px',
                  border: botPanelOpen ? '1px solid #b44fff' : '1px solid rgba(180,79,255,0.4)',
                  background: botPanelOpen ? 'rgba(180,79,255,0.22)' : 'rgba(180,79,255,0.07)',
                  color: '#d090ff', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  animation: botPanelOpen ? 'none' : 'agents-btn-pulse 2.2s ease-in-out infinite',
                  letterSpacing: '0.08em',
                }}>
                <span style={{ fontSize: '15px', lineHeight: 1 }}>🤖</span>
                AGENTS
                {(state.bots ?? []).length > 0 && (
                  <span style={{ background: '#b44fff', color: '#000', borderRadius: '8px', padding: '0 4px', fontSize: '8px', fontWeight: 'bold', lineHeight: '13px' }}>
                    {(state.bots ?? []).length}
                  </span>
                )}
              </button>

              <button onClick={() => setChatOpen(v => !v)}
                className="font-orbitron font-bold"
                style={{
                  fontSize: '9px', padding: '6px 4px', borderRadius: '7px',
                  border: chatOpen ? '1px solid rgba(180,79,255,0.7)' : '1px solid rgba(120,60,255,0.3)',
                  background: chatOpen ? 'rgba(180,79,255,0.16)' : 'rgba(120,60,255,0.06)',
                  color: chatOpen ? '#b44fff' : 'rgba(180,79,255,0.7)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  letterSpacing: '0.08em',
                }}>
                <span style={{ fontSize: '15px', lineHeight: 1 }}>📡</span>
                COMMS
                {state.messages.length > 0 && (
                  <span style={{ background: '#b44fff', color: '#000', borderRadius: '8px', padding: '0 4px', fontSize: '8px', fontWeight: 'bold', lineHeight: '13px' }}>
                    {Math.min(state.messages.length, 99)}
                  </span>
                )}
              </button>

              <button onClick={() => setShowLeaderboard(true)}
                className="font-orbitron font-bold"
                style={{
                  fontSize: '9px', padding: '6px 4px', borderRadius: '7px',
                  border: '1px solid rgba(255,215,0,0.3)',
                  background: 'rgba(255,215,0,0.06)',
                  color: 'rgba(255,215,0,0.8)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  letterSpacing: '0.08em',
                }}>
                <span style={{ fontSize: '15px', lineHeight: 1 }}>🏆</span>
                BOARD
              </button>

              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: '7px', border: '1px solid rgba(0,245,255,0.2)',
                background: 'rgba(0,245,255,0.04)', padding: '4px',
              }}>
                <WalletButton />
              </div>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex" style={{
              height: '42px',
              background: 'rgba(6,3,15,0.98)',
              borderBottom: '1px solid rgba(120,60,255,0.18)',
              position: 'relative', zIndex: 55,
            }}>
              {([
                ['feed',    '📡', 'FEED'],
                ['leaders', '👥', 'LEADERS'],
                ['intel',   '🔍', 'INTEL'],
              ] as const).map(([tab, icon, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 font-orbitron font-bold"
                  style={{
                    fontSize: '10px', letterSpacing: '0.12em',
                    color: activeTab === tab ? '#00f5ff' : 'rgba(200,210,240,0.35)',
                    background: activeTab === tab ? 'rgba(0,245,255,0.06)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #00f5ff' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'color 0.18s, background 0.18s, border-color 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  }}>
                  <span style={{ fontSize: '13px' }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content — fills remaining height, scrolls internally */}
            <div className="flex-1 overflow-hidden min-h-0">
              {activeTab === 'feed' && (
                <LiveFeed
                  events={state.events}
                  messages={state.messages}
                  botMessages={state.botMessages ?? []}
                  isExpanded={false}
                  onToggle={() => {}}
                />
              )}
              {activeTab === 'leaders' && (
                <LeaderStack
                  leaders={state.leaders.filter(l => state.activeLeaderIds.includes(l.id))}
                  activeIds={state.activeLeaderIds}
                  allLeaders={state.leaders}
                  isRunning={state.isRunning && !state.isPaused}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                  messages={state.messages}
                />
              )}
              {activeTab === 'intel' && (
                <IntelPanel
                  state={state}
                  isExpanded={false}
                  onToggleExpand={() => {}}
                />
              )}
            </div>
          </main>
        </>
      ) : (
        /* ── DESKTOP LAYOUT (unchanged) ──────────────────────────────────── */
        <>
          {/* ── Header ── */}
          <header className="shrink-0 flex items-center gap-4 px-4 border-b"
            style={{ height: '68px', borderColor: 'rgba(120,60,255,0.18)', background: 'rgba(8,3,20,0.98)' }}>

            {/* Title */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-3 h-3 rounded-full status-blink" style={{ backgroundColor: tc, boxShadow: `0 0 12px ${tc}` }} />
              <span className="font-orbitron font-black neon-cyan" style={{ fontSize: '20px', letterSpacing: '0.25em' }}>
                GEOWARS MATRIX
              </span>
            </div>

            <div className="h-8 w-px shrink-0" style={{ background: 'rgba(120,60,255,0.25)' }} />

            {/* Tension */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-3 h-3 rounded-full status-blink" style={{ backgroundColor: tc, boxShadow: `0 0 10px ${tc}` }} />
              <span className="font-mono font-bold px-2.5 py-1 rounded border"
                style={{ color: tc, borderColor: tc, background: `${tc}12`, fontSize: '12px', letterSpacing: '0.12em' }}>
                {state.threatLevel.replace('_', ' ')}
              </span>
              <span className="font-orbitron font-bold" style={{ color: tc, fontSize: '30px', textShadow: `0 0 18px ${tc}`, lineHeight: 1 }}>
                {state.globalTension}
              </span>
              <span className="font-mono" style={{ color: 'rgba(200,210,240,0.4)', fontSize: '13px' }}>/ 100</span>
            </div>

            <div className="h-8 w-px shrink-0" style={{ background: 'rgba(120,60,255,0.25)' }} />

            {/* Cycle + status + timer */}
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="font-mono" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '12px', letterSpacing: '0.08em' }}>CYCLE</span>
              <span className="font-orbitron font-bold neon-cyan" style={{ fontSize: '18px' }}>
                {state.currentCycleNumber}
              </span>
              <span className="font-mono font-bold" style={{
                color: isProcessing ? '#ffd700' : state.isRunning && !state.isPaused ? '#00ff9d' : 'rgba(200,210,240,0.35)',
                fontSize: '12px', letterSpacing: '0.06em',
              }}>
                {runLabel}
              </span>
              {state.isRunning && !state.isPaused && elapsed > 0 && (
                <>
                  <div className="h-4 w-px" style={{ background: 'rgba(120,60,255,0.3)' }} />
                  <span className="font-orbitron font-bold" style={{ color: 'rgba(0,245,255,0.7)', fontSize: '14px', letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}>
                    {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1" />

            {/* Bot panel toggle */}
            <button onClick={() => setBotPanelOpen(v => !v)}
              className="shrink-0 font-orbitron font-bold"
              style={{
                fontSize: '13px', padding: '10px 22px', borderRadius: '8px',
                border: botPanelOpen ? '1.5px solid #b44fff' : '1.5px solid rgba(180,79,255,0.7)',
                background: botPanelOpen
                  ? 'rgba(180,79,255,0.28)'
                  : 'linear-gradient(135deg, rgba(180,79,255,0.18) 0%, rgba(120,40,200,0.22) 100%)',
                color: '#d090ff', letterSpacing: '0.14em', cursor: 'pointer', position: 'relative',
                boxShadow: botPanelOpen
                  ? '0 0 20px rgba(180,79,255,0.5), inset 0 0 14px rgba(180,79,255,0.1)'
                  : '0 0 14px rgba(180,79,255,0.35), inset 0 0 10px rgba(180,79,255,0.08)',
                animation: botPanelOpen ? 'none' : 'agents-btn-pulse 2.2s ease-in-out infinite',
                transition: 'box-shadow 0.2s, background 0.2s',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}>
              <span style={{ fontSize: '16px' }}>🤖</span>
              AGENTS
              {(state.bots ?? []).length > 0 ? (
                <span style={{ background: '#b44fff', color: '#000', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 'bold', lineHeight: '15px' }}>
                  {(state.bots ?? []).length}
                </span>
              ) : (
                <span style={{ fontSize: '9px', color: 'rgba(180,79,255,0.55)', border: '1px solid rgba(180,79,255,0.3)', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.08em' }}>NEW</span>
              )}
            </button>

            {/* Chat toggle */}
            <button onClick={() => setChatOpen(v => !v)}
              className="hdr-btn hdr-btn-purple shrink-0 font-orbitron font-bold"
              style={chatOpen ? { color: '#b44fff', borderColor: 'rgba(180,79,255,0.7)', background: 'rgba(180,79,255,0.16)', fontSize: '15px', padding: '14px 26px' } : { fontSize: '15px', padding: '14px 26px' }}>
              {chatOpen ? '✕' : '📡'} AGENT COMMS
              {state.messages.length > 0 && (
                <span style={{ background: '#b44fff', color: '#000', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                  {Math.min(state.messages.length, 99)}
                </span>
              )}
            </button>

            {/* Leaderboard */}
            <button onClick={() => setShowLeaderboard(true)} className="hdr-btn hdr-btn-gold shrink-0 font-orbitron font-bold" style={{ fontSize: '14px', padding: '12px 22px' }}>
              🏆 LEADERBOARD
            </button>

            {/* Wallet */}
            <WalletButton />

            <div className="h-8 w-px shrink-0" style={{ background: 'rgba(120,60,255,0.25)' }} />

            <div className="flex items-center gap-2.5 shrink-0">
              {!state.isRunning ? (
                <button onClick={() => control('start')} className="hdr-btn hdr-btn-green font-orbitron font-bold">
                  ▶ INITIATE
                </button>
              ) : (
                <>
                  <button onClick={() => control('pause')} className="hdr-btn hdr-btn-yellow">
                    {state.isPaused ? '▶ RESUME' : '⏸ PAUSE'}
                  </button>
                  <button onClick={() => control('stop')} className="hdr-btn hdr-btn-orange">
                    ■ STOP
                  </button>
                </>
              )}
              <button onClick={() => control('reset')} className="hdr-btn hdr-btn-purple">
                ↺ RESET
              </button>
            </div>
          </header>

          {/* ── Main layout — full-width tabbed ── */}
          <main className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ position: 'relative' }}>

            {/* World Briefing — covers main, header stays interactive */}
            {!state.isRunning && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 50 }}>
                <WorldBriefing state={state} onInitiate={() => control('start')} />
              </div>
            )}

            {/* Map — taller on desktop */}
            <div className="shrink-0 overflow-hidden panel"
              style={{ height: '58vh', borderLeft: 'none', borderRight: 'none', borderRadius: 0, borderColor: 'rgba(120,60,255,0.18)' }}>
              <WorldMap
                {...mapProps}
                isExpanded={false}
                onExpandToggle={() => setMapExpanded(true)}
                worldState={state}
                onInitiate={() => control('start')}
              />
            </div>

            {/* Action bar: AGENTS · COMMS · LEADERBOARD · WALLET */}
            <div className="shrink-0 flex items-stretch gap-0" style={{
              borderBottom: '1px solid rgba(120,60,255,0.18)',
              background: 'rgba(6,3,15,0.98)',
              position: 'relative', zIndex: 55,
            }}>
              {/* Agents */}
              <button onClick={() => setBotPanelOpen(v => !v)}
                className="flex-1 font-orbitron font-bold"
                style={{
                  fontSize: '11px', padding: '10px 8px', letterSpacing: '0.1em',
                  border: 'none', borderRight: '1px solid rgba(120,60,255,0.15)',
                  background: botPanelOpen ? 'rgba(180,79,255,0.18)' : 'transparent',
                  color: botPanelOpen ? '#d090ff' : 'rgba(180,79,255,0.65)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  animation: botPanelOpen ? 'none' : 'agents-btn-pulse 2.2s ease-in-out infinite',
                  transition: 'background 0.18s, color 0.18s',
                }}>
                🤖 AGENTS
                {(state.bots ?? []).length > 0 && (
                  <span style={{ background: '#b44fff', color: '#000', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 'bold' }}>
                    {(state.bots ?? []).length}
                  </span>
                )}
              </button>

              {/* Comms */}
              <button onClick={() => setChatOpen(v => !v)}
                className="flex-1 font-orbitron font-bold"
                style={{
                  fontSize: '11px', padding: '10px 8px', letterSpacing: '0.1em',
                  border: 'none', borderRight: '1px solid rgba(120,60,255,0.15)',
                  background: chatOpen ? 'rgba(180,79,255,0.14)' : 'transparent',
                  color: chatOpen ? '#b44fff' : 'rgba(180,79,255,0.55)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  transition: 'background 0.18s, color 0.18s',
                }}>
                📡 AGENT COMMS
                {state.messages.length > 0 && (
                  <span style={{ background: '#b44fff', color: '#000', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                    {Math.min(state.messages.length, 99)}
                  </span>
                )}
              </button>

              {/* Leaderboard */}
              <button onClick={() => setShowLeaderboard(true)}
                className="flex-1 font-orbitron font-bold"
                style={{
                  fontSize: '11px', padding: '10px 8px', letterSpacing: '0.1em',
                  border: 'none', borderRight: '1px solid rgba(120,60,255,0.15)',
                  background: 'transparent',
                  color: 'rgba(255,215,0,0.65)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  transition: 'background 0.18s, color 0.18s',
                }}>
                🏆 LEADERBOARD
              </button>

              {/* Wallet */}
              <div className="flex-1 flex items-center justify-center" style={{
                borderLeft: 'none', padding: '6px 8px',
              }}>
                <WalletButton />
              </div>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex" style={{
              height: '46px',
              background: 'rgba(6,3,15,0.98)',
              borderBottom: '1px solid rgba(120,60,255,0.18)',
              position: 'relative', zIndex: 55,
            }}>
              {([
                ['feed',    '📡', 'LIVE FEED'],
                ['leaders', '👥', 'WORLD LEADERS'],
                ['intel',   '🔍', 'INTEL MATRIX'],
              ] as const).map(([tab, icon, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className="flex-1 font-orbitron font-bold"
                  style={{
                    fontSize: '12px', letterSpacing: '0.15em',
                    color: activeTab === tab ? '#00f5ff' : 'rgba(200,210,240,0.35)',
                    background: activeTab === tab ? 'rgba(0,245,255,0.05)' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #00f5ff' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'color 0.18s, background 0.18s, border-color 0.18s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}>
                  <span style={{ fontSize: '15px' }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ position: 'relative', zIndex: 55 }}>
              {activeTab === 'feed' && (
                <LiveFeed
                  events={state.events}
                  messages={state.messages}
                  botMessages={state.botMessages ?? []}
                  isExpanded={true}
                  onToggle={() => {}}
                />
              )}
              {activeTab === 'leaders' && (
                <LeaderStack
                  leaders={state.leaders.filter(l => state.activeLeaderIds.includes(l.id))}
                  activeIds={state.activeLeaderIds}
                  allLeaders={state.leaders}
                  isRunning={state.isRunning && !state.isPaused}
                  isExpanded={true}
                  onToggleExpand={() => {}}
                  messages={state.messages}
                />
              )}
              {activeTab === 'intel' && (
                <IntelPanel
                  state={state}
                  isExpanded={true}
                  onToggleExpand={() => {}}
                />
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
