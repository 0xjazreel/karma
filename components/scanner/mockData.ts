import { WalletMetrics, TradeEntry, AlertEntry } from "./types";

const ADDRESSES = [
  "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "GsNzxJfFn6zQdJGeYsupJWzaa3qDiHnqMEAARTbpwTKv",
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSM2",
  "F4HH6bYHFbMT9gUdSHJnGYkXR7szkyWDaMmMxWpqcG5J",
  "BcevCBnzLr6Yx1S2bRFi5D8M4K9JqRoUCDuVmsTVTnsk",
  "HqXjr5rD8MpEkBrFGynXvLSEEwtBZQn7eUC4xKY8NkDz",
  "Ck3AXcEpqM2S5V6NjmHRY1QWzPrT8bUZDnFvCeLq4Ghx",
  "ArTz5vK2m7Nw4LqsJdR8ByCXWPeZUfMnHV3TgEqSa9pQ",
  "J8YkzLm3Qr5Tx6VnWDsHpKcFBqNRgA4MuCXPeZT2v7Ew",
  "Pk2NXjBqRz7Lm4Wv9YtHsUCDnMeQf5K8VgAkTrP3c6Zx",
  "Mn7vHqKz4Rx2Lp8WtYsBcNUDeFj5A6QgXrCTk9Pm3V1n",
  "Vy5KpMz8Nj3Rl6Wq4HsBtUYCXeDf7A2QgXcTrP1n9Lmk",
  "Tx3QmKz7Nj5Rl8Wq4HsBcNUDeFj6A9QgXrCTk2Pm3V7e",
  "Zp9KmNj4Rx3Lp7WtYsBcNUDeFj2A8QgXrCTk5Pm6V1qw",
  "Wm4NXjBqRz9Lp7Wv5YtHsBcNUDeFj3A6QgXrCTk8Pm2r",
  "Lq8KpMz3Nj7Rl4Wq2HsBcNUYCXeDf9A5QgXcTrP6n1Mv",
  "Fk6QmKz2Nj8Rl5Wq9HsBcNUDeFj4A7QgXrCTk3Pm1V8b",
  "Bp1NXjBqRz6Lm9Wv3YtHsBcNUDeFj8A4QgXrCTk7Pm5c",
  "Gn5KpMz9Nj2Rl7Wq6HsBcNUYCXeDf4A3QgXcTrP8n2Ka",
];

