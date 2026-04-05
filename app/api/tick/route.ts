// app/api/tick/route.ts — Auto-generate an event and simulate selected leaders
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getState, applyEvent, applyResponses, addBotMessage, updateBotMemory } from '@/lib/engine/state';
import { SYSTEM_PROMPTS, BOT_SYSTEM_PROMPTS, buildUserPrompt, buildBotPrompt } from '@/lib/agents/prompts';
import { getScenarioEvent, getRandomEvent, getRandomEventByType } from '@/lib/engine/events';
import { getNewsContext } from '@/lib/engine/newsContext';
import { GeoEvent, EventType, UserBot, BotMessage } from '@/lib/engine/types';

// ── COOLDOWN / ROTATION TRACKING ─────────────────────────────────────────────
// Persisted in globalThis so it survives across requests in the same process.
const _g = globalThis as Record<string, unknown>;
if (!_g.__gw_lastSpoke)    _g.__gw_lastSpoke    = {} as Record<string, number>;
if (!_g.__gw_recentQueue)  _g.__gw_recentQueue  = [] as string[];

const lastSpoke    = () => _g.__gw_lastSpoke    as Record<string, number>;
const recentQueue  = () => _g.__gw_recentQueue  as string[];

// Alliance blocs — used to ensure rotation across opposing sides
const BLOCS: Record<string, string> = {
  usa: 'west',  uk: 'west',  france: 'west', germany: 'west',
  nato: 'west', israel: 'west', japan: 'west', southkorea: 'west', taiwan: 'west',
  russia: 'east',  china: 'east',  northkorea: 'east',
  iran: 'axis', pakistan: 'axis', india: 'neutral',
  ukraine: 'west', saudiarabia: 'neutral', turkey: 'neutral',
};

const COOLDOWN_MS   = 90_000;   // 90s hard cooldown — cannot speak again within this window
const RECENT_WINDOW = 4;        // soft penalty: appeared in last N speaker slots
const SPEAKERS_PER_TICK = 3;    // how many leaders speak per tick (max)

/**
 * Weighted random selection of leaders for this tick.
 * Priority: event-affected first, then importance score,
 * penalised by cooldown recency, never picks back-to-back same leader,
 * rotates blocs so opposing sides respond to each other.
 */
function selectSpeakers(
  candidateIds: string[],
  eventAffected: string[],
  count: number,
): string[] {
  const now = Date.now();
  const spoke = lastSpoke();
  const queue = recentQueue();
  const lastSpeaker = queue[queue.length - 1] ?? null;

  // Build weight for each candidate
  const weighted: Array<{ id: string; weight: number }> = candidateIds.map(id => {
    // Hard cooldown: skip entirely
    const msSinceSpoke = now - (spoke[id] ?? 0);
    if (msSinceSpoke < COOLDOWN_MS) return { id, weight: 0 };
    // Never repeat the immediate last speaker
    if (id === lastSpeaker) return { id, weight: 0 };

    let w = 1.0;

    // Boost event-affected leaders (they have a reason to speak)
    if (eventAffected.includes(id)) w *= 2.5;

    // Recency penalty: appeared in recent queue → reduce weight
    const recentPos = queue.lastIndexOf(id);
    if (recentPos !== -1) {
      const stepsAgo = queue.length - 1 - recentPos;
      w *= 0.2 + (stepsAgo / RECENT_WINDOW) * 0.8;  // 0.2 → 1.0 as stepsAgo grows
    }

    // Bloc rotation bonus: prefer a bloc that hasn't spoken recently
    const myBloc = BLOCS[id] ?? 'neutral';
    const recentBlocs = queue.slice(-3).map(rid => BLOCS[rid] ?? 'neutral');
    const blocCount = recentBlocs.filter(b => b === myBloc).length;
    if (blocCount === 0) w *= 1.6;       // bloc hasn't spoken recently — boost
    else if (blocCount >= 2) w *= 0.4;   // overrepresented — suppress

    // Small random jitter so identical weights don't always pick the same order
    w *= 0.7 + Math.random() * 0.6;

    return { id, weight: Math.max(0, w) };
  });

  // Weighted random sample without replacement
  const selected: string[] = [];
  const pool = weighted.filter(x => x.weight > 0);

  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    if (total === 0) break;
    let r = Math.random() * total;
    for (let j = 0; j < pool.length; j++) {
      r -= pool[j].weight;
      if (r <= 0) {
        selected.push(pool[j].id);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

function recordSpeakers(ids: string[]) {
  const spoke = lastSpoke();
  const now = Date.now();
  ids.forEach(id => { spoke[id] = now; });

  const q = recentQueue();
  q.push(...ids);
  // Keep queue bounded to last RECENT_WINDOW * 2 entries
  while (q.length > RECENT_WINDOW * 4) q.shift();
}

// ── QUERY A SINGLE BOT AGENT ─────────────────────────────────────────────────
// Bots respond ~40% of ticks when the event type matches their specialty/bias.
// Each bot uses its own named system prompt and full world-state context.
async function queryBot(bot: UserBot, event: GeoEvent): Promise<BotMessage | null> {
  const state = getState();
  const sys = BOT_SYSTEM_PROMPTS[bot.templateId] || BOT_SYSTEM_PROMPTS.un_special_envoy;
  const user = buildBotPrompt(bot, event, state);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 280, temperature: 0.92,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    });
    const raw = res.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());

    const statement: string = parsed.statement || 'Assessing the situation.';
    const action: string = parsed.action || 'Monitoring developments.';
    const confidence: number = Math.min(10, Math.max(1, Number(parsed.confidence) || 6));

    // Update bot memory: record event, statement, mark success based on confidence
    const success = confidence >= 6;
    updateBotMemory(bot.id, action, success, event.title, statement, event.region);

    const msg: BotMessage = {
      id: `botmsg_${bot.id}_${Date.now()}`,
      botId: bot.id,
      botName: bot.name,
      botClass: bot.class,
      botAlignment: bot.alignment,
      botPortrait: bot.portrait,
      content: statement,
      action,
      timestamp: Date.now(),
      cycleId: state.activeCycleId || 'tick',
      triggerEventId: event.id,
      confidence,
    };
    addBotMessage(msg);
    return msg;
  } catch {
    return null;
  }
}

