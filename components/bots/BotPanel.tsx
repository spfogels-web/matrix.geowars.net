'use client';
import { useEffect, useState, useCallback } from 'react';
import { UserBot, BotInfluenceEntry, BotMessage } from '@/lib/engine/types';

interface BotTemplate {
  templateId: string;
  name: string;
  portrait: string;
  description: string;
  class: string;
  alignment: string;
  specialty: string;
  influenceScore: number;
  tensionModifier: number;
}

const CLASS_COLORS: Record<string, string> = {
  advisor: '#b44fff', economic: '#ffd700', intel: '#00f5ff',
  disruption: '#ff2d55', diplomatic: '#00ff9d',
};
const CLASS_LABELS: Record<string, string> = {
  advisor: 'ADVISOR', economic: 'ECONOMIC', intel: 'INTELLIGENCE',
  disruption: 'DISRUPTION', diplomatic: 'DIPLOMATIC',
};
const ALIGN_FLAGS: Record<string, string> = {
  usa: '🇺🇸', china: '🇨🇳', russia: '🇷🇺', neutral: '⚖️', independent: '👤',
};
const STANCE_META: Record<string, { color: string; icon: string }> = {
  aggressive:    { color: '#ff2d55', icon: '⚔' },
  neutral:       { color: '#00f5ff', icon: '◉' },
  stabilizing:   { color: '#00ff9d', icon: '🕊' },
  opportunistic: { color: '#ffd700', icon: '🎯' },
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
  const [templates, setTemplates]       = useState<BotTemplate[]>([]);
  const [deployed, setDeployed]         = useState<UserBot[]>([]);
  const [influenceLog, setInfluenceLog] = useState<BotInfluenceEntry[]>([]);
  const [botMessages, setBotMessages]   = useState<BotMessage[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion]     = useState('Global');
  const [deploying, setDeploying]       = useState(false);
  const [tab, setTab]                   = useState<'deploy' | 'active' | 'intel' | 'comms'>('deploy');
  const [error, setError]               = useState<string | null>(null);
  const [expandedBot, setExpandedBot]   = useState<string | null>(null);

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch('/api/bots');
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.templates ?? []);
      setDeployed(data.deployed ?? []);
      setInfluenceLog(data.botInfluenceLog ?? []);
      setBotMessages(data.botMessages ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 8000);
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
      if (!data.ok) setError(data.error);
      else { setSelectedTemplate(null); await fetchBots(); setTab('active'); }
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

  function fmt(ts: number) {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div
      className="fixed flex flex-col"
      style={{
        left: isOpen ? '0' : '-105vw',
        top: 0, bottom: 0,
        width: 'min(490px, 100vw)',
        zIndex: 300,
        transition: 'left 0.4s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(2,1,10,0.98)',
        borderRight: '1px solid rgba(180,79,255,0.2)',
        backdropFilter: 'blur(20px)',
        boxShadow: '20px 0 60px rgba(0,0,0,0.85)',
      }}>

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3.5 border-b"
        style={{ borderColor: 'rgba(180,79,255,0.18)', background: 'rgba(8,3,22,0.99)' }}>
        <div className="w-2.5 h-2.5 rounded-full status-blink" style={{ backgroundColor: '#b44fff', boxShadow: '0 0 10px #b44fff' }} />
        <span className="font-orbitron font-bold" style={{ color: '#b44fff', fontSize: '13px', letterSpacing: '0.2em' }}>
          AGENT COMMAND CENTER
        </span>
        <span className="font-mono ml-auto" style={{ color: 'rgba(180,79,255,0.4)', fontSize: '10px' }}>
          {deployed.length}/4 DEPLOYED
        </span>
        <button onClick={onClose}
          className="font-mono px-2 py-1 rounded border transition-all ml-2"
          style={{ fontSize: '11px', color: 'rgba(255,100,100,0.7)', borderColor: 'rgba(255,45,85,0.2)', background: 'rgba(255,45,85,0.05)' }}>
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b" style={{ borderColor: 'rgba(180,79,255,0.1)' }}>
        {(['deploy', 'active', 'intel', 'comms'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 font-orbitron font-bold py-2.5 transition-all"
            style={{
              fontSize: '9px', letterSpacing: '0.12em',
              color: tab === t ? '#b44fff' : 'rgba(200,210,240,0.3)',
              borderBottom: tab === t ? '2px solid #b44fff' : '2px solid transparent',
              background: tab === t ? 'rgba(180,79,255,0.07)' : 'transparent',
            }}>
            {t === 'deploy' ? '⬇ DEPLOY' : t === 'active' ? '⚡ ACTIVE' : t === 'intel' ? '📊 INTEL' : '💬 COMMS'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {/* ── DEPLOY TAB ── */}
        {tab === 'deploy' && (
          <div className="space-y-2.5">
            <div className="font-mono mb-4 px-1" style={{ color: 'rgba(180,79,255,0.45)', fontSize: '10px', letterSpacing: '0.1em' }}>
              SELECT A GLOBAL AGENT TO DEPLOY · {12 - deployed.length} AVAILABLE
            </div>

            {templates.map(tpl => {
              const cc = CLASS_COLORS[tpl.class] || '#00f5ff';
              const isSelected = selectedTemplate === tpl.templateId;
              const isDep = alreadyDeployed(tpl.templateId);
              return (
                <div key={tpl.templateId}
                  onClick={() => !isDep && setSelectedTemplate(isSelected ? null : tpl.templateId)}
                  className="rounded-xl p-3.5 transition-all"
                  style={{
                    border: `1px solid ${isSelected ? cc : isDep ? 'rgba(255,255,255,0.05)' : cc + '28'}`,
                    background: isSelected ? `${cc}10` : isDep ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.35)',
                    opacity: isDep ? 0.4 : 1,
                    cursor: isDep ? 'not-allowed' : 'pointer',
                    boxShadow: isSelected ? `0 0 16px ${cc}20` : 'none',
                  }}>
                  <div className="flex items-center gap-3 mb-1.5">
                    {/* Portrait */}
                    <div className="flex items-center justify-center rounded-lg shrink-0"
                      style={{ width: 38, height: 38, background: `${cc}15`, border: `1px solid ${cc}35`, fontSize: '20px' }}>
                      {tpl.portrait}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-orbitron font-bold" style={{ color: cc, fontSize: '13px' }}>{tpl.name}</div>
                      <div className="font-mono mt-0.5" style={{ color: 'rgba(200,210,240,0.5)', fontSize: '10px' }}>{tpl.description}</div>
                    </div>
                    {isDep
                      ? <span className="font-mono shrink-0" style={{ color: '#00ff9d', fontSize: '9px' }}>ACTIVE</span>
                      : <span className="font-mono shrink-0" style={{ color: cc, fontSize: '9px', background: `${cc}12`, padding: '2px 6px', borderRadius: 3, border: `1px solid ${cc}28` }}>
                          {ALIGN_FLAGS[tpl.alignment]} {tpl.alignment.toUpperCase()}
                        </span>
                    }
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mt-1">
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '10px' }}>
                      <span style={{ color: cc }}>{CLASS_LABELS[tpl.class] || tpl.class.toUpperCase()}</span>
                    </span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '10px' }}>
                      SPEC: <span style={{ color: 'rgba(200,210,240,0.8)' }}>{tpl.specialty.toUpperCase()}</span>
                    </span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '10px' }}>
                      INF: <span style={{ color: cc, fontWeight: 'bold' }}>{tpl.influenceScore}</span>
                    </span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '10px' }}>
                      TENSION: <span style={{ color: tpl.tensionModifier > 0 ? '#ff6a00' : tpl.tensionModifier < 0 ? '#00ff9d' : 'rgba(200,210,240,0.55)' }}>
                        {tpl.tensionModifier > 0 ? '+' : ''}{tpl.tensionModifier}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Region selector + deploy */}
            {selectedTpl && (
              <div className="mt-4 rounded-xl p-4 fade-in" style={{ background: 'rgba(180,79,255,0.06)', border: '1px solid rgba(180,79,255,0.22)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ fontSize: '20px' }}>{selectedTpl.portrait}</div>
                  <div className="font-orbitron font-bold" style={{ color: '#b44fff', fontSize: '12px', letterSpacing: '0.14em' }}>
                    DEPLOY: {selectedTpl.name}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="font-mono mb-1.5" style={{ color: 'rgba(200,210,240,0.45)', fontSize: '10px', letterSpacing: '0.08em' }}>TARGET REGION</div>
                  <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}
                    className="w-full font-mono rounded border px-2 py-2"
                    style={{ background: 'rgba(8,3,20,0.95)', color: 'rgba(180,79,255,0.85)', borderColor: 'rgba(120,60,255,0.3)', fontSize: '12px' }}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {error && <div className="font-mono mb-2 text-center" style={{ color: '#ff2d55', fontSize: '10px' }}>{error}</div>}
                <button onClick={handleDeploy} disabled={deploying}
                  className="w-full font-orbitron font-bold py-2.5 rounded-lg transition-all"
                  style={{ background: deploying ? 'rgba(180,79,255,0.08)' : 'rgba(180,79,255,0.16)', border: '1px solid rgba(180,79,255,0.45)', color: '#b44fff', fontSize: '11px', letterSpacing: '0.18em', cursor: deploying ? 'not-allowed' : 'pointer' }}>
                  {deploying ? 'DEPLOYING...' : '▶ DEPLOY AGENT'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVE TAB ── */}
        {tab === 'active' && (
          <div className="space-y-4">
            {deployed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.18)', fontSize: '12px', letterSpacing: '0.2em' }}>NO AGENTS DEPLOYED</div>
                <div className="font-mono mt-2 text-center" style={{ color: 'rgba(200,210,240,0.14)', fontSize: '11px' }}>Go to DEPLOY tab to activate agents</div>
              </div>
            ) : deployed.map(bot => {
              const cc = CLASS_COLORS[bot.class] || '#00f5ff';
              const mem = bot.memory;
              const stance = mem.stance ?? 'neutral';
              const sm = STANCE_META[stance] || STANCE_META.neutral;
              const confidence = mem.confidence ?? 60;
              const lt = mem.longTerm;
              const repScore = lt?.reputationScore ?? 0;
              const confColor = confidence >= 70 ? '#00ff9d' : confidence >= 40 ? '#ffd700' : '#ff2d55';
              const isExpanded = expandedBot === bot.id;

              return (
                <div key={bot.id} className="rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${cc}30`, background: `${cc}05` }}>

                  {/* Agent card header */}
                  <div className="p-3.5 cursor-pointer" onClick={() => setExpandedBot(isExpanded ? null : bot.id)}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center rounded-lg shrink-0"
                        style={{ width: 40, height: 40, background: `${cc}15`, border: `1px solid ${cc}35`, fontSize: '20px' }}>
                        {bot.portrait}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-orbitron font-bold" style={{ color: cc, fontSize: '13px' }}>{bot.name}</div>
                        <div className="font-mono mt-0.5" style={{ color: 'rgba(200,210,240,0.4)', fontSize: '9px' }}>
                          {ALIGN_FLAGS[bot.alignment]} {bot.alignment.toUpperCase()} · {bot.activeRegion}
                        </div>
                      </div>
                      {/* Stance badge */}
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
                        style={{ background: `${sm.color}12`, border: `1px solid ${sm.color}30` }}>
                        <span style={{ fontSize: '12px' }}>{sm.icon}</span>
                        <span className="font-mono" style={{ color: sm.color, fontSize: '9px', letterSpacing: '0.08em' }}>{stance.toUpperCase()}</span>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', marginLeft: 4 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { l: 'INFLUENCE', v: bot.influenceScore.toString(), c: cc },
                        { l: 'OPS', v: mem.totalInfluenceApplied.toString(), c: 'rgba(200,210,240,0.7)' },
                        { l: 'SUCCESS', v: `${mem.successRate}%`, c: mem.successRate >= 60 ? '#00ff9d' : mem.successRate >= 40 ? '#ffd700' : '#ff2d55' },
                        { l: 'REP', v: `${repScore > 0 ? '+' : ''}${repScore}`, c: repScore >= 0 ? '#00ff9d' : '#ff2d55' },
                      ].map(({ l, v, c }) => (
                        <div key={l} className="rounded-lg px-1.5 py-1.5 text-center"
                          style={{ background: 'rgba(0,0,0,0.45)', border: `1px solid ${cc}15` }}>
                          <div className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px' }}>{l}</div>
                          <div className="font-orbitron font-bold" style={{ color: c, fontSize: '13px' }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Confidence bar */}
                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="font-mono" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '9px', width: 50, flexShrink: 0 }}>CONFIDENCE</span>
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full bar-fill" style={{ width: `${confidence}%`, background: confColor, boxShadow: `0 0 6px ${confColor}60`, transition: 'width 0.6s ease' }} />
                      </div>
                      <span className="font-mono" style={{ color: confColor, fontSize: '10px', width: 32, textAlign: 'right' }}>{confidence}%</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 space-y-3 border-t fade-in" style={{ borderColor: `${cc}15` }}>
                      {/* Last action */}
                      {mem.shortTerm?.lastAction && (
                        <div className="mt-3 rounded-lg px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${cc}15` }}>
                          <div className="font-mono mb-1" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>LAST ACTION</div>
                          <div className="font-mono" style={{ color: 'rgba(200,210,240,0.75)', fontSize: '11px', lineHeight: '1.4' }}>{mem.shortTerm.lastAction}</div>
                        </div>
                      )}

                      {/* Recent statements */}
                      {(mem.shortTerm?.recentStatements ?? []).length > 0 && (
                        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${cc}12` }}>
                          <div className="font-mono mb-1.5" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>RECENT STATEMENTS</div>
                          {mem.shortTerm!.recentStatements.map((s, i) => (
                            <div key={i} className="font-exo italic mb-1.5" style={{ color: 'rgba(200,210,240,0.65)', fontSize: '11px', lineHeight: '1.45' }}>
                              &ldquo;{s.substring(0, 120)}{s.length > 120 ? '…' : ''}&rdquo;
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Mid-term: favored regions + trusted leaders */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${cc}12` }}>
                          <div className="font-mono mb-1" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>FAVORED REGIONS</div>
                          {(mem.midTerm?.favoredRegions ?? []).length === 0
                            ? <div className="font-mono" style={{ color: 'rgba(200,210,240,0.2)', fontSize: '10px' }}>None yet</div>
                            : (mem.midTerm?.favoredRegions ?? []).map(r => (
                                <div key={r} className="font-mono" style={{ color: 'rgba(200,210,240,0.65)', fontSize: '10px' }}>• {r}</div>
                              ))
                          }
                        </div>
                        <div className="rounded-lg px-2.5 py-2" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${cc}12` }}>
                          <div className="font-mono mb-1" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>TRUSTED LEADERS</div>
                          {(mem.midTerm?.trustedLeaders ?? []).length === 0
                            ? <div className="font-mono" style={{ color: 'rgba(200,210,240,0.2)', fontSize: '10px' }}>None yet</div>
                            : (mem.midTerm?.trustedLeaders ?? []).map(r => (
                                <div key={r} className="font-mono" style={{ color: 'rgba(200,210,240,0.65)', fontSize: '10px' }}>• {r}</div>
                              ))
                          }
                        </div>
                      </div>

                      {/* Long-term: W/L + dominant style */}
                      <div className="rounded-lg px-2.5 py-2 flex items-center gap-4" style={{ background: 'rgba(0,0,0,0.35)', border: `1px solid ${cc}12` }}>
                        <div>
                          <div className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>CAREER RECORD</div>
                          <div className="font-orbitron font-bold" style={{ color: '#00ff9d', fontSize: '13px' }}>
                            {lt?.successfulInterventions ?? 0}W
                            <span style={{ color: 'rgba(200,210,240,0.3)', fontSize: '11px', margin: '0 4px' }}>/</span>
                            <span style={{ color: '#ff2d55' }}>{lt?.failedInterventions ?? 0}L</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>DOMINANT STYLE</div>
                          <div className="font-mono" style={{ color: cc, fontSize: '11px' }}>{lt?.dominantStyle?.toUpperCase() ?? 'UNDEFINED'}</div>
                        </div>
                        <div className="ml-auto">
                          <div className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '8px', letterSpacing: '0.1em' }}>REPUTATION</div>
                          <div className="font-orbitron font-bold" style={{ color: repScore >= 0 ? '#00ff9d' : '#ff2d55', fontSize: '13px' }}>
                            {repScore > 0 ? '+' : ''}{repScore}
                          </div>
                        </div>
                      </div>

                      {/* Tension modifier */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '10px' }}>TENSION MODIFIER</span>
                        <span className="font-orbitron font-bold" style={{
                          color: bot.tensionModifier > 0 ? '#ff6a00' : bot.tensionModifier < 0 ? '#00ff9d' : 'rgba(200,210,240,0.45)', fontSize: '13px',
                        }}>
                          {bot.tensionModifier > 0 ? '+' : ''}{bot.tensionModifier}
                        </span>
                        <span className="font-mono ml-auto" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '9px' }}>
                          DEPLOYED {new Date(bot.deployedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <button onClick={() => handleRemove(bot.id)}
                        className="w-full font-mono py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.18)', color: 'rgba(255,100,100,0.6)', fontSize: '10px', letterSpacing: '0.1em', cursor: 'pointer' }}>
                        ✕ RECALL AGENT
                      </button>
                    </div>
                  )}

                  {/* Collapsed recall */}
                  {!isExpanded && (
                    <div className="px-3.5 pb-3">
                      <button onClick={() => handleRemove(bot.id)}
                        className="w-full font-mono py-1.5 rounded-lg transition-all"
                        style={{ background: 'rgba(255,45,85,0.04)', border: '1px solid rgba(255,45,85,0.15)', color: 'rgba(255,100,100,0.5)', fontSize: '10px', letterSpacing: '0.1em', cursor: 'pointer' }}>
                        ✕ RECALL
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── INTEL TAB — indicator influence log ── */}
        {tab === 'intel' && (
          <div className="space-y-2">
            <div className="font-mono mb-3 px-1" style={{ color: 'rgba(180,79,255,0.45)', fontSize: '10px', letterSpacing: '0.1em' }}>
              AGENT MARKET INFLUENCE LOG
            </div>
            {influenceLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.18)', fontSize: '12px', letterSpacing: '0.2em' }}>NO OPS YET</div>
                <div className="font-mono mt-2 text-center" style={{ color: 'rgba(200,210,240,0.14)', fontSize: '11px' }}>Deploy agents and run simulation</div>
              </div>
            ) : influenceLog.map(entry => {
              const cc = CLASS_COLORS[entry.botClass] || '#00f5ff';
              const isPos = entry.delta.startsWith('+');
              return (
                <div key={entry.id} className="rounded-lg px-3 py-2.5"
                  style={{ background: `${cc}07`, border: `1px solid ${cc}18` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-orbitron font-bold" style={{ color: cc, fontSize: '11px' }}>{entry.botName}</span>
                    <span className="font-mono ml-auto" style={{ color: isPos ? '#ff6a00' : '#00ff9d', fontSize: '12px', fontWeight: 'bold' }}>{entry.delta}</span>
                  </div>
                  <div className="font-mono" style={{ color: 'rgba(200,210,240,0.65)', fontSize: '11px' }}>{entry.effect}</div>
                  <div className="font-mono mt-1" style={{ color: 'rgba(200,210,240,0.28)', fontSize: '9px' }}>
                    {entry.region} · {fmt(entry.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── COMMS TAB — bot AI statements ── */}
        {tab === 'comms' && (
          <div className="space-y-3">
            <div className="font-mono mb-3 px-1" style={{ color: 'rgba(180,79,255,0.45)', fontSize: '10px', letterSpacing: '0.1em' }}>
              AGENT COMMUNICATIONS LOG
            </div>
            {botMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.18)', fontSize: '12px', letterSpacing: '0.2em' }}>NO COMMS YET</div>
                <div className="font-mono mt-2 text-center" style={{ color: 'rgba(200,210,240,0.14)', fontSize: '11px' }}>Agents will speak as events unfold</div>
              </div>
            ) : botMessages.map(msg => {
              const cc = CLASS_COLORS[msg.botClass] || '#b44fff';
              const confColor = msg.confidence >= 8 ? '#00ff9d' : msg.confidence >= 5 ? '#ffd700' : '#ff6a00';
              return (
                <div key={msg.id} className="rounded-xl overflow-hidden slide-up"
                  style={{ border: `1px solid ${cc}25`, background: `${cc}07` }}>
                  <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2">
                    <div className="flex items-center justify-center rounded-lg shrink-0"
                      style={{ width: 32, height: 32, background: `${cc}18`, border: `1px solid ${cc}35`, fontSize: '16px' }}>
                      {msg.botPortrait}
                    </div>
                    <div>
                      <div className="font-orbitron font-bold" style={{ color: cc, fontSize: '12px' }}>{msg.botName}</div>
                      <div className="font-mono" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '9px' }}>
                        {ALIGN_FLAGS[msg.botAlignment]} {msg.botAlignment.toUpperCase()} · {fmt(msg.timestamp)}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '9px' }}>CONF</span>
                      <span className="font-orbitron font-bold" style={{ color: confColor, fontSize: '12px' }}>{msg.confidence}/10</span>
                    </div>
                  </div>
                  <div className="px-3.5 pb-3">
                    <p className="font-exo mb-2" style={{ color: 'rgba(225,220,245,0.9)', fontSize: '13px', lineHeight: '1.55' }}>
                      {msg.content}
                    </p>
                    <div className="flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${cc}15` }}>
                      <span style={{ color: cc, fontSize: '11px' }}>▶</span>
                      <span className="font-mono" style={{ color: 'rgba(220,225,245,0.55)', fontSize: '11px' }}>{msg.action}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2.5 border-t"
        style={{ borderColor: 'rgba(180,79,255,0.1)', background: 'rgba(4,1,14,0.99)' }}>
        <div className="font-mono text-center" style={{ color: 'rgba(180,79,255,0.28)', fontSize: '9px', letterSpacing: '0.1em' }}>
          GEOWARS AGENT NETWORK · {deployed.length > 0 ? `${deployed.length} AGENT${deployed.length > 1 ? 'S' : ''} ACTIVE` : 'NO ACTIVE AGENTS'} · MAX 4 CONCURRENT
        </div>
      </div>
    </div>
  );
}
