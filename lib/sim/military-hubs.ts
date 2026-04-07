// lib/sim/military-hubs.ts
// Fictional theater-level military hub data for GeoWars Matrix.
// All coordinates are [lng, lat].

export type HubType =
  | 'airbase'        // Triangle icon — jets, bombers, fighters
  | 'naval_base'     // Anchor icon — carriers, destroyers
  | 'missile_silo'   // Hexagon icon — ICBMs, cruise missiles
  | 'submarine_pen'  // Submarine icon — nuclear/attack subs
  | 'carrier_group'  // Moving ship icon — carrier strike group
  | 'cyber_node'     // Pulse icon — cyber operations
  | 'defense_grid';  // Shield icon — SAM, missile defense

export type Domain = 'air' | 'sea' | 'land' | 'cyber' | 'nuclear' | 'space';

export type HubStatus = 'active' | 'alert' | 'standby' | 'disabled' | 'destroyed';

export interface MilitaryHub {
  id: string;
  name: string;
  country: string;          // owner nation id (matches LEADER_COORDS keys)
  type: HubType;
  domains: Domain[];
  pos: [number, number];    // [lng, lat] current position
  basePos: [number, number]; // [lng, lat] home position (for carriers that move)
  rangeKm: number;           // effective strike range from this hub
  status: HubStatus;
  canLaunch: boolean;        // currently able to launch offensive action
  theater: string;           // broad geo-theater label
  allied?: string[];         // nation ids that may use this hub
  moving?: boolean;          // true for carrier groups
}

// ── USA HUBS ─────────────────────────────────────────────────────────────────
export const USA_HUBS: MilitaryHub[] = [
  {
    id: 'usa-airbase-ramstein',
    name: 'Ramstein Air Base',
    country: 'usa',
    type: 'airbase',
    domains: ['air'],
    pos: [7.6, 49.4], basePos: [7.6, 49.4],
    rangeKm: 3200,
    status: 'active', canLaunch: true,
    theater: 'Europe',
    allied: ['uk', 'france', 'germany', 'nato'],
  },
  {
    id: 'usa-airbase-incirlik',
    name: 'İncirlik Air Base',
    country: 'usa',
    type: 'airbase',
    domains: ['air', 'nuclear'],
    pos: [35.4, 37.0], basePos: [35.4, 37.0],
    rangeKm: 2800,
    status: 'active', canLaunch: true,
    theater: 'Middle East',
    allied: ['turkey', 'nato'],
  },
  {
    id: 'usa-airbase-diego-garcia',
    name: 'Diego Garcia',
    country: 'usa',
    type: 'airbase',
    domains: ['air', 'sea'],
    pos: [72.4, -7.3], basePos: [72.4, -7.3],
    rangeKm: 5500,
    status: 'active', canLaunch: true,
    theater: 'Indian Ocean',
    allied: ['uk'],
  },
  {
    id: 'usa-airbase-kadena',
    name: 'Kadena Air Base',
    country: 'usa',
    type: 'airbase',
    domains: ['air'],
    pos: [127.8, 26.4], basePos: [127.8, 26.4],
    rangeKm: 3000,
    status: 'active', canLaunch: true,
    theater: 'Asia-Pacific',
    allied: ['japan'],
  },
  {
    id: 'usa-naval-norfolk',
    name: 'NAS Norfolk',
    country: 'usa',
    type: 'naval_base',
    domains: ['sea', 'air'],
    pos: [-76.3, 36.9], basePos: [-76.3, 36.9],
    rangeKm: 8000,
    status: 'active', canLaunch: true,
    theater: 'Atlantic',
  },
  {
    id: 'usa-naval-pearl-harbor',
    name: 'Pearl Harbor',
    country: 'usa',
    type: 'naval_base',
    domains: ['sea', 'air'],
    pos: [-157.9, 21.4], basePos: [-157.9, 21.4],
    rangeKm: 7000,
    status: 'active', canLaunch: true,
    theater: 'Pacific',
  },
  {
    id: 'usa-silo-minuteman',
    name: 'Minuteman Silo Complex',
    country: 'usa',
    type: 'missile_silo',
    domains: ['nuclear', 'land'],
    pos: [-104.0, 47.5], basePos: [-104.0, 47.5],
    rangeKm: 13000,
    status: 'active', canLaunch: true,
    theater: 'Continental USA',
  },
  {
    id: 'usa-carrier-csg1',
    name: 'CSG-1 (Pacific)',
    country: 'usa',
    type: 'carrier_group',
    domains: ['sea', 'air'],
    pos: [140.0, 20.0], basePos: [140.0, 20.0],
    rangeKm: 1500,
    status: 'active', canLaunch: true,
    theater: 'Asia-Pacific',
    moving: true,
  },
  {
    id: 'usa-carrier-csg5',
    name: 'CSG-5 (Middle East)',
    country: 'usa',
    type: 'carrier_group',
    domains: ['sea', 'air'],
    pos: [55.0, 24.0], basePos: [55.0, 24.0],
    rangeKm: 1500,
    status: 'active', canLaunch: true,
    theater: 'Persian Gulf',
    moving: true,
  },
  {
    id: 'usa-sub-pen-bremerton',
    name: 'SUBASE Bangor',
    country: 'usa',
    type: 'submarine_pen',
    domains: ['sea', 'nuclear'],
    pos: [-122.7, 47.8], basePos: [-122.7, 47.8],
    rangeKm: 12000,
    status: 'active', canLaunch: true,
    theater: 'Pacific',
  },
  {
    id: 'usa-cyber-fort-meade',
    name: 'Cyber Command HQ',
    country: 'usa',
    type: 'cyber_node',
    domains: ['cyber'],
    pos: [-76.7, 39.1], basePos: [-76.7, 39.1],
    rangeKm: 20000,
    status: 'active', canLaunch: true,
    theater: 'Global',
  },
];

