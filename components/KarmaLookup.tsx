"use client";

import React, { useState } from "react";
import { isAddress } from "viem";
import KarmaResult from "./KarmaResult";

export default function KarmaLookup() {
  const [address, setAddress] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo karma computation (in production, call KarmaRegistry contract)
  const computeDemoScore = (addr: string): number => {
    // Deterministic but varied scores based on address
    const hash = addr
      .toLowerCase()
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Math.min(100, Math.max(0, (hash % 101)));
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setScore(null);

    // Validate address
    if (!address.trim()) {
      setError("Please enter a wallet address");
      return;
    }

    if (!isAddress(address)) {
      setError("Invalid Ethereum address. Must be 42 characters starting with 0x");
      return;
    }

    setLoading(true);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // In production, replace with actual contract call:
      // const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
      // const score = await publicClient.readContract({
      //   address: registryAddress,
      //   abi: REGISTRY_ABI,
      //   functionName: "karma",
      //   args: [address],
      // });

      const demoScore = computeDemoScore(address);
      setScore(demoScore);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch karma score"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Lookup Your Score</h2>

        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label htmlFor="address" className="block text-purple-300 text-sm font-medium mb-2">
              X Layer Wallet Address
            </label>
            <input
              id="address"
              type="text"
              placeholder="0x742d35Cc6634C0532925a3b844Bc24E1aEd76b23"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 transition"
            />
            <p className="text-purple-300 text-xs mt-2">
              Enter any wallet address to check its karma score
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">❌ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            {loading ? "🔄 Looking up..." : "🔍 Check Karma Score"}
          </button>
        </form>
      </div>

      {/* Result */}
      {score !== null && <KarmaResult address={address} score={score} />}

      {/* Info Cards */}
      {score === null && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-400 font-semibold text-sm mb-2">💡 How It Works</p>
            <ul className="text-purple-300 text-xs space-y-1">
              <li>• Your score updates every 60 seconds</li>
              <li>• Based on 4 on-chain factors</li>
              <li>• Higher score = lower swap fees</li>
              <li>• No claims, no forms required</li>
            </ul>
          </div>

          <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-4">
            <p className="text-purple-400 font-semibold text-sm mb-2">📊 Quick Facts</p>
            <ul className="text-purple-300 text-xs space-y-1">
              <li>• Agent running 24/7 on Railway</li>
              <li>• 60-second scoring cycle</li>
              <li>• Write-gate saves gas costs</li>
              <li>• Fully transparent on-chain</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
