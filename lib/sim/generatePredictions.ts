// lib/sim/generatePredictions.ts
// Generates 3 unique AI prediction questions per simulation, seeded from live news.
// Q1 resolves at Act 1 (5 min — regional conflict), Q2 at Act 2 (10 min — global escalation),
// Q3 at the finale (20 min — war vs peace outcome).

import OpenAI from 'openai';
import { getNewsContext } from '@/lib/engine/newsContext';

// Fallback questions by scenario if GPT fails
const FALLBACK_QUESTIONS: Record<string, string[]> = {
  hormuz_blockade: [
    'Will Iran launch military strikes against US naval assets in the Persian Gulf?',
    'Will global oil prices surge above crisis threshold as shipping lanes collapse?',
    'Will the conflict end in full-scale nuclear war or a diplomatic ceasefire?',
  ],
  taiwan_crisis: [
    'Will the PLA initiate live-fire military operations in the Taiwan Strait?',
    'Will the US deploy carrier strike groups to directly intercept Chinese forces?',
    'Will the conflict end in full-scale nuclear war or a diplomatic ceasefire?',
  ],
  nuclear_standoff: [
    'Will a nuclear-armed state place its arsenal on heightened alert status?',
    'Will a second nation mobilize nuclear forces in response to escalation?',
    'Will the conflict end in full-scale nuclear war or a diplomatic ceasefire?',
  ],
  nato_conflict: [
    'Will Russia launch direct military strikes against NATO member territory?',
    'Will NATO invoke Article 5 and mobilize a unified military response?',
    'Will the conflict end in full-scale nuclear war or a diplomatic ceasefire?',
  ],
  middle_east_war: [
    'Will military strikes expand to a second country in the Middle East?',
    'Will great powers be drawn into direct military confrontation in the region?',
    'Will the conflict end in full-scale nuclear war or a diplomatic ceasefire?',
  ],
  default: [
    'Will a major power launch direct military strikes within the next phase?',
    'Will global tensions force a second nation into active military mobilization?',
    'Will the conflict end in full-scale nuclear war or a diplomatic ceasefire?',
  ],
};

function getFallback(scenarioId: string): string[] {
  return FALLBACK_QUESTIONS[scenarioId] ?? FALLBACK_QUESTIONS.default;
}

export async function generatePredictionQuestions(scenarioId: string): Promise<string[]> {
  const news = getNewsContext();
  const headlines = news?.headlines?.slice(0, 12).map((h, i) => `${i + 1}. ${h}`).join('\n') ?? '';
  const theme = news?.dominantTheme ?? 'global tensions';
  const summary = news?.summary ?? '';

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return getFallback(scenarioId);

  const openai = new OpenAI({ apiKey });

  const prompt = `You are generating 3 prediction questions for a real-time geopolitical war simulation. Players bet YES or NO on each question.

Current scenario: ${scenarioId}
Dominant theme: ${theme}
World situation: ${summary}

Live headlines:
${headlines}

Generate exactly 3 unique yes/no prediction questions. Each question must be:
- Tied to the current real-world situation (reference specific actors, regions, or events)
- Dramatic and specific — not vague
- Resolvable as clearly YES or NO

The 3 questions map to these simulation milestones:
1. ACT I (5 min in): A specific military escalation that WILL happen — e.g., a strike, mobilization, or blockade. Players should feel urgency. Outcome is YES.
2. ACT II (10 min in): Whether global powers cross a critical threshold. More uncertain — could go either way. Example: "Will China deploy warships to counter US carrier group?"
3. FINALE (20 min): Will this end in nuclear war or diplomatic resolution? This is the final climactic question. Example: "Will the crisis end in nuclear war before a ceasefire can be reached?"

Respond ONLY with a valid JSON array of exactly 3 strings. No markdown. No explanation.
Example: ["Will Iran mine the Strait of Hormuz, cutting off 20% of global oil supply?", "Will the US and China enter direct naval combat in the Persian Gulf?", "Will the crisis escalate to nuclear war before diplomacy can intervene?"]`;

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 350,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = (res.choices[0]?.message?.content ?? '').replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length === 3 && parsed.every(q => typeof q === 'string')) {
      return parsed as string[];
    }
  } catch (e) {
    console.error('[generatePredictions] GPT failed:', e);
  }

  return getFallback(scenarioId);
}
