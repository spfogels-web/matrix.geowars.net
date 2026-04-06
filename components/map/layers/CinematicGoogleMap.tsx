'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { GeoEvent } from '@/lib/engine/types';
import { LEADER_COORDS, REGION_COORDS } from '@/lib/engine/mapConstants';

// ── Constants ─────────────────────────────────────────────────────────────────
const SCRIPT_ID      = 'gm-cinematic-api';
const AUTO_CLOSE_S   = 22;
// City-level zoom per event type
const TARGET_ZOOM: Record<string, number> = {
  nuclear:    9,
  military:  11,
  cyber:     10,
  default:   11,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolveLatLng(ev: GeoEvent): [number, number] {
  if (ev.lat != null && ev.lng != null) return [ev.lat, ev.lng];
  const lid  = ev.affectedLeaders[0];
  const c    = LEADER_COORDS[lid] || REGION_COORDS[ev.region] || [0, 20];
  return [c[1], c[0]]; // [lat, lng]
}

function eventColor(type: string): string {
  switch (type) {
    case 'nuclear':     return '#ff2d55';
    case 'military':    return '#ff6a00';
    case 'cyber':       return '#00f5ff';
    case 'economic':    return '#ffd700';
    case 'diplomatic':  return '#b44fff';
    default:            return '#00f5ff';
  }
}

function eventIcon(type: string): string {
  switch (type) {
    case 'nuclear':    return '☢';
    case 'military':   return '⚡';
    case 'cyber':      return '⟳';
    case 'diplomatic': return '◈';
    default:           return '⚠';
  }
}

function sevLabel(impact: number): string {
  if (impact >= 9) return 'CATASTROPHIC';
  if (impact >= 7) return 'CRITICAL';
  return 'SIGNIFICANT';
}

// ── Reticle SVG (used in fallback and on-map overlay) ────────────────────────
function Reticle({ color, size = 100 }: { color: string; size?: number }) {
  const c = size / 2;
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Outer dashed ring */}
      <circle cx={c} cy={c} r={c * 0.88} fill="none" stroke={color} strokeWidth="1"
        strokeOpacity="0.35" strokeDasharray="10,7"
        style={{ animation: 'reticle-spin 5s linear infinite', transformOrigin: `${c}px ${c}px` }} />
      {/* Mid ring */}
      <circle cx={c} cy={c} r={c * 0.6} fill="none" stroke={color} strokeWidth="1.5"
        strokeOpacity="0.55"
        style={{ animation: 'reticle-pulse 1s ease-in-out infinite' }} />
      {/* Inner ring */}
      <circle cx={c} cy={c} r={c * 0.32} fill="none" stroke={color} strokeWidth="1"
        strokeOpacity="0.45" />
      {/* Core dot */}
      <circle cx={c} cy={c} r={c * 0.1} fill={color}
        style={{ animation: 'reticle-pulse 0.9s ease-in-out infinite' }} />
      {/* Crosshair arms */}
      {([ [-1,0],[1,0],[0,-1],[0,1] ] as [number,number][]).map(([dx, dy], i) => (
        <line key={i}
          x1={c + dx * c * 0.38} y1={c + dy * c * 0.38}
          x2={c + dx * c * 0.82} y2={c + dy * c * 0.82}
          stroke={color} strokeWidth="1.5" strokeOpacity="0.65" />
      ))}
    </svg>
  );
}

