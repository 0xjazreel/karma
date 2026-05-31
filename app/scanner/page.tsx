import React from "react";
import Link from "next/link";
import ScannerDashboard from "@/components/scanner/ScannerDashboard";

export const metadata = {
  title: "Solana Wallet Scanner | Karma",
  description:
    "Discover high win-rate Solana traders. Track memecoin wallets in real time. Win-rate analytics, PnL, and live buy/sell alerts.",
};

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ── sticky header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* brand + nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-white text-lg flex items-center gap-2 shrink-0">
              ⚡ <span>Karma</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Protocol
              </Link>
              <Link
                href="/scanner"
                className="px-3 py-1.5 rounded-lg text-white bg-slate-800 font-medium"
              >
                Scanner
              </Link>
            </nav>
          </div>

          {/* live badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs font-bold tracking-wide">LIVE</span>
          </div>
        </div>
      </header>

      {/* ── page body ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* page title */}
        <div className="mb-7">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Solana Wallet Scanner
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base max-w-2xl">
            Continuously scans Raydium, Pump.fun, Jupiter & Orca for high win-rate memecoin
            traders. Tracks live buys and sells from flagged wallets.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {["Raydium", "Pump.fun", "Jupiter", "Orca", "Helius RPC", "Birdeye Prices"].map((s) => (
              <span
                key={s}
                className="text-[10px] px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 uppercase tracking-wide"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* dashboard */}
        <ScannerDashboard />

        {/* ── how it works ── */}
        <section className="mt-12 border border-slate-800 rounded-2xl p-6 sm:p-8 bg-slate-900/30">
          <h2 className="text-xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_ITEMS.map((item) => (
              <div key={item.title} className="space-y-2">
                <span className="text-3xl">{item.emoji}</span>
                <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── data sources ── */}
        <section className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DATA_SOURCES.map((s) => (
            <div
              key={s.name}
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-4"
            >
              <p className="font-semibold text-white text-sm">{s.name}</p>
              <p className="text-slate-500 text-xs mt-1">{s.use}</p>
            </div>
          ))}
        </section>

        {/* footer */}
        <footer className="mt-10 text-center text-slate-600 text-xs border-t border-slate-800 pt-6">
          Karma Solana Scanner · Powered by Helius, Birdeye & DexScreener · Data is simulated for demo
        </footer>
      </main>
    </div>
  );
}

const HOW_ITEMS = [
  {
    emoji: "🔍",
    title: "Discover",
    desc: "Scans all DEX swaps every 6–12 hours. Wallets need 20+ trades and ≥60% win rate to qualify.",
  },
  {
    emoji: "📊",
    title: "Analyse",
    desc: "Calculates win rate, avg ROI, total PnL, hold time, consistency score, and activity trend.",
  },
  {
    emoji: "📡",
    title: "Track Live",
    desc: "Streams real-time transactions from flagged wallets via Helius webhooks and Solana RPC.",
  },
  {
    emoji: "🔔",
    title: "Alert",
    desc: "Sends instant Telegram / Discord alerts on new buys and sells with full context.",
  },
];

const DATA_SOURCES = [
  { name: "Helius API", use: "Enriched parsed DEX swap data & webhooks" },
  { name: "Birdeye / DexScreener", use: "Token price history for PnL calculation" },
  { name: "Jupiter API", use: "Swap routing & trade verification" },
  { name: "Solscan API", use: "Wallet transaction history & token transfers" },
];
