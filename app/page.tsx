import React from "react";
import KarmaLookup from "@/components/KarmaLookup";
import AgentStats from "@/components/AgentStats";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-500/30 bg-slate-900/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                ⚡ Karma Protocol
              </h1>
              <p className="text-purple-300 text-sm mt-1">
                Your on-chain reputation earns you cheaper trades.
              </p>
            </div>
            <div className="text-right text-xs text-purple-300">
              <p>Uniswap V4 Hook</p>
              <p>X Layer Mainnet</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-white">
            Check Your Karma Score
          </h2>
          <p className="text-purple-300 text-lg max-w-2xl mx-auto">
            Enter your wallet address to see your on-chain reputation score and
            the swap fee you&apos;ll pay. Scores update every 60 seconds based on
            transaction count, OKB balance, wallet age, and pool history.
          </p>
        </section>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Karma Lookup - 2 columns */}
          <div className="lg:col-span-2">
            <KarmaLookup />
          </div>

          {/* Agent Stats - 1 column */}
          <div>
            <AgentStats />
          </div>
        </div>

        {/* Fee Table */}
        <section className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-white mb-6">Fee Tiers</h3>
          <div className="grid md:grid-cols-5 gap-4">
            {[
              { tier: "ELITE", score: "81-100", fee: "0.01%", color: "from-yellow-500 to-yellow-600" },
              { tier: "TRUSTED", score: "61-80", fee: "0.02%", color: "from-green-500 to-green-600" },
              { tier: "ACTIVE", score: "31-60", fee: "0.05%", color: "from-blue-500 to-blue-600" },
              { tier: "NEW", score: "1-30", fee: "0.10%", color: "from-orange-500 to-orange-600" },
              { tier: "UNKNOWN", score: "0", fee: "0.20%", color: "from-red-500 to-red-600" },
            ].map((item) => (
              <div
                key={item.tier}
                className={`bg-gradient-to-br ${item.color} p-4 rounded-lg text-white text-center`}
              >
                <div className="font-bold text-sm mb-1">{item.tier}</div>
                <div className="text-xs text-white/80 mb-2">Score: {item.score}</div>
                <div className="text-lg font-bold">{item.fee}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Scoring Factors */}
        <section className="bg-slate-800/50 border border-purple-500/30 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-white mb-6">
            How Your Score is Calculated
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                title: "Transaction Count",
                max: "30 pts",
                description: "Proxy for wallet activity. 300+ transactions = full points.",
              },
              {
                title: "OKB Balance",
                max: "20 pts",
                description: "Wallets holding OKB have skin in the ecosystem.",
              },
              {
                title: "Wallet Age",
                max: "30 pts",
                description: "Older wallets are less likely to be fresh bot wallets.",
              },
              {
                title: "Pool History",
                max: "20 pts",
                description: "Wallets that previously swapped in KarmaHook pools get bonus.",
              },
            ].map((factor) => (
              <div key={factor.title} className="space-y-2">
                <div className="bg-purple-500/20 rounded-lg p-4">
                  <div className="text-sm font-bold text-purple-300 mb-1">
                    {factor.title}
                  </div>
                  <div className="text-2xl font-bold text-white mb-2">
                    {factor.max}
                  </div>
                  <p className="text-xs text-purple-200">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-purple-300 text-sm border-t border-purple-500/30 pt-8">
          <p>
            Karma Protocol is an autonomous on-chain reputation system running 24/7 on Railway.
          </p>
          <p className="mt-2 text-xs text-purple-400">
            Built with Uniswap V4 Hooks | Deployed on X Layer Mainnet
          </p>
        </footer>
      </main>
    </div>
  );
}
