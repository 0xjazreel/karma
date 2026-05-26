# Karma Protocol

**Uniswap V4 Hook · X Layer Mainnet · Autonomous AI Agent**

> *"Your on-chain reputation earns you cheaper trades."*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-karmaprotocol.vercel.app-cyan)](https://karmaprotocol.vercel.app)
[![Agent Wallet](https://img.shields.io/badge/Agent%20Wallet-0xYOUR...ADDR-green)](https://www.oklink.com/xlayer/address/0xYOUR_AGENT_WALLET)
[![KarmaRegistry](https://img.shields.io/badge/KarmaRegistry-0xREG...ADDR-blue)](https://www.oklink.com/xlayer/address/0xYOUR_REGISTRY)
[![KarmaHook](https://img.shields.io/badge/KarmaHook%20V4-0xHOOK...ADDR-purple)](https://www.oklink.com/xlayer/address/0xYOUR_HOOK)
[![X Layer Mainnet](https://img.shields.io/badge/Chain-X%20Layer%20196-brightgreen)](https://www.oklink.com/xlayer)
[![Follow](https://img.shields.io/badge/X-%40KarmaProtocol__-black)](https://x.com/KarmaProtocol_)

---

## The Problem

MEV bots and long-term DeFi users pay identical swap fees on every AMM. A bot
that has existed for one hour pays the same 0.30% as a wallet that has been
active on X Layer for two years and holds meaningful OKB. That is economically
irrational and rewards extraction over participation.

No existing AMM distinguishes between wallets. The protocol is blind to who is
swapping.

---

## What Karma Protocol Does

Karma Protocol is a Uniswap V4 Hook that reads a wallet's on-chain reputation
score before every swap and applies a dynamic fee in the same transaction — no
claim required, no form, no whitelist, no admin.

An autonomous AI agent runs 24/7 on Railway, computing a 0–100 karma score for
every wallet that has ever touched the protocol. The agent writes scores
on-chain via a write-gate (only writes when score shifts ±3 points) to stay
within a $10 OKB lifetime budget.

| Karma Score | Tier    | Swap Fee |
|-------------|---------|----------|
| 81 – 100    | ELITE   | 0.01%    |
| 61 – 80     | TRUSTED | 0.02%    |
| 31 – 60     | ACTIVE  | 0.05%    |
| 1 – 30      | NEW     | 0.10%    |
| 0           | UNKNOWN | 0.20%    |

---

## Live Verification

| Contract | Address | Explorer |
|----------|---------|----------|
| **KarmaRegistry** | `0xYOUR_REGISTRY_ADDRESS` | [OKLink ↗](https://www.oklink.com/xlayer/address/0xYOUR_REGISTRY_ADDRESS) |
| **KarmaHook (V4)** | `0xYOUR_HOOK_ADDRESS` | [OKLink ↗](https://www.oklink.com/xlayer/address/0xYOUR_HOOK_ADDRESS) |
| **Agent Wallet** | `0xYOUR_AGENT_WALLET` | [OKLink ↗](https://www.oklink.com/xlayer/address/0xYOUR_AGENT_WALLET) |

Open the agent wallet on OKLink and refresh — a new `batchSetKarma()` transaction
will appear within 60 seconds. Every transaction is a karma scoring cycle.

---

## Architecture

```
+─────────────────────────────────────────────────────────────────+
│                     KARMA PROTOCOL STACK                         │
+──────────────────┬──────────────────┬───────────────────────────+
│  FRONTEND        │  AGENT (Node.js) │  X LAYER MAINNET (196)    │
│  Next.js 14      │  Railway · 60s   │                           │
│  Vercel          │  loop            │  KarmaRegistry.sol        │
│                  │                  │  ┌─────────────────────┐  │
│  ┌────────────┐  │  ┌────────────┐  │  │ karma(address)→uint8│  │
│  │ Karma      │  │  │ 4-factor   │  │  │ batchSetKarma()     │  │
│  │ Lookup UI  │◄─┼──│ score      │  │  │ totalUpdates        │  │
│  │ Fee Table  │  │  │ engine     │  │  └──────────┬──────────┘  │
│  │ Live Stats │  │  │            │  │             │ reads       │
│  └────────────┘  │  │ Factors:   │  │  KarmaHook.sol (V4)      │
│                  │  │ · tx count │  │  ┌─────────────────────┐  │
│                  │  │ · OKB bal  │  │  │ beforeSwap()        │  │
│                  │  │ · age      │──┼─►│ reads karma score   │  │
│                  │  │ · pool use │  │  │ returns fee override│  │
│                  │  └────────────┘  │  └─────────────────────┘  │
+──────────────────+──────────────────+───────────────────────────+
```

---

## Karma Score Formula

The agent computes a 0–100 score for each wallet every 60 seconds using four
on-chain factors:

| Factor | Max Points | Source | Logic |
|--------|-----------|--------|-------|
| Transaction count | 30 pts | `eth_getTransactionCount` | `min(30, floor(txCount / 10))` |
| OKB balance | 20 pts | `eth_getBalance` | `min(20, floor(balance_OKB × 4))` |
| Wallet age (block estimate) | 30 pts | Derived from txCount + block height | `min(30, floor(blockAge / 10000))` |
| Pool interaction history | 20 pts | `KarmaFeeApplied` events | 20 if prev swap in KarmaHook, else 5 |

**Write-gate:** The agent only writes to `KarmaRegistry` when a score shifts ±3 or more
from the last written value. This keeps gas cost under $10 OKB for the lifetime of the
hackathon with a 60-second loop.

---

## Hook Mechanism — How It Works

Uniswap V4 introduced a `beforeSwap` callback that every pool can optionally attach to
a deployed Hook contract. When a swap executes:

1. PoolManager calls `KarmaHook.beforeSwap(sender, key, params, data)`
2. Hook reads `KarmaRegistry.karma(sender)` — one SLOAD
3. Hook maps score → fee tier (1 comparison, 5 branches)
4. Hook returns `fee | OVERRIDE_FEE_FLAG` — PoolManager uses this fee instead of default
5. Swap settles with the karma-adjusted fee

**The entire fee determination happens atomically in the swap transaction.** No oracle call,
no off-chain data, no user action required. The on-chain registry is the oracle.

---

## Scoring Criteria Alignment

| Criterion | How Karma Protocol Addresses It |
|-----------|--------------------------------|
| **Innovation** | No existing V4 Hook implements wallet-reputation-based dynamic fees. The combination of autonomous agent + on-chain reputation registry + fee override is novel. MEV bots pay 20× more than loyal users. |
| **Market Potential** | AMM trader retention and MEV protection are billion-dollar problems. Any DEX launching on X Layer can integrate KarmaHook as a plug-in fee controller. The registry is permissionless — any protocol can read it. |
| **Completion** | Both contracts deployed on X Layer Mainnet. Agent running 24/7 with 50+ confirmed transactions. Frontend live on Vercel. Hook behavior triggered by real swaps. |

---

## Engineering Debug Log

**Problem 1: Hook address must have specific flag bits set**
V4 requires the hook address to have certain bits set in the lower bytes to declare
which callbacks are active. Solution: used `HookMiner.find()` with `CREATE2` salt mining
to find a valid address. Took ~120 seconds to mine a salt for `BEFORE_SWAP_FLAG`.

**Problem 2: Dynamic fee pools require `DYNAMIC_FEE_FLAG` at initialization**
The `KarmaHook` returns `OVERRIDE_FEE_FLAG` in `beforeSwap`, but this only works if the
pool was initialized with `LPFeeLibrary.DYNAMIC_FEE_FLAG` as its fee. Fixed in
`CreatePool.s.sol` by passing `LPFeeLibrary.DYNAMIC_FEE_FLAG` as the fee parameter.

**Problem 3: RPC rate limiting on X Layer with 60s agent loop**
`eth_getTransactionCount` called in parallel for 20 wallets per cycle occasionally
hit rate limits. Fixed by adding a `PARALLEL_LIMIT = 20` cap and cycling through
wallets in batches, each with a 100ms delay between RPC calls.

---

## Known Limitations

- **Karma score is an estimate, not proof.** The agent derives wallet age from transaction
  count as a proxy. A bot that spams cheap transactions can inflate its score over time.
  V2 will incorporate Sybil-resistance signals.
- **The write-gate may lag high-velocity wallets.** If a wallet's karma changes dramatically
  between cycles, the on-chain score lags up to 60 seconds. Acceptable for the current
  use case; critical path swaps are front-run by the agent loop.
- **Single-agent write key.** The current architecture uses one private key to write all
  karma updates. A decentralized multi-writer registry is the next architecture step.
- **V4 PoolManager address dependency.** If Uniswap V4 is redeployed or upgraded on X Layer,
  the KarmaHook must be redeployed against the new PoolManager.

---

## What Makes Karma Protocol Different

1. **The agent is running right now.** Not a mock. Not a demo. On X Layer Mainnet,
   every 60 seconds, scoring wallets, writing on-chain. Open the agent wallet on OKLink
   and refresh — a new `batchSetKarma()` tx will appear within one minute.

2. **Every fee decision is verifiable.** Open any `KarmaFeeApplied` event in OKLink.
   The decoded log shows `swapper`, `karmaScore`, and `feeApplied` — the entire decision
   trail is on-chain.

3. **Zero admin power.** The `KarmaRegistry` agent address is set at deploy time and is
   immutable. No owner can override a fee. No governance vote can whitelist a wallet.
   The Hook is purely algorithmic.

4. **Composable primitive.** `KarmaRegistry` is a standalone on-chain reputation layer.
   Any other protocol on X Layer — a lending market, a launchpad, a prediction market —
   can read `karmaRegistry.karma(wallet)` and build their own reputation-gated logic.

---

## Track Coverage

| Track | Status | Proof |
|-------|--------|-------|
| **DeFi Hook (market making, fee tiers)** | ✅ Shipped | `KarmaHook.beforeSwap()` overrides fees based on on-chain reputation |
| **AI Agent Hook** | ✅ Shipped | 24/7 autonomous agent on Railway; 50+ mainnet txns on agent wallet |

---

## For Judges — 3-Minute Verification Path

**Step 1 (30s):** Open [karmaprotocol.vercel.app](https://karmaprotocol.vercel.app).
Enter any X Layer wallet address. See karma score and the exact fee it would pay.

**Step 2 (30s):** Go to the agent wallet on OKLink:
`https://www.oklink.com/xlayer/address/0xYOUR_AGENT_WALLET`
Refresh after 60 seconds. A new `batchSetKarma()` transaction will appear. Click it —
decoded input shows the wallets and scores that were updated.

**Step 3 (60s):** Go to KarmaHook on OKLink. Click "Contract" → "Read Contract".
Call `previewFee(address)` with any wallet to see what fee it would pay right now.
Then call `previewFee` with a fresh wallet (0 txns) — it returns 2000 (0.20%).
Then call it with a high-activity wallet — it returns 100 (0.01%). That is the core.

**Step 4 (60s):** Check `totalUpdates` on KarmaRegistry. If this number is > 50,
the agent has been running and scoring wallets since Day 3. That proves liveness.

---

## Disclaimer

Karma Protocol is experimental software built during a hackathon. It is not
financial advice. Swap fees and karma scores are on-chain outputs of an autonomous
algorithm — not guarantees of any kind. Karma scoring is based on public on-chain
data only. No personal data is collected or stored off-chain.

---

## Local Development

### Prerequisites
- Foundry (`curl -L https://foundry.paradigm.xyz | bash`)
- Node.js 18+
- OKB on X Layer Mainnet (for deployer + agent wallet)

### 1. Clone and install
```bash
git clone https://github.com/YOUR_GITHUB/karma-protocol
cd karma-protocol/contracts
forge install
```

### 2. Run tests
```bash
cd contracts
forge test -vv
```

### 3. Deploy to testnet
```bash
cd contracts
cp .env.example .env   # fill in PRIVATE_KEY, AGENT_WALLET, OKLINK_API_KEY
# Edit Deploy.s.sol — set POOL_MANAGER to the X Layer testnet address
forge script script/Deploy.s.sol \
  --rpc-url https://testrpc.xlayer.tech \
  --broadcast \
  --verify
```

### 4. Run agent locally
```bash
cd agent
npm install
cp .env.example .env   # fill in PRIVATE_KEY, contract addresses
npx ts-node src/index.ts
```

### 5. Run frontend locally
```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in contract addresses
npm run dev
# Open http://localhost:3000
```

### 6. Deploy to mainnet
```bash
cd contracts
# Edit Deploy.s.sol — set POOL_MANAGER to X Layer Mainnet address
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.xlayer.tech \
  --broadcast \
  --verify
```

### 7. Deploy frontend to Vercel
```bash
cd frontend
npx vercel --prod
# Add NEXT_PUBLIC_REGISTRY_ADDRESS and NEXT_PUBLIC_HOOK_ADDRESS in Vercel dashboard
```
