from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from datetime import datetime, date
from decimal import Decimal


# ─── Spread Leg ───────────────────────────────────────────────────────────────

class SpreadLeg(BaseModel):
    strike: float
    premium: float
    option_type: str  # call | put


class SpreadStructure(BaseModel):
    long_leg: SpreadLeg
    short_leg: SpreadLeg


# ─── Trade Create ─────────────────────────────────────────────────────────────

class TradeCreate(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=20)
    trade_type: str = Field(..., pattern="^(stock|option|vertical)$")

    entry_date: datetime
    entry_price: float = Field(..., gt=0)
    position_size: float = Field(default=1000.0, gt=0)

    # Stock
    shares: Optional[int] = Field(None, gt=0)

    # Option
    option_type: Optional[str] = Field(None, pattern="^(call|put)$")
    open_direction: Optional[str] = Field(None, pattern="^(BTO|STO)$")  # Buy to Open | Sell to Open
    strike_price: Optional[float] = None
    expiration_date: Optional[date] = None
    premium_paid: Optional[float] = None
    contracts: Optional[int] = Field(None, gt=0)

    # Vertical spread
    strategy_type: Optional[str] = None
    spread_structure: Optional[SpreadStructure] = None
    net_debit_credit: Optional[float] = None

    # Thesis
    trade_reason: str = Field(..., min_length=10, max_length=2000)

    @field_validator("ticker")
    @classmethod
    def upper_ticker(cls, v: str) -> str:
        return v.upper().strip()

    @field_validator("trade_type")
    @classmethod
    def check_trade_type_fields(cls, v: str) -> str:
        return v.lower()


class TradeUpdate(BaseModel):
    trade_reason: Optional[str] = Field(None, max_length=2000)
    stop_loss: Optional[float] = None
    profit_target_1: Optional[float] = None
    profit_target_2: Optional[float] = None
    position_size: Optional[float] = None


class TradeClose(BaseModel):
    exit_price: float = Field(..., gt=0)
    exit_reason: str = Field(..., min_length=5, max_length=200)


# ─── Trade Response ───────────────────────────────────────────────────────────

class PositionOut(BaseModel):
    id: int
    ticker: str
    trade_type: str
    status: str
    entry_date: datetime
    entry_price: float
    current_price: Optional[float]
    position_size: float
    shares: Optional[int]
    option_type: Optional[str]
    open_direction: Optional[str]
    strike_price: Optional[float]
    expiration_date: Optional[date]
    premium_paid: Optional[float]
    contracts: Optional[int]
    strategy_type: Optional[str]
    spread_structure: Optional[Any]
    net_debit_credit: Optional[float]
    stop_loss: Optional[float]
    profit_target_1: Optional[float]
    profit_target_2: Optional[float]
    trailing_stop: Optional[float]
    high_water_mark: Optional[float]
    atr: Optional[float]
    unrealized_pnl: Optional[float]
    unrealized_pnl_pct: Optional[float]
    trade_reason: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ─── Trade History ────────────────────────────────────────────────────────────

class TradeHistoryOut(BaseModel):
    id: int
    original_trade_id: Optional[int]
    ticker: str
    trade_type: str
    status: str
    entry_date: datetime
    exit_date: datetime
    entry_price: float
    exit_price: float
    position_size: Optional[float]
    shares: Optional[int]
    contracts: Optional[int]
    option_type: Optional[str]
    open_direction: Optional[str]
    strike_price: Optional[float]
    expiration_date: Optional[date]
    premium_paid: Optional[float]
    strategy_type: Optional[str]
    realized_pnl: Optional[float]
    pnl_percent: Optional[float]
    trade_snapshot: Optional[Any]
    alerts_generated: Optional[Any]
    exit_reason: Optional[str]
    trade_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Alert ────────────────────────────────────────────────────────────────────

class AlertOut(BaseModel):
    id: int
    trade_id: Optional[int]
    ticker: str
    trade_type: Optional[str]
    alert_type: str
    timestamp: datetime
    current_price: Optional[float]
    entry_price: Optional[float]
    position_size: Optional[float]
    stop_level: Optional[float]
    profit_target_1: Optional[float]
    profit_target_2: Optional[float]
    trailing_stop: Optional[float]
    atr: Optional[float]
    indicators: Optional[Any]
    market_context: Optional[str]
    reasoning: str
    notification_sent: bool
    email_sent: bool
    sms_sent: bool

    class Config:
        from_attributes = True


# ─── Dashboard Summary ────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_open_trades: int
    total_closed_trades: int
    total_unrealized_pnl: float
    total_realized_pnl: float
    portfolio_heat_pct: float
    recent_alerts: list[AlertOut]
    market_is_open: bool
