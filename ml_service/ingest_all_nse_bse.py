"""
QuantCopilot AI - High Performance Indian Stock Market (NSE & BSE) Batch Ingestion Pipeline
"""

import os
import io
import json
import time
import logging
import asyncio
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import requests
import yfinance as yf
import asyncpg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

NSE_LIST_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
KITE_INSTRUMENTS_URL = "https://api.kite.trade/instruments"
DATA_CACHE_DIR = os.path.join(os.path.dirname(__file__), "data_cache")
os.makedirs(DATA_CACHE_DIR, exist_ok=True)

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = int(os.getenv("PG_PORT", "5432"))
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "postgres")
PG_DATABASE = os.getenv("PG_DATABASE", "quantcopilot")

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# Core curated universe for initial fast seeding
CORE_NSE_BSE_UNIVERSE = [
    {"symbol": "RELIANCE", "exchange": "NSE", "scrip_code": "500325", "name": "Reliance Industries Ltd", "sector": "Energy"},
    {"symbol": "TCS", "exchange": "NSE", "scrip_code": "532540", "name": "Tata Consultancy Services Ltd", "sector": "IT Services"},
    {"symbol": "HDFCBANK", "exchange": "NSE", "scrip_code": "500180", "name": "HDFC Bank Ltd", "sector": "Banking"},
    {"symbol": "INFY", "exchange": "NSE", "scrip_code": "500209", "name": "Infosys Ltd", "sector": "IT Services"},
    {"symbol": "ICICIBANK", "exchange": "NSE", "scrip_code": "532174", "name": "ICICI Bank Ltd", "sector": "Banking"},
    {"symbol": "TATAMOTORS", "exchange": "NSE", "scrip_code": "500570", "name": "Tata Motors Ltd", "sector": "Automotive"},
    {"symbol": "SBIN", "exchange": "NSE", "scrip_code": "500112", "name": "State Bank of India", "sector": "Banking"},
    {"symbol": "ITC", "exchange": "NSE", "scrip_code": "500875", "name": "ITC Ltd", "sector": "FMCG"},
    {"symbol": "BHARTIARTL", "exchange": "NSE", "scrip_code": "532454", "name": "Bharti Airtel Ltd", "sector": "Telecom"},
    {"symbol": "LT", "exchange": "NSE", "scrip_code": "500510", "name": "Larsen & Toubro Ltd", "sector": "Infrastructure"},
    {"symbol": "AXISBANK", "exchange": "NSE", "scrip_code": "532215", "name": "Axis Bank Ltd", "sector": "Banking"},
    {"symbol": "KOTAKBANK", "exchange": "NSE", "scrip_code": "500247", "name": "Kotak Mahindra Bank Ltd", "sector": "Banking"},
    {"symbol": "HINDUNILVR", "exchange": "NSE", "scrip_code": "500696", "name": "Hindustan Unilever Ltd", "sector": "FMCG"},
    {"symbol": "MARUTI", "exchange": "NSE", "scrip_code": "532500", "name": "Maruti Suzuki India Ltd", "sector": "Automotive"},
    {"symbol": "SUNPHARMA", "exchange": "NSE", "scrip_code": "524715", "name": "Sun Pharmaceutical Industries Ltd", "sector": "Pharma"},
    {"symbol": "BAJFINANCE", "exchange": "NSE", "scrip_code": "500034", "name": "Bajaj Finance Ltd", "sector": "Financial Services"},
    {"symbol": "TATASTEEL", "exchange": "NSE", "scrip_code": "500470", "name": "Tata Steel Ltd", "sector": "Metals"},
    {"symbol": "ASIANPAINT", "exchange": "NSE", "scrip_code": "500820", "name": "Asian Paints Ltd", "sector": "Paints & Coatings"},
    {"symbol": "TITAN", "exchange": "NSE", "scrip_code": "500114", "name": "Titan Company Ltd", "sector": "Consumer Discretionary"},
    {"symbol": "WIPRO", "exchange": "NSE", "scrip_code": "507685", "name": "Wipro Ltd", "sector": "IT Services"},
    {"symbol": "SENSEX", "exchange": "BSE", "scrip_code": "1", "name": "S&P BSE Sensex Index", "sector": "Index"},
    {"symbol": "NIFTY 50", "exchange": "NSE", "scrip_code": "26000", "name": "NIFTY 50 Benchmark Index", "sector": "Index"},
    {"symbol": "BANKNIFTY", "exchange": "NSE", "scrip_code": "26009", "name": "NIFTY Bank Sectoral Index", "sector": "Index"}
]


