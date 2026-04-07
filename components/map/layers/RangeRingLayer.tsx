'use client';
import L from 'leaflet';
import { useCallback } from 'react';
import type { MilitaryHub } from '@/lib/sim/military-hubs';

interface Props {
  hubs: MilitaryHub[];       // hubs whose rings should be shown
  map: L.Map;
  mapVersion: number;
}

/**
 * Draws a faint range ring around each provided hub.
 * Uses the Leaflet projection to convert km → pixels at each hub's latitude.
 * Positioned at zIndex 505 (below arc/pulse layers).
 */
export default function RangeRingLayer({ hubs, map, mapVersion }: Props) {
  void mapVersion;
  const { x: W, y: H } = map.getSize();

  /**
   * Convert a distance in km to approximate pixels at a given latitude,
   * using the current map zoom.
   */
  const kmToPx = useCallback((lat: number, km: number): number => {
    const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) /
      Math.pow(2, map.getZoom());
    return (km * 1000) / metersPerPx;
  }, [map]);

  const px = useCallback((lng: number, lat: number): [number, number] => {
    const p = map.latLngToContainerPoint(L.latLng(lat, lng));
    return [p.x, p.y];
  }, [map]);

  if (hubs.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 505,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      {hubs.map(hub => {
        const [hx, hy] = px(hub.pos[0], hub.pos[1]);
        const r = kmToPx(hub.pos[1], hub.rangeKm);

        // Color from hub type
        const color = HUB_RING_COLOR[hub.type] ?? '#94a3b8';

        return (
          <g key={hub.id}>
            {/* Outer range ring */}
            <circle
              cx={hx} cy={hy} r={r}
              fill={color}
              fillOpacity={0.03}
              stroke={color}
              strokeWidth={0.8}
              strokeOpacity={0.25}
              strokeDasharray="6,8"
            />
            {/* Inner 50% range ring */}
            <circle
              cx={hx} cy={hy} r={r * 0.5}
              fill="none"
              stroke={color}
              strokeWidth={0.5}
              strokeOpacity={0.12}
              strokeDasharray="3,12"
            />
          </g>
        );
      })}
    </svg>
  );
}

const HUB_RING_COLOR: Record<string, string> = {
  airbase:       '#3b82f6',
  naval_base:    '#06b6d4',
  missile_silo:  '#ef4444',
  submarine_pen: '#10b981',
  carrier_group: '#f59e0b',
  cyber_node:    '#8b5cf6',
  defense_grid:  '#22c55e',
};
