// lib/engine/types.ts
export type EventType = 'military' | 'economic' | 'cyber' | 'diplomatic' | 'intelligence' | 'nuclear' | 'humanitarian';
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
  realWorldContext?: {
    summary: string;
    dominantTheme: string;
    scenarioId: string;
    headlines: string[];
    fetchedAt: number;
  } | null;
}
