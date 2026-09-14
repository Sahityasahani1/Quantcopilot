# QuantCopilot AI - Operational & Data Flows (`flow.md`)

This document outlines the complete operational architecture, data pipelines, network flows, machine learning execution traces, and Indian market session lifecycles for the **QuantCopilot AI** quantitative workstation.

---

## 1. High-Level System Architecture Flow

```mermaid
flowchart TD
    subgraph ExternalFeeds ["External Market Data & Archives"]
        NSE_CSV["NSE Official Master (EQUITY_L.csv)"]
        YF["Yahoo Finance API (Daily OHLCV)"]
        WS_FEED["Indian Broker / Live Tick Feed"]
    end

    subgraph IngestionLayer ["Data Ingestion & In-Memory Bus"]
        IngestScript["Batch Ingest Pipeline (ml_service/ingest_all_nse_bse.py)"]
        RedisBus[("Redis Cache & Pub/Sub (aioredis)")]
    end

    subgraph BackendGateway ["FastAPI Microservice (backend/app)"]
        MarketRouter["NSE Market Router (/api/v1/nse/*)"]
        PortfolioRouter["Portfolio & Risk Router (/api/v1/portfolio/*)"]
        WSRouter["WebSocket Streamer (/ws/live-feed)"]
        SessionEngine["IST Market Status Engine (UTC+05:30)"]
    end

    subgraph StorageLayer ["PostgreSQL Storage Layer"]
        SecMaster[("securities_master (All NSE & BSE)")]
        HistData[("historical_stock_data (OHLCV Series)")]
        PositionsTable[("positions & portfolio_summary")]
    end

    subgraph MLService ["Deep Learning & GNN Engine (ml_service)"]
        CausalGAT["CausalGraphXGAT Model (causal_gat.py)"]
        GRL["Gradient Reversal Layer (GRL)"]
        Attention["8-Head GAT Spatial Attention"]
        DRLAgent["Deep RL Actor-Critic Agent (drl_policy.py)"]
        DeepForecaster["Temporal Attention Forecaster (deep_forecaster.py)"]
        TrainPipeline["PyTorch Training Pipeline (train_models.py)"]
    end

    subgraph BackendGateway ["FastAPI Microservice (backend/app)"]
        MarketRouter["NSE Market Router (/api/v1/nse/*)"]
        PortfolioRouter["Portfolio & Risk Router (/api/v1/portfolio/*)"]
        StrategyRouter["Strategy & DRL Router (/api/v1/strategy/*)"]
        WSRouter["WebSocket Streamer (/ws/live-feed)"]
        SessionEngine["IST Market Status Engine (UTC+05:30)"]
    end

    subgraph StorageLayer ["PostgreSQL Storage Layer & Checkpoints"]
        SecMaster[("securities_master (All NSE & BSE)")]
        HistData[("historical_stock_data (OHLCV Series)")]
        PositionsTable[("positions & portfolio_summary")]
        ModelWeights[("PyTorch Weights (ml_service/checkpoints/)")]
    end

    subgraph FrontendTerminal ["Frontend Client (Next.js 16 + Turbopack)"]
        Store["Zustand Store (usePortfolioStore)"]
        UI_Header["Header (Live IST Clock & Session Badge)"]
        UI_PnL["PnL & Metrics Widget (Zerodha / Groww Eq)"]
        UI_Market["IndianMarketWidget (Real Quotes & Day Range)"]
        UI_Heatmap["RiskHeatmap (Correlation Grid)"]
        UI_StrategyLab["StrategyLab (DRL Agent & Deep Forecaster Studio)"]
    end

    NSE_CSV --> IngestScript
    YF --> IngestScript
    IngestScript --> SecMaster
    IngestScript --> HistData

    WS_FEED --> RedisBus
    RedisBus --> MarketRouter
    RedisBus --> WSRouter

    SecMaster <--> MarketRouter
    HistData <--> MarketRouter
    HistData <--> StrategyRouter
    PositionsTable <--> PortfolioRouter
    SessionEngine --> MarketRouter

    MarketRouter --> Store
    PortfolioRouter --> Store
    StrategyRouter --> Store
    WSRouter <--> Store
    
    CausalGAT --> GRL --> PortfolioRouter
    CausalGAT --> Attention --> PortfolioRouter
    DRLAgent --> StrategyRouter
    DeepForecaster --> StrategyRouter
    TrainPipeline --> ModelWeights --> DRLAgent
    ModelWeights --> DeepForecaster

    Store <--> UI_Header
    Store <--> UI_PnL
    Store <--> UI_Market
    Store <--> UI_Heatmap
    Store <--> UI_StrategyLab
```

