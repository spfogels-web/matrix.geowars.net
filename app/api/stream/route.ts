// app/api/stream/route.ts — Server-Sent Events for real-time state push
import { NextRequest } from 'next/server';
import { subscribe, getState } from '@/lib/engine/state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(ctrl) {
      const send = (data: unknown) => {
        try { ctrl.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
      };
      // Send current state immediately
      send(getState());
      // Subscribe to future updates
      const unsub = subscribe(send);
      // Heartbeat
      const hb = setInterval(() => { try { ctrl.enqueue(enc.encode(': ping\n\n')); } catch { clearInterval(hb); } }, 20000);
      req.signal.addEventListener('abort', () => { clearInterval(hb); unsub(); try { ctrl.close(); } catch {} });
    },
  });
  return new Response(stream, {
    headers: { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', 'Connection':'keep-alive' },
  });
}
