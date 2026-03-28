'use client';
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp, ArrowDown, ArrowUp, RotateCcw, LogOut, ArrowUpDown } from 'lucide-react';
import type { Alert, AlertType } from '@/lib/types';
import { format } from 'date-fns';

const ALERT_META: Record<AlertType, { icon: React.ElementType; color: string; label: string }> = {
  STOP_LOSS_HIT:       { icon: AlertTriangle, color: '#FF4444', label: 'Stop Hit' },
  TAKE_PROFIT:         { icon: CheckCircle,   color: '#00C851', label: 'Take Profit' },
  EXIT_TRADE:          { icon: LogOut,        color: '#FF8800', label: 'Exit Trade' },
  TREND_REVERSAL:      { icon: RotateCcw,     color: '#FF8800', label: 'Reversal' },
  REDUCE_POSITION:     { icon: ArrowDown,     color: '#FFCC00', label: 'Reduce' },
  ADD_POSITION:        { icon: ArrowUp,       color: '#33B5E5', label: 'Add' },
  TRAILING_STOP_UPDATE:{ icon: ArrowUpDown,   color: '#AA66CC', label: 'Trail Updated' },
  ENTRY_CONFIRMATION:  { icon: TrendingUp,    color: '#00C851', label: 'Entry' },
};

interface Props {
  alerts: Alert[];
  compact?: boolean;
}

export default function AlertPanel({ alerts, compact = false }: Props) {
  if (!alerts.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#8b949e', fontSize: '13px' }}>
        No alerts yet — monitoring active positions.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {alerts.map((alert) => {
        const meta = ALERT_META[alert.alert_type] || { icon: AlertTriangle, color: '#8b949e', label: alert.alert_type };
        const Icon = meta.icon;
        const time = format(new Date(alert.timestamp), compact ? 'HH:mm' : 'MMM d, HH:mm');

        return (
          <div
            key={alert.id}
            className="slide-in"
            style={{
              background: '#161b22',
              border: `1px solid ${meta.color}33`,
              borderLeft: `3px solid ${meta.color}`,
              borderRadius: '8px',
              padding: compact ? '10px 12px' : '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Icon size={16} color={meta.color} style={{ flexShrink: 0, marginTop: '2px' }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{alert.ticker}</span>
                  <span className={`badge badge-${alert.alert_type}`}>{meta.label}</span>
                  {alert.current_price && (
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>${alert.current_price.toFixed(2)}</span>
                  )}
                  <span style={{ fontSize: '11px', color: '#8b949e', marginLeft: 'auto' }}>{time}</span>
                </div>

                {!compact && (
                  <p style={{
                    margin: 0, fontSize: '12px', lineHeight: '1.5',
                    color: '#c9d1d9', whiteSpace: 'pre-wrap',
                    display: '-webkit-box', WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {alert.reasoning}
                  </p>
                )}

                {!compact && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {alert.stop_level && (
                      <span style={{ fontSize: '11px', color: '#FF4444' }}>Stop: ${alert.stop_level.toFixed(2)}</span>
                    )}
                    {alert.profit_target_1 && (
                      <span style={{ fontSize: '11px', color: '#00C851' }}>T1: ${alert.profit_target_1.toFixed(2)}</span>
                    )}
                    {alert.profit_target_2 && (
                      <span style={{ fontSize: '11px', color: '#00C851' }}>T2: ${alert.profit_target_2.toFixed(2)}</span>
                    )}
                    <span style={{ fontSize: '11px', color: '#484f58' }}>
                      {alert.email_sent && '✉ '}{alert.sms_sent && '📱'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
