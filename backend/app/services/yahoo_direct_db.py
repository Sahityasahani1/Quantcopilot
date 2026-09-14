"""
QuantCopilot AI - Direct Yahoo Finance to PostgreSQL Database Ingestion & Sync Engine
Enables high-efficiency incremental caching, bulk OHLCV ingestion, and real-time quote streaming directly into PostgreSQL.
"""

import os
import time
import logging
import asyncio
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd
import numpy as np
import yfinance as yf
import asyncpg

from app.config import settings

logger = logging.getLogger("yahoo_direct_db")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Complete Standard Symbol Mapping for Indian Markets and Indices
YF_INDEX_MAP = {
    "NIFTY 50": "^NSEI",
    "^NSEI": "^NSEI",
    "BANKNIFTY": "^NSEBANK",
    "^NSEBANK": "^NSEBANK",
    "FINNIFTY": "NIFTY_FIN_SERVICE.NS",
    "MIDCPNIFTY": "NIFTY_MIDCAP_100.NS",
    "SENSEX": "^BSESN",
    "^BSESN": "^BSESN",
}

def resolve_yahoo_symbol(symbol: str, exchange: str = "NSE") -> str:
    """Resolves standard clean Indian ticker into Yahoo Finance query format."""
    clean_sym = symbol.replace("-EQ", "").strip().upper()
    if clean_sym in YF_INDEX_MAP:
        return YF_INDEX_MAP[clean_sym]
    if exchange.upper() == "BSE":
        return f"{clean_sym}.BO"
    return f"{clean_sym}.NS"


