import { NextResponse } from "next/server";
import { generateMockAlert } from "@/components/scanner/mockData";

// In production this endpoint would:
//   - Pull from a Redis/BullMQ queue fed by Helius webhooks
//   - Support SSE (text/event-stream) for real-time streaming
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = Math.min(50, Number(searchParams.get("count") ?? 20));

  const alerts = Array.from({ length: count }, () => generateMockAlert());

  return NextResponse.json({
    data: alerts,
    meta: {
      count: alerts.length,
      updatedAt: new Date().toISOString(),
    },
  });
}
