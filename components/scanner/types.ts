export interface TradeSummary {
  token: string;
  tokenCA: string;
  roi: number;
  pnlSOL: number;
}

export interface TradeEntry {
  token: string;
  tokenCA: string;
  type: "buy" | "sell";
  amountSOL: number;
  price: number;
  pnlSOL: number;
  roi: number;
  timestamp: string;
  dex: string;
}

export interface WalletMetrics {
  address: string;
  winRate: number;
  totalTrades: number;
  avgROI: number;
  totalPnL: number;
  avgHoldTime: string;
  bestTrade: TradeSummary;
  worstTrade: TradeSummary;
  consistency: number;
  trend: "improving" | "declining" | "stable";
  topTokens: string[];
  recentTrades: TradeEntry[];
  rank: number;
  score: number;
  lastActive: string;
  flagged: boolean;
  weeklyWinRate: number;
  monthlyWinRate: number;
  winHistory: number[];
}

export interface AlertEntry {
  id: string;
  wallet: string;
  type: "buy" | "sell";
  token: string;
  tokenCA: string;
  amountSOL: number;
  entryPrice: number;
  winRate: number;
  avgROI: number;
  totalTrades: number;
  timestamp: string;
  dex: string;
}

export interface ScanStats {
  walletsTracked: number;
  highPerformers: number;
  alertsToday: number;
  totalScanned: number;
  scanStatus: "scanning" | "idle";
}
