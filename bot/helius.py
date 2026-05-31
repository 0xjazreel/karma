import asyncio
import logging
from typing import Any, Dict, List, Optional

import aiohttp

from config import config

logger = logging.getLogger(__name__)


class HeliusClient:
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            )
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    # ------------------------------------------------------------------
    # Enhanced Transaction API
    # ------------------------------------------------------------------

    async def get_swap_transactions(
        self,
        address: str,
        limit: int = 100,
        before: Optional[str] = None,
    ) -> List[Dict]:
        """Return parsed SWAP transactions for a wallet from Helius."""
        session = await self._get_session()
        url = f"{config.HELIUS_API_URL}/v0/addresses/{address}/transactions"
        params: Dict[str, Any] = {
            "api-key": config.HELIUS_API_KEY,
            "type": "SWAP",
            "limit": limit,
        }
        if before:
            params["before"] = before

        try:
            async with session.get(url, params=params) as resp:
                if resp.status == 200:
                    return await resp.json()
                if resp.status == 429:
                    logger.warning("Helius rate-limited — sleeping 5s")
                    await asyncio.sleep(5)
                else:
                    text = await resp.text()
                    logger.warning(f"Helius {resp.status} for {address}: {text[:120]}")
        except Exception as exc:
            logger.error(f"get_swap_transactions({address}): {exc}")

        return []

    async def get_all_swap_transactions(
        self, address: str, max_txs: int = 300
    ) -> List[Dict]:
        """Paginate through all swap history for a wallet."""
        all_txs: List[Dict] = []
        before: Optional[str] = None

        while len(all_txs) < max_txs:
            batch = await self.get_swap_transactions(address, limit=100, before=before)
            if not batch:
                break
            all_txs.extend(batch)
            if len(batch) < 100:
                break
            before = batch[-1].get("signature")
            await asyncio.sleep(0.3)

        return all_txs[:max_txs]

    async def get_transactions_by_signatures(
        self, signatures: List[str]
    ) -> List[Dict]:
        """Bulk-fetch parsed transactions by signature list (max 100 per call)."""
        session = await self._get_session()
        url = f"{config.HELIUS_API_URL}/v0/transactions"
        params = {"api-key": config.HELIUS_API_KEY}

        results: List[Dict] = []
        for chunk in _chunks(signatures, 100):
            try:
                async with session.post(url, params=params, json=chunk) as resp:
                    if resp.status == 200:
                        results.extend(await resp.json())
                    await asyncio.sleep(0.2)
            except Exception as exc:
                logger.error(f"get_transactions_by_signatures: {exc}")

        return results

    # ------------------------------------------------------------------
    # JSON-RPC helpers
    # ------------------------------------------------------------------

    async def _rpc(self, method: str, params: list) -> Any:
        session = await self._get_session()
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        try:
            async with session.post(config.HELIUS_RPC_URL, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("result")
        except Exception as exc:
            logger.error(f"RPC {method}: {exc}")
        return None

    async def get_signatures_for_address(
        self, address: str, limit: int = 100
    ) -> List[str]:
        """Return recent confirmed signatures for an address (incl. programs)."""
        result = await self._rpc(
            "getSignaturesForAddress",
            [address, {"limit": limit, "commitment": "confirmed"}],
        )
        if isinstance(result, list):
            return [s["signature"] for s in result]
        return []

    async def get_transaction_rpc(self, signature: str) -> Optional[Dict]:
        """Fetch a raw transaction via RPC (used only for signer extraction)."""
        result = await self._rpc(
            "getTransaction",
            [signature, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}],
        )
        return result

    async def is_program_account(self, address: str) -> bool:
        """Return True if the address is an on-chain executable program."""
        result = await self._rpc(
            "getAccountInfo",
            [address, {"encoding": "base64"}],
        )
        if result and isinstance(result, dict):
            value = result.get("value")
            if value and isinstance(value, dict):
                return bool(value.get("executable", False))
        return False


def _chunks(lst: list, n: int):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


helius = HeliusClient()
