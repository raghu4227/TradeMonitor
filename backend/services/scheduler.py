"""
Background scheduler — runs monitoring cycle every 60 seconds during market hours.
Uses APScheduler with asyncio support.
"""
import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from database import AsyncSessionLocal
from services.alert_engine import run_monitoring_cycle

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def _monitoring_job():
    async with AsyncSessionLocal() as session:
        try:
            await run_monitoring_cycle(session)
        except Exception as e:
            logger.error(f"Monitoring cycle error: {e}", exc_info=True)


def start_scheduler():
    scheduler.add_job(
        _monitoring_job,
        trigger=IntervalTrigger(seconds=60),
        id="trade_monitor",
        name="Trade Monitoring Cycle",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info("Scheduler started — monitoring every 60 seconds")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