---

## 2. Indian Market Session Lifecycle & Telemetry Flow

The terminal strictly adheres to the **SEBI / NSE / BSE Indian Standard Time (IST = UTC+05:30)** market session phases:

```mermaid
sequenceDiagram
    autonumber
    participant UI as Next.js Terminal UI
    participant Store as Zustand Store
    participant Router as FastAPI NSE Router
    participant Session as IST Session Engine
    participant Redis as Redis Cache

    Note over UI,Session: Every 10 Seconds Active Polling / Push Loop
    UI->>Store: fetchMarketData() Triggered
    Store->>Router: GET /api/v1/nse/tickers
    Router->>Session: get_indian_market_status()
    Session-->>Router: MarketStatus (OPEN | PRE_OPEN | POST_CLOSE | CLOSED/AMO, countdown)
    
    alt Redis Cache Warm
        Router->>Redis: HGETALL "nse:latest_prices"
        Redis-->>Router: Real-time Ticker Map
    else Fallback to Benchmark Master
        Router->>Router: Load Normalized DEFAULT_INDIAN_TICKERS
    end
    
    Router-->>Store: IndianMarketPayload (tickers + market_status)
    Store->>Store: Normalise Symbols (Strip -EQ) & Deduplicate by Token
    Store->>Store: Recalculate Mark-to-Market P&L (Zerodha Equation)
    Store-->>UI: Atomic Re-render of Header Clock, PnL Cards & Live Tickers
```

---

## 3. Deep Reinforcement Learning (DRL) Policy Inference & Backtest Flow

```mermaid
flowchart TD
    subgraph MarketStateInput ["1. 8-Dimensional Market State Vector"]
        P1["Price Momentum (14d EMA vs 50d EMA)"]
        P2["Normalized Return (Daily / 5m Return)"]
        P3["RSI Divergence ((RSI - 50) / 50)"]
        P4["Realized Volatility Z-Score"]
        P5["Volume Flow (Volume Z-Score)"]
        P6["GNN Contagion Risk Factor"]
        P7["Current Inventory Position (-1 to +1)"]
        P8["Unrealized Return of Current Trade"]
    end

    subgraph NeuralBackbone ["2. DeepRLTradingAgent Neural Network (ml_service/drl_policy.py)"]
        StateVec["State Tensor: s_t in R^8"]
        ResEncoder["Residual MLP Encoder (Linear -> LayerNorm -> LeakyReLU)"]
        
        ActorHead["Actor / Policy Head: pi(a|s) -> Softmax [LONG, SHORT, HOLD, HEDGE]"]
        CriticHead["Critic / Value Head: V(s) -> Linear (Risk-Adjusted Expected Return)"]
        QHead["Action-Value Head: Q(s, a) -> Linear (4 Q-Values)"]
    end

    subgraph ExecutionSubsystem ["3. Live Signal & Historical Backtest Execution Engine"]
        FastAPI_Signal["GET /api/v1/strategy/drl-agent/{symbol}"]
        FastAPI_Backtest["POST /api/v1/strategy/drl-backtest"]
        
        SimEngine["Backtest Engine with Realistic Slip/Cost (0.03% per trade)"]
        MetricsEngine["Sharpe, Sortino, Max Drawdown, Alpha & Win Rate Calculator"]
    end

    subgraph StrategyLabUI ["4. Strategy Lab Studio UI (frontend/components/StrategyLab.tsx)"]
        LiveCards["Action Badge, Confidence Meter, Value V(s) & Q-Values Table"]
        EquityChart["Recharts Equity Curve (DRL Strategy vs Buy & Hold Benchmark)"]
        TradeLog["Interactive Executed Trades Ledger & Signal Breakdown"]
    end

    P1 & P2 & P3 & P4 & P5 & P6 & P7 & P8 --> StateVec
    StateVec --> ResEncoder
    ResEncoder --> ActorHead
    ResEncoder --> CriticHead
    ResEncoder --> QHead

    ActorHead & CriticHead & QHead --> FastAPI_Signal
    FastAPI_Signal --> LiveCards

    StateVec --> SimEngine --> MetricsEngine --> FastAPI_Backtest --> EquityChart & TradeLog
```

