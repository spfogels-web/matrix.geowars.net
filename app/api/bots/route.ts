// app/api/bots/route.ts — Deploy, list, and remove user bots
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getState, deployBot, removeBot } from '@/lib/engine/state';
import { UserBot, BotClass, BotAlignment, BotSpecialty, EventType } from '@/lib/engine/types';

// ── BOT TEMPLATES ─────────────────────────────────────────────────────────────
// Pre-defined bot archetypes users can deploy. Each has fixed class/specialty
// and sensible defaults for tension modifier and event type biases.
const BOT_TEMPLATES: Omit<UserBot, 'id' | 'deployedAt' | 'activeRegion' | 'memory'>[] = [
  {
    templateId: 'cia_advisor',
    name: 'CIA Field Advisor',
    class: 'intel' as BotClass,
    alignment: 'usa' as BotAlignment,
    specialty: 'intelligence' as BotSpecialty,
    influenceScore: 12,
    tensionModifier: 1.5,
    eventTypeBias: { intelligence: 3, military: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'oil_broker',
    name: 'OPEC Oil Broker',
    class: 'economic' as BotClass,
    alignment: 'neutral' as BotAlignment,
    specialty: 'oil' as BotSpecialty,
    influenceScore: 15,
    tensionModifier: 0,
    eventTypeBias: { economic: 3, humanitarian: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'cyber_unit',
    name: 'Cyber Operations Unit',
    class: 'disruption' as BotClass,
    alignment: 'independent' as BotAlignment,
    specialty: 'cyber' as BotSpecialty,
    influenceScore: 18,
    tensionModifier: 3,
    eventTypeBias: { cyber: 4, intelligence: 2 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'un_mediator',
    name: 'UN Special Envoy',
    class: 'diplomatic' as BotClass,
    alignment: 'neutral' as BotAlignment,
    specialty: 'diplomacy' as BotSpecialty,
    influenceScore: 10,
    tensionModifier: -4,
    eventTypeBias: { diplomatic: 3, humanitarian: 2 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'wall_st_trader',
    name: 'Wall Street Algo Trader',
    class: 'economic' as BotClass,
    alignment: 'usa' as BotAlignment,
    specialty: 'finance' as BotSpecialty,
    influenceScore: 14,
    tensionModifier: -1,
    eventTypeBias: { economic: 4, diplomatic: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'arms_dealer',
    name: 'Black Market Arms Dealer',
    class: 'disruption' as BotClass,
    alignment: 'independent' as BotAlignment,
    specialty: 'military' as BotSpecialty,
    influenceScore: 20,
    tensionModifier: 5,
    eventTypeBias: { military: 4, nuclear: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'beijing_strategist',
    name: 'Beijing Grand Strategist',
    class: 'advisor' as BotClass,
    alignment: 'china' as BotAlignment,
    specialty: 'military' as BotSpecialty,
    influenceScore: 16,
    tensionModifier: 2,
    eventTypeBias: { military: 2, cyber: 2, diplomatic: 1 } as Partial<Record<EventType, number>>,
  },
  {
    templateId: 'kremlin_operative',
    name: 'Kremlin Operative',
    class: 'intel' as BotClass,
    alignment: 'russia' as BotAlignment,
    specialty: 'intelligence' as BotSpecialty,
    influenceScore: 17,
    tensionModifier: 3.5,
    eventTypeBias: { intelligence: 3, cyber: 2, military: 1 } as Partial<Record<EventType, number>>,
  },
];

// GET — return templates + currently deployed bots
export async function GET() {
  const state = getState();
  return NextResponse.json({
    templates: BOT_TEMPLATES,
    deployed: state.bots ?? [],
    botInfluenceLog: (state.botInfluenceLog ?? []).slice(0, 15),
  });
}

// POST — deploy a bot from a template into a region
export async function POST(req: NextRequest) {
  const { templateId, region } = await req.json() as { templateId: string; region: string };
  const template = BOT_TEMPLATES.find(t => t.templateId === templateId);
  if (!template) return NextResponse.json({ ok: false, error: 'Unknown template' }, { status: 400 });

  const state = getState();
  const existing = (state.bots ?? []);

  // Max 4 bots deployed at once
  if (existing.length >= 4) {
    return NextResponse.json({ ok: false, error: 'Maximum 4 bots deployed. Remove one first.' }, { status: 400 });
  }
  // No duplicate templates
  if (existing.some(b => b.templateId === templateId)) {
    return NextResponse.json({ ok: false, error: 'This bot is already deployed.' }, { status: 400 });
  }

  const bot: UserBot = {
    ...template,
    id: `bot_${templateId}_${Date.now()}`,
    activeRegion: region || 'Global',
    deployedAt: Date.now(),
    memory: {
      pastInfluence: [],
      successRate: 50,
      strategiesUsed: [template.class],
      lastActions: [],
      totalInfluenceApplied: 0,
    },
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
