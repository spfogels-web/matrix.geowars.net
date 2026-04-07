'use client';
import { useState, useEffect } from 'react';
import { useGame } from '@/lib/predict/GameContext';
import { useIsMobile } from '@/hooks/useIsMobile';

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

// Deep-link opens the site inside the wallet's in-app browser on mobile
function phantomDeepLink() {
  const url = encodeURIComponent('https://matrix.geowars.net');
  return `https://phantom.app/ul/browse/${url}?ref=${url}`;
}
function solflareDeepLink() {
  const url = encodeURIComponent('https://matrix.geowars.net');
  return `https://solflare.com/ul/v1/browse/${url}?ref=${url}`;
}

export default function WalletButton({ compact = false }: { compact?: boolean }) {
  const { wallet, balance, setWallet } = useGame();
  const isMobile = useIsMobile();
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
    if (!window.solana?.isPhantom) {
      // On mobile: deep link opens the site inside Phantom's browser
      window.location.href = phantomDeepLink();
      return;
    }
    setConnecting('phantom');
    try {
      const res = await window.solana.connect();
      setWallet(res.publicKey.toString());
    } catch {}
    finally { setConnecting(null); setPicking(false); }
  }

  async function connectSolflare() {
    if (!window.solflare?.isSolflare) {
      // On mobile: deep link opens the site inside Solflare's browser
      window.location.href = solflareDeepLink();
      return;
    }
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
          {/* Dropdown — centered on mobile, right-aligned on desktop */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? 'min(300px, 90vw)' : '280px',
              zIndex: 400,
              background: 'rgba(4,2,14,0.99)',
              border: '1px solid rgba(0,255,157,0.35)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 12px 60px rgba(0,0,0,0.95), 0 0 40px rgba(0,255,157,0.08)',
            }}>

            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,255,157,0.12)' }}>
              <div className="font-orbitron font-bold" style={{ color: '#00ff9d', fontSize: '12px', letterSpacing: '0.2em' }}>
                CONNECT WALLET
              </div>
              {isMobile && (
                <div className="font-mono mt-1" style={{ color: 'rgba(0,255,157,0.4)', fontSize: '9px', letterSpacing: '0.06em' }}>
                  Opens GeoWars inside your wallet app
                </div>
              )}
            </div>

            {/* Phantom */}
            <WalletOption
              name="Phantom"
              icon="👻"
              installed={hasPhantom}
              loading={connecting === 'phantom'}
              accentColor="#ab9ff2"
              isMobile={isMobile}
              mobileLabel={hasPhantom ? 'Detected ✓' : 'Open in Phantom app →'}
              onClick={connectPhantom}
            />

            {/* Solflare */}
            <WalletOption
              name="Solflare"
              icon="🔆"
              installed={hasSolflare}
              loading={connecting === 'solflare'}
              accentColor="#fc8c14"
              isMobile={isMobile}
              mobileLabel={hasSolflare ? 'Detected ✓' : 'Open in Solflare app →'}
              onClick={connectSolflare}
            />

            <div className="px-5 py-3">
              <button onClick={() => setPicking(false)}
                className="w-full font-mono py-2 rounded-lg border transition-all"
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer' }}>
                CANCEL
              </button>
            </div>
          </div>

          {/* Backdrop */}
          <button className="fixed inset-0" style={{ zIndex: 399, background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'default' }} onClick={() => setPicking(false)} />
        </div>
      );
    }

    return (
      <button
        onClick={() => setPicking(true)}
        disabled={isConnecting}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="font-mono rounded-lg border transition-all shrink-0 flex items-center gap-1.5"
        style={{
          fontSize: compact ? '10px' : '13px',
          padding: compact ? '5px 14px' : '10px 20px',
          letterSpacing: '0.1em',
          color: '#00ff9d',
          borderColor: hovered ? '#00ff9d' : 'rgba(0,255,157,0.4)',
          background: hovered ? 'rgba(0,255,157,0.18)' : 'rgba(0,255,157,0.07)',
          boxShadow: hovered ? '0 0 16px rgba(0,255,157,0.2)' : 'none',
          opacity: isConnecting ? 0.6 : 1,
          cursor: 'pointer',
        }}>
        <span style={{ fontSize: compact ? '12px' : '16px' }}>◎</span>
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
          fontSize: compact ? '11px' : '12px',
          letterSpacing: '0.06em',
          padding: compact ? '5px 12px' : '10px 16px',
          color: '#00ff9d',
          borderColor: open || hovered ? '#00ff9d' : 'rgba(0,255,157,0.35)',
          background: open || hovered ? 'rgba(0,255,157,0.16)' : 'rgba(0,255,157,0.07)',
          boxShadow: open || hovered ? '0 0 18px rgba(0,255,157,0.2)' : 'none',
          cursor: 'pointer',
        }}>
        <span className="status-blink" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 10px #00ff9d', flexShrink: 0 }} />
        <span style={{ fontWeight: 'bold' }}>{short}</span>
        <span className="font-orbitron" style={{ color: '#00ff9d', fontSize: compact ? '11px' : '12px', opacity: 0.8 }}>
          {balance.toFixed(0)} <span style={{ opacity: 0.5, fontSize: '10px' }}>GWM</span>
        </span>
        <span style={{ opacity: 0.45, fontSize: '10px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="rounded-2xl overflow-hidden"
            style={{
              position: 'fixed',
              top: isMobile ? '50%' : 'auto',
              left: isMobile ? '50%' : 'auto',
              transform: isMobile ? 'translate(-50%, -50%)' : 'none',
              right: isMobile ? 'auto' : 0,
              marginTop: isMobile ? 0 : '8px',
              width: isMobile ? 'min(280px, 90vw)' : '240px',
              zIndex: 400,
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
                className="w-full font-mono py-2 rounded-lg border transition-all"
                style={{ fontSize: '12px', color: 'rgba(255,100,100,0.7)', borderColor: 'rgba(255,45,85,0.25)', background: 'rgba(255,45,85,0.05)', cursor: 'pointer' }}>
                ⏏ DISCONNECT
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WalletOption({ name, icon, installed, loading, accentColor, isMobile, mobileLabel, onClick }: {
  name: string; icon: string; installed: boolean; loading: boolean;
  accentColor: string; isMobile: boolean; mobileLabel: string; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-full flex items-center gap-3 px-5 py-4 transition-all border-b"
      style={{
        borderColor: 'rgba(255,255,255,0.06)',
        background: hov ? `${accentColor}18` : 'transparent',
        cursor: 'pointer',
      }}>
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <div className="flex-1 text-left">
        <div className="font-orbitron font-bold" style={{ color: hov ? accentColor : 'rgba(255,255,255,0.9)', fontSize: '14px', letterSpacing: '0.08em' }}>
          {name}
        </div>
        <div className="font-mono" style={{
          color: installed ? 'rgba(0,255,157,0.7)' : hov ? accentColor : 'rgba(255,255,255,0.3)',
          fontSize: '10px', marginTop: '2px',
        }}>
          {loading ? 'Connecting...' : isMobile ? mobileLabel : (installed ? 'Detected ✓' : 'Click to install')}
        </div>
      </div>
      <span style={{ color: hov ? accentColor : 'rgba(255,255,255,0.25)', fontSize: '18px' }}>→</span>
    </button>
  );
}