---

## 4. Deep Temporal Attention Multi-Horizon Quantile Forecaster Flow

```mermaid
flowchart LR
    subgraph RawData ["1. Historical OHLCV Time-Series"]
        OHLCV["OHLCV Price History (30+ Lookback Bars)"]
    end

    subgraph FeatureEngineering ["2. Multi-Variate Indicator Projection"]
        F1["Normalized Price"]
        F2["Scaled Returns"]
        F3["Volume Z-Score"]
        F4["Normalized RSI"]
        F5["EMA Trend Spread"]
        F6["ATR Volatility Proxy"]
        F7["GNN Contagion Weight"]
    end

    subgraph DeepArchitecture ["3. TemporalAttentionForecaster (deep_forecaster.py)"]
        Proj["Feature Linear + LayerNorm + LeakyReLU Projection (d_model=64)"]
        BiLSTM["2-Layer Bidirectional LSTM"]
        Attn["Multi-Head Temporal Self-Attention (4 Heads, Scaled Dot-Product)"]
        ResidualNorm["Residual Addition + LayerNorm"]
        ContextPool["Last Step Temporal Context Pooling"]
        
        QuantileHeads["Multi-Horizon Heads (t+1 to t+20):
          - Lower 95% (q_0.025)
          - Lower 80% (q_0.10)
          - Median (q_0.50)
          - Upper 80% (q_0.90)
          - Upper 95% (q_0.975)"]
          
        TrendClf["Trend Head: Softmax [BULLISH, BEARISH, RANGE_BOUND]"]
        FeatImp["Feature Attribution Head: Softmax over Feature Dimensions"]
    end

    subgraph Presentation ["4. Strategy Lab UI"]
        FanChart["Multi-Horizon Quantile Trajectory Fan Chart"]
        AttributionBar["Feature Importance Distribution (%)"]
        AttentionWeights["Temporal Lag Attention Matrix Display"]
    end

    OHLCV --> F1 & F2 & F3 & F4 & F5 & F6 & F7
    F1 & F2 & F3 & F4 & F5 & F6 & F7 --> Proj
    Proj --> BiLSTM --> Attn --> ResidualNorm --> ContextPool
    ContextPool --> QuantileHeads --> FanChart
    ContextPool --> TrendClf
    ContextPool --> FeatImp --> AttributionBar
    Attn --> AttentionWeights
```

---

## 5. End-to-End PyTorch Training & Checkpoint Pipeline

