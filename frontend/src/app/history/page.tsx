'use client';
import { useEffect, useState } from 'react';
import { getHistory, getHistorySummary } from '@/lib/api';
import type { TradeHistory, HistorySummary } from '@/lib/types';
import HistoryTable from '@/components/HistoryTable';
import { History, TrendingUp, TrendingDown, Target, BarChart2 } from 'lucide-react';

export default function TradeHistoryPage() {
  const [trades, setTrades] = useState<TradeHistory[]>([]);
  const [summary, setSummary] = useState<HistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ ticker: '', trade_type: '', from_date: '', to_date: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | undefined> = {
        ticker: filters.ticker || undefined,
        trade_type: filters.trade_type || undefined,
        from_date: filters.from_date || undefined,
        to_date: filters.to_date || undefined,
      };
      const [h, s] = await Promise.all([getHistory(params), getHistorySummary()]);
      setTrades(h);
      setSummary(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <History size={20} color="#F5A623" />
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>Trade History</h1>
      </div>

      {/* Summary stats */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
          {[
            { label: 'Total Trades', value: summary.total_trades.toString(), color: '#33B5E5', icon: <BarChart2 size={15} color="#33B5E5" /> },
            { label: 'Realized P/L', value: `${summary.total_realized_pnl >= 0 ? '+' : ''}$${summary.total_realized_pnl.toFixed(2)}`, color: summary.total_realized_pnl >= 0 ? '#00C851' : '#FF4444', icon: <TrendingUp size={15} color={summary.total_realized_pnl >= 0 ? '#00C851' : '#FF4444'} /> },
            { label: 'Win Rate', value: `${summary.win_rate.toFixed(1)}%`, color: '#F5A623', icon: <Target size={15} color="#F5A623" /> },
            { label: 'Avg Return', value: `${summary.avg_pnl_pct >= 0 ? '+' : ''}${summary.avg_pnl_pct.toFixed(2)}%`, color: summary.avg_pnl_pct >= 0 ? '#00C851' : '#FF4444', icon: <BarChart2 size={15} color="#8b949e" /> },
            { label: 'W / L', value: `${summary.winners} / ${summary.losers}`, color: '#8b949e', icon: <BarChart2 size={15} color="#8b949e" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="stat-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                {icon}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Ticker</label>
            <input
              value={filters.ticker}
              onChange={(e) => setFilters({ ...filters, ticker: e.target.value.toUpperCase() })}
              placeholder="AAPL"
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Trade Type</label>
            <select value={filters.trade_type} onChange={(e) => setFilters({ ...filters, trade_type: e.target.value })}>
              <option value="">All Types</option>
              <option value="stock">Stock</option>
              <option value="option">Option</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>From Date</label>
            <input type="date" value={filters.from_date} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>To Date</label>
            <input type="date" value={filters.to_date} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} />
          </div>
          <button
            onClick={load}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: '#F5A623', color: '#0d1117', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700, height: '36px',
            }}
          >
            Apply Filters
          </button>
          <button
            onClick={() => { setFilters({ ticker: '', trade_type: '', from_date: '', to_date: '' }); setTimeout(load, 100); }}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: '1px solid #30363d',
              background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '13px', height: '36px',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Loading history...</div>
        ) : (
          <HistoryTable trades={trades} />
        )}
      </div>
    </div>
  );
}