// Decide which deployed bots respond to this event (specialty match + 40% chance)
function selectRespondingBots(bots: UserBot[], event: GeoEvent): UserBot[] {
  return bots.filter(bot => {
    // Always respond if event type is in their bias
    const biasTypes = Object.keys(bot.eventTypeBias ?? {}) as EventType[];
    if (biasTypes.includes(event.type)) return Math.random() < 0.65;
    // Otherwise 25% baseline chance
    return Math.random() < 0.25;
  });
}

// ── QUERY A SINGLE LEADER ─────────────────────────────────────────────────────
async function queryLeader(leaderId: string, event: GeoEvent) {
  const state = getState();
  const leader = state.leaders.find(l => l.id === leaderId);
  if (!leader) return null;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const sys = SYSTEM_PROMPTS[leaderId] || SYSTEM_PROMPTS.un;
  const user = buildUserPrompt(leader, event, state);

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini', max_tokens: 350, temperature: 0.9,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    });
    const raw = res.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
    return {
      leaderId,
      statement: parsed.statement || 'Situation under assessment.',
      action: parsed.action || 'Internal deliberations ongoing.',
      escalation: Math.min(10, Math.max(1, Number(parsed.escalation) || 5)),
      to: parsed.to || 'ALL',
      tone: parsed.tone || 'neutral',
    };
  } catch {
    return { leaderId, statement: 'Monitoring situation.', action: 'Assessment ongoing.', escalation: 4, to: 'ALL', tone: 'neutral' };
  }
}

// ── TICK HANDLER ──────────────────────────────────────────────────────────────
export async function POST() {
  const state = getState();
  if (!state.isRunning || state.isPaused) {
    return NextResponse.json({ ok: false, reason: 'not running' });
  }

  const cycleId = state.activeCycleId || 'tick';

  // On tick 1, use the real-world seed event from news analysis if available
  const newsCtx = getNewsContext();
  const useSeed = state.tick === 0 && newsCtx?.seedEvent;

  // Determine bot-biased event type (pick highest-weighted bias from deployed bots)
  const bots = state.bots ?? [];
  let botBiasedType: EventType | null = null;
  if (bots.length > 0 && !useSeed) {
    const merged: Partial<Record<EventType, number>> = {};
    for (const bot of bots) {
      for (const [etype, weight] of Object.entries(bot.eventTypeBias ?? {})) {
        merged[etype as EventType] = (merged[etype as EventType] ?? 0) + (weight ?? 0);
      }
    }
    const entries = Object.entries(merged).filter(([, w]) => w > 0) as [EventType, number][];
    if (entries.length > 0) {
      // Weighted random pick among bot-biased types
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [etype, w] of entries) {
        r -= w;
        if (r <= 0) { botBiasedType = etype; break; }
      }
    }
  }

  const event: GeoEvent = useSeed
    ? { ...newsCtx!.seedEvent!, id: `evt_seed_${Date.now()}`, timestamp: Date.now(), cycleId, isNew: true }
    : botBiasedType && Math.random() < 0.45
      ? getRandomEventByType(botBiasedType, cycleId)
      : Math.random() < 0.6
        ? getScenarioEvent(state.activeScenario, Math.floor(state.currentCycleNumber / 2), cycleId)
        : getRandomEvent(cycleId);

  applyEvent(event);

  // All valid candidates: active leaders + anyone the event specifically affects
  const candidates = Array.from(new Set([...state.activeLeaderIds, ...event.affectedLeaders]));

  // Bot-aligned leaders get a presence boost (add them to candidates if not already)
  const botAlignedLeaders = (state.bots ?? [])
    .map(b => b.alignment)
    .filter(a => a !== 'neutral' && a !== 'independent');
  for (const aligned of botAlignedLeaders) {
    if (!candidates.includes(aligned)) candidates.push(aligned);
  }

  // Select a balanced subset using weighted cooldown-aware rotation
  const toQuery = selectSpeakers(candidates, event.affectedLeaders, SPEAKERS_PER_TICK);

  // Fallback: if cooldowns blocked everyone, pick 1-2 least-recently-spoke
  if (toQuery.length === 0) {
    const spoke = lastSpoke();
    const fallback = [...candidates]
      .sort((a, b) => (spoke[a] ?? 0) - (spoke[b] ?? 0))
      .slice(0, 2);
    toQuery.push(...fallback);
  }

  // Query leaders and bots in parallel
  const respondingBots = selectRespondingBots(bots, event);
  const [leaderResults, botResults] = await Promise.all([
    Promise.all(toQuery.map(id => queryLeader(id, event))),
    Promise.all(respondingBots.map(bot => queryBot(bot, event))),
  ]);

  const responses = leaderResults.filter(Boolean) as NonNullable<typeof leaderResults[0]>[];
  const botResponses = botResults.filter(Boolean);

  recordSpeakers(toQuery);

  const messages = applyResponses(responses, event);
  return NextResponse.json({
    ok: true, eventId: event.id, speakers: toQuery,
    messageCount: messages.length, botResponses: botResponses.length,
  });
}
