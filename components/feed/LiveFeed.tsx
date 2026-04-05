'use client';
import { useEffect, useRef, useState } from 'react';
import { GeoEvent, LeaderMessage, BotMessage } from '@/lib/engine/types';

interface Props {
  events: GeoEvent[];
  messages: LeaderMessage[];
  botMessages?: BotMessage[];
  isExpanded: boolean;
  onToggle: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  military: '#ff2d55', economic: '#ffd700', cyber: '#00f5ff',
  diplomatic: '#b44fff', intelligence: '#00ff9d', nuclear: '#ff2d55', humanitarian: '#ff6a00',
};
const TYPE_ICONS: Record<string, string> = {
  military: '⚔', economic: '💹', cyber: '⚡', diplomatic: '🤝',
  intelligence: '👁', nuclear: '☢', humanitarian: '🆘',
};
const TONE_COLORS: Record<string, string> = {
  aggressive: '#ff6a00', threatening: '#ff2d55', defensive: '#ffd700',
  diplomatic: '#b44fff', neutral: 'rgba(0,245,255,0.75)', defiant: '#ff6a00',
};
const CLASS_COLORS: Record<string, string> = {
  advisor: '#b44fff', economic: '#ffd700', intel: '#00f5ff',
  disruption: '#ff2d55', diplomatic: '#00ff9d',
};
const ALIGN_FLAGS: Record<string, string> = {
  usa: '🇺🇸', china: '🇨🇳', russia: '🇷🇺', neutral: '⚖️', independent: '👤',
};

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type FeedItem =
  | { kind: 'event';  data: GeoEvent;       ts: number }
  | { kind: 'msg';    data: LeaderMessage;   ts: number }
  | { kind: 'bot';    data: BotMessage;      ts: number };

