// lib/engine/events.ts
import { GeoEvent, EventType } from './types';

let _id = 1;
const makeId = () => `evt_${Date.now()}_${_id++}`;

type Tpl = Omit<GeoEvent, 'id' | 'timestamp' | 'cycleId' | 'isNew'>;

// ── SCENARIO PHASE SEQUENCES ─────────────────────────────────────────────────
export const SCENARIO_PHASES: Record<string, Tpl[][]> = {
  global_tension: [[
    { type:'military', title:'Global Naval Mobilization', description:'Multiple carrier strike groups repositioned to contested waters. Largest naval mobilization since Cold War.', impact:6, region:'Global', affectedLeaders:['usa','china','russia'] },
  ],[
    { type:'cyber', title:'Probing Attacks on Critical Infrastructure', description:'State-sponsored actors detected probing power grids, financial networks, and defense systems across 14 nations.', impact:6, region:'Global', affectedLeaders:['usa','russia','europe'] },
    { type:'economic', title:'Global Markets Rattled', description:'Geopolitical uncertainty triggers $2.3 trillion sell-off. Safe haven assets surge. VIX spikes to 38.', impact:5, region:'Global', affectedLeaders:['usa','europe','china'] },
  ]],
  taiwan_crisis: [[
    { type:'military', title:'PLA Full-Scale Encirclement Drill', description:'Unprecedented live-fire exercises completely surround Taiwan. Air corridors blocked. Naval passage denied. Invasion posture confirmed.', impact:9, region:'Taiwan Strait', affectedLeaders:['china','taiwan','usa','japan'] },
  ],[
    { type:'economic', title:'TSMC Emergency Protocols Activated', description:'World\'s most advanced chipmaker activates contingency plans. $600B in global supply chain impact projected. Tech stocks freefall.', impact:9, region:'Asia-Pacific', affectedLeaders:['taiwan','usa','china','europe'] },
    { type:'diplomatic', title:'US Taiwan Relations Act Invoked', description:'President invokes TRA obligations. Two carrier groups en route to Taiwan Strait. Beijing threatens "catastrophic response."', impact:10, region:'Pacific', affectedLeaders:['usa','china','taiwan','japan'] },
  ],[
    { type:'military', title:'First Missiles Strike Taiwan Military Bases', description:'450+ ballistic missiles strike military installations across Taiwan. Civilian casualties mount. US forces engage in aerial defense.', impact:10, region:'Taiwan Strait', affectedLeaders:['china','taiwan','usa','japan','southkorea'] },
  ]],
  hormuz_blockade: [[
    { type:'military', title:'Strait of Hormuz Mined', description:'Naval mines detected throughout Strait of Hormuz. 21% of global oil supply at immediate risk. Lloyd\'s withdraws coverage.', impact:9, region:'Persian Gulf', affectedLeaders:['iran','usa','europe','saudiarabia'] },
  ],[
    { type:'economic', title:'Oil Breaks $280/Barrel', description:'Brent crude shatters records. Airlines emergency-ground fleets. Trucking paralyzed. G7 emergency call convened.', impact:10, region:'Global', affectedLeaders:['usa','europe','china','russia','saudiarabia'] },
    { type:'military', title:'Six Supertankers Seized', description:'Iranian Revolutionary Guard captures six supertankers. 240 crew members held. $5B cargo impounded. Naval confrontation imminent.', impact:9, region:'Persian Gulf', affectedLeaders:['iran','usa','uk','europe'] },
  ]],
  nato_conflict: [[
    { type:'military', title:'NATO Article 5 Triggered', description:'Confirmed military attack on NATO member state. Collective defense invoked. All 32 members at war. Largest mobilization since 1945.', impact:10, region:'Eastern Europe', affectedLeaders:['russia','nato','usa','europe','ukraine'] },
  ],[
    { type:'military', title:'Tactical Nuclear Weapons Forward Deployed', description:'Satellite confirms tactical nukes repositioned to border. DEFCON equivalent raised. Nuclear hotline activated.', impact:10, region:'Europe', affectedLeaders:['russia','usa','nato','europe'] },
  ]],
  nuclear_standoff: [[
    { type:'nuclear', title:'Simultaneous Nuclear Alert Levels Raised', description:'Two nuclear superpowers simultaneously elevate alert status. Launch-on-warning protocols active. Closest brush with nuclear war since 1983.', impact:10, region:'Global', affectedLeaders:['usa','russia','china','un'] },
  ],[
    { type:'nuclear', title:'Underground Nuclear Test Detected', description:'Seismic sensors detect 150kt nuclear test. 10x Hiroshima yield. UNSC emergency session in 30 minutes.', impact:10, region:'Asia-Pacific', affectedLeaders:['northkorea','usa','china','un','japan','southkorea'] },
  ]],
  economic_collapse: [[
    { type:'economic', title:'Dollar Reserve Status Under Attack', description:'BRICS+ nations launch gold-backed settlement alternative. 52 countries sign on day 1. Dollar drops 24% against currency basket.', impact:9, region:'Global', affectedLeaders:['usa','china','russia','india'] },
  ],[
    { type:'economic', title:'Global Stock Market Synchronized Crash', description:'$14 trillion wiped in 72 hours. Circuit breakers triggered globally. Worst crash since 1929. Banks begin failing.', impact:10, region:'Global', affectedLeaders:['usa','europe','china','uk'] },
  ]],
  middle_east_war: [[
    { type:'military', title:'Multi-Front War Erupts Across Middle East', description:'Hezbollah opens northern front. Houthis attack Red Sea. Iraqi PMF strikes US bases. Iranian-backed axis activates across 5 simultaneous fronts.', impact:9, region:'Middle East', affectedLeaders:['iran','israel','usa','saudiarabia','un'] },
  ],[
    { type:'military', title:'Israel Strikes Iranian Nuclear Facilities', description:'IAF executes deep strike on Fordow and Natanz. 120+ aircraft with US tanker support. Iran promises full retaliation within 48 hours.', impact:10, region:'Middle East', affectedLeaders:['israel','iran','usa','russia','saudiarabia'] },
  ]],
};

