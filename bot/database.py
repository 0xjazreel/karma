import aiosqlite
from datetime import datetime
from typing import Any, Dict, List, Optional

from config import config


class Database:
    def __init__(self, db_path: str = config.DATABASE_PATH):
        self.db_path = db_path

    async def initialize(self):
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript("""
                CREATE TABLE IF NOT EXISTS wallets (
                    address         TEXT PRIMARY KEY,
                    first_seen      TEXT NOT NULL,
                    last_updated    TEXT NOT NULL,
                    total_trades    INTEGER DEFAULT 0,
                    win_rate        REAL DEFAULT 0,
                    avg_roi         REAL DEFAULT 0,
                    total_pnl       REAL DEFAULT 0,
                    avg_hold_time   REAL DEFAULT 0,
                    best_trade      REAL DEFAULT 0,
                    worst_trade     REAL DEFAULT 0,
                    is_tracked      INTEGER DEFAULT 0,
                    is_flagged      INTEGER DEFAULT 0,
                    score           REAL DEFAULT 0,
                    last_signature  TEXT
                );

                CREATE TABLE IF NOT EXISTS trades (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    wallet_address  TEXT NOT NULL,
                    token_mint      TEXT NOT NULL,
                    token_symbol    TEXT DEFAULT 'UNKNOWN',
                    token_name      TEXT DEFAULT '',
                    buy_time        TEXT,
                    sell_time       TEXT,
                    buy_amount_sol  REAL,
                    sell_amount_sol REAL,
                    pnl_sol         REAL,
                    roi_percent     REAL,
                    is_win          INTEGER,
                    hold_time_secs  INTEGER,
                    buy_signature   TEXT,
                    sell_signature  TEXT,
                    FOREIGN KEY (wallet_address) REFERENCES wallets(address)
                );

                CREATE TABLE IF NOT EXISTS subscriptions (
                    chat_id         INTEGER PRIMARY KEY,
                    subscribed_at   TEXT NOT NULL,
                    min_win_rate    REAL DEFAULT 0.60,
                    alerts_enabled  INTEGER DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS user_tracked_wallets (
                    chat_id         INTEGER NOT NULL,
                    wallet_address  TEXT NOT NULL,
                    added_at        TEXT NOT NULL,
                    PRIMARY KEY (chat_id, wallet_address)
                );

                CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_address);
                CREATE INDEX IF NOT EXISTS idx_wallets_score  ON wallets(score DESC);
                CREATE INDEX IF NOT EXISTS idx_wallets_wr     ON wallets(win_rate DESC);
            """)
            await db.commit()

    async def upsert_wallet(self, data: Dict[str, Any]):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO wallets
                    (address, first_seen, last_updated, total_trades, win_rate,
                     avg_roi, total_pnl, avg_hold_time, best_trade, worst_trade,
                     is_tracked, is_flagged, score, last_signature)
                VALUES
                    (:address, :first_seen, :last_updated, :total_trades, :win_rate,
                     :avg_roi, :total_pnl, :avg_hold_time, :best_trade, :worst_trade,
                     :is_tracked, :is_flagged, :score, :last_signature)
                ON CONFLICT(address) DO UPDATE SET
                    last_updated   = excluded.last_updated,
                    total_trades   = excluded.total_trades,
                    win_rate       = excluded.win_rate,
                    avg_roi        = excluded.avg_roi,
                    total_pnl      = excluded.total_pnl,
                    avg_hold_time  = excluded.avg_hold_time,
                    best_trade     = excluded.best_trade,
                    worst_trade    = excluded.worst_trade,
                    is_flagged     = excluded.is_flagged,
                    score          = excluded.score,
                    last_signature = excluded.last_signature
                """,
                data,
            )
            await db.commit()

    async def get_wallet(self, address: str) -> Optional[Dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM wallets WHERE address = ?", (address,)
            ) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None

    async def get_leaderboard(self, limit: int = 20) -> List[Dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT * FROM wallets
                WHERE total_trades >= ? AND win_rate >= ? AND is_flagged = 0
                ORDER BY score DESC
                LIMIT ?
                """,
                (config.MIN_TRADES, config.MIN_WIN_RATE, limit),
            ) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def get_tracked_wallets(self) -> List[str]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT address FROM wallets WHERE is_tracked = 1"
            ) as cur:
                return [r[0] for r in await cur.fetchall()]

    async def set_wallet_tracked(self, address: str, tracked: bool):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE wallets SET is_tracked = ? WHERE address = ?",
                (1 if tracked else 0, address),
            )
            await db.commit()

    async def update_last_signature(self, address: str, signature: str):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE wallets SET last_signature = ? WHERE address = ?",
                (signature, address),
            )
            await db.commit()

    async def subscribe_chat(self, chat_id: int):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO subscriptions (chat_id, subscribed_at)
                VALUES (?, ?)
                ON CONFLICT(chat_id) DO UPDATE SET alerts_enabled = 1
                """,
                (chat_id, datetime.utcnow().isoformat()),
            )
            await db.commit()

    async def unsubscribe_chat(self, chat_id: int):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE subscriptions SET alerts_enabled = 0 WHERE chat_id = ?",
                (chat_id,),
            )
            await db.commit()

    async def get_subscribed_chats(self) -> List[int]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT chat_id FROM subscriptions WHERE alerts_enabled = 1"
            ) as cur:
                return [r[0] for r in await cur.fetchall()]

    async def add_user_tracked_wallet(self, chat_id: int, address: str):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT OR IGNORE INTO user_tracked_wallets (chat_id, wallet_address, added_at)
                VALUES (?, ?, ?)
                """,
                (chat_id, address, datetime.utcnow().isoformat()),
            )
            await db.commit()

    async def remove_user_tracked_wallet(self, chat_id: int, address: str):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM user_tracked_wallets WHERE chat_id = ? AND wallet_address = ?",
                (chat_id, address),
            )
            await db.commit()

    async def get_user_tracked_wallets(self, chat_id: int) -> List[str]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT wallet_address FROM user_tracked_wallets WHERE chat_id = ?",
                (chat_id,),
            ) as cur:
                return [r[0] for r in await cur.fetchall()]

    async def get_chats_tracking_wallet(self, wallet_address: str) -> List[int]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT chat_id FROM user_tracked_wallets WHERE wallet_address = ?",
                (wallet_address,),
            ) as cur:
                return [r[0] for r in await cur.fetchall()]

    async def wallet_exists(self, address: str) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                "SELECT 1 FROM wallets WHERE address = ?", (address,)
            ) as cur:
                return await cur.fetchone() is not None

    async def get_all_qualifying_wallets(self) -> List[Dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT * FROM wallets
                WHERE win_rate >= ? AND total_trades >= ?
                ORDER BY score DESC
                """,
                (config.MIN_WIN_RATE, config.MIN_TRADES),
            ) as cur:
                return [dict(r) for r in await cur.fetchall()]

    async def count_wallets(self) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT COUNT(*) FROM wallets") as cur:
                row = await cur.fetchone()
                return row[0] if row else 0


db = Database()
