// app/api/tick/route.ts — Auto-generate an event and simulate all affected leaders
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getState, applyEvent, applyResponses } from '@/lib/engine/state';
import { SYSTEM_PROMPTS, buildUserPrompt } from '@/lib/agents/prompts';
import { getScenarioEvent, getRandomEvent } from '@/lib/engine/events';
import { GeoEvent } from '@/lib/engine/types';

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

export async function POST() {
  const state = getState();
  if (!state.isRunning || state.isPaused) {
    return NextResponse.json({ ok: false, reason: 'not running' });
  }

  const cycleId = state.activeCycleId || 'tick';
  const event = Math.random() < 0.6
    ? getScenarioEvent(state.activeScenario, Math.floor(state.currentCycleNumber / 2), cycleId)
    : getRandomEvent(cycleId);

  applyEvent(event);

  const toQuery = Array.from(new Set([...state.activeLeaderIds, ...event.affectedLeaders])).slice(0, 6);
  const results = await Promise.all(toQuery.map(id => queryLeader(id, event)));
  const responses = results.filter(Boolean) as NonNullable<typeof results[0]>[];

  const messages = applyResponses(responses, event);
  return NextResponse.json({ ok: true, eventId: event.id, messageCount: messages.length });
}
