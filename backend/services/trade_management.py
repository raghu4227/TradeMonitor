"""
Trade Management Engine — institutional-grade stop/profit/alert logic.
Handles stocks, options, and vertical spreads independently.
Based on: Chandelier Exit (LeBeau 1992), Half-Kelly (Moreira & Muir 2017),
Van Tharp R-multiples, Seykota portfolio heat management.
"""
from dataclasses import dataclass
from typing import Optional
import math
import logging

logger = logging.getLogger(__name__)


@dataclass
class ManagementDecision:
    alert_type: str          # ENTRY_CONFIRMATION | ADD_POSITION | REDUCE_POSITION |
                             # STOP_LOSS_HIT | TAKE_PROFIT | TRAILING_STOP_UPDATE |
                             # TREND_REVERSAL | EXIT_TRADE
    reasoning: str
    new_stop: Optional[float] = None
    new_target_1: Optional[float] = None
    new_target_2: Optional[float] = None
    urgency: str = "NORMAL"  # NORMAL | HIGH | CRITICAL
    action_required: bool = False


def compute_initial_stops(
    trade_type: str,
    entry_price: float,
    option_type: Optional[str],
    premium_paid: Optional[float],
    atr: Optional[float],
    position_size: float,
    spread_structure: Optional[dict] = None,
) -> dict:
    """
    Compute initial stop loss and profit targets at trade entry.
    Returns: {stop_loss, profit_target_1, profit_target_2}
    """
    if trade_type == "stock":
        # Chandelier-style: entry - 2.5 × ATR (LeBeau 1992)
        stop_atr = atr * 2.5 if atr else entry_price * 0.07
        stop_loss = round(entry_price - stop_atr, 4)
        risk_per_share = entry_price - stop_loss
        profit_target_1 = round(entry_price + risk_per_share * 1.0, 4)   # 1R
        profit_target_2 = round(entry_price + risk_per_share * 2.0, 4)   # 2R

    elif trade_type == "option":
        if not premium_paid:
            return {}
        # Stop at 40% premium loss; targets at 50% and 100% gain
        stop_loss = round(premium_paid * 0.60, 4)          # max 40% loss
        profit_target_1 = round(premium_paid * 1.50, 4)    # 50% profit
        profit_target_2 = round(premium_paid * 2.00, 4)    # 100% profit

    elif trade_type == "vertical":
        if not spread_structure:
            return {}
        net_debit = spread_structure.get("net_debit_credit", 0)
        if net_debit <= 0:
            return {}
        # Stop at 50% of net debit; take profit at 50% and 75% of max profit
        max_profit = spread_structure.get("max_profit", net_debit * 2)
        stop_loss = round(net_debit * 0.50, 4)
        profit_target_1 = round(max_profit * 0.50, 4)
        profit_target_2 = round(max_profit * 0.75, 4)

    else:
        return {}

    return {
        "stop_loss": stop_loss,
        "profit_target_1": profit_target_1,
        "profit_target_2": profit_target_2,
    }


