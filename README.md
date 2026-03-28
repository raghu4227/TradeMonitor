# Trade Monitor — Institutional Trade Management System

A full-stack swing trade monitoring and management system for stocks, options, and vertical spreads.

## Architecture

```
TradeMonitor/
├── backend/          # FastAPI + PostgreSQL + APScheduler
│   ├── main.py       # App entry point
│   ├── models.py     # SQLAlchemy database models
│   ├── schemas.py    # Pydantic request/response schemas
│   ├── routers/      # API endpoints
│   │   ├── trades.py    # Trade CRUD + close
│   │   ├── history.py   # Closed trade archive
│   │   ├── alerts.py    # Alert log
│   │   └── dashboard.py # Summary stats
│   └── services/
│       ├── market_data.py      # yfinance price + indicator fetch
│       ├── trade_management.py # Stop/profit/alert logic
│       ├── alert_engine.py     # 60s monitoring loop
│       ├── notifications.py    # Email + SMS
│       └── scheduler.py        # APScheduler background jobs
└── frontend/         # Next.js 14 + React + Tailwind
    └── src/
        ├── app/
        │   ├── page.tsx          # Active Trades dashboard
        │   ├── history/page.tsx  # Trade History
        │   └── alerts/page.tsx   # All Alerts
        └── components/
            ├── TradeEntryModal.tsx  # Multi-type trade entry form
            ├── TradeCard.tsx        # Position card with expand/close
            ├── AlertPanel.tsx       # Institutional alert display
            └── HistoryTable.tsx     # Closed trade table with audit trail
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (running locally)

## Setup

### 1. Database
```sql
-- In psql:
CREATE DATABASE trademonitor;
```

### 2. Backend
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# Edit .env with your DB credentials, SMTP, Twilio
uvicorn main:app --reload --port 8000
```

### 3. Frontend
```powershell
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Quick Start (PowerShell)
```powershell
# Terminal 1:
.\start-backend.ps1

# Terminal 2:
.\start-frontend.ps1
```

## Configuration (.env)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL async URL |
| `SMTP_USER` | Gmail address for email alerts |
| `SMTP_PASSWORD` | Gmail app password |
| `NOTIFY_EMAIL` | Recipient email for alerts |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio phone number |
| `NOTIFY_PHONE` | Your phone for SMS alerts |
| `BASE_POSITION_SIZE` | Default position size ($1000) |
| `ENABLE_NOTIFICATIONS` | true/false |

## Trade Management Logic

### Stocks
- **Stop Loss**: Chandelier Exit — 2.5× ATR from entry (LeBeau 1992)
- **Trailing Stop**: 2.5× ATR from high-water-mark, updated on new highs
- **Profit Taking**: 33% at 1R, 33% at 2R, trail final 33% (Van Tharp)

### Options
- **Stop Loss**: 40% premium loss threshold
- **Time Decay Warning**: Auto-alert at < 14 DTE with < 20% profit
- **Profit Taking**: 50% position at 50% gain; close all at 100% gain

### Vertical Spreads
- **Stop Loss**: 50% of net debit
- **Expiration Exit**: Auto-alert at < 21 DTE with < 30% max profit captured
- **Profit Taking**: Consider close at 50%; close at 75% max profit

### Portfolio Heat (Seykota & Druz)
- Warning at 15% of portfolio at risk
- Critical at 20%+

## Alert Types

| Alert | Trigger | Action |
|-------|---------|--------|
| `ENTRY_CONFIRMATION` | Trade entered | Log + notify |
| `STOP_LOSS_HIT` | Price ≤ stop | Auto-close + notify |
| `TAKE_PROFIT` | Target reached | Auto-close + notify |
| `TRAILING_STOP_UPDATE` | New high-water-mark | Update stop, notify |
| `REDUCE_POSITION` | 1R target hit | Reduce size, move stop to BE |
| `TREND_REVERSAL` | MACD + RSI signal | Warning alert |
| `EXIT_TRADE` | DTE warning / stop | Action required |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trades/` | All open positions |
| POST | `/api/trades/` | Create new trade |
| PATCH | `/api/trades/{id}` | Update stop/targets/thesis |
| POST | `/api/trades/{id}/close` | Manual close |
| GET | `/api/history/` | Closed trade archive |
| GET | `/api/history/summary` | P/L stats |
| GET | `/api/alerts/` | All alerts |
| GET | `/api/alerts/recent` | Last N alerts |
| GET | `/api/dashboard/summary` | Dashboard stats |
| GET | `/health` | Health check |
