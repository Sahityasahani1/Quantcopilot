"""
QuantCopilot AI - CLI Standalone Yahoo Finance to PostgreSQL Direct Sync Utility
Usage:
    python backend/app/sync_yahoo_to_db.py --all
    python backend/app/sync_yahoo_to_db.py --symbol RELIANCE --exchange NSE --period 1y
    python backend/app/sync_yahoo_to_db.py --stats
"""

import sys
import os
import argparse
import asyncio
import logging

# Ensure project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.yahoo_direct_db import yahoo_db_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

async def main():
    parser = argparse.ArgumentParser(description="QuantCopilot Direct Yahoo Finance to PostgreSQL Sync Utility")
    parser.add_argument("--symbol", type=str, help="Specific stock symbol to sync (e.g. RELIANCE, TCS, NIFTY 50)")
    parser.add_argument("--exchange", type=str, default="NSE", choices=["NSE", "BSE", "ALL"], help="Target exchange")
    parser.add_argument("--period", type=str, default="1y", help="Historical timeframe (e.g. 1mo, 6mo, 1y, 2y, 5y)")
    parser.add_argument("--all", action="store_true", help="Sync all active securities registered in PostgreSQL")
    parser.add_argument("--workers", type=int, default=6, help="Concurrency worker threads for downloading")
    parser.add_argument("--stats", action="store_true", help="Display current PostgreSQL cached data statistics")

    args = parser.parse_args()

    print("=" * 70)
    print("⚡ QuantCopilot AI - Direct Yahoo Finance <-> PostgreSQL Sync")
    print("=" * 70)

    if args.stats:
        print("📊 Fetching PostgreSQL Database Cache Statistics...")
        stats = await yahoo_db_engine.get_db_cache_statistics()
        if stats.get("database_connected"):
            print(f"  • Total Securities in Master: {stats['total_securities_master']} (NSE: {stats['nse_securities']}, BSE: {stats['bse_securities']})")
            print(f"  • Total Cached Candles:       {stats['total_cached_candles']:,}")
            print(f"  • Symbols with Data:          {stats['symbols_with_history']}")
            print(f"  • Historical Date Range:      {stats['earliest_date']} to {stats['latest_date']}")
            print("\n📈 Top Cached Instruments:")
            for item in stats.get("top_cached_instruments", []):
                print(f"    - {item['symbol']:<15} ({item['exchange']}): {item['candles']:>5} candles | Latest: {item['latest_date']} | LTP: Rs. {item['last_close']}")
        else:
            print(f"  ❌ Database connection error: {stats.get('error')}")
            print(f"  💡 Note: {stats.get('message')}")
        print("=" * 70)
        return

    if args.symbol:
        print(f"🔄 Syncing single instrument: {args.symbol} ({args.exchange}) [Period: {args.period}]...")
        res = await yahoo_db_engine.sync_single_stock_to_db(
            symbol=args.symbol,
            exchange=args.exchange,
            period=args.period
        )
        print(f"\nResult:")
        print(f"  • Status:            {res.get('status')}")
        print(f"  • Synced Candles:    {res.get('synced_candles', 0)}")
        print(f"  • Total DB Candles:  {res.get('total_db_candles', 0)}")
        print(f"  • Date Range:        {res.get('date_range', 'N/A')}")
        print(f"  • Latest Price:      Rs. {res.get('latest_price')}")
        print(f"  • Elapsed Time:      {res.get('elapsed_ms')} ms")
    else:
        # Batch sync
        ex_filter = None if args.exchange == "ALL" else args.exchange
        print(f"🚀 Launching parallel batch ingestion for all registered securities (Exchange: {args.exchange}, Period: {args.period}, Workers: {args.workers})...")
        res = await yahoo_db_engine.batch_sync_all_securities(
            exchange=ex_filter,
            period=args.period,
            max_workers=args.workers
        )
        print(f"\n✅ Batch Ingestion Completed:")
        print(f"  • Total Universe Count:     {res.get('total_universe_count')}")
        print(f"  • Successful Instruments:   {res.get('successful_symbols')}")
        print(f"  • Failed Instruments:       {res.get('failed_symbols')}")
        print(f"  • Total Candles Persisted:  {res.get('total_candles_persisted'):,}")
        print(f"  • Total Duration:           {res.get('elapsed_seconds')} seconds")

    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
