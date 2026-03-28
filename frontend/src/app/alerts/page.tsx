'use client';
import { useEffect, useState } from 'react';
import { getAlerts } from '@/lib/api';
import type { Alert, AlertType } from '@/lib/types';
import AlertPanel from '@/components/AlertPanel';
import { Bell } from 'lucide-react';

const ALERT_TYPES: AlertType[] = [
  'STOP_LOSS_HIT', 'TAKE_PROFIT', 'EXIT_TRADE', 'TREND_REVERSAL',
  'REDUCE_POSITION', 'ADD_POSITION', 'TRAILING_STOP_UPDATE', 'ENTRY_CONFIRMATION',
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticker, setTicker] = useState('');
  const [alertType, setAlertType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAlerts({
        ticker: ticker || undefined,
        alert_type: alertType || undefined,
        limit: '100',
      });
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Bell size={20} color="#F5A623" />
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>All Alerts</h1>
        <span style={{ fontSize: '13px', color: '#8b949e' }}>({alerts.length})</span>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '120px' }}>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Ticker</label>
            <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" />
          </div>
          <div style={{ minWidth: '180px' }}>
            <label style={{ fontSize: '11px', color: '#8b949e', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Alert Type</label>
            <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
              <option value="">All Types</option>
              {ALERT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <button
            onClick={load}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#F5A623', color: '#0d1117', cursor: 'pointer', fontSize: '13px', fontWeight: 700, height: '36px' }}
          >
            Filter
          </button>
        </div>
      </div>

      {/* Alert type summary chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {ALERT_TYPES.map((type) => {
          const count = alerts.filter((a) => a.alert_type === type).length;
          if (!count) return null;
          return (
            <button
              key={type}
              onClick={() => { setAlertType(type); setTimeout(load, 100); }}
              className={`badge badge-${type}`}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              {type.replace(/_/g, ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Loading alerts...</div>
        ) : (
          <AlertPanel alerts={alerts} />
        )}
      </div>
    </div>
  );
}