def fetch_all_nse_listed_symbols() -> List[Dict[str, Any]]:
    """Downloads official master list of active equities from NSE India."""
    logging.info(f"Downloading NSE securities master from {NSE_LIST_URL}...")
    try:
        res = requests.get(NSE_LIST_URL, headers=HTTP_HEADERS, timeout=15)
        if res.status_code == 200:
            df = pd.read_csv(io.StringIO(res.text))
            df = df[df["SERIES"] == "EQ"].copy()
            stocks = []
            for _, row in df.iterrows():
                sym = str(row.get("SYMBOL", "")).strip()
                if sym:
                    stocks.append({
                        "symbol": sym,
                        "exchange": "NSE",
                        "name": str(row.get("NAME OF COMPANY", sym)).strip(),
                        "isin": str(row.get("ISIN NUMBER", "")).strip(),
                        "sector": "Equities"
                    })
            logging.info(f"Fetched {len(stocks)} active NSE equities.")
            return stocks
    except Exception as e:
        logging.warning(f"Could not download live NSE list ({e}). Using core list.")
    return CORE_NSE_BSE_UNIVERSE


def download_single_ticker_ohlcv(symbol: str, exchange: str = "NSE", period: str = "1y") -> Optional[pd.DataFrame]:
    """Downloads daily historical OHLCV data using Yahoo Finance."""
    clean_sym = symbol.strip().upper()
    if clean_sym in ["NIFTY 50", "^NSEI"]:
        yf_ticker = "^NSEI"
    elif clean_sym in ["BANKNIFTY", "^NSEBANK"]:
        yf_ticker = "^NSEBANK"
    elif clean_sym in ["SENSEX", "^BSESN"]:
        yf_ticker = "^BSESN"
    elif exchange == "BSE":
        yf_ticker = f"{clean_sym}.BO"
    else:
        yf_ticker = f"{clean_sym}.NS"

    try:
        df = yf.download(yf_ticker, period=period, interval="1d", progress=False)
        if df is not None and not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)
            df.reset_index(inplace=True)
            df["symbol"] = clean_sym
            df["exchange"] = exchange
            
            # Save to CSV cache
            csv_path = os.path.join(DATA_CACHE_DIR, f"{exchange}_{clean_sym.replace(' ', '_')}.csv")
            df.to_csv(csv_path, index=False)
            return df
    except Exception as e:
        logging.warning(f"Error fetching {clean_sym} ({yf_ticker}): {e}")
    return None


def batch_ingest_historical_data(universe: List[Dict[str, Any]], max_workers: int = 6, period: str = "1y") -> Dict[str, pd.DataFrame]:
    """Ingests historical data in parallel across all specified stocks."""
    logging.info(f"Starting batch historical download for {len(universe)} symbols with {max_workers} threads...")
    results = {}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_map = {
            executor.submit(download_single_ticker_ohlcv, item["symbol"], item.get("exchange", "NSE"), period): item
            for item in universe
        }
        
        completed = 0
        for future in as_completed(future_map):
            item = future_map[future]
            sym = item["symbol"]
            completed += 1
            try:
                df = future.result()
                if df is not None and not df.empty:
                    results[sym] = df
            except Exception as e:
                logging.warning(f"Failed processing {sym}: {e}")
                
            if completed % 10 == 0 or completed == len(universe):
                logging.info(f"Progress: {completed}/{len(universe)} stocks processed ({len(results)} successful)")

    return results


