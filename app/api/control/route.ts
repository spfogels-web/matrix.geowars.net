// app/api/control/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { startSim, pauseSim, stopSim, resetSim, setScenario, getState } from '@/lib/engine/state';

export async function POST(req: NextRequest) {
  const { action, scenarioId } = await req.json();
  switch (action) {
    case 'start':  startSim(scenarioId); break;
    case 'pause':  pauseSim(); break;
    case 'stop':   stopSim(); break;
    case 'reset':  resetSim(); break;
    case 'scenario': if (scenarioId) setScenario(scenarioId); break;
  }
  return NextResponse.json({ ok: true, state: getState() });
}
