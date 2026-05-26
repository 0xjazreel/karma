import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as http from "http";
dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const RPC_URL          = process.env.RPC_URL          ?? "https://rpc.xlayer.tech";
const PRIVATE_KEY      = process.env.PRIVATE_KEY!;
const REGISTRY_ADDRESS = process.env.KARMA_REGISTRY_ADDRESS!;
const HOOK_ADDRESS     = process.env.KARMA_HOOK_ADDRESS!;
const LOOP_INTERVAL_MS = 60_000; // 60 seconds
const WRITE_GATE       = 3;      // only write if score changed ±3 — saves gas
const BATCH_SIZE       = 10;     // max wallets per batch tx

if (!PRIVATE_KEY || !REGISTRY_ADDRESS || !HOOK_ADDRESS) {
  console.error("❌ Missing env vars: PRIVATE_KEY, KARMA_REGISTRY_ADDRESS, KARMA_HOOK_ADDRESS");
  console.error("   Copy agent/.env.example to agent/.env and fill in your values.");
  process.exit(1);
}

// ─── Contracts ────────────────────────────────────────────────────────────────

const REGISTRY_ABI = [
  "function karma(address) external view returns (uint8)",
  "function batchSetKarma(address[] calldata wallets, uint8[] calldata scores) external",
  "function totalUpdates() external view returns (uint256)",
  "event KarmaUpdated(address indexed wallet, uint8 indexed oldScore, uint8 indexed newScore, uint256 timestamp)",
];

const HOOK_ABI = [
  "event KarmaFeeApplied(address indexed swapper, uint8 indexed karmaScore, uint24 indexed feeApplied)",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
const hook     = new ethers.Contract(HOOK_ADDRESS, HOOK_ABI, provider);

// ─── State ────────────────────────────────────────────────────────────────────

// In-memory cache: wallet → last written karma score
const writtenKarma = new Map<string, number>();

// Wallets that have swapped in our pool (discovered from hook events)
const activeSwappers = new Set<string>();

let totalTxCount = 0;
let cycleCount   = 0;
const startTime  = Date.now();

// ─── Karma Computation ────────────────────────────────────────────────────────

/**
 * Compute a 0-100 karma score for a wallet based on 4 on-chain factors.
 *
 * Factor 1: Transaction count on X Layer (max 30 points)
 *   - Proxy for wallet activity. A wallet with 300+ txns gets full points.
 *   - Formula: min(30, floor(txCount / 10))
 *
 * Factor 2: OKB balance (max 20 points)
 *   - Wallets holding OKB have skin in the ecosystem.
 *   - Formula: min(20, floor(balance_in_OKB * 4))
 *
 * Factor 3: Wallet age — blocks since first tx (max 30 points)
 *   - Older wallets are less likely to be fresh bot wallets.
 *   - Formula: min(30, floor(blockAge / 10000))
 *
 * Factor 4: Pool interaction history (max 20 points)
 *   - Wallets that have previously swapped in KarmaHook pools get bonus points.
 *   - Formula: 20 if in activeSwappers, else 5
 */
async function computeKarma(address: string): Promise<number> {
  try {
    const [txCount, balance, currentBlock] = await Promise.all([
      provider.getTransactionCount(address),
      provider.getBalance(address),
      provider.getBlockNumber(),
    ]);

    // Factor 1: Transaction count (0-30 points)
    const txPoints = Math.min(30, Math.floor(txCount / 10));

    // Factor 2: OKB balance (0-20 points)
    const okbBalance    = parseFloat(ethers.formatEther(balance));
    const balancePoints = Math.min(20, Math.floor(okbBalance * 4));

    // Factor 3: Wallet age estimate (0-30 points)
    // Estimate: assume first tx was ~(currentBlock - txCount * avgBlocksPerTx)
    // On X Layer, block time ~2s, assume avg 1 tx per 100 blocks for average user
    const estimatedFirstBlock = Math.max(0, currentBlock - txCount * 100);
    const blockAge            = currentBlock - estimatedFirstBlock;
    const agePoints           = Math.min(30, Math.floor(blockAge / 10_000));

    // Factor 4: Pool interaction history (0-20 points)
    const poolPoints = activeSwappers.has(address.toLowerCase()) ? 20 : 5;

    const score = Math.min(100, txPoints + balancePoints + agePoints + poolPoints);
    return score;

  } catch (err) {
    console.error(`[karma] Error computing karma for ${address}:`, err);
    return 0;
  }
}

// ─── Event Listener: discover new swappers ────────────────────────────────────

async function listenForSwappers(): Promise<void> {
  hook.on("KarmaFeeApplied", (swapper: string) => {
    const lower = swapper.toLowerCase();
    if (!activeSwappers.has(lower)) {
      activeSwappers.add(lower);
      console.log(`[discovery] New swapper: ${swapper}`);
    }
  });
  console.log("[agent] Listening for new swappers on KarmaHook...");
}

// ─── Main scoring loop ────────────────────────────────────────────────────────

async function scoringCycle(): Promise<void> {
  cycleCount++;
  const cycleStart = Date.now();

  console.log(`\n[cycle ${cycleCount}] Starting... Active wallets: ${activeSwappers.size}`);

  const wallets = Array.from(activeSwappers);

  if (wallets.length === 0) {
    console.log(`[cycle ${cycleCount}] No active wallets yet. Waiting for first swap.`);
    return;
  }

  // Compute karma in parallel, capped at 20 concurrent RPC calls
  const PARALLEL_LIMIT = 20;
  const toUpdate: Array<{ wallet: string; score: number }> = [];

  for (let i = 0; i < wallets.length; i += PARALLEL_LIMIT) {
    const batch  = wallets.slice(i, i + PARALLEL_LIMIT);
    const scores = await Promise.all(batch.map(w => computeKarma(w)));

    for (let j = 0; j < batch.length; j++) {
      const wallet    = batch[j];
      const newScore  = scores[j];
      const lastScore = writtenKarma.get(wallet) ?? -999;

      // WRITE-GATE: only write if score changed ±3 or more (saves gas)
      if (Math.abs(newScore - lastScore) >= WRITE_GATE) {
        toUpdate.push({ wallet, score: newScore });
      }
    }

    // Small delay between RPC batches to avoid rate limiting
    if (i + PARALLEL_LIMIT < wallets.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  if (toUpdate.length === 0) {
    console.log(`[cycle ${cycleCount}] No score changes > ${WRITE_GATE}. Skipping tx.`);
    return;
  }

  // Write in batches of BATCH_SIZE to keep tx gas manageable
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const batchSlice   = toUpdate.slice(i, i + BATCH_SIZE);
    const batchWallets = batchSlice.map(u => u.wallet);
    const batchScores  = batchSlice.map(u => u.score);

    try {
      console.log(`[write] Updating ${batchSlice.length} wallets on-chain...`);

      const tx = await (registry as any).batchSetKarma(batchWallets, batchScores, {
        gasLimit: 500_000,
      });
      await tx.wait();

      totalTxCount++;
      console.log(`[write] ✅ TX confirmed: ${tx.hash} | Total txns: ${totalTxCount}`);

      // Update in-memory state after confirmed write
      for (const { wallet, score } of batchSlice) {
        writtenKarma.set(wallet, score);
      }

    } catch (err) {
      console.error(`[write] ❌ Batch write failed:`, err);
    }
  }

  const elapsed = Date.now() - cycleStart;
  console.log(`[cycle ${cycleCount}] Done in ${elapsed}ms. Updated ${toUpdate.length} wallets.`);
}

// ─── Status HTTP server (for Railway health checks) ───────────────────────────

const statusServer = http.createServer((req, res) => {
  // CORS — allow the Vercel frontend to fetch this endpoint
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/status" || req.url === "/") {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status:          "running",
      uptime_seconds:  uptime,
      cycles:          cycleCount,
      total_tx:        totalTxCount,
      active_wallets:  activeSwappers.size,
      registry:        REGISTRY_ADDRESS,
      hook:            HOOK_ADDRESS,
      rpc:             RPC_URL,
    }, null, 2));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found. Try /status" }));
  }
});

