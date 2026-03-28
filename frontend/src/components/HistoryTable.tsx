'use client';
import { useState } from 'react';
import type { TradeHistory } from '@/lib/types';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  trades: TradeHistory[];
}

export default function HistoryTable({ trades }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!trades.length) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e', fontSize: '14px' }}>
        No closed trades yet.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Type</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Entry Price</th>
            <th>Exit Price</th>
            <th>P/L</th>
            <th>P/L %</th>
            <th>Exit Reason</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnl = t.realized_pnl || 0;
            const pnlPct = t.pnl_percent || 0;
            const pnlColor = pnl > 0 ? '#00C851' : pnl < 0 ? '#FF4444' : '#8b949e';
            const isExpanded = expanded === t.id;

            return (
              <>
                <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : t.id)}>
                  <td>
                    <span style={{ fontWeight: 700 }}>{t.ticker}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${t.trade_type}`}>{t.trade_type}</span>
                  </td>
                  <td style={{ color: '#8b949e', fontSize: '12px' }}>
                    {format(new Date(t.entry_date), 'MMM d, yyyy')}
                  </td>
                  <td style={{ color: '#8b949e', fontSize: '12px' }}>
                    {format(new Date(t.exit_date), 'MMM d, yyyy')}
                  </td>
                  <td>${t.entry_price.toFixed(2)}</td>
                  <td>${t.exit_price.toFixed(2)}</td>
                  <td style={{ color: pnlColor, fontWeight: 700 }}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                  </td>
                  <td style={{ color: pnlColor, fontWeight: 600 }}>
                    {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                  </td>
                  <td style={{ color: '#8b949e', fontSize: '12px' }}>{t.exit_reason || '—'}</td>
                  <td style={{ color: '#8b949e' }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </td>
                </tr>

                {isExpanded && (
                  <tr key={`${t.id}-detail`}>
                    <td colSpan={10} style={{ padding: 0, background: '#21262d' }}>
                      <div style={{ padding: '16px' }}>
                        {/* Trade Reason */}
                        {t.trade_reason && (
                          <div style={{ marginBottom: '14px', padding: '12px', background: '#161b22', borderRadius: '8px', borderLeft: '3px solid #F5A623' }}>
                            <div style={{ fontSize: '11px', color: '#F5A623', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>Original Trade Thesis</div>
                            <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: '#c9d1d9', whiteSpace: 'pre-wrap' }}>
                              {t.trade_reason}
                            </p>
                          </div>
                        )}

                        {/* Alert history */}
                        {t.alerts_generated && t.alerts_generated.length > 0 && (
                          <div>
                            <div style={{ fontSize: '11px', color: '#8b949e', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                              Alert History ({t.alerts_generated.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {t.alerts_generated.map((a, i) => (
                                <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '12px', padding: '6px 10px', background: '#161b22', borderRadius: '6px' }}>
                                  <span className={`badge badge-${a.type}`} style={{ flexShrink: 0 }}>{a.type.replace(/_/g, ' ')}</span>
                                  <span style={{ color: '#8b949e' }}>{a.time?.slice(0, 16)}</span>
                                  <span style={{ color: '#c9d1d9', flex: 1 }}>{a.reasoning}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
