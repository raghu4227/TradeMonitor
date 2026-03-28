# Trade Monitor — Full Recreation Prompt

Use the following prompt to recreate the entire Trade Monitor application from scratch in a new Claude Code session.

---

## PROMPT (copy everything below this line)

---

Build a complete **Trade Monitoring & Management System** at `C:\Claude\Projects\TradeMonitor` with the following full specification.

### Tech Stack
- **Backend**: Python FastAPI + SQLAlchemy (async) + PostgreSQL + APScheduler
- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS
- **Market Data**: yfinance (Yahoo Finance)
- **Notifications**: SMTP email + Twilio SMS
- **Deployment**: IIS with HttpPlatformHandler + Windows Service

---

### Core Objective
A system that:
- Allows manual entry of trades (stocks, options, vertical spreads)
- Monitors ONLY open trades every 60 seconds during market hours (9:30–16:00 ET)
- Automatically moves closed trades to a history table
- Applies institutional trade management logic and generates alerts
- Sends email + SMS notifications
- Logs every decision with full institutional reasoning

---

### Database Tables (PostgreSQL, auto-created by SQLAlchemy)

**`mypositions`** — Active trades only (status = OPEN)
- `id, ticker, trade_type (stock/option/vertical), status (OPEN/CLOSED)`
- `entry_date, entry_price, current_price, position_size`
- `shares` (stocks), `option_type, strike_price, expiration_date, premium_paid, contracts` (options)
- `strategy_type, spread_structure (JSON), net_debit_credit` (spreads)
- `stop_loss, profit_target_1, profit_target_2, trailing_stop, high_water_mark, atr`
- `unrealized_pnl, unrealized_pnl_pct`
- `trade_reason (TEXT, max 2000 chars)` — mandatory
- `created_at, updated_at, closed_at`

**`trade_history`** — All closed trades with full lifecycle
- All fields from mypositions + `exit_date, exit_price, realized_pnl, pnl_percent`
- `trade_snapshot (JSON)`, `alerts_generated (JSON)`, `exit_reason`

**`trade_alerts`** — Institutional alert log
- `trade_id (FK), ticker, trade_type, alert_type, timestamp`
- `current_price, entry_price, position_size, stop_level, profit_target_1/2, trailing_stop, atr`
- `indicators (JSON), market_context (TEXT), reasoning (TEXT NOT NULL)`
- `notification_sent, email_sent, sms_sent (BOOLEAN)`

---

### Backend File Structure (`backend/`)
```
main.py              # FastAPI app, lifespan (init_db + scheduler start/stop)
config.py            # pydantic-settings: DB URL, SMTP, Twilio, app settings
database.py          # async SQLAlchemy engine, AsyncSessionLocal, init_db()
models.py            # Position, TradeHistory, TradeAlert SQLAlchemy models
schemas.py           # Pydantic: TradeCreate, PositionOut, AlertOut, DashboardSummary, etc.
requirements.txt     # fastapi, uvicorn, sqlalchemy, asyncpg, alembic, psycopg2-binary,
                     # pydantic-settings, yfinance, pandas, numpy, apscheduler, twilio,
                     # python-multipart, httpx, pytz, ta
routers/
  trades.py          # GET/POST/PATCH /api/trades/, POST /api/trades/{id}/close
  history.py         # GET /api/history/ (filterable), GET /api/history/summary
  alerts.py          # GET /api/alerts/ (filterable), GET /api/alerts/recent
  dashboard.py       # GET /api/dashboard/summary (stats + recent alerts + market status)
services/
  market_data.py     # yfinance: fetch_price(), fetch_indicators() (ATR/EMA/RSI/MACD async)
                     # fetch_prices_batch(), is_market_open()
  trade_management.py # compute_initial_stops(), evaluate_stock_position(),
                       # evaluate_option_position(), evaluate_vertical_spread(),
                       # compute_portfolio_heat(), ManagementDecision dataclass
  alert_engine.py    # process_position(), run_monitoring_cycle(), _close_position()
                     # Cooldown deduplication per alert type
  notifications.py   # send_email() SMTP, send_sms() Twilio, notify_alert() async
                     # build_alert_email() HTML + plain text, build_sms_message()
  scheduler.py       # APScheduler AsyncIOScheduler, 60-second IntervalTrigger
```

---

### Trade Management Logic (CRITICAL)

**Stocks (Chandelier Exit — LeBeau 1992 + Van Tharp R-multiples):**
- Initial stop: `entry − 2.5 × ATR`
- Trailing stop: `2.5 × ATR below high-water-mark`, advances on new highs
- T1 (1R): reduce 33%, move stop to breakeven → fire `REDUCE_POSITION`
- T2 (2R): close final 33% → fire `TAKE_PROFIT` (action_required=True)
- Trend reversal: MACD cross below signal + RSI > 75 → fire `TREND_REVERSAL`, tighten to 1.5× ATR
- Stop hit: auto-close → fire `STOP_LOSS_HIT` (action_required=True, urgency=CRITICAL)

**Options:**
- Stop: premium ≤ 60% of entry (40% loss) → `STOP_LOSS_HIT` auto-close
- DTE warning: < 14 days with < 20% profit → `EXIT_TRADE` action required
- T1: premium ≥ 150% of entry (50% profit) → `REDUCE_POSITION` 50% contracts
- T2: premium ≥ 200% of entry (100% profit) → `TAKE_PROFIT` auto-close

**Vertical Spreads:**
- Stop: value ≤ 50% of net debit → `STOP_LOSS_HIT` auto-close
- Expiry: < 21 DTE with < 30% max profit → `EXIT_TRADE` action required
- T1: ≥ 50% max profit captured → `REDUCE_POSITION` consider close
- T2: ≥ 75% max profit captured → `TAKE_PROFIT` auto-close