// ── RUSSIA HUBS ───────────────────────────────────────────────────────────────
export const RUSSIA_HUBS: MilitaryHub[] = [
  {
    id: 'rus-airbase-khmeimim',
    name: 'Khmeimim Air Base',
    country: 'russia',
    type: 'airbase',
    domains: ['air'],
    pos: [35.9, 35.4], basePos: [35.9, 35.4],
    rangeKm: 2500,
    status: 'active', canLaunch: true,
    theater: 'Middle East',
  },
  {
    id: 'rus-airbase-engels',
    name: 'Engels-2 Strategic Base',
    country: 'russia',
    type: 'airbase',
    domains: ['air', 'nuclear'],
    pos: [46.2, 51.4], basePos: [46.2, 51.4],
    rangeKm: 8000,
    status: 'active', canLaunch: true,
    theater: 'Eastern Europe',
  },
  {
    id: 'rus-naval-sevastopol',
    name: 'Sevastopol Naval Base',
    country: 'russia',
    type: 'naval_base',
    domains: ['sea'],
    pos: [33.5, 44.6], basePos: [33.5, 44.6],
    rangeKm: 3000,
    status: 'alert', canLaunch: true,
    theater: 'Black Sea',
  },
  {
    id: 'rus-naval-tartus',
    name: 'Tartus Naval Base',
    country: 'russia',
    type: 'naval_base',
    domains: ['sea'],
    pos: [35.9, 34.9], basePos: [35.9, 34.9],
    rangeKm: 2000,
    status: 'active', canLaunch: true,
    theater: 'Mediterranean',
  },
  {
    id: 'rus-silo-kozelsk',
    name: 'Kozelsk ICBM Complex',
    country: 'russia',
    type: 'missile_silo',
    domains: ['nuclear'],
    pos: [35.8, 54.0], basePos: [35.8, 54.0],
    rangeKm: 14000,
    status: 'active', canLaunch: true,
    theater: 'Russia',
  },
  {
    id: 'rus-silo-dombarovsky',
    name: 'Dombarovsky Silo Field',
    country: 'russia',
    type: 'missile_silo',
    domains: ['nuclear'],
    pos: [59.5, 51.1], basePos: [59.5, 51.1],
    rangeKm: 14000,
    status: 'active', canLaunch: true,
    theater: 'Russia',
  },
  {
    id: 'rus-sub-gadzhievo',
    name: 'Gadzhievo Sub Base',
    country: 'russia',
    type: 'submarine_pen',
    domains: ['sea', 'nuclear'],
    pos: [32.5, 69.3], basePos: [32.5, 69.3],
    rangeKm: 11000,
    status: 'active', canLaunch: true,
    theater: 'Arctic',
  },
  {
    id: 'rus-cyber-gru-node',
    name: 'GRU Cyber Operations',
    country: 'russia',
    type: 'cyber_node',
    domains: ['cyber'],
    pos: [37.6, 55.8], basePos: [37.6, 55.8],
    rangeKm: 20000,
    status: 'active', canLaunch: true,
    theater: 'Global',
  },
];

