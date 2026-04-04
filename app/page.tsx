'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
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

const SCENARIOS = [
  { id: 'global_tension',    label: 'Global Tension' },
  { id: 'taiwan_crisis',     label: 'Taiwan Crisis' },
  { id: 'hormuz_blockade',   label: 'Hormuz Blockade' },
  { id: 'nato_conflict',     label: 'NATO Conflict' },
  { id: 'nuclear_standoff',  label: 'Nuclear Standoff' },
  { id: 'economic_collapse', label: 'Economic Collapse' },
  { id: 'middle_east_war',   label: 'Middle East War' },
];

async function runTick(pendingRef: React.MutableRefObject<boolean>, setProcessing: (v: boolean) => void) {
  if (pendingRef.current) return;
  pendingRef.current = true;
  setProcessing(true);
  try { await fetch('/api/tick', { method: 'POST' }); }
  finally { pendingRef.current = false; setProcessing(false); }
}

export default function Home() {
  const { setShowLeaderboard, resetSimPredictions } = useGame();
  const [state, setState]           = useState<WorldState | null>(null);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [mapExpanded, setMapExpanded]   = useState(false);
  const [leftExpanded, setLeftExpanded] = useState(false);
  const [chatOpen, setChatOpen]         = useState(false);
  const [intelExpanded, setIntelExpanded] = useState(false);
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

      {/* ── World Briefing — full-screen overlay before sim starts ── */}
      {!state.isRunning && (
        <WorldBriefing state={state} onInitiate={() => control('start')} />
      )}

      {/* ── Leaderboard modal ── */}
      <Leaderboard />

      {/* ── Agent comms chat panel ── */}
      <LeaderChat
        messages={state.messages}
        leaders={state.leaders}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

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
          {/* Elapsed timer */}
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

        {/* Chat toggle */}
        <button onClick={() => setChatOpen(v => !v)}
          className={`hdr-btn hdr-btn-purple shrink-0 font-orbitron font-bold`}
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

        <select
          value={state.activeScenario}
          onChange={e => control('scenario', e.target.value)}
          disabled={state.isRunning}
          className="font-mono rounded border px-2 py-2 shrink-0"
          style={{
            background: 'rgba(8,3,20,0.9)', color: 'rgba(180,79,255,0.85)',
            borderColor: 'rgba(120,60,255,0.3)', fontSize: '12px',
            cursor: state.isRunning ? 'not-allowed' : 'pointer',
            opacity: state.isRunning ? 0.5 : 1,
          }}>
          {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

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

      {/* ── Main layout ── */}
      <main className="flex-1 flex gap-2 p-2 overflow-hidden min-h-0">

        {/* Left: Leader Stack */}
\        <div className="shrink-0 overflow-hidden transition-all duration-300" style={{ width: leftExpanded ? '500px' : '310px' }}>
          <LeaderStack
            leaders={state.leaders.filter(l => state.activeLeaderIds.includes(l.id))}
            activeIds={state.activeLeaderIds}
            allLeaders={state.leaders}
            isRunning={state.isRunning && !state.isPaused}
            isExpanded={leftExpanded}
            onToggleExpand={() => setLeftExpanded(v => !v)}
            messages={state.messages}
          />
        </div>

        {/* Center: World Map + Live Feed */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden min-w-0">
          <div className="rounded-xl overflow-hidden panel"
            style={{ flex: feedExpanded ? '1 1 35%' : '1 1 62%', minHeight: 0, borderColor: 'rgba(120,60,255,0.18)' }}>
            <WorldMap
              {...mapProps}
              isExpanded={false}
              onExpandToggle={() => setMapExpanded(true)}
              worldState={state}
              onInitiate={() => control('start')}
            />
          </div>
          <div className="overflow-hidden" style={{ flex: feedExpanded ? '1 1 65%' : '1 1 38%', minHeight: 0 }}>
            <LiveFeed
              events={state.events}
              messages={state.messages}
              isExpanded={feedExpanded}
              onToggle={() => setFeedExpanded(v => !v)}
            />
          </div>
        </div>

        {/* Right: Intel Panel */}
        <div className="shrink-0 overflow-hidden transition-all duration-300" style={{ width: intelExpanded ? '520px' : '360px' }}>
          <IntelPanel state={state} isExpanded={intelExpanded} onToggleExpand={() => setIntelExpanded(v => !v)} />
        </div>
      </main>
    </div>
  );
}
