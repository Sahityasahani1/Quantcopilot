# QuantCopilot AI 📈⚡

**Next-Generation Quantitative Analytics Terminal, 18-Alpha Deep Forecaster, Strategy Lab (Sortino DRL Agent), and CausalGraphX GNN Risk Engine for Indian Equities & F&O (NSE & BSE)**

---

## 🌟 Overview

**QuantCopilot AI** is an institutional-grade quantitative trading workstation, deep learning forecasting engine, and systemic risk analytics platform designed specifically for the Indian financial markets (NSE & BSE).

Powered by an asynchronous **FastAPI gateway**, **PyTorch Spatio-Temporal Graph Attention Networks (GAT)**, **Multi-Head Temporal Attention Forecasters**, **Friction-Aware Sortino Reinforcement Learning Agents**, and **Next.js 16 (Turbopack)**, it provides high-speed execution telemetry, live market depth, option chains with Black-Scholes Greeks, and SQL-driven machine learning pipelines.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                QuantCopilot Terminal UI                     │
       │    (Next.js 16 • Turbopack • Zustand • Strategy Lab)        │
       └──────────────────────────────┬──────────────────────────────┘
                                      │ WebSocket / REST (< 15ms)
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                   FastAPI Async Gateway                     │
       │     (Live yfinance Stream • Option Greeks • Market Status)  │
       └───────────────┬──────────────────────────────┬──────────────┘
                       │                              │
        Async PostgreSQL & Redis Cache           PyTorch Deep Learning & GNN Suite
     (80,000+ SQL Bars • 18-Alpha Tensors)   (60d Forecaster • Sortino DRL • GAT)
```

---

## 🚀 Key Modules & Features

### 1. 📊 F&O Trading Desk & Indian Equities Feed
- **Live Market Streaming**: Real-time quotes powered by **`yfinance`** and WebSocket feeds (`ws://localhost:8000/ws/live-feed`) with sub-millisecond Redis in-memory caching.
- **NSE & BSE Securities Master**: Complete catalog supporting benchmark indices (`NIFTY 50`, `BANKNIFTY`, `FINNIFTY`, `SENSEX`) and major large/mid-cap equities.
- **F&O Option Chain**: Live strike matrix with Black-Scholes Greeks ($\Delta$, $\Gamma$, $\Theta$, $\text{Vega}$, $\text{IV}$), Put-Call Ratio (PCR), and Max Pain Strike discovery.
- **Level 2 Market Depth**: 5-level real-time order book inspection (Bids vs. Asks).

### 2. 🧠 18-Alpha Multi-Horizon Temporal Forecaster
- **18 Quantitative Microstructure Indicators**: Vectorized feature extraction covering RSI-14, MACD, Garman-Klass Volatility, Parkinson Range Volatility, ATR-14, VWAP Deviation, Delivery Momentum (`DelivQty` / `Volume`), and Trades Intensity.
- **60-Day Lookback Window ($T=60$)**: Models full quarterly market cycles and trend transitions.
- **Multi-Head Temporal Self-Attention**: 8-head self-attention extracting critical turning points and feature attribution weights.
- **5 Quantile Uncertainty Cones**: Forecasts trajectories across 20 future steps ($q_{0.025}, q_{0.10}, q_{0.50}, q_{0.90}, q_{0.975}$) using **Quantile Huber Loss** to prevent gradient explosions on flash crashes.

### 3. 🤖 Strategy Lab & Friction-Aware Sortino DRL Agent
- **Deep Reinforcement Learning (Actor-Critic)**: Evaluates live 18-alpha states to generate actionable decisions (`LONG`, `SHORT`, `HOLD`, `HEDGE`) with policy probabilities and decision entropy.
- **Differential Sortino Reward**: Optimizes risk-adjusted returns by penalizing downside volatility rather than total variance.
- **Continuous Kelly Position Sizing**: Dynamic position allocation factor ($0.0 \dots 1.0$) based on conviction and market volatility.
- **Realistic Indian Market Friction**: Models $0.03\%$ transaction costs (STT, GST, brokerage, and 2-tick execution slippage) during training and backtesting.
- **Interactive Backtest Simulator**: Visualizes SVG equity curves against Buy & Hold benchmarks with Sortino, Sharpe, Max Drawdown, and Alpha metrics.

### 4. 🕸️ CausalGraphX Spatio-Temporal GNN Risk Engine
- **Cross-Asset Contagion Network**: Graph Attention Networks (GAT) learning systemic dependency matrices from 15-year return covariances.
- **Dynamic 60-Day EWMA Adjacency**: Adapts edge weights to shifting market volatility regimes.
- **Real-Time Contagion Heatmap**: Sub-10ms systemic contagion scoring and high-risk node detection.

### 5. 🐘 SQL & Redis-Fed Machine Learning Pipeline
- **Unified SQL Storage**: Over **80,000+ historical bars** stored in PostgreSQL and SQLite with official NSE Delivery % and Trade Counts.
- **Direct Database Training**: The training pipeline (`train_models.py`) queries SQL records directly, merging real-time Redis tick buffers for training.