```mermaid
flowchart TD
    StartTrain["Trigger: python -m ml_service.train_models --epochs 15 --episodes 40"]
    DataLoad["Ingest 1Y Historical Market Dataset from PostgreSQL / Yahoo Finance"]
    
    subgraph ForecasterTraining ["Deep Forecaster Training Loop (Quantile Pinball Loss)"]
        BatchSeq["Generate Sliding Lookback Sequences (30 Bars in, 20 Bars Horizon)"]
        ForecasterFwd["Forward Pass through BiLSTM + Temporal Attention"]
        PinballLoss["Compute Multi-Quantile Pinball Loss:
          L_q = max(q(y - y_hat), (q-1)(y - y_hat)) for q in [0.025, 0.10, 0.50, 0.90, 0.975]"]
        BackpropForecaster["AdamW Optimization + Gradient Clipping (max_norm=1.0)"]
    end

    subgraph DRLTraining ["DRL Agent Training Loop (Actor-Critic Policy Gradients)"]
        EnvStep["Step Simulation Market Environment on Asset Price Series"]
        ComputeReturn["Compute Step Reward: Realized P&L - Volatility Penalty - 0.03% Transaction Cost"]
        ComputeAdvantage["Compute Advantage: A_t = R_t - V(s_t)"]
        ActorCriticLoss["Combined Loss = L_policy + 0.5 * L_value - 0.01 * L_entropy"]
        BackpropDRL["Adam Optimizer Step"]
    end

    subgraph StorageCheckpoint ["Model Checkpointing & Persistence"]
        SaveForecaster["Save Checkpoint: ml_service/checkpoints/deep_forecaster_best.pt"]
        SaveDRL["Save Checkpoint: ml_service/checkpoints/drl_policy_best.pt"]
    end

    StartTrain --> DataLoad
    DataLoad --> BatchSeq --> ForecasterFwd --> PinballLoss --> BackpropForecaster --> SaveForecaster
    DataLoad --> EnvStep --> ComputeReturn --> ComputeAdvantage --> ActorCriticLoss --> BackpropDRL --> SaveDRL
```

---

## 6. Direct Yahoo Finance <-> PostgreSQL Historical Ingestion & Delta Sync Flow

```mermaid
flowchart LR
    subgraph Step1 ["1. Instrument Discovery & Master Catalog"]
        A["securities_master Table (85+ Equities & Indices across NSE/BSE)"]
    end

    subgraph Step2 ["2. Delta Introspection & Parallel Ingest"]
        A --> B["Check MAX(date) in historical_stock_data"]
        B -->|If data exists| C["Incremental Fetch (Only missing delta days)"]
        B -->|If missing| D["Full Timeframe Fetch (1Y/2Y/5Y) via ThreadPool"]
        C & D --> E["Yahoo Direct Engine (app/services/yahoo_direct_db.py)"]
    end

    subgraph Step3 ["3. Direct Bulk Relational Upsert"]
        E --> F["Asyncpg Batch Executemany:
               INSERT INTO historical_stock_data ...
               ON CONFLICT (symbol, exchange, date) DO UPDATE"]
    end

    subgraph Step4 ["4. Low-Latency Sub-5ms Delivery"]
        F --> G["GET /api/v1/nse/history/{symbol} (Direct PostgreSQL Index Scan)"]
        F --> H["POST /api/v1/nse/sync-yahoo-db & CLI sync_yahoo_to_db.py"]
        G --> I["Interactive Candlestick & Quantitative Fan Charts"]
    end
```


---

## 7. Portfolio Metrics & Mark-to-Market Execution Flow

All calculations strictly mirror the quantitative equations used by top Indian brokerages (**Zerodha Kite, Dhan, Groww**):

