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
  breakoutType: "BULLISH" | "BEARISH";
  color: string;
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
