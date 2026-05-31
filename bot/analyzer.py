import logging
from collections import defaultdict
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
STABLE_MINTS = {USDC_MINT, USDT_MINT}


def _is_quote(mint: str) -> bool:
    return mint == SOL_MINT or mint in STABLE_MINTS


def parse_swap(tx: Dict) -> Optional[Dict]:
    """
    Extract a normalised swap record from a Helius enriched transaction.

    Returns:
        {action, token_mint, sol_amount, token_amount, timestamp, signature, fee_payer}
        or None if the tx cannot be parsed as a user-facing swap.
    """
    try:
        events = tx.get("events") or {}
        swap = events.get("swap")
        if not swap:
            return None

        ts = tx.get("timestamp", 0)
        sig = tx.get("signature", "")
        fee_payer = tx.get("feePayer", "")

        native_in = swap.get("nativeInput")
        native_out = swap.get("nativeOutput")
        tok_in = swap.get("tokenInputs") or []
        tok_out = swap.get("tokenOutputs") or []

        def _lamports_to_sol(raw) -> float:
            if not raw:
                return 0.0
            return raw.get("amount", 0) / 1e9

        def _token_amount(t: Dict) -> float:
            raw = t.get("rawTokenAmount") or {}
            amt = float(raw.get("tokenAmount") or 0)
            dec = int(raw.get("decimals") or 0)
            return amt / (10**dec) if dec else amt

        # ── BUY: SOL → token ──────────────────────────────────────────
        if native_in and tok_out:
            for t in tok_out:
                mint = t.get("mint", "")
                if not _is_quote(mint):
                    return {
                        "action": "BUY",
                        "token_mint": mint,
                        "sol_amount": _lamports_to_sol(native_in),
                        "token_amount": _token_amount(t),
                        "timestamp": ts,
                        "signature": sig,
                        "fee_payer": fee_payer,
                    }

        # ── SELL: token → SOL ─────────────────────────────────────────
        if native_out and tok_in:
            for t in tok_in:
                mint = t.get("mint", "")
                if not _is_quote(mint):
                    return {
                        "action": "SELL",
                        "token_mint": mint,
                        "sol_amount": _lamports_to_sol(native_out),
                        "token_amount": _token_amount(t),
                        "timestamp": ts,
                        "signature": sig,
                        "fee_payer": fee_payer,
                    }

        # ── Token-to-token (stablecoin pairs) ─────────────────────────
        if tok_in and tok_out:
            quote_in = [t for t in tok_in if _is_quote(t.get("mint", ""))]
            non_quote_out = [t for t in tok_out if not _is_quote(t.get("mint", ""))]
            quote_out = [t for t in tok_out if _is_quote(t.get("mint", ""))]
            non_quote_in = [t for t in tok_in if not _is_quote(t.get("mint", ""))]

            if quote_in and non_quote_out:
                q = quote_in[0]
                raw_q = q.get("rawTokenAmount") or {}
                dec_q = int(raw_q.get("decimals") or 6)
                usdc_amt = float(raw_q.get("tokenAmount") or 0) / (10**dec_q)
                t = non_quote_out[0]
                return {
                    "action": "BUY",
                    "token_mint": t.get("mint", ""),
                    "sol_amount": usdc_amt,   # stored as USDC; comparable only within same currency
                    "token_amount": _token_amount(t),
                    "timestamp": ts,
                    "signature": sig,
                    "fee_payer": fee_payer,
                    "currency": "USDC",
                }

            if quote_out and non_quote_in:
                q = quote_out[0]
                raw_q = q.get("rawTokenAmount") or {}
                dec_q = int(raw_q.get("decimals") or 6)
                usdc_amt = float(raw_q.get("tokenAmount") or 0) / (10**dec_q)
                t = non_quote_in[0]
                return {
                    "action": "SELL",
                    "token_mint": t.get("mint", ""),
                    "sol_amount": usdc_amt,
                    "token_amount": _token_amount(t),
                    "timestamp": ts,
                    "signature": sig,
                    "fee_payer": fee_payer,
                    "currency": "USDC",
                }

    except Exception as exc:
        logger.debug(f"parse_swap error: {exc}")

    return None


