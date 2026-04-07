'use client';
import L from 'leaflet';
import { useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type UnitKind = 'jet' | 'missile' | 'nuclear' | 'naval' | 'submarine' | 'troops' | 'bomb';

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
  hasBomb?: boolean;
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

// ── Unit silhouettes — all centered at (0,0), pointing UP ─────────────────────

/** F-22 Raptor style fighter jet — top-down, larger and more detailed */
function JetSilhouette({ color }: { color: string }) {
  return (
    <g>
      {/* Fuselage spine */}
      <path d="M0,-13 L1.5,-8 L2,0 L1.8,7 L0,10 L-1.8,7 L-2,0 L-1.5,-8 Z"
        fill={color} opacity={0.97}/>
      {/* Left swept delta wing — long chord */}
      <path d="M-2,-4 L-16,5 L-9,9 L-2,3 Z"
        fill={color} opacity={0.9}/>
      {/* Right swept delta wing */}
      <path d="M2,-4 L16,5 L9,9 L2,3 Z"
        fill={color} opacity={0.9}/>
      {/* Left leading-edge extension (LEX) */}
      <path d="M-1.5,-8 L-5,-2 L-2,-1 Z"
        fill={color} opacity={0.75}/>
      {/* Right LEX */}
      <path d="M1.5,-8 L5,-2 L2,-1 Z"
        fill={color} opacity={0.75}/>
      {/* Left tail fin */}
      <path d="M-1,6 L-5,11.5 L-3.5,12.5 L-1,8 Z"
        fill={color} opacity={0.82}/>
      {/* Right tail fin */}
      <path d="M1,6 L5,11.5 L3.5,12.5 L1,8 Z"
        fill={color} opacity={0.82}/>
      {/* Cockpit canopy — elongated teardrop */}
      <ellipse cx={0} cy={-6} rx={1.0} ry={2.8}
        fill="rgba(160,220,255,0.85)"/>
      {/* Engine nozzles (twin) */}
      <ellipse cx={-0.9} cy={10} rx={0.8} ry={1.0}
        fill="rgba(255,160,40,0.7)"/>
      <ellipse cx={0.9} cy={10} rx={0.8} ry={1.0}
        fill="rgba(255,160,40,0.7)"/>
      {/* Afterburner glow rings */}
      <ellipse cx={-0.9} cy={11.5} rx={0.55} ry={0.7}
        fill="rgba(255,80,0,0.45)"/>
      <ellipse cx={0.9} cy={11.5} rx={0.55} ry={0.7}
        fill="rgba(255,80,0,0.45)"/>
    </g>
  );
}

/** Nuclear submarine — top-down surfaced view */
function SubSilhouette({ color }: { color: string }) {
  return (
    <g>
      {/* Main pressure hull */}
      <path d="M-13,0 Q-10,-4.5 -1,-5 L1,-5 Q10,-4.5 14,0 Q10,4.5 1,5 L-1,5 Q-10,4.5 -13,0 Z"
        fill={color} opacity={0.85}/>
      {/* Stern cross rudder planes */}
      <path d="M11,-0.5 L15.5,-5 L16.5,-3.5 L12,0.5 Z" fill={color} opacity={0.75}/>
      <path d="M11,0.5 L15.5,5 L16.5,3.5 L12,-0.5 Z" fill={color} opacity={0.75}/>
      {/* Sail (conning tower) — forward of center */}
      <path d="M-1.5,-5 L-1.5,-10.5 Q0,-12 1.5,-10.5 L1.5,-5 Z"
        fill={color} opacity={0.95}/>
      <ellipse cx={0} cy={-10.5} rx={1.5} ry={1}
        fill={color} opacity={0.95}/>
      {/* Periscope */}
      <line x1={0.4} y1={-11} x2={0.4} y2={-14.5}
        stroke={color} strokeWidth={0.9} opacity={0.9}/>
      <line x1={0.4} y1={-14.5} x2={2.8} y2={-14.5}
        stroke={color} strokeWidth={0.9} opacity={0.8}/>
      {/* Hull highlight */}
      <path d="M-10,0 Q-3,-2.5 9,-0.8"
        fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={0.9}/>
    </g>
  );
}

/** Aircraft carrier — top-down view */
function CarrierSilhouette({ color }: { color: string }) {
  return (
    <g>
      {/* Hull */}
      <path d="M-15,-3 Q-17,0 -15,3 L15,3 Q17.5,0 15,-3 Z"
        fill={color} opacity={0.65}/>
      {/* Flight deck — wider, angled landing area */}
      <path d="M-14,-3 L15,-3 L15,-13 L-10,-13 L-14,-3 Z"
        fill={color} opacity={0.88}/>
      {/* Angled landing strip */}
      <line x1={-10} y1={-13} x2={-2} y2={-3}
        stroke="rgba(255,255,255,0.45)" strokeWidth={0.9}/>
      {/* Runway centerline */}
      <line x1={-12} y1={-8} x2={8} y2={-8}
        stroke="rgba(255,255,255,0.28)" strokeWidth={0.7} strokeDasharray="3,2"/>
      {/* Island superstructure */}
      <rect x={9} y={-13} width={4.5} height={4.5} rx={0.5}
        fill={color} opacity={1}/>
      {/* Island mast */}
      <line x1={11} y1={-13} x2={11} y2={-17}
        stroke={color} strokeWidth={0.9} opacity={0.85}/>
      {/* Bow wake */}
      <circle cx={17} cy={0} r={1} fill="white" opacity={0.3}/>
    </g>
  );
}

/** Missile — thin dart shape */
function MissileSilhouette({ color }: { color: string }) {
  return (
    <g>
      <path d="M0,-8 L1.5,2 L0,4 L-1.5,2 Z" fill={color} opacity={0.95}/>
      <path d="M-1.5,2 L-4,6 L0,4 L4,6 L1.5,2 Z" fill={color} opacity={0.8}/>
      <circle cx={0} cy={-8} r={1} fill="white" opacity={0.9}/>
      <ellipse cx={0} cy={4.5} rx={1} ry={1.5}
        fill="rgba(255,160,40,0.75)"/>
    </g>
  );
}

/** Nuclear ICBM — wider missile with re-entry cone */
function NuclearSilhouette({ color }: { color: string }) {
  return (
    <g>
      {/* Warhead cone */}
      <path d="M0,-10 L2,0 L-2,0 Z" fill="white" opacity={0.95}/>
      {/* Body */}
      <rect x={-2} y={0} width={4} height={7} rx={0.5}
        fill={color} opacity={0.95}/>
      {/* Fins */}
      <path d="M-2,4 L-5,8 L-2,7 Z" fill={color} opacity={0.85}/>
      <path d="M2,4 L5,8 L2,7 Z" fill={color} opacity={0.85}/>
      {/* Exhaust */}
      <ellipse cx={0} cy={7.5} rx={2} ry={2}
        fill="rgba(255,160,40,0.8)"/>
      <ellipse cx={0} cy={9} rx={1.2} ry={1.5}
        fill="rgba(255,80,0,0.6)"/>
    </g>
  );
}

/** Ground troops marker */
function TroopsSilhouette({ color }: { color: string }) {
  return (
    <g>
      <polygon points="0,-8 7,4 -7,4" fill={color} opacity={0.9}/>
      <polygon points="0,-5 4.5,2.5 -4.5,2.5" fill="rgba(255,255,255,0.35)"/>
    </g>
  );
}

/**
 * Classic falling bomb — teardrop body with stabilizer fins.
 * Points toward target (same rotation as other units).
 */
function BombSilhouette({ color }: { color: string }) {
  return (
    <g>
      {/* Main body — fat teardrop */}
      <path d="M0,-7 Q3.5,-5 3.5,1 Q3.5,5 0,7 Q-3.5,5 -3.5,1 Q-3.5,-5 0,-7 Z"
        fill={color} opacity={0.95}/>
      {/* Nose cone */}
      <path d="M0,-7 Q1,-10 0,-11 Q-1,-10 0,-7 Z"
        fill={color} opacity={0.85}/>
      {/* Tail — 4 stabilizer fins in X pattern */}
      <path d="M0,7 L-3.5,11 L-1.5,11 L0,8.5 Z" fill={color} opacity={0.8}/>
      <path d="M0,7 L3.5,11 L1.5,11 L0,8.5 Z"  fill={color} opacity={0.8}/>
      <path d="M0,7 L-2.5,10.5 L0,9 L2.5,10.5 Z" fill={color} opacity={0.6}/>
      {/* Nose glint */}
      <circle cx={0} cy={-9} r={0.7} fill="rgba(255,255,255,0.85)"/>
      {/* Belly stripe marking */}
      <path d="M-2.5,0 Q0,-1.5 2.5,0" fill="none"
        stroke="rgba(255,255,255,0.4)" strokeWidth={0.8}/>
    </g>
  );
}

/**
 * SVG overlay that renders in-flight units with realistic silhouettes
 * oriented in their direction of travel, plus explosion rings on impact.
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
        <filter id="ip-glow-bomb" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
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
          const isBomb = u.kind === 'bomb';
          const r  = (isBomb ? 14 : 10) + u.progress * (isBomb ? 80 : 60);
          const op = Math.max(0, 0.9 - u.progress);
          const bombColor = isBomb ? '#ff6a00' : u.color;
          return (
            <g key={u.id} filter={isBomb ? 'url(#ip-glow-bomb)' : 'url(#ip-glow-md)'}>
              <circle cx={ux} cy={uy} r={r}        fill="none"       stroke={bombColor} strokeWidth={isBomb?3.5:2.5} opacity={op}/>
              <circle cx={ux} cy={uy} r={r * 0.55} fill={bombColor}                                                  opacity={Math.max(0, 0.7 - u.progress)}/>
              <circle cx={ux} cy={uy} r={r * 0.8}  fill="none"       stroke={bombColor} strokeWidth={1.2}            opacity={Math.max(0, 0.45 - u.progress * 0.6)}/>
              <circle cx={ux} cy={uy} r={r * 1.4}  fill="none"       stroke={bombColor} strokeWidth={0.8}            opacity={Math.max(0, 0.28 - u.progress * 0.3)}/>
              {/* Hot white core */}
              <circle cx={ux} cy={uy} r={r * 0.22} fill="white"                                                     opacity={Math.max(0, 0.95 - u.progress * 2)}/>
              {/* Extra outer shockwave for bombs */}
              {isBomb && (
                <circle cx={ux} cy={uy} r={r * 1.8} fill="none" stroke="#ffaa00" strokeWidth={0.6} opacity={Math.max(0, 0.2 - u.progress * 0.25)}/>
              )}
            </g>
          );
        }

        // ── Compute heading angle from projected source → target ──────────
        const [x1, y1] = px(u.from[0], u.from[1]);
        const [x2, y2] = px(u.to[0],   u.to[1]);
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI) + 90;

        // Scale: carriers/subs larger, bombs slightly smaller
        const scale = (u.kind === 'naval' || u.kind === 'submarine') ? 1.1
                    : u.kind === 'bomb' ? 0.85
                    : 1.0;

        // ── Jet contrail — fading trail segments behind the unit ──────────
        const contrail = (u.kind === 'jet') ? (() => {
          const segs = 5;
          const lines = [];
          for (let s = 0; s < segs; s++) {
            const t1 = Math.max(0, t - 0.05 * (segs - s));
            const t2 = Math.max(0, t - 0.05 * (segs - s - 1));
            if (t1 === t2) continue;
            const [cx1, cy1] = px(lerp(u.from[0], u.to[0], easeInOut(t1)), lerp(u.from[1], u.to[1], easeInOut(t1)));
            const [cx2, cy2] = px(lerp(u.from[0], u.to[0], easeInOut(t2)), lerp(u.from[1], u.to[1], easeInOut(t2)));
            const alpha = (s / segs) * 0.45;
            lines.push(
              <line key={s} x1={cx1} y1={cy1} x2={cx2} y2={cy2}
                stroke="rgba(255,255,255,0.9)" strokeWidth={1.0}
                opacity={alpha}
                strokeLinecap="round"/>
            );
          }
          return lines;
        })() : null;

        return (
          <g key={u.id}>
            {/* Contrail drawn behind the silhouette */}
            {contrail}

            <g transform={`translate(${ux},${uy}) rotate(${angle}) scale(${scale})`}
              filter="url(#ip-glow-sm)">

              {u.kind === 'jet'       && <JetSilhouette      color={u.color}/>}
              {u.kind === 'missile'   && <MissileSilhouette  color={u.color}/>}
              {u.kind === 'nuclear'   && <NuclearSilhouette  color={u.color}/>}
              {u.kind === 'naval'     && <CarrierSilhouette  color={u.color}/>}
              {u.kind === 'submarine' && <SubSilhouette      color={u.color}/>}
              {u.kind === 'troops'    && <TroopsSilhouette   color={u.color}/>}
              {u.kind === 'bomb'      && <BombSilhouette     color={u.color}/>}

              {/* Origin label — rotated back to horizontal (jets + naval only) */}
              {(u.kind === 'jet' || u.kind === 'naval') && u.originLabel && (
                <g transform={`rotate(${-angle})`}>
                  <text
                    textAnchor="middle" y={26}
                    style={{
                      fontSize: '7px', fill: 'rgba(255,255,255,0.7)',
                      fontFamily: 'Share Tech Mono, monospace',
                      paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.9)', strokeWidth: '2px',
                    }}
                  >
                    {u.originLabel}
                  </text>
                </g>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
