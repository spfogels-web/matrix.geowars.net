'use client';
import { useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BlackoutZone {
  id: string;
  cx: number;        // pixel x (computed from lat/lng by parent)
  cy: number;        // pixel y
  r: number;         // pixel radius
  color: string;
  label: string;
  type: 'cyber' | 'emp' | 'blackout';
  createdAt: number;
  duration: number;  // ms total duration
}

interface Props {
  zones: BlackoutZone[];
  width: number;
  height: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BlackoutLayer({ zones, width, height }: Props) {
  // Tick forces re-render for fade animation — 100ms cadence is plenty
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const active = zones.filter(z => now - z.createdAt < z.duration);
  if (active.length === 0 || width === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 410, position: 'absolute', top: 0, left: 0 }}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <filter id="bo-blur">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="emp-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {active.map(zone => {
        const elapsed = now - zone.createdAt;
        const progress = Math.min(elapsed / zone.duration, 1);

        // Fade in over 600ms, hold, fade out over last 2500ms
        const fadeIn  = Math.min(elapsed / 600, 1);
        const holdEnd = zone.duration - 2500;
        const fadeOut = elapsed > holdEnd
          ? Math.min((elapsed - holdEnd) / 2500, 1)
          : 0;
        const opacity = fadeIn * (1 - fadeOut);
        if (opacity < 0.02) return null;

        // ── EMP: expanding concentric rings ───────────────────────────────
        if (zone.type === 'emp') {
          const outerR  = zone.r * (0.15 + progress * 0.85);
          const innerR  = outerR * 0.55;

          return (
            <g key={zone.id}>
              {/* Dark fill — EMP disruption zone */}
              <circle
                cx={zone.cx} cy={zone.cy}
                r={innerR}
                fill={zone.color}
                fillOpacity={0.07 * opacity}
                filter="url(#bo-blur)"
              />
              {/* Outer ring */}
              <circle
                cx={zone.cx} cy={zone.cy}
                r={outerR}
                fill="none"
                stroke={zone.color}
                strokeWidth={2}
                strokeOpacity={0.75 * opacity}
                filter="url(#emp-glow)"
              />
              {/* Mid ring — dashed */}
              <circle
                cx={zone.cx} cy={zone.cy}
                r={outerR * 0.7}
                fill="none"
                stroke={zone.color}
                strokeWidth={1}
                strokeOpacity={0.45 * opacity}
                strokeDasharray="10 7"
              />
              {/* Inner ring */}
              <circle
                cx={zone.cx} cy={zone.cy}
                r={innerR}
                fill="none"
                stroke={zone.color}
                strokeWidth={1.5}
                strokeOpacity={0.55 * opacity}
              />
              {/* Centre dot */}
              <circle
                cx={zone.cx} cy={zone.cy}
                r={5}
                fill={zone.color}
                fillOpacity={opacity}
                filter="url(#emp-glow)"
              />
              {/* Cross-hairs */}
              {[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy],i) => (
                <line key={i}
                  x1={zone.cx + dx * 10} y1={zone.cy + dy * 10}
                  x2={zone.cx + dx * 22} y2={zone.cy + dy * 22}
                  stroke={zone.color} strokeWidth={1.5}
                  strokeOpacity={0.7 * opacity}
                />
              ))}
              {/* Label */}
              <text
                x={zone.cx} y={zone.cy + outerR + 14}
                textAnchor="middle"
                fill={zone.color}
                fontSize={9}
                fontFamily="Share Tech Mono, monospace"
                letterSpacing="0.18em"
                fillOpacity={opacity * 0.85}
              >
                ⚡ EMP PULSE · {zone.label.toUpperCase()}
              </text>
            </g>
          );
        }

        // ── CYBER / BLACKOUT: darkened disruption cloud ───────────────────
        return (
          <g key={zone.id}>
            {/* Dark fog */}
            <circle
              cx={zone.cx} cy={zone.cy}
              r={zone.r}
              fill="#000000"
              fillOpacity={0.38 * opacity}
              filter="url(#bo-blur)"
            />
            {/* Outer boundary — dashed glitch ring */}
            <circle
              cx={zone.cx} cy={zone.cy}
              r={zone.r}
              fill="none"
              stroke={zone.color}
              strokeWidth={1.5}
              strokeOpacity={0.55 * opacity}
              strokeDasharray="18 9"
            />
            {/* Mid ring */}
            <circle
              cx={zone.cx} cy={zone.cy}
              r={zone.r * 0.65}
              fill="none"
              stroke={zone.color}
              strokeWidth={0.8}
              strokeOpacity={0.3 * opacity}
              strokeDasharray="8 14"
            />
            {/* Inner ring */}
            <circle
              cx={zone.cx} cy={zone.cy}
              r={zone.r * 0.35}
              fill="none"
              stroke={zone.color}
              strokeWidth={0.8}
              strokeOpacity={0.25 * opacity}
            />
            {/* Crosshair grid lines */}
            <line
              x1={zone.cx - zone.r * 0.85} y1={zone.cy}
              x2={zone.cx + zone.r * 0.85} y2={zone.cy}
              stroke={zone.color} strokeWidth={0.5} strokeOpacity={0.2 * opacity}
            />
            <line
              x1={zone.cx} y1={zone.cy - zone.r * 0.85}
              x2={zone.cx} y2={zone.cy + zone.r * 0.85}
              stroke={zone.color} strokeWidth={0.5} strokeOpacity={0.2 * opacity}
            />
            {/* BLACKOUT label */}
            <text
              x={zone.cx} y={zone.cy - 10}
              textAnchor="middle"
              fill={zone.color}
              fontSize={9}
              fontFamily="Share Tech Mono, monospace"
              letterSpacing="0.22em"
              fillOpacity={opacity * 0.9}
            >
              ⚡ BLACKOUT
            </text>
            <text
              x={zone.cx} y={zone.cy + 5}
              textAnchor="middle"
              fill={zone.color}
              fontSize={8}
              fontFamily="Share Tech Mono, monospace"
              letterSpacing="0.14em"
              fillOpacity={opacity * 0.65}
            >
              {zone.label.toUpperCase().slice(0, 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
