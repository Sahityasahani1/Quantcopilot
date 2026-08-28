# QuantCopilot AI 📈⚡

**Next-Generation Quantitative Analytics Terminal & CausalGraphX GNN Risk Engine for Indian Equities and F&O (NSE & BSE)**

---

## 🌟 Overview

**QuantCopilot AI** is a real-time quantitative trading workstation and systemic risk analytics platform. Powered by an asynchronous FastAPI gateway, PyTorch Spatio-Temporal Graph Attention Networks (GAT), and Next.js 16 (Turbopack), it provides institutional-grade analytics, live market depth, option chains with Black-Scholes Greeks, and cross-asset contagion vectors.

```
       ┌─────────────────────────────────────────────────────────────┐
       │                QuantCopilot Terminal UI                     │
       │    (Next.js 16 • Turbopack • Zustand • TradingView Charts)  │
       └──────────────────────────────┬──────────────────────────────┘
                                      │ WebSocket / REST
                                      ▼
       ┌─────────────────────────────────────────────────────────────┐
       │                   FastAPI Async Gateway                     │
       │     (Real-Time Quotes • Option Chains • Market Status)     │
       └───────────────┬──────────────────────────────┬──────────────┘
                       │                              │
        Async PostgreSQL & Redis Cache           PyTorch GNN Risk Engine
     (Security Master • 1Y OHLCV Data)       (CausalGraphX GAT • GRL Layer)
```

---

## 🚀 Key Features

### 1. 📊 Indian Equities & F&O Terminal
- **Real-Time Market Feeds**: Live tick streams via WebSockets (`ws://localhost:8000/ws/live-feed`) with sub-2ms simulated latency and real quotes fallback.
- **NSE & BSE Security Master**: Support for over 6,700+ listed equities and benchmark indices (`NIFTY 50`, `BANKNIFTY`, `SENSEX`).
- **Interactive Technical Charts**: Powered by TradingView Lightweight Charts with multi-timeframe OHLCV, customizable indicators (EMA 9/20/50/200, VWAP, Bollinger Bands, RSI, MACD), and drawing overlays.
- **F&O Option Chain**: Live option chain matrices with Black-Scholes Greeks ($\Delta$, $\Gamma$, IV), Put-Call Ratio (PCR), and Max Pain Strike calculation.
- **5-Level Market Depth**: Real-time Level 2 order book inspection (Bids & Asks).

### 2. 🧠 CausalGraphX Spatio-Temporal GNN Risk Engine
- **Cross-Asset Contagion**: Multi-head Graph Attention Networks (8-head GAT) learn dynamic inter-asset dependency matrices from return time series.
- **Gradient Reversal Layer (GRL)**: Unsupervised domain adaptation across high-volatility, low-volatility, and trend regimes.
- **Real-Time Risk Heatmap**: Dynamic adjacency matrix visualization mapping systemic risk propagation across portfolio holdings.

### 3. 💼 Portfolio & PnL Analytics
- **Live Metric Calculations**: Equity, Daily P&L, Sharpe Ratio, Value-at-Risk (VaR-99), and Margin Utilization.
- **Position Management**: Instant Long/Short tracking with leverage adjustments and CSV/Excel batch import.
- **SEBI/IST Session Telemetry**: Full lifecycle adherence to Indian market hours (Pre-Open, Regular Market, Post-Close, and AMO).

---

## 🛠️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS, Zustand, Lightweight Charts, Lucide Icons |
| **Backend** | FastAPI, Uvicorn, Pydantic v2, `asyncpg`, `aioredis`, `yfinance`, NumPy, Pandas |
| **Machine Learning** | PyTorch, PyTorch Geometric, Spatio-Temporal GAT, Gradient Reversal Layer (GRL) |
| **Data & Storage** | PostgreSQL (Relational Master & OHLCV), Redis (Tick Cache & Pub/Sub) |

For detailed operational flows and architectural decision records, refer to:
- [flow.md](file:///c:/sahityaa/QuantCopliotFinal/flow.md) — Operational architecture & data pipelines.
- [decisions.md](file:///c:/sahityaa/QuantCopliotFinal/decisions.md) — Architectural Decision Records (ADRs).

---

## ⚡ Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### 1. Clone the Repository
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd QuantCopliotFinal
```

### 2. Backend Setup
```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
pip install -r ml_service/requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cd ..
```

### 4. Running the System
You can launch both services simultaneously using the provided scripts:

**Windows (PowerShell):**
```powershell
.\run.ps1
```

**Linux / macOS (Bash):**
```bash
chmod +x ./run.sh
./run.sh
```

Or run them individually:
```bash
# Terminal 1: FastAPI Backend
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Next.js Frontend
cd frontend
npm run dev
```

---

## 🌐 Endpoints & UI

- **Workstation UI**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: `GET http://localhost:8000/health`
- **Live Tick WebSocket**: `ws://localhost:8000/ws/live-feed`

---

## 📁 Repository Structure

```
QuantCopilot/
├── backend/                  # FastAPI async gateway
│   ├── app/
│   │   ├── routers/          # Market, F&O, Portfolio & WebSocket routes
│   │   ├── config.py         # App configuration & settings
│   │   ├── database.py       # Async PostgreSQL & Redis connection pools
│   │   ├── main.py           # Lifespan application entrypoint
│   │   └── schemas.py        # Pydantic schemas & response models
│   ├── init_db.sql           # Database schema & seed data
│   └── requirements.txt      # Backend Python dependencies
├── frontend/                 # Next.js 16 quantitative workstation
│   ├── app/                  # Next.js App Router (Layout & Pages)
│   ├── components/           # UI Components (Charts, Option Chain, Heatmap)
│   ├── store/                # Zustand global state (usePortfolioStore)
│   ├── types/                # TypeScript interface definitions
│   └── package.json          # Frontend dependencies & scripts
├── ml_service/               # PyTorch CausalGraphX GNN risk models
│   ├── causal_gat.py         # Spatio-Temporal GAT with GRL layer
│   ├── gnn_engine.py         # Dynamic graph builder & adjacency calculator
│   ├── data_cache/           # Historical cache files for benchmark universe
│   └── requirements.txt      # ML Python dependencies
├── decisions.md              # Architectural Decision Records (ADRs)
├── flow.md                   # Operational architecture & sequence diagrams
├── run.ps1                   # Windows startup script
├── run.sh                    # Unix startup script
└── README.md                 # Project documentation
```

---

## 📄 License
This project is licensed under the MIT License.
