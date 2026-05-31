import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    TELEGRAM_TOKEN: str = os.getenv("TELEGRAM_TOKEN", "")
    HELIUS_API_KEY: str = os.getenv("HELIUS_API_KEY", "")
    BIRDEYE_API_KEY: str = os.getenv("BIRDEYE_API_KEY", "")
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "karma_bot.db")

    MIN_TRADES: int = int(os.getenv("MIN_TRADES", "20"))
    MIN_WIN_RATE: float = float(os.getenv("MIN_WIN_RATE", "0.60"))
    SCAN_INTERVAL_HOURS: int = int(os.getenv("SCAN_INTERVAL_HOURS", "6"))
    TRACK_POLL_SECONDS: int = int(os.getenv("TRACK_POLL_SECONDS", "30"))
    MAX_TRACKED_WALLETS: int = int(os.getenv("MAX_TRACKED_WALLETS", "100"))

    @property
    def HELIUS_RPC_URL(self) -> str:
        return f"https://mainnet.helius-rpc.com/?api-key={self.HELIUS_API_KEY}"

    HELIUS_API_URL: str = "https://api.helius.xyz"

    # Solana DEX program IDs
    DEX_PROGRAMS: list = [
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",  # Raydium AMM v4
        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  # Pump.fun
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",  # Jupiter v6
        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  # Orca Whirlpool
    ]

    # Known program/system addresses — skip these as "traders"
    BLACKLISTED_ADDRESSES: set = {
        "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        "11111111111111111111111111111111",
        "ComputeBudget111111111111111111111111111111",
        "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bsw",
        "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
        "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
        "So11111111111111111111111111111111111111112",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    }


config = Config()
