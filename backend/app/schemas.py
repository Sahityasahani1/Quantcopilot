from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class PositionSchema(BaseModel):
    symbol: str
    quantity: float
    entry_price: float
    current_price: float
    unrealized_pnl: float
    realized_pnl: float
    side: str
    leverage: float

class PositionInputSchema(BaseModel):
    symbol: str
    quantity: float
    entry_price: float
    current_price: Optional[float] = None
    unrealized_pnl: Optional[float] = 0.0
    realized_pnl: Optional[float] = 0.0
    side: Optional[str] = "LONG"
    leverage: Optional[float] = 1.0

class SyncPositionsRequestSchema(BaseModel):
    positions: List[PositionInputSchema]

class SyncPositionsResponseSchema(BaseModel):
    status: str
    message: str
    count: int
    positions: List[PositionSchema]

class PortfolioSummarySchema(BaseModel):
    total_equity: float
    realized_pnl: float
    unrealized_pnl: float
    daily_pnl: float
    daily_pnl_percentage: float
    net_exposure: float
    margin_usage: float
    sharpe_ratio: float
    var_99: float
    positions: List[PositionSchema]

class GNNRiskNodeSchema(BaseModel):
    node_id: str
    asset_name: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    risk_score: float
    centrality: float
    systemic_contagion_factor: float
    features: List[float]

class SectorVulnerabilitySchema(BaseModel):
    sector: str
    avg_risk: float
    max_risk: float
    node_count: int
    status: str
    symbols: List[str]

class GNNRiskPayloadSchema(BaseModel):
    timestamp: str
    overall_system_risk: float
    regime_classification: str
    nodes: List[GNNRiskNodeSchema]
    adjacency_matrix: List[List[float]]
    sector_vulnerability: Optional[List[SectorVulnerabilitySchema]] = None
    high_risk_nodes: Optional[List[str]] = None
    daily_date: Optional[str] = None
    contagion_status: Optional[str] = None
    updated_at: Optional[str] = None

class GNNShockRequestSchema(BaseModel):
    symbol: str
    shock_percentage: float = -5.0
    damping: float = 0.82

class DistressedNodeSchema(BaseModel):
    symbol: str
    asset_name: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    correlation_to_source: float
    baseline_risk: float
    post_shock_risk: float
    risk_delta: float
    projected_price_delta_pct: float
    contagion_severity: str

class SectorImpactSchema(BaseModel):
    sector: str
    avg_risk_increase: float
    avg_post_risk: float
    affected_nodes: int

class GNNShockResponseSchema(BaseModel):
    shocked_asset: str
    shock_percentage: float
    latency_ms: float
    baseline_system_risk: float
    post_shock_system_risk: float
    system_risk_delta: float
    contagion_status: str
    top_cascade_victims: List[DistressedNodeSchema]
    all_nodes: List[DistressedNodeSchema]
    sector_impact: List[SectorImpactSchema]
    simulation_timestamp: str

class SystemHealthSchema(BaseModel):
    status: str
    postgres_connected: bool
    redis_connected: bool
    version: str

class WSMessageSchema(BaseModel):
    event: str
    data: Dict[str, Any]

class MarketStatusSchema(BaseModel):
    status: str  # OPEN, CLOSED, PRE_OPEN, POST_CLOSE, WEEKEND
    message: str
    current_time_ist: str
    next_session_time_ist: str
    is_trading_day: bool
    is_market_open: bool
    session_phase: str
    seconds_to_next_session: int

class IndianMarketTickerSchema(BaseModel):
    token: str
    symbol: str
    company_name: Optional[str] = None
    sector: Optional[str] = "Equities"
    exchange: Optional[str] = "NSE"
    price: float  # Last Traded Price (LTP)
    prev_close: Optional[float] = None
    open_price: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    change_24h: float
    change_pts: Optional[float] = 0.0
    volume_24h: int
    high_24h: float
    low_24h: float
    bid: float
    ask: float
    latency_ms: float
    type: str
    pe_ratio: Optional[float] = None
    market_cap_cr: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    timestamp: int

class IndianMarketPayloadSchema(BaseModel):
    exchange: str
    timestamp: str
    latency_avg_ms: float
    market_status: Optional[MarketStatusSchema] = None
    tickers: List[IndianMarketTickerSchema]


