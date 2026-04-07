// app/api/tick/route.ts — Auto-generate an event and simulate selected leaders
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getState, applyEvent, applyResponses, addBotMessage, updateBotMemory, advanceNarrativePhase, elapsedMs } from '@/lib/engine/state';
import { SYSTEM_PROMPTS, BOT_SYSTEM_PROMPTS, buildUserPrompt, buildBotPrompt } from '@/lib/agents/prompts';
import { getScenarioEvent, getRandomEvent, getRandomEventByType } from '@/lib/engine/events';
import { getNewsContext } from '@/lib/engine/newsContext';
import { GeoEvent, EventType, UserBot, BotMessage } from '@/lib/engine/types';
import { generatePredictionQuestions } from '@/lib/sim/generatePredictions';

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

// ── NARRATIVE ARC — scripted trigger events ───────────────────────────────────
// Each act fires exactly once at the real-time threshold.
// Persisted in globalThis so they survive across requests.
if (!_g.__gw_actFired) _g.__gw_actFired = { act1: false, act2: false, finale: false };
const actFired = () => _g.__gw_actFired as { act1: boolean; act2: boolean; finale: boolean };

const ACT1_MS    =  5 * 60 * 1000;  //  5 minutes
const ACT2_MS    = 10 * 60 * 1000;  // 10 minutes
const FINALE_MS  = 20 * 60 * 1000;  // 20 minutes

// Scripted events injected at each act boundary
function act1Event(cycleId: string): GeoEvent {
  return {
    id: `evt_act1_${Date.now()}`, timestamp: Date.now(), cycleId, isNew: true,
    type: 'military',
    title: '⚠ PREDICTION CONFIRMED: Regional Conflict Erupts — Iran Strikes US Navy in Hormuz',
    description: 'Iranian Revolutionary Guard Corps fast-boats and shore-launched missiles have struck two US Navy vessels in the Strait of Hormuz. Oil tanker traffic halted. US carrier strike group USS George Washington moves to combat posture. Regional war now underway.',
    impact: 9,
    region: 'Persian Gulf',
    affectedLeaders: ['iran', 'usa', 'israel', 'saudiarabia'],
    lat: 26.35, lng: 56.5, cinematic: true,
    cityName: 'Strait of Hormuz', countryName: 'Persian Gulf',
    radiusKm: 280,
  };
}

function act2Event(cycleId: string): GeoEvent {
  return {
    id: `evt_act2_${Date.now()}`, timestamp: Date.now(), cycleId, isNew: true,
    type: 'nuclear',
    title: '☢ PREDICTION CONFIRMED: Global Escalation — NATO, Russia & China Raise Nuclear Readiness',
    description: 'Multiple nuclear powers have simultaneously raised alert levels to DEFCON 2. Russian strategic bombers are airborne over the Arctic. Chinese DF-41 mobile launchers are repositioning. NATO activates Article 5 emergency protocols. The world stands on the edge of nuclear war.',
    impact: 10,
    region: 'Global',
    affectedLeaders: ['usa', 'russia', 'china', 'nato', 'uk', 'france', 'northkorea'],
    cinematic: false,
    radiusKm: 0,
  };
}

function finaleWarEvent(cycleId: string): GeoEvent {
  return {
    id: `evt_finale_war_${Date.now()}`, timestamp: Date.now(), cycleId, isNew: true,
    type: 'nuclear',
    title: '☢ SIMULATION CLIMAX: NUCLEAR WAR DECLARED — CIVILIZATION-ENDING EVENT',
    description: 'Multiple simultaneous nuclear launches detected. US NORTHCOM confirms inbound ICBMs. Moscow, Washington, Tehran, Tel Aviv and Beijing are primary targets. Estimated 2.4 billion casualties in the first 72 hours. Civilization as we know it ends. All bets are settled.',
    impact: 10,
    region: 'Global',
    affectedLeaders: ['usa', 'russia', 'china', 'iran', 'israel', 'northkorea', 'uk', 'france'],
    cinematic: true,
    cityName: 'Global Strike', countryName: 'Multiple Nations',
    radiusKm: 0,
  };
}

function finalePeaceEvent(cycleId: string): GeoEvent {
  return {
    id: `evt_finale_peace_${Date.now()}`, timestamp: Date.now(), cycleId, isNew: true,
    type: 'diplomatic',
    title: '🕊 SIMULATION CLIMAX: HISTORIC CEASEFIRE — Leaders Pull World Back From the Brink',
    description: 'In a dramatic overnight session brokered by UN Secretary-General, all warring parties have agreed to an immediate ceasefire. US, Russia, China, Iran and Israel sign the Geneva Emergency Accords. Nuclear alert levels return to DEFCON 5. Oil flows resume through the Strait of Hormuz. The crisis is over.',
    impact: 8,
    region: 'Global',
    affectedLeaders: ['usa', 'russia', 'china', 'iran', 'israel', 'nato', 'un'],
    cinematic: false,
  };
}