```mermaid
flowchart TD
    Start["User Adds / Imports Positions or Market Ticker Updates"] --> Loop["Iterate Over Active Positions"]
    
    Loop --> MarkPrice["Resolve Mark Price (LTP) from Store Tickers"]
    Loop --> PrevClose["Resolve Previous Close (prev_close)"]
    
    MarkPrice --> Invested["Invested Value = Entry Price × Qty"]
    MarkPrice --> Current["Current Value = LTP × Qty × Leverage"]
    
    MarkPrice & PrevClose --> DayPnL["Day P&L = (LTP - Prev Close) × Qty × Side × Leverage"]
    MarkPrice --> TotalPnL["Total Unrealized P&L = Current Value - Invested Value"]
    
    Invested & Current --> TotalReturn["Total Return % = (Total P&L / Invested Value) × 100"]
    Current & DayPnL --> DayReturn["Day Return % = [Day P&L / (Current Value - Day P&L)] × 100"]
    
    Current --> Exposure["Net Exposure = Σ Current Value"]
    Current --> Margin["Margin Usage % = (Net Exposure / (Total Equity × 4)) × 100"]
    Current --> VaR["Value-at-Risk (VaR 99%) = Net Exposure × 0.028"]
    
    TotalReturn & DayReturn & Exposure & Margin & VaR --> UpdateStore["Atomically Update PortfolioSummary in Zustand Store"]
```

---

## 8. Causal GNN Risk Inference & Correlation Matrix Pipeline

```mermaid
flowchart LR
    subgraph Input ["Asset Returns Matrix"]
        X["Node Features (Daily Returns, Volatility, Sharpe, Volume)"]
        Adj["Learned Correlation Graph (Adjacency Matrix)"]
    end

    subgraph GATLayers ["Graph Attention Network Backbone"]
        GAT1["GATConv Layer 1 (8 Heads, ELU, BatchNorm)"]
        GAT2["GATConv Layer 2 (8 Heads, ELU, BatchNorm)"]
    end

    subgraph DualHead ["Adversarial Dual-Head Branching"]
        GRL["Gradient Reversal Layer (alpha = 1.0)"]
        DomainClf["Regime Classifier (Linear -> ReLU -> Linear)"]
        
        GAT3["GATConv Layer 3 (1 Head)"]
        RiskHead["Risk Head (Linear -> ReLU -> Linear -> Sigmoid)"]
    end

    subgraph InferredOutput ["Risk Engine Output"]
        RegimeOut["Regime: HISTORICAL_RETURNS_CORRELATION_REGIME"]
        RiskScores["Asset Risk Scores & Centrality Metrics"]
    end

    X --> GAT1
    Adj --> GAT1
    GAT1 --> GAT2
    Adj --> GAT2
    
    GAT2 --> GRL --> DomainClf --> RegimeOut
    GAT2 --> GAT3
    Adj --> GAT3
    GAT3 --> RiskHead --> RiskScores
```

---

## 9. Step-by-Step Execution Traces

### Sub-Flow A: Initial Station Bootstrapping & Client Hydration
1. **Client Launch**: User opens terminal in browser (`http://localhost:3000`).
2. **Layout & Clock Mounting**: `frontend/app/layout.tsx` mounts Header, Navigation, and Dashboard.
3. **IST Timer Initiation**: `Header.tsx` starts a 1-second interval timer computing exact IST (`Asia/Kolkata`) date, time, and session status badge.
4. **Market Polling Loop**: `Header.tsx` triggers `fetchMarketData()` immediately, polling `/api/v1/nse/tickers` every 10 seconds.
5. **Clean Symbol Hydration**: `usePortfolioStore.ts` ingests tickers, normalises symbols to clean format (stripping any `-EQ` artifacts), and derives real-time portfolio metrics.

### Sub-Flow B: Deep RL Policy Simulation & Backtest
1. **Studio Access**: User navigates to the **Strategy Lab** sidebar tab.
2. **Sub-Tab Selection**: User selects the **Deep RL Policy Agent** sub-tab.
3. **Asset & Parameter Configuration**: User selects symbol (e.g. `RELIANCE`), initial capital (₹500,000), position size (20%), and lookback window (1 Year).
4. **API Invocation**: Client calls `POST /api/v1/strategy/drl-backtest`.
5. **Neural Evaluation**: `drl_policy.py` steps through historical data, feeding 8-dimensional market states to the Actor-Critic model.
6. **Execution & Metrics**: Realistic transaction costs (0.03%) are deducted on each action change (`LONG`, `SHORT`, `HOLD`, `HEDGE`).
7. **Interactive Visualization**: Recharts renders the DRL Strategy equity curve against the benchmark Buy & Hold baseline, accompanied by Sharpe, Sortino, Alpha, and Max Drawdown cards.

