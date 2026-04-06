import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GameProvider } from '@/lib/predict/GameContext';

export const metadata: Metadata = {
  title: 'GEOWARS MATRIX — AI Geopolitical Simulation',
  description: 'Real-time AI-powered geopolitical simulation command center',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ height: '100dvh', overflow: 'hidden' }}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}
