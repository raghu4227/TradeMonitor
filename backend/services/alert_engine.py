"""
Alert Engine — drives the 60-second monitoring loop.
For each open position, fetches live data and applies trade management logic,
then persists alerts and sends notifications.
"""
import logging
from datetime import datetime, date
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from models import Position, TradeAlert, TradeHistory
from services.market_data import fetch_indicators, is_market_open
from services.trade_management import (
    evaluate_stock_position,
    evaluate_option_position,
    evaluate_vertical_spread,
    compute_initial_stops,
    ManagementDecision,
)
from services.notifications import notify_alert

logger = logging.getLogger(__name__)

# Deduplication: track last alert type per trade to avoid spam
_last_alert: dict[int, tuple[str, datetime]] = {}
ALERT_COOLDOWN_SECONDS = {
    "TRAILING_STOP_UPDATE": 3600,    # max once/hour
    "TREND_REVERSAL": 1800,
    "REDUCE_POSITION": 900,
    "ADD_POSITION": 900,
    "ENTRY_CONFIRMATION": 86400,
    "STOP_LOSS_HIT": 0,              # always fire
    "TAKE_PROFIT": 0,
    "EXIT_TRADE": 0,
}


def _should_fire(trade_id: int, alert_type: str) -> bool:
    key = (trade_id, alert_type)
    last = _last_alert.get(key)
    if not last:
        return True
    cooldown = ALERT_COOLDOWN_SECONDS.get(alert_type, 600)
    elapsed = (datetime.utcnow() - last).total_seconds()
    return elapsed >= cooldown


def _record_fired(trade_id: int, alert_type: str):
    _last_alert[(trade_id, alert_type)] = datetime.utcnow()


async def _close_position(session: AsyncSession, position: Position, exit_price: float, exit_reason: str):
    """Archive a position to trade_history and mark it CLOSED."""
    now = datetime.utcnow()
    shares = position.shares or 1
    if position.trade_type == "stock":
        pnl = (exit_price - float(position.entry_price)) * shares
        pnl_pct = (exit_price - float(position.entry_price)) / float(position.entry_price) * 100
    elif position.trade_type == "option":
        contracts = position.contracts or 1
        entry_premium = float(position.premium_paid or 0)
        direction = getattr(position, "open_direction", "BTO") or "BTO"
        if direction == "STO":
            # Sold to open: profit = received premium minus buy-back cost
            pnl = (entry_premium - exit_price) * contracts * 100
            pnl_pct = (entry_premium - exit_price) / max(entry_premium, 0.01) * 100
        else:
            # Bought to open: profit = sell price minus paid premium
            pnl = (exit_price - entry_premium) * contracts * 100
            pnl_pct = (exit_price - entry_premium) / max(entry_premium, 0.01) * 100
    else:
        net_debit = float(position.net_debit_credit or 0)
        pnl = (exit_price - net_debit) * (position.contracts or 1) * 100
        pnl_pct = (exit_price - net_debit) / max(net_debit, 0.01) * 100

    # Build alert summary list
    alerts_result = await session.execute(
        select(TradeAlert).where(TradeAlert.trade_id == position.id)
    )
    alerts = alerts_result.scalars().all()
    alert_summaries = [
        {"type": a.alert_type, "time": str(a.timestamp), "reasoning": a.reasoning[:100]}
        for a in alerts
    ]

    history = TradeHistory(
        original_trade_id=position.id,
        ticker=position.ticker,
        trade_type=position.trade_type,
        entry_date=position.entry_date,
        exit_date=now,
        entry_price=position.entry_price,
        exit_price=exit_price,
        position_size=position.position_size,
        shares=position.shares,
        contracts=position.contracts,
        option_type=position.option_type,
        open_direction=getattr(position, "open_direction", "BTO"),
        strike_price=position.strike_price,
        expiration_date=position.expiration_date,
        premium_paid=position.premium_paid,
        strategy_type=position.strategy_type,
        realized_pnl=round(pnl, 2),
        pnl_percent=round(pnl_pct, 4),
        trade_snapshot={
            "entry_price": float(position.entry_price),
            "exit_price": exit_price,
            "stop_loss": float(position.stop_loss) if position.stop_loss else None,
            "high_water_mark": float(position.high_water_mark) if position.high_water_mark else None,
            "position_size": float(position.position_size),
            "atr": float(position.atr) if position.atr else None,
        },
        alerts_generated=alert_summaries,
        exit_reason=exit_reason,
        trade_reason=position.trade_reason,
    )
    session.add(history)

    await session.execute(
        update(Position).where(Position.id == position.id).values(
            status="CLOSED",
            closed_at=now,
            current_price=exit_price,
        )
    )
    await session.commit()
    logger.info(f"Closed position {position.ticker} #{position.id} — P/L: ${pnl:.2f} ({pnl_pct:.1f}%)")