// ── CHINA HUBS ────────────────────────────────────────────────────────────────
export const CHINA_HUBS: MilitaryHub[] = [
  {
    id: 'chn-airbase-lhasa',
    name: 'Lhasa Gonggar Air Base',
    country: 'china',
    type: 'airbase',
    domains: ['air'],
    pos: [91.0, 29.3], basePos: [91.0, 29.3],
    rangeKm: 2500,
    status: 'active', canLaunch: true,
    theater: 'South Asia',
  },
  {
    id: 'chn-airbase-shenyang',
    name: 'Shenyang Air Command',
    country: 'china',
    type: 'airbase',
    domains: ['air'],
    pos: [123.4, 41.8], basePos: [123.4, 41.8],
    rangeKm: 2800,
    status: 'active', canLaunch: true,
    theater: 'Northeast Asia',
  },
  {
    id: 'chn-naval-sanya',
    name: 'Yulin Naval Base',
    country: 'china',
    type: 'naval_base',
    domains: ['sea', 'nuclear'],
    pos: [109.5, 18.2], basePos: [109.5, 18.2],
    rangeKm: 4000,
    status: 'active', canLaunch: true,
    theater: 'South China Sea',
  },
  {
    id: 'chn-naval-zhanjiang',
    name: 'Zhanjiang Naval Base',
    country: 'china',
    type: 'naval_base',
    domains: ['sea'],
    pos: [110.4, 21.2], basePos: [110.4, 21.2],
    rangeKm: 3500,
    status: 'active', canLaunch: true,
    theater: 'South China Sea',
  },
  {
    id: 'chn-silo-delingha',
    name: 'Delingha Missile Base',
    country: 'china',
    type: 'missile_silo',
    domains: ['nuclear'],
    pos: [97.4, 37.4], basePos: [97.4, 37.4],
    rangeKm: 12000,
    status: 'active', canLaunch: true,
    theater: 'China',
  },
  {
    id: 'chn-carrier-liaoning-grp',
    name: 'Liaoning CSG',
    country: 'china',
    type: 'carrier_group',
    domains: ['sea', 'air'],
    pos: [122.0, 25.0], basePos: [122.0, 25.0],
    rangeKm: 1200,
    status: 'active', canLaunch: true,
    theater: 'Taiwan Strait',
    moving: true,
  },
  {
    id: 'chn-sub-jianggezhuang',
    name: 'Jianggezhuang Sub Base',
    country: 'china',
    type: 'submarine_pen',
    domains: ['sea', 'nuclear'],
    pos: [120.7, 36.1], basePos: [120.7, 36.1],
    rangeKm: 9000,
    status: 'active', canLaunch: true,
    theater: 'Pacific',
  },
  {
    id: 'chn-cyber-pla-unit61398',
    name: 'PLA Cyber Operations',
    country: 'china',
    type: 'cyber_node',
    domains: ['cyber'],
    pos: [121.5, 31.2], basePos: [121.5, 31.2],
    rangeKm: 20000,
    status: 'active', canLaunch: true,
    theater: 'Global',
  },
];

// ── UK / NATO HUBS ────────────────────────────────────────────────────────────
export const UK_NATO_HUBS: MilitaryHub[] = [
  {
    id: 'uk-airbase-akrotiri',
    name: 'RAF Akrotiri',
    country: 'uk',
    type: 'airbase',
    domains: ['air'],
    pos: [32.9, 34.6], basePos: [32.9, 34.6],
    rangeKm: 2800,
    status: 'active', canLaunch: true,
    theater: 'Middle East',
    allied: ['nato', 'usa'],
  },
  {
    id: 'uk-sub-faslane',
    name: 'HMNB Clyde (Faslane)',
    country: 'uk',
    type: 'submarine_pen',
    domains: ['sea', 'nuclear'],
    pos: [-4.8, 56.1], basePos: [-4.8, 56.1],
    rangeKm: 12000,
    status: 'active', canLaunch: true,
    theater: 'Atlantic',
    allied: ['nato'],
  },
  {
    id: 'nato-airbase-aviano',
    name: 'Aviano Air Base',
    country: 'nato',
    type: 'airbase',
    domains: ['air'],
    pos: [12.6, 46.0], basePos: [12.6, 46.0],
    rangeKm: 2500,
    status: 'active', canLaunch: true,
    theater: 'Europe',
    allied: ['usa', 'uk', 'france', 'germany'],
  },
];

