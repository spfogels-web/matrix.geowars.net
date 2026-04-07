// lib/engine/types.ts
export type EventType = 'military' | 'economic' | 'cyber' | 'diplomatic' | 'intelligence' | 'nuclear' | 'humanitarian';
export type BotClass = 'advisor' | 'economic' | 'intel' | 'disruption' | 'diplomatic';
export type BotAlignment = 'usa' | 'china' | 'russia' | 'neutral' | 'independent';
export type BotSpecialty = 'oil' | 'cyber' | 'military' | 'finance' | 'diplomacy' | 'intelligence';
export type AgentStatus = 'stable' | 'alert' | 'hostile' | 'critical' | 'diplomatic' | 'mobilizing' | 'at_war';
export type ThreatLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | 'DEFCON_1';
export type Tone = 'aggressive' | 'defensive' | 'diplomatic' | 'threatening' | 'neutral' | 'defiant';

export interface GeoEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  impact: number;       // 1-10
  region: string;
  affectedLeaders: string[];
  timestamp: number;
  cycleId: string;
  isNew?: boolean;
  // Optional geographic fields — used by map layers and Phase 2 cinematic view
  lat?: number;         // target latitude
  lng?: number;         // target longitude
  originLat?: number;
  originLng?: number;
  radiusKm?: number;    // effect radius in km (blackout, EMP)
  cinematic?: boolean;  // true = eligible for Google Maps cinematic view
  cityName?: string;    // human-readable target city
  countryName?: string;
}

export interface LeaderMessage {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderFlag: string;
  leaderColor: string;
  toAgent: string;      // leader name or 'ALL'
  content: string;
  action: string;
  escalation: number;   // 1-10
  tone: Tone;
  timestamp: number;
  cycleId: string;
  inResponseTo?: string;
  importanceScore?: number;
}

export interface LeaderEconomy {
  gdpGrowth: number;
  inflationRate: number;
  oilDependency: number;
  sanctionsImpact: number;
  stockIndex: number;
}

export interface LeaderMilitary {
  readiness: number;
  nuclearCapable: boolean;
  nuclearAlert: boolean;
  deployedRegions: string[];
  alliances: string[];
}

// ── LEADER MEMORY ─────────────────────────────────────────────────────────────
export interface LeaderMemory {
  pastStatements: string[];          // last 5 statements
  pastActions: string[];             // last 5 actions
  aggressionDelta: number;           // rolling avg delta: positive = escalating
  trustLevels: Record<string, number>; // leaderId → -100 to +100
  lastSpokeAt: number;
  totalEscalation: number;           // cumulative escalation score
  stance: 'escalating' | 'stable' | 'de-escalating';
}

export interface Leader {
  id: string;
  name: string;
  role?: string;  // e.g. "President", "Prime Minister", "Supreme Leader"
  country: string;
  flag: string;
  color: string;
  accentColor: string;
  status: AgentStatus;
  aggression: number;   // 0-100
  lastStatement: string;
  lastAction: string;
  economy: LeaderEconomy;
  military: LeaderMilitary;
  personality: string;
  goals: string[];
  redLines: string[];
  importanceScore: number;  // computed at runtime
  isVisible: boolean;       // in the active stack
  lastActiveAt: number;
  totalMessages: number;
  memory?: LeaderMemory;    // persistent memory across ticks
}

export interface ConflictZone {
  id: string;
  name: string;
  region: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  x: number; // percent of map width
  y: number; // percent of map height
  activeLeaders: string[];
  description: string;
}