class HistoricalCandleSchema(BaseModel):
    symbol: str
    exchange: Optional[str] = "NSE"
    date: str
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: int
    pct_change: float

class HistoricalSeriesPayloadSchema(BaseModel):
    symbol: str
    exchange: Optional[str] = "NSE"
    company_name: str
    period: str
    candles: List[HistoricalCandleSchema]

class NiftySectorSummarySchema(BaseModel):
    sector_name: str
    total_companies: int
    avg_change_24h: float
    top_performer: str
    market_cap_weight_pct: float

class SecurityMasterSchema(BaseModel):
    symbol: str
    exchange: str
    scrip_code: Optional[str] = None
    isin: Optional[str] = None
    company_name: str
    sector: Optional[str] = "Equities"
    industry: Optional[str] = None
    is_active: bool = True
    market_cap_cr: Optional[float] = 0.0

class SecuritySearchItemSchema(BaseModel):
    symbol: str
    exchange: str
    company_name: str
    sector: Optional[str] = "Equities"
    scrip_code: Optional[str] = None
    isin: Optional[str] = None
    yf_symbol: str

class SecuritiesCatalogPayloadSchema(BaseModel):
    total_count: int
    page: int
    page_size: int
    securities: List[SecurityMasterSchema]

class MasterSyncResponseSchema(BaseModel):
    status: str
    nse_count: int
    bse_count: int
    message: str

class OptionStrikeSchema(BaseModel):
    strike_price: float
    call_oi: int
    call_change_oi: int
    call_volume: int
    call_iv: float
    call_ltp: float
    call_delta: float
    call_gamma: float
    put_ltp: float
    put_iv: float
    put_volume: int
    put_delta: float
    put_gamma: float
    put_oi: int
    put_change_oi: int

class OptionChainPayloadSchema(BaseModel):
    underlying_symbol: str
    spot_price: float
    pcr_ratio: float
    max_pain_strike: float
    total_call_oi: int
    total_put_oi: int
    expiry_date: str
    gnn_gamma_risk_index: float
    gnn_regime: str
    strikes: List[OptionStrikeSchema]

class MarketDepthEntrySchema(BaseModel):
    price: float
    orders: int
    qty: int

class MarketDepthSchema(BaseModel):
    symbol: str
    bids: List[MarketDepthEntrySchema]
    asks: List[MarketDepthEntrySchema]
    total_buy_qty: int
    total_sell_qty: int

