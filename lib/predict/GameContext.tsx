'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface LeaderboardEntry {
  address: string;
  displayName: string;
  predictions: number;
  wins: number;
  totalEarned: number;
  isCurrentUser?: boolean;
}

export interface Prediction {
  choice: 'yes' | 'no';
  amount: number;
  scenarioId: string;
  cycleNumber: number;
  resolved: boolean;
  result: 'win' | 'loss' | null;
  payout: number;
}

interface GameState {
  wallet: string | null;
  balance: number;
  activePrediction: Prediction | null;
  history: Prediction[];
  leaderboard: LeaderboardEntry[];
  totalEarned: number;
  totalPredictions: number;
  wins: number;
}

interface GameContextValue extends GameState {
  setWallet: (address: string | null) => void;
  placePrediction: (choice: 'yes' | 'no', amount: number, scenarioId: string, cycleNumber: number) => void;
  resolvePrediction: (outcome: 'yes' | 'no') => void;
  resetSimPredictions: () => void;
  simPredictionsUsed: number;
  showLeaderboard: boolean;
  setShowLeaderboard: (v: boolean) => void;
  showPrediction: boolean;
  setShowPrediction: (v: boolean) => void;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { address: 'GeoW...4x9K', displayName: 'GeoW...4x9K', predictions: 42, wins: 31, totalEarned: 1840 },
  { address: 'PlaZ...7mR2', displayName: 'PlaZ...7mR2', predictions: 38, wins: 26, totalEarned: 1420 },
  { address: 'NukE...9pL5', displayName: 'NukE...9pL5', predictions: 55, wins: 34, totalEarned: 1290 },
  { address: 'WaRz...2kN8', displayName: 'WaRz...2kN8', predictions: 29, wins: 19, totalEarned: 980 },
  { address: 'CrYp...1fT6', displayName: 'CrYp...1fT6', predictions: 33, wins: 20, totalEarned: 760 },
  { address: 'MatX...8hJ3', displayName: 'MatX...8hJ3', predictions: 21, wins: 12, totalEarned: 540 },
  { address: 'SiMu...5vQ1', displayName: 'SiMu...5vQ1', predictions: 18, wins: 10, totalEarned: 380 },
  { address: 'InTL...3bW7', displayName: 'InTL...3bW7', predictions: 14, wins:  7, totalEarned: 210 },
  { address: 'OpEx...6cY4', displayName: 'OpEx...6cY4', predictions: 11, wins:  5, totalEarned: 140 },
];

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [wallet, setWalletRaw] = useState<string | null>(null);
  const [balance, setBalance] = useState(500); // mock starting balance
  const [activePrediction, setActivePrediction] = useState<Prediction | null>(null);
  const [history, setHistory] = useState<Prediction[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalPredictions, setTotalPredictions] = useState(0);
  const [wins, setWins] = useState(0);
  const [simPredictionsUsed, setSimPredictionsUsed] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('geowars_game');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.balance !== undefined) setBalance(d.balance);
        if (d.history) setHistory(d.history);
        if (d.totalEarned !== undefined) setTotalEarned(d.totalEarned);
        if (d.totalPredictions !== undefined) setTotalPredictions(d.totalPredictions);
        if (d.wins !== undefined) setWins(d.wins);
      }
    } catch {}
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('geowars_game', JSON.stringify({ balance, history, totalEarned, totalPredictions, wins }));
    } catch {}
  }, [balance, history, totalEarned, totalPredictions, wins]);

  const setWallet = useCallback((address: string | null) => {
    setWalletRaw(address);
    if (address) setShowPrediction(true);
  }, []);

  const MAX_SIM_PREDICTIONS = 3;

  const resetSimPredictions = useCallback(() => {
    setSimPredictionsUsed(0);
    setActivePrediction(null);
  }, []);

  const placePrediction = useCallback((choice: 'yes' | 'no', amount: number, scenarioId: string, cycleNumber: number) => {
    if (amount > balance) return;
    if (simPredictionsUsed >= MAX_SIM_PREDICTIONS) return;
    setBalance(b => b - amount);
    setActivePrediction({ choice, amount, scenarioId, cycleNumber, resolved: false, result: null, payout: 0 });
    setTotalPredictions(p => p + 1);
    setSimPredictionsUsed(n => n + 1);
  }, [balance, simPredictionsUsed]);

  const resolvePrediction = useCallback((outcome: 'yes' | 'no') => {
    setActivePrediction(prev => {
      if (!prev || prev.resolved) return prev;
      const win = prev.choice === outcome;
      const payout = win ? prev.amount * 2 : 0;
      if (win) {
        setBalance(b => b + payout);
        setTotalEarned(e => e + payout - prev.amount);
        setWins(w => w + 1);
      }
      const resolved: Prediction = { ...prev, resolved: true, result: win ? 'win' : 'loss', payout };
      setHistory(h => [resolved, ...h].slice(0, 50));
      return resolved;
    });
  }, []);

  // Build leaderboard with current user
  const leaderboard: LeaderboardEntry[] = [
    ...MOCK_LEADERBOARD,
    ...(wallet ? [{
      address: wallet,
      displayName: `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
      predictions: totalPredictions,
      wins,
      totalEarned,
      isCurrentUser: true,
    }] : []),
  ]
    .sort((a, b) => b.totalEarned - a.totalEarned)
    .slice(0, 10);

  return (
    <GameContext.Provider value={{
      wallet, balance, activePrediction, history, leaderboard,
      totalEarned, totalPredictions, wins,
      setWallet, placePrediction, resolvePrediction, resetSimPredictions, simPredictionsUsed,
      showLeaderboard, setShowLeaderboard,
      showPrediction, setShowPrediction,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be inside GameProvider');
  return ctx;
}