**Alert cooldowns (to prevent spam):**
- TRAILING_STOP_UPDATE: 3600s, TREND_REVERSAL: 1800s, REDUCE_POSITION/ADD_POSITION: 900s
- STOP_LOSS_HIT / TAKE_PROFIT / EXIT_TRADE: no cooldown (always fire)

**Auto-close on action_required=True:**
- Compute realized P/L by trade type
- Copy position to trade_history with full snapshot + alert summary list
- Set position.status = CLOSED, closed_at = now

---

### Frontend File Structure (`frontend/src/`)

**Pages (`app/`):**
- `page.tsx` — Active Trades dashboard: stat cards (open trades, unrealized P/L, heat, realized P/L), trade cards list + alert panel sidebar, auto-refresh every 60s
- `history/page.tsx` — Trade History: filterable table (ticker, type, date), W/L summary stats, expandable rows showing thesis + alert audit trail
- `alerts/page.tsx` — All Alerts: full log with type filter chips, color-coded by alert type
- `guide/page.tsx` — User Guide: complete how-to covering trade entry, monitoring rules, alert types, configuration, research basis, pro tips
- `layout.tsx` — Navbar + react-hot-toast provider

**Components (`components/`):**
- `Navbar.tsx` — sticky nav with 4 tabs (Active/History/Alerts/Guide), market status dot, alert badge count
- `TradeEntryModal.tsx` — 3-mode form (stock/option/vertical) with adaptive fields, mandatory Trade Thesis textarea (10–2000 chars), enter button calls POST /api/trades/
- `TradeCard.tsx` — expandable position card: ticker/type badge, current price, P/L, stop/trail/target chips, trade thesis block, close form
- `AlertPanel.tsx` — alert list with icon+color per alert type, reasoning text, notification status icons
- `HistoryTable.tsx` — closed trades table with expandable rows showing thesis + alert history

**Lib (`lib/`):**
- `types.ts` — TypeScript interfaces: Position, TradeHistory, Alert, DashboardSummary, TradeFormData, etc.
- `api.ts` — axios client with all API calls (getDashboardSummary, getOpenTrades, createTrade, closeTrade, getHistory, getHistorySummary, getAlerts, etc.)

**Styling:**
- Dark theme: `--bg-primary: #0d1117`, `--bg-secondary: #161b22`, `--bg-tertiary: #21262d`
- Accent colors: gold `#F5A623`, green `#00C851`, red `#FF4444`, blue `#33B5E5`, purple `#AA66CC`, orange `#FF8800`
- CSS classes: `.card`, `.badge`, `.badge-{trade_type}`, `.badge-{alert_type}`, `.pnl-positive/negative`, `.stat-card`, `.slide-in`
- Tailwind config with custom colors matching the above

---

### IIS Deployment

**Strategy:** HttpPlatformHandler for both backend and frontend
- Backend: IIS site on port 8000 → `HttpPlatformHandler` launches `uvicorn main:app --port %HTTP_PLATFORM_PORT%`
- Frontend: IIS site on port 3000 → `HttpPlatformHandler` launches `node .next/standalone/server.js`
- App Pools: `TradeMonitorBackend` and `TradeMonitorFrontend`, No Managed Code, Identity=ApplicationPoolIdentity

**web.config for backend (HttpPlatformHandler):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified"/>
    </handlers>
    <httpPlatform processPath=".\venv\Scripts\uvicorn.exe"
                  arguments="main:app --port %HTTP_PLATFORM_PORT% --host 127.0.0.1"
                  startupTimeLimit="60" requestTimeout="00:04:00" stdoutLogEnabled="true">
      <environmentVariables>
        <environmentVariable name="PYTHONPATH" value="."/>
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
```

**web.config for frontend (HttpPlatformHandler):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified"/>
    </handlers>
    <httpPlatform processPath="node"
                  arguments=".\.next\standalone\server.js"
                  startupTimeLimit="60" requestTimeout="00:04:00" stdoutLogEnabled="true">
      <environmentVariables>
        <environmentVariable name="PORT" value="%HTTP_PLATFORM_PORT%"/>
        <environmentVariable name="NODE_ENV" value="production"/>
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
```

**Deployment PowerShell script uses:**
- `New-WebAppPool` / `Set-ItemProperty` for app pool creation
- `New-Website` for site creation with physical path and port binding
- `Start-Website` / `Start-WebAppPool`

---

### .env Configuration
```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/trademonitor
DATABASE_URL_SYNC=postgresql://postgres:password@localhost:5432/trademonitor
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
NOTIFY_EMAIL=alerts@yourdomain.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+15551234567
NOTIFY_PHONE=+15559876543
BASE_POSITION_SIZE=1000
MAX_PORTFOLIO_HEAT=0.15
ENABLE_NOTIFICATIONS=true
MARKET_OPEN=09:30
MARKET_CLOSE=16:00
TIMEZONE=America/New_York
```

---

### GitHub
Push to a new public repo named `TradeMonitor` under the authenticated GitHub user.
Create `.gitignore` excluding `node_modules/`, `venv/`, `.env`, `__pycache__/`, `.next/`, `*.pyc`.

---

### Deliverables
1. All backend files fully implemented (no stubs)
2. All frontend files fully implemented
3. IIS deployment scripts that work on Windows 11 with IIS and HttpPlatformHandler
4. GitHub repository with all source code
5. Guide page fully written with rules, alert types, configuration reference

**URLs after deployment:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