def evaluate_stock_position(
    ticker: str,
    entry_price: float,
    current_price: float,
    high_water_mark: float,
    stop_loss: float,
    profit_target_1: float,
    profit_target_2: float,
    trailing_stop: Optional[float],
    atr: float,
    rsi: Optional[float],
    macd: Optional[float],
    macd_signal: Optional[float],
    ema20: Optional[float],
    ema50: Optional[float],
    indicators: dict,
) -> Optional[ManagementDecision]:
    """Evaluate a stock position and return a ManagementDecision if action needed."""
    decisions = []

    # 1. Hard stop loss hit
    if current_price <= stop_loss:
        return ManagementDecision(
            alert_type="STOP_LOSS_HIT",
            reasoning=(
                f"{ticker} price ${current_price:.2f} has breached stop loss at ${stop_loss:.2f}. "
                f"Position entered at ${entry_price:.2f}. "
                f"ATR-based stop ({atr:.2f} ATR) triggered. Immediate exit required to protect capital. "
                f"Risk management protocol: close full position."
            ),
            urgency="CRITICAL",
            action_required=True,
        )

    # 2. Trailing stop hit
    if trailing_stop and current_price <= trailing_stop:
        return ManagementDecision(
            alert_type="STOP_LOSS_HIT",
            reasoning=(
                f"{ticker} trailing stop triggered at ${trailing_stop:.2f}. "
                f"Price retreated from high water mark ${high_water_mark:.2f} to ${current_price:.2f}. "
                f"Chandelier-style trail (2.5× ATR from peak) preserves captured profits. Exit now."
            ),
            urgency="CRITICAL",
            action_required=True,
        )

    # 3. Update trailing stop (new high water mark)
    new_trail = round(current_price - atr * 2.5, 4)
    if current_price >= high_water_mark and new_trail > (trailing_stop or 0):
        return ManagementDecision(
            alert_type="TRAILING_STOP_UPDATE",
            reasoning=(
                f"{ticker} set new high at ${current_price:.2f}. "
                f"Chandelier trailing stop updated from ${trailing_stop:.2f if trailing_stop else 0:.2f} "
                f"to ${new_trail:.2f} (2.5× ATR=${atr:.2f} below peak). "
                f"This locks in additional profit while allowing trend continuation."
            ),
            new_stop=new_trail,
        )

    # 4. Profit target 2 reached — close runner
    if current_price >= profit_target_2:
        return ManagementDecision(
            alert_type="TAKE_PROFIT",
            reasoning=(
                f"{ticker} has reached 2R profit target ${profit_target_2:.2f}. "
                f"Van Tharp R-multiple protocol: close remaining position (final 33%) and secure gains. "
                f"Full trade return: {((current_price - entry_price) / entry_price * 100):.1f}%."
            ),
            urgency="HIGH",
            action_required=True,
        )

    # 5. Profit target 1 reached — partial exit
    if current_price >= profit_target_1:
        return ManagementDecision(
            alert_type="REDUCE_POSITION",
            reasoning=(
                f"{ticker} has reached 1R profit target ${profit_target_1:.2f}. "
                f"R-multiple protocol: reduce position by 33% to lock in gains. "
                f"Move stop to breakeven (${entry_price:.2f}) for remaining shares. "
                f"Let runner continue to 2R target at ${profit_target_2:.2f}."
            ),
            new_stop=entry_price,
            urgency="HIGH",
        )

    # 6. Trend reversal warning
    macd_bearish = macd and macd_signal and macd < macd_signal and (macd - macd_signal) < -atr * 0.3
    rsi_overbought = rsi and rsi > 75
    if macd_bearish and rsi_overbought:
        return ManagementDecision(
            alert_type="TREND_REVERSAL",
            reasoning=(
                f"{ticker} showing reversal signals: MACD crossed below signal line "
                f"({macd:.3f} < {macd_signal:.3f}) while RSI is overbought at {rsi:.1f}. "
                f"Consider reducing exposure or tightening stop to ${round(current_price - atr * 1.5, 2):.2f}."
            ),
            new_stop=round(current_price - atr * 1.5, 4),
        )

    return None


def evaluate_option_position(
    ticker: str,
    option_type: str,
    entry_premium: float,
    current_premium: float,
    stop_loss: float,
    profit_target_1: float,
    profit_target_2: float,
    days_to_expiry: Optional[int],
    rsi: Optional[float],
    indicators: dict,
) -> Optional[ManagementDecision]:
    """Evaluate an options position."""
    pnl_pct = (current_premium - entry_premium) / entry_premium * 100

    # 1. Max loss threshold
    if current_premium <= stop_loss:
        return ManagementDecision(
            alert_type="STOP_LOSS_HIT",
            reasoning=(
                f"{ticker} {option_type.upper()} option has lost {abs(pnl_pct):.1f}% of premium "
                f"(entry ${entry_premium:.2f}, current ${current_premium:.2f}). "
                f"40% premium loss threshold breached. Close position immediately. "
                f"Time decay will accelerate losses if held further."
            ),
            urgency="CRITICAL",
            action_required=True,
        )

    # 2. Time decay warning (< 14 DTE with insufficient profit)
    if days_to_expiry and days_to_expiry <= 14 and pnl_pct < 20:
        return ManagementDecision(
            alert_type="EXIT_TRADE",
            reasoning=(
                f"{ticker} {option_type.upper()} option has {days_to_expiry} days to expiry. "
                f"Position at {pnl_pct:+.1f}% P/L. Theta decay accelerates significantly inside 14 DTE. "
                f"Recommend closing to avoid full premium loss. "
                f"Greek risk: time value eroding faster than delta gains."
            ),
            urgency="HIGH",
            action_required=True,
        )

    # 3. 100% profit — close all
    if current_premium >= profit_target_2:
        return ManagementDecision(
            alert_type="TAKE_PROFIT",
            reasoning=(
                f"{ticker} {option_type.upper()} option doubled from ${entry_premium:.2f} "
                f"to ${current_premium:.2f} (+{pnl_pct:.1f}%). "
                f"100% profit target reached. Close full position. "
                f"Holding beyond target introduces mean-reversion risk and accelerating time decay."
            ),
            urgency="HIGH",
            action_required=True,
        )

    # 4. 50% profit — partial exit
    if current_premium >= profit_target_1:
        return ManagementDecision(
            alert_type="REDUCE_POSITION",
            reasoning=(
                f"{ticker} {option_type.upper()} option at +{pnl_pct:.1f}% P/L. "
                f"50% profit threshold reached (${current_premium:.2f} vs entry ${entry_premium:.2f}). "
                f"Close 50% of contracts to secure gains. "
                f"Historical decay patterns suggest increased reversal risk at this level."
            ),
            urgency="HIGH",
        )

    return None


