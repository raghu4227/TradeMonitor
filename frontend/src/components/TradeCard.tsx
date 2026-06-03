'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Position } from '@/lib/types';
import { closeTrade } from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Props {
  position: Position;
  onClosed: () => void;
}

export default function TradeCard({ position: pos, onClosed }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [exitPrice, setExitPrice] = useState('');
  const [exitReason, setExitReason] = useState('');

  const pnl = pos.unrealized_pnl || 0;
  const pnlPct = pos.unrealized_pnl_pct || 0;
  const pnlColor = pnl > 0 ? '#00C851' : pnl < 0 ? '#FF4444' : '#8b949e';
  const currentPrice = pos.current_price || pos.entry_price;

  // Stop distance %
  const stopDist = pos.stop_loss
    ? ((currentPrice - pos.stop_loss) / currentPrice * 100)
    : null;

  // Risk/reward status
  const toTarget1 = pos.profit_target_1
    ? ((pos.profit_target_1 - currentPrice) / currentPrice * 100)
    : null;

  const handleClose = async () => {
    if (!exitPrice || !exitReason) {
      toast.error('Enter exit price and reason');
      return;
    }
    setClosing(true);
    try {
      await closeTrade(pos.id, parseFloat(exitPrice), exitReason);
      toast.success(`${pos.ticker} trade closed`);
      onClosed();
    } catch {
      toast.error('Failed to close trade');
    } finally {
      setClosing(false);
    }
  };

  // Option direction helpers
  const isOption = pos.trade_type === 'option';
  const openDir = pos.open_direction || 'BTO';
  const closeLabel = isOption ? (openDir === 'STO' ? 'Buy to Close' : 'Sell to Close') : 'Close Position';
  const closeReason = isOption ? (openDir === 'STO' ? 'BTC' : 'STC') : '';

  // Get underlying price label
  const priceLabel = isOption
    ? `${openDir === 'STO' ? 'Received' : 'Premium'}: $${currentPrice?.toFixed(2)}`
    : pos.trade_type === 'vertical'
    ? `Value: $${currentPrice?.toFixed(2)}`
    : `$${currentPrice?.toFixed(2)}`;

  return (
    <div
      className="card slide-in"
      style={{
        borderLeft: `3px solid ${pnl >= 0 ? '#00C851' : '#FF4444'}`,
        overflow: 'hidden',
      }}
    >
      {/* Main row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        {/* Ticker + type */}
        <div style={{ minWidth: '80px' }}>
          <div style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.3px' }}>{pos.ticker}</div>
          <span className={`badge badge-${pos.trade_type}`}>{
            pos.trade_type === 'vertical'
              ? (pos.strategy_type?.replace('_', ' ') || 'Spread')
              : pos.trade_type === 'option'
              ? `${openDir} ${pos.option_type?.toUpperCase()} $${pos.strike_price}`
              : pos.trade_type
          }</span>
        </div>

        {/* Price */}
        <div style={{ minWidth: '90px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{priceLabel}</div>
          <div style={{ fontSize: '11px', color: '#8b949e' }}>Entry: ${pos.entry_price.toFixed(2)}</div>
        </div>

        {/* P&L */}
        <div style={{ minWidth: '90px', textAlign: 'right' }}>
          <div style={{ color: pnlColor, fontWeight: 700, fontSize: '15px' }}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
          </div>
          <div style={{ color: pnlColor, fontSize: '12px' }}>
            {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
          </div>
        </div>

        {/* Stops & Targets strip */}
        <div style={{ flex: 1, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {pos.stop_loss && (
            <div style={{ background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '4px', padding: '3px 8px', fontSize: '11px' }}>
              <span style={{ color: '#8b949e' }}>Stop </span>
              <span style={{ color: '#FF4444', fontWeight: 600 }}>${pos.stop_loss.toFixed(2)}</span>
              {stopDist !== null && <span style={{ color: '#8b949e' }}> ({stopDist.toFixed(1)}%)</span>}
            </div>
          )}
          {pos.trailing_stop && (
            <div style={{ background: 'rgba(170,102,204,0.1)', border: '1px solid rgba(170,102,204,0.2)', borderRadius: '4px', padding: '3px 8px', fontSize: '11px' }}>
              <span style={{ color: '#8b949e' }}>Trail </span>
              <span style={{ color: '#AA66CC', fontWeight: 600 }}>${pos.trailing_stop.toFixed(2)}</span>
            </div>
          )}
          {pos.profit_target_1 && (
            <div style={{ background: 'rgba(0,200,81,0.1)', border: '1px solid rgba(0,200,81,0.2)', borderRadius: '4px', padding: '3px 8px', fontSize: '11px' }}>
              <span style={{ color: '#8b949e' }}>T1 </span>
              <span style={{ color: '#00C851', fontWeight: 600 }}>${pos.profit_target_1.toFixed(2)}</span>
              {toTarget1 !== null && <span style={{ color: '#8b949e' }}> (+{toTarget1.toFixed(1)}%)</span>}
            </div>
          )}
          {pos.profit_target_2 && (
            <div style={{ background: 'rgba(0,200,81,0.08)', border: '1px solid rgba(0,200,81,0.15)', borderRadius: '4px', padding: '3px 8px', fontSize: '11px' }}>
              <span style={{ color: '#8b949e' }}>T2 </span>
              <span style={{ color: '#00C851', fontWeight: 600 }}>${pos.profit_target_2.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div style={{ textAlign: 'right', minWidth: '80px' }}>
          <div style={{ fontSize: '11px', color: '#8b949e' }}>
            {format(new Date(pos.entry_date), 'MMM d')}
          </div>
          {pos.expiration_date && (
            <div style={{ fontSize: '11px', color: '#F5A623' }}>
              Exp: {pos.expiration_date}
            </div>
          )}
        </div>

        {/* Expand toggle */}
        <div style={{ color: '#8b949e' }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: '1px solid #30363d', padding: '16px' }}>
          {/* Trade Reason */}
          {pos.trade_reason && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#21262d', borderRadius: '8px', borderLeft: '3px solid #F5A623' }}>
              <div style={{ fontSize: '11px', color: '#F5A623', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Trade Thesis</div>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: '#c9d1d9', whiteSpace: 'pre-wrap' }}>
                {pos.trade_reason}
              </p>
            </div>
          )}

          {/* Technical details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Position Size', value: `$${pos.position_size.toLocaleString()}` },
              { label: 'ATR', value: pos.atr ? `$${pos.atr.toFixed(3)}` : '—' },
              { label: 'High Water Mark', value: pos.high_water_mark ? `$${pos.high_water_mark.toFixed(2)}` : '—' },
              ...(pos.trade_type === 'stock'
                ? [{ label: 'Shares', value: pos.shares?.toLocaleString() || '—' }]
                : []),
              ...(pos.trade_type === 'option' || pos.trade_type === 'vertical'
                ? [
                    { label: 'Contracts', value: `${pos.contracts}` },
                    { label: 'DTE', value: pos.expiration_date ? `${Math.max(0, Math.floor((new Date(pos.expiration_date).getTime() - Date.now()) / 86400000))}d` : '—' },
                  ]
                : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '8px', background: '#21262d', borderRadius: '6px' }}>
                <div style={{ fontSize: '10px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Close form */}
          {showCloseForm ? (
            <div style={{ padding: '12px', background: '#21262d', borderRadius: '8px', border: '1px solid #30363d' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#FF4444', marginBottom: '10px' }}>{closeLabel.toUpperCase()}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                    {isOption ? 'Close Premium' : 'Exit Price'}
                  </label>
                  <input
                    type="number"
                    value={exitPrice}
                    onChange={(e) => setExitPrice(e.target.value)}
                    placeholder={isOption ? (pos.premium_paid?.toFixed(2) || '0.00') : currentPrice.toFixed(2)}
                    step="0.01"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px' }}>Exit Reason</label>
                  <input
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    placeholder={closeReason || 'Stop hit, target reached...'}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowCloseForm(false)}
                  style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #30363d', borderRadius: '6px', color: '#8b949e', cursor: 'pointer', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing}
                  style={{ flex: 2, padding: '8px', background: '#FF4444', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  {closing ? 'Closing...' : `Confirm ${closeLabel}`}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowCloseForm(true); if (closeReason) setExitReason(closeReason); }}
              style={{
                padding: '8px 16px', background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.3)',
                borderRadius: '6px', color: '#FF4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}
            >
              {closeLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
