"use client";

import React, { useEffect, useState } from "react";

interface AgentStatus {
  status: string;
  uptime_seconds: number;
  cycles: number;
  total_tx: number;
  active_wallets: number;
  registry: string;
  hook: string;
  rpc: string;
}

export default function AgentStats() {
  const [stats, setStats] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
      if (!agentUrl) {
        setError("Agent URL not configured");
        return;
      }

      const response = await fetch(`${agentUrl}/status`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setStats(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 20000); // Poll every 20s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Agent Status</h3>
        <div
          className={`w-3 h-3 rounded-full ${
            stats?.status === "running" ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-xs">{error}</p>
          <p className="text-red-300 text-xs mt-1">Make sure NEXT_PUBLIC_AGENT_URL is set</p>
        </div>
      )}

      {loading ? (
        <div className="text-purple-300 text-sm text-center py-4">Loading agent data...</div>
      ) : stats ? (
        <>
          {/* Stats Grid */}
          <div className="space-y-3">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-purple-300 text-xs mb-1">Uptime</p>
              <p className="text-white font-bold text-sm">{formatUptime(stats.uptime_seconds)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-purple-300 text-xs mb-1">Scoring Cycles</p>
                <p className="text-white font-bold text-lg">{stats.cycles}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-purple-300 text-xs mb-1">On-chain Writes</p>
                <p className="text-white font-bold text-lg">{stats.total_tx}</p>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-purple-300 text-xs mb-1">Active Wallets</p>
              <p className="text-white font-bold text-sm">{stats.active_wallets} wallets</p>
            </div>
          </div>

          {/* Contract Links */}
          <div className="border-t border-purple-500/20 pt-4 space-y-2">
            <p className="text-purple-300 text-xs font-semibold">Contract Addresses</p>

            <a
              href={`https://www.oklink.com/xlayer/address/${stats.registry}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-slate-700/50 hover:bg-slate-700 rounded-lg p-2 transition"
            >
              <p className="text-purple-400 text-xs font-mono">
                Registry: {shortenAddress(stats.registry)}
              </p>
              <p className="text-purple-300 text-xs">↗ View on OKLink</p>
            </a>

            <a
              href={`https://www.oklink.com/xlayer/address/${stats.hook}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-slate-700/50 hover:bg-slate-700 rounded-lg p-2 transition"
            >
              <p className="text-purple-400 text-xs font-mono">Hook: {shortenAddress(stats.hook)}</p>
              <p className="text-purple-300 text-xs">↗ View on OKLink</p>
            </a>
          </div>

          {/* Last Updated */}
          <div className="text-center text-xs text-purple-400 border-t border-purple-500/20 pt-3">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </>
      ) : null}
    </div>
  );
}
