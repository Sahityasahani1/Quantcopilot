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

export interface DRLAgentPlaybook {
  stance: string;
  entryZone: string;
  targetMilestone1: number;
  targetMilestone2: number;
  invalidationRule: string;
  riskRewardRatio: number;
  sizingAdvice: string;
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
  suggestedStopLoss?: number;
  suggestedTarget?: number;
  recommendedQuantity?: number;
  sizingFactor?: number;
  aiReasoning?: string;
  userPlaybook?: DRLAgentPlaybook;
  metricExplanations?: {
    policyEntropy: string;
    stateValue: string;
    sizingFactor: string;
  };
  confidenceBreakdown?: {
    directionalConviction: number;
    modelCertaintyPct: number;
    upsidePotentialPct: number;
    downsideRiskPct: number;
  };
  timestamp: string;
}

export interface DRLEquityPoint {
  barIndex: number;
  step: number;
  agentEquity: number;
  benchmarkEquity: number;
  drawdownPct: number;
}

export interface DRLTradeLog {
  tradeId: number;
  action: string;
  entryStep: number;
  exitStep: number;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  pnl: number;
  status: string;
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
  simulatedTrades?: DRLTradeLog[];
  executionLatencyMs?: number;
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

export interface QuantileScenario {
  targetPrice?: number;
  floorPrice?: number;
  returnPct?: number;
  drawdownPct?: number;
  label: string;
}

export interface MultiHorizonMilestone {
  horizonDays: number;
  targetDate: string;
  predictedPrice: number;
  expectedReturnPct: number;
  upper80: number;
  lower80: number;
  upper95: number;
  lower95: number;
  volatilitySpread: number;
  stance: "BULLISH" | "BEARISH" | "RANGE_BOUND";
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
  scenarioBreakdown?: {
    bestCase: QuantileScenario;
    baseCase: QuantileScenario;
    worstCase: QuantileScenario;
  };
  multiHorizonForecast?: {
    horizon_30d: MultiHorizonMilestone;
    horizon_60d: MultiHorizonMilestone;
    horizon_90d: MultiHorizonMilestone;
  };
  horizon_30d?: MultiHorizonMilestone;
  horizon_60d?: MultiHorizonMilestone;
  horizon_90d?: MultiHorizonMilestone;
  forecastNarrative?: string;
  invalidationLevel?: number;
  traderTakeaway?: string;
  timestamp: string;
}