// ── IRAN HUBS ─────────────────────────────────────────────────────────────────
export const IRAN_HUBS: MilitaryHub[] = [
  {
    id: 'irn-airbase-isfahan',
    name: 'Isfahan Airbase',
    country: 'iran',
    type: 'airbase',
    domains: ['air'],
    pos: [51.7, 32.5], basePos: [51.7, 32.5],
    rangeKm: 2000,
    status: 'active', canLaunch: true,
    theater: 'Middle East',
  },
  {
    id: 'irn-missile-shahab',
    name: 'Shahab Missile Complex',
    country: 'iran',
    type: 'missile_silo',
    domains: ['land', 'nuclear'],
    pos: [52.5, 35.7], basePos: [52.5, 35.7],
    rangeKm: 3500,
    status: 'alert', canLaunch: true,
    theater: 'Middle East',
  },
  {
    id: 'irn-naval-bandar-abbas',
    name: 'Bandar Abbas Naval Base',
    country: 'iran',
    type: 'naval_base',
    domains: ['sea'],
    pos: [56.3, 27.2], basePos: [56.3, 27.2],
    rangeKm: 1800,
    status: 'active', canLaunch: true,
    theater: 'Persian Gulf',
  },
  {
    id: 'irn-cyber-tehran',
    name: 'Tehran Cyber Warfare Center',
    country: 'iran',
    type: 'cyber_node',
    domains: ['cyber'],
    pos: [51.4, 35.7], basePos: [51.4, 35.7],
    rangeKm: 15000,
    status: 'active', canLaunch: true,
    theater: 'Global',
  },
];

// ── ISRAEL HUBS ───────────────────────────────────────────────────────────────
export const ISRAEL_HUBS: MilitaryHub[] = [
  {
    id: 'isr-airbase-nevatim',
    name: 'Nevatim Air Base',
    country: 'israel',
    type: 'airbase',
    domains: ['air', 'nuclear'],
    pos: [35.0, 31.2], basePos: [35.0, 31.2],
    rangeKm: 3500,
    status: 'active', canLaunch: true,
    theater: 'Middle East',
  },
  {
    id: 'isr-defense-iron-dome',
    name: 'Iron Dome Network',
    country: 'israel',
    type: 'defense_grid',
    domains: ['land', 'air'],
    pos: [34.8, 31.9], basePos: [34.8, 31.9],
    rangeKm: 300,
    status: 'active', canLaunch: false,
    theater: 'Middle East',
  },
  {
    id: 'isr-sub-haifa',
    name: 'Haifa Naval Submarine Base',
    country: 'israel',
    type: 'submarine_pen',
    domains: ['sea', 'nuclear'],
    pos: [35.0, 32.8], basePos: [35.0, 32.8],
    rangeKm: 4500,
    status: 'active', canLaunch: true,
    theater: 'Mediterranean',
  },
];

// ── INDIA HUBS ────────────────────────────────────────────────────────────────
export const INDIA_HUBS: MilitaryHub[] = [
  {
    id: 'ind-airbase-jodhpur',
    name: 'Jodhpur Air Force Station',
    country: 'india',
    type: 'airbase',
    domains: ['air'],
    pos: [73.1, 26.3], basePos: [73.1, 26.3],
    rangeKm: 2200,
    status: 'active', canLaunch: true,
    theater: 'South Asia',
  },
  {
    id: 'ind-naval-mumbai',
    name: 'INS Shikra (Mumbai)',
    country: 'india',
    type: 'naval_base',
    domains: ['sea'],
    pos: [72.8, 18.9], basePos: [72.8, 18.9],
    rangeKm: 3500,
    status: 'active', canLaunch: true,
    theater: 'Indian Ocean',
  },
  {
    id: 'ind-carrier-ins-vikrant',
    name: 'INS Vikrant CSG',
    country: 'india',
    type: 'carrier_group',
    domains: ['sea', 'air'],
    pos: [75.0, 14.0], basePos: [75.0, 14.0],
    rangeKm: 1200,
    status: 'active', canLaunch: true,
    theater: 'Indian Ocean',
    moving: true,
  },
  {
    id: 'ind-missile-agni',
    name: 'Agni Missile Complex',
    country: 'india',
    type: 'missile_silo',
    domains: ['nuclear', 'land'],
    pos: [80.0, 23.0], basePos: [80.0, 23.0],
    rangeKm: 8000,
    status: 'active', canLaunch: true,
    theater: 'South Asia',
  },
];

