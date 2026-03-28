'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, History, Bell, TrendingUp, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDashboardSummary } from '@/lib/api';

export default function Navbar() {
  const pathname = usePathname();
  const [marketOpen, setMarketOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getDashboardSummary();
        setMarketOpen(data.market_is_open);
        setAlertCount(data.recent_alerts.length);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 60000);
    return () => clearInterval(id);
  }, []);

  const links = [
    { href: '/', label: 'Active Trades', icon: Activity },
    { href: '/history', label: 'Trade History', icon: History },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/guide', label: 'Guide', icon: BookOpen },
  ];

  return (
    <nav style={{
      background: '#161b22',
      borderBottom: '1px solid #30363d',
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '8px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '24px', textDecoration: 'none' }}>
        <TrendingUp size={20} color="#F5A623" />
        <span style={{ fontWeight: 700, color: '#e6edf3', fontSize: '15px', letterSpacing: '-0.3px' }}>
          Trade<span style={{ color: '#F5A623' }}>Monitor</span>
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
              color: pathname === href ? '#e6edf3' : '#8b949e',
              background: pathname === href ? 'rgba(255,255,255,0.08)' : 'transparent',
              transition: 'all 0.15s',
              position: 'relative',
            }}
          >
            <Icon size={14} />
            {label}
            {href === '/alerts' && alertCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: '#FF4444',
                color: 'white',
                borderRadius: '99px',
                fontSize: '9px',
                fontWeight: 700,
                padding: '0 4px',
                minWidth: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Market status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: marketOpen ? '#00C851' : '#8b949e',
          display: 'inline-block',
          ...(marketOpen ? { boxShadow: '0 0 0 2px rgba(0,200,81,0.3)' } : {}),
        }} />
        <span style={{ color: marketOpen ? '#00C851' : '#8b949e' }}>
          {marketOpen ? 'Market Open' : 'Market Closed'}
        </span>
      </div>
    </nav>
  );
}
