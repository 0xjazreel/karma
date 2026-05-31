import asyncio
import logging
from typing import Callable, Dict, List, Optional

from analyzer import parse_swap
from config import config
from database import db
from helius import helius
from prices import price_client

logger = logging.getLogger(__name__)


class WalletTracker:
    """
    Polls all tracked wallets on a fixed interval and fires an async callback
    for every new swap detected since the last check.
    """

    def __init__(self, on_alert: Callable):
        self.on_alert = on_alert
        self.running = False

    async def _check_wallet(
        self, address: str, last_sig: Optional[str]
    ) -> List[Dict]:
        """Return new swap transactions since last_sig (most-recent first)."""
        txs = await helius.get_swap_transactions(address, limit=20)
        if not txs:
            return []

        new_txs: List[Dict] = []
        for tx in txs:
            if tx.get("signature") == last_sig:
                break
            new_txs.append(tx)

        return new_txs

    async def _build_alert(
        self, address: str, tx: Dict, wallet_meta: Dict
    ) -> Optional[Dict]:
        swap = parse_swap(tx)
        if not swap:
            return None

        token_info = await price_client.get_token_info(swap["token_mint"])
        sol_price = await price_client.get_sol_price_usd()

        # Best-effort entry price in USD
        entry_price_usd = 0.0
        if swap["token_amount"] and swap["sol_amount"] and sol_price:
            sol_per_token = swap["sol_amount"] / swap["token_amount"]
            entry_price_usd = sol_per_token * sol_price

        return {
            "wallet": address,
            "action": swap["action"],
            "token_mint": swap["token_mint"],
            "token_symbol": token_info.get("symbol", "UNKNOWN"),
            "token_name": token_info.get("name", ""),
            "sol_amount": swap["sol_amount"],
            "token_amount": swap["token_amount"],
            "entry_price_usd": entry_price_usd,
            "current_price_usd": token_info.get("price_usd", entry_price_usd),
            "win_rate": wallet_meta.get("win_rate", 0),
            "avg_roi": wallet_meta.get("avg_roi", 0),
            "total_trades": wallet_meta.get("total_trades", 0),
            "score": wallet_meta.get("score", 0),
            "timestamp": tx.get("timestamp", 0),
            "signature": tx.get("signature", ""),
        }

    async def _process_wallet(self, address: str):
        wallet_meta = await db.get_wallet(address)
        if not wallet_meta:
            return

        last_sig = wallet_meta.get("last_signature")
        new_txs = await self._check_wallet(address, last_sig)
        if not new_txs:
            return

        # Update the last-seen pointer immediately to avoid duplicate alerts
        await db.update_last_signature(address, new_txs[0]["signature"])

        for tx in new_txs:
            alert = await self._build_alert(address, tx, wallet_meta)
            if alert:
                try:
                    await self.on_alert(alert)
                except Exception as exc:
                    logger.error(f"Alert callback error: {exc}")

    async def track_loop(self):
        self.running = True
        logger.info("Wallet tracker started.")

        while self.running:
            try:
                tracked = await db.get_tracked_wallets()
                logger.debug(f"Tracker tick — {len(tracked)} wallets.")

                for address in tracked:
                    try:
                        await self._process_wallet(address)
                    except Exception as exc:
                        logger.error(f"Error processing {address}: {exc}")
                    await asyncio.sleep(0.4)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error(f"Tracker loop error: {exc}")

            await asyncio.sleep(config.TRACK_POLL_SECONDS)

        logger.info("Wallet tracker stopped.")

    def stop(self):
        self.running = False
