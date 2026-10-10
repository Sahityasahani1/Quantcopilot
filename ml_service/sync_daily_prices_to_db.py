"""
Syncs latest daily market bars from Yahoo Finance into SQLite database quantcopilot_history.db
up to today's date (2026-10-08).
"""

import os
import sys
import sqlite3
import logging
from datetime import datetime, date
import yfinance as yf
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.abspath(os.path.join(BASE_DIR, "..")))
DATA_CACHE_DIR = os.path.join(BASE_DIR, "data_cache")
SQLITE_DB_PATH = os.path.join(DATA_CACHE_DIR, "quantcopilot_history.db")

from ml_service.deep_forecaster import ALPHA_FEATURE_NAMES
from ml_service.feature_engine import compute_rsi

TICKER_YF_MAP = {
    "NIFTY_50": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    "SENSEX": "^BSESN",
    "RELIANCE": "RELIANCE.NS",
    "TCS": "TCS.NS",
    "HDFCBANK": "HDFCBANK.NS",
    "INFY": "INFY.NS",
    "ICICIBANK": "ICICIBANK.NS",
    "TATAMOTORS": "TMPV.NS",
    "SBIN": "SBIN.NS",
    "ITC": "ITC.NS",
    "BHARTIARTL": "BHARTIARTL.NS",
    "LT": "LT.NS",
    "AXISBANK": "AXISBANK.NS",
    "KOTAKBANK": "KOTAKBANK.NS",
    "HINDUNILVR": "HINDUNILVR.NS",
    "MARUTI": "MARUTI.NS",
    "SUNPHARMA": "SUNPHARMA.NS",
    "BAJFINANCE": "BAJFINANCE.NS",
    "TATASTEEL": "TATASTEEL.NS",
    "ASIANPAINT": "ASIANPAINT.NS",
    "TITAN": "TITAN.NS",
    "WIPRO": "WIPRO.NS",
    "HCLTECH": "HCLTECH.NS",
    "BAJAJFINSV": "BAJAJFINSV.NS",
    "NTPC": "NTPC.NS",
    "ONGC": "ONGC.NS",
    "POWERGRID": "POWERGRID.NS",
    "ZOMATO": "ETERNAL.NS",
    "JIOFIN": "JIOFIN.NS",
    "BEL": "BEL.NS",
    "HAL": "HAL.NS",
    "ADANIENT": "ADANIENT.NS",
    "ADANIPORTS": "ADANIPORTS.NS",
    "COALINDIA": "COALINDIA.NS",
    "JSWSTEEL": "JSWSTEEL.NS",
    "M&M": "M&M.NS",
    "NESTLEIND": "NESTLEIND.NS",
    "ULTRACEMCO": "ULTRACEMCO.NS"
}

def sync_daily_prices():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cur = conn.cursor()

    yf_symbols = list(TICKER_YF_MAP.values())
    logging.info(f"Downloading recent daily bars from Yahoo Finance for {len(yf_symbols)} tickers...")
    
    # Download recent 180 days to ensure continuous contiguous series up to today
    df_all = yf.download(yf_symbols, period="8mo", group_by="ticker", progress=False)

    total_inserted = 0
    for sym, yf_sym in TICKER_YF_MAP.items():
        try:
            sub = df_all[yf_sym] if yf_sym in df_all else None
            if sub is None or sub.empty:
                continue

            sub_clean = sub.dropna(subset=["Close"]).copy()
            if sub_clean.empty:
                continue

            for idx, row in sub_clean.iterrows():
                dt_str = idx.strftime("%Y-%m-%d")
                o = float(row.get("Open", row["Close"]))
                h = float(row.get("High", row["Close"]))
                l = float(row.get("Low", row["Close"]))
                c = float(row["Close"])
                v = int(row.get("Volume", 100000))
                avg_p = round((o + h + l + c) / 4.0, 2)

                cur.execute("""
                INSERT OR REPLACE INTO historical_stock_data 
                (symbol, exchange, date, open_price, high_price, low_price, close_price, avg_price, volume, delivery_qty, delivery_pct, trades_count, pct_change)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sym, "NSE", dt_str, o, h, l, c, avg_p, v, 0, 50.0, 10000, 0.0))
                total_inserted += 1

            # Update universe_metadata
            last_c = float(sub_clean["Close"].iloc[-1])
            last_dt = sub_clean.index[-1].strftime("%Y-%m-%d")
            closes = sub_clean["Close"].values
            h52 = float(sub_clean["High"].max())
            l52 = float(sub_clean["Low"].min())
            ret_1w = round(((last_c - float(closes[-5])) / float(closes[-5])) * 100.0, 2) if len(closes) >= 5 else 0.0
            ret_1m = round(((last_c - float(closes[-22])) / float(closes[-22])) * 100.0, 2) if len(closes) >= 22 else 0.0
            rsi_val = 55.0
            if len(closes) >= 15:
                delta = pd.Series(closes).diff()
                up = delta.clip(lower=0).rolling(14).mean()
                down = (-delta.clip(upper=0)).rolling(14).mean()
                rs = up / (down + 1e-6)
                rsi_s = 100 - (100 / (1 + rs))
                rsi_val = float(rsi_s.iloc[-1]) if not np.isnan(rsi_s.iloc[-1]) else 55.0

            cur.execute("""
            UPDATE universe_metadata
            SET latest_close = ?, latest_date = ?, high_52w = ?, low_52w = ?, 
                return_1w_pct = ?, return_1m_pct = ?, rsi_14 = ?
            WHERE symbol = ?
            """, (last_c, last_dt, h52, l52, ret_1w, ret_1m, round(rsi_val, 1), sym))

        except Exception as e:
            logging.warning(f"Error syncing {sym}: {e}")

    conn.commit()
    conn.close()
    logging.info(f"✔ Successfully synced {total_inserted} daily price records into SQLite database.")

if __name__ == "__main__":
    sync_daily_prices()
