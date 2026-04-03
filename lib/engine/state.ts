// lib/engine/state.ts
// Singleton in-memory world state. Lives on the server.
// All API routes read/write this. SSE broadcasts changes to clients.

import { WorldState, GeoEvent, LeaderMessage, OutcomeScenario, ConflictZone } from './types';
import { LEADER_POOL, computeImportanceScores, getActiveLeaderIds } from './leaders';

// ── INITIAL STATE ─────────────────────────────────────────────────────────────
function makeInitialState(): WorldState {
  return {
    sessionId: `s_${Date.now()}`,
    globalTension: 42,
    threatLevel: 'ELEVATED',
    nuclearRisk: 18,
    leaders: LEADER_POOL.map(l => ({ ...l })),
    events: [],
    messages: [],
    cycles: [],
    activeCycleId: null,
    currentCycleNumber: 0,
    cycleStartTime: null,
    cycleDuration: 600000,
    isRunning: false,
    isPaused: false,
    activeScenario: 'global_tension',
    tick: 0,
    lastUpdated: Date.now(),
    indicators: {
      oilPrice: 82,
      goldPrice: 2340,
      sp500: 5200,
      vixFear: 18,
      shippingDisruption: 12,
      sanctionsPressure: 28,
      recessionRisk: 22,
    },
    alliances: {
      natoCohesion: 78,
      usEuroAlignment: 72,
      chinaRussiaCoord: 68,
      iranProxyNetwork: 80,
      bricsSolidarity: 55,
    },
    conflictZones: [
      { id:'z1', name:'Taiwan Strait', region:'Asia-Pacific', severity:'high', x:77, y:38, activeLeaders:['china','taiwan','usa'], description:'PLA exercises intensifying near median line' },
      { id:'z2', name:'Eastern Europe', region:'Europe', severity:'high', x:52, y:28, activeLeaders:['russia','ukraine','nato'], description:'Front line stabilizing amid active shelling' },
      { id:'z3', name:'Persian Gulf', region:'Middle East', severity:'medium', x:60, y:44, activeLeaders:['iran','usa','saudiarabia'], description:'Naval tensions elevated in Hormuz corridor' },
      { id:'z4', name:'Korean Peninsula', region:'Asia', severity:'medium', x:80, y:35, activeLeaders:['northkorea','southkorea','usa'], description:'DPRK missile activity increasing' },
      { id:'z5', name:'Gaza & Lebanon', region:'Middle East', severity:'critical', x:55, y:42, activeLeaders:['israel','iran','usa'], description:'Multi-front conflict ongoing' },
    ],
    outcomes: [
      { id:'o1', label:'Diplomatic Resolution', probability:22, trend:'down', color:'#00ff9d' },
      { id:'o2', label:'Regional Conflict', probability:38, trend:'up', color:'#ffd700' },
      { id:'o3', label:'Global Escalation', probability:28, trend:'up', color:'#ff6a00' },
      { id:'o4', label:'Economic Collapse', probability:12, trend:'stable', color:'#ff2d55' },
    ],
    activeLeaderIds: ['usa','china','russia','iran','israel'],
    breakingIntel: [
      'SIGINT: Encrypted traffic between Moscow and Tehran surged 340% in last 6 hours',
      'HUMINT: Source confirms emergency PLA naval command meeting convened',
      'TECHINT: Unusual satellite repositioning detected over contested region',
      'OSINT: Multiple state media outlets activated emergency broadcast protocols',
    ],
  };
}

// ── SHARED SINGLETON ─────────────────────────────────────────────────────────
// Next.js App Router isolates modules per route. globalThis is shared across
// all routes in the same Node.js process — use it as the true singleton.
const _g = globalThis as Record<string, unknown>;
if (!_g.__gw_state) _g.__gw_state = makeInitialState();
if (!_g.__gw_subs) _g.__gw_subs = new Set<Subscriber>();

function _s(): WorldState { return _g.__gw_state as WorldState; }
function _setS(val: WorldState) { _g.__gw_state = val; }
function _subs(): Set<Subscriber> { return _g.__gw_subs as Set<Subscriber>; }

// ── SSE SUBSCRIBER MANAGEMENT ─────────────────────────────────────────────────
type Subscriber = (state: WorldState) => void;

export function subscribe(fn: Subscriber) {
  _subs().add(fn);
  return () => _subs().delete(fn);
}

function broadcast() {
  _setS({ ..._s(), lastUpdated: Date.now() });
  _subs().forEach(fn => { try { fn(_s()); } catch {} });
}

// ── STATE ACCESSORS ───────────────────────────────────────────────────────────
export function getState(): WorldState { return _s(); }

export function setState(patch: Partial<WorldState>) {
  _setS({ ..._s(), ...patch });
  broadcast();
}

