from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import date

from database import get_db
from models import TradeHistory
from schemas import TradeHistoryOut

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("/", response_model=list[TradeHistoryOut])
async def list_history(
    ticker: Optional[str] = Query(None),
    trade_type: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """Return closed trades with optional filters."""
    q = select(TradeHistory).order_by(TradeHistory.exit_date.desc())

    if ticker:
        q = q.where(TradeHistory.ticker == ticker.upper())
    if trade_type:
        q = q.where(TradeHistory.trade_type == trade_type.lower())
    if from_date:
        q = q.where(TradeHistory.exit_date >= from_date)
    if to_date:
        q = q.where(TradeHistory.exit_date <= to_date)

    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/summary")
async def history_summary(db: AsyncSession = Depends(get_db)):
    """Return P/L summary stats across all closed trades."""
    result = await db.execute(
        select(
            func.count(TradeHistory.id).label("total_trades"),
            func.sum(TradeHistory.realized_pnl).label("total_pnl"),
            func.avg(TradeHistory.pnl_percent).label("avg_pnl_pct"),
            func.sum(
                func.cast(TradeHistory.realized_pnl > 0, "int")
            ).label("winners"),
        )
    )
    row = result.first()
    total = row.total_trades or 0
    winners = row.winners or 0
    return {
        "total_trades": total,
        "total_realized_pnl": float(row.total_pnl or 0),
        "avg_pnl_pct": float(row.avg_pnl_pct or 0),
        "win_rate": (winners / total * 100) if total > 0 else 0,
        "winners": winners,
        "losers": total - winners,
    }


@router.get("/{history_id}", response_model=TradeHistoryOut)
async def get_history_trade(history_id: int, db: AsyncSession = Depends(get_db)):
    from fastapi import HTTPException
    result = await db.execute(select(TradeHistory).where(TradeHistory.id == history_id))
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(404, "Trade history record not found")
    return trade
