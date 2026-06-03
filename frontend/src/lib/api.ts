import axios from 'axios';
import type { Position, TradeHistory, Alert, DashboardSummary, HistorySummary } from './types';

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE || '/api' });

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardSummary = () =>
  api.get<DashboardSummary>('/dashboard/summary').then((r) => r.data);

// ─── Trades ───────────────────────────────────────────────────────────────────
export const getOpenTrades = () =>
  api.get<Position[]>('/trades/').then((r) => r.data);

export const createTrade = (data: Record<string, unknown>) =>
  api.post<Position>('/trades/', data).then((r) => r.data);

export const getTrade = (id: number) =>
  api.get<Position>(`/trades/${id}`).then((r) => r.data);

export const updateTrade = (id: number, data: Record<string, unknown>) =>
  api.patch<Position>(`/trades/${id}`, data).then((r) => r.data);

export const closeTrade = (id: number, exit_price: number, exit_reason: string) =>
  api.post<Position>(`/trades/${id}/close`, { exit_price, exit_reason }).then((r) => r.data);

export const getTradeAlerts = (id: number) =>
  api.get<Alert[]>(`/trades/${id}/alerts`).then((r) => r.data);

// ─── History ──────────────────────────────────────────────────────────────────
export const getHistory = (params?: Record<string, string | number | undefined>) =>
  api.get<TradeHistory[]>('/history/', { params }).then((r) => r.data);

export const getHistorySummary = () =>
  api.get<HistorySummary>('/history/summary').then((r) => r.data);

export const getHistoryTrade = (id: number) =>
  api.get<TradeHistory>(`/history/${id}`).then((r) => r.data);

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const getAlerts = (params?: Record<string, string | boolean | undefined>) =>
  api.get<Alert[]>('/alerts/', { params }).then((r) => r.data);

export const getRecentAlerts = (limit = 10) =>
  api.get<Alert[]>('/alerts/recent', { params: { limit } }).then((r) => r.data);