// ── TENSION CALCULATION ───────────────────────────────────────────────────────
export function recalcTension(): number {
  const s = _s();
  const avgAgg = s.leaders.reduce((t, l) => t + l.aggression, 0) / s.leaders.length;
  const recentImpact = s.events.slice(0, 5).reduce((t, e) => t + e.impact, 0) / Math.max(1, Math.min(5, s.events.length));
  const nuclearBonus = s.leaders.filter(l => l.military.nuclearAlert).length * 4;  // was 7
  const warBonus = s.leaders.filter(l => l.status === 'at_war').length * 6;        // was 10
  const raw = avgAgg * 0.35 + recentImpact * 3 + nuclearBonus + warBonus;          // was 0.45 + 5
  return Math.round(Math.min(100, Math.max(0, raw)));
}

export function getThreatLevel(tension: number): WorldState['threatLevel'] {
  if (tension >= 90) return 'DEFCON_1';
  if (tension >= 75) return 'CRITICAL';
  if (tension >= 55) return 'HIGH';
  if (tension >= 30) return 'ELEVATED';
  return 'LOW';
}

// ── APPLY EVENT ───────────────────────────────────────────────────────────────
export function applyEvent(event: GeoEvent): void {
  const ind = { ..._s().indicators };

  if (event.type === 'military' && event.region.includes('Gulf')) {
    ind.oilPrice = Math.min(400, ind.oilPrice + event.impact * 9);
    ind.shippingDisruption = Math.min(100, ind.shippingDisruption + event.impact * 3);
  }
  if (event.type === 'economic') {
    ind.sp500 = Math.max(1000, ind.sp500 - event.impact * 45);
    ind.vixFear = Math.min(80, ind.vixFear + event.impact * 2.5);
    ind.recessionRisk = Math.min(100, ind.recessionRisk + event.impact * 2);
  }
  if (event.impact >= 8) {
    ind.goldPrice = Math.min(5000, ind.goldPrice + event.impact * 28);
    ind.vixFear = Math.min(80, ind.vixFear + event.impact);
  }
  if (event.type === 'cyber') {
    ind.sanctionsPressure = Math.min(100, ind.sanctionsPressure + event.impact * 2);
  }

  const events = [{ ...event, isNew: true }, ..._s().events].slice(0, 120);

  // Add breaking intel
  const intel = [
    `${event.type.toUpperCase()} ALERT: ${event.title} — ${event.region}`,
    ..._s().breakingIntel,
  ].slice(0, 8);

  // Update conflict zones severity
  const conflictZones = _s().conflictZones.map(z => {
    if (event.region.toLowerCase().includes(z.region.toLowerCase()) && event.impact >= 7) {
      const sev = event.impact >= 9 ? 'critical' : event.impact >= 7 ? 'high' : z.severity;
      return { ...z, severity: sev as ConflictZone['severity'] };
    }
    return z;
  });

  _setS({ ..._s(), events, indicators: ind, breakingIntel: intel, conflictZones });
}

// ── APPLY AGENT RESPONSES ─────────────────────────────────────────────────────
export function applyResponses(
  responses: { leaderId: string; statement: string; action: string; escalation: number; to: string; tone: string }[],
  triggerEvent: GeoEvent
): LeaderMessage[] {
  let state = _s();
  const newMessages: LeaderMessage[] = [];

  for (const r of responses) {
    const leaderIdx = state.leaders.findIndex(l => l.id === r.leaderId);
    if (leaderIdx === -1) continue;
    const leader = state.leaders[leaderIdx];

    const aggrDelta = (r.escalation - 5) * 2;  // was *4 — slowed escalation
    const newAgg = Math.min(100, Math.max(0, leader.aggression + aggrDelta));

    let status = leader.status;
    if (newAgg >= 88) status = 'at_war';
    else if (newAgg >= 74) status = 'critical';
    else if (newAgg >= 58) status = 'hostile';
    else if (newAgg >= 40) status = 'alert';
    else if (newAgg >= 22) status = 'stable';
    else status = 'diplomatic';

    const updatedLeaders = [...state.leaders];
    updatedLeaders[leaderIdx] = {
      ...leader,
      aggression: Math.round(newAgg),
      status,
      lastStatement: r.statement,
      lastAction: r.action,
      lastActiveAt: Date.now(),
      totalMessages: leader.totalMessages + 1,
    };
    state = { ...state, leaders: updatedLeaders };

    newMessages.push({
      id: `msg_${Date.now()}_${r.leaderId}`,
      leaderId: r.leaderId,
      leaderName: leader.name,
      leaderFlag: leader.flag,
      leaderColor: leader.color,
      toAgent: r.to || 'ALL',
      content: r.statement,
      action: r.action,
      escalation: r.escalation,
      tone: r.tone as any,
      timestamp: Date.now() + newMessages.length * 200,
      cycleId: state.activeCycleId || 'tick',
      inResponseTo: triggerEvent.id,
      importanceScore: state.leaders[leaderIdx]?.importanceScore,
    });
  }

  // Recompute importance scores
  const activeRegions = [triggerEvent.region, ...state.conflictZones.map(z => z.region)];
  const reranked = computeImportanceScores(state.leaders, activeRegions, [], state.globalTension);
  const activeLeaderIds = getActiveLeaderIds(reranked, 5);

  // Update outcomes
  const tension = recalcTension();
  const outcomes = updateOutcomes(state.outcomes, tension, triggerEvent);

  const allMessages = [...newMessages, ...state.messages].slice(0, 300);

  _setS({
    ...state,
    leaders: reranked,
    activeLeaderIds,
    messages: allMessages,
    globalTension: tension,
    threatLevel: getThreatLevel(tension),
    tick: state.tick + 1,
    outcomes,
    lastUpdated: Date.now(),
  });

  broadcast();
  return newMessages;
}

