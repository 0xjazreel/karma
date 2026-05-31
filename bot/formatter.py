from typing import Dict, List


def shorten(address: str) -> str:
    return f"{address[:6]}…{address[-4:]}" if len(address) > 10 else address


def fmt_sol(amount: float) -> str:
    return f"{amount:.4f} SOL" if amount >= 0.001 else f"{amount:.6f} SOL"


def fmt_pct(value: float) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.1f}%"


def fmt_hold(seconds: float) -> str:
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s//60}m {s%60}s"
    if s < 86400:
        return f"{s//3600}h {(s%3600)//60}m"
    return f"{s//86400}d {(s%86400)//3600}h"


def fmt_price(price: float) -> str:
    if price <= 0:
        return "N/A"
    if price < 0.000001:
        return f"${price:.10f}"
    if price < 0.001:
        return f"${price:.8f}"
    if price < 1:
        return f"${price:.6f}"
    return f"${price:,.4f}"


# ──────────────────────────────────────────────────────────────────────────────
# Message templates
# ──────────────────────────────────────────────────────────────────────────────

def alert_message(alert: Dict) -> str:
    action = alert["action"]
    emoji = "🟢" if action == "BUY" else "🔴"
    label = "NEW BUY DETECTED" if action == "BUY" else "SELL DETECTED"

    wallet = alert["wallet"]
    sym = alert.get("token_symbol", "?")
    mint = alert.get("token_mint", "")
    sol_amt = alert.get("sol_amount", 0.0)
    price = alert.get("entry_price_usd", 0.0)
    wr = alert.get("win_rate", 0) * 100
    roi = alert.get("avg_roi", 0)
    trades = alert.get("total_trades", 0)
    score = alert.get("score", 0)
    sig = alert.get("signature", "")

    lines = [
        f"{emoji} *{label}*\n",
        f"👛 Wallet: `{shorten(wallet)}`",
        f"🪙 Token: `${sym}`",
        f"📋 CA: `{mint}`",
        f"💰 Amount: `{fmt_sol(sol_amt)}`",
    ]
    if price > 0:
        lines.append(f"💵 Entry Price: `{fmt_price(price)}`")

    lines += [
        "",
        "*Wallet Stats*",
        f"🎯 Win Rate: `{wr:.1f}%`",
        f"📈 Avg ROI: `{fmt_pct(roi)}`",
        f"🔢 Total Trades: `{trades}`",
        f"⭐ Score: `{score:.0f}/100`",
    ]

    if sig:
        lines.append(f"\n🔍 [View TX](https://solscan.io/tx/{sig})")
    lines.append(f"[View Wallet](https://solscan.io/account/{wallet})")

    return "\n".join(lines)


def wallet_report(wallet: Dict) -> str:
    address = wallet["address"]
    wr = wallet.get("win_rate", 0) * 100
    roi = wallet.get("avg_roi", 0)
    pnl = wallet.get("total_pnl", 0)
    trades = wallet.get("total_trades", 0)
    hold = wallet.get("avg_hold_time", 0)
    best = wallet.get("best_trade", 0)
    worst = wallet.get("worst_trade", 0)
    score = wallet.get("score", 0)
    flagged = wallet.get("is_flagged", 0)

    wins = round(trades * wr / 100)
    losses = trades - wins
    tier = (
        "🏆 Elite"
        if score >= 70
        else "🥇 High"
        if score >= 50
        else "🥈 Mid"
        if score >= 30
        else "🥉 Low"
    )
    flag_note = "\n⚠️ _Flagged for possible wash trading_" if flagged else ""

    lines = [
        "📊 *Wallet Report Card*\n",
        f"👛 `{address}`",
        f"[View on Solscan](https://solscan.io/account/{address})\n",
        "*Performance*",
        f"🎯 Win Rate: `{wr:.1f}%` ({wins}W / {losses}L)",
        f"📈 Avg ROI: `{fmt_pct(roi)}`",
        f"💰 Total PnL: `{fmt_sol(pnl)}`",
        f"🔢 Total Trades: `{trades}`\n",
        "*Trade Details*",
        f"⏱ Avg Hold: `{fmt_hold(hold)}`",
        f"🚀 Best Trade: `{fmt_pct(best)}`",
        f"💔 Worst Trade: `{fmt_pct(worst)}`\n",
        f"⭐ Score: {tier} (`{score:.1f}/100`){flag_note}",
    ]
    return "\n".join(lines)


def leaderboard_message(wallets: List[Dict]) -> str:
    if not wallets:
        return (
            "❌ No high-performing wallets found yet.\n"
            "Use /scan to discover some!"
        )

    medals = ["🥇", "🥈", "🥉"]
    lines = ["🏆 *Leaderboard — Top Wallets*\n"]

    for i, w in enumerate(wallets[:20]):
        rank = medals[i] if i < 3 else f"`#{i+1}`"
        addr = w["address"]
        wr = w.get("win_rate", 0) * 100
        roi = w.get("avg_roi", 0)
        trades = w.get("total_trades", 0)
        score = w.get("score", 0)

        lines.append(
            f"{rank} [`{shorten(addr)}`](https://solscan.io/account/{addr})\n"
            f"   🎯 {wr:.1f}% | 📈 {fmt_pct(roi)} | 🔢 {trades} trades | ⭐ {score:.0f}"
        )

    return "\n".join(lines)


def help_message() -> str:
    return (
        "🤖 *Solana Wallet Scanner Bot*\n\n"
        "Scans Solana DEXes to find wallets with the highest win rates on memecoin trades, "
        "then tracks them in real-time and alerts you on every move.\n\n"
        "*Commands*\n"
        "/start — Subscribe to live alerts\n"
        "/scan — Trigger a manual wallet discovery scan\n"
        "/leaderboard — Top 20 wallets ranked by score\n"
        "/wallet `<address>` — Full report card for any wallet\n"
        "/track `<address>` — Track a wallet and receive its alerts\n"
        "/untrack `<address>` — Stop tracking a wallet\n"
        "/mytracks — See your personally tracked wallets\n"
        "/status — Bot status and stats\n"
        "/stop — Unsubscribe from all alerts\n"
        "/help — Show this message\n\n"
        "*Scoring*\n"
        "Score = win\\-rate × 50% + avg\\-ROI factor × 30% + trade\\-depth × 20%\n\n"
        "*DEXes monitored*\n"
        "Raydium · Pump.fun · Jupiter · Orca"
    )


def status_message(
    total_wallets: int,
    qualifying: int,
    tracked: int,
    chats: int,
    tracker_running: bool,
    scan_interval_h: int,
    min_win_rate: float,
    min_trades: int,
) -> str:
    tracker_status = "✅ Running" if tracker_running else "❌ Stopped"
    return (
        "🤖 *Bot Status*\n\n"
        f"📦 Wallets in DB: `{total_wallets}`\n"
        f"🏆 Qualifying (≥{min_win_rate*100:.0f}% WR): `{qualifying}`\n"
        f"👁 Actively tracked: `{tracked}`\n"
        f"👥 Subscribed chats: `{chats}`\n"
        f"🔄 Tracker: {tracker_status}\n\n"
        f"⚙️ *Config*\n"
        f"Scan interval: every `{scan_interval_h}h`\n"
        f"Min win rate: `{min_win_rate*100:.0f}%`\n"
        f"Min trades: `{min_trades}`"
    )