// ── RANDOM EVENT POOL ─────────────────────────────────────────────────────────
const POOL: Tpl[] = [
  // Military
  { type:'military', title:'Hypersonic Missile Salvo', description:'Mach 22 hypersonic glide vehicles launched over Pacific. Existing defense systems confirmed unable to intercept.', impact:8, region:'Pacific', affectedLeaders:['usa','china','russia'] },
  { type:'military', title:'Submarine Near Undersea Cable', description:'Nuclear submarine tracked near critical undersea internet and financial cable infrastructure. Attribution disputed.', impact:6, region:'Arctic', affectedLeaders:['usa','russia','uk'] },
  { type:'military', title:'AI Drone Swarm Attack', description:'1,200-unit AI-coordinated drone swarm overwhelms base air defenses in 4 minutes. New warfare paradigm confirmed.', impact:8, region:'Middle East', affectedLeaders:['iran','israel','usa'] },
  { type:'military', title:'Carrier Battle Group Confrontation', description:'US and PLA carriers in close standoff — 8 nautical miles. Fire control radars locked both ways. Hotlines activated.', impact:8, region:'South China Sea', affectedLeaders:['usa','china'] },
  { type:'military', title:'Anti-Satellite Weapon Tested', description:'ASAT missile destroys reconnaissance satellite. 2,800 debris pieces threaten ISS. GPS constellation degradation begins.', impact:8, region:'Global', affectedLeaders:['usa','china','russia'] },
  { type:'military', title:'Special Forces Covert Operation Exposed', description:'Cross-border operation targeting weapons facility exposed. 12 operatives captured. State sponsor officially denies involvement.', impact:7, region:'Middle East', affectedLeaders:['israel','iran'] },
  { type:'military', title:'Chemical Weapon Attack Suspected', description:'Airstrike on residential area. Survivors describe nerve agent symptoms. OPCW emergency mission deployed.', impact:9, region:'Middle East', affectedLeaders:['usa','russia','europe','un'] },
  { type:'military', title:'Naval Blockade Imposed', description:'Total naval blockade around contested island chain. 60 vessels diverted daily. Humanitarian exemptions denied.', impact:7, region:'Asia-Pacific', affectedLeaders:['china','taiwan','usa'] },
  // Economic
  { type:'economic', title:'Oil Jumps 65% Overnight', description:'Supply disruption triggers 65% oil spike in 12 hours. Inflation expectations completely reset. Emergency IEA reserves released.', impact:8, region:'Global', affectedLeaders:['russia','iran','usa','europe','saudiarabia'] },
  { type:'economic', title:'Bank Run — Major G7 Economy', description:'Social media panic accelerates coordinated bank run. $220B withdrawn in 96 hours. Emergency deposit guarantees invoked.', impact:7, region:'Europe', affectedLeaders:['europe','usa','uk'] },
  { type:'economic', title:'Rare Earth Total Export Ban', description:'Complete ban on rare earth mineral exports to Western nations. EV, weapons, and chip manufacturing face 18-month crisis.', impact:9, region:'Asia', affectedLeaders:['china','usa','europe','japan'] },
  { type:'economic', title:'Sovereign Debt Default Cascade', description:'Second-largest emerging economy defaults on $800B. Contagion model shows 22 cascading defaults within 90 days.', impact:9, region:'Global', affectedLeaders:['usa','europe','china','imf'] },
  { type:'economic', title:'Global Food Crisis Declared', description:'Export bans on wheat, corn, rice by 8 major producers. UN projects 600 million facing acute food insecurity.', impact:8, region:'Global', affectedLeaders:['russia','usa','europe','india','un'] },
  { type:'economic', title:'Tech Decoupling Accelerates', description:'Complete ban on tech transfers between major powers. $1.2T annual trade eliminated. Supply chains bifurcate permanently.', impact:8, region:'Global', affectedLeaders:['usa','china','europe'] },
  { type:'economic', title:'Shipping Insurance Collapses', description:'All major insurers withdraw from war-risk zones. 40% of global shipping lanes commercially uninsurable.', impact:7, region:'Global', affectedLeaders:['europe','usa','china'] },
  { type:'economic', title:'OPEC+ Emergency Cut Announced', description:'Surprise production cut of 3M barrels/day. Oil jumps $40 immediately. Western nations accuse political coercion.', impact:7, region:'Global', affectedLeaders:['saudiarabia','russia','usa'] },
  // Cyber
  { type:'cyber', title:'Power Grid Zero-Day Deployed', description:'Previously unknown exploit hits power infrastructure in 8 nations simultaneously. 95 million without electricity. Hospital deaths mount.', impact:9, region:'Europe', affectedLeaders:['russia','usa','europe','nato'] },
  { type:'cyber', title:'SWIFT Network Degraded', description:'Interbank messaging system compromised. $4.2T in daily transactions at risk. 18-hour outage confirmed.', impact:9, region:'Global', affectedLeaders:['russia','usa','europe','china'] },
  { type:'cyber', title:'Nuclear Command System Probed', description:'Attempted intrusion on nuclear C2 systems detected and repelled. Origin traced to state actor. Alert status raised.', impact:10, region:'Global', affectedLeaders:['usa','russia'] },
  { type:'cyber', title:'AI Deepfake Nuclear Alert Spreads', description:'AI-generated video of president announcing nuclear launch goes viral. Markets crash before debunked 52 minutes later.', impact:7, region:'Global', affectedLeaders:['usa','russia','china'] },
  { type:'cyber', title:'Water Treatment Attack', description:'SCADA systems at water treatment plants in 5 cities manipulated. Chemical balance dangerously altered. 8M residents warned.', impact:8, region:'Middle East', affectedLeaders:['iran','israel','usa'] },
  { type:'cyber', title:'Military Satellite Hijacked', description:'Adversary demonstrates active control of military communications satellite. Classified traffic exposure confirmed.', impact:8, region:'Global', affectedLeaders:['usa','china','russia'] },
  // Diplomatic
  { type:'diplomatic', title:'Last Nuclear Treaty Abandoned', description:'Final remaining arms control treaty officially terminated. Unconstrained nuclear buildup era begins. New arms race declared.', impact:9, region:'Global', affectedLeaders:['usa','russia','china','un'] },
  { type:'diplomatic', title:'New Military Alliance Signed', description:'Surprise defense pact between three former rivals. New strategic axis reshapes global security overnight.', impact:8, region:'Global', affectedLeaders:['china','russia','iran'] },
  { type:'diplomatic', title:'UN Security Council Triple Veto', description:'Three consecutive vetoes kill humanitarian resolution. UNSC declared functionally dead. Alternative framework proposed.', impact:6, region:'Global', affectedLeaders:['usa','russia','china','un'] },
  { type:'diplomatic', title:'Alliance Internal Fracture Exposed', description:'Major alliance member publicly breaks from partners on critical issue. Adversaries immediately exploit split.', impact:7, region:'Europe', affectedLeaders:['usa','europe','nato'] },
  { type:'diplomatic', title:'Secret Talks Leaked', description:'Back-channel negotiations exposed prematurely. Both governments face domestic backlash. Talks collapse publicly.', impact:5, region:'Global', affectedLeaders:['usa','iran'] },
  { type:'diplomatic', title:'Emergency G20 Summit Convened', description:'Emergency summit called with 72-hour notice. Leaders arrive with incompatible demands and no agreed agenda.', impact:6, region:'Global', affectedLeaders:['usa','china','russia','europe','india'] },
  // Intelligence
  { type:'intelligence', title:'Nuclear Timeline Suddenly Accelerated', description:'Intelligence reassessment: target is 90 days from weapons-grade material, not 18 months. Window for action closing rapidly.', impact:9, region:'Middle East', affectedLeaders:['israel','usa','iran'] },
  { type:'intelligence', title:'Double Agent Exposed at Highest Level', description:'Senior official confirmed as decade-long foreign asset. Full classified exposure scope unknown. Allies demanding accountability.', impact:8, region:'Global', affectedLeaders:['usa','russia'] },
  { type:'intelligence', title:'Coup Intelligence — Nuclear State', description:'Credible intelligence of imminent military coup in nuclear-armed state. Weapons security uncertain. 96-hour window.', impact:9, region:'Asia', affectedLeaders:['usa','china','russia'] },
  { type:'intelligence', title:'False Flag Operation Uncovered', description:'Evidence emerges that recent attack was staged by third party to trigger war between major powers.', impact:8, region:'Global', affectedLeaders:['usa','russia','china'] },
  { type:'intelligence', title:'Biological Weapons Program Confirmed', description:'UN inspectors discover undeclared bioweapons research program. Pathogens under development violate the BWC.', impact:9, region:'Asia', affectedLeaders:['usa','china','russia','un'] },
  // Nuclear
  { type:'nuclear', title:'ICBM Full-Range Test — New Payload', description:'ICBM test covers 12,000km range. MIRV warhead deployment confirmed. Any city on Earth now within reach.', impact:9, region:'Pacific', affectedLeaders:['northkorea','usa','china','japan'] },
  { type:'nuclear', title:'Nuclear Submarine Missing', description:'Nuclear-armed SSBN fails scheduled contact. 72-hour search protocol activated. 16 warheads aboard unaccounted.', impact:10, region:'Pacific', affectedLeaders:['usa','russia'] },
  { type:'nuclear', title:'Radiological Device Threat', description:'Credible intelligence of radiological dispersal device in major city. Material confirmed stolen from research reactor.', impact:9, region:'Europe', affectedLeaders:['russia','usa','europe','un'] },
  { type:'nuclear', title:'Enrichment Facility Sabotage', description:'Explosion at enrichment facility. Centrifuge arrays destroyed. Stuxnet-class cyber-physical attack confirmed.', impact:8, region:'Middle East', affectedLeaders:['israel','iran','usa'] },
  // Humanitarian
  { type:'humanitarian', title:'Refugee Crisis Overwhelms Borders', description:'5 million displaced in 96 hours. 9 nations close borders simultaneously. Largest refugee crisis since WWII.', impact:7, region:'Middle East', affectedLeaders:['europe','turkey','un','usa'] },
  { type:'humanitarian', title:'Famine Declared in Conflict Zone', description:'UN declares famine in active war zone. Aid corridors blocked by all sides. 2.4 million at imminent risk of starvation.', impact:8, region:'Middle East', affectedLeaders:['un','usa','europe'] },
];