async def process_position(session: AsyncSession, position: Position):
    """Run full trade management analysis on a single open position."""
    indicators = await fetch_indicators(position.ticker)
    if not indicators or not indicators.get("price"):
        logger.warning(f"No price data for {position.ticker} — skipping")
        return

    current_price = indicators["price"]
    atr = indicators.get("atr") or float(position.atr or (current_price * 0.02))

    # Update current price and high water mark
    hwm = float(position.high_water_mark or position.entry_price)
    new_hwm = max(hwm, current_price)

    # Compute unrealized P/L
    if position.trade_type == "stock":
        shares = position.shares or int(float(position.position_size) / float(position.entry_price))
        pnl = (current_price - float(position.entry_price)) * shares
        pnl_pct = (current_price - float(position.entry_price)) / float(position.entry_price) * 100
    elif position.trade_type == "option":
        # No real-time option price feed — cannot compute unrealized P&L from stock price.
        # Keep at 0 to avoid showing meaningless values.
        pnl = 0.0
        pnl_pct = 0.0
    else:
        # No real-time spread price feed — cannot compute unrealized P&L from stock price.
        pnl = 0.0
        pnl_pct = 0.0

    # Initialize stops if not set
    if not position.stop_loss:
        initial = compute_initial_stops(
            trade_type=position.trade_type,
            entry_price=float(position.entry_price),
            option_type=position.option_type,
            premium_paid=float(position.premium_paid) if position.premium_paid else None,
            atr=atr,
            position_size=float(position.position_size),
            spread_structure=position.spread_structure,
        )
        if initial:
            await session.execute(
                update(Position).where(Position.id == position.id).values(**initial)
            )
            await session.commit()
            # Re-read position
            result = await session.execute(select(Position).where(Position.id == position.id))
            position = result.scalar_one()

    # Evaluate position based on type
    decision: Optional[ManagementDecision] = None
    days_to_expiry = None
    if position.expiration_date:
        days_to_expiry = (position.expiration_date - date.today()).days

    if position.trade_type == "stock":
        decision = evaluate_stock_position(
            ticker=position.ticker,
            entry_price=float(position.entry_price),
            current_price=current_price,
            high_water_mark=new_hwm,
            stop_loss=float(position.stop_loss or 0),
            profit_target_1=float(position.profit_target_1 or current_price * 10),
            profit_target_2=float(position.profit_target_2 or current_price * 10),
            trailing_stop=float(position.trailing_stop) if position.trailing_stop else None,
            atr=atr,
            rsi=indicators.get("rsi"),
            macd=indicators.get("macd"),
            macd_signal=indicators.get("macd_signal"),
            ema20=indicators.get("ema20"),
            ema50=indicators.get("ema50"),
            indicators=indicators,
        )
    elif position.trade_type == "option":
        # No real-time option price feed — pass entry_premium as current_premium so
        # premium-based stop/profit comparisons don't fire using the stock price.
        # Only DTE-based exits (theta decay warnings) remain active.
        entry_premium = float(position.premium_paid or position.entry_price)
        decision = evaluate_option_position(
            ticker=position.ticker,
            option_type=position.option_type or "call",
            entry_premium=entry_premium,
            current_premium=entry_premium,
            stop_loss=float(position.stop_loss or 0),
            profit_target_1=float(position.profit_target_1 or entry_premium * 10),
            profit_target_2=float(position.profit_target_2 or entry_premium * 10),
            days_to_expiry=days_to_expiry,
            rsi=indicators.get("rsi"),
            indicators=indicators,
        )
    elif position.trade_type == "vertical":
        net_debit = float(position.net_debit_credit or position.entry_price)
        spread = position.spread_structure or {}
        max_profit = spread.get("max_profit", net_debit * 2)
        # No real-time spread price feed — pass net_debit as current_value so
        # value-based stop/profit checks don't fire using the underlying stock price.
        # Only DTE-based exits remain active.
        decision = evaluate_vertical_spread(
            ticker=position.ticker,
            strategy_type=position.strategy_type or "vertical",
            net_debit=net_debit,
            current_value=net_debit,
            max_profit=max_profit,
            stop_loss=float(position.stop_loss or 0),
            profit_target_1=float(position.profit_target_1 or net_debit * 1.5),
            profit_target_2=float(position.profit_target_2 or net_debit * 2),
            days_to_expiry=days_to_expiry,
            indicators=indicators,
        )

    # Update position state
    update_vals = {
        "current_price": current_price,
        "high_water_mark": new_hwm,
        "atr": atr,
        "unrealized_pnl": round(pnl, 2),
        "unrealized_pnl_pct": round(pnl_pct, 4),
    }
    if decision and decision.new_stop:
        update_vals["trailing_stop"] = decision.new_stop
        if decision.alert_type == "REDUCE_POSITION":
            update_vals["stop_loss"] = decision.new_stop

    await session.execute(update(Position).where(Position.id == position.id).values(**update_vals))
    await session.commit()

    # Fire alert if warranted
    if decision and _should_fire(position.id, decision.alert_type):
        alert = TradeAlert(
            trade_id=position.id,
            ticker=position.ticker,
            trade_type=position.trade_type,
            alert_type=decision.alert_type,
            current_price=current_price,
            entry_price=float(position.entry_price),
            position_size=float(position.position_size),
            stop_level=float(position.stop_loss) if position.stop_loss else None,
            profit_target_1=float(position.profit_target_1) if position.profit_target_1 else None,
            profit_target_2=float(position.profit_target_2) if position.profit_target_2 else None,
            trailing_stop=decision.new_stop or (float(position.trailing_stop) if position.trailing_stop else None),
            atr=atr,
            indicators={k: v for k, v in indicators.items() if k != "price"},
            market_context=f"Trend: {indicators.get('trend', 'N/A')}, RSI: {indicators.get('rsi', 'N/A')}, ATR: {atr:.4f}",
            reasoning=decision.reasoning,
        )
        session.add(alert)
        await session.commit()
        await session.refresh(alert)
        _record_fired(position.id, decision.alert_type)

        # Send notifications
        alert_dict = {
            "trade_id": position.id,
            "ticker": position.ticker,
            "trade_type": position.trade_type,
            "alert_type": decision.alert_type,
            "current_price": current_price,
            "entry_price": float(position.entry_price),
            "stop_level": float(position.stop_loss) if position.stop_loss else None,
            "profit_target_1": float(position.profit_target_1) if position.profit_target_1 else None,
            "profit_target_2": float(position.profit_target_2) if position.profit_target_2 else None,
            "reasoning": decision.reasoning,
            "timestamp": str(datetime.utcnow()),
        }
        notify_result = await notify_alert(alert_dict)
        await session.execute(
            update(TradeAlert).where(TradeAlert.id == alert.id).values(
                email_sent=notify_result["email"],
                sms_sent=notify_result["sms"],
                notification_sent=any(notify_result.values()),
            )
        )
        await session.commit()
        logger.info(f"Alert fired: {decision.alert_type} for {position.ticker} #{position.id}")

        # Auto-close if action required (stop hit, take profit, exit)
        if decision.action_required:
            await _close_position(session, position, current_price, decision.alert_type)


async def run_monitoring_cycle(session: AsyncSession):
    """Main monitoring loop — process all open positions."""
    if not is_market_open():
        logger.debug("Market closed — skipping monitoring cycle")
        return

    result = await session.execute(select(Position).where(Position.status == "OPEN"))
    positions = result.scalars().all()

    if not positions:
        logger.debug("No open positions to monitor")
        return

    logger.info(f"Monitoring {len(positions)} open position(s)")
    for pos in positions:
        try:
            await process_position(session, pos)
        except Exception as e:
            logger.error(f"Error processing {pos.ticker} #{pos.id}: {e}", exc_info=True)
