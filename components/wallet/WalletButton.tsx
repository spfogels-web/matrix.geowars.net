'use client';
import { useState, useEffect } from 'react';
import { useGame } from '@/lib/predict/GameContext';

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, cb: () => void) => void;
      off: (event: string, cb: () => void) => void;
      publicKey?: { toString(): string };
    };
    solflare?: {
      isSolflare?: boolean;
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      on: (event: string, cb: () => void) => void;
      off: (event: string, cb: () => void) => void;
      publicKey?: { toString(): string };
    };
  }
}

type WalletType = 'phantom' | 'solflare';

export default function WalletButton() {
  const { wallet, balance, setWallet } = useGame();
  const [connecting, setConnecting] = useState<WalletType | null>(null);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [hasSolflare, setHasSolflare] = useState(false);

  useEffect(() => {
    const check = () => {
      setHasPhantom(!!window.solana?.isPhantom);
      setHasSolflare(!!window.solflare?.isSolflare);
    };
    check();
    const t = setTimeout(check, 800);
    return () => clearTimeout(t);
  }, []);

  // Auto-reconnect Phantom
  useEffect(() => {
    if (!window.solana?.isPhantom) return;
    window.solana.connect({ onlyIfTrusted: true })
      .then(r => setWallet(r.publicKey.toString()))
      .catch(() => {});
    const onDisc = () => setWallet(null);
    window.solana.on('disconnect', onDisc);
    return () => window.solana?.off('disconnect', onDisc);
  }, [setWallet]);

  // Auto-reconnect Solflare
  useEffect(() => {
    if (!window.solflare?.isSolflare) return;
    if (window.solflare.publicKey) setWallet(window.solflare.publicKey.toString());
    const onDisc = () => setWallet(null);
    window.solflare.on('disconnect', onDisc);
    return () => window.solflare?.off('disconnect', onDisc);
  }, [setWallet]);

  async function connectPhantom() {
    if (!window.solana?.isPhantom) { window.open('https://phantom.app/', '_blank'); return; }
    setConnecting('phantom');
    try {
      const res = await window.solana.connect();
      setWallet(res.publicKey.toString());
    } catch {}
    finally { setConnecting(null); setPicking(false); }
  }

  async function connectSolflare() {
    if (!window.solflare?.isSolflare) { window.open('https://solflare.com/', '_blank'); return; }
    setConnecting('solflare');
    try {
      await window.solflare.connect();
      if (window.solflare.publicKey) setWallet(window.solflare.publicKey.toString());
    } catch {}
    finally { setConnecting(null); setPicking(false); }
  }

  async function disconnect() {
    await window.solana?.disconnect().catch(() => {});
    await window.solflare?.disconnect().catch(() => {});
    setWallet(null);
    setOpen(false);
  }

  const short = wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : null;
  const isConnecting = connecting !== null;

  // ── Not connected ──
  if (!wallet) {
    if (picking) {
      return (
        <div className="relative shrink-0">
          <div className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
            style={{
              width: '260px',
              background: 'rgba(4,2,14,0.99)',
              border: '1px solid rgba(0,255,157,0.3)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.9), 0 0 40px rgba(0,255,157,0.06)',
            }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,255,157,0.1)' }}>
              <div className="font-orbitron font-bold" style={{ color: '#00ff9d', fontSize: '11px', letterSpacing: '0.2em' }}>SELECT WALLET</div>
            </div>

            {/* Phantom */}
            <WalletOption
              name="Phantom"
              icon="👻"
              installed={hasPhantom}
              loading={connecting === 'phantom'}
              accentColor="#ab9ff2"
              onClick={connectPhantom}
            />

            {/* Solflare */}
            <WalletOption
              name="Solflare"
              icon="🔆"
              installed={hasSolflare}
              loading={connecting === 'solflare'}
              accentColor="#fc8c14"
              onClick={connectSolflare}
            />

            <div className="px-5 py-3">
              <button onClick={() => setPicking(false)}
                className="w-full font-mono py-1.5 rounded-lg border transition-all"
                style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent' }}>
                CANCEL
              </button>
            </div>
          </div>

          {/* Invisible backdrop to close picker */}
          <button className="fixed inset-0 z-40" style={{ background: 'transparent', border: 'none' }} onClick={() => setPicking(false)} />

          {/* Trigger button (stays visible) */}
          <button
            onClick={() => setPicking(false)}
            className="hdr-btn-green font-mono px-5 py-2.5 rounded-lg border flex items-center gap-2 shrink-0"
            style={{ fontSize: '13px', letterSpacing: '0.1em', position: 'relative', zIndex: 50 }}>
            <span style={{ fontSize: '16px' }}>◎</span>
            CONNECT WALLET
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setPicking(true)}
        disabled={isConnecting}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="font-mono px-5 py-2.5 rounded-lg border transition-all shrink-0 flex items-center gap-2"
        style={{
          fontSize: '13px', letterSpacing: '0.1em',
          color: '#00ff9d',
          borderColor: hovered ? '#00ff9d' : 'rgba(0,255,157,0.4)',
          background: hovered ? 'rgba(0,255,157,0.18)' : 'rgba(0,255,157,0.07)',
          boxShadow: hovered ? '0 0 20px rgba(0,255,157,0.25), inset 0 0 12px rgba(0,255,157,0.08)' : 'none',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          opacity: isConnecting ? 0.6 : 1,
        }}>
        <span style={{ fontSize: '16px' }}>◎</span>
        {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
      </button>
    );
  }

  // ── Connected ──
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="font-mono px-4 py-2.5 rounded-lg border transition-all flex items-center gap-2.5"
        style={{
          fontSize: '12px', letterSpacing: '0.06em',
          color: '#00ff9d',
          borderColor: open || hovered ? '#00ff9d' : 'rgba(0,255,157,0.35)',
          background: open || hovered ? 'rgba(0,255,157,0.16)' : 'rgba(0,255,157,0.07)',
          boxShadow: open || hovered ? '0 0 18px rgba(0,255,157,0.2), inset 0 0 10px rgba(0,255,157,0.06)' : 'none',
          transform: hovered ? 'scale(1.02)' : 'scale(1)',
        }}>
        <span className="status-blink" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 10px #00ff9d', flexShrink: 0 }} />
        <span style={{ fontWeight: 'bold' }}>{short}</span>
        <span className="font-orbitron" style={{ color: '#00ff9d', fontSize: '12px', opacity: 0.8 }}>
          {balance.toFixed(0)} <span style={{ opacity: 0.5, fontSize: '10px' }}>GWM</span>
        </span>
        <span style={{ opacity: 0.45, fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
            style={{
              width: '240px',
              background: 'rgba(4,2,14,0.99)',
              border: '1px solid rgba(0,255,157,0.25)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.9)',
            }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,255,157,0.12)' }}>
              <div className="font-orbitron font-bold" style={{ color: '#00ff9d', fontSize: '10px', letterSpacing: '0.18em', marginBottom: '6px' }}>CONNECTED WALLET</div>
              <div className="font-mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', wordBreak: 'break-all' }}>{wallet}</div>
            </div>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,255,157,0.08)' }}>
              <div className="font-mono mb-1" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', letterSpacing: '0.1em' }}>GWM BALANCE</div>
              <div className="font-orbitron font-bold" style={{ color: '#00ff9d', fontSize: '28px', lineHeight: 1 }}>
                {balance.toFixed(0)}
                <span style={{ fontSize: '13px', opacity: 0.5, marginLeft: '6px' }}>GWM</span>
              </div>
            </div>
            <div className="px-5 py-4">
              <button onClick={disconnect}
                className="hdr-btn-red w-full font-mono py-2 rounded-lg border transition-all"
                style={{ fontSize: '12px' }}>
                ⏏ DISCONNECT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WalletOption({ name, icon, installed, loading, accentColor, onClick }: {
  name: string; icon: string; installed: boolean; loading: boolean; accentColor: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-3 px-5 py-3.5 transition-all border-b"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: hov ? `${accentColor}18` : 'transparent',
        boxShadow: hov ? `inset 0 0 20px ${accentColor}0a` : 'none',
      }}>
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <div className="flex-1 text-left">
        <div className="font-orbitron font-bold" style={{ color: hov ? accentColor : 'rgba(255,255,255,0.85)', fontSize: '13px', letterSpacing: '0.08em' }}>
          {name}
        </div>
        <div className="font-mono" style={{ color: installed ? 'rgba(0,255,157,0.6)' : 'rgba(255,255,255,0.25)', fontSize: '10px', marginTop: '1px' }}>
          {loading ? 'Connecting...' : installed ? 'Detected ✓' : 'Click to install'}
        </div>
      </div>
      <span style={{ color: hov ? accentColor : 'rgba(255,255,255,0.2)', fontSize: '16px' }}>→</span>
    </button>
  );
}
