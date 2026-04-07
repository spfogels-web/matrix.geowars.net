'use client';
import { useEffect, useState, useRef } from 'react';
import { LeaderMessage } from '@/lib/engine/types';

interface Props {
  message: LeaderMessage | null;
}

const TONE_COLORS: Record<string, string> = {
  aggressive: '#ff6a00', threatening: '#ff2d55', defensive: '#ffd700',
  diplomatic: '#b44fff', neutral: '#00f5ff', defiant: '#ff6a00',
};

const FLAG_CODE: Record<string, string> = {
  usa:'us', china:'cn', russia:'ru', iran:'ir', israel:'il',
  uk:'gb', france:'fr', germany:'de', turkey:'tr', saudiarabia:'sa',
  india:'in', pakistan:'pk', japan:'jp', southkorea:'kr',
  northkorea:'kp', ukraine:'ua', taiwan:'tw',
};

// Only pop for truly significant moments
const MIN_ESCALATION = 7;

export default function LeaderPopup({ message }: Props) {
  const [visible, setVisible]       = useState(false);
  const [current, setCurrent]       = useState<LeaderMessage | null>(null);
  const [displayedText, setDisplayed] = useState('');
  const [typed, setTyped]           = useState(false);
  const [imgError, setImgError]     = useState(false);
  const typingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fire when a new important message arrives
  useEffect(() => {
    if (!message) return;
    if (message.escalation < MIN_ESCALATION) return;

    // Clear any running animation / dismiss timers
    if (typingRef.current)  clearInterval(typingRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);

    setImgError(false);
    setCurrent(message);
    setDisplayed('');
    setTyped(false);
    setVisible(true);

    // Typewriter — 22 ms per char
    let i = 0;
    const text = message.content;
    typingRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(typingRef.current!);
        typingRef.current = null;
        setTyped(true);
        // Auto-dismiss 4 s after typing completes
        dismissRef.current = setTimeout(() => setVisible(false), 4000);
      }
    }, 22);

    return () => {
      if (typingRef.current)  clearInterval(typingRef.current);
      if (dismissRef.current) clearTimeout(dismissRef.current);
    };
  }, [message?.id]);

  if (!current) return null;

  const tc       = TONE_COLORS[current.tone] || '#00f5ff';
  const ec       = current.escalation >= 9 ? '#ff2d55' : current.escalation >= 7 ? '#ff6a00' : '#ffd700';
  const leaderId = current.leaderId;
  const flagCode = FLAG_CODE[leaderId];

  function dismiss() {
    if (typingRef.current)  clearInterval(typingRef.current);
    if (dismissRef.current) clearTimeout(dismissRef.current);
    setVisible(false);
  }

  return (
    /* Full-screen backdrop */
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 350,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 0.4s ease',
        opacity: visible ? 1 : 0,
      }}
      onClick={dismiss}
    >
      {/* Card — stops click propagation so tapping card doesn't dismiss */}
      <div
        className="relative rounded-2xl overflow-hidden mx-4"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(4,2,14,0.98)',
          border: `1.5px solid ${current.leaderColor}55`,
          boxShadow: `0 0 60px ${current.leaderColor}30, 0 0 120px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.5)`,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(30px)',
          transition: 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Flag background wash */}
        {flagCode && (
          <>
            <img src={`https://flagcdn.com/w640/${flagCode}.png`} alt=""
              className="absolute inset-0 w-full h-full"
              style={{ objectFit:'cover', objectPosition:'center top', opacity:0.14, pointerEvents:'none' }}/>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.9),rgba(0,0,0,0.75),rgba(0,0,0,0.92))' }}/>
          </>
        )}

        {/* Scan-line sweep */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background:`linear-gradient(90deg,transparent,${current.leaderColor},transparent)`, animation:'scanbeam 2s linear infinite', zIndex:2 }}/>

        <div className="relative p-5" style={{ zIndex:3 }}>

          {/* ── Header ── */}
          <div className="flex items-center gap-4 mb-4">
            {/* Portrait */}
            <div className="shrink-0 relative" style={{ width:72, height:72 }}>
              <div className="w-full h-full rounded-full overflow-hidden"
                style={{ border:`2px solid ${current.leaderColor}80`, boxShadow:`0 0 20px ${current.leaderColor}60` }}>
                {!imgError ? (
                  <img src={`/leaders/${leaderId}.jpg`} alt={current.leaderName}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover object-top"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background:`${current.leaderColor}20`, fontSize:'32px' }}>
                    {current.leaderFlag}
                  </div>
                )}
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full"
                style={{ border:`1px solid ${current.leaderColor}`, animation:'pulse-ring 1.5s ease-out infinite', opacity:0.6 }}/>
            </div>

            {/* Name block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize:'22px' }}>{current.leaderFlag}</span>
                <span className="font-orbitron font-bold truncate"
                  style={{ color:current.leaderColor, fontSize:'17px', textShadow:`0 0 18px ${current.leaderColor}70`, letterSpacing:'0.04em' }}>
                  {current.leaderName}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono px-2 py-0.5 rounded"
                  style={{ color:tc, background:`${tc}18`, border:`1px solid ${tc}40`, fontSize:'10px', letterSpacing:'0.1em' }}>
                  {current.tone.toUpperCase()}
                </span>
                <span className="font-orbitron font-bold"
                  style={{ color:ec, fontSize:'20px', textShadow:`0 0 16px ${ec}` }}>
                  {current.escalation}/10
                </span>
                <span className="font-mono"
                  style={{ color:'rgba(255,255,255,0.28)', fontSize:'10px', letterSpacing:'0.08em' }}>
                  ESCALATION
                </span>
              </div>
            </div>

            {/* Dismiss button */}
            <button onClick={dismiss}
              className="shrink-0 font-mono flex items-center justify-center rounded-full transition-all"
              style={{ width:28, height:28, border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.4)', fontSize:'12px', background:'rgba(255,255,255,0.05)', cursor:'pointer' }}>
              ✕
            </button>
          </div>

          {/* ── Quote with typewriter cursor ── */}
          <div className="rounded-xl p-4 mb-4"
            style={{ background:'rgba(0,0,0,0.6)', borderLeft:`3px solid ${current.leaderColor}70` }}>
            <p className="font-exo italic"
              style={{ color:'rgba(245,240,255,0.96)', fontSize:'14.5px', lineHeight:'1.65', minHeight:'3.3em' }}>
              &ldquo;{displayedText}
              {!typed && (
                <span className="status-blink"
                  style={{ display:'inline-block', width:'2px', height:'1em', background:current.leaderColor, marginLeft:'2px', verticalAlign:'middle' }}/>
              )}
              &rdquo;
            </p>
          </div>

          {/* ── Action ── */}
          {typed && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 fade-in"
              style={{ background:`${ec}0e`, border:`1px solid ${ec}30` }}>
              <span style={{ color:ec, fontSize:'12px', marginTop:'2px', flexShrink:0 }}>▶</span>
              <span className="font-mono" style={{ color:'rgba(228,232,255,0.85)', fontSize:'12px', lineHeight:'1.5' }}>
                {current.action}
              </span>
            </div>
          )}

          {/* Hint to tap to dismiss */}
          {typed && (
            <div className="mt-3 text-center">
              <span className="font-mono" style={{ color:'rgba(255,255,255,0.2)', fontSize:'10px', letterSpacing:'0.1em' }}>
                TAP ANYWHERE TO DISMISS
              </span>
            </div>
          )}
        </div>

        {/* Progress bar — counts down to auto-dismiss once typing is done */}
        <div style={{ height:'3px', background:'rgba(255,255,255,0.08)' }}>
          <div style={{
            height:'100%', background: ec,
            transformOrigin:'left',
            animation: typed ? 'shrink-bar 4s linear forwards' : 'none',
          }}/>
        </div>
      </div>
    </div>
  );
}