const TOKENS = [
  { name: "BONK", ca: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", price: 0.000024 },
  { name: "WIF", ca: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", price: 2.84 },
  { name: "MYRO", ca: "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4", price: 0.082 },
  { name: "POPCAT", ca: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", price: 0.33 },
  { name: "SLERF", ca: "7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7ByKd1Ke", price: 0.044 },
  { name: "BOME", ca: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82x", price: 0.0071 },
  { name: "MOODENG", ca: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzc8FC", price: 0.19 },
  { name: "PNUT", ca: "2qEHjDLDLbuBgRYvsxhc5Tg3HHHMr6zecBCbdRy9BX7R", price: 0.28 },
  { name: "GOAT", ca: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump", price: 0.42 },
  { name: "AI16Z", ca: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC", price: 0.97 },
  { name: "FARTCOIN", ca: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump", price: 0.52 },
  { name: "CHILLGUY", ca: "Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump", price: 0.13 },
];

const DEXES = ["Raydium", "Pump.fun", "Jupiter", "Orca"];

// Seeded pseudo-random using address hash so wallets are consistent across renders
function seededRng(seed: string, offset = 0) {
  let h = offset;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = ((h << 5) - h + 1) | 0;
    return (h >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function between(min: number, max: number, rng: () => number) {
  return min + rng() * (max - min);
}

function buildTrades(winRate: number, rng: () => number): TradeEntry[] {
  const count = Math.floor(between(6, 12, rng));
  return Array.from({ length: count }, (_, i) => {
    const token = pick(TOKENS, rng);
    const type = rng() > 0.5 ? ("buy" as const) : ("sell" as const);
    const isWin = rng() < winRate / 100;
    const amount = parseFloat(between(0.5, 15, rng).toFixed(2));
    const roi = isWin ? between(20, 500, rng) : between(-80, -5, rng);
    const pnl = amount * (roi / 100);
    const hoursAgo = Math.floor(between(1, 72, rng));
    return {
      token: token.name,
      tokenCA: token.ca,
      type,
      amountSOL: amount,
      price: token.price * (1 + between(-0.3, 1, rng)),
      pnlSOL: type === "sell" ? parseFloat(pnl.toFixed(4)) : 0,
      roi: type === "sell" ? parseFloat(roi.toFixed(1)) : 0,
      timestamp: new Date(Date.now() - hoursAgo * 3_600_000 - i * 300_000).toISOString(),
      dex: pick(DEXES, rng),
    };
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateMockWallets(): WalletMetrics[] {
  const wallets = ADDRESSES.map((address) => {
    const rng = seededRng(address);

    const winRate = parseFloat(between(60, 93, rng).toFixed(1));
    const totalTrades = Math.floor(between(25, 260, rng));
    const avgROI = parseFloat(between(55, 380, rng).toFixed(1));
    const totalPnL = parseFloat(between(12, 520, rng).toFixed(2));

    const tokenPool = [...TOKENS].sort(() => rng() - 0.5);
    const topTokens = tokenPool.slice(0, Math.floor(between(3, 6, rng))).map((t) => t.name);

    const bestToken = pick(TOKENS, rng);
    const worstToken = pick(TOKENS.filter((t) => t.name !== bestToken.name), rng);

    const trendR = rng();
    const trend =
      trendR < 0.4 ? ("improving" as const) :
      trendR < 0.6 ? ("declining" as const) :
      ("stable" as const);

    const holdH = Math.floor(between(1, 48, rng));
    const avgHoldTime =
      holdH < 24
        ? `${holdH}h ${Math.floor(between(0, 59, rng))}m`
        : `${Math.floor(holdH / 24)}d ${holdH % 24}h`;

    const winHistory = Array.from({ length: 10 }, () => (rng() < winRate / 100 ? 1 : 0));
    const weeklyWinRate = parseFloat(Math.min(99, Math.max(50, winRate + between(-10, 10, rng))).toFixed(1));
    const monthlyWinRate = parseFloat(Math.min(99, Math.max(50, winRate + between(-8, 8, rng))).toFixed(1));

    const lastActiveH = Math.floor(between(0, 4, rng));
    const lastActive = lastActiveH === 0 ? "Just now" : `${lastActiveH}h ago`;

    const score = parseFloat(
      (winRate * 0.55 + Math.min(100, avgROI * 0.15) + Math.min(30, totalTrades * 0.12)).toFixed(1)
    );

    return {
      address,
      winRate,
      totalTrades,
      avgROI,
      totalPnL,
      avgHoldTime,
      bestTrade: {
        token: bestToken.name,
        tokenCA: bestToken.ca,
        roi: parseFloat(between(180, 1400, rng).toFixed(0)),
        pnlSOL: parseFloat(between(4, 90, rng).toFixed(2)),
      },
      worstTrade: {
        token: worstToken.name,
        tokenCA: worstToken.ca,
        roi: parseFloat(between(-90, -20, rng).toFixed(0)),
        pnlSOL: parseFloat(between(-18, -0.5, rng).toFixed(2)),
      },
      consistency: parseFloat(between(45, 97, rng).toFixed(0)),
      trend,
      topTokens,
      recentTrades: buildTrades(winRate, rng),
      rank: 0,
      score,
      lastActive,
      flagged: rng() < 0.05,
      weeklyWinRate,
      monthlyWinRate,
      winHistory,
    };
  });

  return wallets
    .sort((a, b) => b.score - a.score)
    .map((w, i) => ({ ...w, rank: i + 1 }));
}

let alertSeq = 0;

export function generateMockAlert(): AlertEntry {
  const rng = seededRng(String(Date.now()), alertSeq++);
  const token = pick(TOKENS, rng);
  const wallet = pick(ADDRESSES, rng);
  return {
    id: `alert-${Date.now()}-${alertSeq}`,
    wallet,
    type: rng() > 0.42 ? "buy" : "sell",
    token: token.name,
    tokenCA: token.ca,
    amountSOL: parseFloat(between(0.5, 22, rng).toFixed(2)),
    entryPrice: token.price * (1 + between(-0.3, 0.6, rng)),
    winRate: parseFloat(between(62, 92, rng).toFixed(0)),
    avgROI: parseFloat(between(80, 340, rng).toFixed(0)),
    totalTrades: Math.floor(between(28, 220, rng)),
    timestamp: new Date().toISOString(),
    dex: pick(DEXES, rng),
  };
}