async def persist_to_postgres(historical_map: Dict[str, pd.DataFrame], universe: List[Dict[str, Any]]) -> None:
    """Inserts / updates the master securities catalogue and historical stock candles in PostgreSQL."""
    try:
        conn = await asyncpg.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASSWORD,
            database=PG_DATABASE
        )
    except Exception as e:
        logging.warning(f"PostgreSQL connection unavailable ({e}). Data saved in local cache {DATA_CACHE_DIR}.")
        return

    try:
        # 1. Upsert Securities Master
        sec_records = []
        for item in universe:
            sec_records.append((
                item["symbol"],
                item.get("exchange", "NSE"),
                item.get("scrip_code"),
                item.get("isin"),
                item.get("name", item["symbol"]),
                item.get("sector", "Equities"),
                True,
                0.0
            ))
        
        if sec_records:
            await conn.executemany(
                """
                INSERT INTO securities_master (symbol, exchange, scrip_code, isin, company_name, sector, is_active, market_cap_cr)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (symbol, exchange) DO UPDATE
                SET company_name = EXCLUDED.company_name,
                    isin = EXCLUDED.isin,
                    sector = EXCLUDED.sector,
                    scrip_code = EXCLUDED.scrip_code
                """,
                sec_records
            )
            logging.info(f"Upserted {len(sec_records)} records into securities_master table.")

        # 2. Bulk Insert Historical Candles
        candle_records = []
        for sym, df in historical_map.items():
            ex = df["exchange"].iloc[0] if "exchange" in df.columns else "NSE"
            for _, row in df.iterrows():
                try:
                    dt = row["Date"].date() if hasattr(row["Date"], "date") else pd.to_datetime(row["Date"]).date()
                    close_p = float(row["Close"] if "Close" in row else row["Adj Close"])
                    open_p = float(row["Open"]) if "Open" in row else close_p
                    high_p = float(row["High"]) if "High" in row else close_p
                    low_p = float(row["Low"]) if "Low" in row else close_p
                    vol = int(row["Volume"]) if "Volume" in row else 100000
                    pct = round(((close_p - open_p) / open_p) * 100, 2) if open_p > 0 else 0.0
                    candle_records.append((sym, ex, dt, open_p, high_p, low_p, close_p, vol, pct))
                except Exception:
                    continue

        if candle_records:
            await conn.executemany(
                """
                INSERT INTO historical_stock_data (symbol, exchange, date, open_price, high_price, low_price, close_price, volume, pct_change)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (symbol, exchange, date) DO UPDATE
                SET close_price = EXCLUDED.close_price, volume = EXCLUDED.volume, pct_change = EXCLUDED.pct_change
                """,
                candle_records
            )
            logging.info(f"Persisted {len(candle_records)} historical OHLCV rows into PostgreSQL.")

    finally:
        await conn.close()


def run_complete_ingestion(limit: Optional[int] = None):
    """Main execution function to discover instruments, ingest history, and persist."""
    # 1. Fetch Master List
    nse_stocks = fetch_all_nse_listed_symbols()
    universe = CORE_NSE_BSE_UNIVERSE + [s for s in nse_stocks if s["symbol"] not in [c["symbol"] for c in CORE_NSE_BSE_UNIVERSE]]
    
    if limit:
        universe = universe[:limit]
    
    logging.info(f"Total Target Universe: {len(universe)} symbols across NSE and BSE.")
    
    # 2. Batch Download History
    hist_data = batch_ingest_historical_data(universe, max_workers=6, period="1y")
    
    # 3. Persist to PostgreSQL & Cache
    asyncio.run(persist_to_postgres(hist_data, universe))
    logging.info("Complete NSE & BSE historical ingestion pipeline finished successfully.")


if __name__ == "__main__":
    run_complete_ingestion(limit=30)