class YahooDirectDBEngine:
    """
    Direct Database-Integrated Yahoo Finance Engine.
    Provides sub-5ms cached queries from PostgreSQL with automatic on-demand syncing.
    """

    def __init__(self, pool: Optional[asyncpg.Pool] = None):
        self.pool = pool

    async def get_connection(self) -> asyncpg.Connection:
        """Gets connection from pool or creates direct autonomous connection."""
        if self.pool is not None:
            return await self.pool.acquire()
        return await asyncpg.connect(
            dsn=settings.DATABASE_URL,
            timeout=30
        )

    async def release_connection(self, conn: asyncpg.Connection):
        """Releases or closes connection."""
        if self.pool is not None:
            await self.pool.release(conn)
        else:
            await conn.close()

    def fetch_ohlcv_from_yahoo(
        self,
        symbol: str,
        exchange: str = "NSE",
        period: str = "1y",
        start_date: Optional[str] = None
    ) -> Optional[pd.DataFrame]:
        """
        Synchronously downloads OHLCV from Yahoo Finance with error handling and MultiIndex cleaning.
        """
        yf_ticker = resolve_yahoo_symbol(symbol, exchange)
        try:
            if start_date:
                df = yf.download(yf_ticker, start=start_date, interval="1d", progress=False)
            else:
                df = yf.download(yf_ticker, period=period, interval="1d", progress=False)

            if df is not None and not df.empty:
                if isinstance(df.columns, pd.MultiIndex):
                    df.columns = df.columns.get_level_values(0)
                df.reset_index(inplace=True)
                df["symbol"] = symbol.replace("-EQ", "").strip().upper()
                df["exchange"] = exchange.upper()
                return df
        except Exception as e:
            logger.warning(f"Yahoo Finance download error for {symbol} ({yf_ticker}): {e}")
        return None

    async def sync_single_stock_to_db(
        self,
        symbol: str,
        exchange: str = "NSE",
        period: str = "1y",
        force_full: bool = False
    ) -> Dict[str, Any]:
        """
        Incrementally synchronizes a single stock from Yahoo Finance into PostgreSQL.
        Checks MAX(date) in DB to fetch only the missing delta bars if recent data exists.
        """
        clean_sym = symbol.replace("-EQ", "").strip().upper()
        ex = exchange.upper()
        start_time = time.time()
        
        conn = None
        last_date = None
        existing_count = 0

        try:
            conn = await self.get_connection()
            # 1. Check existing record count & latest date in DB
            row = await conn.fetchrow(
                """
                SELECT COUNT(*) as cnt, MAX(date) as max_date 
                FROM historical_stock_data 
                WHERE symbol = $1 AND exchange = $2
                """,
                clean_sym, ex
            )
            if row:
                existing_count = row["cnt"]
                last_date = row["max_date"]

            # Determine start date for incremental fetch
            start_date_str = None
            if not force_full and last_date is not None and existing_count > 20:
                # Delta fetch starting 5 days before last date to ensure adjustments/dividends are updated
                delta_start = last_date - timedelta(days=5)
                start_date_str = delta_start.strftime("%Y-%m-%d")

            # 2. Download from Yahoo Finance
            df = self.fetch_ohlcv_from_yahoo(clean_sym, ex, period=period, start_date=start_date_str)
            if df is None or df.empty:
                return {
                    "symbol": clean_sym,
                    "exchange": ex,
                    "status": "NO_DATA_OR_UNCHANGED",
                    "inserted_count": 0,
                    "existing_count": existing_count,
                    "latest_date": str(last_date) if last_date else None,
                    "elapsed_ms": round((time.time() - start_time) * 1000, 2)
                }

            # 3. Prepare records for high-speed bulk upsert
            records = []
            for _, r in df.iterrows():
                try:
                    dt = r["Date"].date() if hasattr(r["Date"], "date") else pd.to_datetime(r["Date"]).date()
                    close_p = float(r["Close"] if "Close" in r else r["Adj Close"])
                    open_p = float(r["Open"]) if "Open" in r else close_p
                    high_p = float(r["High"]) if "High" in r else close_p
                    low_p = float(r["Low"]) if "Low" in r else close_p
                    vol = int(r["Volume"]) if "Volume" in r else 100000
                    pct = round(((close_p - open_p) / open_p) * 100, 2) if open_p > 0 else 0.0

                    if not (np.isnan(close_p) or np.isnan(open_p)):
                        records.append((clean_sym, ex, dt, open_p, high_p, low_p, close_p, vol, pct))
                except Exception:
                    continue

            # 4. Execute bulk upsert in PostgreSQL
            if records:
                await conn.executemany(
                    """
                    INSERT INTO historical_stock_data (symbol, exchange, date, open_price, high_price, low_price, close_price, volume, pct_change)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (symbol, exchange, date) DO UPDATE 
                    SET open_price = EXCLUDED.open_price,
                        high_price = EXCLUDED.high_price,
                        low_price = EXCLUDED.low_price,
                        close_price = EXCLUDED.close_price,
                        volume = EXCLUDED.volume,
                        pct_change = EXCLUDED.pct_change
                    """,
                    records
                )

            # 5. Fetch updated summary
            summary = await conn.fetchrow(
                """
                SELECT COUNT(*) as total_candles, MIN(date) as min_dt, MAX(date) as max_dt, 
                       (SELECT close_price FROM historical_stock_data WHERE symbol = $1 AND exchange = $2 ORDER BY date DESC LIMIT 1) as latest_price
                FROM historical_stock_data
                WHERE symbol = $1 AND exchange = $2
                """,
                clean_sym, ex
            )

            return {
                "symbol": clean_sym,
                "exchange": ex,
                "status": "SUCCESS",
                "synced_candles": len(records),
                "total_db_candles": summary["total_candles"] if summary else len(records),
                "date_range": f"{summary['min_dt']} to {summary['max_dt']}" if summary and summary['min_dt'] else "N/A",
                "latest_price": float(summary["latest_price"]) if summary and summary["latest_price"] else None,
                "elapsed_ms": round((time.time() - start_time) * 1000, 2)
            }

        except Exception as e:
            logger.error(f"Failed direct DB sync for {clean_sym}: {e}")
            return {
                "symbol": clean_sym,
                "exchange": ex,
                "status": "ERROR",
                "error": str(e),
                "elapsed_ms": round((time.time() - start_time) * 1000, 2)
            }
        finally:
            if conn:
                await self.release_connection(conn)

    async def batch_sync_all_securities(
        self,
        exchange: Optional[str] = None,
        period: str = "1y",
        max_workers: int = 6
    ) -> Dict[str, Any]:
        """
        Fetches all securities registered in securities_master and syncs historical data
        directly from Yahoo Finance into PostgreSQL using parallel multi-threaded workers.
        """
        start_time = time.time()
        conn = None
        universe = []

        try:
            conn = await self.get_connection()
            query = "SELECT symbol, exchange, company_name FROM securities_master WHERE is_active = TRUE"
            params = []
            if exchange and exchange.upper() in ["NSE", "BSE"]:
                query += " AND exchange = $1"
                params.append(exchange.upper())
            
            rows = await conn.fetch(query, *params)
            universe = [{"symbol": r["symbol"], "exchange": r["exchange"], "name": r["company_name"]} for r in rows]
        except Exception as e:
            logger.warning(f"Could not load securities from DB ({e}). Falling back to default list.")
        finally:
            if conn:
                await self.release_connection(conn)

        if not universe:
            # Default core list fallback
            universe = [
                {"symbol": "RELIANCE", "exchange": "NSE"},
                {"symbol": "TCS", "exchange": "NSE"},
                {"symbol": "HDFCBANK", "exchange": "NSE"},
                {"symbol": "INFY", "exchange": "NSE"},
                {"symbol": "ICICIBANK", "exchange": "NSE"},
                {"symbol": "TATAMOTORS", "exchange": "NSE"},
                {"symbol": "SBIN", "exchange": "NSE"},
                {"symbol": "ITC", "exchange": "NSE"},
                {"symbol": "BHARTIARTL", "exchange": "NSE"},
                {"symbol": "LT", "exchange": "NSE"},
                {"symbol": "NIFTY 50", "exchange": "NSE"},
                {"symbol": "BANKNIFTY", "exchange": "NSE"},
                {"symbol": "SENSEX", "exchange": "BSE"}
            ]

        logger.info(f"Starting Direct Yahoo Finance batch sync for {len(universe)} symbols...")
        
        # Parallel download in thread pool
        download_results: List[Tuple[str, str, Optional[pd.DataFrame]]] = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {
                executor.submit(self.fetch_ohlcv_from_yahoo, item["symbol"], item["exchange"], period): item
                for item in universe
            }
            for future in as_completed(future_map):
                item = future_map[future]
                sym = item["symbol"]
                ex = item["exchange"]
                try:
                    df = future.result()
                    download_results.append((sym, ex, df))
                except Exception as e:
                    logger.warning(f"Failed worker download for {sym}: {e}")
                    download_results.append((sym, ex, None))

        # Bulk persist into PostgreSQL
        total_inserted = 0
        successful_symbols = 0
        failed_symbols = 0

        conn = None
        try:
            conn = await self.get_connection()
            all_records = []
            
            for sym, ex, df in download_results:
                if df is None or df.empty:
                    failed_symbols += 1
                    continue
                
                successful_symbols += 1
                for _, r in df.iterrows():
                    try:
                        dt = r["Date"].date() if hasattr(r["Date"], "date") else pd.to_datetime(r["Date"]).date()
                        close_p = float(r["Close"] if "Close" in r else r["Adj Close"])
                        open_p = float(r["Open"]) if "Open" in r else close_p
                        high_p = float(r["High"]) if "High" in r else close_p
                        low_p = float(r["Low"]) if "Low" in r else close_p
                        vol = int(r["Volume"]) if "Volume" in r else 100000
                        pct = round(((close_p - open_p) / open_p) * 100, 2) if open_p > 0 else 0.0

                        if not (np.isnan(close_p) or np.isnan(open_p)):
                            all_records.append((sym, ex, dt, open_p, high_p, low_p, close_p, vol, pct))
                    except Exception:
                        continue

            if all_records:
                # Chunked bulk execution to prevent memory pressure
                chunk_size = 5000
                for i in range(0, len(all_records), chunk_size):
                    chunk = all_records[i:i + chunk_size]
                    await conn.executemany(
                        """
                        INSERT INTO historical_stock_data (symbol, exchange, date, open_price, high_price, low_price, close_price, volume, pct_change)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        ON CONFLICT (symbol, exchange, date) DO UPDATE 
                        SET open_price = EXCLUDED.open_price,
                            high_price = EXCLUDED.high_price,
                            low_price = EXCLUDED.low_price,
                            close_price = EXCLUDED.close_price,
                            volume = EXCLUDED.volume,
                            pct_change = EXCLUDED.pct_change
                        """,
                        chunk
                    )
                total_inserted = len(all_records)
                logger.info(f"Successfully upserted {total_inserted} OHLCV rows across {successful_symbols} symbols.")

        except Exception as e:
            logger.error(f"Error persisting batch data to DB: {e}")
        finally:
            if conn:
                await self.release_connection(conn)

        elapsed_sec = round(time.time() - start_time, 2)
        return {
            "status": "COMPLETED",
            "total_universe_count": len(universe),
            "successful_symbols": successful_symbols,
            "failed_symbols": failed_symbols,
            "total_candles_persisted": total_inserted,
            "period": period,
            "elapsed_seconds": elapsed_sec
        }

    async def get_db_cache_statistics(self) -> Dict[str, Any]:
        """
        Queries PostgreSQL to return real-time health and statistics about cached market data.
        """
        conn = None
        try:
            conn = await self.get_connection()
            stats = await conn.fetchrow(
                """
                SELECT 
                    (SELECT COUNT(*) FROM securities_master) as total_securities,
                    (SELECT COUNT(*) FROM securities_master WHERE exchange = 'NSE') as nse_securities,
                    (SELECT COUNT(*) FROM securities_master WHERE exchange = 'BSE') as bse_securities,
                    (SELECT COUNT(*) FROM historical_stock_data) as total_candles,
                    (SELECT COUNT(DISTINCT symbol) FROM historical_stock_data) as symbols_with_history,
                    (SELECT MIN(date) FROM historical_stock_data) as earliest_candle_date,
                    (SELECT MAX(date) FROM historical_stock_data) as latest_candle_date
                """
            )
            
            top_stocks = await conn.fetch(
                """
                SELECT symbol, exchange, COUNT(*) as candle_count, MAX(date) as latest_date,
                       (SELECT close_price FROM historical_stock_data h2 WHERE h2.symbol = h1.symbol AND h2.exchange = h1.exchange ORDER BY date DESC LIMIT 1) as ltp
                FROM historical_stock_data h1
                GROUP BY symbol, exchange
                ORDER BY candle_count DESC
                LIMIT 10;
                """
            )

            return {
                "database_connected": True,
                "total_securities_master": stats["total_securities"] or 0,
                "nse_securities": stats["nse_securities"] or 0,
                "bse_securities": stats["bse_securities"] or 0,
                "total_cached_candles": stats["total_candles"] or 0,
                "symbols_with_history": stats["symbols_with_history"] or 0,
                "earliest_date": str(stats["earliest_candle_date"]) if stats["earliest_candle_date"] else None,
                "latest_date": str(stats["latest_candle_date"]) if stats["latest_candle_date"] else None,
                "top_cached_instruments": [
                    {
                        "symbol": r["symbol"],
                        "exchange": r["exchange"],
                        "candles": r["candle_count"],
                        "latest_date": str(r["latest_date"]),
                        "last_close": float(r["ltp"]) if r["ltp"] else None
                    }
                    for r in top_stocks
                ]
            }
        except Exception as e:
            return {
                "database_connected": False,
                "error": str(e),
                "message": "PostgreSQL database is currently offline or uninitialized."
            }
        finally:
            if conn:
                await self.release_connection(conn)

    def fetch_live_quotes_batch(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """
        Fetches real-time / current market quotes for Indian equities and indices using yfinance.
        """
        results = []
        clean_symbols = [s.replace("-EQ", "").strip().upper() for s in symbols]
        yf_map = {s: resolve_yahoo_symbol(s) for s in clean_symbols}
        yf_tickers = list(set(yf_map.values()))
        
        try:
            data = yf.download(yf_tickers, period="5d", interval="1d", group_by="ticker", progress=False)
            now_ms = int(time.time() * 1000)
            
            for sym, yf_sym in yf_map.items():
                try:
                    if len(yf_tickers) == 1:
                        df = data
                    else:
                        df = data[yf_sym] if yf_sym in data else None
                        
                    if df is not None and not df.empty and len(df) >= 1:
                        # Clean if multi-index
                        latest = df.iloc[-1]
                        prev = df.iloc[-2] if len(df) >= 2 else latest
                        
                        close_p = float(latest["Close"] if "Close" in latest else latest["Adj Close"])
                        prev_p = float(prev["Close"] if "Close" in prev else prev["Adj Close"])
                        open_p = float(latest["Open"]) if "Open" in latest else close_p
                        high_p = float(latest["High"]) if "High" in latest else close_p
                        low_p = float(latest["Low"]) if "Low" in latest else close_p
                        vol = int(latest["Volume"]) if "Volume" in latest else 100000
                        
                        if not np.isnan(close_p) and close_p > 0:
                            chg_pts = round(close_p - prev_p, 2)
                            chg_pct = round((chg_pts / (prev_p + 1e-6)) * 100, 2)
                            
                            results.append({
                                "symbol": sym,
                                "price": round(close_p, 2),
                                "prev_close": round(prev_p, 2),
                                "open_price": round(open_p, 2),
                                "day_high": round(high_p, 2),
                                "day_low": round(low_p, 2),
                                "change_24h": chg_pct,
                                "change_pts": chg_pts,
                                "volume_24h": vol,
                                "timestamp": now_ms
                            })
                except Exception:
                    pass
        except Exception as e:
            logger.warning(f"Batch live quote error: {e}")
            
        return results


yahoo_db_engine = YahooDirectDBEngine()

