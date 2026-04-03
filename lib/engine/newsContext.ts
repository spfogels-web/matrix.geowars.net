// lib/engine/newsContext.ts
// Fetches live RSS headlines, uses GPT to analyze them, and produces
// a structured "real world context" that seeds the simulation.

import OpenAI from 'openai';
import { GeoEvent } from './types';

export interface WorldNewsContext {
  headlines: string[];          // raw headline strings
  summary: string;              // GPT-generated 2-3 sentence world situation summary
  dominantTheme: string;        // e.g. "Middle East escalation", "Taiwan tensions"
  scenarioId: string;           // maps to one of our scenario IDs
  initialTension: number;       // 0-100
  hotLeaders: string[];         // leader IDs most relevant to current news
  seedEvent: Omit<GeoEvent, 'id'|'timestamp'|'cycleId'|'isNew'> | null;
  fetchedAt: number;
}

// Persist in globalThis so it survives across requests
const _g = globalThis as Record<string, unknown>;

export function getNewsContext(): WorldNewsContext | null {
  return (_g.__gw_newsCtx as WorldNewsContext) ?? null;
}
export function setNewsContext(ctx: WorldNewsContext) {
  _g.__gw_newsCtx = ctx;
}
export function clearNewsContext() {
  _g.__gw_newsCtx = null;
}

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',             source: 'BBC' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',  source: 'NYT' },
  { url: 'https://feeds.reuters.com/reuters/worldNews',              source: 'Reuters' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',               source: 'Al Jazeera' },
];

function extractTitles(xml: string): string[] {
  const items: string[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    const m = b.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || b.match(/<title>([\s\S]*?)<\/title>/);
    const raw = (m?.[1] ?? '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
    if (raw && raw.length > 15) items.push(raw);
  }
  return items.slice(0, 10);
}

export async function fetchAndAnalyzeNews(): Promise<WorldNewsContext> {
  // 1. Pull RSS feeds in parallel
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async ({ url, source }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return [] as string[];
      const xml = await res.text();
      return extractTitles(xml).map(t => `[${source}] ${t}`);
    })
  );

  const allHeadlines: string[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') allHeadlines.push(...r.value);
  }

  // Deduplicate and cap
  const seen = new Set<string>();
  const headlines = allHeadlines.filter(h => {
    const k = h.slice(0, 50).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).slice(0, 30);

  // 2. GPT analyzes the headlines
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const analysisPrompt = `You are an intelligence analyst seeding a real-time geopolitical war simulation.

Today's live news headlines:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

Based on these real headlines, produce a JSON object with these fields:
- "summary": 2-3 sentence situation report of the current global crisis landscape (be specific, reference real events from headlines)
- "dominantTheme": short phrase describing the main tension (e.g. "Middle East escalation", "Russia-NATO standoff")
- "scenarioId": pick the single best match from: global_tension | taiwan_crisis | hormuz_blockade | nato_conflict | nuclear_standoff | economic_collapse | middle_east_war
- "initialTension": integer 0-100 based on how serious current events are
- "hotLeaders": array of 4-6 leader IDs most relevant right now, from: usa|china|russia|iran|israel|uk|france|germany|turkey|saudiarabia|india|pakistan|japan|southkorea|northkorea|ukraine|taiwan|nato
- "seedEvent": a JSON object representing the FIRST simulation event, grounded in a real current headline. Fields: type (military|economic|cyber|diplomatic|intelligence|nuclear|humanitarian), title (short, dramatic), description (2-3 sentences grounded in real events), impact (1-10), region (region name), affectedLeaders (array of leader IDs)

Respond ONLY with valid JSON. No markdown.`;

  let parsed: Partial<WorldNewsContext> & { seedEvent?: WorldNewsContext['seedEvent'] } = {};

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 800,
      temperature: 0.7,
      messages: [{ role: 'user', content: analysisPrompt }],
    });
    const raw = res.choices[0]?.message?.content ?? '{}';
    parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim());
  } catch (e) {
    console.error('News analysis failed:', e);
  }

  const ctx: WorldNewsContext = {
    headlines,
    summary: parsed.summary || 'Global tensions remain elevated across multiple theatres.',
    dominantTheme: parsed.dominantTheme || 'Global Tension',
    scenarioId: parsed.scenarioId || 'global_tension',
    initialTension: Math.min(100, Math.max(20, Number(parsed.initialTension) || 45)),
    hotLeaders: (parsed.hotLeaders as string[]) || ['usa', 'china', 'russia', 'iran', 'israel'],
    seedEvent: parsed.seedEvent || null,
    fetchedAt: Date.now(),
  };

  setNewsContext(ctx);
  return ctx;
}
