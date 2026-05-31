import logging
from typing import Dict, Optional

import aiohttp

logger = logging.getLogger(__name__)

SOL_MINT = "So11111111111111111111111111111111111111112"
USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"

_JUPITER_PRICE = "https://price.jup.ag/v6/price"
_DEXSCREENER = "https://api.dexscreener.com/latest/dex/tokens"


class PriceClient:
    def __init__(self):
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10)
            )
        return self._session

    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

    async def get_sol_price_usd(self) -> float:
        session = await self._get_session()
        try:
            async with session.get(
                _JUPITER_PRICE, params={"ids": SOL_MINT, "vsToken": "USDC"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    price_data = data.get("data", {}).get(SOL_MINT)
                    if price_data:
                        return float(price_data.get("price", 0))
        except Exception as exc:
            logger.debug(f"SOL price error: {exc}")
        return 0.0

    async def get_token_price_usd(self, mint: str) -> Optional[float]:
        if mint == SOL_MINT:
            return await self.get_sol_price_usd()

        # Try Jupiter first (fastest)
        price = await self._jupiter_price(mint)
        if price is not None:
            return price

        # Fallback to DexScreener
        info = await self._dexscreener_info(mint)
        return info.get("price_usd") if info else None

    async def get_token_info(self, mint: str) -> Dict:
        """Return symbol, name, price_usd for a token mint."""
        if mint == SOL_MINT:
            price = await self.get_sol_price_usd()
            return {"symbol": "SOL", "name": "Solana", "price_usd": price}

        info = await self._dexscreener_info(mint)
        if info:
            return info

        price = await self._jupiter_price(mint) or 0.0
        return {"symbol": "UNKNOWN", "name": "", "price_usd": price}

    async def _jupiter_price(self, mint: str) -> Optional[float]:
        session = await self._get_session()
        try:
            async with session.get(
                _JUPITER_PRICE, params={"ids": mint, "vsToken": "USDC"}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    pd = data.get("data", {}).get(mint)
                    if pd:
                        return float(pd.get("price", 0))
        except Exception as exc:
            logger.debug(f"Jupiter price {mint}: {exc}")
        return None

    async def _dexscreener_info(self, mint: str) -> Optional[Dict]:
        session = await self._get_session()
        try:
            async with session.get(f"{_DEXSCREENER}/{mint}") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    pairs = data.get("pairs") or []
                    if not pairs:
                        return None
                    # Pick the highest-liquidity Solana pair
                    sol_pairs = [p for p in pairs if p.get("chainId") == "solana"]
                    pool = sol_pairs or pairs
                    best = max(
                        pool,
                        key=lambda p: float(
                            (p.get("liquidity") or {}).get("usd") or 0
                        ),
                    )
                    base = best.get("baseToken") or {}
                    if base.get("address", "").lower() == mint.lower():
                        symbol = base.get("symbol", "UNKNOWN")
                        name = base.get("name", "")
                    else:
                        quote = best.get("quoteToken") or {}
                        symbol = quote.get("symbol", "UNKNOWN")
                        name = quote.get("name", "")

                    return {
                        "symbol": symbol,
                        "name": name,
                        "price_usd": float(best.get("priceUsd") or 0),
                    }
        except Exception as exc:
            logger.debug(f"DexScreener info {mint}: {exc}")
        return None


price_client = PriceClient()