// ── PAKISTAN HUBS ─────────────────────────────────────────────────────────────
export const PAKISTAN_HUBS: MilitaryHub[] = [
  {
    id: 'pak-airbase-sargodha',
    name: 'PAF Base Sargodha',
    country: 'pakistan',
    type: 'airbase',
    domains: ['air', 'nuclear'],
    pos: [72.7, 32.1], basePos: [72.7, 32.1],
    rangeKm: 2000,
    status: 'active', canLaunch: true,
    theater: 'South Asia',
  },
  {
    id: 'pak-missile-ghauri',
    name: 'Ghauri Missile Base',
    country: 'pakistan',
    type: 'missile_silo',
    domains: ['nuclear'],
    pos: [71.4, 33.7], basePos: [71.4, 33.7],
    rangeKm: 2300,
    status: 'active', canLaunch: true,
    theater: 'South Asia',
  },
];

// ── EAST ASIA HUBS (Japan, South Korea, North Korea) ─────────────────────────
export const EAST_ASIA_HUBS: MilitaryHub[] = [
  {
    id: 'jpn-airbase-chitose',
    name: 'Chitose Air Base',
    country: 'japan',
    type: 'airbase',
    domains: ['air'],
    pos: [141.7, 42.8], basePos: [141.7, 42.8],
    rangeKm: 2000,
    status: 'active', canLaunch: true,
    theater: 'Northeast Asia',
    allied: ['usa'],
  },
  {
    id: 'kor-airbase-osan',
    name: 'Osan Air Base',
    country: 'southkorea',
    type: 'airbase',
    domains: ['air'],
    pos: [127.0, 37.1], basePos: [127.0, 37.1],
    rangeKm: 1800,
    status: 'alert', canLaunch: true,
    theater: 'Korean Peninsula',
    allied: ['usa'],
  },
  {
    id: 'dprk-silo-north',
    name: 'Yongbyon Nuclear Complex',
    country: 'northkorea',
    type: 'missile_silo',
    domains: ['nuclear', 'land'],
    pos: [125.9, 39.8], basePos: [125.9, 39.8],
    rangeKm: 13000,
    status: 'alert', canLaunch: true,
    theater: 'Korean Peninsula',
  },
  {
    id: 'dprk-airbase-wonsan',
    name: 'Wonsan Airfield',
    country: 'northkorea',
    type: 'airbase',
    domains: ['air'],
    pos: [127.4, 39.2], basePos: [127.4, 39.2],
    rangeKm: 1500,
    status: 'active', canLaunch: true,
    theater: 'Korean Peninsula',
  },
];

// ── COMBINED GLOBAL LOOKUP ────────────────────────────────────────────────────
export const GLOBAL_MILITARY_HUBS: MilitaryHub[] = [
  ...USA_HUBS,
  ...RUSSIA_HUBS,
  ...CHINA_HUBS,
  ...UK_NATO_HUBS,
  ...IRAN_HUBS,
  ...ISRAEL_HUBS,
  ...INDIA_HUBS,
  ...PAKISTAN_HUBS,
  ...EAST_ASIA_HUBS,
];

/** Quick lookup by hub id */
export const HUB_BY_ID: Record<string, MilitaryHub> = Object.fromEntries(
  GLOBAL_MILITARY_HUBS.map(h => [h.id, h])
);

/** All hubs belonging to a nation */
export function getHubsByCountry(country: string): MilitaryHub[] {
  return GLOBAL_MILITARY_HUBS.filter(
    h => h.country === country || (h.allied ?? []).includes(country)
  );
}
