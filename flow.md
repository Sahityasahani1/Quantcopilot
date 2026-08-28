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

    subgraph MLService ["GNN Risk Service (ml_service)"]
        CausalGAT["CausalGraphXGAT Model"]
        GRL["Gradient Reversal Layer (GRL)"]
        Attention["8-Head GAT Spatial Attention"]
    end

    subgraph FrontendTerminal ["Frontend Client (Next.js 16 + Turbopack)"]
        Store["Zustand Store (usePortfolioStore)"]
        UI_Header["Header (Live IST Clock & Session Badge)"]
        UI_PnL["PnL & Metrics Widget (Zerodha / Groww Eq)"]
        UI_Market["IndianMarketWidget (Real Quotes & Day Range)"]
        UI_Heatmap["RiskHeatmap (Correlation Grid)"]
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
    PositionsTable <--> PortfolioRouter
    SessionEngine --> MarketRouter

    MarketRouter --> Store
    PortfolioRouter --> Store
    WSRouter <--> Store
    
    CausalGAT --> GRL --> PortfolioRouter
    CausalGAT --> Attention --> PortfolioRouter

    Store <--> UI_Header
    Store <--> UI_PnL
    Store <--> UI_Market
    Store <--> UI_Heatmap
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

## 3. Historical Data & Securities Master Ingestion Pipeline

```mermaid
flowchart LR
    subgraph Step1 ["1. Instrument Discovery"]
        A["Download EQUITY_L.csv from archives.nseindia.com"] --> B["Filter SERIES == 'EQ' (2,200+ Symbols)"]
    end

    subgraph Step2 ["2. Batch Historical Pull"]
        B --> C["Parallel ThreadPool (6 Workers)"]
        C --> D["Fetch 1Y OHLCV from Yahoo Finance (.NS/.BO)"]
        D --> E["Cache to disk in ml_service/data_cache/"]
    end

    subgraph Step3 ["3. Relational Persistence"]
        E --> F["Upsert into securities_master"]
        E --> G["Bulk Insert into historical_stock_data"]
    end

    subgraph Step4 ["4. Low-Latency Delivery"]
        F --> H["GET /api/v1/nse/history/{symbol}"]
        G --> H
        H --> I["Render Interactive OHLCV Candlestick Charts"]
    end
```

---

## 4. Portfolio Metrics & Mark-to-Market Execution Flow

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

## 5. Causal GNN Risk Inference & Correlation Matrix Pipeline

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

## 6. Step-by-Step Execution Traces

### Sub-Flow A: Initial Station Bootstrapping & Client Hydration
1. **Client Launch**: User opens terminal in browser (`http://localhost:3000`).
2. **Layout & Clock Mounting**: `frontend/app/layout.tsx` mounts Header, Navigation, and Dashboard.
3. **IST Timer Initiation**: `Header.tsx` starts a 1-second interval timer computing exact IST (`Asia/Kolkata`) date, time, and session status badge.
4. **Market Polling Loop**: `Header.tsx` triggers `fetchMarketData()` immediately, polling `/api/v1/nse/tickers` every 10 seconds.
5. **Clean Symbol Hydration**: `usePortfolioStore.ts` ingests tickers, normalises symbols to clean format (stripping any `-EQ` artifacts), and derives real-time portfolio metrics.

### Sub-Flow B: Adding Position & Live Mark-to-Market
1. **Modal Trigger**: User clicks **Add Position** in the dashboard.
2. **Autocomplete Search**: `AddPositionModal.tsx` deduplicates search results across available NSE/BSE equities.
3. **Selection**: User selects symbol (e.g., `RELIANCE`), quantity (100), and entry price.
4. **Store Update**: `addPosition()` appends the position to `portfolio.positions` and automatically recalculates Mark-to-Market value, Unrealized P&L, Day P&L, and VaR 99%.

### Sub-Flow C: Historical Candlestick Chart Fetching
1. **User Interaction**: User clicks a ticker in the `IndianMarketWidget` table.
2. **History Request**: Dispatches `GET /api/v1/nse/history/{symbol}?period=1y&exchange=NSE`.
3. **Multi-Tier Resolution**:
   - Backend queries PostgreSQL `historical_stock_data`.
   - If missing, queries Yahoo Finance (`RELIANCE.NS`), transforms DataFrame, stores rows in PostgreSQL asynchronously, and returns JSON payload.
4. **Chart Plotting**: Lightweight candlestick chart renders OHLCV bars with percentage change tooltips.

---

## 7. Operational Flow Quiz & Self-Verification Checks

> **Q1: How does the system handle market closed hours (4:00 PM to 9:00 AM IST)?**  
> *Answer*: `get_indian_market_status()` marks the session as `CLOSED`, assigns `session_phase="AFTER_MARKET_AMO"`, computes exact remaining seconds to next 09:15 AM IST opening, and displays official Last Traded Prices (LTP) without synthetic flickering.

> **Q2: Why is symbol deduplication required in both Zustand store and React list renderers?**  
> *Answer*: The store normalises all keys to clean uppercase strings (e.g. `RELIANCE`). A `seenTokens` Set in `IndianMarketWidget.tsx` and `AddPositionModal.tsx` guarantees that even if multiple aliases exist in cache, each stock produces a unique React key (`key={t.symbol}`), preventing rendering collision warnings.

> **Q3: How does the Day P&L calculation differ from Total Unrealized P&L?**  
> *Answer*: Total P&L measures gain since entry: \(\sum (\text{LTP} - \text{Entry Price}) \times \text{Qty}\). Today's Day P&L measures intraday change from yesterday's exchange closing price: \(\sum (\text{LTP} - \text{Prev Close}) \times \text{Qty}\).

---

## 8. Flow Verification Checklist

- [x] **Architecture Diagram**: Multi-tier architecture diagram updated with NSE archives, Redis bus, FastAPI backend, and Next.js frontend.
- [x] **Session Lifecycle Diagram**: Sequence diagram mapped to 09:15-15:30 IST SEBI trading cycles.
- [x] **Ingestion Pipeline**: Documented official `EQUITY_L.csv` batch download and PostgreSQL upsert flow.
- [x] **PnL Equations**: Verified Zerodha/Groww Day PnL and Total Return formulas against `usePortfolioStore.ts`.
- [x] **GNN Risk Pipeline**: Dual-head attention network and GRL domain adaptation verified against `causal_gat.py`.
