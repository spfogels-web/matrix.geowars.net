'use client';
import { WorldState } from '@/lib/engine/types';

interface Props { state: WorldState; isExpanded?: boolean; onToggleExpand?: () => void; }

const SEV_COLORS = { low: '#00ff9d', medium: '#ffd700', high: '#ff6a00', critical: '#ff2d55' };

// Flag emojis for alliance labels
const ALLIANCE_FLAGS: Record<string, string> = {
  'NATO COHESION':       '🇺🇸🇬🇧🇩🇪🇫🇷',
  'US-EUROPE ALIGNMENT': '🇺🇸🇪🇺',
  'CHINA-RUSSIA COORD.': '🇨🇳🇷🇺',
  'IRAN PROXY NETWORK':  '🇮🇷',
  'BRICS SOLIDARITY':    '🇨🇳🇷🇺🇮🇳🇧🇷',
};

function Bar({ value, color, label }: { value: number; color: string; label: string }) {
  const flags = ALLIANCE_FLAGS[label];
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <div className="flex items-center gap-1.5">
          {flags && <span style={{ fontSize: '11px', lineHeight: 1 }}>{flags}</span>}
          <span className="font-mono font-bold" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', letterSpacing: '0.04em' }}>{label}</span>
        </div>
        <span className="font-mono font-bold" style={{ color, fontSize: '13px' }}>{value}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(120,60,255,0.1)' }}>
        <div className="h-full rounded-full transition-all duration-800"
          style={{ width: `${value}%`, background: `linear-gradient(90deg,${color}80,${color})`, boxShadow: `0 0 8px ${color}60` }} />
      </div>
    </div>
  );
}

function Section({ title, children, color = 'rgba(0,245,255,0.5)', flag }: { title: string; children: React.ReactNode; color?: string; flag?: string }) {
  return (
    <div className="mb-5 relative rounded-xl overflow-hidden" style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', border: `1px solid ${color}20` }}>
      {/* Flag watermark */}
      {flag && (
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none overflow-hidden" style={{ opacity: 0.08, fontSize: '90px', lineHeight: 1, paddingRight: '4px' }}>
          {flag}
        </div>
      )}
      {/* Dark gradient overlay for readability */}
      {flag && (
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.65) 100%)',
        }} />
      )}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1" style={{ background: `linear-gradient(90deg,${color},transparent)` }} />
          <span className="font-orbitron font-bold" style={{ color: '#ffffff', fontSize: '12px', letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>{title}</span>
          <div className="h-px w-6" style={{ background: color }} />
        </div>
        {children}
      </div>
    </div>
  );
}

