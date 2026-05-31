"use client";

import { useEffect } from "react";
import { WalletMetrics } from "./types";

export default function WalletModal({
  wallet,
  onClose,
}: {
  wallet: WalletMetrics;
  onClose: () => void;
}) {
  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const trendColor =
    wallet.trend === "improving"
      ? "text-green-400"
      : wallet.trend === "declining"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-950 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60 sticky top-0 bg-slate-950 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">
              {wallet.rank <= 3 ? ["🥇", "🥈", "🥉"][wallet.rank - 1] : `#${wallet.rank}`}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-white text-xs sm:text-sm break-all leading-snug">
                {wallet.address}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                Rank #{wallet.rank} · Last active {wallet.lastActive}
                {wallet.flagged && (
                  <span className="ml-2 text-yellow-500">⚠ flagged — possible wash trading</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition text-2xl leading-none shrink-0 ml-4"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ── top stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6 border-b border-slate-700/40">
          <Stat label="Win Rate" value={`${wallet.winRate}%`} color="green" />
          <Stat label="Avg ROI" value={`+${wallet.avgROI}%`} color="blue" />
          <Stat label="Total PnL" value={`+${wallet.totalPnL} SOL`} color="green" />
          <Stat label="Total Trades" value={String(wallet.totalTrades)} color="purple" />
        </div>

        {/* ── win rate by period ── */}
        <div className="px-6 py-4 border-b border-slate-700/40">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Win Rate by Period
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <PeriodBar label="7 Days" rate={wallet.weeklyWinRate} />
            <PeriodBar label="30 Days" rate={wallet.monthlyWinRate} />
            <PeriodBar label="All Time" rate={wallet.winRate} />
          </div>
        </div>

        {/* ── two column body ── */}
        <div className="grid md:grid-cols-2 gap-5 p-6">
          {/* left */}
          <div className="space-y-4">
            {/* details */}
            <Section title="Trade Details">
              <Row label="Avg Hold Time" value={wallet.avgHoldTime} />
              <Row label="Consistency Score" value={`${wallet.consistency}/100`} />
              <Row label="Activity Trend" value={wallet.trend} valueClass={trendColor + " capitalize"} />
            </Section>

            {/* best / worst */}
            <Section title="Highlight Trades">
              <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3 mb-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Best Trade</p>
                <p className="text-white font-bold">${wallet.bestTrade.token}</p>
                <p className="text-green-400 font-bold text-sm">
                  +{wallet.bestTrade.roi}% &nbsp;/&nbsp; +{wallet.bestTrade.pnlSOL} SOL
                </p>
              </div>
              <div className="bg-red-950/20 border border-red-500/20 rounded-lg p-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Worst Trade</p>
                <p className="text-white font-bold">${wallet.worstTrade.token}</p>
                <p className="text-red-400 font-bold text-sm">
                  {wallet.worstTrade.roi}% &nbsp;/&nbsp; {wallet.worstTrade.pnlSOL} SOL
                </p>
              </div>
            </Section>

            {/* top tokens */}
            <Section title="Most Traded Tokens">
              <div className="flex flex-wrap gap-2 pt-1">
                {wallet.topTokens.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/25 text-purple-300"
                  >
                    ${t}
                  </span>
                ))}
              </div>
            </Section>
          </div>

          {/* right: recent trades */}
          <Section title="Recent Trades">
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {wallet.recentTrades.map((trade, i) => {
                const time = new Date(trade.timestamp).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between text-xs p-2.5 rounded-lg ${
                      trade.type === "buy" ? "bg-green-950/25" : "bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={trade.type === "buy" ? "text-green-400" : "text-red-400"}>
                        {trade.type === "buy" ? "▲" : "▼"}
                      </span>
                      <span className="text-white font-medium shrink-0">${trade.token}</span>
                      <span className="text-slate-500 text-[10px] hidden sm:block">{trade.dex}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-slate-300">{trade.amountSOL} SOL</p>
                      {trade.type === "sell" && trade.roi !== 0 && (
                        <p className={trade.roi >= 0 ? "text-green-400" : "text-red-400"}>
                          {trade.roi >= 0 ? "+" : ""}
                          {trade.roi}%
                        </p>
                      )}
                      <p className="text-slate-600 text-[10px]">{time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* ── win/loss streak ── */}
        <div className="px-6 pb-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Last 10 Trade Outcomes
          </h3>
          <div className="flex gap-1.5">
            {wallet.winHistory.map((win, i) => (
              <div key={i} className="flex-1">
                <div
                  className={`h-9 rounded-md flex items-center justify-center font-bold text-xs text-white ${
                    win ? "bg-green-500/80" : "bg-red-500/60"
                  }`}
                >
                  {win ? "W" : "L"}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
            <span>oldest</span>
            <span>most recent</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  const c =
    color === "green"
      ? "text-green-400"
      : color === "blue"
      ? "text-blue-400"
      : color === "purple"
      ? "text-purple-400"
      : "text-white";
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 text-center">
      <p className="text-slate-400 text-[10px] uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${c} mt-1`}>{value}</p>
    </div>
  );
}

function PeriodBar({ label, rate }: { label: string; rate: number }) {
  const bar =
    rate >= 75 ? "bg-green-500" : rate >= 65 ? "bg-blue-500" : "bg-yellow-500";
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>{label}</span>
        <span className="text-white font-bold">{rate.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${bar} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between text-sm mb-2 last:mb-0">
      <span className="text-slate-400">{label}</span>
      <span className={valueClass || "text-white"}>{value}</span>
    </div>
  );
}
