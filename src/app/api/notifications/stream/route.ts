import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { subscribeUser } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();

  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", at: new Date().toISOString() });

      cleanup = subscribeUser(user.id, (payload) => {
        send(payload);
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 15000);
    },
    cancel() {
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
