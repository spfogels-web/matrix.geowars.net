// lib/sim/launch-logic.ts
// Given a launching nation and a target position, return all eligible hubs.

import { GLOBAL_MILITARY_HUBS, type MilitaryHub, type HubType } from './military-hubs';
import { canHubReachTarget } from './range';

export interface LaunchOptions {
  /** Nation id of the attacking side (matches LEADER_COORDS keys). */
  attackerCountry: string;
  /** [lng, lat] of the target. */
  targetPos: [number, number];
  /** If provided, filter to hubs that support this specific type. */
  preferredTypes?: HubType[];
}

/**
 * Returns every hub that belongs to (or is allied with) the attacker
 * and can physically reach the target.
 *
 * Sorted by distance ascending so callers can easily pick the closest hub.
 */
export function getEligibleLaunchHubs(opts: LaunchOptions): MilitaryHub[] {
  const { attackerCountry, targetPos, preferredTypes } = opts;

  return GLOBAL_MILITARY_HUBS
    .filter(hub => {
      // Must be owned by or allied with the attacker
      const owned = hub.country === attackerCountry;
      const allied = (hub.allied ?? []).includes(attackerCountry);
      if (!owned && !allied) return false;

      // Must be able to reach the target
      if (!canHubReachTarget(hub, targetPos)) return false;

      // Optionally filter by hub type
      if (preferredTypes && preferredTypes.length > 0) {
        if (!preferredTypes.includes(hub.type)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by distance ascending (closest hub first)
      const [lng, lat] = targetPos;
      const distA = Math.abs(a.pos[0] - lng) + Math.abs(a.pos[1] - lat);
      const distB = Math.abs(b.pos[0] - lng) + Math.abs(b.pos[1] - lat);
      return distA - distB;
    });
}

/**
 * Pick the best single hub for a given attack.
 * Returns null if no eligible hub exists (attack should be blocked).
 */
export function pickLaunchHub(opts: LaunchOptions): MilitaryHub | null {
  const eligible = getEligibleLaunchHubs(opts);
  return eligible[0] ?? null;
}

/**
 * Quick boolean — does this nation have any hub that can reach this target?
 */
export function canNationStrike(
  attackerCountry: string,
  targetPos: [number, number],
  preferredTypes?: HubType[],
): boolean {
  return getEligibleLaunchHubs({ attackerCountry, targetPos, preferredTypes }).length > 0;
}
