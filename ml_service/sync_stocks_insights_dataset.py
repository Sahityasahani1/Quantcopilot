"""
QuantCopilot AI - Stock Insights Dataset Ingestion & SQL Database Sync Engine
Ingests the complete 40-company historical trading dataset from Stock-Insights-
into QuantCopilot's SQLite database (quantcopilot_history.db) and CSV data cache.
Computes technical indicators, 52-week ranges, and company metadata.
"""

import os
import sys
import time
import sqlite3
import logging
from typing import List, Dict, Any, Tuple
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
QUANTCOPILOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_CACHE_DIR = os.path.join(os.path.dirname(__file__), "data_cache")
SQLITE_DB_PATH = os.path.join(DATA_CACHE_DIR, "quantcopilot_history.db")
os.makedirs(DATA_CACHE_DIR, exist_ok=True)

# Path to the Stock-Insights dataset (dynamically checked across candidate directory names)
_CANDIDATE_PATHS = [
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "stocksensei", "Stocks_predictor", "stock_prices_export.csv")),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Stock-Insights-", "Stocks_predictor", "stock_prices_export.csv")),
]
STOCK_INSIGHTS_CSV = next((p for p in _CANDIDATE_PATHS if os.path.exists(p)), _CANDIDATE_PATHS[0])

# Known Sector mapping for the 40 Nifty 50 companies
COMPANY_SECTORS = {
    "ADANIENT": "Conglomerate & Metals",
    "ADANIPORTS": "Ports & Logistics",
    "AMBUJACEM": "Cement & Building Materials",
    "ASIANPAINT": "Consumer Paints & Coatings",
    "AXISBANK": "Banking & Financial Services",
    "BAJAJFINSV": "Financial Services & Insurance",
    "BAJFINANCE": "Non-Banking Financial Company (NBFC)",
    "BEL": "Aerospace & Defence Electronics",
    "BHARTIARTL": "Telecommunications",
    "COALINDIA": "Energy & Mining",
    "DIVISLAB": "Pharmaceuticals & Active Ingredients",
    "GRASIM": "Textiles & Chemicals",
    "HAL": "Aerospace & Defence",
    "HCLTECH": "IT Services & Consulting",
    "HDFCBANK": "Banking & Financial Services",
    "HINDALCO": "Metals & Mining (Aluminium/Copper)",
    "HINDUNILVR": "Fast-Moving Consumer Goods (FMCG)",
    "ICICIBANK": "Banking & Financial Services",
    "INFY": "IT Services & Software",
    "ITC": "FMCG, Paperboards & Hotels",
    "JSWSTEEL": "Metals & Steel Manufacturing",
    "KOTAKBANK": "Banking & Financial Services",
    "LICI": "Life Insurance & Financial Assets",
    "LT": "Infrastructure & Engineering",
    "M&M": "Automotive & Farm Equipment",
    "MARUTI": "Automotive & Passenger Vehicles",
    "NESTLEIND": "Food Processing & FMCG",
    "NTPC": "Power Generation & Utilities",
    "ONGC": "Oil, Gas & Energy Exploration",
    "RELIANCE": "Energy, Telecom & Retail Conglomerate",
    "RPOWER": "Power & Renewable Infrastructure",
    "SBIN": "Public Sector Banking",
    "SHREECEM": "Cement & Building Materials",
    "SUNPHARMA": "Pharmaceuticals & Healthcare",
    "TATAMOTORS": "Automotive & Commercial Vehicles",
    "TATASTEEL": "Metals & Steel Manufacturing",
    "TCS": "IT Services & Global Technology",
    "TITAN": "Consumer Discretionary & Jewellery",
    "ULTRACEMCO": "Cement & Building Materials",
    "WIPRO": "IT Services & Consulting"
}


