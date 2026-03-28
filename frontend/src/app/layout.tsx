import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Trade Monitor — Institutional Trade Management',
  description: 'Real-time swing trade monitoring & management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 56px)', padding: '24px 16px', maxWidth: '1400px', margin: '0 auto' }}>
          {children}
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#161b22',
              color: '#e6edf3',
              border: '1px solid #30363d',
              borderRadius: '8px',
            },
            success: { iconTheme: { primary: '#00C851', secondary: '#0d1117' } },
            error: { iconTheme: { primary: '#FF4444', secondary: '#0d1117' } },
          }}
        />
      </body>
    </html>
  );
}
