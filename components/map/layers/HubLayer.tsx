'use client';
import L from 'leaflet';
import { useCallback } from 'react';
import type { MilitaryHub, HubType } from '@/lib/sim/military-hubs';

interface Props {
  hubs: MilitaryHub[];
  map: L.Map;
  mapVersion: number;
  selectedHubId?: string | null;
  onSelectHub?: (hub: MilitaryHub | null) => void;
}

// ── Icon shapes per hub type ──────────────────────────────────────────────────
const TYPE_SYMBOL: Record<HubType, string> = {
  airbase:        '▲',   // triangle → aircraft / air power
  naval_base:     '⚓',
  missile_silo:   '⬡',   // hexagon
  submarine_pen:  '〇',   // filled circle representing sub hull
  carrier_group:  '⛵',
  cyber_node:     '◈',
  defense_grid:   '⬡',
};

// Sub-icons rendered below the main symbol for more context
const TYPE_SUB: Record<HubType, string> = {
  airbase:        'AIR',
  naval_base:     'NAV',
  missile_silo:   'MSL',
  submarine_pen:  'SUB',
  carrier_group:  'CSG',
  cyber_node:     'CYB',
  defense_grid:   'DEF',
};

const STATUS_OPACITY: Record<string, number> = {
  active:   1.0,
  alert:    1.0,
  standby:  0.55,
  disabled: 0.25,
  destroyed: 0.12,
};

const STATUS_RING: Record<string, string> = {
  active:   'none',
  alert:    'pulse',
  standby:  'none',
  disabled: 'none',
  destroyed: 'none',
};

// Nation colours (matches WorldMapLeaflet palette)
const COUNTRY_COLOR: Record<string, string> = {
  usa:         '#3b82f6',
  russia:      '#ef4444',
  china:       '#f59e0b',
  uk:          '#8b5cf6',
  france:      '#8b5cf6',
  nato:        '#6366f1',
  iran:        '#10b981',
  israel:      '#60a5fa',
  india:       '#f97316',
  pakistan:    '#14b8a6',
  japan:       '#ec4899',
  southkorea:  '#06b6d4',
  northkorea:  '#dc2626',
  default:     '#94a3b8',
};

function hubColor(hub: MilitaryHub): string {
  return COUNTRY_COLOR[hub.country] ?? COUNTRY_COLOR.default;
}

export default function HubLayer({
  hubs, map, mapVersion, selectedHubId, onSelectHub,
}: Props) {
  void mapVersion;
  const { x: W, y: H } = map.getSize();

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
        zIndex: 520,
        overflow: 'visible',
      }}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="hub-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="hub-glow-sel" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {hubs.map(hub => {
        const [hx, hy] = px(hub.pos[0], hub.pos[1]);
        const color = hubColor(hub);
        const opacity = STATUS_OPACITY[hub.status] ?? 1;
        const selected = hub.id === selectedHubId;
        const symbol = TYPE_SYMBOL[hub.type] ?? '●';
        const sub    = TYPE_SUB[hub.type]    ?? '';
        const pulsing = STATUS_RING[hub.status] === 'pulse';

        return (
          <g
            key={hub.id}
            transform={`translate(${hx},${hy})`}
            opacity={opacity}
            filter={selected ? 'url(#hub-glow-sel)' : 'url(#hub-glow)'}
            style={{ pointerEvents: 'all', cursor: onSelectHub ? 'pointer' : 'default' }}
            onClick={() => onSelectHub?.(selected ? null : hub)}
          >
            {/* Alert pulse ring */}
            {pulsing && (
              <circle r="14" fill="none" stroke={color} strokeWidth="1.5">
                <animate attributeName="r"       values="10;22"   dur="1.4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7;0"   dur="1.4s" repeatCount="indefinite"/>
              </circle>
            )}

            {/* Selection outer ring */}
            {selected && (
              <circle r="18" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r"       values="16;22;16" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite"/>
              </circle>
            )}

            {/* Hub background circle */}
            <circle r="10" fill="#0a0f1a" stroke={color} strokeWidth={selected ? 2 : 1.2} opacity="0.92"/>

            {/* Hub type symbol */}
            <text
              textAnchor="middle" y="4"
              style={{
                fontSize: '10px',
                fill: color,
                fontFamily: 'Share Tech Mono, monospace',
                fontWeight: 'bold',
                userSelect: 'none',
              }}
            >
              {symbol}
            </text>

            {/* Sub-label below hub */}
            <text
              textAnchor="middle" y="20"
              style={{
                fontSize: '6px',
                fill: color,
                fontFamily: 'Share Tech Mono, monospace',
                opacity: 0.8,
                paintOrder: 'stroke',
                stroke: 'rgba(0,0,0,0.9)',
                strokeWidth: '2px',
                userSelect: 'none',
              }}
            >
              {sub}
            </text>

            {/* Hub name (only when selected) */}
            {selected && (
              <text
                textAnchor="middle" y="-14"
                style={{
                  fontSize: '7px',
                  fill: 'white',
                  fontFamily: 'Share Tech Mono, monospace',
                  paintOrder: 'stroke',
                  stroke: 'rgba(0,0,0,0.95)',
                  strokeWidth: '2.5px',
                  userSelect: 'none',
                }}
              >
                {hub.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
