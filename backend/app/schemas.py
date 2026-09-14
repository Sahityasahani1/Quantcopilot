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

class GNNRiskPayloadSchema(BaseModel):
    timestamp: str
    overall_system_risk: float
    regime_classification: str
    nodes: List[GNNRiskNodeSchema]
    adjacency_matrix: List[List[float]]

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





