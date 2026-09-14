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
│   │   ├── services/         # YahooDirectDB live engine & incremental sync
│   │   ├── config.py         # Application configuration & connection URLs
│   │   ├── database.py       # Async PostgreSQL & Redis connection pools
│   │   ├── db_init.py        # Database schema DDL & seed data
│   │   ├── main.py           # Application entrypoint & CORS setup
│   │   └── schemas.py        # Pydantic response models & validation
│   ├── init_db.sql           # PostgreSQL table definitions
│   └── requirements.txt      # Backend dependencies
├── frontend/                 # Next.js 16 quantitative workstation
│   ├── app/                  # App router (Layout, Page, CSS)
│   ├── components/           # UI Components (Charts, StrategyLab, Heatmap, OptionChain)
│   ├── store/                # Zustand global state (usePortfolioStore)
│   ├── types/                # TypeScript interface definitions (Strategy, Market, F&O)
│   └── package.json          # Frontend dependencies & scripts
├── ml_service/               # PyTorch Deep Learning & GNN Suite
│   ├── feature_engine.py     # 18-Alpha feature extraction & indicators
│   ├── deep_forecaster.py    # 60-day Multi-Horizon Attention Forecaster
│   ├── drl_policy.py         # Friction-aware Sortino DRL Trading Agent
│   ├── gnn_engine.py         # Dynamic 60-day EWMA Graph Attention Network
│   ├── db_loader.py          # PostgreSQL & Redis SQL data access layer
│   ├── train_models.py       # Automated SQL-fed training pipeline
│   ├── checkpoints/          # Checkpoint model weights (.pt)
│   ├── data_cache/           # Historical datasets & GNN topology payloads
│   └── requirements.txt      # ML dependencies (PyTorch, jugaad-data, yfinance)
├── decisions.md              # Architectural Decision Records (ADRs)
├── flow.md                   # Operational architecture & sequence diagrams
├── run.ps1                   # Windows startup script
├── run.sh                    # Unix startup script
└── README.md                 # Complete documentation
```

---

## 📄 License
This project is licensed under the MIT License.
