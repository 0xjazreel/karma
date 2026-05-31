"use client";

import { useEffect, useRef } from "react";
import { AlertEntry } from "./types";

export default function AlertFeed({ alerts }: { alerts: AlertEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new alert arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [alerts[0]?.id]);

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl overflow-hidden flex flex-col h-full min-h-[600px]">
      <div className="px-4 py-4 border-b border-slate-700/60 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-white">Live Alerts</h2>
          <p className="text-slate-500 text-xs mt-0.5">Tracked wallet activity</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-bold tracking-wide">LIVE</span>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto flex-1 p-3 space-y-2">
        {alerts.map((alert, i) => (
          <AlertCard key={alert.id} alert={alert} isNew={i === 0} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert, isNew }: { alert: AlertEntry; isNew: boolean }) {
  const isBuy = alert.type === "buy";
  const time = new Date(alert.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const priceStr =
    alert.entryPrice < 0.0001
      ? alert.entryPrice.toExponential(2)
      : alert.entryPrice < 0.01
      ? alert.entryPrice.toFixed(6)
      : alert.entryPrice.toFixed(4);

  return (
    <div
      className={`rounded-lg p-3 border text-xs space-y-2 transition-all duration-500 ${
        isBuy
          ? "bg-green-950/40 border-green-500/20"
          : "bg-red-950/30 border-red-500/20"
      } ${isNew ? "ring-1 ring-offset-0 ring-offset-transparent ring-purple-500/40" : ""}`}
    >
      {/* type + time */}
      <div className="flex items-center justify-between">
        <span className={`font-bold text-sm ${isBuy ? "text-green-400" : "text-red-400"}`}>
          {isBuy ? "🟢 NEW BUY" : "🔴 SELL"}
        </span>
        <span className="text-slate-500 tabular-nums">{time}</span>
      </div>

      {/* token + dex */}
      <div className="flex items-center justify-between">
        <span className="text-white font-bold">${alert.token}</span>
        <span className="text-slate-500 text-[10px] uppercase tracking-wide">{alert.dex}</span>
      </div>

      {/* wallet */}
      <div className="font-mono text-slate-400 truncate">
        {alert.wallet.slice(0, 8)}…{alert.wallet.slice(-6)}
      </div>

      {/* amount + price */}
      <div className="flex items-center justify-between text-slate-300">
        <span>{alert.amountSOL} SOL</span>
        <span className="text-slate-400">${priceStr}</span>
      </div>

      {/* wallet stats row */}
      <div className="flex items-center gap-3 border-t border-slate-700/40 pt-2 mt-1 text-[10px] text-slate-400">
        <span>
          WR:{" "}
          <span
            className={
              alert.winRate >= 80
                ? "text-green-400 font-bold"
                : alert.winRate >= 70
                ? "text-blue-400 font-bold"
                : "text-yellow-400 font-bold"
            }
          >
            {alert.winRate}%
          </span>
        </span>
        <span>
          ROI: <span className="text-green-400 font-bold">+{alert.avgROI}%</span>
        </span>
        <span className="text-slate-500">{alert.totalTrades}T</span>
      </div>
    </div>
  );
}
