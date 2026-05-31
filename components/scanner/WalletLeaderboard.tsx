"use client";

import { useState } from "react";
import { WalletMetrics } from "./types";

type SortKey = "rank" | "winRate" | "roi" | "pnl" | "trades";
type TrendFilter = "all" | "improving" | "declining" | "stable";

interface Props {
  wallets: WalletMetrics[];
  onSelectWallet: (w: WalletMetrics) => void;
}

export default function WalletLeaderboard({ wallets, onSelectWallet }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [filter, setFilter] = useState<TrendFilter>("all");

  const displayed = [...wallets]
    .filter((w) => filter === "all" || w.trend === filter)
    .sort((a, b) => {
      if (sortBy === "winRate") return b.winRate - a.winRate;
      if (sortBy === "roi") return b.avgROI - a.avgROI;
      if (sortBy === "pnl") return b.totalPnL - a.totalPnL;
      if (sortBy === "trades") return b.totalTrades - a.totalTrades;
      return a.rank - b.rank;
    });

  const SortTh = ({
    col,
    label,
    align = "right",
  }: {
    col: SortKey;
    label: string;
    align?: string;
  }) => (
    <th
      className={`px-4 py-3 text-${align} cursor-pointer select-none whitespace-nowrap transition-colors ${
        sortBy === col ? "text-purple-400" : "text-slate-400 hover:text-slate-200"
      }`}
      onClick={() => setSortBy(col)}
    >
      {label}
      <span className="ml-1 opacity-60">{sortBy === col ? "▼" : "⇅"}</span>
    </th>
  );

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl overflow-hidden">
      {/* toolbar */}
      <div className="px-5 py-4 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Top Performing Wallets</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Min 60% win rate · 20+ trades · Raydium / Pump.fun / Jupiter / Orca
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["all", "improving", "stable", "declining"] as TrendFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full capitalize transition ${
                filter === f
                  ? "bg-purple-600 text-white"
                  : "text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider border-b border-slate-700/40">
              <th className="px-5 py-3 text-left text-slate-400">Rank</th>
              <th className="px-4 py-3 text-left text-slate-400">Wallet</th>
              <SortTh col="winRate" label="Win Rate" />
              <SortTh col="roi" label="Avg ROI" />
              <SortTh col="pnl" label="Total PnL" />
              <SortTh col="trades" label="Trades" />
              <th className="px-4 py-3 text-right text-slate-400">Trend</th>
              <th className="px-4 py-3 text-right text-slate-400">Last 10</th>
              <th className="px-5 py-3 text-right text-slate-400">Active</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((w) => (
              <Row key={w.address} wallet={w} onClick={() => onSelectWallet(w)} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-700/40 text-xs text-slate-500 text-center">
        {displayed.length} wallets shown · Click any row for full report card
      </div>
    </div>
  );
}

function Row({ wallet, onClick }: { wallet: WalletMetrics; onClick: () => void }) {
  const trendColor =
    wallet.trend === "improving"
      ? "text-green-400"
      : wallet.trend === "declining"
      ? "text-red-400"
      : "text-yellow-400";
  const trendIcon =
    wallet.trend === "improving" ? "↑" : wallet.trend === "declining" ? "↓" : "→";

  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-700/20 hover:bg-slate-700/25 cursor-pointer transition-colors group"
    >
      {/* rank */}
      <td className="px-5 py-3">
        {wallet.rank <= 3 ? (
          <span className="text-lg">{["🥇", "🥈", "🥉"][wallet.rank - 1]}</span>
        ) : (
          <span className="text-slate-500 text-xs font-mono">#{wallet.rank}</span>
        )}
      </td>

      {/* wallet */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {wallet.flagged && (
            <span title="Suspected wash trading" className="text-yellow-500 text-xs shrink-0">
              ⚠
            </span>
          )}
          <span className="font-mono text-xs text-slate-300 group-hover:text-white transition">
            {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
          </span>
        </div>
      </td>

      {/* win rate */}
      <td className="px-4 py-3 text-right">
        <WinBadge rate={wallet.winRate} />
      </td>

      {/* roi */}
      <td className="px-4 py-3 text-right font-medium text-green-400">
        +{wallet.avgROI}%
      </td>

      {/* pnl */}
      <td className="px-4 py-3 text-right font-medium text-white">
        +{wallet.totalPnL} SOL
      </td>

      {/* trades */}
      <td className="px-4 py-3 text-right text-slate-300">{wallet.totalTrades}</td>

      {/* trend */}
      <td className={`px-4 py-3 text-right font-medium capitalize ${trendColor}`}>
        {trendIcon} {wallet.trend}
      </td>

      {/* win dots */}
      <td className="px-4 py-3">
        <div className="flex gap-0.5 justify-end">
          {wallet.winHistory.map((w, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${w ? "bg-green-400" : "bg-red-400/70"}`}
            />
          ))}
        </div>
      </td>

      {/* last active */}
      <td className="px-5 py-3 text-right text-slate-500 text-xs">{wallet.lastActive}</td>
    </tr>
  );
}

function WinBadge({ rate }: { rate: number }) {
  const cls =
    rate >= 80
      ? "bg-green-500/15 text-green-400 border-green-500/30"
      : rate >= 70
      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
      : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {rate.toFixed(1)}%
    </span>
  );
}