// ── OUTCOME PROBABILITY ENGINE ────────────────────────────────────────────────
function updateOutcomes(current: OutcomeScenario[], tension: number, event: GeoEvent): OutcomeScenario[] {
  const base = current.reduce((acc, o) => { acc[o.id] = o.probability; return acc; }, {} as Record<string, number>);

  const militaryBoost = event.type === 'military' ? event.impact * 0.8 : 0;
  const econBoost = event.type === 'economic' ? event.impact * 0.6 : 0;

  let diplomatic = Math.max(5, base.o1 - militaryBoost * 1.2 - econBoost * 0.4);
  let regional   = Math.min(60, base.o2 + militaryBoost * 0.8 + econBoost * 0.3);
  let global     = Math.min(55, base.o3 + (tension > 65 ? militaryBoost * 1.1 : 0) + (tension > 75 ? 5 : 0));
  let econ       = Math.min(40, base.o4 + econBoost * 1.4);

  // Normalize to 100
  const total = diplomatic + regional + global + econ;
  const scale = 100 / total;
  diplomatic = Math.round(diplomatic * scale);
  regional   = Math.round(regional * scale);
  global     = Math.round(global * scale);
  econ       = 100 - diplomatic - regional - global;

  return [
    { id:'o1', label:'Diplomatic Resolution', probability: diplomatic, trend: diplomatic < base.o1 ? 'down' : diplomatic > base.o1 ? 'up' : 'stable', color:'#00ff9d' },
    { id:'o2', label:'Regional Conflict',     probability: regional,   trend: regional > base.o2 ? 'up' : regional < base.o2 ? 'down' : 'stable',   color:'#ffd700' },
    { id:'o3', label:'Global Escalation',     probability: global,     trend: global > base.o3 ? 'up' : global < base.o3 ? 'down' : 'stable',       color:'#ff6a00' },
    { id:'o4', label:'Economic Collapse',     probability: econ,       trend: econ > base.o4 ? 'up' : econ < base.o4 ? 'down' : 'stable',           color:'#ff2d55' },
  ];
}

// ── CYCLE MANAGEMENT ──────────────────────────────────────────────────────────
export function startCycle(): string {
  const num = _s().currentCycleNumber + 1;
  const id = `cycle_${num}_${Date.now()}`;
  _setS({
    ..._s(),
    activeCycleId: id,
    currentCycleNumber: num,
    cycleStartTime: Date.now(),
    cycles: [{ id, number: num, startTime: Date.now(), tensionDelta: 0 }, ..._s().cycles].slice(0, 50),
  });
  broadcast();
  return id;
}

// ── CONTROL ───────────────────────────────────────────────────────────────────
export function startSim(scenarioId?: string, ctx?: {
  summary: string; dominantTheme: string; scenarioId: string;
  headlines: string[]; fetchedAt: number;
  initialTension?: number; hotLeaders?: string[];
}) {
  const scenario = scenarioId || ctx?.scenarioId || _s().activeScenario;
  const tension = ctx?.initialTension ?? _s().globalTension;
  const activeLeaderIds = ctx?.hotLeaders ?? _s().activeLeaderIds;
  const intel = ctx?.headlines.slice(0, 6).map(h => `LIVE INTEL: ${h}`) ?? _s().breakingIntel;
  _setS({
    ..._s(),
    isRunning: true,
    isPaused: false,
    activeScenario: scenario,
    globalTension: tension,
    threatLevel: getThreatLevel(tension),
    activeLeaderIds,
    breakingIntel: intel.length ? intel : _s().breakingIntel,
    realWorldContext: ctx ? { summary: ctx.summary, dominantTheme: ctx.dominantTheme, scenarioId: ctx.scenarioId, headlines: ctx.headlines, fetchedAt: ctx.fetchedAt } : null,
  });
  startCycle();
}

export function pauseSim() {
  _setS({ ..._s(), isPaused: !_s().isPaused });
  broadcast();
}

export function stopSim() {
  _setS({ ..._s(), isRunning: false, isPaused: false });
  broadcast();
}

export function resetSim() {
  _setS(makeInitialState());
  broadcast();
}

export function setScenario(id: string) {
  _setS({ ..._s(), activeScenario: id });
  broadcast();
}