export default function LiveFeed({ events, messages, botMessages = [], isExpanded, onToggle }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length, messages.length, botMessages.length]);

  const items: FeedItem[] = [
    ...events.map(e => ({ kind: 'event' as const, data: e, ts: e.timestamp })),
    ...messages.map(m => ({ kind: 'msg' as const, data: m, ts: m.timestamp })),
    ...botMessages.map(b => ({ kind: 'bot' as const, data: b, ts: b.timestamp })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 100);

  const filtered = filter === 'all' ? items
    : filter === 'comms' ? items.filter(i => i.kind === 'msg')
    : filter === 'agents' ? items.filter(i => i.kind === 'bot')
    : items.filter(i => i.kind === 'event' && (i.data as GeoEvent).type === filter);

  return (
    <div className="rounded-xl flex flex-col h-full" style={{ background: 'rgba(0,0,0,0.96)', border: '1px solid rgba(120,60,255,0.2)', backdropFilter: 'blur(8px)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: 'rgba(120,60,255,0.12)' }}>
        <div className="w-3 h-3 rounded-full status-blink" style={{ backgroundColor: '#00ff9d', boxShadow: '0 0 8px #00ff9d' }} />
        <span className="font-orbitron font-bold neon-cyan" style={{ fontSize: '13px', letterSpacing: '0.18em' }}>
          LIVE SITUATION FEED
        </span>
        <span className="font-mono ml-auto" style={{ color: 'rgba(200,210,240,0.4)', fontSize: '11px' }}>{items.length} ENTRIES</span>
        <button onClick={onToggle}
          className="font-mono px-2.5 py-1 rounded border transition-all"
          style={{ fontSize: '11px', color: 'rgba(0,245,255,0.5)', borderColor: 'rgba(0,245,255,0.2)' }}>
          {isExpanded ? '↙' : '↗'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 px-3 py-2.5 border-b shrink-0 flex-wrap" style={{ borderColor: 'rgba(120,60,255,0.08)' }}>
        {['all', 'military', 'economic', 'cyber', 'diplomatic', 'comms', 'agents'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="font-mono px-2 py-1 rounded transition-all"
            style={{
              fontSize: '10px', letterSpacing: '0.08em',
              background: filter === f ? (f === 'agents' ? 'rgba(180,79,255,0.2)' : 'rgba(120,60,255,0.2)') : 'transparent',
              color: filter === f ? (f === 'agents' ? '#b44fff' : '#b44fff') : 'rgba(200,210,240,0.4)',
              border: filter === f ? `1px solid ${f === 'agents' ? 'rgba(180,79,255,0.45)' : 'rgba(120,60,255,0.45)'}` : '1px solid transparent',
            }}>
            {f === 'agents' ? '🤖 AGENTS' : f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Feed content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="font-orbitron" style={{ color: 'rgba(180,79,255,0.2)', fontSize: '16px', letterSpacing: '0.2em' }}>
              AWAITING SIMULATION
            </div>
            <div className="font-mono mt-2" style={{ color: 'rgba(200,210,240,0.18)', fontSize: '12px' }}>
              Initiate to begin intelligence feed
              <span className="status-blink" style={{ display: 'inline-block' }}>_</span>
            </div>
          </div>
        )}

        {filtered.map((item, i) => {

          // ── EVENT CARD ────────────────────────────────────────────────────
          if (item.kind === 'event') {
            const ev = item.data as GeoEvent;
            const color = TYPE_COLORS[ev.type] || '#00f5ff';
            return (
              <div key={ev.id} className="rounded-xl p-4 border slide-up"
                style={{ background: `${color}09`, borderColor: `${color}28`, animationDelay: `${Math.min(i, 3) * 0.05}s` }}>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span className="font-mono font-bold px-3 py-1 rounded"
                    style={{ color, background: `${color}18`, fontSize: '11px', letterSpacing: '0.08em' }}>
                    {TYPE_ICONS[ev.type]} {ev.type.toUpperCase()}
                  </span>
                  <span className="font-mono" style={{ color: 'rgba(200,210,240,0.38)', fontSize: '11px' }}>{fmt(ev.timestamp)}</span>
                  {ev.region && (
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.38)', fontSize: '11px' }}>📍 {ev.region}</span>
                  )}
                  <span className="ml-auto font-orbitron font-bold" style={{ color, fontSize: '15px' }}>{ev.impact}/10</span>
                </div>
                <div className="font-orbitron font-bold mb-2" style={{ color, fontSize: '15px', letterSpacing: '0.03em' }}>{ev.title}</div>
                <p style={{ color: 'rgba(220,225,245,0.90)', fontSize: '13.5px', lineHeight: '1.6', fontFamily: 'Exo 2,sans-serif' }}>
                  {ev.description}
                </p>
              </div>
            );
          }

          // ── LEADER MESSAGE CARD ───────────────────────────────────────────
          if (item.kind === 'msg') {
            const msg = item.data as LeaderMessage;
            const tc = TONE_COLORS[msg.tone] || 'rgba(0,245,255,0.75)';
            const ec = msg.escalation >= 8 ? '#ff2d55' : msg.escalation >= 5 ? '#ff6a00' : '#00ff9d';
            return (
              <div key={msg.id} className="slide-left" style={{ animationDelay: `${Math.min(i, 3) * 0.05}s` }}>
                <div className="flex items-center gap-2.5 mb-2 px-1">
                  <span style={{ fontSize: '18px' }}>{msg.leaderFlag}</span>
                  <span className="font-orbitron font-bold" style={{ color: msg.leaderColor, fontSize: '13px' }}>{msg.leaderName}</span>
                  {msg.toAgent !== 'ALL' && (
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.4)', fontSize: '11px' }}>→ {msg.toAgent}</span>
                  )}
                  <span className="font-mono" style={{ color: 'rgba(200,210,240,0.3)', fontSize: '11px' }}>{fmt(msg.timestamp)}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="font-mono px-2 py-0.5 rounded"
                      style={{ color: tc, background: `${tc}15`, fontSize: '10px', border: `1px solid ${tc}35` }}>
                      {msg.tone.toUpperCase()}
                    </span>
                    <span className="font-orbitron font-bold" style={{ color: ec, fontSize: '15px' }}>{msg.escalation}/10</span>
                  </div>
                </div>
                <div className="rounded-xl p-3.5 ml-7"
                  style={{ background: `${msg.leaderColor}0b`, border: `1px solid ${msg.leaderColor}28` }}>
                  <p className="font-exo italic mb-2.5" style={{ color: 'rgba(225,220,245,0.94)', fontSize: '14px', lineHeight: '1.6' }}>
                    &ldquo;{msg.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-2">
                    <span style={{ color: msg.leaderColor, fontSize: '12px' }}>▶</span>
                    <span className="font-mono" style={{ color: 'rgba(220,225,245,0.72)', fontSize: '12px' }}>{msg.action}</span>
                  </div>
                </div>
              </div>
            );
          }

          // ── BOT AGENT MESSAGE CARD ────────────────────────────────────────
          if (item.kind === 'bot') {
            const bot = item.data as BotMessage;
            const cc = CLASS_COLORS[bot.botClass] || '#b44fff';
            const confColor = bot.confidence >= 8 ? '#00ff9d' : bot.confidence >= 5 ? '#ffd700' : '#ff6a00';
            const confBars = Math.round(bot.confidence / 2); // 1-5 bars

            return (
              <div key={bot.id} className="slide-left" style={{ animationDelay: `${Math.min(i, 3) * 0.05}s` }}>
                {/* Agent header row */}
                <div className="flex items-center gap-2.5 mb-2 px-1">
                  {/* Portrait + class glow */}
                  <div className="flex items-center justify-center rounded-lg shrink-0"
                    style={{ width: 32, height: 32, background: `${cc}18`, border: `1px solid ${cc}40`, fontSize: '16px' }}>
                    {bot.botPortrait}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-orbitron font-bold" style={{ color: cc, fontSize: '12px', lineHeight: 1.2 }}>{bot.botName}</span>
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.38)', fontSize: '9px', letterSpacing: '0.08em' }}>
                      {ALIGN_FLAGS[bot.botAlignment]} {bot.botAlignment.toUpperCase()} · {bot.botClass.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-mono" style={{ color: 'rgba(200,210,240,0.28)', fontSize: '10px' }}>{fmt(bot.timestamp)}</span>
                  {/* Confidence meter */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="font-mono" style={{ color: 'rgba(200,210,240,0.35)', fontSize: '9px' }}>CONF</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(b => (
                        <div key={b} style={{
                          width: 5, height: 10, borderRadius: 2,
                          background: b <= confBars ? confColor : 'rgba(255,255,255,0.08)',
                        }} />
                      ))}
                    </div>
                    <span className="font-orbitron font-bold" style={{ color: confColor, fontSize: '12px' }}>{bot.confidence}/10</span>
                  </div>
                </div>

                {/* Statement bubble */}
                <div className="rounded-xl p-3.5 ml-10"
                  style={{ background: `${cc}08`, border: `1px solid ${cc}25` }}>
                  {/* "Thinking" label */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: cc, boxShadow: `0 0 6px ${cc}` }} />
                    <span className="font-mono" style={{ color: `${cc}90`, fontSize: '9px', letterSpacing: '0.12em' }}>
                      AGENT ASSESSMENT
                    </span>
                  </div>
                  <p className="font-exo mb-2.5" style={{ color: 'rgba(225,220,245,0.92)', fontSize: '13.5px', lineHeight: '1.6' }}>
                    {bot.content}
                  </p>
                  <div className="flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${cc}18` }}>
                    <span style={{ color: cc, fontSize: '11px' }}>▶</span>
                    <span className="font-mono" style={{ color: 'rgba(220,225,245,0.65)', fontSize: '11px' }}>{bot.action}</span>
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
