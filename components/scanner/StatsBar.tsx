"use client";

import { ScanStats } from "./types";

export default function StatsBar({ stats }: { stats: ScanStats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Wallets Tracked"
        value={stats.walletsTracked.toString()}
        sub="high-performing wallets"
        accent="blue"
        icon="📡"
      />
      <Card
        label="High Performers"
        value={stats.highPerformers.toString()}
        sub="≥ 70% win rate"
        accent="green"
        icon="⭐"
      />
      <Card
        label="Alerts Today"
        value={stats.alertsToday.toString()}
        sub="buy / sell signals"
        accent="yellow"
        icon="🔔"
      />
      <Card
        label="Wallets Scanned"
        value={stats.totalScanned.toLocaleString()}
        sub={stats.scanStatus === "scanning" ? "scanning…" : "up to date"}
        accent="purple"
        icon={stats.scanStatus === "scanning" ? "🔄" : "✅"}
        pulse={stats.scanStatus === "scanning"}
      />
    </div>
  );
}

type Accent = "blue" | "green" | "yellow" | "purple";

function Card({
  label,
  value,
  sub,
  accent,
  icon,
  pulse,
}: {
  label: string;
  value: string;
  sub: string;
  accent: Accent;
  icon: string;
  pulse?: boolean;
}) {
  const border: Record<Accent, string> = {
    blue: "border-blue-500/25 bg-blue-500/5",
    green: "border-green-500/25 bg-green-500/5",
    yellow: "border-yellow-500/25 bg-yellow-500/5",
    purple: "border-purple-500/25 bg-purple-500/5",
  };
  const text: Record<Accent, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
  };

  return (
    <div className={`border ${border[accent]} rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
      <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${text[accent]}`}>
        {pulse && (
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
        )}
        {sub}
      </div>
    </div>
  );
}
