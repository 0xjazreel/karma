import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Karma Protocol | On-chain Reputation = Cheaper Trades",
  description:
    "Karma Protocol is a Uniswap V4 Hook that applies dynamic swap fees based on your on-chain reputation score.",
  keywords: [
    "Karma",
    "Protocol",
    "Uniswap",
    "V4",
    "Hook",
    "X Layer",
    "DeFi",
    "Reputation",
    "Fees",
  ],
  openGraph: {
    title: "Karma Protocol | On-chain Reputation = Cheaper Trades",
    description: "Your on-chain reputation earns you cheaper trades",
    url: "https://karmaprotocol.vercel.app",
    type: "website",
    images: [
      {
        url: "https://karmaprotocol.vercel.app/og-image.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@KarmaProtocol_",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
