// lib/sim/range.ts
// Haversine distance + hub reach helpers.

const R_KM = 6371;

/** Haversine great-circle distance in kilometres between two [lng, lat] points. */
export function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_KM * 2 * Math.asin(Math.sqrt(a));
}

import type { MilitaryHub } from './military-hubs';

/**
 * Returns true if this hub can physically reach the target coordinates.
 * Also respects hub status — a disabled/destroyed hub cannot launch.
 */
export function canHubReachTarget(
  hub: MilitaryHub,
  targetPos: [number, number],
): boolean {
  if (!hub.canLaunch) return false;
  if (hub.status === 'disabled' || hub.status === 'destroyed') return false;
  return haversineKm(hub.pos, targetPos) <= hub.rangeKm;
}
