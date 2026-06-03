'use client';
import { useState } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { createTrade } from '@/lib/api';
import type { TradeFormData, TradeType } from '@/lib/types';
import toast from 'react-hot-toast';

const EMPTY_FORM: TradeFormData = {
  ticker: '', trade_type: 'stock', entry_date: new Date().toISOString().slice(0, 16),
  entry_price: '', position_size: '1000', trade_reason: '',
  shares: '', option_type: '', open_direction: 'BTO', strike_price: '', expiration_date: '', premium_paid: '', contracts: '',
  strategy_type: 'bull_call', long_strike: '', long_premium: '', long_option_type: 'call',
  short_strike: '', short_premium: '', short_option_type: 'call', net_debit_credit: '', max_profit: '',
};

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function TradeEntryModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState<TradeFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof TradeFormData, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.trade_reason.trim() || form.trade_reason.length < 10) {
      toast.error('Trade thesis must be at least 10 characters');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ticker: form.ticker.toUpperCase(),
        trade_type: form.trade_type,
        entry_date: new Date(form.entry_date).toISOString(),
        entry_price: parseFloat(form.entry_price),
        position_size: parseFloat(form.position_size) || 1000,
        trade_reason: form.trade_reason,
      };

      if (form.trade_type === 'stock') {
        payload.shares = parseInt(form.shares);
      } else if (form.trade_type === 'option') {
        payload.option_type = form.option_type;
        payload.open_direction = form.open_direction || 'BTO';
        payload.strike_price = parseFloat(form.strike_price);
        payload.expiration_date = form.expiration_date;
        payload.premium_paid = parseFloat(form.premium_paid);
        payload.contracts = parseInt(form.contracts);
      } else if (form.trade_type === 'vertical') {
        payload.strategy_type = form.strategy_type;
        payload.contracts = parseInt(form.contracts);
        payload.net_debit_credit = parseFloat(form.net_debit_credit);
        payload.expiration_date = form.expiration_date;
        payload.spread_structure = {
          long_leg: {
            strike: parseFloat(form.long_strike),
            premium: parseFloat(form.long_premium),
            option_type: form.long_option_type,
          },
          short_leg: {
            strike: parseFloat(form.short_strike),
            premium: parseFloat(form.short_premium),
            option_type: form.short_option_type,
          },
          max_profit: parseFloat(form.max_profit) || undefined,
          net_debit_credit: parseFloat(form.net_debit_credit),
        };
      }

      await createTrade(payload);
      toast.success(`${form.ticker.toUpperCase()} trade entered successfully`);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to create trade';
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px', display: 'block' };
  const groupStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
  const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '24px', paddingBottom: '24px', overflowY: 'auto',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: '12px',
        width: '100%', maxWidth: '640px', margin: '0 16px',
      }}
        className="slide-in"
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #30363d' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Plus size={18} color="#F5A623" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Enter New Trade</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Trade type selector */}
          <div>
            <label style={labelStyle}>Trade Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {(['stock', 'option', 'vertical'] as TradeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('trade_type', t)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: form.trade_type === t ? '#33B5E5' : '#30363d',
                    background: form.trade_type === t ? 'rgba(51,181,229,0.1)' : '#21262d',
                    color: form.trade_type === t ? '#33B5E5' : '#8b949e',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: form.trade_type === t ? 600 : 400,
                    textTransform: 'capitalize',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'vertical' ? 'Vertical Spread' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Common fields */}
          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Ticker *</label>
              <input value={form.ticker} onChange={(e) => set('ticker', e.target.value.toUpperCase())} placeholder="AAPL" required />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Position Size ($) *</label>
              <input type="number" value={form.position_size} onChange={(e) => set('position_size', e.target.value)} placeholder="1000" required min="1" step="1" />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Entry Price *</label>
              <input type="number" value={form.entry_price} onChange={(e) => set('entry_price', e.target.value)} placeholder="0.00" required min="0.01" step="0.01" />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Entry Date *</label>
              <input type="datetime-local" value={form.entry_date} onChange={(e) => set('entry_date', e.target.value)} required />
            </div>
          </div>

          {/* Stock fields */}
          {form.trade_type === 'stock' && (
            <div style={groupStyle}>
              <label style={labelStyle}>Shares *</label>
              <input type="number" value={form.shares} onChange={(e) => set('shares', e.target.value)} placeholder="100" required min="1" />
            </div>
          )}

          {/* Option fields */}
          {form.trade_type === 'option' && (
            <>
              {/* Open Direction — BTO / STO */}
              <div>
                <label style={labelStyle}>Direction *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {(['BTO', 'STO'] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => set('open_direction', dir)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: form.open_direction === dir ? (dir === 'BTO' ? '#00C851' : '#F5A623') : '#30363d',
                        background: form.open_direction === dir ? (dir === 'BTO' ? 'rgba(0,200,81,0.1)' : 'rgba(245,166,35,0.1)') : '#21262d',
                        color: form.open_direction === dir ? (dir === 'BTO' ? '#00C851' : '#F5A623') : '#8b949e',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: form.open_direction === dir ? 700 : 400,
                        transition: 'all 0.15s',
                        textAlign: 'center',
                      }}
                    >
                      {dir === 'BTO' ? 'Buy to Open' : 'Sell to Open'}
                      <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>
                        {dir === 'BTO' ? 'Long option' : 'Short / credit'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={rowStyle}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Option Type *</label>
                  <select value={form.option_type} onChange={(e) => set('option_type', e.target.value)} required>
                    <option value="">Select...</option>
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>Strike Price *</label>
                  <input type="number" value={form.strike_price} onChange={(e) => set('strike_price', e.target.value)} placeholder="150.00" required step="0.5" />
                </div>
              </div>
              <div style={rowStyle}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Expiration Date *</label>
                  <input type="date" value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} required />
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>{form.open_direction === 'STO' ? 'Premium Received *' : 'Premium Paid *'}</label>
                  <input type="number" value={form.premium_paid} onChange={(e) => set('premium_paid', e.target.value)} placeholder="2.50" required step="0.01" />
                </div>
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Contracts *</label>
                <input type="number" value={form.contracts} onChange={(e) => set('contracts', e.target.value)} placeholder="1" required min="1" />
              </div>
            </>
          )}

          {/* Vertical spread fields */}
          {form.trade_type === 'vertical' && (
            <>
              <div style={rowStyle}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Strategy *</label>
                  <select value={form.strategy_type} onChange={(e) => set('strategy_type', e.target.value)}>
                    <option value="bull_call">Bull Call Spread</option>
                    <option value="bear_put">Bear Put Spread</option>
                    <option value="bull_put">Bull Put Spread (Credit)</option>
                    <option value="bear_call">Bear Call Spread (Credit)</option>
                  </select>
                </div>
                <div style={groupStyle}>
                  <label style={labelStyle}>Expiration Date *</label>
                  <input type="date" value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} required />
                </div>
              </div>

              <div style={{ padding: '12px', background: '#21262d', borderRadius: '8px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>Long Leg</div>
                <div style={rowStyle}>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Strike</label>
                    <input type="number" value={form.long_strike} onChange={(e) => set('long_strike', e.target.value)} placeholder="150.00" step="0.5" />
                  </div>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Premium</label>
                    <input type="number" value={form.long_premium} onChange={(e) => set('long_premium', e.target.value)} placeholder="3.00" step="0.01" />
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: '#21262d', borderRadius: '8px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>Short Leg</div>
                <div style={rowStyle}>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Strike</label>
                    <input type="number" value={form.short_strike} onChange={(e) => set('short_strike', e.target.value)} placeholder="155.00" step="0.5" />
                  </div>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Premium</label>
                    <input type="number" value={form.short_premium} onChange={(e) => set('short_premium', e.target.value)} placeholder="1.50" step="0.01" />
                  </div>
                </div>
              </div>

              <div style={rowStyle}>
                <div style={groupStyle}>
                  <label style={labelStyle}>Net Debit/Credit *</label>
                  <input type="number" value={form.net_debit_credit} onChange={(e) => set('net_debit_credit', e.target.value)} placeholder="1.50" step="0.01" required />
                </div>
                <div style={rowStyle}>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Max Profit</label>
                    <input type="number" value={form.max_profit} onChange={(e) => set('max_profit', e.target.value)} placeholder="3.50" step="0.01" />
                  </div>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Contracts *</label>
                    <input type="number" value={form.contracts} onChange={(e) => set('contracts', e.target.value)} placeholder="1" min="1" required />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Trade Reason — MANDATORY */}
          <div style={groupStyle}>
            <label style={{ ...labelStyle, color: '#F5A623' }}>
              Trade Thesis / Reason * <span style={{ color: '#8b949e', fontSize: '10px', textTransform: 'none', letterSpacing: 0 }}>({form.trade_reason.length}/2000)</span>
            </label>
            <textarea
              value={form.trade_reason}
              onChange={(e) => set('trade_reason', e.target.value.slice(0, 2000))}
              placeholder="Describe your trade setup, catalyst, technical signals, risk/reward rationale, and any relevant fundamental or macro context..."
              required
              minLength={10}
              maxLength={2000}
              rows={5}
              style={{
                resize: 'vertical',
                minHeight: '120px',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                borderColor: form.trade_reason.length > 0 && form.trade_reason.length < 10 ? '#FF4444' : '#30363d',
              }}
            />
            {form.trade_reason.length > 0 && form.trade_reason.length < 10 && (
              <span style={{ color: '#FF4444', fontSize: '11px' }}>Minimum 10 characters required</span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #30363d',
                background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2, padding: '10px', borderRadius: '6px', border: 'none',
                background: loading ? '#21262d' : '#F5A623', color: loading ? '#8b949e' : '#0d1117',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700,
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Entering Trade...' : 'Enter Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
