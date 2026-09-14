export type DRLActionType = "LONG" | "SHORT" | "HOLD" | "HEDGE";

export interface DRLActionDistribution {
  action: DRLActionType;
  probability: number;
  probPct: number;
  qValue: number;
}

export interface DRLSignalDriver {
  feature: string;
  importancePct: number;
}

export interface DRLAgentSignal {
  symbol: string;
  currentPrice: number;
  recommendedAction: DRLActionType;
  confidencePct: number;
  stateValue: number;
  policyEntropy: number;
  actionDistribution: DRLActionDistribution[];
  topSignalDrivers: DRLSignalDriver[];
  timestamp: string;
}

export interface DRLEquityPoint {
  barIndex: number;
  step: number;
  agentEquity: number;
  benchmarkEquity: number;
  drawdownPct: number;
}

export interface DRLBacktestResult {
  symbol: string;
  initialCapital: number;
  finalAgentEquity: number;
  finalBenchmarkEquity: number;
  agentReturnPct: number;
  benchmarkReturnPct: number;
  alphaPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  benchmarkMaxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  actionDistribution: {
    LONG: number;
    SHORT: number;
    HOLD: number;
    HEDGE: number;
  };
  equityCurve: DRLEquityPoint[];
  riskProfile: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  leverage: number;
}

export interface FeatureAttentionItem {
  feature: string;
  weight: number;
  importancePct: number;
}

export interface DeepForecastPoint {
  step: number;
  timestamp: string;
  basePrice: number;
  upperConfidence80: number;
  lowerConfidence80: number;
  upperConfidence95: number;
  lowerConfidence95: number;
  bullishPrice: number;
  bearishPrice: number;
  goalPathPrice: number;
}

export interface DeepForecastData {
  symbol: string;
  currentPrice: number;
  horizonBars: number;
  dominantTrend: "BULLISH" | "BEARISH" | "RANGE_BOUND";
  trendConfidence: number;
  expectedDriftPct: number;
  volatilityEnvelopePct: number;
  trajectory: DeepForecastPoint[];
  featureImportance: FeatureAttentionItem[];
  recentTemporalAttention: number[];
  timestamp: string;
}
