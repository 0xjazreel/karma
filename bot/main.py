#!/usr/bin/env python3
"""
Solana High Win-Rate Wallet Scanner & Tracker — Telegram Bot
"""
import asyncio
import logging
import sys
from typing import Dict

from telegram import BotCommand, Update
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, ContextTypes

import formatter
from config import config
from database import db
from scanner import analyze_wallet, run_discovery_scan
from tracker import WalletTracker

logging.basicConfig(
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("karma_bot.log"),
    ],
)
logger = logging.getLogger(__name__)

# Shared state set during startup
_app: Application = None
_tracker: WalletTracker = None


# ──────────────────────────────────────────────────────────────────────────────
# Alert delivery
# ──────────────────────────────────────────────────────────────────────────────

async def _deliver_alert(alert: Dict):
    """Send a trade alert to all subscribed + personally-tracking chats."""
    if _app is None:
        return

    subscribed = await db.get_subscribed_chats()
    personal = await db.get_chats_tracking_wallet(alert["wallet"])
    recipients = set(subscribed) | set(personal)

    msg = formatter.alert_message(alert)
    for chat_id in recipients:
        try:
            await _app.bot.send_message(
                chat_id=chat_id,
                text=msg,
                parse_mode=ParseMode.MARKDOWN,
                disable_web_page_preview=True,
            )
        except Exception as exc:
            logger.warning(f"Alert send to {chat_id} failed: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# Command handlers
# ──────────────────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await db.subscribe_chat(update.effective_chat.id)
    await update.message.reply_text(
        "👋 *Welcome to the Solana Wallet Scanner Bot!*\n\n"
        "I continuously scan Raydium, Pump\\.fun, Jupiter, and Orca to find wallets "
        "with 60%\\+ win rates on memecoin trades\\. When a tracked wallet makes a move "
        "you'll get an instant alert\\.\n\n"
        "✅ You're now subscribed to live alerts\\.\n\n"
        "Run /scan to kick off a discovery scan, or /help to see all commands\\.",
        parse_mode=ParseMode.MARKDOWN_V2,
    )


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        formatter.help_message(), parse_mode=ParseMode.MARKDOWN
    )


