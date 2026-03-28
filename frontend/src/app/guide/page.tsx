'use client';
import { BookOpen, Plus, Activity, History, Bell, Settings, AlertTriangle, TrendingUp, Shield, Clock, Zap, ChevronRight } from 'lucide-react';

const S = {
  section: { marginBottom: '40px' } as React.CSSProperties,
  h2: { fontSize: '18px', fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '10px' } as React.CSSProperties,
  h3: { fontSize: '14px', fontWeight: 700, color: '#e6edf3', margin: '16px 0 8px 0' } as React.CSSProperties,
  p: { fontSize: '13px', lineHeight: '1.7', color: '#8b949e', margin: '0 0 10px 0' } as React.CSSProperties,
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px', marginBottom: '12px' } as React.CSSProperties,
  code: { background: '#21262d', border: '1px solid #30363d', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#F5A623', fontFamily: 'monospace' } as React.CSSProperties,
  step: { display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-start' } as React.CSSProperties,
  stepNum: { width: '24px', height: '24px', borderRadius: '50%', background: '#F5A623', color: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0, marginTop: '1px' } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px', marginBottom: '12px' },
};

function Section({ title, icon: Icon, color, children }: { title: string; icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div style={S.section}>
      <h2 style={{ ...S.h2, color }}>
        <Icon size={18} color={color} />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Rule({ label, value, color = '#8b949e' }: { label: string; value: string; color?: string }) {
  return (
    <tr>
      <td style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', color: '#8b949e', width: '45%' }}>{label}</td>
      <td style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', color, fontWeight: 500 }}>{value}</td>
    </tr>
  );
}

export default function GuidePage() {
  return (
    <div style={{ maxWidth: '860px', margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: '36px', padding: '28px', background: 'linear-gradient(135deg, #161b22 0%, #21262d 100%)', border: '1px solid #30363d', borderRadius: '12px', borderLeft: '4px solid #F5A623' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <BookOpen size={24} color="#F5A623" />
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Trade Monitor — User Guide
          </h1>
        </div>
        <p style={{ margin: 0, color: '#8b949e', fontSize: '14px', lineHeight: '1.7' }}>
          An institutional-grade swing trade management system for <strong style={{ color: '#e6edf3' }}>stocks</strong>, <strong style={{ color: '#e6edf3' }}>options</strong>, and <strong style={{ color: '#e6edf3' }}>vertical spreads</strong>.
          This tool does <em>not</em> generate trade ideas — it manages, monitors, and protects the trades you enter.
          Every position is tracked in real-time, every decision is logged with institutional reasoning, and alerts are sent via email + SMS.
        </p>
      </div>

      {/* Quick Start */}
      <Section title="Quick Start" icon={Zap} color="#F5A623">
        <div style={S.card}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {['Active Trades', 'Trade History', 'Alerts', 'Guide'].map((tab, i) => (
              <span key={tab} style={{ padding: '4px 12px', borderRadius: '99px', background: i === 0 ? 'rgba(245,166,35,0.15)' : '#21262d', border: `1px solid ${i === 0 ? '#F5A623' : '#30363d'}`, fontSize: '12px', color: i === 0 ? '#F5A623' : '#8b949e' }}>{tab}</span>
            ))}
          </div>
          <p style={S.p}>Use the four tabs in the top navigation bar to move between sections of the app.</p>
        </div>
        {[
          { num: 1, text: 'Go to Active Trades and click the gold "Enter Trade" button top-right.' },
          { num: 2, text: 'Select trade type (Stock / Option / Vertical Spread) and fill in the structured fields.' },
          { num: 3, text: 'Write your Trade Thesis (mandatory). This is permanently tied to the trade lifecycle.' },
          { num: 4, text: 'Click "Enter Trade". The system immediately computes stops, targets, and begins 60-second monitoring.' },
          { num: 5, text: 'Watch alerts appear in the right panel. Critical alerts (stop hit, take profit) auto-close the trade and move it to History.' },
          { num: 6, text: 'Review closed trades in Trade History with full audit trail: thesis, all alerts, final P/L.' },
        ].map(({ num, text }) => (
          <div key={num} style={S.step}>
            <div style={S.stepNum}>{num}</div>
            <p style={{ ...S.p, margin: 0, paddingTop: '3px' }}>{text}</p>
          </div>
        ))}
      </Section>

      {/* Trade Entry */}
      <Section title="Entering Trades" icon={Plus} color="#33B5E5">
        <p style={S.p}>The trade entry form adapts to the selected trade type. Fields marked <span style={{ color: '#FF4444' }}>*</span> are required.</p>

        <h3 style={{ ...S.h3, color: '#33B5E5' }}>Stocks</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Ticker" value="Symbol (e.g. AAPL, NVDA)" />
              <Rule label="Entry Price" value="Your fill price per share" />
              <Rule label="Shares" value="Number of shares purchased" />
              <Rule label="Position Size ($)" value="Total capital allocated (default $1,000)" />
            </tbody>
          </table>
          <p style={{ ...S.p, margin: 0 }}>System auto-calculates: <span style={S.code}>ATR stop (2.5×)</span>, <span style={S.code}>1R target</span>, <span style={S.code}>2R target</span></p>
        </div>

        <h3 style={{ ...S.h3, color: '#AA66CC' }}>Options (Single Leg)</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Option Type" value="Call or Put" />
              <Rule label="Strike Price" value="Contract strike (e.g. 150.00)" />
              <Rule label="Expiration Date" value="Contract expiry (YYYY-MM-DD)" />
              <Rule label="Premium Paid" value="Price per contract (e.g. 2.50)" />
              <Rule label="Contracts" value="Number of contracts (1 contract = 100 shares)" />
            </tbody>
          </table>
          <p style={{ ...S.p, margin: 0 }}>System auto-sets: <span style={S.code}>40% loss stop</span>, <span style={S.code}>50% profit target</span>, <span style={S.code}>100% target</span>. Fires DTE warning at &lt;14 days.</p>
        </div>

        <h3 style={{ ...S.h3, color: '#F5A623' }}>Vertical Spreads</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Strategy" value="Bull Call / Bear Put / Bull Put / Bear Call" />
              <Rule label="Long Leg" value="Strike + premium for the leg you buy" />
              <Rule label="Short Leg" value="Strike + premium for the leg you sell" />
              <Rule label="Net Debit/Credit" value="Total cost (debit) or received (credit)" />
              <Rule label="Max Profit" value="Maximum possible gain at expiry" />
              <Rule label="Expiration Date" value="Both legs expire same date" />
            </tbody>
          </table>
          <p style={{ ...S.p, margin: 0 }}>System manages: <span style={S.code}>50% debit stop</span>, <span style={S.code}>50% max profit take</span>, <span style={S.code}>75% max profit close</span>. Auto-exits at &lt;21 DTE with &lt;30% captured.</p>
        </div>

        <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px', padding: '14px 16px', marginTop: '8px' }}>
          <div style={{ fontWeight: 700, color: '#F5A623', fontSize: '13px', marginBottom: '6px' }}>Trade Thesis (Mandatory)</div>
          <p style={{ ...S.p, margin: 0 }}>
            Every trade requires a written thesis (10–2,000 characters). Write your setup rationale, catalyst, technical signals, and risk/reward logic.
            This text is <strong style={{ color: '#e6edf3' }}>permanently preserved</strong> in the trade record, shown in the position card, and visible in the History audit trail even after the trade closes.
            It is never editable after entry — it reflects your thinking at decision time.
          </p>
        </div>
      </Section>

      {/* Monitoring */}
      <Section title="Live Monitoring (60-Second Cycle)" icon={Activity} color="#00C851">
        <p style={S.p}>
          During market hours (9:30 AM – 4:00 PM ET, Mon–Fri), the system polls Yahoo Finance every 60 seconds for every open position.
          Outside market hours, polling pauses automatically.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { title: 'Price Update', desc: 'Current price, unrealized P/L, and % gain/loss updated every cycle.' },
            { title: 'Stop Management', desc: 'Trailing stop advances as price makes new highs (high-water-mark tracking).' },
            { title: 'Target Monitoring', desc: 'System checks if price has reached T1 or T2 and fires appropriate action alerts.' },
            { title: 'Technical Signals', desc: 'ATR, EMA20/50/200, RSI, and MACD evaluated each cycle for reversal warnings.' },
            { title: 'DTE Monitoring', desc: 'Options and spreads: DTE warning fires when expiry is approaching with insufficient profit.' },
            { title: 'Auto-Close', desc: 'Stop hits, full profit targets, and forced exits auto-close the trade — no manual action needed.' },
          ].map(({ title, desc }) => (
            <div key={title} style={{ ...S.card, marginBottom: 0 }}>
              <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '13px', marginBottom: '4px' }}>{title}</div>
              <p style={{ ...S.p, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Trade Management Rules */}
      <Section title="Trade Management Rules" icon={Shield} color="#FF8800">
        <h3 style={{ ...S.h3, color: '#33B5E5' }}>Stocks — Stop & Profit Rules</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Initial Stop" value="Entry − 2.5 × ATR (Chandelier Exit, LeBeau 1992)" color="#FF4444" />
              <Rule label="Trailing Stop" value="Advances 2.5 × ATR below high-water-mark on each new high" color="#AA66CC" />
              <Rule label="T1 (1R target)" value="Entry + 1× risk amount — reduce 33%, move stop to breakeven" color="#00C851" />
              <Rule label="T2 (2R target)" value="Entry + 2× risk amount — close remaining 33% position" color="#00C851" />
              <Rule label="Runner" value="Final 33% trailed until stop triggers (Van Tharp R-multiple protocol)" color="#F5A623" />
              <Rule label="Trend Reversal" value="MACD cross + RSI &gt;75: alert to tighten stop to 1.5× ATR below current" color="#FF8800" />
            </tbody>
          </table>
        </div>

        <h3 style={{ ...S.h3, color: '#AA66CC' }}>Options — Stop & Profit Rules</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Stop Loss" value="Premium falls to 60% of entry (40% loss limit)" color="#FF4444" />
              <Rule label="DTE Warning" value="&lt;14 days to expiry with &lt;20% profit: forced exit recommendation" color="#FF8800" />
              <Rule label="T1 (50% profit)" value="Premium doubles to 150% of entry: reduce 50% of contracts" color="#00C851" />
              <Rule label="T2 (100% profit)" value="Premium at 200% of entry: close all — reversal risk too high" color="#00C851" />
            </tbody>
          </table>
        </div>

        <h3 style={{ ...S.h3, color: '#F5A623' }}>Vertical Spreads — Rules</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Stop Loss" value="Spread value falls to 50% of net debit" color="#FF4444" />
              <Rule label="Early Exit (21 DTE)" value="&lt;21 DTE with &lt;30% max profit captured: close to avoid gamma risk" color="#FF8800" />
              <Rule label="T1 (50% max profit)" value="Consider closing — remaining upside vs full risk open" color="#00C851" />
              <Rule label="T2 (75% max profit)" value="Close immediately — 75% rule: last 25% not worth the risk" color="#00C851" />
            </tbody>
          </table>
        </div>

        <h3 style={{ ...S.h3, color: '#FF4444' }}>Portfolio Heat (Seykota & Druz)</h3>
        <div style={S.card}>
          <table style={S.table}>
            <tbody>
              <Rule label="Heat Calculation" value="Sum of all position sizes ÷ total capital" />
              <Rule label="Normal Zone" value="0–12% — full risk deployment allowed" color="#00C851" />
              <Rule label="Warning Zone" value="12–20% — be selective with new entries" color="#FF8800" />
              <Rule label="Critical Zone" value="&gt;20% — avoid new trades, look to reduce" color="#FF4444" />
            </tbody>
          </table>
        </div>
      </Section>

      {/* Alert Types */}
      <Section title="Alert System" icon={Bell} color="#FF4444">
        <p style={S.p}>Every alert includes: ticker, current price, stop level, profit targets, ATR, technical indicators, and a full institutional reasoning paragraph.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { type: 'ENTRY_CONFIRMATION', color: '#00C851', action: 'Informational', desc: 'Trade logged. Initial stops and targets computed and set.' },
            { type: 'TRAILING_STOP_UPDATE', color: '#AA66CC', action: 'Automatic', desc: 'New high-water-mark detected. Trailing stop advanced to lock in more profit.' },
            { type: 'REDUCE_POSITION', color: '#FFCC00', action: 'Action Required', desc: '1R target or 50% option profit reached. Reduce size and move stop to breakeven.' },
            { type: 'TAKE_PROFIT', color: '#00C851', action: 'Auto-close', desc: 'Full profit target (2R / 100% option / 75% spread) hit. Trade closed automatically.' },
            { type: 'TREND_REVERSAL', color: '#FF8800', action: 'Warning', desc: 'MACD crossover + RSI overbought. Consider tightening stop or reducing exposure.' },
            { type: 'EXIT_TRADE', color: '#FF8800', action: 'Action Required', desc: 'DTE warning, forced exit condition. Manual or auto-close recommended.' },
            { type: 'STOP_LOSS_HIT', color: '#FF4444', action: 'Auto-close', desc: 'Price breached stop level. Position automatically closed and archived.' },
            { type: 'ADD_POSITION', color: '#33B5E5', action: 'Optional', desc: 'Setup remains valid with strength signal. Optional add to position.' },
          ].map(({ type, color, action, desc }) => (
            <div key={type} style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: '#161b22', border: `1px solid ${color}33`, borderLeft: `3px solid ${color}`, borderRadius: '8px' }}>
              <div style={{ minWidth: '180px' }}>
                <span className={`badge badge-${type}`}>{type.replace(/_/g, ' ')}</span>
                <div style={{ fontSize: '10px', color: '#8b949e', marginTop: '4px' }}>{action}</div>
              </div>
              <p style={{ ...S.p, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '16px', padding: '14px', background: '#21262d', borderRadius: '8px', border: '1px solid #30363d' }}>
          <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '13px', marginBottom: '6px' }}>Notifications</div>
          <p style={{ ...S.p, margin: 0 }}>
            Configure <span style={S.code}>SMTP_USER</span> / <span style={S.code}>NOTIFY_EMAIL</span> in <span style={S.code}>.env</span> for detailed HTML email alerts.
            Configure <span style={S.code}>TWILIO_*</span> variables for concise SMS alerts on your phone.
            Both are optional — alerts are always visible in the Alerts tab regardless.
          </p>
        </div>
      </Section>

      {/* History */}
      <Section title="Trade History & Audit Trail" icon={History} color="#8b949e">
        <p style={S.p}>
          When a trade closes (via stop, profit target, or manual close), it is automatically moved from Active Trades to Trade History.
          The original trade is never deleted — it is archived with full context.
        </p>
        <div style={S.card}>
          <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: '13px', marginBottom: '10px' }}>Each history record contains:</div>
          {[
            'Original trade thesis — exactly as entered',
            'Every alert fired during the trade lifecycle',
            'Final entry price, exit price, realized P/L, and P/L %',
            'Position snapshot at close (ATR, stop, HWM)',
            'Exit reason (stop hit / profit target / manual)',
            'Total alerts generated count',
          ].map((item) => (
            <div key={item} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '13px', color: '#8b949e' }}>
              <ChevronRight size={14} color="#F5A623" style={{ flexShrink: 0, marginTop: '2px' }} />
              {item}
            </div>
          ))}
        </div>
        <p style={S.p}>
          Use the filters (ticker, trade type, date range) to search your history.
          The Summary panel shows total realized P/L, win rate, and average return across all closed trades.
        </p>
      </Section>

      {/* Settings */}
      <Section title="Configuration Reference" icon={Settings} color="#8b949e">
        <div style={S.card}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#8b949e', borderBottom: '1px solid #30363d' }}>Variable</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#8b949e', borderBottom: '1px solid #30363d' }}>Default</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', color: '#8b949e', borderBottom: '1px solid #30363d' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['BASE_POSITION_SIZE', '$1,000', 'Default capital per trade'],
                ['MAX_PORTFOLIO_HEAT', '15%', 'Portfolio-level risk ceiling'],
                ['ENABLE_NOTIFICATIONS', 'true', 'Toggle email + SMS'],
                ['MARKET_OPEN', '09:30', 'Monitor start time (ET)'],
                ['MARKET_CLOSE', '16:00', 'Monitor stop time (ET)'],
                ['SMTP_HOST', 'smtp.gmail.com', 'Email server'],
                ['TWILIO_ACCOUNT_SID', '—', 'Twilio account for SMS'],
              ].map(([k, v, d]) => (
                <tr key={k}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #21262d' }}><span style={S.code}>{k}</span></td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', color: '#F5A623', fontSize: '12px' }}>{v}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #21262d', color: '#8b949e', fontSize: '12px' }}>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ ...S.p, margin: '8px 0 0 0' }}>Edit <span style={S.code}>backend/.env</span> and restart the backend after changes.</p>
        </div>
      </Section>

      {/* Research basis */}
      <Section title="Research Basis" icon={TrendingUp} color="#F5A623">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[
            { ref: 'LeBeau (1992)', use: 'Chandelier Exit — ATR-based trailing stop' },
            { ref: 'Van Tharp', use: 'R-multiple profit taking protocol' },
            { ref: 'Moreira & Muir (2017)', use: 'Half-Kelly volatility-adjusted sizing' },
            { ref: 'Seykota & Druz', use: 'Portfolio heat management' },
            { ref: 'Wilder (1978)', use: 'RSI 14-period momentum indicator' },
            { ref: 'Bollinger (1992)', use: 'Volatility band mean reversion' },
            { ref: 'Jegadeesh-Titman (1993)', use: '12-1 momentum factor' },
            { ref: 'Pan & Poteshman (2006)', use: 'Put/call ratio as smart money signal' },
          ].map(({ ref, use }) => (
            <div key={ref} style={{ padding: '10px 12px', background: '#161b22', borderRadius: '6px', border: '1px solid #30363d' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#F5A623' }}>{ref}</div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>{use}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Tips */}
      <div style={{ padding: '20px', background: 'rgba(0,200,81,0.05)', border: '1px solid rgba(0,200,81,0.2)', borderRadius: '8px' }}>
        <div style={{ fontWeight: 700, color: '#00C851', fontSize: '14px', marginBottom: '10px' }}>Pro Tips</div>
        {[
          'Write detailed trade theses — reviewing why you entered a losing trade teaches more than reviewing winners.',
          'Never override stop-loss alerts. The system enforces discipline so you don\'t have to in the moment.',
          'For options, always enter the actual premium paid (not the mid-price) to get accurate P/L tracking.',
          'Monitor portfolio heat before adding new positions — the system warns at 15% but you should act at 12%.',
          'Use the History audit trail to identify patterns: which setups work, which thesis language precedes winners.',
          'The 60-second refresh means price data is near-real-time but not tick-level — always verify critical alerts manually.',
        ].map((tip, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '13px', color: '#8b949e' }}>
            <span style={{ color: '#00C851', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}
