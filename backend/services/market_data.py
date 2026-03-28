"""
Market data service — fetches live prices and technical indicators via yfinance.
Provides ATR, EMA, RSI, MACD for trade management decisions.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from typing import Optional
import logging

import numpy as np
import pandas as pd
import yfinance as yf
import pytz

from config import settings

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=4)


def _is_market_open() -> bool:
    tz = pytz.timezone(settings.TIMEZONE)
    now = datetime.now(tz)
    if now.weekday() >= 5:
        return False
    open_h, open_m = map(int, settings.MARKET_OPEN.split(":"))
    close_h, close_m = map(int, settings.MARKET_CLOSE.split(":"))
    market_open = now.replace(hour=open_h, minute=open_m, second=0, microsecond=0)
    market_close = now.replace(hour=close_h, minute=close_m, second=0, microsecond=0)
    return market_open <= now <= market_close


def is_market_open() -> bool:
    return _is_market_open()


def _fetch_price_sync(ticker: str) -> Optional[float]:
    try:
        t = yf.Ticker(ticker)
        info = t.fast_info
        price = getattr(info, "last_price", None) or getattr(info, "regularMarketPrice", None)
        if price:
            return float(price)
        hist = t.history(period="1d", interval="1m")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
    except Exception as e:
        logger.warning(f"Failed to fetch price for {ticker}: {e}")
    return None


def _fetch_indicators_sync(ticker: str, period: int = 14) -> dict:
    """Fetch OHLCV + compute ATR, EMA20/50/200, RSI, MACD."""
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period="6mo", interval="1d")
        if hist.empty or len(hist) < 30:
            return {}

        close = hist["Close"]
        high = hist["High"]
        low = hist["Low"]

        # ATR (True Range)
        tr = pd.concat([
            high - low,
            (high - close.shift(1)).abs(),
            (low - close.shift(1)).abs()
        ], axis=1).max(axis=1)
        atr = tr.rolling(period).mean().iloc[-1]

        # EMAs
        ema20 = close.ewm(span=20, adjust=False).mean().iloc[-1]
        ema50 = close.ewm(span=50, adjust=False).mean().iloc[-1]
        ema200 = close.ewm(span=200, adjust=False).mean().iloc[-1] if len(close) >= 200 else None

        # RSI
        delta = close.diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = (-delta.clip(upper=0)).rolling(14).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi = (100 - (100 / (1 + rs))).iloc[-1]

        # MACD (12/26/9)
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd_line = (ema12 - ema26).iloc[-1]
        signal_line = (ema12 - ema26).ewm(span=9, adjust=False).mean().iloc[-1]

        current_price = float(close.iloc[-1])
        prev_close = float(close.iloc[-2]) if len(close) > 1 else current_price

        # Trend context
        trend = "BULLISH" if current_price > float(ema50) else "BEARISH"
        if ema200 and current_price > float(ema200):
            trend = "STRONG_BULL" if trend == "BULLISH" else "MIXED"

        return {
            "price": current_price,
            "prev_close": prev_close,
            "atr": round(float(atr), 4) if not np.isnan(atr) else None,
            "ema20": round(float(ema20), 4),
            "ema50": round(float(ema50), 4),
            "ema200": round(float(ema200), 4) if ema200 else None,
            "rsi": round(float(rsi), 2) if not np.isnan(rsi) else None,
            "macd": round(float(macd_line), 4),
            "macd_signal": round(float(signal_line), 4),
            "macd_histogram": round(float(macd_line - signal_line), 4),
            "trend": trend,
            "52w_high": round(float(hist["High"].rolling(252).max().iloc[-1]), 4),
            "52w_low": round(float(hist["Low"].rolling(252).min().iloc[-1]), 4),
        }
    except Exception as e:
        logger.warning(f"Failed to fetch indicators for {ticker}: {e}")
        return {}


async def fetch_price(ticker: str) -> Optional[float]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_price_sync, ticker)


async def fetch_indicators(ticker: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_indicators_sync, ticker)


async def fetch_prices_batch(tickers: list[str]) -> dict[str, Optional[float]]:
    """Fetch prices for multiple tickers concurrently."""
    tasks = [fetch_price(t) for t in tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return {
        ticker: (r if not isinstance(r, Exception) else None)
        for ticker, r in zip(tickers, results)
    }