class CandleBarSchema(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: int

class GNNContagionSignalSchema(BaseModel):
    timestamp: str
    systemic_contagion: float
    contagion_status: str
    gamma_squeeze_prob: float
    predicted_iv_drift: float
    high_risk_nodes: List[str]

class PredictionScenarioPointSchema(BaseModel):
    timeOffset: int
    timestamp: str
    basePrice: float
    bullishPrice: float
    bearishPrice: float
    goalPathPrice: float
    upperConfidence95: float
    lowerConfidence95: float
    upperConfidence80: float
    lowerConfidence80: float

class GoalPredictionResponseSchema(BaseModel):
    symbol: str
    currentPrice: float
    targetPrice: float
    expectedDate: str
    feasibilityScore: float
    expectedReturnPct: float
    recommendedPosition: str
    recommendedEntry: float
    recommendedStopLoss: float
    recommendedTarget: float
    suggestedLotsOrQty: int
    trajectoryPoints: List[PredictionScenarioPointSchema]
    milestones: List[Dict[str, Any]]
    featureImportance: Optional[List[Dict[str, Any]]] = None
    neuralTrend: Optional[str] = None
    neuralConfidence: Optional[float] = None
    feasibilityDiagnosis: Optional[str] = None
    safetyChecklist: Optional[List[Dict[str, str]]] = None
    traderActionSummary: Optional[str] = None

# ==================== DEEP LEARNING SCHEMAS ====================

class FeatureAttentionItemSchema(BaseModel):
    feature: str
    weight: float
    importancePct: float

class DeepForecastPointSchema(BaseModel):
    step: int
    timestamp: str
    basePrice: float
    upperConfidence80: float
    lowerConfidence80: float
    upperConfidence95: float
    lowerConfidence95: float
    bullishPrice: float
    bearishPrice: float
    goalPathPrice: float

class DeepForecastResponseSchema(BaseModel):
    symbol: str
    currentPrice: float
    horizonBars: int
    dominantTrend: str
    trendConfidence: float
    expectedDriftPct: float
    volatilityEnvelopePct: float
    trajectory: List[DeepForecastPointSchema]
    featureImportance: List[FeatureAttentionItemSchema]
    recentTemporalAttention: List[float]
    scenarioBreakdown: Optional[Dict[str, Any]] = None
    multiHorizonForecast: Optional[Dict[str, Any]] = None
    horizon_30d: Optional[Dict[str, Any]] = None
    horizon_60d: Optional[Dict[str, Any]] = None
    horizon_90d: Optional[Dict[str, Any]] = None
    forecastNarrative: Optional[str] = None
    invalidationLevel: Optional[float] = None
    traderTakeaway: Optional[str] = None
    timestamp: str


class DRLActionDistributionSchema(BaseModel):
    action: str
    probability: float
    probPct: float
    qValue: float

class DRLSignalDriverSchema(BaseModel):
    feature: str
    importancePct: float

class DRLAgentSignalResponseSchema(BaseModel):
    symbol: str
    currentPrice: float
    recommendedAction: str
    confidencePct: float
    stateValue: float
    policyEntropy: float
    actionDistribution: List[DRLActionDistributionSchema]
    topSignalDrivers: List[DRLSignalDriverSchema]
    suggestedStopLoss: Optional[float] = None
    suggestedTarget: Optional[float] = None
    recommendedQuantity: Optional[int] = None
    sizingFactor: Optional[float] = None
    aiReasoning: Optional[str] = None
    userPlaybook: Optional[Dict[str, Any]] = None
    metricExplanations: Optional[Dict[str, str]] = None
    confidenceBreakdown: Optional[Dict[str, float]] = None
    timestamp: str

class DRLEquityPointSchema(BaseModel):
    barIndex: int
    step: int
    agentEquity: float
    benchmarkEquity: float
    drawdownPct: float

class DRLBacktestRequestSchema(BaseModel):
    symbol: str = "NIFTY 50"
    initialCapital: float = 100000.0
    leverage: float = 1.0
    timeframe: str = "5m"
    riskProfile: str = "BALANCED"

class DRLTradeLogSchema(BaseModel):
    tradeId: int
    action: str
    entryStep: int
    exitStep: int
    entryPrice: float
    exitPrice: float
    returnPct: float
    pnl: float
    status: str

class DRLBacktestResponseSchema(BaseModel):
    symbol: str
    initialCapital: float
    finalAgentEquity: float
    finalBenchmarkEquity: float
    agentReturnPct: float
    benchmarkReturnPct: float
    alphaPct: float
    sharpeRatio: float
    sortinoRatio: float
    maxDrawdownPct: float
    benchmarkMaxDrawdownPct: float
    winRatePct: float
    profitFactor: float
    totalTrades: int
    actionDistribution: Dict[str, int]
    equityCurve: List[DRLEquityPointSchema]
    simulatedTrades: Optional[List[DRLTradeLogSchema]] = None
    executionLatencyMs: Optional[float] = None
    riskProfile: str
    leverage: float


class DBSyncStatsSchema(BaseModel):
    database_connected: bool
    total_securities_master: Optional[int] = 0
    nse_securities: Optional[int] = 0
    bse_securities: Optional[int] = 0
    total_cached_candles: Optional[int] = 0
    symbols_with_history: Optional[int] = 0
    earliest_date: Optional[str] = None
    latest_date: Optional[str] = None
    top_cached_instruments: Optional[List[Dict[str, Any]]] = []
    error: Optional[str] = None
    message: Optional[str] = None


class DirectDBSyncResponseSchema(BaseModel):
    status: str
    total_universe_count: int
    successful_symbols: int
    failed_symbols: int
    total_candles_persisted: int
    period: str
    elapsed_seconds: float


class SyncSingleStockResponseSchema(BaseModel):
    symbol: str
    exchange: str
    status: str
    synced_candles: Optional[int] = 0
    total_db_candles: Optional[int] = 0
    date_range: Optional[str] = None
    latest_price: Optional[float] = None
    elapsed_ms: Optional[float] = 0.0
    error: Optional[str] = None


class PatternPivotSchema(BaseModel):
    index: int
    time: int
    price: float
    label: str


class DetectedChartPatternSchema(BaseModel):
    id: str
    pattern_type: str
    name: str
    confidence_pct: float
    breakout_type: str
    neckline_price: float
    target_price: float
    stop_loss_price: float
    target_pct: float
    stop_loss_pct: float
    risk_reward_ratio: float
    status: str
    pivots: List[PatternPivotSchema]
    description: str
    actionable_guidance: Optional[str] = None
    actionableGuidance: Optional[str] = None


class FinbertNewsItemSchema(BaseModel):
    id: str
    title: str
    publisher: str
    published_at: str
    url: str
    summary: str
    sentiment: str
    sentiment_score: float
    confidence_pct: float
    keywords: List[str]


class FinbertOverallSentimentSchema(BaseModel):
    overall_score: float
    sentiment_label: str
    confidence_pct: float
    bullish_count: int
    bearish_count: int
    neutral_count: int
    bullish_ratio: float
    sentiment_trend: str
    market_narrative: Optional[str] = None
    marketNarrative: Optional[str] = None
    bullish_catalysts: Optional[List[str]] = None
    bullishCatalysts: Optional[List[str]] = None
    caution_flags: Optional[List[str]] = None
    cautionFlags: Optional[List[str]] = None
    trader_action_recommendation: Optional[str] = None
    traderActionRecommendation: Optional[str] = None


class SebiPolicyItemSchema(BaseModel):
    circular_no: str
    title: str
    issuing_authority: str
    category: str
    issue_date: str
    effective_date: str
    impact_level: str
    summary: str
    affected_sectors: List[str]
    affected_tickers: List[str]
    regulatory_implication: str


class CompanyPolicyImpactSchema(BaseModel):
    symbol: str
    policy_risk_score: float
    exposure_level: str
    matching_policies_count: int
    status_text: str
    active_policies: List[SebiPolicyItemSchema]


class TickerDataSummarySchema(BaseModel):
    symbol: str
    company_name: str
    spot_price: float
    day_change: float
    day_change_pct: float
    day_high: float
    day_low: float
    high_52w: float
    low_52w: float
    pe_ratio: Optional[float] = None
    market_cap_cr: Optional[float] = None
    volume_24h: Optional[int] = None
    rsi_14: float
    beta: Optional[float] = None
    dominant_trend: str
    executive_summary: str
    copilot_verdict: Optional[Dict[str, Any]] = None
    copilotVerdict: Optional[Dict[str, Any]] = None
    key_catalysts: Optional[List[str]] = None
    keyCatalysts: Optional[List[str]] = None
    key_risks: Optional[List[str]] = None
    keyRisks: Optional[List[str]] = None
    action_advice: Optional[str] = None
    actionAdvice: Optional[str] = None


class FuturePriceForecastPointSchema(BaseModel):
    step: int
    timestamp: str
    base_price: float
    bullish_price: float
    bearish_price: float
    upper_95: float
    lower_95: float
    upper_80: float
    lower_80: float


class FuturePriceForecastSchema(BaseModel):
    dominant_trend: str
    trend_confidence_pct: float
    expected_return_pct: float
    horizon_periods: int
    current_price: float
    target_price: float
    trajectories: List[FuturePriceForecastPointSchema]
    key_drivers: List[Dict[str, Any]]


class UniverseTickerMatrixRowSchema(BaseModel):
    symbol: str
    company_name: str
    spot_price: float
    day_change_pct: float
    finbert_sentiment: str
    finbert_score: float
    future_trend: str
    future_target: float
    expected_return_pct: float
    policy_impact_level: str
    policy_risk_score: float


class AiScanPayloadSchema(BaseModel):
    symbol: str
    company_name: str
    timestamp: str
    summary: TickerDataSummarySchema
    future_price: FuturePriceForecastSchema
    finbert_sentiment: FinbertOverallSentimentSchema
    news_feed: List[FinbertNewsItemSchema]
    company_policy: CompanyPolicyImpactSchema
    all_sebi_policies: List[SebiPolicyItemSchema]
    universe_matrix: List[UniverseTickerMatrixRowSchema]


class NewsSyncStatusSchema(BaseModel):
    is_syncing: bool
    last_sync_timestamp: str
    next_sync_seconds: int
    interval_seconds: int
    total_news_cached: int
    total_sebi_circulars: int
    sources: List[str]
    message: str


# ==================== AI UNIVERSE AUDIT & PREDICTION SCHEMAS ====================

class AssetPastMarketSchema(BaseModel):
    return_1w_pct: float
    return_1m_pct: float
    return_1y_pct: float
    rsi_14: float
    ema_alignment: str
    volatility_annualized_pct: float
    high_52w: float
    low_52w: float
    range_52w_pct: float


class AssetGovtPolicyAuditSchema(BaseModel):
    exposure_level: str
    policy_risk_score: float
    applicable_circulars: List[str]
    policy_stance: str
    key_policy_summary: str


class AssetFuturePredictionSchema(BaseModel):
    dominant_stance: str
    confidence_pct: float
    horizon_days: int
    target_price: float
    expected_return_pct: float
    bullish_target_2sigma: float
    bearish_floor_2sigma: float
    alpha_driver: str
    trajectory_points: List[Dict[str, Any]]


class AssetAuditItemSchema(BaseModel):
    symbol: str
    name: str
    asset_type: str  # "STOCK" or "INDEX_FUND"
    sector: str
    spot_price: float
    day_change: float
    day_change_pct: float
    market_cap_or_aum_cr: float
    past_market: AssetPastMarketSchema
    govt_policy: AssetGovtPolicyAuditSchema
    future_prediction: AssetFuturePredictionSchema
    executive_verdict: str
    investor_fit: Optional[str] = None
    investorFit: Optional[str] = None
    risk_grade: Optional[str] = None
    riskGrade: Optional[str] = None
    why_quantcopilot_likes: Optional[str] = None
    whyQuantCopilotLikes: Optional[str] = None
    actionable_playbook: Optional[str] = None
    actionablePlaybook: Optional[str] = None
    timestamp: str


class UniverseAuditResponseSchema(BaseModel):
    timestamp: str
    total_assets: int
    stocks_count: int
    index_funds_count: int
    bullish_count: int
    bearish_count: int
    neutral_count: int
    top_policy_tailwind: str
    items: List[AssetAuditItemSchema]


class LiveYfinanceQuoteSchema(BaseModel):
    symbol: str
    yf_symbol: str
    company_name: Optional[str] = None
    exchange: Optional[str] = "NSE"
    price: float
    prev_close: Optional[float] = None
    open_price: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    change_pts: float
    change_pct: float
    volume: int
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    market_cap_cr: Optional[float] = None
    pe_ratio: Optional[float] = None
    currency: str = "INR"
    last_updated: str
    source: str = "yfinance"


class BatchLiveQuotesRequestSchema(BaseModel):
    symbols: List[str]


class BatchLiveQuotesResponseSchema(BaseModel):
    timestamp: str
    source: str = "yfinance"
    quotes: Dict[str, LiveYfinanceQuoteSchema]


class CustomerProfileSchema(BaseModel):
    customer_id: str
    name: str
    email: str
    account_tier: str = "PRO_QUANT"
    cash_balance: float = 500000.0
    created_at: Optional[str] = None
    last_login: Optional[str] = None
    positions_count: Optional[int] = 0
    total_equity: Optional[float] = 500000.0
    auth_token: Optional[str] = None


class CustomerLoginRequestSchema(BaseModel):
    identifier: str
    password: str


class CustomerRegisterRequestSchema(BaseModel):
    name: str
    email: str
    password: str
    initial_capital: Optional[float] = 500000.0
    account_tier: Optional[str] = "PRO_QUANT"


class CustomerAuthResponseSchema(BaseModel):
    status: str
    message: str
    auth_token: Optional[str] = None
    customer: Optional[CustomerProfileSchema] = None
    portfolio: Optional[PortfolioSummarySchema] = None
    live_quotes: Optional[Dict[str, LiveYfinanceQuoteSchema]] = None
    live_synced: bool = False
    synced_at: Optional[str] = None


class CustomerLivePortfolioResponseSchema(BaseModel):
    customer: CustomerProfileSchema
    summary: PortfolioSummarySchema
    live_quotes: Dict[str, LiveYfinanceQuoteSchema]
    synced_at: str
    source: str = "yfinance"