export default function IntelPanel({ state, isExpanded = false, onToggleExpand }: Props) {
  const tc = state.globalTension >= 75 ? '#ff2d55' : state.globalTension >= 55 ? '#ff6a00' : state.globalTension >= 30 ? '#ffd700' : '#00ff9d';
  const ind = state.indicators;
  const alli = state.alliances;
  const oilTrend = ind.oilPrice > 100 ? '▲ HIGH' : '▼ LOW';
  const sp500Trend = ind.sp500 < 5000 ? '▼' : '▲';

  return (
    <div className="panel rounded-xl flex flex-col h-full overflow-hidden" style={{ borderColor: 'rgba(120,60,255,0.2)' }}>

      {/* Header */}
      <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: 'rgba(120,60,255,0.15)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full status-blink" style={{ backgroundColor: tc, boxShadow: `0 0 10px ${tc}` }} />
          <span className="font-orbitron font-bold tracking-widest" style={{ color: '#ffffff', fontSize: '14px', letterSpacing: '0.2em' }}>INTEL MATRIX</span>
          <span className="font-mono font-bold px-2.5 py-1 rounded border"
            style={{ color: tc, borderColor: tc, background: `${tc}12`, fontSize: '11px', letterSpacing: '0.1em' }}>
            {state.threatLevel.replace('_', ' ')}
          </span>
          {onToggleExpand && (
            <button onClick={onToggleExpand}
              className="font-mono px-2 py-1 rounded border transition-all"
              style={{ fontSize: '10px', color: isExpanded ? '#b44fff' : 'rgba(180,79,255,0.6)', borderColor: isExpanded ? 'rgba(120,60,255,0.6)' : 'rgba(120,60,255,0.25)', background: isExpanded ? 'rgba(120,60,255,0.15)' : 'transparent', letterSpacing: '0.08em' }}>
              {isExpanded ? '⊠' : '⊡'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="font-orbitron font-black" style={{ color: tc, fontSize: '60px', lineHeight: 1, textShadow: `0 0 28px ${tc}` }}>
            {state.globalTension}
          </span>
          <div className="flex-1">
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${state.globalTension}%`, background: `linear-gradient(90deg,#00ff9d,${tc})`, boxShadow: `0 0 12px ${tc}` }} />
            </div>
            <div className="font-mono mt-1.5" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>
              NUC RISK: <span style={{ color: tc, fontWeight: 'bold' }}>{state.nuclearRisk}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0">

        {/* Conflict Zones */}
        <Section title="ACTIVE CONFLICT ZONES" color="rgba(255,45,85,0.75)">
          <div className="space-y-2">
            {state.conflictZones.map(z => (
              <div key={z.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                style={{ background: `${SEV_COLORS[z.severity]}0a`, border: `1px solid ${SEV_COLORS[z.severity]}30` }}>
                <div className="w-3 h-3 rounded-full shrink-0 status-blink"
                  style={{ backgroundColor: SEV_COLORS[z.severity], boxShadow: `0 0 6px ${SEV_COLORS[z.severity]}` }} />
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold truncate" style={{ color: SEV_COLORS[z.severity], fontSize: '12px' }}>{z.name}</div>
                  <div className="font-mono truncate" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px' }}>{z.description}</div>
                </div>
                <span className="font-mono font-bold shrink-0 px-2 py-0.5 rounded"
                  style={{ color: SEV_COLORS[z.severity], background: `${SEV_COLORS[z.severity]}1a`, fontSize: '10px', letterSpacing: '0.05em' }}>
                  {z.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Economic Pressure */}
        <Section title="ECONOMIC PRESSURE" color="rgba(255,215,0,0.65)" flag="💹">
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
              <div className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>OIL / BBL</div>
              <div className="font-orbitron font-bold" style={{ color: '#ffd700', fontSize: '22px' }}>${ind.oilPrice}</div>
              <div className="font-mono font-bold" style={{ color: ind.oilPrice > 100 ? '#ff2d55' : '#00ff9d', fontSize: '11px' }}>{oilTrend}</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.15)' }}>
              <div className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>S&amp;P 500</div>
              <div className="font-orbitron font-bold" style={{ color: '#00f5ff', fontSize: '22px' }}>{ind.sp500}</div>
              <div className="font-mono font-bold" style={{ color: ind.sp500 < 4800 ? '#ff2d55' : '#00ff9d', fontSize: '11px' }}>{sp500Trend}</div>
            </div>
          </div>
          <Bar value={ind.vixFear} color="#ff6a00" label="VIX FEAR INDEX" />
          <Bar value={ind.shippingDisruption} color="#ff2d55" label="SHIPPING DISRUPTION" />
          <Bar value={ind.recessionRisk} color="#ffd700" label="RECESSION RISK" />
          <Bar value={ind.sanctionsPressure} color="#b44fff" label="SANCTIONS PRESSURE" />
        </Section>

        {/* Alliance Matrix */}
        <Section title="ALLIANCE MATRIX" color="rgba(180,79,255,0.65)" flag="🌐">
          <Bar value={alli.natoCohesion} color="#00f5ff" label="NATO COHESION" />
          <Bar value={alli.usEuroAlignment} color="#4488ff" label="US-EUROPE ALIGNMENT" />
          <Bar value={alli.chinaRussiaCoord} color="#ff2d55" label="CHINA-RUSSIA COORD." />
          <Bar value={alli.iranProxyNetwork} color="#00ff9d" label="IRAN PROXY NETWORK" />
          <Bar value={alli.bricsSolidarity} color="#ffd700" label="BRICS SOLIDARITY" />
        </Section>

        {/* Probable Outcomes */}
        <Section title="PROBABLE OUTCOMES" color="rgba(0,245,255,0.55)">
          <div className="space-y-3">
            {state.outcomes.map(o => (
              <div key={o.id} className="rounded-lg p-3.5" style={{ background: `${o.color}08`, border: `1px solid ${o.color}28` }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-orbitron font-bold" style={{ color: '#ffffff', fontSize: '13px' }}>{o.label}</span>
                  <span className="ml-auto font-orbitron font-bold" style={{ color: o.color, fontSize: '22px' }}>{o.probability}%</span>
                  <span style={{ color: o.trend==='up'?'#ff2d55':o.trend==='down'?'#00ff9d':'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                    {o.trend==='up'?'▲':o.trend==='down'?'▼':'—'}
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${o.probability}%`, background: `linear-gradient(90deg,${o.color}60,${o.color})`, boxShadow: `0 0 8px ${o.color}55` }} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Breaking Intel */}
        <Section title="BREAKING INTEL" color="rgba(0,255,157,0.55)" flag="📡">
          <div className="space-y-2">
            {state.breakingIntel.slice(0, 8).map((intel, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.14)' }}>
                <span style={{ color: '#00ff9d', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>▸</span>
                <p className="font-mono" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', lineHeight: '1.5' }}>{intel}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
