export interface Position {
  symbol: string;
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  side: "LONG" | "SHORT";
  leverage: number;
}

export interface PortfolioSummary {
  total_equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  daily_pnl: number;
  daily_pnl_percentage: number;
  net_exposure: number;
  margin_usage: number;
  sharpe_ratio: number;
  var_99: number;
  positions: Position[];
}

export interface GNNRiskNode {
  node_id: string;
  asset_name: string;
  company_name?: string;
  sector?: string;
  risk_score: number;
  centrality: number;
  systemic_contagion_factor: number;
  features: number[];
}

export interface GNNRiskPayload {
  timestamp: string;
  overall_system_risk: number;
  regime_classification: string;
  nodes: GNNRiskNode[];
  adjacency_matrix: number[][];
}

export interface MarketTicker {
  symbol: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
}

export interface MarketStatus {
  status: "OPEN" | "CLOSED" | "PRE_OPEN" | "POST_CLOSE" | "WEEKEND";
  message: string;
  current_time_ist: string;
  next_session_time_ist: string;
  is_trading_day: boolean;
  is_market_open: boolean;
  session_phase: string;
  seconds_to_next_session: number;
}

export interface IndianMarketTicker {
  token: string;
  symbol: string;
  company_name?: string;
  sector?: string;
  exchange?: "NSE" | "BSE" | string;
  price: number; // Last Traded Price (LTP)
  prev_close?: number;
  open_price?: number;
  day_high?: number;
  day_low?: number;
  change_24h: number;
  change_pts?: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  bid: number;
  ask: number;
  latency_ms: number;
  type: string;
  pe_ratio?: number;
  market_cap_cr?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  timestamp: number;
}

export interface IndianMarketPayload {
  exchange: string;
  timestamp: string;
  latency_avg_ms: number;
  market_status?: MarketStatus;
  tickers: IndianMarketTicker[];
}

export interface HistoricalCandle {
  symbol: string;
  exchange?: string;
  date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  pct_change: number;
}

export interface HistoricalSeriesPayload {
  symbol: string;
  exchange?: string;
  company_name: string;
  period: string;
  candles: HistoricalCandle[];
}


export interface NiftySectorSummary {
  sector_name: string;
  total_companies: number;
  avg_change_24h: number;
  top_performer: string;
  market_cap_weight_pct: number;
}

export interface PositionInput {
  symbol: string;
  quantity: number;
  entry_price: number;
  side: "LONG" | "SHORT";
  leverage?: number;
}

export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export type ActiveTab = "dashboard" | "fno_terminal" | "analytics" | "gnn_risk" | "nse_market" | "strategy" | "settings";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndexTicker {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
  high: number;
  low: number;
}

export interface OptionStrike {
  strike_price: number;
  call_oi: number;
  call_change_oi: number;
  call_volume: number;
  call_iv: number;
  call_ltp: number;
  call_delta: number;
  call_gamma: number;
  put_ltp: number;
  put_iv: number;
  put_volume: number;
  put_delta: number;
  put_gamma: number;
  put_oi: number;
  put_change_oi: number;
}

export interface OptionChainPayload {
  underlying_symbol: string;
  spot_price: number;
  pcr_ratio: number;
  max_pain_strike: number;
  total_call_oi: number;
  total_put_oi: number;
  expiry_date: string;
  gnn_gamma_risk_index: number;
  gnn_regime: string;
  strikes: OptionStrike[];
}

export interface MarketDepthEntry {
  price: number;
  orders: number;
  qty: number;
}

export interface MarketDepth {
  symbol: string;
  bids: MarketDepthEntry[];
  asks: MarketDepthEntry[];
  total_buy_qty: number;
  total_sell_qty: number;
}

export interface GNNContagionSignal {
  timestamp: string;
  systemic_contagion: number;
  contagion_status: string;
  gamma_squeeze_prob: number;
  predicted_iv_drift: number;
  high_risk_nodes: string[];
}

export * from "./trading";


