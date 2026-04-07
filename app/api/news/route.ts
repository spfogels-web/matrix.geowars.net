export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

// Simple XML text extractor (no DOM needed)
function extractItems(xml: string): { title: string; url: string; source: string }[] {
  const items: { title: string; url: string; source: string }[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) || [];
  for (const block of itemBlocks) {
    const cdataMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const plainMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const raw = (cdataMatch?.[1] ?? plainMatch?.[1] ?? '').trim();
    const title = raw
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

    // Extract URL: try <link> then <guid isPermaLink="true">
    const linkCdata = block.match(/<link><!\[CDATA\[(https?[^\]]+)\]\]>/);
    const linkPlain = block.match(/<link>(https?[^<]+)<\/link>/);
    const linkAlt   = block.match(/<link\s[^>]*>(https?[^<]+)<\/link>/);
    const guidPerm  = block.match(/<guid[^>]*isPermaLink="true"[^>]*>(https?[^<]+)<\/guid>/);
    const url = (linkCdata?.[1] ?? linkPlain?.[1] ?? linkAlt?.[1] ?? guidPerm?.[1] ?? '').trim();

    if (title && title.length > 15 && !title.toLowerCase().includes('rss')) {
      items.push({ title, url, source: '' });
    }
  }
  return items;
}

const FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                  source: 'BBC' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',       source: 'NYT' },
  { url: 'https://feeds.reuters.com/reuters/worldNews',                   source: 'Reuters' },
  { url: 'https://al-monitor.com/rss',                                    source: 'Al-Monitor' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',                     source: 'Al Jazeera' },
  { url: 'https://truthsocial.com/@realDonaldTrump.rss',                  source: 'Trump/TS' },
];

let _cache: { ts: number; headlines: { title: string; url: string; source: string }[] } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    return NextResponse.json({ headlines: _cache.headlines });
  }

  const results = await Promise.allSettled(
    FEEDS.map(async ({ url, source }) => {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0 (GeoWarsMatrix/2.0 intelligence simulation)' },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return extractItems(xml).slice(0, 8).map(i => ({ ...i, source }));
    })
  );

  const headlines: { title: string; url: string; source: string }[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') headlines.push(...r.value);
  }

  // Deduplicate by first 40 chars
  const seen = new Set<string>();
  const unique = headlines.filter(h => {
    const k = h.title.slice(0, 40).toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  _cache = { ts: Date.now(), headlines: unique };
  return NextResponse.json({ headlines: unique });
}
