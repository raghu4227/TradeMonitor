'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, RefreshCw, TrendingUp, TrendingDown, Activity, Flame, AlertTriangle } from 'lucide-react';
import TradeCard from '@/components/TradeCard';
import TradeEntryModal from '@/components/TradeEntryModal';
import AlertPanel from '@/components/AlertPanel';
import { getOpenTrades, getDashboardSummary } from '@/lib/api';
import type { Position, DashboardSummary } from '@/lib/types';

export default function ActiveTradesPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, sum] = await Promise.all([getOpenTrades(), getDashboardSummary()]);
      setPositions(pos);
      setSummary(sum);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60000);
    return () => clearInterval(id);
  }, [refresh]);

  const totalPnl = summary?.total_unrealized_pnl || 0;
  const heatPct = (summary?.portfolio_heat_pct || 0) * 100;
  const heatColor = heatPct > 20 ? '#FF4444' : heatPct > 12 ? '#FF8800' : '#00C851';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Active Trades
          </h1>
          <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '2px' }}>
            {summary?.market_is_open ? (
              <span style={{ color: '#00C851' }}>● Market Open</span>
            ) : (
              <span style={{ color: '#8b949e' }}>● Market Closed</span>
            )}
            {' '}· Last updated {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '6px',
              border: '1px solid #30363d', background: 'transparent',
              color: '#8b949e', cursor: 'pointer', fontSize: '13px',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '6px',
              border: 'none', background: '#F5A623',
              color: '#0d1117', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
            }}
          >
            <Plus size={16} />
            Enter Trade
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
          <StatCard
            label="Open Trades"
            value={summary.total_open_trades.toString()}
            icon={<Activity size={16} color="#33B5E5" />}
            color="#33B5E5"
          />
          <StatCard
            label="Unrealized P/L"
            value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`}
            icon={totalPnl >= 0 ? <TrendingUp size={16} color="#00C851" /> : <TrendingDown size={16} color="#FF4444" />}
            color={totalPnl >= 0 ? '#00C851' : '#FF4444'}
          />
          <StatCard
            label="Portfolio Heat"
            value={`${heatPct.toFixed(1)}%`}
            icon={<Flame size={16} color={heatColor} />}
            color={heatColor}
            subtitle={heatPct > 15 ? '⚠ Approaching limit' : 'Within bounds'}
          />
          <StatCard
            label="Realized P/L"
            value={`${summary.total_realized_pnl >= 0 ? '+' : ''}$${summary.total_realized_pnl.toFixed(2)}`}
            icon={<TrendingUp size={16} color="#F5A623" />}
            color="#F5A623"
            subtitle={`${summary.total_closed_trades} closed trades`}
          />
        </div>
      )}

      {/* Main content: trades + alerts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Positions */}
        <div>
          {loading && positions.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Loading positions...</div>
          ) : positions.length === 0 ? (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <Activity size={32} color="#30363d" style={{ margin: '0 auto 12px' }} />
              <div style={{ color: '#8b949e', marginBottom: '16px' }}>No open trades</div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: '8px 20px', borderRadius: '6px', border: '1px solid #F5A623',
                  background: 'transparent', color: '#F5A623', cursor: 'pointer', fontSize: '13px',
                }}
              >
                Enter your first trade
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {positions.map((pos) => (
                <TradeCard key={pos.id} position={pos} onClosed={refresh} />
              ))}
            </div>
          )}
        </div>

        {/* Alert panel */}
        <div className="card" style={{ padding: '0' }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #30363d',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertTriangle size={14} color="#FF8800" />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>Recent Alerts</span>
            {summary && summary.recent_alerts.length > 0 && (
              <span style={{ background: '#FF4444', color: 'white', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', marginLeft: 'auto' }}>
                {summary.recent_alerts.length}
              </span>
            )}
          </div>
          <div style={{ padding: '12px', maxHeight: '600px', overflowY: 'auto' }}>
            <AlertPanel alerts={summary?.recent_alerts || []} compact />
          </div>
        </div>
      </div>

      {showModal && (
        <TradeEntryModal onClose={() => setShowModal(false)} onCreated={refresh} />
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, color, subtitle,
}: {
  label: string; value: string; icon: React.ReactNode; color: string; subtitle?: string;
}) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '11px', color: '#8b949e', marginTop: '4px' }}>{subtitle}</div>}
    </div>
  );
}