// ── TICK HANDLER ──────────────────────────────────────────────────────────────
export async function POST() {
  const state = getState();
  if (!state.isRunning || state.isPaused) {
    return NextResponse.json({ ok: false, reason: 'not running' });
  }

  // ── Generate prediction questions once per simulation ────────────────────
  // Fire-and-forget: runs async, stores result in state when ready.
  if (!state.predictionQuestions?.length && !(_g.__gw_questionsGenerating as boolean)) {
    _g.__gw_questionsGenerating = true;
    generatePredictionQuestions(state.activeScenario).then(questions => {
      const s = getState();
      s.predictionQuestions = questions;
      _g.__gw_questionsGenerating = false;
    }).catch(() => { _g.__gw_questionsGenerating = false; });
  }

  const cycleId = state.activeCycleId || 'tick';
  const elapsed = elapsedMs();
  const phase   = state.narrativePhase ?? 'prologue';
  const af      = actFired();

  // ── Narrative act gate — check thresholds and fire scripted events once ──
  let narrativeEvent: GeoEvent | null = null;

  if (elapsed >= FINALE_MS && !af.finale) {
    af.finale = true;
    // Resolution if tension < 72, otherwise war
    const isWar = state.globalTension >= 72;
    narrativeEvent = isWar ? finaleWarEvent(cycleId) : finalePeaceEvent(cycleId);
    advanceNarrativePhase(
      isWar ? 'finale_war' : 'finale_peace',
      isWar ? 100 : Math.max(0, state.globalTension - 35),
    );
  } else if (elapsed >= ACT2_MS && !af.act2 && phase !== 'finale_war' && phase !== 'finale_peace') {
    af.act2 = true;
    narrativeEvent = act2Event(cycleId);
    advanceNarrativePhase('act2', Math.min(100, state.globalTension + 22));
  } else if (elapsed >= ACT1_MS && !af.act1 && phase === 'prologue') {
    af.act1 = true;
    narrativeEvent = act1Event(cycleId);
    advanceNarrativePhase('act1', Math.min(100, state.globalTension + 18));
  }

  // ── Pick event: narrative gate overrides everything else ─────────────────
  const newsCtx = getNewsContext();
  const useSeed = state.tick === 0 && newsCtx?.seedEvent;

  let event: GeoEvent;
  if (narrativeEvent) {
    event = narrativeEvent;
  } else if (useSeed) {
    event = { ...newsCtx!.seedEvent!, id: `evt_seed_${Date.now()}`, timestamp: Date.now(), cycleId, isNew: true };
  } else {
    // Prologue phase: escalate tension faster so act1 lands with weight
    const bots = state.bots ?? [];
    let botBiasedType: EventType | null = null;
    if (bots.length > 0) {
      const merged: Partial<Record<EventType, number>> = {};
      for (const bot of bots) {
        for (const [etype, weight] of Object.entries(bot.eventTypeBias ?? {})) {
          merged[etype as EventType] = (merged[etype as EventType] ?? 0) + (weight ?? 0);
        }
      }
      const entries = Object.entries(merged).filter(([, w]) => w > 0) as [EventType, number][];
      if (entries.length > 0) {
        const total = entries.reduce((s, [, w]) => s + w, 0);
        let r = Math.random() * total;
        for (const [etype, w] of entries) { r -= w; if (r <= 0) { botBiasedType = etype; break; } }
      }
    }

    // Phase-biased event selection
    if (phase === 'act2') {
      // Act 2: heavy military/nuclear pressure
      event = Math.random() < 0.6
        ? getRandomEventByType('military', cycleId)
        : Math.random() < 0.5
          ? getRandomEventByType('nuclear', cycleId)
          : getRandomEvent(cycleId);
    } else if (phase === 'act1') {
      // Act 1: military and economic shock
      event = Math.random() < 0.55
        ? getRandomEventByType('military', cycleId)
        : Math.random() < 0.4
          ? getRandomEventByType('economic', cycleId)
          : getScenarioEvent(state.activeScenario, Math.floor(state.currentCycleNumber / 2), cycleId);
    } else {
      // Prologue / finale: normal weighted selection
      event = botBiasedType && Math.random() < 0.45
        ? getRandomEventByType(botBiasedType, cycleId)
        : Math.random() < 0.6
          ? getScenarioEvent(state.activeScenario, Math.floor(state.currentCycleNumber / 2), cycleId)
          : getRandomEvent(cycleId);
    }
  }

  applyEvent(event);

  // All valid candidates
  const bots = state.bots ?? [];
  const candidates = Array.from(new Set([...state.activeLeaderIds, ...event.affectedLeaders]));
  const botAlignedLeaders = bots.map(b => b.alignment).filter(a => a !== 'neutral' && a !== 'independent');
  for (const aligned of botAlignedLeaders) {
    if (!candidates.includes(aligned)) candidates.push(aligned);
  }

  // Narrative events pull in all affected leaders + expand speaker count
  const speakerCount = narrativeEvent ? Math.min(5, SPEAKERS_PER_TICK + 2) : SPEAKERS_PER_TICK;
  const toQuery = selectSpeakers(candidates, event.affectedLeaders, speakerCount);

  if (toQuery.length === 0) {
    const spoke = lastSpoke();
    const fallback = [...candidates].sort((a, b) => (spoke[a] ?? 0) - (spoke[b] ?? 0)).slice(0, 2);
    toQuery.push(...fallback);
  }

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
    narrativePhase: getState().narrativePhase,
    isNarrativeTrigger: !!narrativeEvent,
    messageCount: messages.length, botResponses: botResponses.length,
  });
}
