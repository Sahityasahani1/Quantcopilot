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

export interface SectorVulnerability {
  sector: string;
  avg_risk: number;
  max_risk: number;
  node_count: number;
  status: "CRITICAL" | "ELEVATED" | "STABLE";
  symbols: string[];
}

export interface DistressedNode {
  symbol: string;
  asset_name: string;
  company_name?: string;
  sector?: string;
  correlation_to_source: number;
  baseline_risk: number;
  post_shock_risk: number;
  risk_delta: number;
  projected_price_delta_pct: number;
  contagion_severity: "CRITICAL" | "ELEVATED" | "LOW";
}

export interface SectorImpact {
  sector: string;
  avg_risk_increase: number;
  avg_post_risk: number;
  affected_nodes: number;
}

export interface GNNShockResponse {
  shocked_asset: string;
  shock_percentage: number;
  latency_ms: number;
  baseline_system_risk: number;
  post_shock_system_risk: number;
  system_risk_delta: number;
  contagion_status: "CRITICAL_CASCADE" | "ELEVATED_SPREAD" | "CONTAINED";
  top_cascade_victims: DistressedNode[];
  all_nodes: DistressedNode[];
  sector_impact: SectorImpact[];
  simulation_timestamp: string;
}

export interface GNNRiskPayload {
  timestamp: string;
  overall_system_risk: number;
  regime_classification: string;
  nodes: GNNRiskNode[];
  adjacency_matrix: number[][];
  sector_vulnerability?: SectorVulnerability[];
  high_risk_nodes?: string[];
  daily_date?: string;
  contagion_status?: string;
  updated_at?: string;
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

export type ActiveTab = 
  | "dashboard" 
  | "fno_terminal" 
  | "watchlist" 
  | "portfolio_lab" 
  | "ai_audit" 
  | "nse_market" 
  | "gnn_risk" 
  | "strategy" 
  | "alpha_forecaster"
  | "sebi_surveillance"
  | "settings";

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

export interface AssetPastMarket {
  return_1w_pct: number;
  return_1m_pct: number;
  return_1y_pct: number;
  rsi_14: number;
  ema_alignment: string;
  volatility_annualized_pct: number;
  high_52w: number;
  low_52w: number;
  range_52w_pct: number;
}

export interface AssetGovtPolicyAudit {
  exposure_level: string;
  policy_risk_score: number;
  applicable_circulars: string[];
  policy_stance: string;
  key_policy_summary: string;
}

export interface AssetFuturePrediction {
  dominant_stance: string;
  confidence_pct: number;
  horizon_days: number;
  target_price: number;
  expected_return_pct: number;
  bullish_target_2sigma: number;
  bearish_floor_2sigma: number;
  alpha_driver: string;
  trajectory_points: Array<{
    step: number;
    timestamp: string;
    base_price: number;
    bullish_price: number;
    bearish_price: number;
  }>;
}

export interface AssetAuditItem {
  symbol: string;
  name: string;
  asset_type: "STOCK" | "INDEX_FUND";
  sector: string;
  spot_price: number;
  day_change: number;
  day_change_pct: number;
  market_cap_or_aum_cr: number;
  past_market: AssetPastMarket;
  govt_policy: AssetGovtPolicyAudit;
  future_prediction: AssetFuturePrediction;
  executive_verdict: string;
  investorFit?: string;
  riskGrade?: string;
  whyQuantCopilotLikes?: string;
  actionablePlaybook?: string;
  timestamp: string;
}

export interface UniverseAuditResponse {
  timestamp: string;
  total_assets: number;
  stocks_count: number;
  index_funds_count: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  top_policy_tailwind: string;
  items: AssetAuditItem[];
}

export interface LiveYfinanceQuote {
  symbol: string;
  yf_symbol: string;
  company_name?: string;
  exchange?: string;
  price: number;
  prev_close?: number;
  open_price?: number;
  day_high?: number;
  day_low?: number;
  change_pts: number;
  change_pct: number;
  volume: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  market_cap_cr?: number;
  pe_ratio?: number;
  currency: string;
  last_updated: string;
  source: string;
}

export interface LabPortfolioPosition {
  id: string;
  symbol: string;
  company_name?: string;
  exchange: string;
  quantity: number;
  entry_price: number;
  side: "LONG" | "SHORT";
  added_at: string;
}

export interface CustomerProfile {
  customer_id: string;
  name: string;
  email: string;
  account_tier: string;
  cash_balance: number;
  created_at?: string;
  last_login?: string;
  positions_count?: number;
  total_equity?: number;
  auth_token?: string;
}

export interface CustomerAuthResponse {
  status: string;
  message: string;
  auth_token?: string;
  customer?: CustomerProfile;
  portfolio?: PortfolioSummary;
  live_quotes?: Record<string, LiveYfinanceQuote>;
  live_synced: boolean;
  synced_at?: string;
}

export interface CustomerLivePortfolioResponse {
  customer: CustomerProfile;
  summary: PortfolioSummary;
  live_quotes: Record<string, LiveYfinanceQuote>;
  synced_at: string;
  source: string;
}

export * from "./trading";




