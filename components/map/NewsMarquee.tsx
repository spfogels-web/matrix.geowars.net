'use client';
import { useEffect, useState, useRef } from 'react';

interface Item { text: string; source?: string; isLive?: boolean; }

interface Props {
  simIntel: string[];
  tension: number;
}

export default function NewsMarquee({ simIntel, tension }: Props) {
  const [liveNews, setLiveNews] = useState<{ title: string; source: string }[]>([]);
  const [fetched, setFetched] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchNews() {
    try {
      const res = await fetch('/api/news');
      if (!res.ok) return;
      const data = await res.json();
      setLiveNews(data.headlines ?? []);
      setFetched(true);
    } catch { /* network unavailable — sim intel only */ }
  }

  useEffect(() => {
    fetchNews();
    intervalRef.current = setInterval(fetchNews, 8 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const items: Item[] = [
    ...liveNews.map(n => ({ text: n.title, source: n.source, isLive: true })),
    ...simIntel.map(s => ({ text: s, source: 'INTEL', isLive: false })),
  ];

  const fallback: Item[] = [
    { text: 'GEOWARS MATRIX — GLOBAL INTELLIGENCE FEED INITIALIZING', source: 'SYS' },
    { text: 'MONITORING GLOBAL THREAT VECTORS', source: 'SYS' },
    { text: 'AI AGENTS ONLINE — AWAITING SIMULATION START', source: 'SYS' },
  ];

  const display = items.length > 0 ? [...items, ...items] : [...fallback, ...fallback];
  const allItems = items.length > 0 ? items : fallback;

  const borderColor = tension >= 75 ? 'rgba(255,45,85,0.5)'
    : tension >= 50 ? 'rgba(255,106,0,0.4)'
    : tension >= 30 ? 'rgba(255,215,0,0.3)'
    : 'rgba(0,245,255,0.2)';

  const badgeColor = tension >= 75 ? '#ff2d55' : tension >= 50 ? '#ff6a00' : '#ffd700';

  return (
    <>
      {/* ── Marquee bar ── */}
      <div className="absolute top-0 left-0 right-0 flex items-center overflow-hidden"
        style={{ zIndex: 620, height: '40px', background: 'rgba(0,0,0,0.92)', borderBottom: `1px solid ${borderColor}`, backdropFilter: 'blur(8px)' }}>

        {/* LIVE badge */}
        <div className="shrink-0 flex items-center gap-2 px-3 font-orbitron font-bold"
          style={{ background: `${badgeColor}22`, borderRight: `1px solid ${badgeColor}44`, height: '100%', fontSize: '11px', color: badgeColor, letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>
          <span className="status-blink" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: badgeColor, boxShadow: `0 0 8px ${badgeColor}` }} />
          WORLD FEED
          {fetched && liveNews.length > 0 && (
            <span style={{ fontSize: '9px', color: 'rgba(0,245,255,0.65)', fontFamily: 'monospace', marginLeft: '4px' }}>
              {liveNews.length} LIVE
            </span>
          )}
        </div>

        {/* Scrolling content */}
        <div className="flex-1 overflow-hidden relative" style={{ cursor: 'default' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', animation: `ticker-move 150s linear infinite`, willChange: 'transform' }}>
            {display.map((item, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ color: item.isLive ? '#ffd700' : 'rgba(255,45,85,0.7)', fontSize: '14px', margin: '0 20px' }}>
                  {item.isLive ? '◆' : '⬥'}
                </span>
                {item.source && (
                  <span className="font-orbitron font-bold" style={{
                    fontSize: '10px', letterSpacing: '0.12em', marginRight: '10px',
                    color: item.isLive ? '#ffd700' : 'rgba(255,45,85,0.9)',
                    background: item.isLive ? 'rgba(255,215,0,0.1)' : 'rgba(255,45,85,0.1)',
                    padding: '2px 7px', borderRadius: '3px',
                    border: `1px solid ${item.isLive ? 'rgba(255,215,0,0.3)' : 'rgba(255,45,85,0.3)'}`,
                  }}>
                    {item.source}
                  </span>
                )}
                <span className="font-mono" style={{
                  fontSize: '16px',
                  color: item.isLive ? 'rgba(255,255,255,0.93)' : 'rgba(255,180,180,0.93)',
                  letterSpacing: '0.03em',
                }}>
                  {item.text}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="shrink-0 font-orbitron font-bold px-3 transition-all"
          style={{
            height: '100%', fontSize: '10px', letterSpacing: '0.14em', whiteSpace: 'nowrap',
            color: expanded ? badgeColor : 'rgba(200,210,240,0.5)',
            borderLeft: `1px solid ${borderColor}`,
            background: expanded ? `${badgeColor}18` : 'transparent',
          }}>
          {expanded ? '▲ CLOSE' : '▼ EXPAND'}
        </button>

        {/* UTC clock */}
        <div className="shrink-0 px-3 font-mono"
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', borderLeft: `1px solid ${borderColor}`, height: '100%', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {new Date().toUTCString().slice(17, 25)} UTC
        </div>
      </div>

      {/* ── Expanded news panel ── */}
      <div className="absolute left-0 right-0 overflow-hidden"
        style={{
          zIndex: 619,
          top: '40px',
          maxHeight: expanded ? '340px' : '0px',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
          background: 'rgba(2,1,12,0.97)',
          borderBottom: expanded ? `1px solid ${borderColor}` : 'none',
          backdropFilter: 'blur(14px)',
          boxShadow: expanded ? '0 12px 40px rgba(0,0,0,0.7)' : 'none',
        }}>
        <div className="overflow-y-auto" style={{ maxHeight: '340px', padding: '12px 16px' }}>
          {/* Panel header */}
          <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <span className="status-blink" style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: badgeColor, boxShadow: `0 0 8px ${badgeColor}` }} />
            <span className="font-orbitron font-bold" style={{ color: badgeColor, fontSize: '11px', letterSpacing: '0.2em' }}>
              GLOBAL INTELLIGENCE FEED
            </span>
            <span className="font-mono ml-auto" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '10px' }}>
              {allItems.length} ITEMS
            </span>
          </div>

          {/* News items */}
          <div className="space-y-2">
            {allItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{
                  background: item.isLive ? 'rgba(255,215,0,0.05)' : item.source === 'INTEL' ? 'rgba(255,45,85,0.05)' : 'rgba(120,60,255,0.04)',
                  border: `1px solid ${item.isLive ? 'rgba(255,215,0,0.15)' : item.source === 'INTEL' ? 'rgba(255,45,85,0.15)' : 'rgba(120,60,255,0.1)'}`,
                }}>
                <span style={{ color: item.isLive ? '#ffd700' : 'rgba(255,45,85,0.7)', fontSize: '11px', marginTop: '2px', flexShrink: 0 }}>
                  {item.isLive ? '◆' : '⬥'}
                </span>
                {item.source && (
                  <span className="font-orbitron font-bold shrink-0" style={{
                    fontSize: '9px', letterSpacing: '0.1em', marginTop: '3px',
                    color: item.isLive ? '#ffd700' : item.source === 'INTEL' ? '#ff6a00' : 'rgba(180,79,255,0.8)',
                    background: item.isLive ? 'rgba(255,215,0,0.1)' : 'rgba(0,0,0,0.3)',
                    padding: '1px 6px', borderRadius: '3px',
                    border: `1px solid ${item.isLive ? 'rgba(255,215,0,0.25)' : 'rgba(120,60,255,0.2)'}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {item.source}
                  </span>
                )}
                <p className="font-mono" style={{
                  color: item.isLive ? 'rgba(255,255,255,0.9)' : 'rgba(220,190,190,0.85)',
                  fontSize: '13px', lineHeight: '1.5',
                }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
