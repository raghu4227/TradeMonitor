from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from database import get_db
from models import TradeAlert
from schemas import AlertOut

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/", response_model=list[AlertOut])
async def list_alerts(
    ticker: Optional[str] = Query(None),
    alert_type: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(TradeAlert).order_by(TradeAlert.timestamp.desc())
    if ticker:
        q = q.where(TradeAlert.ticker == ticker.upper())
    if alert_type:
        q = q.where(TradeAlert.alert_type == alert_type)
    if unread_only:
        q = q.where(TradeAlert.notification_sent == False)
    q = q.limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/recent", response_model=list[AlertOut])
async def recent_alerts(limit: int = Query(10, le=50), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TradeAlert).order_by(TradeAlert.timestamp.desc()).limit(limit)
    )
    return result.scalars().all()
