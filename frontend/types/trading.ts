export type ChartType = "CANDLE" | "HEIKIN_ASHI" | "LINE" | "AREA";

export type DrawingToolType = 
  | "CURSOR"
  | "BRUSH"
  | "SHORT_POSITION"
  | "LONG_POSITION"
  | "TRENDLINE"
  | "HORIZONTAL_RAY"
  | "FIBONACCI"
  | "RECTANGLE"
  | "RULER"
  | "PATTERN_DOUBLE_BOTTOM"
  | "PATTERN_DOUBLE_TOP"
  | "PATTERN_HEAD_AND_SHOULDERS"
  | "PATTERN_BULL_FLAG"
  | "PATTERN_ASCENDING_TRIANGLE";

export interface Point {
  x: number;
  y: number;
  price?: number;
  time?: number;
}

export interface BrushStroke {
  id: string;
  type: "BRUSH";
  points: Point[];
  color: string;
  width: number;
}

export interface PositionToolData {
  id: string;
  type: "SHORT_POSITION" | "LONG_POSITION";
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  quantity: number;
  x: number;
  y: number;
  width: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  targetPct: number;
  stopLossPct: number;
}

export interface TrendlineData {
  id: string;
  type: "TRENDLINE" | "HORIZONTAL_RAY";
  start: Point;
  end: Point;
  color: string;
  width: number;
  isRay?: boolean;
}

export interface FibonacciData {
  id: string;
  type: "FIBONACCI";
  start: Point;
  end: Point;
  levels: { ratio: number; price: number; color: string }[];
}

export interface RectangleData {
  id: string;
  type: "RECTANGLE";
  start: Point;
  end: Point;
  color: string;
  label?: string;
}

export interface RulerData {
  id: string;
  type: "RULER";
  start: Point;
  end: Point;
  priceDelta: number;
  pctChange: number;
  barsCount: number;
}

export interface PatternPivot {
  index: number;
  time: number;
  price: number;
  label: string;
}

export interface DetectedPatternAPI {
  id: string;
  pattern_type: 
    | "PATTERN_DOUBLE_BOTTOM"
    | "PATTERN_DOUBLE_TOP"
    | "PATTERN_HEAD_AND_SHOULDERS"
    | "PATTERN_BULL_FLAG"
    | "PATTERN_ASCENDING_TRIANGLE";
  name: string;
  confidence_pct: number;
  breakout_type: "BULLISH" | "BEARISH";
  neckline_price: number;
  target_price: number;
  stop_loss_price: number;
  target_pct: number;
  stop_loss_pct: number;
  risk_reward_ratio: number;
  status: string;
  pivots: PatternPivot[];
  description: string;
}

export interface ChartPatternData {
  id: string;
  type: 
    | "PATTERN_DOUBLE_BOTTOM"
    | "PATTERN_DOUBLE_TOP"
    | "PATTERN_HEAD_AND_SHOULDERS"
    | "PATTERN_BULL_FLAG"
    | "PATTERN_ASCENDING_TRIANGLE";
  name: string;
  points: Point[];
  necklinePrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  targetPct?: number;
  stopLossPct?: number;
  riskRewardRatio?: number;
  breakoutType: "BULLISH" | "BEARISH";
  color: string;
  confidencePct?: number;
  status?: string;
  description?: string;
  isAiDetected?: boolean;
}


export type ChartDrawingObject = 
  | BrushStroke 
  | PositionToolData 
  | TrendlineData 
  | FibonacciData 
  | RectangleData 
  | RulerData 
  | ChartPatternData;

export interface IndicatorConfig {
  ema9: boolean;
  ema20: boolean;
  ema50: boolean;
  ema200: boolean;
  bollingerBands: boolean;
  supertrend: boolean;
  vwap: boolean;
  rsi: boolean;
  macd: boolean;
  volumeProfile: boolean;
}

export interface GoalSettings {
  targetProfitAmount: number; // in ₹
  targetReturnPct: number; // in %
  targetPrice: number; // target stock price
  timeHorizonDays: number; // target days
  capitalAllocated: number; // ₹ invested
  riskTolerance: "CONSERVATIVE" | "MODERATE" | "AGGRESSIVE";
  goalType: "PROFIT_INR" | "RETURN_PCT" | "PRICE_TARGET";
}

export interface PredictionScenarioPoint {
  timeOffset: number; // in days or candle intervals
  timestamp: string;
  basePrice: number;
  bullishPrice: number;
  bearishPrice: number;
  goalPathPrice: number;
  upperConfidence95: number;
  lowerConfidence95: number;
  upperConfidence80: number;
  lowerConfidence80: number;
}

