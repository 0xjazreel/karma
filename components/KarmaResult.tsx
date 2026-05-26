"use client";

import React from "react";

interface KarmaResultProps {
  address: string;
  score: number;
}

export default function KarmaResult({ address, score }: KarmaResultProps) {
  // Determine tier
  const getTier = (score: number) => {
    if (score >= 81) return { tier: "ELITE", fee: "0.01%", color: "from-yellow-500 to-yellow-600" };
    if (score >= 61) return { tier: "TRUSTED", fee: "0.02%", color: "from-green-500 to-green-600" };
    if (score >= 31) return { tier: "ACTIVE", fee: "0.05%", color: "from-blue-500 to-blue-600" };
    if (score >= 1) return { tier: "NEW", fee: "0.10%", color: "from-orange-500 to-orange-600" };
    return { tier: "UNKNOWN", fee: "0.20%", color: "from-red-500 to-red-600" };
  };

  const tierInfo = getTier(score);

  // Shorten address for display
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 border border-purple-500/30 rounded-lg p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-purple-300 text-sm">Wallet Address</p>
          <p className="text-white font-mono text-lg">{shortAddress}</p>
        </div>
        <div className="text-right">
          <p className="text-purple-300 text-sm">View on OKLink</p>
          <a
            href={`https://www.oklink.com/xlayer/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 text-sm underline"
          >
            ↗ Open Explorer
          </a>
        </div>
      </div>

      {/* Score Display */}
      <div className="space-y-4">
        <div className="flex items-end gap-6">
          <div>
            <p className="text-purple-300 text-sm mb-2">Your Karma Score</p>
            <div className="text-6xl font-bold text-white">{score}</div>
            <p className="text-purple-300 text-xs mt-1">out of 100</p>
          </div>

          {/* Tier Badge */}
          <div className={`bg-gradient-to-br ${tierInfo.color} px-6 py-4 rounded-lg mb-2`}>
            <p className="text-white text-center font-bold text-2xl">
              {tierInfo.tier}
            </p>
          </div>
        </div>

        {/* Score Bar */}
        <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            className={`bg-gradient-to-r ${tierInfo.color} h-full transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Fee Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
          <p className="text-purple-300 text-xs font-medium mb-1">Your Swap Fee</p>
          <p className="text-3xl font-bold text-white">{tierInfo.fee}</p>
          <p className="text-purple-300 text-xs mt-2">
            on every trade
          </p>
        </div>

        <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
          <p className="text-purple-300 text-xs font-medium mb-1">
            Bot Fee (Comparison)
          </p>
          <p className="text-3xl font-bold text-red-400">0.20%</p>
          <p className="text-purple-300 text-xs mt-2">
            if score was 0
          </p>
        </div>
      </div>

      {/* Savings Info */}
      {score > 0 && (
        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-300 font-semibold text-sm">
            ✅ You&apos;re saving {(0.2 - parseFloat(tierInfo.fee)).toFixed(4)}% per swap vs. a fresh wallet!
          </p>
          <p className="text-green-300 text-xs mt-1">
            On a $10,000 trade, you save ~${(10000 * (0.2 - parseFloat(tierInfo.fee)) / 100).toFixed(2)} in fees.
          </p>
        </div>
      )}

      {/* Score Factors Breakdown */}
      <div className="bg-slate-700/50 rounded-lg p-4">
        <p className="text-purple-300 text-sm font-bold mb-3">Score Breakdown</p>
        <div className="space-y-2 text-xs text-purple-300">
          <p>
            🔷 <span className="text-white">Transaction Count:</span> 30 pts max
          </p>
          <p>
            💰 <span className="text-white">OKB Balance:</span> 20 pts max
          </p>
          <p>
            📅 <span className="text-white">Wallet Age:</span> 30 pts max
          </p>
          <p>
            🔄 <span className="text-white">Pool History:</span> 20 pts max
          </p>
        </div>
      </div>

      {/* Last Updated Note */}
      <div className="text-center text-xs text-purple-400 border-t border-purple-500/20 pt-4">
        Score updates every 60 seconds. Last check: just now
      </div>
    </div>
  );
}
