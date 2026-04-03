// app/api/control/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { startSim, pauseSim, stopSim, resetSim, setScenario, getState } from '@/lib/engine/state';
import { fetchAndAnalyzeNews, clearNewsContext } from '@/lib/engine/newsContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { action, scenarioId } = await req.json();

  switch (action) {
    case 'start': {
      // Fetch and analyze live news to seed the simulation
      try {
        const ctx = await fetchAndAnalyzeNews();
        // If user manually picked a scenario, respect it; otherwise use GPT's pick
        const scenario = scenarioId || ctx.scenarioId;
        startSim(scenario, { ...ctx, scenarioId: scenario });
      } catch (e) {
        console.error('News fetch failed, starting with defaults:', e);
        startSim(scenarioId);
      }
      break;
    }
    case 'pause':    pauseSim(); break;
    case 'stop':     stopSim(); clearNewsContext(); break;
    case 'reset':    resetSim(); clearNewsContext(); break;
    case 'scenario': if (scenarioId) setScenario(scenarioId); break;
  }

  return NextResponse.json({ ok: true, state: getState() });
}
