import { NextResponse } from "next/server";
import { generateMockWallets } from "@/components/scanner/mockData";

// In production replace with:
//   - Helius API for parsed swap transactions
//   - Birdeye / DexScreener for token prices
//   - PostgreSQL / MongoDB for wallet score storage
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minWinRate = Number(searchParams.get("minWinRate") ?? 60);
  const limit = Number(searchParams.get("limit") ?? 20);

  const wallets = generateMockWallets()
    .filter((w) => w.winRate >= minWinRate)
    .slice(0, limit);

  return NextResponse.json({
    data: wallets,
    meta: {
      total: wallets.length,
      minWinRate,
      updatedAt: new Date().toISOString(),
    },
  });
}