async def cmd_stop(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await db.unsubscribe_chat(update.effective_chat.id)
    await update.message.reply_text(
        "🔕 Unsubscribed from all alerts. Use /start to re-subscribe."
    )


async def cmd_scan(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🔍 *Scan started…*\n\n"
        "Scanning Raydium, Pump\\.fun, Jupiter, and Orca for high win\\-rate wallets\\. "
        "This may take a few minutes\\.",
        parse_mode=ParseMode.MARKDOWN_V2,
    )
    try:
        results = await run_discovery_scan()
        if results:
            await update.message.reply_text(
                f"✅ Scan complete\\! Found *{len(results)}* high\\-performing wallets\\.\n"
                f"Check /leaderboard for rankings\\.",
                parse_mode=ParseMode.MARKDOWN_V2,
            )
        else:
            await update.message.reply_text(
                "🔍 Scan complete\\. No *new* high\\-performing wallets in this batch\\.\n"
                "Check /leaderboard for previously discovered wallets\\.",
                parse_mode=ParseMode.MARKDOWN_V2,
            )
    except Exception as exc:
        logger.exception("cmd_scan error")
        await update.message.reply_text(f"❌ Scan failed: {str(exc)[:120]}")


async def cmd_leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    wallets = await db.get_leaderboard(limit=20)
    await update.message.reply_text(
        formatter.leaderboard_message(wallets),
        parse_mode=ParseMode.MARKDOWN,
        disable_web_page_preview=True,
    )


async def cmd_wallet(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: `/wallet <solana_address>`", parse_mode=ParseMode.MARKDOWN
        )
        return

    address = context.args[0].strip()
    if len(address) < 32 or len(address) > 50:
        await update.message.reply_text("❌ That doesn't look like a valid Solana address.")
        return

    status = await update.message.reply_text("🔍 Looking up wallet…")
    wallet = await db.get_wallet(address)

    if not wallet:
        await status.edit_text("🔍 Wallet not in DB — analyzing from chain (may take ~30s)…")
        try:
            result = await analyze_wallet(address)
            wallet = await db.get_wallet(address) if result else None
        except Exception as exc:
            logger.error(f"cmd_wallet analyze error: {exc}")

    if wallet:
        await status.edit_text(
            formatter.wallet_report(wallet),
            parse_mode=ParseMode.MARKDOWN,
            disable_web_page_preview=True,
        )
    else:
        await status.edit_text(
            "❌ Wallet not found or has insufficient swap history "
            f"(minimum {config.MIN_TRADES} completed trades required)."
        )


async def cmd_track(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: `/track <solana_address>`", parse_mode=ParseMode.MARKDOWN
        )
        return

    address = context.args[0].strip()
    if len(address) < 32:
        await update.message.reply_text("❌ Invalid Solana address.")
        return

    chat_id = update.effective_chat.id
    await db.add_user_tracked_wallet(chat_id, address)
    await db.set_wallet_tracked(address, True)

    wallet = await db.get_wallet(address)
    if wallet:
        wr = wallet.get("win_rate", 0) * 100
        trades = wallet.get("total_trades", 0)
        reply = (
            f"✅ Now tracking `{formatter.shorten(address)}`\n"
            f"Win Rate: `{wr:.1f}%` | Trades: `{trades}`\n\n"
            f"You'll receive alerts for all future moves."
        )
    else:
        # Kick off background analysis so it lands in the leaderboard later
        asyncio.create_task(analyze_wallet(address))
        reply = (
            f"✅ Added `{formatter.shorten(address)}` to your watchlist.\n"
            f"Analyzing wallet in the background…"
        )

    await update.message.reply_text(reply, parse_mode=ParseMode.MARKDOWN)


async def cmd_untrack(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: `/untrack <solana_address>`", parse_mode=ParseMode.MARKDOWN
        )
        return

    address = context.args[0].strip()
    chat_id = update.effective_chat.id
    await db.remove_user_tracked_wallet(chat_id, address)
    await update.message.reply_text(
        f"🔕 Stopped tracking `{formatter.shorten(address)}`",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_mytracks(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    wallets = await db.get_user_tracked_wallets(chat_id)

    if not wallets:
        await update.message.reply_text(
            "You're not tracking any wallets yet.\nUse /track <address> to start."
        )
        return

    lines = ["👛 *Your Tracked Wallets*\n"]
    for addr in wallets:
        wallet = await db.get_wallet(addr)
        short = formatter.shorten(addr)
        if wallet:
            wr = wallet.get("win_rate", 0) * 100
            trades = wallet.get("total_trades", 0)
            lines.append(
                f"• [`{short}`](https://solscan.io/account/{addr}) "
                f"— {wr:.1f}% WR, {trades} trades"
            )
        else:
            lines.append(f"• [`{short}`](https://solscan.io/account/{addr})")

    await update.message.reply_text(
        "\n".join(lines),
        parse_mode=ParseMode.MARKDOWN,
        disable_web_page_preview=True,
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    total = await db.count_wallets()
    qualifying = await db.get_all_qualifying_wallets()
    tracked = await db.get_tracked_wallets()
    chats = await db.get_subscribed_chats()

    msg = formatter.status_message(
        total_wallets=total,
        qualifying=len(qualifying),
        tracked=len(tracked),
        chats=len(chats),
        tracker_running=_tracker is not None and _tracker.running,
        scan_interval_h=config.SCAN_INTERVAL_HOURS,
        min_win_rate=config.MIN_WIN_RATE,
        min_trades=config.MIN_TRADES,
    )
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)


# ──────────────────────────────────────────────────────────────────────────────
# Scheduled jobs
# ──────────────────────────────────────────────────────────────────────────────

async def _scheduled_scan(context: ContextTypes.DEFAULT_TYPE):
    logger.info("Running scheduled scan…")
    try:
        results = await run_discovery_scan()
        if results:
            chats = await db.get_subscribed_chats()
            msg = (
                f"🔍 *Scheduled Scan Complete*\n\n"
                f"Found *{len(results)}* new high\\-performing wallets\\.\n"
                f"Check /leaderboard for rankings\\."
            )
            for chat_id in chats:
                try:
                    await context.bot.send_message(
                        chat_id=chat_id,
                        text=msg,
                        parse_mode=ParseMode.MARKDOWN_V2,
                    )
                except Exception:
                    pass
    except Exception as exc:
        logger.exception(f"Scheduled scan error: {exc}")


# ──────────────────────────────────────────────────────────────────────────────
# Startup / shutdown lifecycle
# ──────────────────────────────────────────────────────────────────────────────

async def _on_startup(application: Application):
    global _app, _tracker

    # Register bot commands in the Telegram menu
    await application.bot.set_my_commands(
        [
            BotCommand("start", "Subscribe to live alerts"),
            BotCommand("scan", "Trigger a wallet discovery scan"),
            BotCommand("leaderboard", "Top 20 wallets by score"),
            BotCommand("wallet", "Wallet report card"),
            BotCommand("track", "Track a specific wallet"),
            BotCommand("untrack", "Stop tracking a wallet"),
            BotCommand("mytracks", "Your tracked wallets"),
            BotCommand("status", "Bot status & stats"),
            BotCommand("stop", "Unsubscribe from alerts"),
            BotCommand("help", "Help & commands"),
        ]
    )

    _app = application
    _tracker = WalletTracker(on_alert=_deliver_alert)

    # Launch the real-time tracker as a background task
    asyncio.create_task(_tracker.track_loop())
    logger.info("Tracker background task started.")


async def _on_shutdown(application: Application):
    if _tracker:
        _tracker.stop()
    from helius import helius
    from prices import price_client
    await helius.close()
    await price_client.close()
    logger.info("Shutdown complete.")


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main():
    if not config.TELEGRAM_TOKEN:
        logger.error("TELEGRAM_TOKEN is not set. Aborting.")
        sys.exit(1)
    if not config.HELIUS_API_KEY:
        logger.error("HELIUS_API_KEY is not set. Aborting.")
        sys.exit(1)

    # Initialise DB synchronously before the event loop starts
    asyncio.get_event_loop().run_until_complete(db.initialize())
    logger.info("Database ready.")

    app = (
        Application.builder()
        .token(config.TELEGRAM_TOKEN)
        .post_init(_on_startup)
        .post_shutdown(_on_shutdown)
        .build()
    )

    # Register command handlers
    for cmd, handler in [
        ("start", cmd_start),
        ("help", cmd_help),
        ("stop", cmd_stop),
        ("scan", cmd_scan),
        ("leaderboard", cmd_leaderboard),
        ("wallet", cmd_wallet),
        ("track", cmd_track),
        ("untrack", cmd_untrack),
        ("mytracks", cmd_mytracks),
        ("status", cmd_status),
    ]:
        app.add_handler(CommandHandler(cmd, handler))

    # Schedule periodic full scans (first one after 5 min)
    app.job_queue.run_repeating(
        _scheduled_scan,
        interval=config.SCAN_INTERVAL_HOURS * 3600,
        first=300,
    )

    logger.info("Bot is polling…")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
