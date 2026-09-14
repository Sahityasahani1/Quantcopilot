"""
QuantCopilot AI - Institutional Database Access & Sync Engine
Loads market history from PostgreSQL, buffers real-time ticks from Redis,
and syncs Bhavcopy/Yahoo records into the SQL database.
"""

import os
import glob
import json
import time
import asyncio
import logging
import sqlite3
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
import asyncpg
import redis

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/quantcopilot")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
DATA_CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "data_cache"))
SQLITE_DB_PATH = os.path.join(DATA_CACHE_DIR, "quantcopilot_history.db")
os.makedirs(DATA_CACHE_DIR, exist_ok=True)


class DatabaseMarketLoader:
    """
    Unified Data Layer providing high-speed access to PostgreSQL historical records
    and Redis live memory buffers for ML model training and inference.
    """

    def __init__(self, db_url: str = DATABASE_URL, redis_url: str = REDIS_URL):
        self.db_url = db_url
        self.redis_url = redis_url
        self._init_sqlite_engine()

    def _init_sqlite_engine(self):
        """Initializes local SQLite embedded database as high-speed SQL fallback."""
        try:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
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
                delivery_pct REAL DEFAULT 0.0,
                trades_count INTEGER DEFAULT 0,
                pct_change REAL DEFAULT 0.0,
                PRIMARY KEY (symbol, exchange, date)
            )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sym_date ON historical_stock_data (symbol, date ASC)")
            conn.commit()
            conn.close()
        except Exception as e:
            logging.warning(f"Could not init SQLite cache: {e}")

    def get_redis_client(self) -> Optional[redis.Redis]:
        """Gets synchronous Redis client."""
        try:
            r = redis.from_url(self.redis_url, decode_responses=True, socket_timeout=1.5)
            r.ping()
            return r
        except Exception:
            return None

    async def get_postgres_connection(self) -> Optional[asyncpg.Connection]:
        """Attempts connection to PostgreSQL server."""
        try:
            conn = await asyncpg.connect(self.db_url, timeout=3.0)
            return conn
        except Exception:
            return None

    def load_live_buffer_from_redis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Fetches current real-time tick cache from Redis."""
        r = self.get_redis_client()
        if r is None:
            return None
        try:
            clean_sym = symbol.replace("-EQ", "").strip().upper()
            raw = r.get(f"market:live:{clean_sym}")
            if raw:
                return json.loads(raw)
        except Exception:
            pass
        return None

    async def load_from_postgres_async(
        self,
        symbols: Optional[List[str]] = None,
        limit_per_symbol: int = 4000
    ) -> Dict[str, pd.DataFrame]:
        """Loads historical price series directly from PostgreSQL table."""
        dfs: Dict[str, pd.DataFrame] = {}
        conn = await self.get_postgres_connection()
        if conn is None:
            return dfs

        try:
            if symbols:
                clean_symbols = [s.replace("-EQ", "").strip().upper() for s in symbols]
                query = """
                SELECT symbol, date, open_price, high_price, low_price, close_price, 
                       avg_price, volume, delivery_qty, delivery_pct, trades_count
                FROM historical_stock_data
                WHERE symbol = ANY($1)
                ORDER BY symbol, date ASC
                """
                rows = await conn.fetch(query, clean_symbols)
            else:
                query = """
                SELECT symbol, date, open_price, high_price, low_price, close_price, 
                       avg_price, volume, delivery_qty, delivery_pct, trades_count
                FROM historical_stock_data
                ORDER BY symbol, date ASC
                """
                rows = await conn.fetch(query)

            if rows:
                raw_df = pd.DataFrame([dict(r) for r in rows])
                for sym, group in raw_df.groupby("symbol"):
                    group_df = group.rename(columns={
                        "date": "Date",
                        "open_price": "Open",
                        "high_price": "High",
                        "low_price": "Low",
                        "close_price": "Close",
                        "avg_price": "AvgPrice",
                        "volume": "Volume",
                        "delivery_qty": "DelivQty",
                        "delivery_pct": "DelivPct",
                        "trades_count": "Trades"
                    }).sort_values("Date").reset_index(drop=True)
                    dfs[sym] = group_df

        except Exception as e:
            logging.warning(f"PostgreSQL query error: {e}")
        finally:
            await conn.close()

        return dfs

    def load_from_sqlite(self, symbols: Optional[List[str]] = None) -> Dict[str, pd.DataFrame]:
        """Loads historical price series from SQLite embedded database."""
        dfs: Dict[str, pd.DataFrame] = {}
        try:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            if symbols:
                clean_syms = [s.replace("-EQ", "").strip().upper() for s in symbols]
                placeholders = ",".join(["?"] * len(clean_syms))
                query = f"""
                SELECT symbol, date as Date, open_price as Open, high_price as High, low_price as Low, 
                       close_price as Close, avg_price as AvgPrice, volume as Volume, 
                       delivery_qty as DelivQty, delivery_pct as DelivPct, trades_count as Trades
                FROM historical_stock_data
                WHERE symbol IN ({placeholders})
                ORDER BY symbol, date ASC
                """
                raw_df = pd.read_sql_query(query, conn, params=clean_syms)
            else:
                query = """
                SELECT symbol, date as Date, open_price as Open, high_price as High, low_price as Low, 
                       close_price as Close, avg_price as AvgPrice, volume as Volume, 
                       delivery_qty as DelivQty, delivery_pct as DelivPct, trades_count as Trades
                FROM historical_stock_data
                ORDER BY symbol, date ASC
                """
                raw_df = pd.read_sql_query(query, conn)
            conn.close()

            if not raw_df.empty:
                for sym, group in raw_df.groupby("symbol"):
                    dfs[sym] = group.sort_values("Date").reset_index(drop=True)
        except Exception as e:
            logging.warning(f"SQLite load error: {e}")

        return dfs

    def load_from_csv_cache(self, symbols: Optional[List[str]] = None) -> Dict[str, pd.DataFrame]:
        """Loads historical price series from local CSV cache."""
        dfs: Dict[str, pd.DataFrame] = {}
        csv_files = glob.glob(os.path.join(DATA_CACHE_DIR, "*.csv"))
        for fp in csv_files:
            try:
                sym = os.path.basename(fp).replace("-EQ.csv", "").replace(".csv", "").strip().upper()
                if symbols and sym not in [s.replace("-EQ", "").strip().upper() for s in symbols]:
                    continue
                df = pd.read_csv(fp)
                if not df.empty:
                    dfs[sym] = df
            except Exception:
                pass
        return dfs

    def load_market_history(self, symbols: Optional[List[str]] = None) -> Dict[str, pd.DataFrame]:
        """
        Unified Loader: Tries PostgreSQL first, then SQLite, then CSV cache.
        """
        # 1. Try PostgreSQL
        try:
            pg_dfs = asyncio.run(self.load_from_postgres_async(symbols))
            if pg_dfs and len(pg_dfs) > 0:
                logging.info(f"Loaded {len(pg_dfs)} symbol time series directly from PostgreSQL database.")
                return pg_dfs
        except Exception:
            pass

        # 2. Try SQLite SQL storage
        sqlite_dfs = self.load_from_sqlite(symbols)
        if sqlite_dfs and len(sqlite_dfs) > 0:
            logging.info(f"Loaded {len(sqlite_dfs)} symbol time series from SQLite SQL storage.")
            return sqlite_dfs

        # 3. Fallback to CSV cache
        csv_dfs = self.load_from_csv_cache(symbols)
        logging.info(f"Loaded {len(csv_dfs)} symbol time series from local data cache.")
        return csv_dfs

    async def sync_bhavcopy_to_postgres(self) -> int:
        """
        Bulk syncs all historical files from data_cache into PostgreSQL & SQLite tables.
        Returns total number of records synced.
        """
        csv_files = glob.glob(os.path.join(DATA_CACHE_DIR, "*.csv"))
        if not csv_files:
            logging.warning("No CSV files found in data_cache to sync.")
            return 0

        logging.info(f"🚀 Starting bulk sync of {len(csv_files)} files into SQL databases...")
        total_synced = 0
        all_records: List[Dict[str, Any]] = []

        for fp in csv_files:
            sym = os.path.basename(fp).replace("-EQ.csv", "").replace(".csv", "").strip().upper()
            try:
                df = pd.read_csv(fp)
                for _, row in df.iterrows():
                    date_val = str(row.get("Date", "")).strip()
                    close_p = float(row.get("Close", 0.0))
                    open_p = float(row.get("Open", close_p))
                    high_p = float(row.get("High", close_p))
                    low_p = float(row.get("Low", close_p))
                    avg_p = float(row.get("AvgPrice", close_p))
                    vol = int(float(row.get("Volume", 0)))
                    deliv_qty = int(float(row.get("DelivQty", 0)))
                    deliv_pct = float(row.get("DelivPct", 0.0))
                    trades = int(float(row.get("Trades", 0)))

                    if date_val and close_p > 0:
                        all_records.append({
                            "symbol": sym,
                            "exchange": "NSE",
                            "date": date_val,
                            "open_price": open_p,
                            "high_price": high_p,
                            "low_price": low_p,
                            "close_price": close_p,
                            "avg_price": avg_p,
                            "volume": vol,
                            "delivery_qty": deliv_qty,
                            "delivery_pct": deliv_pct,
                            "trades_count": trades,
                            "pct_change": 0.0
                        })
            except Exception as e:
                logging.warning(f"Error parsing {fp}: {e}")

        # 1. Sync to SQLite
        try:
            conn_sq = sqlite3.connect(SQLITE_DB_PATH)
            cur_sq = conn_sq.cursor()
            cur_sq.executemany("""
            INSERT OR REPLACE INTO historical_stock_data 
            (symbol, exchange, date, open_price, high_price, low_price, close_price, avg_price, volume, delivery_qty, delivery_pct, trades_count, pct_change)
            VALUES (:symbol, :exchange, :date, :open_price, :high_price, :low_price, :close_price, :avg_price, :volume, :delivery_qty, :delivery_pct, :trades_count, :pct_change)
            """, all_records)
            conn_sq.commit()
            conn_sq.close()
            logging.info(f"💾 Synced {len(all_records)} records into SQLite SQL database ({SQLITE_DB_PATH}).")
        except Exception as e:
            logging.warning(f"SQLite sync error: {e}")

        # 2. Sync to PostgreSQL if connected
        pg_conn = await self.get_postgres_connection()
        if pg_conn:
            try:
                # Batch upsert
                batch_size = 5000
                for i in range(0, len(all_records), batch_size):
                    batch = all_records[i : i + batch_size]
                    tuples = [
                        (r["symbol"], r["exchange"], r["date"], r["open_price"], r["high_price"], r["low_price"],
                         r["close_price"], r["avg_price"], r["volume"], r["delivery_qty"], r["delivery_pct"],
                         r["trades_count"], r["pct_change"])
                        for r in batch
                    ]
                    await pg_conn.executemany("""
                    INSERT INTO historical_stock_data 
                    (symbol, exchange, date, open_price, high_price, low_price, close_price, avg_price, volume, delivery_qty, delivery_pct, trades_count, pct_change)
                    VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (symbol, exchange, date) DO UPDATE SET
                        open_price = EXCLUDED.open_price,
                        high_price = EXCLUDED.high_price,
                        low_price = EXCLUDED.low_price,
                        close_price = EXCLUDED.close_price,
                        avg_price = EXCLUDED.avg_price,
                        volume = EXCLUDED.volume,
                        delivery_qty = EXCLUDED.delivery_qty,
                        delivery_pct = EXCLUDED.delivery_pct,
                        trades_count = EXCLUDED.trades_count;
                    """, tuples)
                logging.info(f"🐘 Successfully synced {len(all_records)} records into PostgreSQL database.")
            except Exception as e:
                logging.warning(f"PostgreSQL sync warning: {e}")
            finally:
                await pg_conn.close()

        total_synced = len(all_records)
        return total_synced


db_market_loader = DatabaseMarketLoader()

if __name__ == "__main__":
    import sys
    if "--sync" in sys.argv:
        synced = asyncio.run(db_market_loader.sync_bhavcopy_to_postgres())
        print(f"Total historical rows synced to SQL database: {synced}")
    else:
        history = db_market_loader.load_market_history(["RELIANCE", "TCS"])
        print(f"Loaded symbols: {list(history.keys())}")
        for s, df in history.items():
            print(f"  {s}: {len(df)} bars from {df['Date'].iloc[0]} to {df['Date'].iloc[-1]}")
