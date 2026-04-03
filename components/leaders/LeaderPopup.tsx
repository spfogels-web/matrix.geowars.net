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

export default function LeaderPopup({ message }: Props) {
  const [visible, setVisible]   = useState(false);
  const [current, setCurrent]   = useState<LeaderMessage | null>(null);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    // Only trigger on escalation ≥ 5 to avoid constant popups
    if (message.escalation < 5) return;

    // Reset image error flag on new message
    setImgError(false);
    setCurrent(message);
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 7000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message?.id]);

  if (!current) return null;

  const tc   = TONE_COLORS[current.tone] || '#00f5ff';
  const ec   = current.escalation >= 8 ? '#ff2d55' : current.escalation >= 5 ? '#ff6a00' : '#ffd700';
  const leaderId = current.leaderName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  const flagCode = FLAG_CODE[leaderId] || FLAG_CODE[current.leaderName.slice(0,3).toLowerCase()];

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        bottom: '100px', left: '320px',
        maxWidth: '420px', minWidth: '320px',
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        transform: visible ? 'translateX(0) scale(1)' : 'translateX(-120%) scale(0.8)',
        opacity: visible ? 1 : 0,
      }}>
      {/* Card */}
      <div className="rounded-2xl overflow-hidden relative"
        style={{
          background: 'rgba(4,2,14,0.97)',
          border: `1.5px solid ${current.leaderColor}50`,
          boxShadow: `0 0 40px ${current.leaderColor}30, 0 0 80px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.4)`,
          backdropFilter: 'blur(20px)',
        }}>

        {/* Flag background */}
        {flagCode && (
          <>
            <img src={`https://flagcdn.com/w640/${flagCode}.png`} alt=""
              className="absolute inset-0 w-full h-full"
              style={{ objectFit:'cover', objectPosition:'center top', opacity:0.18, pointerEvents:'none' }}/>
            <div className="absolute inset-0" style={{ background:'linear-gradient(135deg,rgba(0,0,0,0.85),rgba(0,0,0,0.7),rgba(0,0,0,0.9))', pointerEvents:'none' }}/>
          </>
        )}

        {/* Scan line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background:`linear-gradient(90deg,transparent,${current.leaderColor},transparent)`, animation:'scanbeam 2s linear infinite', zIndex:2 }}/>

        <div className="relative p-4" style={{ zIndex:3 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            {/* Portrait */}
            <div className="shrink-0 relative" style={{ width:64, height:64 }}>
              <div className="w-full h-full rounded-full overflow-hidden"
                style={{ border:`2px solid ${current.leaderColor}70`, boxShadow:`0 0 16px ${current.leaderColor}50` }}>
                {!imgError ? (
                  <img src={`/leaders/${leaderId}.jpg`} alt={current.leaderName}
                    onError={()=>setImgError(true)}
                    className="w-full h-full object-cover object-top"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background:`${current.leaderColor}20`, fontSize:'28px' }}>
                    {current.leaderFlag}
                  </div>
                )}
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 rounded-full"
                style={{ border:`1px solid ${current.leaderColor}`, animation:'pulse-ring 1.5s ease-out infinite', opacity:0.6 }}/>
            </div>

            {/* Name + escalation */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span style={{ fontSize:'20px' }}>{current.leaderFlag}</span>
                <span className="font-orbitron font-bold" style={{ color:current.leaderColor, fontSize:'15px', textShadow:`0 0 16px ${current.leaderColor}60` }}>
                  {current.leaderName}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono px-2 py-0.5 rounded"
                  style={{ color:tc, background:`${tc}18`, border:`1px solid ${tc}40`, fontSize:'10px', letterSpacing:'0.08em' }}>
                  {current.tone.toUpperCase()}
                </span>
                <span className="font-orbitron font-bold" style={{ color:ec, fontSize:'18px', textShadow:`0 0 14px ${ec}` }}>
                  {current.escalation}/10
                </span>
                <span className="font-mono ml-auto" style={{ color:'rgba(255,255,255,0.3)', fontSize:'10px' }}>
                  ESCALATION
                </span>
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="rounded-xl p-3.5 mb-3"
            style={{ background:'rgba(0,0,0,0.55)', borderLeft:`3px solid ${current.leaderColor}60` }}>
            <p className="font-exo italic" style={{ color:'rgba(245,240,255,0.95)', fontSize:'13px', lineHeight:'1.6' }}>
              &ldquo;{current.content}&rdquo;
            </p>
          </div>

          {/* Action */}
          <div className="flex items-start gap-2 rounded-lg px-3 py-2"
            style={{ background:`${ec}10`, borderLeft:`2px solid ${ec}50` }}>
            <span style={{ color:ec, fontSize:'12px', marginTop:'2px', flexShrink:0 }}>▶</span>
            <span className="font-mono" style={{ color:'rgba(228,232,255,0.85)', fontSize:'11px' }}>{current.action}</span>
          </div>
        </div>

        {/* Progress bar — auto-dismiss timer */}
        <div style={{ height:'3px', background:'rgba(255,255,255,0.08)' }}>
          <div style={{
            height:'100%', background:ec, transformOrigin:'left',
            animation:`${visible ? 'shrink-bar 7s linear forwards' : 'none'}`,
          }}/>
        </div>
      </div>
    </div>
  );
}
