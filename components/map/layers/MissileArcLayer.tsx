'use client';
import L from 'leaflet';
import { useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Arc {
  id: string;
  from: [number, number]; // [lng, lat]
  to:   [number, number];
  color: string;
}

interface Props {
  arcs: Arc[];
  map: L.Map;
  /** Increments on every map pan/zoom — forces pixel re-projection. */
  mapVersion: number;
}

/**
 * SVG overlay that draws animated Bezier arcs between two geo-coordinates.
 * Each arc gets:
 *   - a glowing halo path
 *   - a dashed core path
 *   - a travelling dot animated along the curve
 *   - a pulsing ring at the destination
 *
 * Positioned at zIndex 510 (above BlackoutLayer at 410, below cinematic at 700).
 */
export default function MissileArcLayer({ arcs, map, mapVersion }: Props) {
  // Consume mapVersion to force re-render on every map move
  void mapVersion;

  const { x: W, y: H } = map.getSize();

  const px = useCallback((lng: number, lat: number): [number, number] => {
    const p = map.latLngToContainerPoint(L.latLng(lat, lng));
    return [p.x, p.y];
  }, [map]);

  if (arcs.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 510,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="ma-arc-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="ma-dot-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {arcs.map(arc => {
        const [x1, y1] = px(arc.from[0], arc.from[1]);
        const [x2, y2] = px(arc.to[0],   arc.to[1]);
        const mx   = (x1 + x2) / 2;
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const my   = (y1 + y2) / 2 - Math.max(30, dist * 0.3);
        const d    = `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
        // Approximate path length for ring animation radius
        const ringR = Math.max(12, Math.round(dist * 1.3) * 0.04);

        return (
          <g key={arc.id} filter="url(#ma-arc-glow)">
            {/* Glow halo */}
            <path
              d={d} fill="none"
              stroke={arc.color} strokeWidth={5} strokeOpacity={0.18}
              strokeLinecap="round"
            />
            {/* Dashed core line */}
            <path
              d={d} fill="none"
              stroke={arc.color} strokeWidth={1.5} strokeOpacity={0.9}
              strokeDasharray="8,5" strokeLinecap="round"
            />

            {/* Hidden path for animateMotion reference */}
            <path id={`ma-path-${arc.id}`} d={d} fill="none"/>

            {/* Travelling dot */}
            <circle r="3.5" fill={arc.color} opacity="0.95" filter="url(#ma-dot-glow)">
              <animateMotion dur="2.5s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#ma-path-${arc.id}`}/>
              </animateMotion>
            </circle>

            {/* Origin dot */}
            <circle cx={x1} cy={y1} r="4" fill={arc.color} opacity="0.7" filter="url(#ma-dot-glow)"/>

            {/* Destination expanding ring */}
            <circle cx={x2} cy={y2} r="0" fill="none" stroke={arc.color} strokeWidth="1.5">
              <animate attributeName="r"       values={`0;${ringR}`} dur="1.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.8;0"        dur="1.2s" repeatCount="indefinite"/>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