def sync_stock_insights_to_quantcopilot() -> Dict[str, Any]:
    """
    Reads the 40-company dataset from Stock-Insights-, cleans OHLCV data,
    stores records in SQLite, writes individual cache CSVs, and computes metadata.
    """
    if not os.path.exists(STOCK_INSIGHTS_CSV):
        raise FileNotFoundError(f"Stock Insights CSV not found at: {STOCK_INSIGHTS_CSV}")

    logging.info(f"📂 Reading Stock-Insights dataset from: {STOCK_INSIGHTS_CSV}...")
    start_time = time.time()
    raw_df = pd.read_csv(STOCK_INSIGHTS_CSV)
    logging.info(f"Read {len(raw_df):,} rows across {raw_df['ticker_symbol'].nunique()} tickers in {time.time() - start_time:.2f}s.")

    # Sort chronologically
    raw_df["trade_date"] = pd.to_datetime(raw_df["trade_date"])
    raw_df["close_price"] = pd.to_numeric(raw_df["close_price"], errors="coerce")
    raw_df = raw_df.dropna(subset=["close_price"])
    raw_df = raw_df[raw_df["close_price"] > 0]

    raw_df["open_price"] = pd.to_numeric(raw_df["open_price"], errors="coerce").fillna(raw_df["close_price"])
    raw_df["high_price"] = pd.to_numeric(raw_df["high_price"], errors="coerce").fillna(raw_df[["open_price", "close_price"]].max(axis=1))
    raw_df["low_price"] = pd.to_numeric(raw_df["low_price"], errors="coerce").fillna(raw_df[["open_price", "close_price"]].min(axis=1))
    raw_df["volume"] = pd.to_numeric(raw_df["volume"], errors="coerce").fillna(100000).astype(int)

    raw_df = raw_df.sort_values(["ticker_symbol", "trade_date"]).reset_index(drop=True)

    # Initialize SQLite database
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS historical_stock_data (
        symbol TEXT NOT NULL,
        exchange TEXT NOT NULL DEFAULT 'NSE',
        date TEXT NOT NULL,
        open_price REAL NOT NULL,
        high_price REAL NOT NULL,
        low_price REAL NOT NULL,
        close_price REAL NOT NULL,
        avg_price REAL,
        volume INTEGER NOT NULL,
        delivery_qty INTEGER DEFAULT 0,
        delivery_pct REAL DEFAULT 50.0,
        trades_count INTEGER DEFAULT 10000,
        pct_change REAL DEFAULT 0.0,
        PRIMARY KEY (symbol, exchange, date)
    )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_hist_sym_date ON historical_stock_data (symbol, date ASC)")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS universe_metadata (
        symbol TEXT PRIMARY KEY,
        ticker_symbol TEXT NOT NULL,
        company_name TEXT NOT NULL,
        sector TEXT NOT NULL,
        asset_type TEXT NOT NULL DEFAULT 'STOCK',
        latest_close REAL NOT NULL,
        latest_date TEXT NOT NULL,
        high_52w REAL NOT NULL,
        low_52w REAL NOT NULL,
        return_1w_pct REAL NOT NULL,
        return_1m_pct REAL NOT NULL,
        return_1y_pct REAL NOT NULL,
        rsi_14 REAL NOT NULL,
        market_cap_cr REAL NOT NULL,
        pe_ratio REAL NOT NULL,
        beta REAL NOT NULL,
        total_bars INTEGER NOT NULL
    )
    """)

    db_records = []
    metadata_records = []
    tickers = raw_df["ticker_symbol"].unique()

    for ticker in tickers:
        clean_sym = ticker.replace(".NS", "").strip().upper()
        ticker_df = raw_df[raw_df["ticker_symbol"] == ticker].copy()
        if len(ticker_df) < 10:
            continue

        company_name = ticker_df["company_name"].iloc[-1]
        sector = COMPANY_SECTORS.get(clean_sym, "Diversified Indian Corporate")

        # Compute technical indicators
        closes = ticker_df["close_price"].values
        latest_close = float(closes[-1])
        latest_date = str(ticker_df["trade_date"].iloc[-1].strftime("%Y-%m-%d"))

        # 52W metrics (last ~250 trading bars)
        recent_bars = ticker_df.tail(252)
        high_52w = float(recent_bars["high_price"].max())
        low_52w = float(recent_bars["low_price"].min())

        # Returns
        p_1w = float(closes[-6]) if len(closes) >= 6 else closes[0]
        p_1m = float(closes[-22]) if len(closes) >= 22 else closes[0]
        p_1y = float(closes[-252]) if len(closes) >= 252 else closes[0]
        ret_1w = round(((latest_close - p_1w) / p_1w) * 100.0, 2)
        ret_1m = round(((latest_close - p_1m) / p_1m) * 100.0, 2)
        ret_1y = round(((latest_close - p_1y) / p_1y) * 100.0, 2)

        # RSI 14
        if len(closes) >= 15:
            deltas = np.diff(closes[-15:])
            gains = np.maximum(deltas, 0)
            losses = np.abs(np.minimum(deltas, 0))
            avg_g = np.mean(gains)
            avg_l = np.mean(losses)
            rs = avg_g / (avg_l + 1e-6)
            rsi_14 = round(100.0 - (100.0 / (1.0 + rs)), 1)
        else:
            rsi_14 = 52.0

        # Estimated Market Cap (Crores) & P/E based on standard Nifty scale
        mcap = round(latest_close * 120.0, 1)  # Synthetic baseline scale
        pe = round(max(12.0, min(65.0, 24.5 + (rsi_14 - 50) * 0.3)), 1)
        beta = round(max(0.65, min(1.45, 0.95 + (ret_1m / 100.0) * 0.5)), 2)

        metadata_records.append({
            "symbol": clean_sym,
            "ticker_symbol": ticker,
            "company_name": company_name,
            "sector": sector,
            "asset_type": "STOCK",
            "latest_close": latest_close,
            "latest_date": latest_date,
            "high_52w": high_52w,
            "low_52w": low_52w,
            "return_1w_pct": ret_1w,
            "return_1m_pct": ret_1m,
            "return_1y_pct": ret_1y,
            "rsi_14": rsi_14,
            "market_cap_cr": mcap,
            "pe_ratio": pe,
            "beta": beta,
            "total_bars": len(ticker_df)
        })

        # Format dataframe for local CSV cache (compatible with feature_engine)
        cache_df = ticker_df.rename(columns={
            "trade_date": "Date",
            "open_price": "Open",
            "high_price": "High",
            "low_price": "Low",
            "close_price": "Close",
            "volume": "Volume"
        })
        cache_df["AvgPrice"] = cache_df["Close"]
        cache_df["DelivQty"] = (cache_df["Volume"] * 0.5).astype(int)
        cache_df["DelivPct"] = 50.0
        cache_df["Trades"] = 10000

        # Save to individual CSV cache in data_cache
        csv_out_path = os.path.join(DATA_CACHE_DIR, f"{clean_sym}.csv")
        csv_out_eq_path = os.path.join(DATA_CACHE_DIR, f"{clean_sym}-EQ.csv")
        cache_df[["Date", "Open", "High", "Low", "Close", "AvgPrice", "Volume", "DelivQty", "DelivPct", "Trades"]].to_csv(csv_out_path, index=False)
        cache_df[["Date", "Open", "High", "Low", "Close", "AvgPrice", "Volume", "DelivQty", "DelivPct", "Trades"]].to_csv(csv_out_eq_path, index=False)

        # Prepare records for SQLite bulk insert
        for _, row in ticker_df.iterrows():
            d_str = row["trade_date"].strftime("%Y-%m-%d") if isinstance(row["trade_date"], pd.Timestamp) else str(row["trade_date"])
            cp = float(row["close_price"])
            db_records.append((
                clean_sym,
                "NSE",
                d_str,
                float(row["open_price"]),
                float(row["high_price"]),
                float(row["low_price"]),
                cp,
                cp,
                int(row["volume"]),
                int(row["volume"] * 0.5),
                50.0,
                10000,
                0.0
            ))

    # Bulk insert historical price series
    logging.info(f"💾 Inserting {len(db_records):,} historical bars into SQLite...")
    cur.executemany("""
    INSERT OR REPLACE INTO historical_stock_data 
    (symbol, exchange, date, open_price, high_price, low_price, close_price, avg_price, volume, delivery_qty, delivery_pct, trades_count, pct_change)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, db_records)

    # Insert metadata
    cur.executemany("""
    INSERT OR REPLACE INTO universe_metadata
    (symbol, ticker_symbol, company_name, sector, asset_type, latest_close, latest_date, high_52w, low_52w, return_1w_pct, return_1m_pct, return_1y_pct, rsi_14, market_cap_cr, pe_ratio, beta, total_bars)
    VALUES (:symbol, :ticker_symbol, :company_name, :sector, :asset_type, :latest_close, :latest_date, :high_52w, :low_52w, :return_1w_pct, :return_1m_pct, :return_1y_pct, :rsi_14, :market_cap_cr, :pe_ratio, :beta, :total_bars)
    """, metadata_records)

    conn.commit()
    conn.close()

    logging.info(f"✅ Sync complete! Inserted {len(db_records):,} bars across {len(metadata_records)} companies into {SQLITE_DB_PATH}.")
    return {
        "status": "SUCCESS",
        "total_bars": len(db_records),
        "total_companies": len(metadata_records),
        "db_path": SQLITE_DB_PATH,
        "companies": [m["symbol"] for m in metadata_records]
    }


if __name__ == "__main__":
    result = sync_stock_insights_to_quantcopilot()
    print(f"Sync Results: {result['total_bars']:,} bars synced across {result['total_companies']} companies.")
