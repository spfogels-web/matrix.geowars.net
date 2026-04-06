'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeoEvent } from '@/lib/engine/types';
import { LEADER_COORDS, REGION_COORDS } from '@/lib/engine/mapConstants';

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  /** Latest events array — index 0 is the newest event. */
  events: GeoEvent[];
  isRunning: boolean;
  map: L.Map;
  /**
   * When set, the map flies to this event's location regardless of impact
   * threshold (used by the crisis log "focus" button).
   */
  focusedEvent?: GeoEvent | null;
}

/**
 * Render-nothing controller.
 * Handles all Leaflet flyTo / flyToBounds logic so WorldMapLeaflet
 * doesn't need to own pan state.
 *
 * Two sources of focus:
 *   1. `focusedEvent` — explicit user selection from outside the map.
 *   2. Auto-pan   — any new event with impact ≥ 7, at most once per 20 s.
 */
export default function EventFocusController({ events, isRunning, map, focusedEvent }: Props) {
  const lastPanTimeRef = useRef(0);
  const lastEvIdRef    = useRef<string | null>(null);
  // Track the return-home timeout so we can cancel if a newer event fires
  const returnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. External focus (crisis-log selection) ──────────────────────────────
  useEffect(() => {
    if (!focusedEvent) return;
    const lid = focusedEvent.affectedLeaders[0];
    const raw = (focusedEvent.lat != null && focusedEvent.lng != null)
      ? [focusedEvent.lng, focusedEvent.lat]
      : (LEADER_COORDS[lid] || REGION_COORDS[focusedEvent.region] || [0, 20]);
    const zoom = focusedEvent.impact >= 9 ? 7 : focusedEvent.impact >= 7 ? 6 : 5;
    map.flyTo(L.latLng(raw[1], raw[0]), zoom, { duration: 2.2, easeLinearity: 0.25 });
  }, [focusedEvent, map]);

  // ── 2. Auto-pan on high-impact events ────────────────────────────────────
  useEffect(() => {
    if (!isRunning || events.length === 0) return;
    const ev = events[0];
    if (ev.id === lastEvIdRef.current) return;
    lastEvIdRef.current = ev.id;

    if (ev.impact < 7) return;

    const now = Date.now();
    if (now - lastPanTimeRef.current <= 20_000) return;
    lastPanTimeRef.current = now;

    const originLid = ev.affectedLeaders[0];
    const origin = (LEADER_COORDS[originLid]
      || REGION_COORDS[ev.region]
      || REGION_COORDS['Global']) as [number, number];

    const targetLid = ev.affectedLeaders[1];
    const dest = (targetLid
      ? (LEADER_COORDS[targetLid] || REGION_COORDS[ev.region] || origin)
      : (REGION_COORDS[ev.region] || origin)) as [number, number];

    const originLL = L.latLng(origin[1], origin[0]);
    const destLL   = L.latLng(dest[1],   dest[0]);
    const samePoint = originLL.distanceTo(destLL) < 500_000; // < 500 km

    if (samePoint) {
      map.flyTo(destLL, ev.impact >= 9 ? 7 : 6, { duration: 3, easeLinearity: 0.2 });
    } else {
      map.flyToBounds(L.latLngBounds([originLL, destLL]), {
        padding:  [60, 60],
        maxZoom:  ev.impact >= 9 ? 7 : 6,
        duration: 3,
        easeLinearity: 0.2,
      });
    }

    // Cancel any previous return timer before scheduling a new one
    if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
    returnTimerRef.current = setTimeout(() => {
      map.flyTo(L.latLng(35, 30), 4, { duration: 4, easeLinearity: 0.25 });
    }, 16_000);
  // events.length changes on every new event; re-evaluate only then
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, isRunning, map]);

  // Clean up return timer on unmount
  useEffect(() => () => {
    if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
  }, []);

  return null;
}