// ── Fallback view (no API key) ────────────────────────────────────────────────
function FallbackView({ ev, lat, lng }: { ev: GeoEvent; lat: number; lng: number }) {
  const color = eventColor(ev.type);
  const icon  = eventIcon(ev.type);
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'radial-gradient(ellipse at 50% 40%, #0d1f3a 0%, #020818 80%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 18, padding: 40,
    }}>
      {/* Reticle */}
      <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
        <Reticle color={color} size={120} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, lineHeight: 1,
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontFamily: 'Share Tech Mono, monospace', color,
        fontSize: 13, letterSpacing: '0.32em', textAlign: 'center',
      }}>
        SATELLITE FEED OFFLINE
      </div>

      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        color: 'rgba(255,255,255,0.82)',
        fontSize: 14, textAlign: 'center', maxWidth: 520, lineHeight: 1.65,
      }}>
        {ev.title}
      </div>

      {ev.description && (
        <div style={{
          fontFamily: 'Share Tech Mono, monospace',
          color: 'rgba(255,255,255,0.38)',
          fontSize: 10, textAlign: 'center', maxWidth: 440, lineHeight: 1.6,
        }}>
          {ev.description.length > 160 ? ev.description.slice(0, 160) + '…' : ev.description}
        </div>
      )}

      <div style={{
        fontFamily: 'Share Tech Mono, monospace', color: `${color}70`,
        fontSize: 10, letterSpacing: '0.14em', textAlign: 'center',
      }}>
        📍 {[ev.cityName, ev.countryName, ev.region].filter(Boolean).join(' · ')}
      </div>

      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        color: `${color}40`, fontSize: 9, letterSpacing: '0.12em', textAlign: 'center',
      }}>
        LAT {lat >= 0 ? '+' : ''}{lat.toFixed(4)}° · LNG {lng >= 0 ? '+' : ''}{lng.toFixed(4)}°
      </div>

      <div style={{
        marginTop: 4, padding: '7px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 6,
        fontFamily: 'Share Tech Mono, monospace',
        color: 'rgba(255,255,255,0.22)',
        fontSize: 9, letterSpacing: '0.18em', textAlign: 'center',
      }}>
        SET NEXT_PUBLIC_GOOGLE_MAPS_API_KEY TO ENABLE SATELLITE VIEW
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  event: GeoEvent;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CinematicGoogleMap({ event: ev, onClose }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<any>(null);

  const [phase,     setPhase]     = useState<'loading' | 'live' | 'closing'>('loading');
  const [countdown, setCountdown] = useState(AUTO_CLOSE_S);

  const [lat, lng] = resolveLatLng(ev);
  const apiKey     = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const color      = eventColor(ev.type);
  const icon       = eventIcon(ev.type);
  const sev        = sevLabel(ev.impact);
  const targetZoom = TARGET_ZOOM[ev.type] ?? TARGET_ZOOM.default;

  // ── Close ─────────────────────────────────────────────────────────────────
  const close = useCallback(() => {
    setPhase('closing');
    setTimeout(onClose, 380);
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [close]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { close(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, close]);

  // ── Google Maps init ──────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapDivRef.current) return;
    const g: any = (window as any).google;
    if (!g?.maps) return;

    // Start zoomed out, then animate to city level
    const map = new g.maps.Map(mapDivRef.current, {
      center:           { lat, lng },
      zoom:             3,
      mapTypeId:        'satellite',
      disableDefaultUI: true,
      gestureHandling:  'none',   // read-only cinematic
      keyboardShortcuts: false,
      mapTypeControl:   false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapRef.current = map;

    // Target marker
    new g.maps.Marker({
      position: { lat, lng },
      map,
      icon: {
        path:         g.maps.SymbolPath.CIRCLE,
        scale:        14,
        fillColor:    color,
        fillOpacity:  0.88,
        strokeColor:  '#ffffff',
        strokeWeight: 2.5,
      },
      animation: g.maps.Animation.DROP,
      title:     ev.cityName || ev.region || 'TARGET',
    });

    setPhase('live');

    // Cinematic zoom-in: ease from zoom 3 → targetZoom in ~300ms steps
    let z = 3;
    const zoomTimer = setInterval(() => {
      z += 1;
      map.setZoom(z);
      if (z >= targetZoom) clearInterval(zoomTimer);
    }, 280);
  }, [lat, lng, color, ev.cityName, ev.region, targetZoom]);

  // ── Script loader ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!apiKey) {
      setPhase('live');   // show fallback immediately
      return;
    }

    // Already loaded by a previous mount
    if ((window as any).google?.maps) {
      initMap();
      return;
    }

    // Script tag injected but still loading — poll
    if (document.getElementById(SCRIPT_ID)) {
      const poll = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(poll); initMap(); }
      }, 80);
      return () => clearInterval(poll);
    }

    // First load
    const s = document.createElement('script');
    s.id    = SCRIPT_ID;
    s.src   = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    s.async = true;
    s.onload = initMap;
    document.head.appendChild(s);
  // initMap is stable (useCallback with dep array); safe in deps
  }, [apiKey, initMap]);

  // ── Progress bar width for countdown ─────────────────────────────────────
  const progressPct = (countdown / AUTO_CLOSE_S) * 100;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="absolute inset-0"
      style={{
        zIndex:         810,
        display:        'flex',
        flexDirection:  'column',
        background:     '#020818',
        opacity:        phase === 'closing' ? 0 : 1,
        transition:     'opacity 0.38s ease',
        // Prevent pointer events leaking to Leaflet while open
        pointerEvents:  phase === 'closing' ? 'none' : 'all',
      }}
    >
      {/* ── Header bar ────────────────────────────────────────────────────── */}
      <div style={{
        height:       58,
        flexShrink:   0,
        padding:      '0 16px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        background:   'rgba(0,0,0,0.97)',
        borderBottom: `2px solid ${color}`,
        boxShadow:    `0 2px 28px ${color}28`,
      }}>
        {/* Live blink */}
        <span style={{
          display:      'inline-block',
          width:        9, height: 9,
          borderRadius: '50%',
          background:   color,
          boxShadow:    `0 0 8px ${color}`,
          animation:    'reticle-pulse 0.9s ease-in-out infinite',
          flexShrink:   0,
        }} />

        {/* Event info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:    'Share Tech Mono, monospace',
            color,
            fontSize:      10,
            letterSpacing: '0.28em',
            marginBottom:  3,
          }}>
            {icon} SATELLITE FEED ACTIVE · {sev} · IMPACT {ev.impact}/10
          </div>
          <div style={{
            fontFamily:   'Share Tech Mono, monospace',
            color:        '#ffffff',
            fontSize:     13,
            letterSpacing: '0.03em',
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}>
            {ev.title}
          </div>
        </div>

        {/* Countdown */}
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'flex-end',
          gap:           4,
          flexShrink:    0,
        }}>
          <span style={{
            fontFamily:    'Share Tech Mono, monospace',
            color:         `${color}70`,
            fontSize:      10,
            letterSpacing: '0.1em',
            whiteSpace:    'nowrap',
          }}>
            AUTO-CLOSE {countdown}s
          </span>
          {/* Progress bar */}
          <div style={{
            width:        90, height: 2,
            background:   'rgba(255,255,255,0.1)',
            borderRadius: 1, overflow: 'hidden',
          }}>
            <div style={{
              height:           '100%',
              width:            `${progressPct}%`,
              background:       color,
              transition:       'width 1s linear',
              borderRadius:     1,
            }} />
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={close}
          style={{
            fontFamily:    'Share Tech Mono, monospace',
            fontSize:      11,
            letterSpacing: '0.1em',
            cursor:        'pointer',
            background:    'rgba(255,255,255,0.06)',
            border:        '1px solid rgba(255,255,255,0.16)',
            borderRadius:  6,
            color:         'rgba(255,255,255,0.85)',
            padding:       '6px 14px',
            flexShrink:    0,
            transition:    'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background    = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background    = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor   = 'rgba(255,255,255,0.16)';
          }}
        >
          ✕ CLOSE [ESC]
        </button>
      </div>

      {/* ── Map viewport ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {apiKey ? (
          <>
            {/* Google Map canvas */}
            <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

            {/* Scanlines overlay */}
            <div style={{
              position:        'absolute', inset: 0,
              pointerEvents:   'none', zIndex: 2,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.045) 2px, rgba(0,0,0,0.045) 4px)',
            }} />

            {/* Vignette */}
            <div style={{
              position:      'absolute', inset: 0,
              pointerEvents: 'none', zIndex: 2,
              background:    'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)',
            }} />

            {/* HUD corner brackets */}
            {(['tl','tr','bl','br'] as const).map(c => (
              <div key={c} style={{
                position:     'absolute', zIndex: 3,
                width:        44, height: 44,
                pointerEvents: 'none',
                top:          c[0] === 't' ? 10  : undefined,
                bottom:       c[0] === 'b' ? 10  : undefined,
                left:         c[1] === 'l' ? 10  : undefined,
                right:        c[1] === 'r' ? 10  : undefined,
                borderTop:    c[0] === 't' ? `2px solid ${color}80` : undefined,
                borderBottom: c[0] === 'b' ? `2px solid ${color}80` : undefined,
                borderLeft:   c[1] === 'l' ? `2px solid ${color}80` : undefined,
                borderRight:  c[1] === 'r' ? `2px solid ${color}80` : undefined,
              }} />
            ))}

            {/* Animated target crosshair (on map, centre area) */}
            {phase === 'live' && (
              <div style={{
                position:      'absolute', top: '50%', left: '50%',
                transform:     'translate(-50%, -50%)',
                zIndex:        4, pointerEvents: 'none',
                opacity:       0.4,
              }}>
                <Reticle color={color} size={80} />
              </div>
            )}

            {/* Loading overlay */}
            {phase === 'loading' && (
              <div style={{
                position:       'absolute', inset: 0, zIndex: 10,
                background:     'rgba(2,8,24,0.9)',
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            16,
              }}>
                <Reticle color={color} size={80} />
                <div style={{
                  fontFamily:    'Share Tech Mono, monospace',
                  color,
                  fontSize:      12,
                  letterSpacing: '0.38em',
                }}>
                  ACQUIRING FEED…
                </div>
                <div style={{
                  width:        220, height: 2,
                  background:   'rgba(255,255,255,0.08)',
                  borderRadius: 1, overflow: 'hidden',
                }}>
                  <div style={{
                    height:          '100%',
                    background:      color,
                    transformOrigin: 'left',
                    animation:       'shrink-bar 4s linear forwards',
                  }} />
                </div>
              </div>
            )}

            {/* Event info card — bottom-left */}
            {phase === 'live' && (
              <div style={{
                position:      'absolute', bottom: 16, left: 16, zIndex: 5,
                background:    'rgba(0,0,0,0.91)',
                border:        `1px solid ${color}55`,
                borderRadius:  8,
                padding:       '10px 14px',
                backdropFilter: 'blur(14px)',
                maxWidth:       340,
                boxShadow:     `0 4px 24px rgba(0,0,0,0.8), 0 0 12px ${color}18`,
              }}>
                {/* Type tag */}
                <div style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           6,
                  fontFamily:    'Share Tech Mono, monospace',
                  color,
                  fontSize:      9,
                  letterSpacing: '0.24em',
                  marginBottom:  5,
                }}>
                  <span style={{
                    display:      'inline-block',
                    width:        6, height: 6,
                    borderRadius: '50%',
                    background:   color,
                    animation:    'reticle-pulse 0.9s ease-in-out infinite',
                  }} />
                  {icon} {ev.type.toUpperCase()} · IMPACT {ev.impact}/10
                </div>

                {/* Title */}
                <div style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  color:      '#ffffff',
                  fontSize:   12,
                  lineHeight: 1.5,
                }}>
                  {ev.title}
                </div>

                {/* Description */}
                {ev.description && (
                  <div style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    color:      'rgba(255,255,255,0.42)',
                    fontSize:   10,
                    lineHeight: 1.45,
                    marginTop:  5,
                  }}>
                    {ev.description.length > 120
                      ? ev.description.slice(0, 120) + '…'
                      : ev.description}
                  </div>
                )}

                {/* Location */}
                {(ev.cityName || ev.countryName) && (
                  <div style={{
                    fontFamily:    'Share Tech Mono, monospace',
                    color:         `${color}80`,
                    fontSize:      9,
                    marginTop:     6,
                    letterSpacing: '0.1em',
                  }}>
                    📍 {[ev.cityName, ev.countryName].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Coordinates — bottom-right */}
            {phase === 'live' && (
              <div style={{
                position:      'absolute', bottom: 16, right: 16, zIndex: 5,
                fontFamily:    'Share Tech Mono, monospace',
                color:         `${color}65`,
                fontSize:      9,
                letterSpacing: '0.12em',
                textAlign:     'right',
                lineHeight:    1.9,
              }}>
                <div>LAT {lat >= 0 ? '+' : ''}{lat.toFixed(4)}°</div>
                <div>LNG {lng >= 0 ? '+' : ''}{lng.toFixed(4)}°</div>
                <div style={{ color: `${color}35`, marginTop: 1 }}>SIM COORD</div>
              </div>
            )}

            {/* Type label — top-right watermark */}
            {phase === 'live' && (
              <div style={{
                position:      'absolute', top: 16, right: 16, zIndex: 5,
                fontFamily:    'Share Tech Mono, monospace',
                color:         `${color}55`,
                fontSize:      9,
                letterSpacing: '0.22em',
                textAlign:     'right',
              }}>
                ◉ LIVE · {ev.type.toUpperCase()}
              </div>
            )}
          </>
        ) : (
          <FallbackView ev={ev} lat={lat} lng={lng} />
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div style={{
        height:      28,
        flexShrink:  0,
        padding:     '0 14px',
        display:     'flex',
        alignItems:  'center',
        background:  'rgba(0,0,0,0.97)',
        borderTop:   `1px solid ${color}22`,
        gap:         8,
      }}>
        <span style={{
          fontFamily:    'Share Tech Mono, monospace',
          color:         `${color}38`,
          fontSize:      8,
          letterSpacing: '0.22em',
          flex:          1,
        }}>
          GEOWARS MATRIX · SATELLITE INTELLIGENCE FEED · SIMULATION ONLY · NOT REAL IMAGERY
        </span>
        <span style={{
          fontFamily:    'Share Tech Mono, monospace',
          color:         `${color}38`,
          fontSize:      8,
          letterSpacing: '0.14em',
          whiteSpace:    'nowrap',
        }}>
          {new Date(ev.timestamp).toUTCString().slice(0, 25).toUpperCase()} UTC
        </span>
      </div>
    </div>
  );
}