export interface OutcomeScenario {
  id: string;
  label: string;
  probability: number;  // 0-100
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface GlobalIndicators {
  oilPrice: number;
  goldPrice: number;
  sp500: number;
  vixFear: number;
  shippingDisruption: number; // 0-100
  sanctionsPressure: number;  // 0-100
  recessionRisk: number;      // 0-100
}

export interface AllianceMetrics {
  natoCohesion: number;       // 0-100
  usEuroAlignment: number;
  chinaRussiaCoord: number;
  iranProxyNetwork: number;
  bricsSolidarity: number;
}

export interface SimulationCycle {
  id: string;
  number: number;
  startTime: number;
  tensionDelta: number;
}

// ── USER BOTS ─────────────────────────────────────────────────────────────────
export interface BotMemory {
  // ── Legacy flat fields (kept for compat) ──────────────────────────────────
  pastInfluence: string[];
  successRate: number;
  strategiesUsed: string[];
  lastActions: string[];
  totalInfluenceApplied: number;
  // ── Short-term: what just happened ────────────────────────────────────────
  shortTerm?: {
    recentEvents: string[];       // last 5 event titles this bot reacted to
    recentStatements: string[];   // last 3 things this bot said
    lastAction: string | null;
  };
  // ── Mid-term: strategic patterns ──────────────────────────────────────────
  midTerm?: {
    influenceHistory: string[];   // last 10 influence ops
    favoredRegions: string[];
    rivalAgents: string[];        // templateIds of competing bots
    trustedLeaders: string[];     // leader ids with positive relationship
  };
  // ── Long-term: career statistics ──────────────────────────────────────────
  longTerm?: {
    successfulInterventions: number;
    failedInterventions: number;
    dominantStyle: string | null;   // most used strategy class
    reputationScore: number;        // -100 to +100
  };
  // ── Behavioral state ──────────────────────────────────────────────────────
  stance?: 'aggressive' | 'neutral' | 'stabilizing' | 'opportunistic';
  confidence?: number;   // 0-100
}

export interface UserBot {
  id: string;
  templateId: string;
  name: string;
  portrait: string;        // emoji portrait
  description: string;     // one-line bio
  class: BotClass;
  alignment: BotAlignment;
  specialty: BotSpecialty;
  influenceScore: number;
  memory: BotMemory;
  activeRegion: string;
  deployedAt: number;
  tensionModifier: number;
  eventTypeBias: Partial<Record<EventType, number>>;
}

export interface BotInfluenceEntry {
  id: string;
  botId: string;
  botName: string;
  botClass: BotClass;
  effect: string;
  delta: string;
  timestamp: number;
  region: string;
}

export interface BotMessage {
  id: string;
  botId: string;
  botName: string;
  botClass: BotClass;
  botAlignment: BotAlignment;
  botPortrait: string;
  content: string;
  action: string;
  timestamp: number;
  cycleId: string;
  triggerEventId: string;
  confidence: number;   // 1-10
}

// ── HISTORY LOG ──────────────────────────────────────────────────────────────
export interface HistoryEntry {
  id: string;
  title: string;
  type: EventType;
  impact: number;
  region: string;
  timestamp: number;
  cycleNumber: number;
  tensionAtTime: number;
}

// Narrative arc phase — drives the 20-minute structured storyline
export type NarrativePhase =
  | 'prologue'       // 0-5 min  — rising tension, first signs of conflict
  | 'act1'           // 5 min    — Prediction 1 confirmed: Regional Conflict erupts
  | 'act2'           // 10 min   — Prediction 2 confirmed: Global Escalation threshold crossed
  | 'finale_war'     // 20 min   — World ending: nuclear exchange, civilization collapse
  | 'finale_peace';  // 20 min   — Resolution: emergency ceasefire, leaders pull back

export interface WorldState {
  sessionId: string;
  globalTension: number;
  threatLevel: ThreatLevel;
  nuclearRisk: number;
  leaders: Leader[];
  events: GeoEvent[];
  messages: LeaderMessage[];
  cycles: SimulationCycle[];
  activeCycleId: string | null;
  currentCycleNumber: number;
  cycleStartTime: number | null;
  cycleDuration: number;
  isRunning: boolean;
  isPaused: boolean;
  activeScenario: string;
  tick: number;
  lastUpdated: number;
  indicators: GlobalIndicators;
  alliances: AllianceMetrics;
  conflictZones: ConflictZone[];
  outcomes: OutcomeScenario[];
  activeLeaderIds: string[];  // currently shown in stack
  breakingIntel: string[];
  // Persistent memory systems
  historyLog?: HistoryEntry[];           // last 20 major events
  bots?: UserBot[];                      // user-deployed bots
  botInfluenceLog?: BotInfluenceEntry[]; // recent bot indicator effects
  botMessages?: BotMessage[];            // bot AI statements in live feed
  economicStress?: number;               // 0-100 cumulative economic pressure
  cumulativeDeaths?: number;             // total simulation casualties
  realWorldContext?: {
    summary: string;
    dominantTheme: string;
    scenarioId: string;
    headlines: string[];
    fetchedAt: number;
  } | null;
  // Narrative arc
  simStartTime?: number;
  narrativePhase?: NarrativePhase;
  // Dynamic prediction questions — generated fresh each simulation
  predictionQuestions?: string[];
}
