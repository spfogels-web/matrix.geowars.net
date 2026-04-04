'use client';
import { useEffect, useState } from 'react';

interface Props {
  active: boolean;
  color: string;
  eventTitle: string;
  targetLabel: string;
  eventType: string;
  impact: number;
  onComplete: () => void;
}

const FEED_DURATION = 7000; // ms — single broadcast overlay

export default function CinematicFeed({ active, eventTitle, targetLabel, impact, onComplete }: Props) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  const severity = impact >= 9 ? 'CRITICAL' : impact >= 7 ? 'BREAKING' : 'ALERT';
  const sevColor = impact >= 9 ? '#ff2d55' : impact >= 7 ? '#ff6a00' : '#ffd700';

  useEffect(() => {
    if (!active) { setVisible(false); setFading(false); return; }
    setVisible(true);
    setFading(false);
    const t1 = setTimeout(() => setFading(true), FEED_DURATION - 800);
    const t2 = setTimeout(() => { setVisible(false); onComplete(); }, FEED_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!visible) return null;

  const ticker = `⬤ ${severity} ⬤ ${eventTitle.toUpperCase()} ⬤ REGION: ${targetLabel.toUpperCase()} ⬤ IMPACT LEVEL: ${impact}/10 ⬤ GEOWARS MATRIX INTELLIGENCE SIMULATION ⬤ SIMULATION ONLY — NOT REAL NEWS ⬤ `;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 50,
        opacity: fading ? 0 : 1,
        transition: fading ? 'opacity 0.8s ease-out' : 'opacity 0.3s ease-in',
      }}>

      {/* ── TOP BANNER ── semi-transparent, news-style */}
      <div className="absolute top-0 left-0 right-0 fade-in" style={{
        background: 'rgba(0,0,0,0.82)',
        borderBottom: `3px solid ${sevColor}`,
        zIndex: 51,
      }}>
        {/* Top stripe */}
        <div style={{
          background: sevColor,
          height: '4px',
        }}/>

        <div className="flex items-center gap-4 px-5 py-3">
          {/* Logo */}
          <div className="shrink-0 flex items-center justify-center rounded font-orbitron font-black"
            style={{
              width: 52, height: 36,
              background: 'rgba(255,255,255,0.08)',
              border: `1.5px solid ${sevColor}60`,
              color: sevColor, fontSize: '14px', letterSpacing: '0.05em',
            }}>
            GWM
          </div>

          {/* Severity badge */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded font-orbitron font-black"
            style={{ background: sevColor, color: '#000', fontSize: '13px', letterSpacing: '0.2em' }}>
            <span className="status-blink">●</span> {severity}
          </div>

          {/* Event title */}
          <div className="flex-1 min-w-0">
            <div className="font-orbitron font-bold truncate"
              style={{ color: '#ffffff', fontSize: 'clamp(13px,1.8vw,20px)', letterSpacing: '0.05em', lineHeight: 1.2 }}>
              {eventTitle}
            </div>
            <div className="font-mono mt-0.5"
              style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', letterSpacing: '0.15em' }}>
              REGION: {targetLabel.toUpperCase()} · IMPACT: {impact}/10 · {new Date().toUTCString().slice(0, 25).toUpperCase()} UTC
            </div>
          </div>

          {/* Live badge */}
          <div className="shrink-0 flex items-center gap-1.5 font-orbitron font-bold"
            style={{ color: sevColor, fontSize: '12px', letterSpacing: '0.15em' }}>
            <span className="status-blink" style={{ fontSize: '10px' }}>⬤</span> LIVE
          </div>
        </div>

        {/* Secondary info bar */}
        <div className="flex items-center gap-6 px-5 py-1.5" style={{
          background: 'rgba(0,0,0,0.6)',
          borderTop: `1px solid rgba(255,255,255,0.06)`,
        }}>
          <span className="font-mono" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.12em' }}>
            GEOWARS MATRIX · INTELLIGENCE SIMULATION · NOT REAL NEWS · ALL EVENTS ARE FICTIONAL
          </span>
          <span className="font-mono ml-auto" style={{ color: `${sevColor}80`, fontSize: '10px', letterSpacing: '0.1em' }}>
            {impact >= 9 ? 'CATASTROPHIC EVENT' : impact >= 7 ? 'SEVERE EVENT' : 'SIGNIFICANT EVENT'} · IMPACT LEVEL {impact}/10
          </span>
        </div>
      </div>

      {/* ── MIDDLE — fully transparent so map is visible ── */}
      {/* Subtle corner vignettes to frame the overlay */}
      <div className="absolute" style={{
        top: 0, left: 0, width: 120, height: 120,
        background: 'radial-gradient(ellipse at top left, rgba(0,0,0,0.3) 0%, transparent 70%)',
        zIndex: 50,
      }}/>
      <div className="absolute" style={{
        top: 0, right: 0, width: 120, height: 120,
        background: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.3) 0%, transparent 70%)',
        zIndex: 50,
      }}/>

      {/* ── BOTTOM TICKER ── */}
      <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 51 }}>
        {/* Main colored ticker */}
        <div style={{
          background: sevColor,
          padding: '5px 0',
          overflow: 'hidden',
        }}>
          <div style={{
            color: '#000',
            fontFamily: 'Share Tech Mono, monospace',
            fontWeight: 'bold',
            fontSize: '11px',
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
            animation: 'ticker-move 14s linear infinite',
            display: 'inline-block',
          }}>
            {(ticker + ticker)}
          </div>
        </div>

        {/* Sub-ticker bar */}
        <div className="flex items-center px-4" style={{
          height: '34px',
          background: 'rgba(0,0,0,0.88)',
          borderTop: `2px solid ${sevColor}`,
        }}>
          <span className="font-orbitron font-bold shrink-0"
            style={{ color: sevColor, fontSize: '10px', letterSpacing: '0.18em', marginRight: '16px' }}>
            SIM INTEL
          </span>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              color: 'rgba(255,255,255,0.65)',
              fontSize: '10px',
              letterSpacing: '0.08em',
              animation: 'ticker-move 22s linear infinite',
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}>
              {`GEOWARS MATRIX AI SIMULATION · ALL EVENTS FICTIONAL · POWERED BY REAL-WORLD NEWS ANALYSIS · ${new Date().toUTCString()} · NOT AFFILIATED WITH ANY REAL NEWS ORGANIZATION · INTELLIGENCE SIMULATION NETWORK · `}
            </span>
          </div>
          <span className="status-blink font-orbitron font-bold shrink-0 ml-4"
            style={{ color: sevColor, fontSize: '10px', letterSpacing: '0.1em' }}>
            ● ON AIR
          </span>
        </div>
      </div>
    </div>
  );
}
