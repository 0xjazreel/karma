import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Set

from analyzer import calculate_wallet_stats, detect_wash_trading, parse_swap
from config import config
from database import db
from helius import helius

logger = logging.getLogger(__name__)


async def _extract_fee_payers_from_signatures(signatures: List[str]) -> Set[str]:
    """Resolve a batch of signatures → unique fee-payer addresses via Helius bulk endpoint."""
    wallets: Set[str] = set()
    txs = await helius.get_transactions_by_signatures(signatures[:100])
    for tx in txs:
        fp = tx.get("feePayer", "")
        if fp and fp not in config.BLACKLISTED_ADDRESSES:
            wallets.add(fp)
    return wallets


async def discover_wallets_from_program(program_id: str, limit: int = 150) -> Set[str]:
    """Return a set of recent trader addresses from a DEX program."""
    logger.info(f"Scanning program {program_id[:8]}…")
    sigs = await helius.get_signatures_for_address(program_id, limit=limit)
    if not sigs:
        return set()
    wallets = await _extract_fee_payers_from_signatures(sigs)
    logger.info(f"  → {len(wallets)} wallets from {program_id[:8]}")
    return wallets


async def analyze_wallet(address: str) -> Dict:
    """
    Fetch swap history, calculate stats, persist result.
    Returns the wallet dict if it qualifies, else {}.
    """
    logger.debug(f"Analyzing {address[:8]}…")

    if await helius.is_program_account(address):
        logger.debug(f"Skipping program account {address[:8]}")
        return {}

    txs = await helius.get_all_swap_transactions(address, max_txs=300)
    if not txs:
        return {}

    swaps = [s for tx in txs for s in [parse_swap(tx)] if s]
    if len(swaps) < config.MIN_TRADES:
        return {}

    stats = calculate_wallet_stats(swaps)
    if stats["total_trades"] < config.MIN_TRADES:
        return {}

    is_flagged = detect_wash_trading(swaps)
    last_sig = txs[0].get("signature") if txs else None
    qualifies = stats["win_rate"] >= config.MIN_WIN_RATE and not is_flagged
    now = datetime.utcnow().isoformat()

    wallet_data: Dict = {
        "address": address,
        "first_seen": now,
        "last_updated": now,
        "total_trades": stats["total_trades"],
        "win_rate": stats["win_rate"],
        "avg_roi": stats["avg_roi"],
        "total_pnl": stats["total_pnl"],
        "avg_hold_time": stats["avg_hold_time"],
        "best_trade": stats["best_trade"],
        "worst_trade": stats["worst_trade"],
        "is_tracked": 1 if qualifies else 0,
        "is_flagged": 1 if is_flagged else 0,
        "score": stats["score"],
        "last_signature": last_sig,
    }

    await db.upsert_wallet(wallet_data)
    logger.info(
        f"  {address[:8]}: {stats['total_trades']} trades, "
        f"{stats['win_rate']*100:.1f}% WR, score={stats['score']:.1f}"
        + (" [FLAGGED]" if is_flagged else "")
    )
    return wallet_data


async def run_discovery_scan(max_wallets_to_analyze: int = 60) -> List[Dict]:
    """
    Full scan cycle:
      1. Collect recent traders from all configured DEX programs.
      2. Skip already-known wallets.
      3. Analyze up to max_wallets_to_analyze new wallets.
      4. Return those that pass the win-rate threshold.
    """
    logger.info("=== Discovery scan started ===")
    discovered: Set[str] = set()

    for prog in config.DEX_PROGRAMS:
        wallets = await discover_wallets_from_program(prog, limit=100)
        discovered.update(wallets)
        await asyncio.sleep(1)

    # Filter out already-known wallets to focus on new ones
    new_wallets = []
    for addr in discovered:
        if not await db.wallet_exists(addr):
            new_wallets.append(addr)

    logger.info(
        f"Discovered {len(discovered)} total wallets, "
        f"{len(new_wallets)} are new — analyzing up to {max_wallets_to_analyze}."
    )

    high_performers: List[Dict] = []
    for address in new_wallets[:max_wallets_to_analyze]:
        try:
            result = await analyze_wallet(address)
            if result and result.get("win_rate", 0) >= config.MIN_WIN_RATE:
                high_performers.append(result)
        except Exception as exc:
            logger.error(f"analyze_wallet({address}): {exc}")
        await asyncio.sleep(0.5)

    logger.info(
        f"=== Scan complete — {len(high_performers)} high performers found ==="
    )
    return high_performers
