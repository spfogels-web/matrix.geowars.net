// lib/engine/leaders.ts
import { Leader } from './types';

export const LEADER_POOL: Leader[] = [
  {
    id: 'usa', name: 'Donald Trump', role: 'President', country: 'USA', flag: '🇺🇸',
    color: '#00f5ff', accentColor: '#0066cc',
    status: 'stable', aggression: 30,
    lastStatement: 'The United States stands ready to defend the rules-based international order.',
    lastAction: 'Monitoring global situation from the Situation Room.',
    personality: 'Superpower. Alliance-first. Economic coercion before military. Measured, official tone.',
    goals: ['Maintain dollar hegemony','Preserve NATO','Counter China rise','Prevent nuclear proliferation'],
    redLines: ['NATO Article 5 attack','Nuclear weapon use','Taiwan invasion','Dollar replacement'],
    economy: { gdpGrowth:2.1, inflationRate:3.2, oilDependency:45, sanctionsImpact:0, stockIndex:112 },
    military: { readiness:78, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Pacific','Europe','Middle East'], alliances:['Europe','UK','Israel','Japan','SouthKorea'] },
    importanceScore: 90, isVisible: true, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'china', name: 'Xi Jinping', role: 'President / Gen. Secretary', country: 'PRC', flag: '🇨🇳',
    color: '#ff2d55', accentColor: '#cc0000',
    status: 'stable', aggression: 42,
    lastStatement: 'China firmly opposes any interference in its internal affairs.',
    lastAction: 'Expanding Belt and Road influence across Southeast Asia.',
    personality: 'Long-term patient strategist. Economic dominance preferred. Taiwan is sacred. Never appear aggressive.',
    goals: ['Taiwan reunification','South China Sea dominance','BRI expansion','Dollar alternative'],
    redLines: ['Taiwan independence','US base in Taiwan','Tech blockade','Encirclement'],
    economy: { gdpGrowth:4.8, inflationRate:1.8, oilDependency:72, sanctionsImpact:15, stockIndex:98 },
    military: { readiness:82, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Taiwan Strait','South China Sea'], alliances:['Russia','NorthKorea'] },
    importanceScore: 88, isVisible: true, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'russia', name: 'Vladimir Putin', role: 'President', country: 'RUS', flag: '🇷🇺',
    color: '#ff6a00', accentColor: '#cc4400',
    status: 'alert', aggression: 68,
    lastStatement: 'Russia will not tolerate further provocations near its borders.',
    lastAction: 'Forward deploying tactical assets to contested region.',
    personality: 'Aggressive opportunist. Escalate to de-escalate. Energy as weapon. Nuclear signaling early.',
    goals: ['NATO rollback','Energy dominance','Sphere restoration','Prevent regime change'],
    redLines: ['NATO in Ukraine','Western troops on border','Regime change attempt','Energy sanctions'],
    economy: { gdpGrowth:-1.2, inflationRate:8.4, oilDependency:5, sanctionsImpact:65, stockIndex:62 },
    military: { readiness:86, nuclearCapable:true, nuclearAlert:true, deployedRegions:['Eastern Europe','Arctic','Syria'], alliances:['China','Iran','Belarus'] },
    importanceScore: 85, isVisible: true, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'iran', name: 'Ali Khamenei', role: 'Supreme Leader', country: 'IRN', flag: '🇮🇷',
    color: '#00ff9d', accentColor: '#008844',
    status: 'alert', aggression: 56,
    lastStatement: 'Our resistance axis stands firm against Zionist aggression.',
    lastAction: 'Coordinating Hezbollah and Houthi operations.',
    personality: 'Asymmetric warfare master. Never fights directly. Nuclear ambiguity as leverage. Hormuz is the ultimate card.',
    goals: ['Nuclear deterrent','Regional hegemony','Remove US from ME','Destroy Israel via proxies'],
    redLines: ['Nuclear facility strike','Regime change','Full oil embargo','Proxy elimination'],
    economy: { gdpGrowth:2.8, inflationRate:42, oilDependency:8, sanctionsImpact:80, stockIndex:55 },
    military: { readiness:70, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Persian Gulf','Lebanon','Yemen'], alliances:['Russia','Hezbollah','Hamas','Houthis'] },
    importanceScore: 80, isVisible: true, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'israel', name: 'Benjamin Netanyahu', role: 'Prime Minister', country: 'ISR', flag: '🇮🇱',
    color: '#ffd700', accentColor: '#aa8800',
    status: 'alert', aggression: 62,
    lastStatement: 'Israel will not allow any existential threat to go unanswered.',
    lastAction: 'Pre-emptive intelligence operations in northern sector.',
    personality: 'Pre-emption doctrine. Existential calculus. Intel supremacy. Will act unilaterally if necessary.',
    goals: ['Prevent Iranian nuke','Regional superiority','Arab normalization','US alliance'],
    redLines: ['Iranian nuclear weapon','Hezbollah mass attack','Loss of US support','Arab coalition attack'],
    economy: { gdpGrowth:3.2, inflationRate:3.8, oilDependency:90, sanctionsImpact:0, stockIndex:108 },
    military: { readiness:90, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Middle East'], alliances:['USA'] },
    importanceScore: 78, isVisible: true, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'uk', name: 'Keir Starmer', role: 'Prime Minister', country: 'GBR', flag: '🇬🇧',
    color: '#4488ff', accentColor: '#003399',
    status: 'stable', aggression: 25,
    lastStatement: 'The UK stands with its allies in upholding the international rules-based order.',
    lastAction: 'Coordinating with NATO allies on response options.',
    personality: 'Close US ally. Post-Brexit independent voice. Special relationship with Washington. Punches above weight diplomatically.',
    goals: ['NATO cohesion','Trade diversification','Intelligence leadership','Soft power projection'],
    redLines: ['NATO Article 5','Attack on British territory','Intelligence compromise'],
    economy: { gdpGrowth:0.4, inflationRate:4.2, oilDependency:60, sanctionsImpact:0, stockIndex:102 },
    military: { readiness:72, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Atlantic','Middle East'], alliances:['USA','Europe','Australia'] },
    importanceScore: 65, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'france', name: 'Emmanuel Macron', role: 'President', country: 'FRA', flag: '🇫🇷',
    color: '#8866ff', accentColor: '#4422cc',
    status: 'diplomatic', aggression: 22,
    lastStatement: 'France calls for immediate dialogue and diplomatic resolution.',
    lastAction: 'Hosting emergency diplomatic summit in Paris.',
    personality: 'EU leadership aspirant. Independent nuclear deterrent. Diplomatic bridge-builder. Strategic autonomy advocate.',
    goals: ['EU strategic autonomy','Franco-German leadership','African influence','Nuclear deterrence'],
    redLines: ['Attack on France or EU','Nuclear proliferation near borders'],
    economy: { gdpGrowth:0.9, inflationRate:3.8, oilDependency:62, sanctionsImpact:0, stockIndex:99 },
    military: { readiness:68, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Africa','Mediterranean'], alliances:['USA','UK','EU'] },
    importanceScore: 60, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'germany', name: 'Friedrich Merz', role: 'Chancellor', country: 'DEU', flag: '🇩🇪',
    color: '#888888', accentColor: '#555555',
    status: 'diplomatic', aggression: 18,
    lastStatement: 'Germany urges restraint and emphasizes diplomatic solutions.',
    lastAction: 'Emergency cabinet meeting on energy security implications.',
    personality: 'Historically cautious. Economic powerhouse. Russia energy dependency legacy. Slow to militarize.',
    goals: ['EU economic stability','Energy independence','Russia deterrence','Trade protection'],
    redLines: ['Attack on NATO territory','Economic crisis in EU'],
    economy: { gdpGrowth:0.2, inflationRate:3.9, oilDependency:58, sanctionsImpact:8, stockIndex:96 },
    military: { readiness:55, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Eastern Europe'], alliances:['USA','France','EU'] },
    importanceScore: 58, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'eu', name: 'Ursula von der Leyen', role: 'Commission President', country: 'EUR', flag: '🇪🇺',
    color: '#b44fff', accentColor: '#6600cc',
    status: 'diplomatic', aggression: 16,
    lastStatement: 'The EU calls on all parties to exercise maximum restraint.',
    lastAction: 'Coordinating emergency sanctions package with member states.',
    personality: 'Slow consensus. Sanctions expert. Normative power. Internally divided but externally unified.',
    goals: ['Rules-based order','Economic security','NATO cohesion','Climate diplomacy'],
    redLines: ['EU member state attack','Democratic backsliding','Energy cutoff'],
    economy: { gdpGrowth:0.8, inflationRate:4.1, oilDependency:55, sanctionsImpact:5, stockIndex:95 },
    military: { readiness:52, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Eastern Europe'], alliances:['USA','UK','NATO'] },
    importanceScore: 70, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'turkey', name: 'Recep Erdoğan', role: 'President', country: 'TUR', flag: '🇹🇷',
    color: '#ff4444', accentColor: '#cc1111',
    status: 'stable', aggression: 44,
    lastStatement: 'Turkey will pursue its national interests regardless of external pressure.',
    lastAction: 'Mediating between conflicting parties while expanding influence.',
    personality: 'NATO member playing both sides. Erdogan doctrine: transactional loyalty, max strategic leverage.',
    goals: ['Regional power status','S-400 integration','Energy hub role','Refugee leverage'],
    redLines: ['Kurdish state creation','Economic isolation','NATO aggression'],
    economy: { gdpGrowth:3.2, inflationRate:68, oilDependency:88, sanctionsImpact:10, stockIndex:85 },
    military: { readiness:74, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Syria','Libya','Black Sea'], alliances:['NATO'] },
    importanceScore: 55, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'saudiarabia', name: 'Mohammed bin Salman', role: 'Crown Prince', country: 'SAU', flag: '🇸🇦',
    color: '#22cc44', accentColor: '#115522',
    status: 'stable', aggression: 35,
    lastStatement: 'The Kingdom supports stability and de-escalation in the region.',
    lastAction: 'Emergency OPEC+ coordination call convened.',
    personality: 'Oil weapon master. Vision 2030 hedge. Playing US and China simultaneously. Sunni power vs Iran.',
    goals: ['Oil price stability','Regional Sunni leadership','Security guarantees','Normalization with Israel'],
    redLines: ['Iranian nuclear weapon','Houthi attack on Aramco','Loss of US umbrella'],
    economy: { gdpGrowth:2.6, inflationRate:2.2, oilDependency:2, sanctionsImpact:0, stockIndex:118 },
    military: { readiness:65, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Yemen','Gulf'], alliances:['USA','UAE'] },
    importanceScore: 62, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'india', name: 'Narendra Modi', role: 'Prime Minister', country: 'IND', flag: '🇮🇳',
    color: '#ff9922', accentColor: '#cc6600',
    status: 'stable', aggression: 28,
    lastStatement: 'India calls for dialogue and peaceful resolution of disputes.',
    lastAction: 'Maintaining strategic autonomy while monitoring regional developments.',
    personality: 'Non-aligned superpower. World\'s largest democracy. Buys Russian oil, courts US tech. Strategic patience.',
    goals: ['Strategic autonomy','Economic development','Border security','Global south leadership'],
    redLines: ['Pakistan nuclear use','Chinese border aggression','Loss of Russian arms supply'],
    economy: { gdpGrowth:6.8, inflationRate:5.1, oilDependency:85, sanctionsImpact:0, stockIndex:125 },
    military: { readiness:75, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Indian Ocean','Himalayas'], alliances:['USA','Japan','Australia'] },
    importanceScore: 68, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'pakistan', name: 'Shehbaz Sharif', role: 'Prime Minister', country: 'PAK', flag: '🇵🇰',
    color: '#22aa55', accentColor: '#115533',
    status: 'alert', aggression: 45,
    lastStatement: 'Pakistan will respond proportionally to any threat to its sovereignty.',
    lastAction: 'Military consultations on regional security posture.',
    personality: 'Nuclear state with weak economy. ISI plays all sides. India obsession. China dependency.',
    goals: ['Kashmir resolution','Nuclear parity with India','Economic stabilization','China alliance'],
    redLines: ['Indian nuclear strike','Regime destabilization','Balochistan loss'],
    economy: { gdpGrowth:2.1, inflationRate:28, oilDependency:88, sanctionsImpact:12, stockIndex:72 },
    military: { readiness:72, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Kashmir','Afghan border'], alliances:['China','Saudi Arabia'] },
    importanceScore: 52, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'japan', name: 'Shigeru Ishiba', role: 'Prime Minister', country: 'JPN', flag: '🇯🇵',
    color: '#ff6688', accentColor: '#cc2244',
    status: 'alert', aggression: 22,
    lastStatement: 'Japan stands with its allies and calls for immediate de-escalation.',
    lastAction: 'JSDF placed on elevated readiness amid regional tensions.',
    personality: 'Pacifist constitution bending under threat. Remilitarizing rapidly. US alliance core.',
    goals: ['North Korea deterrence','China containment','US alliance','Economic security'],
    redLines: ['DPRK nuclear attack','Taiwan invasion','Chinese island seizure'],
    economy: { gdpGrowth:1.2, inflationRate:2.8, oilDependency:95, sanctionsImpact:0, stockIndex:108 },
    military: { readiness:70, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Pacific','Korean Strait'], alliances:['USA','South Korea','Australia'] },
    importanceScore: 66, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'southkorea', name: 'Han Duck-soo', role: 'Acting President', country: 'KOR', flag: '🇰🇷',
    color: '#44aaff', accentColor: '#0044cc',
    status: 'alert', aggression: 30,
    lastStatement: 'South Korea condemns provocative actions and calls for dialogue.',
    lastAction: 'Joint military exercises with US forces activated.',
    personality: 'Frontline state against DPRK. US ally but China trade dependent. Nuclear hedging discussions ongoing.',
    goals: ['DPRK deterrence','Unification eventually','US alliance','Economic prosperity'],
    redLines: ['DPRK nuclear strike','Regime collapse chaos','Chinese coercion'],
    economy: { gdpGrowth:2.4, inflationRate:3.4, oilDependency:94, sanctionsImpact:0, stockIndex:115 },
    military: { readiness:80, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Korean Peninsula'], alliances:['USA','Japan'] },
    importanceScore: 60, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'northkorea', name: 'Kim Jong-un', role: 'Supreme Leader', country: 'PRK', flag: '🇰🇵',
    color: '#cc2222', accentColor: '#880000',
    status: 'hostile', aggression: 82,
    lastStatement: 'The DPRK will annihilate any enemy that dares challenge its sovereignty.',
    lastAction: 'Mobile ICBM launchers repositioned to undisclosed locations.',
    personality: 'Unpredictable maximalist. Brinkmanship as permanent state. Nuclear weapons are sacred survival tool.',
    goals: ['Regime survival','Nuclear recognition','Sanctions relief','US troop withdrawal'],
    redLines: ['US military strike','Regime change attempt','China abandonment'],
    economy: { gdpGrowth:-2.1, inflationRate:12, oilDependency:95, sanctionsImpact:95, stockIndex:20 },
    military: { readiness:88, nuclearCapable:true, nuclearAlert:true, deployedRegions:['Korean Peninsula','Pacific'], alliances:['China'] },
    importanceScore: 74, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'ukraine', name: 'Volodymyr Zelenskyy', role: 'President', country: 'UKR', flag: '🇺🇦',
    color: '#ffdd00', accentColor: '#0057b7',
    status: 'at_war', aggression: 55,
    lastStatement: 'Ukraine will fight until every inch of our territory is liberated.',
    lastAction: 'Requesting emergency military aid from Western partners.',
    personality: 'Wartime resilience. Zelenskyy doctrine: information war + aid diplomacy. Survival before everything.',
    goals: ['Territorial integrity','Western military aid','NATO membership','War crimes accountability'],
    redLines: ['Western aid cutoff','Nuclear attack','Territorial concessions forced'],
    economy: { gdpGrowth:-5.2, inflationRate:18, oilDependency:25, sanctionsImpact:2, stockIndex:45 },
    military: { readiness:80, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Eastern Europe'], alliances:['USA','Europe','UK'] },
    importanceScore: 75, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'taiwan', name: 'Lai Ching-te', role: 'President', country: 'TWN', flag: '🇹🇼',
    color: '#ff6699', accentColor: '#cc0044',
    status: 'critical', aggression: 20,
    lastStatement: 'Taiwan will defend its democracy and sovereignty with full resolve.',
    lastAction: 'Activating reserve forces and requesting US security consultation.',
    personality: 'De facto independent state refusing to accept PRC claim. Asymmetric defense doctrine. US protection dependent.',
    goals: ['De facto independence','US defense commitment','International recognition','Economic resilience'],
    redLines: ['PRC military action','US abandonment','Economic blockade'],
    economy: { gdpGrowth:3.1, inflationRate:2.8, oilDependency:98, sanctionsImpact:0, stockIndex:110 },
    military: { readiness:75, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Taiwan Strait'], alliances:['USA (informal)'] },
    importanceScore: 72, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'nato', name: 'Mark Rutte', role: 'Secretary General', country: 'NATO', flag: '🔵',
    color: '#3366ff', accentColor: '#001199',
    status: 'alert', aggression: 35,
    lastStatement: 'NATO stands united. An attack on one is an attack on all.',
    lastAction: 'Activating rapid response forces and increasing air patrols.',
    personality: 'Collective defense alliance. Unity is strength and weakness. US leadership dominates. Article 5 is sacrosanct.',
    goals: ['Collective defense','Deterrence stability','Article 5 credibility','Eastern flank security'],
    redLines: ['Member state attack','Nuclear weapon use in Europe'],
    economy: { gdpGrowth:1.2, inflationRate:4.0, oilDependency:60, sanctionsImpact:0, stockIndex:100 },
    military: { readiness:78, nuclearCapable:true, nuclearAlert:false, deployedRegions:['Eastern Europe','Atlantic','Mediterranean'], alliances:['All NATO members'] },
    importanceScore: 76, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
  {
    id: 'un', name: 'António Guterres', role: 'Secretary-General', country: 'UN', flag: '🇺🇳',
    color: '#66aaff', accentColor: '#003388',
    status: 'diplomatic', aggression: 5,
    lastStatement: 'The Secretary-General calls for immediate cessation of hostilities.',
    lastAction: 'Emergency Security Council session convened.',
    personality: 'Multilateral institution. Paralyzed by veto power. Soft power only. Moral authority without enforcement.',
    goals: ['Peaceful resolution','Humanitarian access','International law','Multilateralism'],
    redLines: ['Genocide','WMD use','Complete Security Council collapse'],
    economy: { gdpGrowth:0, inflationRate:0, oilDependency:0, sanctionsImpact:0, stockIndex:100 },
    military: { readiness:10, nuclearCapable:false, nuclearAlert:false, deployedRegions:['Global'], alliances:['All member states'] },
    importanceScore: 50, isVisible: false, lastActiveAt: Date.now(), totalMessages: 0,
  },
];

// Compute importance score based on world state context
export function computeImportanceScores(
  leaders: Leader[],
  activeRegions: string[],
  _recentMessages: string[],
  tension: number
): Leader[] {
  return leaders.map(leader => {
    let score = 40; // base

    // Boost if deployed in active region
    const regionMatch = leader.military.deployedRegions.some(r =>
      activeRegions.some(ar => ar.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(ar.toLowerCase()))
    );
    if (regionMatch) score += 25;

    // Boost for high aggression
    score += leader.aggression * 0.3;

    // Boost if recently active
    const timeSinceActive = Date.now() - leader.lastActiveAt;
    if (timeSinceActive < 30000) score += 20;
    else if (timeSinceActive < 60000) score += 10;

    // Boost for nuclear alert
    if (leader.military.nuclearAlert) score += 15;

    // Boost for at_war or critical status
    if (leader.status === 'at_war') score += 20;
    if (leader.status === 'critical') score += 15;
    if (leader.status === 'hostile') score += 10;

    // Boost for high message count
    score += Math.min(15, leader.totalMessages * 2);

    // Tension amplifier
    score *= (0.8 + tension / 200);

    return { ...leader, importanceScore: Math.min(100, Math.round(score)) };
  }).sort((a, b) => b.importanceScore - a.importanceScore);
}

// Get the top N leaders to show in the active stack
export function getActiveLeaderIds(leaders: Leader[], count = 5): string[] {
  return leaders.slice(0, count).map(l => l.id);
}
