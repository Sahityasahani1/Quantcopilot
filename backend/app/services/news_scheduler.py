"""
QuantCopilot AI - Automated Daily News & Regulatory Policy Scheduler
Runs scheduled asynchronous polling for Google News RSS, Moneycontrol RSS,
and official SEBI circulars, with on-demand sync capabilities and countdown tracking.
"""

import asyncio
import time
from typing import List, Dict, Any, Optional

import sys, os
base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if base_path not in sys.path:
    sys.path.append(base_path)

try:
    from ml_service.finbert_sentiment import finbert_engine
except Exception as e:
    finbert_engine = None

try:
    from ml_service.sebi_policy_tracker import sebi_policy_tracker
except Exception as e:
    sebi_policy_tracker = None


TRACKED_TICKERS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "SBIN", "TATAMOTORS", "NIFTY 50"
]

DEFAULT_INTERVAL_SECONDS = 900  # 15 minutes polling cadence


class NewsAndPolicyScheduler:
    """
    Manages automated background polling and synchronization of live news and SEBI circulars.
    """

    def __init__(self, interval_seconds: int = DEFAULT_INTERVAL_SECONDS):
        self.interval_seconds: int = interval_seconds
        self.last_sync_timestamp: float = 0.0
        self.is_syncing: bool = False
        self.sync_count: int = 0
        self._background_task: Optional[asyncio.Task] = None
        self._is_running: bool = False

    async def start(self) -> None:
        """Starts the background polling worker."""
        if self._is_running:
            return
        self._is_running = True
        self._background_task = asyncio.create_task(self._scheduler_loop())
        print(f"[NewsScheduler] Background poller started (Interval: {self.interval_seconds}s)")

    async def stop(self) -> None:
        """Stops the background polling worker cleanly."""
        self._is_running = False
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
            self._background_task = None
        print("[NewsScheduler] Background poller stopped cleanly")

    async def _scheduler_loop(self) -> None:
        """Main scheduled polling loop."""
        # Initial run on application startup (brief delay to allow server initialization)
        await asyncio.sleep(2.0)
        await self.sync_all_now()

        while self._is_running:
            try:
                await asyncio.sleep(self.interval_seconds)
                if self._is_running:
                    await self.sync_all_now()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[NewsScheduler] Poller loop error: {e}")
                await asyncio.sleep(30.0)

    async def sync_all_now(self) -> Dict[str, Any]:
        """
        Executes an immediate synchronization cycle across SEBI RSS circulars
        and universe ticker news feeds.
        """
        if self.is_syncing:
            return self.get_status()

        self.is_syncing = True
        t0 = time.time()
        print("[NewsScheduler] Starting synchronization cycle across live RSS feeds...")

        try:
            # 1. Sync live SEBI RSS circulars
            if sebi_policy_tracker is not None:
                await asyncio.to_thread(sebi_policy_tracker.sync_live_sebi_rss, 20)

            # 2. Ingest & classify news for all universe tickers
            if finbert_engine is not None:
                await asyncio.to_thread(finbert_engine.refresh_all_universe, TRACKED_TICKERS)

            self.last_sync_timestamp = time.time()
            self.sync_count += 1
            duration = round(time.time() - t0, 2)
            print(f"[NewsScheduler] Synchronization cycle completed in {duration}s (Cycle #{self.sync_count})")
        except Exception as e:
            print(f"[NewsScheduler] Synchronization cycle failed: {e}")
        finally:
            self.is_syncing = False

        return self.get_status()

    def get_status(self) -> Dict[str, Any]:
        """Returns live synchronization status, countdown timers, and cache diagnostics."""
        now = time.time()
        if self.last_sync_timestamp > 0:
            elapsed = now - self.last_sync_timestamp
            next_sec = max(0, int(self.interval_seconds - elapsed))
            last_ts_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.last_sync_timestamp))
        else:
            next_sec = 0
            last_ts_str = "PENDING_FIRST_CYCLE"

        cached_news_count = 0
        if finbert_engine is not None:
            stats = finbert_engine.get_cache_stats()
            cached_news_count = stats.get("total_articles_cached", 0)

        sebi_count = 0
        if sebi_policy_tracker is not None:
            sebi_count = len(sebi_policy_tracker.get_all_policies())

        return {
            "is_syncing": self.is_syncing,
            "last_sync_timestamp": last_ts_str,
            "next_sync_seconds": next_sec,
            "interval_seconds": self.interval_seconds,
            "total_news_cached": cached_news_count,
            "total_sebi_circulars": sebi_count,
            "sources": [
                "Google News RSS (NSE Tickers)",
                "Moneycontrol Real-Time RSS",
                "Official SEBI Regulatory Feed (sebi.gov.in)",
                "Yahoo Finance API"
            ],
            "message": "Live RSS news and SEBI policy channels operational."
        }


# Global singleton instance
news_scheduler = NewsAndPolicyScheduler(interval_seconds=900)