### 6. 📰 FinBERT Real-Time News Sentiment Engine
- **Transformer NLP**: Powered by `ProsusAI/finbert` to evaluate market-moving headlines, macro bulletins, and corporate disclosures.
- **Causal Graph Weighting**: Quantifies sentiment polarization ($\text{Score} \in [-1.0, +1.0]$) to adjust cross-asset dependency edges in the CausalGraphX network.
- **Background Ingestion Worker**: `news_scheduler.py` continually aggregates financial feeds, computes rolling sentiment scores, and broadcasts updates over WebSockets.

### 7. 📐 Algorithmic Geometric Pattern Detector
- **Vectorized Pattern Recognition**: Real-time detection across historical and intraday candle series via `pattern_detector.py`.
- **Classical Chart Formations**: Double Bottoms, Double Tops, Head & Shoulders, Inverted H&S, Bullish/Bearish Flags, and Pennants/Triangles.
- **Confidence & Risk Ratios**: Automatically computes confirmation breakout levels, measured move targets, and risk/reward profiles.

### 8. 🛡️ SEBI Regulatory Guardrails & Surveillance Tracker
- **Exchange Surveillance Monitoring**: Real-time tracking of NSE/BSE Additional Surveillance Measure (ASM) and Graded Surveillance Measure (GSM) frameworks (`sebi_policy_tracker.py`).
- **Dynamic Circuit Breaker Bands**: Live checks for 5%, 10%, and 20% price bands to avoid strategy traps and illiquid limit orders.
- **Institutional Governance**: Comprehensive risk management aligned with our [RMMM Framework](file:///C:/sahityaa/QuantCopilot2/StockSensei--portal-integration/StockSensei--portal-integration/quantcopilot/RMMM_Document_QuantCopilot.md).

### 9. ⚡ Institutional Workstation UI & Trading Suite
- **Global Command Palette (`Cmd+K` / `Ctrl+K`)**: Instant multi-asset search, quick-action routing, and keyboard shortcut execution (`CommandPalette.tsx`).
- **AI Scan Dashboard**: Real-time scanning across the Nifty 50 universe with composite algorithmic & technical scores (`AiScanDashboard.tsx`).
- **AI Universe Audit View**: Multi-factor institutional health inspection, liquidity filtering, and risk exposure auditing (`AiUniverseAuditView.tsx`).
- **Live Portfolio Lab**: Interactive sandbox and paper trading simulator with real-time mark-to-market valuations (`LivePortfolioLab.tsx`).
- **Workstation Settings**: Modular customization for streaming frequencies, chart layouts, and telemetry thresholds (`WorkstationSettingsView.tsx`).

### 10. 🏛️ Luxury Obsidian Terminal Design System & SSR Hydration Guard
- **Obsidian & Champagne Palette**: Built for institutional trading desks with a zero-fatigue dark obsidian palette (`#080A09` background, `#111614` cards, `#161C19` elevated surfaces) and refined champagne gold accents (`#C8A96B`).
- **Ivory Typography Hierarchy**: High-contrast, elegant typography featuring Warm Ivory (`#F2F0E8`), Secondary Ash (`#A7ADA8`), and Muted Slate (`#68716C`).
- **SSR Hydration Guard**: Implemented post-mount store hydration (`hydrateFromStorage`) in Zustand and `suppressHydrationWarning` on dynamic real-time telemetry numbers, eliminating React SSR vs client localStorage hydration mismatches.
- **Watchlist Audit View (`WatchlistAuditView.tsx`)**: Deep institutional audit dashboard providing comprehensive constituent screening, alpha radar breakdown, volume anomaly detection, and rapid paper order routing.

### 11. 📈 1-Year Historical Candle Dataset & Real-Time Options Micro-Ticks
- **Full 1-Year Historical Candlestick Engines**: Multi-timeframe historical backfill (365 daily sessions) delivered via `backend/app/routers/fno.py` and `nse_market.py` for all equities and indices.
- **Synthetic Micro-Price Options Tick Generator**: `websocket.py` streams live tick-by-tick micro-price variations (~750ms interval) for equity underlyings and dynamically synthesizes options contracts (`NIFTY 50` and `BANKNIFTY` CE/PE strikes with intrinsic and time-decay pricing).
- **Sub-Second Candlestick Chart Aggregation**: High-performance streaming into Lightweight Charts in `IndianMarketWidget.tsx` and `TradingTerminal.tsx` without client memory leaks or browser thread stalls.

### 12. 🧠 Daily Dynamic GNN Systemic Risk Index Pipeline
- **Vectorized Return Dynamics**: `daily_gnn_service.py` ingests daily closing price series across 40 Nifty constituents from PostgreSQL (`STOCK_PREDICT` / `historical_stock_data`) and computes rolling 60-day percentage returns.
- **Dynamic Cross-Asset Network**: Constructs an $N \times N$ Pearson correlation matrix and extracts 18-alpha features per asset (daily return, momentum, volatility, VaR, Sharpe).
- **GAT Neural Contagion Evaluation**: Executes a forward pass through `MarketContagionGAT` in `gnn_engine.py` to produce authentic daily systemic risk indexes (`overall_system_risk`), individual node contagion scores, and sector vulnerabilities.
- **Automated Startup & 24h Scheduler**: Pre-computes the daily GNN payload on application launch and refreshes on a daily schedule, serving the result through `GET /api/v1/portfolio/risk/gnn-metrics`.
- **Streamlined Institutional Header**: Extraneous mock portfolio metrics removed from the top navigation bar, highlighting the real-time **DAILY GNN SYSTEM RISK** badge with EOD date and status indicators.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS, Zustand, Lightweight Charts, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, `asyncpg`, `redis`, `yfinance`, NumPy, Pandas |
| **Machine Learning** | PyTorch, PyTorch Geometric, Temporal Attention, Actor-Critic DRL, Spatio-Temporal GAT |
| **Storage & Caching** | PostgreSQL (Relational Master & History), Redis (Live In-Memory Tick Buffer), SQLite |

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### 1. Clone & Setup Environment
```bash
git clone https://github.com/Sahityasahani1/Quantcopilot.git
cd Quantcopilot

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt
pip install -r ml_service/requirements.txt

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Synchronize Historical SQL Database
```powershell
# Ingest 15-year historical records into the SQL database:
python ml_service/db_loader.py --sync
```

### 3. Train Deep Learning Models
```powershell
# Train 18-alpha forecaster & DRL agent from SQL records:
python -m ml_service.train_models --source postgres --epochs 8 --episodes 25
```

### 4. Launch QuantCopilot AI
Launch both frontend and backend microservices simultaneously:

**Windows (PowerShell):**
```powershell
.\run.ps1
```

**Linux / macOS (Bash):**
```bash
chmod +x ./run.sh
./run.sh
```

---

## 🌐 Endpoints & UI

- **Workstation UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live Tick WebSocket**: `ws://localhost:8000/ws/live-feed`
- **Health Telemetry**: `GET http://localhost:8000/health`

---

## 📁 Repository Structure

```
Quantcopilot/
├── backend/                  # FastAPI async gateway
│   ├── app/
│   │   ├── routers/          # Market, F&O, Portfolio, Strategy & WebSocket routes
│   │   ├── services/         # YahooDirectDB live engine, NewsScheduler, incremental sync
│   │   ├── config.py         # Application configuration & connection URLs
│   │   ├── database.py       # Async PostgreSQL & Redis connection pools
│   │   ├── db_init.py        # Database schema DDL & seed data
│   │   ├── main.py           # Application entrypoint & CORS setup
│   │   └── schemas.py        # Pydantic response models & validation
│   ├── tests/                # Benchmark suites & automated verification
│   │   └── benchmark_suite.py# Execution latency & throughput benchmarking
│   ├── init_db.sql           # PostgreSQL table definitions
│   └── requirements.txt      # Backend dependencies
├── frontend/                 # Next.js 16 quantitative workstation
│   ├── app/                  # App router (Layout, Page, CSS)
│   ├── components/           # UI Components (Charts, StrategyLab, Heatmap, OptionChain)
│   │   ├── trading/          # AiScanDashboard, AiUniverseAuditView, LivePortfolioLab, WatchlistAuditView
│   │   ├── CommandPalette.tsx# Global Cmd+K quick launcher
│   │   └── WorkstationSettingsView.tsx # Customization & telemetry configuration
│   ├── store/                # Zustand global state (usePortfolioStore)
│   ├── types/                # TypeScript interface definitions (Strategy, Market, F&O)
│   └── package.json          # Frontend dependencies & scripts
├── ml_service/               # PyTorch Deep Learning & GNN Suite
│   ├── feature_engine.py     # 18-Alpha feature extraction & indicators
│   ├── deep_forecaster.py    # 60-day Multi-Horizon Attention Forecaster
│   ├── drl_policy.py         # Friction-aware Sortino DRL Trading Agent
│   ├── gnn_engine.py         # Dynamic 60-day EWMA Graph Attention Network
│   ├── finbert_sentiment.py  # ProsusAI FinBERT news sentiment model
│   ├── pattern_detector.py   # Algorithmic geometric chart pattern detector
│   ├── sebi_policy_tracker.py# Regulatory surveillance & circuit limit tracker
│   ├── db_loader.py          # PostgreSQL & Redis SQL data access layer
│   ├── train_models.py       # Automated SQL-fed training pipeline
│   ├── checkpoints/          # Checkpoint model weights (.pt)
│   ├── data_cache/           # Historical datasets & GNN topology payloads
│   └── requirements.txt      # ML dependencies (PyTorch, jugaad-data, yfinance)
├── decisions.md              # Architectural Decision Records (ADR-001 - ADR-023)
├── flow.md                   # Operational architecture & sequence diagrams
├── RMMM_Document_QuantCopilot.md # Risk Mitigation, Monitoring, & Management Document
├── generate_quickstart_docx.py # Documentation artifact exporter
├── verify_sequence.py        # Pipeline sequencing verification script
├── run.ps1                   # Windows startup script
├── run.sh                    # Unix startup script
└── README.md                 # Complete documentation
```

---

## 📄 License
This project is licensed under the MIT License.
