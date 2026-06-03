from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from config import settings


engine = create_async_engine(settings.DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migration: add open_direction column if not present (existing DBs)
        for table in ("mypositions", "trade_history"):
            result = await conn.execute(text(f"PRAGMA table_info({table})"))
            cols = {row[1] for row in result.fetchall()}
            if "open_direction" not in cols:
                await conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN open_direction VARCHAR(10) DEFAULT 'BTO'"
                ))
