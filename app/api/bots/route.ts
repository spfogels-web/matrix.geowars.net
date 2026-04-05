// app/api/bots/route.ts — Deploy, list, and remove user bots
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getState, deployBot, removeBot } from '@/lib/engine/state';
import { UserBot, BotClass, BotAlignment, BotSpecialty, EventType } from '@/lib/engine/types';

// ── NAMED AGENT TEMPLATES ─────────────────────────────────────────────────────
// 12 high-impact real-world-style agents. Each has a distinct voice, specialty,
// and influence profile. Portrait = emoji. Description = one-line bio.
const BOT_TEMPLATES: Omit<UserBot, 'id' | 'deployedAt' | 'activeRegion' | 'memory'>[] = [
  // ── Finance / Capital ─────────────────────────────────────────────────────
  {
    templateId: 'jamie_dimon',
    name: 'Jamie Dimon',
    portrait: '🏦',
    description: 'JPMorgan CEO. Systemic risk authority. Credit market mover.',
    class: 'economic' as BotClass,
    alignment: 'usa' as BotAlignment,
    specialty: 'finance' as BotSpecialty,
    influenceScore: 16,
    tensionModifier: -1,
    eventTypeBias: { economic: 4, diplomatic: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'larry_fink',
    name: 'Larry Fink',
    portrait: '📊',
    description: 'BlackRock CEO. $10T AUM. Asset allocation as geopolitical force.',
    class: 'economic' as BotClass,
    alignment: 'usa' as BotAlignment,
    specialty: 'finance' as BotSpecialty,
    influenceScore: 18,
    tensionModifier: -2,
    eventTypeBias: { economic: 4, diplomatic: 2 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'george_soros',
    name: 'George Soros',
    portrait: '🦅',
    description: 'Macro fund legend. Bets against unstable regimes. Reflexivity theory.',
    class: 'economic' as BotClass,
    alignment: 'independent' as BotAlignment,
    specialty: 'finance' as BotSpecialty,
    influenceScore: 14,
    tensionModifier: -1,
    eventTypeBias: { economic: 3, diplomatic: 2, humanitarian: 1 } as Partial<Record<EventType, number>>,
  },
  // ── Central Banking ───────────────────────────────────────────────────────
  {
    templateId: 'jerome_powell',
    name: 'Jerome Powell',
    portrait: '🏛',
    description: 'Federal Reserve Chair. Every word moves markets globally.',
    class: 'economic' as BotClass,
    alignment: 'usa' as BotAlignment,
    specialty: 'finance' as BotSpecialty,
    influenceScore: 20,
    tensionModifier: -3,
    eventTypeBias: { economic: 5, diplomatic: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'christine_lagarde',
    name: 'Christine Lagarde',
    portrait: '🇪🇺',
    description: 'ECB President. European monetary coordination under pressure.',
    class: 'economic' as BotClass,
    alignment: 'neutral' as BotAlignment,
    specialty: 'finance' as BotSpecialty,
    influenceScore: 15,
    tensionModifier: -2,
    eventTypeBias: { economic: 4, diplomatic: 2 } as Partial<Record<EventType, number>>,
  },
  // ── Energy ────────────────────────────────────────────────────────────────
  {
    templateId: 'mbs_opec',
    name: 'MBS / OPEC+',
    portrait: '🛢',
    description: 'Saudi Crown Prince. OPEC+ architect. Oil as strategic weapon.',
    class: 'economic' as BotClass,
    alignment: 'neutral' as BotAlignment,
    specialty: 'oil' as BotSpecialty,
    influenceScore: 22,
    tensionModifier: 1,
    eventTypeBias: { economic: 3, military: 1, diplomatic: 1 } as Partial<Record<EventType, number>>,
  },
  // ── Tech / Infrastructure ─────────────────────────────────────────────────
  {
    templateId: 'elon_musk',
    name: 'Elon Musk',
    portrait: '🛸',
    description: 'Starlink owner. Controls battlefield comms. Unilateral chaotic influence.',
    class: 'advisor' as BotClass,
    alignment: 'independent' as BotAlignment,
    specialty: 'cyber' as BotSpecialty,
    influenceScore: 19,
    tensionModifier: 0,
    eventTypeBias: { cyber: 3, military: 1, economic: 2 } as Partial<Record<EventType, number>>,
  },
  // ── Intelligence / Covert ─────────────────────────────────────────────────
  {
    templateId: 'cia_director',
    name: 'CIA Director',
    portrait: '🕵',
    description: 'Intelligence Network. Covert ops authority. IC assessment chief.',
    class: 'intel' as BotClass,
    alignment: 'usa' as BotAlignment,
    specialty: 'intelligence' as BotSpecialty,
    influenceScore: 20,
    tensionModifier: 1.5,
    eventTypeBias: { intelligence: 4, military: 2, cyber: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'kremlin_operative',
    name: 'Kremlin Operative',
    portrait: '🐻',
    description: 'FSB/GRU hybrid warfare specialist. Information weapons. Disinformation.',
    class: 'intel' as BotClass,
    alignment: 'russia' as BotAlignment,
    specialty: 'intelligence' as BotSpecialty,
    influenceScore: 17,
    tensionModifier: 3.5,
    eventTypeBias: { intelligence: 3, cyber: 2, military: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'beijing_strategist',
    name: 'Beijing Strategist',
    portrait: '🐉',
    description: 'PLA Central Military Commission advisor. Long-game doctrine.',
    class: 'advisor' as BotClass,
    alignment: 'china' as BotAlignment,
    specialty: 'military' as BotSpecialty,
    influenceScore: 18,
    tensionModifier: 2,
    eventTypeBias: { military: 2, cyber: 2, diplomatic: 1 } as Partial<Record<EventType, number>>,
  },
  // ── Diplomatic ────────────────────────────────────────────────────────────
  {
    templateId: 'un_special_envoy',
    name: 'UN Special Envoy',
    portrait: '🕊',
    description: 'Crisis de-escalation specialist. International law. Perpetually underfunded.',
    class: 'diplomatic' as BotClass,
    alignment: 'neutral' as BotAlignment,
    specialty: 'diplomacy' as BotSpecialty,
    influenceScore: 10,
    tensionModifier: -4,
    eventTypeBias: { diplomatic: 3, humanitarian: 2 } as Partial<Record<EventType, number>>,
  },
  // ── Disruption ────────────────────────────────────────────────────────────
  {
    templateId: 'shadow_arms',
    name: 'Shadow Arms Network',
    portrait: '⚔',
    description: 'Stateless arms broker. Supplies all sides. Conflict is business.',
    class: 'disruption' as BotClass,
    alignment: 'independent' as BotAlignment,
    specialty: 'military' as BotSpecialty,
    influenceScore: 22,
    tensionModifier: 5,
    eventTypeBias: { military: 4, nuclear: 1, intelligence: 1 } as Partial<Record<EventType, number>>,
  },
];

function makeInitialBotMemory(templateClass: string, region: string): import('@/lib/engine/types').BotMemory {
  return {
    pastInfluence: [],
    successRate: 55,
    strategiesUsed: [templateClass],
    lastActions: [],
    totalInfluenceApplied: 0,
    shortTerm: { recentEvents: [], recentStatements: [], lastAction: null },
    midTerm: { influenceHistory: [], favoredRegions: [region], rivalAgents: [], trustedLeaders: [] },
    longTerm: { successfulInterventions: 0, failedInterventions: 0, dominantStyle: null, reputationScore: 0 },
    stance: 'neutral',
    confidence: 60,
  };
}

// GET — return templates + currently deployed bots + recent bot messages
export async function GET() {
  const state = getState();
  return NextResponse.json({
    templates: BOT_TEMPLATES,
    deployed: state.bots ?? [],
    botInfluenceLog: (state.botInfluenceLog ?? []).slice(0, 20),
    botMessages: (state.botMessages ?? []).slice(0, 30),
  });
}

// POST — deploy a bot from a template into a region
export async function POST(req: NextRequest) {
  const { templateId, region } = await req.json() as { templateId: string; region: string };
  const template = BOT_TEMPLATES.find(t => t.templateId === templateId);
  if (!template) return NextResponse.json({ ok: false, error: 'Unknown agent template' }, { status: 400 });

  const state = getState();
  const existing = (state.bots ?? []);

  if (existing.length >= 4) {
    return NextResponse.json({ ok: false, error: 'Maximum 4 agents deployed. Recall one first.' }, { status: 400 });
  }
  if (existing.some(b => b.templateId === templateId)) {
    return NextResponse.json({ ok: false, error: 'This agent is already deployed.' }, { status: 400 });
  }

  const deployRegion = region || 'Global';
  const bot: UserBot = {
    ...template,
    id: `bot_${templateId}_${Date.now()}`,
    activeRegion: deployRegion,
    deployedAt: Date.now(),
    memory: makeInitialBotMemory(template.class, deployRegion),
  };

  deployBot(bot);
  return NextResponse.json({ ok: true, bot });
}

// DELETE — remove a deployed bot by id
export async function DELETE(req: NextRequest) {
  const { botId } = await req.json() as { botId: string };
  removeBot(botId);
  return NextResponse.json({ ok: true });
}
