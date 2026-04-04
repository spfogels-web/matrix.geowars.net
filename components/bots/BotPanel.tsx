'use client';
import { useEffect, useState, useCallback } from 'react';
import { UserBot, BotInfluenceEntry } from '@/lib/engine/types';

// ── Template display data (matches templateIds in API) ────────────────────────
interface BotTemplate {
  templateId: string;
  name: string;
  class: string;
  alignment: string;
  specialty: string;
  influenceScore: number;
  tensionModifier: number;
}

const CLASS_COLORS: Record<string, string> = {
  advisor:    '#b44fff',
  economic:   '#ffd700',
  intel:      '#00f5ff',
  disruption: '#ff2d55',
  diplomatic: '#00ff9d',
};

const CLASS_ICONS: Record<string, string> = {
  advisor:    '🧠',
  economic:   '📈',
  intel:      '🔍',
  disruption: '⚡',
  diplomatic: '🕊',
};

const ALIGN_FLAGS: Record<string, string> = {
  usa: '🇺🇸', china: '🇨🇳', russia: '🇷🇺',
  neutral: '⚖️', independent: '👤',
};

const REGIONS = [
  'Global', 'Middle East', 'Eastern Europe', 'Asia-Pacific',
  'Persian Gulf', 'Korean Peninsula', 'Taiwan Strait', 'Europe',
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function BotPanel({ isOpen, onClose }: Props) {
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [deployed, setDeployed] = useState<UserBot[]>([]);
  const [influenceLog, setInfluenceLog] = useState<BotInfluenceEntry[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('Global');
  const [deploying, setDeploying] = useState(false);
  const [tab, setTab] = useState<'deploy' | 'active' | 'intel'>('deploy');
  const [error, setError] = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch('/api/bots');
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates ?? []);
      setDeployed(data.deployed ?? []);
      setInfluenceLog(data.botInfluenceLog ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 10000);
    return () => clearInterval(interval);
  }, [fetchBots]);

  async function handleDeploy() {
    if (!selectedTemplate) return;
    setDeploying(true);
    setError(null);
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplate, region: selectedRegion }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); }
      else { setSelectedTemplate(null); await fetchBots(); }
    } catch { setError('Network error'); }
    setDeploying(false);
  }

  async function handleRemove(botId: string) {
    try {
      await fetch('/api/bots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      });
      await fetchBots();
    } catch {}
  }

  const selectedTpl = templates.find(t => t.templateId === selectedTemplate);
  const alreadyDeployed = (id: string) => deployed.some(b => b.templateId === id);

  return (
    <div
      className="fixed z-50 flex flex-col"
      style={{
        left: isOpen ? '0' : '-500px',
        top: 0, bottom: 0,
        width: '460px',
        transition: 'left 0.4s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(2,1,10,0.97)',
        borderRight: '1px solid rgba(180,79,255,0.25)',
        backdropFilter: 'blur(20px)',
        boxShadow: '20px 0 60px rgba(0,0,0,0.8)',
      }}>

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: 'rgba(180,79,255,0.2)', background: 'rgba(10,4,24,0.98)' }}>
        <div className="w-2.5 h-2.5 rounded-full status-blink" style={{ backgroundColor: '#b44fff', boxShadow: '0 0 8px #b44fff' }} />
        <span className="font-orbitron font-bold" style={{ color: '#b44fff', fontSize: '12px', letterSpacing: '0.18em' }}>
          AGENT DEPLOYMENT
        </span>
        <span className="font-mono ml-auto" style={{ color: 'rgba(180,79,255,0.45)', fontSize: '10px' }}>
          {deployed.length}/4 ACTIVE
        </span>
        <button onClick={onClose}
          className="font-mono px-2 py-1 rounded border transition-all ml-2"
          style={{ fontSize: '11px', color: 'rgba(255,100,100,0.7)', borderColor: 'rgba(255,45,85,0.25)', background: 'rgba(255,45,85,0.06)' }}>
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b" style={{ borderColor: 'rgba(180,79,255,0.12)' }}>
        {(['deploy', 'active', 'intel'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 font-orbitron font-bold py-2.5 transition-all"
            style={{
              fontSize: '10px', letterSpacing: '0.15em',
              color: tab === t ? '#b44fff' : 'rgba(200,210,240,0.35)',
              borderBottom: tab === t ? '2px solid #b44fff' : '2px solid transparent',
              background: tab === t ? 'rgba(180,79,255,0.08)' : 'transparent',
            }}>
            {t === 'deploy' ? '⬇ DEPLOY' : t === 'active' ? '⚡ ACTIVE' : '📊 INTEL'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* DEPLOY TAB */}
        {tab === 'deploy' && (
          <div className="space-y-2">
            <div className="font-mono mb-3" style={{ color: 'rgba(180,79,255,0.5)', fontSize: '10px', letterSpacing: '0.1em' }}>
              SELECT AN AGENT TO DEPLOY INTO THE SIMULATION
            </div>

            {templates.map(tpl => {
              const cc = CLASS_COLORS[tpl.class] || '#00f5ff';
              const isSelected = selectedTemplate === tpl.templateId;
              const isDep = alreadyDeployed(tpl.templateId);
              return (
                <div key={tpl.templateId}
                  onClick={() => !isDep && setSelectedTemplate(isSelected ? null : tpl.templateId)}
                  className="rounded-xl p-3 cursor-pointer transition-all"
                  style={{
                    border: `1px solid ${isSelected ? cc : isDep ? 'rgba(255,255,255,0.06)' : cc + '30'}`,
                    background: isSelected ? `${cc}12` : isDep ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.3)',
                    opacity: isDep ? 0.45 : 1,
                    cursor: isDep ? 'not-allowed' : 'pointer',
                  }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: '16px' }}>{CLASS_ICONS[tpl.class]}</span>
                    <span className="font-orbitron font-bold" style={{ color: cc, fontSize: '12px' }}>{tpl.name}</span>
                    {isDep && <span className="font-mono ml-auto" style={{ color: '#00ff9d', fontSize: '9px' }}>DEPLOYED</span>}
                    {!isDep && (
                      <span className="font-mono ml-auto" style={{ color: cc, fontSize: '9px',
                        background: `${cc}15`, padding: '1px 6px', borderRadius: '3px', border: `1px solid ${cc}30` }}>
                        {ALIGN_FLAGS[tpl.alignment]} {tpl.alignment.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.55)', fontSize: '10px' }}>
                      CLASS: <span style={{ color: cc }}>{tpl.class.toUpperCase()}</span>
                    </span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.55)', fontSize: '10px' }}>
                      SPEC: <span style={{ color: 'rgba(200,210,240,0.8)' }}>{tpl.specialty.toUpperCase()}</span>
                    </span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.55)', fontSize: '10px' }}>
                      INF: <span style={{ color: cc }}>{tpl.influenceScore}</span>
                    </span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.55)', fontSize: '10px' }}>
                      TENSION: <span style={{ color: tpl.tensionModifier > 0 ? '#ff6a00' : tpl.tensionModifier < 0 ? '#00ff9d' : 'rgba(200,210,240,0.6)' }}>
                        {tpl.tensionModifier > 0 ? '+' : ''}{tpl.tensionModifier}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Region selector + deploy button */}
            {selectedTpl && (
              <div className="mt-3 rounded-xl p-4 fade-in" style={{ background: 'rgba(180,79,255,0.06)', border: '1px solid rgba(180,79,255,0.25)' }}>
                <div className="font-orbitron font-bold mb-3" style={{ color: '#b44fff', fontSize: '11px', letterSpacing: '0.15em' }}>
                  DEPLOY: {selectedTpl.name}
                </div>
                <div className="mb-3">
                  <div className="font-mono mb-1.5" style={{ color: 'rgba(200,210,240,0.5)', fontSize: '10px' }}>TARGET REGION</div>
                  <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
                    className="w-full font-mono rounded border px-2 py-2"
                    style={{ background: 'rgba(8,3,20,0.95)', color: 'rgba(180,79,255,0.85)',
                      borderColor: 'rgba(120,60,255,0.35)', fontSize: '12px' }}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {error && (
                  <div className="font-mono mb-2 text-center" style={{ color: '#ff2d55', fontSize: '10px' }}>{error}</div>
                )}
                <button onClick={handleDeploy} disabled={deploying}
                  className="w-full font-orbitron font-bold py-2.5 rounded-lg transition-all"
                  style={{ background: deploying ? 'rgba(180,79,255,0.1)' : 'rgba(180,79,255,0.18)',
                    border: '1px solid rgba(180,79,255,0.5)', color: '#b44fff', fontSize: '11px',
                    letterSpacing: '0.18em', cursor: deploying ? 'not-allowed' : 'pointer' }}>
                  {deploying ? 'DEPLOYING...' : '▶ DEPLOY AGENT'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ACTIVE TAB */}
        {tab === 'active' && (
          <div className="space-y-3">
            {deployed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.2)', fontSize: '12px', letterSpacing: '0.2em' }}>
                  NO AGENTS DEPLOYED
                </div>
                <div className="font-mono mt-2 text-center" style={{ color: 'rgba(200,210,240,0.15)', fontSize: '11px' }}>
                  Go to DEPLOY tab to add agents
                </div>
              </div>
            ) : deployed.map(bot => {
              const cc = CLASS_COLORS[bot.class] || '#00f5ff';
              return (
                <div key={bot.id} className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${cc}35`, background: `${cc}06` }}>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ fontSize: '15px' }}>{CLASS_ICONS[bot.class]}</span>
                      <span className="font-orbitron font-bold" style={{ color: cc, fontSize: '12px' }}>{bot.name}</span>
                      <span className="font-mono ml-auto" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '9px' }}>
                        {bot.activeRegion}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      {[
                        { l: 'INFLUENCE', v: bot.influenceScore.toString() },
                        { l: 'SUCCESS', v: `${bot.memory.successRate}%` },
                        { l: 'OPS', v: bot.memory.totalInfluenceApplied.toString() },
                      ].map(({ l, v }) => (
                        <div key={l} className="rounded-lg px-2 py-1.5 text-center"
                          style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${cc}20` }}>
                          <div className="font-mono" style={{ color: 'rgba(200,210,240,0.38)', fontSize: '8px' }}>{l}</div>
                          <div className="font-orbitron font-bold" style={{ color: cc, fontSize: '14px' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Memory — recent strategies */}
                    {bot.memory.lastActions.length > 0 && (
                      <div className="mb-2.5 rounded-lg px-2.5 py-2"
                        style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${cc}15` }}>
                        <div className="font-mono mb-1" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '9px' }}>LAST ACTION</div>
                        <div className="font-mono" style={{ color: 'rgba(200,210,240,0.75)', fontSize: '11px', lineHeight: '1.4' }}>
                          {bot.memory.lastActions[0]}
                        </div>
                      </div>
                    )}

                    {/* Tension modifier badge */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="font-mono" style={{ color: 'rgba(200,210,240,0.4)', fontSize: '10px' }}>TENSION MOD:</span>
                      <span className="font-orbitron font-bold" style={{
                        color: bot.tensionModifier > 0 ? '#ff6a00' : bot.tensionModifier < 0 ? '#00ff9d' : 'rgba(200,210,240,0.5)',
                        fontSize: '13px',
                      }}>
                        {bot.tensionModifier > 0 ? '+' : ''}{bot.tensionModifier}
                      </span>
                      <span className="font-mono" style={{ color: 'rgba(200,210,240,0.4)', fontSize: '10px', marginLeft: '8px' }}>
                        DEPLOYED: {new Date(bot.deployedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button onClick={() => handleRemove(bot.id)}
                      className="w-full font-mono py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,45,85,0.06)', border: '1px solid rgba(255,45,85,0.2)',
                        color: 'rgba(255,100,100,0.65)', fontSize: '10px', letterSpacing: '0.1em', cursor: 'pointer' }}>
                      ✕ RECALL AGENT
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* INTEL TAB — bot influence log */}
        {tab === 'intel' && (
          <div className="space-y-2">
            <div className="font-mono mb-3" style={{ color: 'rgba(180,79,255,0.5)', fontSize: '10px', letterSpacing: '0.1em' }}>
              AGENT INFLUENCE OPERATIONS LOG
            </div>
            {influenceLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.2)', fontSize: '12px', letterSpacing: '0.2em' }}>
                  NO INFLUENCE OPS YET
                </div>
                <div className="font-mono mt-2 text-center" style={{ color: 'rgba(200,210,240,0.15)', fontSize: '11px' }}>
                  Deploy agents and run simulation
                </div>
              </div>
            ) : influenceLog.map(entry => {
              const cc = CLASS_COLORS[entry.botClass] || '#00f5ff';
              const isPos = entry.delta.startsWith('+');
              return (
                <div key={entry.id} className="rounded-lg px-3 py-2.5"
                  style={{ background: `${cc}08`, border: `1px solid ${cc}20` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ fontSize: '12px' }}>{CLASS_ICONS[entry.botClass]}</span>
                    <span className="font-orbitron font-bold" style={{ color: cc, fontSize: '10px' }}>{entry.botName}</span>
                    <span className="font-mono ml-auto" style={{ color: isPos ? '#ff6a00' : '#00ff9d', fontSize: '11px', fontWeight: 'bold' }}>
                      {entry.delta}
                    </span>
                  </div>
                  <div className="font-mono" style={{ color: 'rgba(200,210,240,0.7)', fontSize: '11px' }}>
                    {entry.effect}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '9px' }}>
                      {entry.region} · {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2.5 border-t"
        style={{ borderColor: 'rgba(180,79,255,0.12)', background: 'rgba(6,2,18,0.98)' }}>
        <div className="font-mono text-center" style={{ color: 'rgba(180,79,255,0.35)', fontSize: '9px', letterSpacing: '0.1em' }}>
          GEOWARS AGENT NETWORK · MAX 4 CONCURRENT DEPLOYMENTS
        </div>
      </div>
    </div>
  );
}
