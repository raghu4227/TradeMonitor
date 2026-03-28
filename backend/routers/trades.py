from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Optional
from datetime import datetime

from database import get_db
from models import Position, TradeAlert, TradeHistory
from schemas import TradeCreate, TradeUpdate, TradeClose, PositionOut
from services.market_data import fetch_indicators
from services.trade_management import compute_initial_stops

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("/", response_model=list[PositionOut])
async def list_open_trades(db: AsyncSession = Depends(get_db)):
    """Return all currently OPEN positions."""
    result = await db.execute(
        select(Position).where(Position.status == "OPEN").order_by(Position.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
async def create_trade(trade: TradeCreate, db: AsyncSession = Depends(get_db)):
    """Enter a new trade (stock, option, or vertical spread)."""
    # Validate trade-type-specific fields
    if trade.trade_type == "stock" and not trade.shares:
        raise HTTPException(400, "shares required for stock trades")
    if trade.trade_type == "option":
        if not all([trade.option_type, trade.strike_price, trade.expiration_date, trade.premium_paid, trade.contracts]):
            raise HTTPException(400, "option_type, strike_price, expiration_date, premium_paid, contracts required for options")
    if trade.trade_type == "vertical":
        if not all([trade.spread_structure, trade.strategy_type, trade.contracts]):
            raise HTTPException(400, "spread_structure, strategy_type, contracts required for vertical spreads")

    # Fetch live indicators for initial stop computation
    indicators = await fetch_indicators(trade.ticker)
    atr = indicators.get("atr") if indicators else None

    spread_dict = trade.spread_structure.model_dump() if trade.spread_structure else None
    initial_stops = compute_initial_stops(
        trade_type=trade.trade_type,
        entry_price=trade.entry_price,
        option_type=trade.option_type,
        premium_paid=trade.premium_paid,
        atr=atr,
        position_size=trade.position_size,
        spread_structure=spread_dict,
    )

    pos = Position(
        ticker=trade.ticker,
        trade_type=trade.trade_type,
        status="OPEN",
        entry_date=trade.entry_date,
        entry_price=trade.entry_price,
        current_price=indicators.get("price") if indicators else trade.entry_price,
        position_size=trade.position_size,
        shares=trade.shares,
        option_type=trade.option_type,
        strike_price=trade.strike_price,
        expiration_date=trade.expiration_date,
        premium_paid=trade.premium_paid,
        contracts=trade.contracts,
        strategy_type=trade.strategy_type,
        spread_structure=spread_dict,
        net_debit_credit=trade.net_debit_credit,
        stop_loss=initial_stops.get("stop_loss"),
        profit_target_1=initial_stops.get("profit_target_1"),
        profit_target_2=initial_stops.get("profit_target_2"),
        high_water_mark=trade.entry_price,
        atr=atr,
        trade_reason=trade.trade_reason,
    )
    db.add(pos)
    await db.commit()
    await db.refresh(pos)

    # Log entry confirmation alert
    alert = TradeAlert(
        trade_id=pos.id,
        ticker=pos.ticker,
        trade_type=pos.trade_type,
        alert_type="ENTRY_CONFIRMATION",
        current_price=float(pos.current_price or pos.entry_price),
        entry_price=float(pos.entry_price),
        position_size=float(pos.position_size),
        stop_level=float(pos.stop_loss) if pos.stop_loss else None,
        profit_target_1=float(pos.profit_target_1) if pos.profit_target_1 else None,
        profit_target_2=float(pos.profit_target_2) if pos.profit_target_2 else None,
        atr=float(pos.atr) if pos.atr else None,
        indicators={k: v for k, v in (indicators or {}).items() if k != "price"},
        market_context=f"Trend: {(indicators or {}).get('trend', 'N/A')}, ATR: {atr:.4f if atr else 'N/A'}",
        reasoning=(
            f"New {pos.trade_type} trade entered: {pos.ticker} at ${float(pos.entry_price):.2f}. "
            f"Initial stop set at ${float(pos.stop_loss):.2f if pos.stop_loss else 0:.2f} "
            f"(ATR-based). Targets: ${float(pos.profit_target_1):.2f if pos.profit_target_1 else 0:.2f} / "
            f"${float(pos.profit_target_2):.2f if pos.profit_target_2 else 0:.2f}. "
            f"Trade thesis recorded. Position now under active monitoring."
        ),
    )
    db.add(alert)
    await db.commit()

    return pos


@router.get("/{trade_id}", response_model=PositionOut)
async def get_trade(trade_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Position).where(Position.id == trade_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(404, "Trade not found")
    return pos


@router.patch("/{trade_id}", response_model=PositionOut)
async def update_trade(trade_id: int, updates: TradeUpdate, db: AsyncSession = Depends(get_db)):
    """Update trade reason, stop loss, or profit targets."""
    result = await db.execute(select(Position).where(Position.id == trade_id, Position.status == "OPEN"))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(404, "Open trade not found")

    update_data = updates.model_dump(exclude_none=True)
    if update_data:
        await db.execute(update(Position).where(Position.id == trade_id).values(**update_data))
        await db.commit()
        await db.refresh(pos)
    return pos


@router.post("/{trade_id}/close", response_model=PositionOut)
async def close_trade(trade_id: int, close: TradeClose, db: AsyncSession = Depends(get_db)):
    """Manually close a trade and move it to history."""
    result = await db.execute(select(Position).where(Position.id == trade_id, Position.status == "OPEN"))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(404, "Open trade not found")

    from services.alert_engine import _close_position
    await _close_position(db, pos, close.exit_price, close.exit_reason)
    await db.refresh(pos)
    return pos


@router.get("/{trade_id}/alerts")
async def get_trade_alerts(trade_id: int, db: AsyncSession = Depends(get_db)):
    """Return all alerts for a specific trade."""
    result = await db.execute(
        select(TradeAlert)
        .where(TradeAlert.trade_id == trade_id)
        .order_by(TradeAlert.timestamp.desc())
    )
    return result.scalars().all()