def calculate_wallet_stats(swaps: List[Dict]) -> Dict:
    """
    Match buys → sells per token (FIFO) and return aggregated metrics.
    Only SOL-denominated (or same-currency) round-trips are counted.
    """
    swaps = sorted(swaps, key=lambda x: x["timestamp"])

    # Group per token
    by_token: Dict[str, List] = defaultdict(list)
    for s in swaps:
        by_token[s["token_mint"]].append(s)

    completed: List[Dict] = []
    open_positions: List[Dict] = []

    for mint, trades in by_token.items():
        buy_queue: List[Dict] = []
        for swap in trades:
            if swap["action"] == "BUY":
                buy_queue.append(swap)
            elif swap["action"] == "SELL" and buy_queue:
                buy = buy_queue.pop(0)
                # Only compare trades in the same currency
                if buy.get("currency") != swap.get("currency"):
                    continue
                buy_sol = buy["sol_amount"]
                sell_sol = swap["sol_amount"]
                if buy_sol <= 0:
                    continue
                pnl = sell_sol - buy_sol
                roi = pnl / buy_sol * 100
                hold = swap["timestamp"] - buy["timestamp"]
                completed.append(
                    {
                        "token_mint": mint,
                        "buy_time": buy["timestamp"],
                        "sell_time": swap["timestamp"],
                        "buy_sol": buy_sol,
                        "sell_sol": sell_sol,
                        "pnl_sol": pnl,
                        "roi_percent": roi,
                        "is_win": pnl > 0,
                        "hold_time_seconds": max(hold, 0),
                        "buy_signature": buy["signature"],
                        "sell_signature": swap["signature"],
                    }
                )
        for b in buy_queue:
            open_positions.append({"token_mint": mint, **b})

    if not completed:
        return {
            "total_trades": 0,
            "wins": 0,
            "losses": 0,
            "win_rate": 0.0,
            "avg_roi": 0.0,
            "total_pnl": 0.0,
            "avg_hold_time": 0.0,
            "best_trade": 0.0,
            "worst_trade": 0.0,
            "score": 0.0,
            "completed_trades": [],
            "open_positions": open_positions,
        }

    wins = [t for t in completed if t["is_win"]]
    n = len(completed)
    win_rate = len(wins) / n
    avg_roi = sum(t["roi_percent"] for t in completed) / n
    total_pnl = sum(t["pnl_sol"] for t in completed)
    avg_hold = sum(t["hold_time_seconds"] for t in completed) / n
    best = max(t["roi_percent"] for t in completed)
    worst = min(t["roi_percent"] for t in completed)

    # Composite score (0–100): win_rate 50%, capped avg_roi 30%, trade depth 20%
    roi_factor = min(avg_roi / 100, 2.0)
    depth_factor = min(n / 100, 1.0)
    score = (win_rate * 0.5 + roi_factor * 0.3 + depth_factor * 0.2) * 100

    return {
        "total_trades": n,
        "wins": len(wins),
        "losses": n - len(wins),
        "win_rate": win_rate,
        "avg_roi": avg_roi,
        "total_pnl": total_pnl,
        "avg_hold_time": avg_hold,
        "best_trade": best,
        "worst_trade": worst,
        "score": score,
        "completed_trades": completed,
        "open_positions": open_positions,
    }


def detect_wash_trading(swaps: List[Dict]) -> bool:
    """Heuristic wash-trade detection."""
    if len(swaps) < 10:
        return False

    stats = calculate_wallet_stats(swaps)
    # Suspiciously perfect record with many trades
    if stats["total_trades"] > 50 and stats["win_rate"] > 0.97:
        return True

    # More than 60 % of all swaps concentrated on one token
    token_counts: Dict[str, int] = defaultdict(int)
    for s in swaps:
        token_counts[s["token_mint"]] += 1
    top = max(token_counts.values())
    if len(swaps) > 0 and top / len(swaps) > 0.60:
        return True

    # Extremely fast round-trips (< 10 s) accounting for > 30 % of trades
    fast = sum(
        1
        for t in stats["completed_trades"]
        if t["hold_time_seconds"] < 10
    )
    if stats["total_trades"] > 0 and fast / max(stats["total_trades"], 1) > 0.30:
        return True

    return False
