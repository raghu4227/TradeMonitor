from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import Position, TradeHistory, TradeAlert
from schemas import DashboardSummary, AlertOut
from services.market_data import is_market_open

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(db: AsyncSession = Depends(get_db)):
    # Open trades count + unrealized P/L
    open_result = await db.execute(
        select(
            func.count(Position.id).label("count"),
            func.coalesce(func.sum(Position.unrealized_pnl), 0).label("total_pnl"),
        ).where(Position.status == "OPEN")
    )
    open_row = open_result.first()

    # Closed trades count + realized P/L
    closed_result = await db.execute(
        select(
            func.count(TradeHistory.id).label("count"),
            func.coalesce(func.sum(TradeHistory.realized_pnl), 0).label("total_pnl"),
        )
    )
    closed_row = closed_result.first()

    # Portfolio heat (rough: total position size at risk)
    heat_result = await db.execute(
        select(func.coalesce(func.sum(Position.position_size), 0)).where(Position.status == "OPEN")
    )
    total_exposure = float(heat_result.scalar() or 0)
    heat_pct = min(total_exposure / 10000.0, 1.0)  # normalize to 10k capital

    # Recent alerts
    alerts_result = await db.execute(
        select(TradeAlert).order_by(TradeAlert.timestamp.desc()).limit(8)
    )
    recent_alerts = alerts_result.scalars().all()

    return DashboardSummary(
        total_open_trades=open_row.count or 0,
        total_closed_trades=closed_row.count or 0,
        total_unrealized_pnl=float(open_row.total_pnl or 0),
        total_realized_pnl=float(closed_row.total_pnl or 0),
        portfolio_heat_pct=round(heat_pct, 4),
        recent_alerts=[AlertOut.model_validate(a) for a in recent_alerts],
        market_is_open=is_market_open(),
    )