def evaluate_vertical_spread(
    ticker: str,
    strategy_type: str,
    net_debit: float,
    current_value: float,
    max_profit: float,
    stop_loss: float,
    profit_target_1: float,
    profit_target_2: float,
    days_to_expiry: Optional[int],
    indicators: dict,
) -> Optional[ManagementDecision]:
    """Evaluate a vertical spread position."""
    profit_pct = (current_value - net_debit) / net_debit * 100
    max_profit_captured = (current_value / max_profit * 100) if max_profit > 0 else 0

    # 1. Max loss hit
    if current_value <= stop_loss:
        return ManagementDecision(
            alert_type="STOP_LOSS_HIT",
            reasoning=(
                f"{ticker} {strategy_type} spread has lost 50% of net debit "
                f"(entry ${net_debit:.2f}, current ${current_value:.2f}). "
                f"Spread max loss threshold reached. Close immediately. "
                f"Defined-risk structure preserved remaining capital."
            ),
            urgency="CRITICAL",
            action_required=True,
        )

    # 2. Early expiration exit (< 21 DTE)
    if days_to_expiry and days_to_expiry <= 21 and max_profit_captured < 30:
        return ManagementDecision(
            alert_type="EXIT_TRADE",
            reasoning=(
                f"{ticker} {strategy_type} spread has {days_to_expiry} DTE with only "
                f"{max_profit_captured:.0f}% of max profit captured. "
                f"Avoid holding spreads into expiration — gamma risk increases dramatically. "
                f"Close to avoid assignment risk and manage final theta decay."
            ),
            urgency="HIGH",
            action_required=True,
        )

    # 3. 75% max profit — close spread
    if max_profit_captured >= 75:
        return ManagementDecision(
            alert_type="TAKE_PROFIT",
            reasoning=(
                f"{ticker} {strategy_type} spread has captured {max_profit_captured:.0f}% of max profit "
                f"(${current_value:.2f} vs max ${max_profit:.2f}). "
                f"75% max profit rule: close spread early. Remaining 25% potential return "
                f"does not justify the risk of holding to expiration."
            ),
            urgency="HIGH",
            action_required=True,
        )

    # 4. 50% max profit — consider closing
    if max_profit_captured >= 50:
        return ManagementDecision(
            alert_type="REDUCE_POSITION",
            reasoning=(
                f"{ticker} {strategy_type} spread at {max_profit_captured:.0f}% of max profit. "
                f"50% profit milestone reached. Consider closing half or full position. "
                f"Risk/reward favors early exit: limited remaining upside vs full risk still open."
            ),
        )

    return None


def compute_portfolio_heat(positions: list[dict], total_capital: float = 10000.0) -> float:
    """
    Compute total portfolio heat (% of capital at risk across all open trades).
    Seykota & Druz framework: heat = sum of (risk per trade / capital).
    """
    total_risk = 0.0
    for pos in positions:
        if pos.get("stop_loss") and pos.get("entry_price") and pos.get("shares"):
            risk = (pos["entry_price"] - pos["stop_loss"]) * pos["shares"]
            total_risk += max(0, risk)
        elif pos.get("position_size"):
            total_risk += pos["position_size"] * 0.40  # assume 40% max risk for options
    return total_risk / total_capital if total_capital > 0 else 0.0
