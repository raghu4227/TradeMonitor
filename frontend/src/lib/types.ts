export type TradeType = 'stock' | 'option' | 'vertical';
export type OptionType = 'call' | 'put';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type AlertType =
  | 'ENTRY_CONFIRMATION'
  | 'ADD_POSITION'
  | 'REDUCE_POSITION'
  | 'STOP_LOSS_HIT'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP_UPDATE'
  | 'TREND_REVERSAL'
  | 'EXIT_TRADE';

export interface SpreadLeg {
  strike: number;
  premium: number;
  option_type: 'call' | 'put';
}

export interface SpreadStructure {
  long_leg: SpreadLeg;
  short_leg: SpreadLeg;
  max_profit?: number;
  net_debit_credit?: number;
}

export interface Position {
  id: number;
  ticker: string;
  trade_type: TradeType;
  status: TradeStatus;
  entry_date: string;
  entry_price: number;
  current_price: number | null;
  position_size: number;
  shares: number | null;
  option_type: OptionType | null;
  strike_price: number | null;
  expiration_date: string | null;
  premium_paid: number | null;
  contracts: number | null;
  strategy_type: string | null;
  spread_structure: SpreadStructure | null;
  net_debit_credit: number | null;
  stop_loss: number | null;
  profit_target_1: number | null;
  profit_target_2: number | null;
  trailing_stop: number | null;
  high_water_mark: number | null;
  atr: number | null;
  unrealized_pnl: number | null;
  unrealized_pnl_pct: number | null;
  trade_reason: string | null;
  created_at: string;
  updated_at: string | null;
  closed_at: string | null;
}

export interface TradeHistory {
  id: number;
  original_trade_id: number | null;
  ticker: string;
  trade_type: TradeType;
  status: string;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  position_size: number | null;
  shares: number | null;
  contracts: number | null;
  option_type: OptionType | null;
  strike_price: number | null;
  expiration_date: string | null;
  premium_paid: number | null;
  strategy_type: string | null;
  realized_pnl: number | null;
  pnl_percent: number | null;
  trade_snapshot: Record<string, unknown> | null;
  alerts_generated: Array<{ type: string; time: string; reasoning: string }> | null;
  exit_reason: string | null;
  trade_reason: string | null;
  created_at: string;
}

export interface Alert {
  id: number;
  trade_id: number | null;
  ticker: string;
  trade_type: string | null;
  alert_type: AlertType;
  timestamp: string;
  current_price: number | null;
  entry_price: number | null;
  position_size: number | null;
  stop_level: number | null;
  profit_target_1: number | null;
  profit_target_2: number | null;
  trailing_stop: number | null;
  atr: number | null;
  indicators: Record<string, unknown> | null;
  market_context: string | null;
  reasoning: string;
  notification_sent: boolean;
  email_sent: boolean;
  sms_sent: boolean;
}

export interface DashboardSummary {
  total_open_trades: number;
  total_closed_trades: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  portfolio_heat_pct: number;
  recent_alerts: Alert[];
  market_is_open: boolean;
}

export interface HistorySummary {
  total_trades: number;
  total_realized_pnl: number;
  avg_pnl_pct: number;
  win_rate: number;
  winners: number;
  losers: number;
}

// Form types
export interface TradeFormData {
  ticker: string;
  trade_type: TradeType;
  entry_date: string;
  entry_price: string;
  position_size: string;
  trade_reason: string;
  // Stock
  shares: string;
  // Option
  option_type: OptionType | '';
  strike_price: string;
  expiration_date: string;
  premium_paid: string;
  contracts: string;
  // Vertical
  strategy_type: string;
  long_strike: string;
  long_premium: string;
  long_option_type: OptionType | '';
  short_strike: string;
  short_premium: string;
  short_option_type: OptionType | '';
  net_debit_credit: string;
  max_profit: string;
}
