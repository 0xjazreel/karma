"use client";

import { useState, useEffect, useCallback } from "react";
import { WalletMetrics, AlertEntry, ScanStats } from "./types";
import { generateMockWallets, generateMockAlert } from "./mockData";
import StatsBar from "./StatsBar";
import WalletLeaderboard from "./WalletLeaderboard";
import AlertFeed from "./AlertFeed";
import WalletModal from "./WalletModal";

export default function ScannerDashboard() {
  const [wallets, setWallets] = useState<WalletMetrics[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [selected, setSelected] = useState<WalletMetrics | null>(null);
  const [scanStatus, setScanStatus] = useState<"scanning" | "idle">("scanning");
  const [totalScanned, setTotalScanned] = useState(14_782);
  const [alertsToday, setAlertsToday] = useState(47);
  const [mounted, setMounted] = useState(false);

  // Stable initial load
  useEffect(() => {
    const ws = generateMockWallets();
    setWallets(ws);

    const initAlerts: AlertEntry[] = [];
    for (let i = 0; i < 12; i++) initAlerts.push(generateMockAlert());
    setAlerts(initAlerts);
    setMounted(true);
  }, []);

  // Stream new alerts every 4 s
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setAlerts((prev) => [generateMockAlert(), ...prev.slice(0, 49)]);
      setAlertsToday((n) => n + 1);
      setTotalScanned((n) => n + Math.floor(Math.random() * 55 + 8));
    }, 4_000);
    return () => clearInterval(id);
  }, [mounted]);

  // Simulate scan cycles
  useEffect(() => {
    const id = setInterval(() => {
      setScanStatus("scanning");
      setTimeout(() => setScanStatus("idle"), 2_500);
    }, 18_000);
    return () => clearInterval(id);
  }, []);

  const closeModal = useCallback(() => setSelected(null), []);

  const stats: ScanStats = {
    walletsTracked: wallets.length,
    highPerformers: wallets.filter((w) => w.winRate >= 70).length,
    alertsToday,
    totalScanned,
    scanStatus,
  };

  return (
    <>
      <StatsBar stats={stats} />

      <div className="grid lg:grid-cols-3 gap-5 mt-5">
        <div className="lg:col-span-2">
          <WalletLeaderboard wallets={wallets} onSelectWallet={setSelected} />
        </div>
        <div>
          <AlertFeed alerts={alerts} />
        </div>
      </div>

      {selected && <WalletModal wallet={selected} onClose={closeModal} />}
    </>
  );
}