### Sub-Flow C: Deep Temporal Attention Forecast Generation
1. **Sub-Tab Selection**: User switches to the **Temporal Attention Forecaster** sub-tab in Strategy Lab.
2. **Horizon Selection**: User configures forecast horizon (e.g., 20 periods) and target profit path (+1.5%).
3. **API Dispatch**: Client calls `GET /api/v1/strategy/deep-forecast/{symbol}`.
4. **BiLSTM + Attention Computation**: `deep_forecaster.py` processes normalized price history, computes 4-head temporal attention weights, and evaluates 5 quantile regression heads.
5. **Trajectory Projection**: Engine projects multi-horizon fan envelope ($q_{0.025} \dots q_{0.975}$) and ranks top contributing features.
6. **Visual Rendering**: UI displays the multi-step confidence envelope, dominant trend badge (`BULLISH` / `BEARISH` / `RANGE_BOUND`), and feature importance ranking.

---

## 10. Operational Flow Quiz & Self-Verification Checks

> **Q1: How does the system handle market closed hours (4:00 PM to 9:00 AM IST)?**  
> *Answer*: `get_indian_market_status()` marks the session as `CLOSED`, assigns `session_phase="AFTER_MARKET_AMO"`, computes exact remaining seconds to next 09:15 AM IST opening, and displays official Last Traded Prices (LTP) without synthetic flickering.

> **Q2: Why is transaction cost modeling essential in the DRL Backtesting Engine?**  
> *Answer*: Without realistic transaction costs (0.03% per trade covering brokerage, STT, and exchange turnover fees), high-frequency policy switching creates illusory alpha. `drl_policy.py` deducts slippage/costs on every non-hold action change to ensure institutional-grade backtesting fidelity.

> **Q3: How do the Quantile Regression Heads enforce trajectory monotonicity?**  
> *Answer*: `TemporalAttentionForecaster` applies continuous non-negative ReLU deltas: $\text{Upper}_{80} = \text{Median} + \text{ReLU}(\delta_1)$, $\text{Upper}_{95} = \text{Upper}_{80} + \text{ReLU}(\delta_2)$, $\text{Lower}_{80} = \text{Median} - \text{ReLU}(\delta_3)$, $\text{Lower}_{95} = \text{Lower}_{80} - \text{ReLU}(\delta_4)$, mathematically preventing confidence band crossing.

---

## 11. Flow Verification Checklist

- [x] **Architecture Diagram**: Multi-tier architecture diagram updated with NSE archives, Redis bus, FastAPI backend, Next.js frontend, and PyTorch ML Service.
- [x] **DRL Policy Flow**: Documented 8-dimensional state vector, Actor-Critic network, Q-value head, and backtesting metrics pipeline.
- [x] **Temporal Forecaster Flow**: Documented BiLSTM, Multi-Head Attention, Quantile regression heads, and feature attribution pipeline.
- [x] **Training Pipeline Flow**: Documented Quantile Pinball Loss and Actor-Critic Policy Gradient training workflows.
- [x] **Session Lifecycle Diagram**: Sequence diagram mapped to 09:15-15:30 IST SEBI trading cycles.
- [x] **Ingestion Pipeline**: Documented official `EQUITY_L.csv` batch download and PostgreSQL upsert flow.
- [x] **PnL Equations**: Verified Zerodha/Groww Day PnL and Total Return formulas against `usePortfolioStore.ts`.
- [x] **GNN Risk Pipeline**: Dual-head attention network and GRL domain adaptation verified against `causal_gat.py`.

