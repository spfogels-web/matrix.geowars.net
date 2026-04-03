'use client';
import { useState } from 'react';
import { GeoEvent } from '@/lib/engine/types';

interface Props {
  events: GeoEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  military: '#ff2d55', economic: '#ffd700', cyber: '#00f5ff',
  diplomatic: '#b44fff', intelligence: '#00ff9d', nuclear: '#ff2d55', humanitarian: '#ff6a00',
};

const TYPE_ICONS: Record<string, string> = {
  military: '⚔', economic: '📉', cyber: '⚡', diplomatic: '🤝',
  intelligence: '👁', nuclear: '☢', humanitarian: '🆘',
};

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function CrisisLog({ events }: Props) {
  const [open, setOpen] = useState(true);
  const recent = events.slice(0, 12);

  return (
    <div className="absolute z-20"
      style={{ bottom: '8px', left: '8px', width: open ? '340px' : '140px', transition: 'width 0.3s ease' }}>

      {/* Toggle bar */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 font-orbitron font-bold"
        style={{
          background: 'rgba(2,1,10,0.92)',
          border: '1px solid rgba(255,45,85,0.35)',
          borderRadius: open ? '10px 10px 0 0' : '10px',
          fontSize: '12px', letterSpacing: '0.18em', color: '#ff2d55',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
        }}>
        <span className="status-blink" style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#ff2d55', boxShadow: '0 0 8px #ff2d55', flexShrink: 0 }} />
        CRISIS LOG
        <span className="ml-auto font-mono" style={{ color: 'rgba(255,45,85,0.5)', fontSize: '9px' }}>
          {open ? '▼' : '▶'} {events.length}
        </span>

      </button>

      {open && (
        <div style={{
          background: 'rgba(2,1,10,0.94)',
          border: '1px solid rgba(255,45,85,0.25)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          backdropFilter: 'blur(12px)',
          maxHeight: '340px',
          overflowY: 'auto',
        }}>
          {recent.length === 0 && (
            <div className="px-3 py-4 text-center font-mono" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
              Awaiting events...
            </div>
          )}
          {recent.map((ev, i) => {
            const c = TYPE_COLORS[ev.type] || '#00f5ff';
            const icon = TYPE_ICONS[ev.type] || '⚠';
            return (
              <div key={ev.id}
                className="px-3 py-2 border-b"
                style={{
                  borderColor: 'rgba(255,255,255,0.05)',
                  background: i === 0 ? `${c}08` : 'transparent',
                }}>
                {/* Row 1: icon + type + impact + time */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span style={{ fontSize: '13px' }}>{icon}</span>
                  <span className="font-orbitron font-bold" style={{ color: c, fontSize: '11px', letterSpacing: '0.1em' }}>
                    {ev.type.toUpperCase()}
                  </span>
                  <span className="font-orbitron font-bold" style={{
                    color: '#ffffff',
                    fontSize: '13px',
                    marginLeft: 'auto',
                    textShadow: `0 0 10px ${ev.impact >= 8 ? '#ff2d55' : ev.impact >= 5 ? '#ff6a00' : '#ffd700'}`,
                  }}>
                    {ev.impact}/10
                  </span>
                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>
                    {fmt(ev.timestamp)}
                  </span>
                </div>
                {/* Row 2: title */}
                <div className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.95)', fontSize: '12px', lineHeight: '1.4' }}>
                  {ev.title}
                </div>
                {/* Row 3: region + units dispatched */}
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10.5px' }}>
                    📍 {ev.region}
                  </span>
                  {ev.type === 'military' && (
                    <span className="font-mono" style={{ color: c, fontSize: '10px', opacity: 0.9 }}>
                      · {ev.impact >= 8 ? '✈✈✈ FIGHTER JETS + 🚢 FLEET' : ev.impact >= 5 ? '✈✈ FIGHTER JETS' : '✈ SORTIE'}
                    </span>
                  )}
                  {ev.type === 'nuclear' && (
                    <span className="font-mono" style={{ color: '#ff2d55', fontSize: '10px' }}>
                      · ☢ NUCLEAR ALERT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