export function getScenarioEvent(scenarioId: string, phase: number, cycleId: string): GeoEvent {
  const phases = SCENARIO_PHASES[scenarioId] || SCENARIO_PHASES.global_tension;
  const p = phases[Math.min(phase, phases.length - 1)] || phases[phases.length - 1];
  const tpl = p[Math.floor(Math.random() * p.length)];
  return { ...tpl, id: makeId(), timestamp: Date.now(), cycleId, isNew: true };
}

export function getRandomEvent(cycleId: string): GeoEvent {
  const tpl = POOL[Math.floor(Math.random() * POOL.length)];
  return { ...tpl, id: makeId(), timestamp: Date.now(), cycleId, isNew: true };
}

export function getRandomEventByType(type: EventType, cycleId: string): GeoEvent {
  const pool = POOL.filter(e => e.type === type);
  const tpl = pool[Math.floor(Math.random() * pool.length)] || POOL[0];
  return { ...tpl, id: makeId(), timestamp: Date.now(), cycleId, isNew: true };
}

export const SCENARIOS = [
  { id:'global_tension',   label:'🌍 Global Tension (Default)' },
  { id:'taiwan_crisis',    label:'🇹🇼 Taiwan Military Crisis' },
  { id:'hormuz_blockade',  label:'🛢️ Strait of Hormuz Blockade' },
  { id:'nato_conflict',    label:'🪖 NATO Eastern Flank War' },
  { id:'nuclear_standoff', label:'☢️ Nuclear Standoff' },
  { id:'economic_collapse',label:'📉 Economic Collapse' },
  { id:'middle_east_war',  label:'⚔️ Middle East Conflagration' },
];