statusServer.listen(3001, () => {
  console.log("[server] Status server running on :3001/status");
});

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("=== KARMA PROTOCOL AGENT STARTING ===");
  console.log(`Registry: ${REGISTRY_ADDRESS}`);
  console.log(`Hook:     ${HOOK_ADDRESS}`);
  console.log(`RPC:      ${RPC_URL}`);
  console.log(`Interval: ${LOOP_INTERVAL_MS / 1000}s`);
  console.log(`Write-gate: ±${WRITE_GATE} karma points`);
  console.log(`Batch size: ${BATCH_SIZE} wallets per tx`);

  // Confirm agent wallet is funded
  const agentAddress = await signer.getAddress();
  const agentBalance = await provider.getBalance(agentAddress);
  console.log(`Agent wallet: ${agentAddress}`);
  console.log(`Agent balance: ${ethers.formatEther(agentBalance)} OKB`);

  if (agentBalance === 0n) {
    console.warn("⚠️  Agent wallet has 0 OKB. Fund it before writes will succeed.");
  }

  // Start event listener to discover wallets that swap through KarmaHook
  await listenForSwappers();

  // Seed with the agent wallet itself so first cycle always runs a tx
  activeSwappers.add(agentAddress.toLowerCase());
  console.log(`[seed] Added agent wallet to active swappers: ${agentAddress}`);

  // Run first scoring cycle immediately on startup
  await scoringCycle();

  // Then run every 60 seconds
  setInterval(scoringCycle, LOOP_INTERVAL_MS);

  console.log(`\n[agent] ✅ Running every ${LOOP_INTERVAL_MS / 1000}s. Press Ctrl+C to stop.`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
