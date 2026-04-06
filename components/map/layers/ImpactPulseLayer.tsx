'use client';
import L from 'leaflet';
import { useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type UnitKind = 'jet' | 'missile' | 'nuclear' | 'naval' | 'submarine' | 'troops';

export interface MapUnit {
  id: string;
  kind: UnitKind;
  from: [number, number]; // [lng, lat]
  to:   [number, number];
  originLabel: string;
  progress: number;       // 0 → 1 in-flight, >1 explosion
  color: string;
  speed: number;
  exploding: boolean;
}

interface Props {
  units: MapUnit[];
  map: L.Map;
  /** Increments on every map pan/zoom — forces pixel re-projection. */
  mapVersion: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

const KIND_SYMBOL: Record<UnitKind, string> = {
  nuclear:   '☢',
  submarine: '◎',
  naval:     '⚓',
  missile:   '▶',
  troops:    '▲',
  jet:       '✈',
};

/**
 * SVG overlay that renders in-flight units (jets, missiles, nukes, naval, subs)
 * and their explosion rings on impact.
 *
 * Positioned at zIndex 515 (just above MissileArcLayer at 510).
 */
export default function ImpactPulseLayer({ units, map, mapVersion }: Props) {
  void mapVersion;

  const { x: W, y: H } = map.getSize();

  const px = useCallback((lng: number, lat: number): [number, number] => {
    const p = map.latLngToContainerPoint(L.latLng(lat, lng));
    return [p.x, p.y];
  }, [map]);

  if (units.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 515,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="ip-glow-sm" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="ip-glow-md" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {units.map(u => {
        const t = easeInOut(Math.min(u.progress, 1));
        const [ux, uy] = px(
          lerp(u.from[0], u.to[0], t),
          lerp(u.from[1], u.to[1], t),
        );

        // ── Explosion rings after impact ─────────────────────────────────
        if (u.exploding) {
          const r  = 10 + u.progress * 60;
          const op = Math.max(0, 0.9 - u.progress);
          return (
            <g key={u.id} filter="url(#ip-glow-md)">
              <circle cx={ux} cy={uy} r={r}        fill="none"    stroke={u.color} strokeWidth={2.5} opacity={op}/>
              <circle cx={ux} cy={uy} r={r * 0.55} fill={u.color}                                    opacity={Math.max(0, 0.65 - u.progress)}/>
              <circle cx={ux} cy={uy} r={r * 0.8}  fill="none"    stroke={u.color} strokeWidth={1}   opacity={Math.max(0, 0.4  - u.progress * 0.6)}/>
              <circle cx={ux} cy={uy} r={r * 1.4}  fill="none"    stroke={u.color} strokeWidth={0.8} opacity={Math.max(0, 0.25 - u.progress * 0.3)}/>
              {/* Core white flash */}
              <circle cx={ux} cy={uy} r={r * 0.2}  fill="white"                                      opacity={Math.max(0, 0.9  - u.progress * 2)}/>
            </g>
          );
        }

        // ── In-flight unit ───────────────────────────────────────────────
        const sym = KIND_SYMBOL[u.kind] ?? '✈';
        return (
          <g key={u.id} transform={`translate(${ux},${uy})`} filter="url(#ip-glow-sm)">
            {/* Glow halo */}
            <circle r={9} fill={u.color} opacity={0.12}/>
            {/* Core dot */}
            <circle r={4} fill={u.color} opacity={0.95}/>
            <circle r={2} fill="white"   opacity={0.8}/>
            {/* Unit symbol */}
            <text
              textAnchor="middle" y={-10}
              style={{
                fontSize: '11px', fill: u.color,
                fontFamily: 'Share Tech Mono, monospace', fontWeight: 'bold',
              }}
            >
              {sym}
            </text>
            {/* Origin label */}
            <text
              textAnchor="middle" y={18}
              style={{
                fontSize: '7px', fill: 'rgba(255,255,255,0.7)',
                fontFamily: 'Share Tech Mono, monospace',
                paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.9)', strokeWidth: '2px',
              }}
            >
              {u.originLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
