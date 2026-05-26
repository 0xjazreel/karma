import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karma Protocol - On-Chain Reputation Rewards Cheaper Trades",
  description:
    "Uniswap V4 Hook that applies dynamic fees based on wallet reputation. Your on-chain karma earns you cheaper trades.",
  keywords:
    "Uniswap V4, DeFi, reputation, karma, swap fees, X Layer, Ethereum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">{children}</body>
    </html>
  );
}
