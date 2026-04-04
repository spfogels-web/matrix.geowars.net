'use client';
import { useEffect, useRef, useState } from 'react';
import { Leader, LeaderMessage } from '@/lib/engine/types';

interface Props {
  messages: LeaderMessage[];
  leaders: Leader[];
  isOpen: boolean;
  onClose: () => void;
}

const TONE_COLORS: Record<string, string> = {
  aggressive:'#ff6a00', threatening:'#ff2d55', defensive:'#ffd700',
  diplomatic:'#b44fff', neutral:'#00f5ff', defiant:'#ff6a00',
};

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', { hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

export default function LeaderChat({ messages, leaders, isOpen, onClose }: Props) {
  const [filter, setFilter] = useState<string>('ALL');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages.length, isOpen]);

  const sorted = [...messages].sort((a,b) => a.timestamp - b.timestamp);
  const filtered = filter === 'ALL' ? sorted : sorted.filter(m =>
    m.leaderName.toLowerCase().includes(filter.toLowerCase()) ||
    (m.toAgent && m.toAgent.toLowerCase().includes(filter.toLowerCase()))
  );

  const uniqueNames = messages.map(m => m.leaderName).filter((n, i, a) => a.indexOf(n) === i).slice(0, 8);

  return (
    <div className="fixed z-50 flex flex-col"
      style={{
        right: isOpen ? '0' : '-480px',
        top: 0, bottom: 0,
        width: '460px',
        transition: 'right 0.4s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(2,1,10,0.97)',
        borderLeft: '1px solid rgba(120,60,255,0.3)',
        backdropFilter: 'blur(20px)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.8)',
      }}>

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor:'rgba(120,60,255,0.2)', background:'rgba(10,4,24,0.98)' }}>
        <div className="w-2.5 h-2.5 rounded-full status-blink" style={{ backgroundColor:'#b44fff', boxShadow:'0 0 8px #b44fff' }}/>
        <span className="font-orbitron font-bold" style={{ color:'#b44fff', fontSize:'12px', letterSpacing:'0.18em' }}>
          AGENT COMMS
        </span>
        <span className="font-mono ml-auto" style={{ color:'rgba(180,79,255,0.45)', fontSize:'10px' }}>
          {filtered.length} MESSAGES
        </span>
        <button onClick={onClose}
          className="font-mono px-2 py-1 rounded border transition-all ml-2"
          style={{ fontSize:'11px', color:'rgba(255,100,100,0.7)', borderColor:'rgba(255,45,85,0.25)', background:'rgba(255,45,85,0.06)' }}>
          ✕ CLOSE
        </button>
      </div>

      {/* Leader filter tabs */}
      <div className="shrink-0 flex flex-wrap gap-1.5 px-3 py-2.5 border-b"
        style={{ borderColor:'rgba(120,60,255,0.12)', background:'rgba(8,3,20,0.8)' }}>
        {['ALL', ...uniqueNames].map(name => {
          const leader = leaders.find(l => l.name === name);
          const isActive = filter === name;
          return (
            <button key={name} onClick={() => setFilter(name)}
              className="font-mono rounded-full px-2.5 py-0.5 transition-all flex items-center gap-1"
              style={{
                fontSize:'9.5px', letterSpacing:'0.06em',
                background: isActive ? (leader?.color ? `${leader.color}22` : 'rgba(120,60,255,0.2)') : 'transparent',
                color: isActive ? (leader?.color || '#b44fff') : 'rgba(200,210,240,0.45)',
                border: `1px solid ${isActive ? (leader?.color || 'rgba(120,60,255,0.5)') : 'transparent'}`,
              }}>
              {name !== 'ALL' && leader?.flag && <span style={{ fontSize:'11px' }}>{leader.flag}</span>}
              {name === 'ALL' ? 'ALL' : name.split(' ').slice(-1)[0].toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="font-orbitron" style={{ color:'rgba(120,60,255,0.2)', fontSize:'13px', letterSpacing:'0.2em' }}>
              NO TRANSMISSIONS
            </div>
            <div className="font-mono mt-2" style={{ color:'rgba(200,210,240,0.15)', fontSize:'11px' }}>
              Start simulation to monitor communications
            </div>
          </div>
        )}

        {filtered.map((msg, i) => {
          const tc = TONE_COLORS[msg.tone] || '#00f5ff';
          const ec = msg.escalation >= 8 ? '#ff2d55' : msg.escalation >= 5 ? '#ff6a00' : '#00ff9d';
          const leaderId = msg.leaderId;

          return (
            <div key={msg.id} className="fade-in" style={{ animationDelay: `${Math.min(i,5)*0.03}s` }}>
              {/* Meta row */}
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span style={{ fontSize:'16px' }}>{msg.leaderFlag}</span>
                <span className="font-orbitron font-bold" style={{ color:msg.leaderColor, fontSize:'12px' }}>
                  {msg.leaderName}
                </span>
                {msg.toAgent !== 'ALL' && (
                  <span className="font-mono" style={{ color:'rgba(200,210,240,0.35)', fontSize:'10px' }}>→ {msg.toAgent}</span>
                )}
                <span className="font-mono ml-auto" style={{ color:'rgba(200,210,240,0.28)', fontSize:'9.5px' }}>
                  {fmt(msg.timestamp)}
                </span>
                <span className="font-mono px-1.5 py-0.5 rounded"
                  style={{ color:tc, background:`${tc}12`, border:`1px solid ${tc}30`, fontSize:'8.5px' }}>
                  {msg.tone.toUpperCase()}
                </span>
                <span className="font-orbitron font-bold" style={{ color:ec, fontSize:'14px' }}>
                  {msg.escalation}
                </span>
              </div>

              {/* Bubble */}
              <div className="rounded-2xl p-3.5 relative"
                style={{ background:`${msg.leaderColor}0c`, border:`1px solid ${msg.leaderColor}25`, marginLeft:'8px' }}>
                {/* Leader portrait thumbnail */}
                <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full overflow-hidden"
                  style={{ border:`1.5px solid ${msg.leaderColor}60`, boxShadow:`0 0 10px ${msg.leaderColor}40` }}>
                  <img src={`/leaders/${leaderId}.jpg`} alt="" className="w-full h-full object-cover object-top"
                    onError={(e)=>{ (e.target as HTMLImageElement).style.display='none'; }}/>
                </div>

                <p className="font-exo italic pl-6" style={{ color:'rgba(238,235,255,0.92)', fontSize:'12.5px', lineHeight:'1.6' }}>
                  &ldquo;{msg.content}&rdquo;
                </p>
                <div className="flex items-start gap-1.5 mt-2.5 pl-6">
                  <span style={{ color:ec, fontSize:'11px', flexShrink:0 }}>▶</span>
                  <span className="font-mono" style={{ color:'rgba(218,222,248,0.7)', fontSize:'11px' }}>{msg.action}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-2.5 border-t"
        style={{ borderColor:'rgba(120,60,255,0.15)', background:'rgba(6,2,18,0.98)' }}>
        <div className="font-mono text-center" style={{ color:'rgba(120,60,255,0.4)', fontSize:'9px', letterSpacing:'0.1em' }}>
          ENCRYPTED CHANNEL — GEOWARS INTELLIGENCE NETWORK
        </div>
      </div>
    </div>
  );
}
