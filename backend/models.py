from sqlalchemy import (
    Column, Integer, String, Numeric, DateTime, Date, Boolean,
    Text, ForeignKey, JSON, func
)
from sqlalchemy.orm import relationship
from database import Base


class Position(Base):
    """Active trades — only OPEN positions are monitored here."""
    __tablename__ = "mypositions"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    trade_type = Column(String(20), nullable=False)  # stock | option | vertical
    status = Column(String(10), nullable=False, default="OPEN")  # OPEN | CLOSED

    # Entry info
    entry_date = Column(DateTime(timezone=True), nullable=False)
    entry_price = Column(Numeric(14, 4), nullable=False)
    current_price = Column(Numeric(14, 4))
    position_size = Column(Numeric(14, 2), nullable=False, default=1000)

    # Stock fields
    shares = Column(Integer)

    # Option fields (nullable for stocks)
    option_type = Column(String(10))        # call | put
    strike_price = Column(Numeric(14, 4))
    expiration_date = Column(Date)
    premium_paid = Column(Numeric(14, 4))
    contracts = Column(Integer)

    # Vertical spread fields
    strategy_type = Column(String(50))      # bull_call | bear_put | bull_put | bear_call
    spread_structure = Column(JSON)         # {"long_leg": {...}, "short_leg": {...}}
    net_debit_credit = Column(Numeric(14, 4))

    # Trade management levels
    stop_loss = Column(Numeric(14, 4))
    profit_target_1 = Column(Numeric(14, 4))
    profit_target_2 = Column(Numeric(14, 4))
    trailing_stop = Column(Numeric(14, 4))
    high_water_mark = Column(Numeric(14, 4))
    atr = Column(Numeric(14, 4))
    atr_period = Column(Integer, default=14)

    # Unrealized P&L
    unrealized_pnl = Column(Numeric(14, 2))
    unrealized_pnl_pct = Column(Numeric(8, 4))

    # Trade thesis (mandatory)
    trade_reason = Column(Text)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    closed_at = Column(DateTime(timezone=True))

    # Relationships
    alerts = relationship("TradeAlert", back_populates="position", cascade="all, delete-orphan")


class TradeHistory(Base):
    """Archived closed trades — full lifecycle record."""
    __tablename__ = "trade_history"

    id = Column(Integer, primary_key=True, index=True)
    original_trade_id = Column(Integer, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    trade_type = Column(String(20), nullable=False)
    status = Column(String(10), default="CLOSED")

    entry_date = Column(DateTime(timezone=True), nullable=False)
    exit_date = Column(DateTime(timezone=True), nullable=False)
    entry_price = Column(Numeric(14, 4), nullable=False)
    exit_price = Column(Numeric(14, 4), nullable=False)
    position_size = Column(Numeric(14, 2))
    shares = Column(Integer)
    contracts = Column(Integer)

    # Option fields (preserved from original)
    option_type = Column(String(10))
    strike_price = Column(Numeric(14, 4))
    expiration_date = Column(Date)
    premium_paid = Column(Numeric(14, 4))
    strategy_type = Column(String(50))

    # P&L
    realized_pnl = Column(Numeric(14, 2))
    pnl_percent = Column(Numeric(8, 4))

    # Full snapshot + lifecycle
    trade_snapshot = Column(JSON)       # complete position state at close
    alerts_generated = Column(JSON)     # list of alert summaries
    adjustments = Column(JSON)          # any stop/target adjustments made
    exit_reason = Column(String(200))
    trade_reason = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TradeAlert(Base):
    """Institutional-grade alert log — one record per alert fired."""
    __tablename__ = "trade_alerts"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("mypositions.id", ondelete="SET NULL"), nullable=True)
    ticker = Column(String(20), nullable=False, index=True)
    trade_type = Column(String(20))

    # Alert classification
    alert_type = Column(String(50), nullable=False)
    # ENTRY_CONFIRMATION | ADD_POSITION | REDUCE_POSITION | STOP_LOSS_HIT
    # TAKE_PROFIT | TRAILING_STOP_UPDATE | TREND_REVERSAL | EXIT_TRADE

    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Price state at alert time
    current_price = Column(Numeric(14, 4))
    entry_price = Column(Numeric(14, 4))
    position_size = Column(Numeric(14, 2))

    # Management levels at alert time
    stop_level = Column(Numeric(14, 4))
    profit_target_1 = Column(Numeric(14, 4))
    profit_target_2 = Column(Numeric(14, 4))
    trailing_stop = Column(Numeric(14, 4))

    # Volatility & indicators
    atr = Column(Numeric(14, 4))
    indicators = Column(JSON)       # RSI, MACD, ATR, EMA values, etc.
    market_context = Column(Text)   # macro regime, VIX level, trend context

    # Institutional reasoning (mandatory)
    reasoning = Column(Text, nullable=False)

    # Notification status
    notification_sent = Column(Boolean, default=False)
    email_sent = Column(Boolean, default=False)
    sms_sent = Column(Boolean, default=False)

    # Relationship
    position = relationship("Position", back_populates="alerts")