export interface PredictionPayload {
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  expectedDate: string;
  feasibilityScore: number; // 0 - 100%
  expectedReturnPct: number;
  recommendedPosition: "BUY_CALL" | "BUY_STOCK" | "SELL_PUT" | "SHORT_STOCK" | "LONG_FUTURES";
  recommendedEntry: number;
  recommendedStopLoss: number;
  recommendedTarget: number;
  suggestedLotsOrQty: number;
  trajectoryPoints: PredictionScenarioPoint[];
  milestones: {
    day: number;
    price: number;
    label: string;
    achievedPct: number;
  }[];
  appliedToChart: boolean;
}

export interface GrowwCompanyOverview {
  symbol: string;
  companyName: string;
  sector: string;
  currentPrice: number;
  dayChange: number;
  dayChangePts: number;
  todayLow: number;
  todayHigh: number;
  openPrice: number;
  prevClose: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  upperCircuit: number;
  lowerCircuit: number;
  volume: number;
  totalTradedValueCr: number;
  marketCapCr: number;
  peRatio: number;
  pbRatio: number;
  industryPE: number;
  debtToEquity: number;
  roe: number;
  eps: number;
  dividendYield: number;
  bookValue: number;
  technicalSentiment: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  pcrRatio: number;
  maxPain: number;
  fiiNetFlowCr: number;
  diiNetFlowCr: number;
}

export interface OrderInput {
  symbol: string;
  side: "BUY" | "SELL";
  productType: "INTRADAY" | "DELIVERY" | "OPTIONS_NRML";
  orderType: "MARKET" | "LIMIT" | "SL_LIMIT";
  quantity: number;
  price: number;
  triggerPrice?: number;
  stopLossPrice?: number;
  targetPrice?: number;
}

export interface FinbertNewsItem {
  id: string;
  title: string;
  publisher: string;
  published_at: string;
  url: string;
  summary: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentiment_score: number;
  confidence_pct: number;
  keywords: string[];
}

export interface FinbertOverallSentiment {
  overall_score: number;
  sentiment_label: "BULLISH" | "NEUTRAL" | "BEARISH";
  confidence_pct: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  bullish_ratio: number;
  sentiment_trend: "IMPROVING" | "DETERIORATING" | "STABLE";
}

export interface SebiPolicyItem {
  circular_no: string;
  title: string;
  issuing_authority: string;
  category: string;
  issue_date: string;
  effective_date: string;
  impact_level: "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  affected_sectors: string[];
  affected_tickers: string[];
  regulatory_implication: string;
}

export interface CompanyPolicyImpact {
  symbol: string;
  policy_risk_score: number;
  exposure_level: "HIGH_MONITORING" | "MODERATE" | "LOW_RISK";
  matching_policies_count: number;
  status_text: string;
  active_policies: SebiPolicyItem[];
}

export interface TickerDataSummary {
  symbol: string;
  company_name: string;
  spot_price: number;
  day_change: number;
  day_change_pct: number;
  day_high: number;
  day_low: number;
  high_52w: number;
  low_52w: number;
  pe_ratio?: number;
  market_cap_cr?: number;
  volume_24h?: number;
  rsi_14: number;
  beta?: number;
  dominant_trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  executive_summary: string;
}

export interface FuturePriceForecastPoint {
  step: number;
  timestamp: string;
  base_price: number;
  bullish_price: number;
  bearish_price: number;
  upper_95: number;
  lower_95: number;
  upper_80: number;
  lower_80: number;
}

export interface FuturePriceForecast {
  dominant_trend: "BULLISH" | "BEARISH" | "RANGE_BOUND";
  trend_confidence_pct: number;
  expected_return_pct: number;
  horizon_periods: number;
  current_price: number;
  target_price: number;
  trajectories: FuturePriceForecastPoint[];
  key_drivers: { feature: string; weight: number; importancePct: number }[];
}

export interface UniverseTickerMatrixRow {
  symbol: string;
  company_name: string;
  spot_price: number;
  day_change_pct: number;
  finbert_sentiment: string;
  finbert_score: number;
  future_trend: string;
  future_target: number;
  expected_return_pct: number;
  policy_impact_level: string;
  policy_risk_score: number;
}

export interface AiScanPayload {
  symbol: string;
  company_name: string;
  timestamp: string;
  summary: TickerDataSummary;
  future_price: FuturePriceForecast;
  finbert_sentiment: FinbertOverallSentiment;
  news_feed: FinbertNewsItem[];
  company_policy: CompanyPolicyImpact;
  all_sebi_policies: SebiPolicyItem[];
  universe_matrix: UniverseTickerMatrixRow[];
}

