import os
import sys
import json
import time
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import asyncpg
import asyncio

logger = logging.getLogger("daily_gnn_service")

# Ensure ml_service is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

try:
    from app.config import settings
except ImportError:
    try:
        from config import settings
    except ImportError:
        settings = None

try:
    from ml_service.gnn_engine import gnn_engine
except ImportError:
    gnn_engine = None

GNN_CACHE_FILE = os.path.join(BASE_DIR, "ml_service", "data_cache", "gnn_correlation_payload.json")

# In-memory cache
_CURRENT_DAILY_GNN: Optional[Dict[str, Any]] = None
_LAST_COMPUTED_TIMESTAMP: float = 0.0

SECTOR_MAPPING = {
    "RELIANCE": "Energy", "TCS": "IT Services", "HDFCBANK": "Banking",
    "INFY": "IT Services", "ICICIBANK": "Banking", "SBIN": "Banking",
    "BHARTIARTL": "Telecom", "HINDUNILVR": "FMCG", "LICI": "Insurance",
    "BAJFINANCE": "Finance", "ITC": "FMCG", "LT": "Infrastructure",
    "HCLTECH": "IT Services", "KOTAKBANK": "Banking", "AXISBANK": "Banking",
    "TITAN": "Consumer Goods", "SUNPHARMA": "Pharma", "TATAMOTORS": "Automotive",
    "MARUTI": "Automotive", "NTPC": "Power", "ONGC": "Energy",
    "POWERGRID": "Power", "ADANIENT": "Conglomerate", "ADANIPORTS": "Ports",
    "ASIANPAINT": "Paints", "COALINDIA": "Mining", "BAJAJFINSV": "Finance",
    "ULTRACEMCO": "Cement", "NESTLEIND": "FMCG", "WIPRO": "IT Services",
    "JSWSTEEL": "Metals", "TATASTEEL": "Metals", "GRASIM": "Cement",
    "TECHM": "IT Services", "HINDALCO": "Metals", "CIPLA": "Pharma",
    "DRREDDY": "Pharma", "BPCL": "Energy", "EICHERMOT": "Automotive",
    "DIVISLAB": "Pharma", "HEROMOTOCO": "Automotive", "APOLLOHOSP": "Healthcare"
}

COMPANY_NAMES = {
    "RELIANCE": "Reliance Industries Ltd", "TCS": "Tata Consultancy Services",
    "HDFCBANK": "HDFC Bank Ltd", "INFY": "Infosys Ltd", "ICICIBANK": "ICICI Bank Ltd",
    "SBIN": "State Bank of India", "BHARTIARTL": "Bharti Airtel Ltd",
    "HINDUNILVR": "Hindustan Unilever Ltd", "LICI": "Life Insurance Corp of India",
    "BAJFINANCE": "Bajaj Finance Ltd", "ITC": "ITC Ltd", "LT": "Larsen & Toubro Ltd",
    "KOTAKBANK": "Kotak Mahindra Bank", "AXISBANK": "Axis Bank Ltd",
    "TATAMOTORS": "Tata Motors Ltd", "SUNPHARMA": "Sun Pharmaceutical Industries",
    "ASIANPAINT": "Asian Paints Ltd", "MARUTI": "Maruti Suzuki India Ltd"
}


async def fetch_stock_prices_from_db() -> Optional[pd.DataFrame]:
    """Fetches daily price history for 40 companies from PostgreSQL STOCK_PREDICT or quantcopilot."""
    pg_user = getattr(settings, "POSTGRES_USER", "postgres") if settings else "postgres"
    pg_pass = getattr(settings, "POSTGRES_PASSWORD", "Root") if settings else "Root"
    pg_host = getattr(settings, "POSTGRES_SERVER", "localhost") if settings else "localhost"
    pg_port = getattr(settings, "POSTGRES_PORT", 5432) if settings else 5432
    pg_db = getattr(settings, "POSTGRES_DB", "quantcopilot") if settings else "quantcopilot"

    # 1. Try STOCK_PREDICT
    try:
        stock_predict_url = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/STOCK_PREDICT"
        conn = await asyncpg.connect(stock_predict_url)
        query = """
        SELECT c.ticker_symbol, sp.trade_date, sp.close_price, sp.volume
        FROM stock_prices sp
        JOIN companies c ON c.company_id = sp.company_id
        WHERE sp.trade_date >= (
            SELECT trade_date FROM stock_prices ORDER BY trade_date DESC LIMIT 1
        ) - INTERVAL '150 days'
        ORDER BY sp.trade_date ASC
        """
        rows = await conn.fetch(query)
        await conn.close()
        if rows and len(rows) > 100:
            df = pd.DataFrame(rows, columns=['ticker_symbol', 'trade_date', 'close_price', 'volume'])
            df['close_price'] = df['close_price'].astype(float)
            df['symbol'] = df['ticker_symbol'].str.replace('.NS', '', regex=False)
            return df
    except Exception as e:
        logger.warning(f"STOCK_PREDICT query failed: {e}")

    # 2. Try quantcopilot historical_stock_data
    try:
        quantcopilot_url = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"
        conn = await asyncpg.connect(quantcopilot_url)
        rows = await conn.fetch(
            "SELECT symbol, date as trade_date, close_price, volume FROM historical_stock_data ORDER BY date ASC"
        )
        await conn.close()
        if rows and len(rows) > 100:
            df = pd.DataFrame(rows, columns=['symbol', 'trade_date', 'close_price', 'volume'])
            df['close_price'] = df['close_price'].astype(float)
            return df
    except Exception as e:
        logger.warning(f"quantcopilot historical_stock_data query failed: {e}")

    return None


def calculate_daily_gnn_from_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """Vectorized calculation of daily rolling returns, correlation matrix, and GNN forward pass."""
    piv = df.pivot_table(index='trade_date', columns='symbol', values='close_price').dropna(axis=1, thresh=25)
    piv = piv.ffill().bfill()
    daily_returns = piv.pct_change().dropna()

    latest_trade_date = str(daily_returns.index[-1])
    window_len = min(60, len(daily_returns))
    returns_window = daily_returns.iloc[-window_len:]
    symbols = list(returns_window.columns)

    corr_df = returns_window.corr().fillna(0)
    corr_matrix = corr_df.values.tolist()

    # Build 18-alpha features per symbol
    features = []
    for sym in symbols:
        ret_series = returns_window[sym].values
        chg_1d = float(ret_series[-1])
        vol_60d = float(np.std(ret_series))
        mom_10d = float(np.mean(ret_series[-10:])) if len(ret_series) >= 10 else chg_1d
        mom_20d = float(np.mean(ret_series[-20:])) if len(ret_series) >= 20 else chg_1d
        win_rate = float(np.sum(ret_series > 0) / len(ret_series))
        var_95 = float(np.percentile(ret_series, 5))
        upside_95 = float(np.percentile(ret_series, 95))
        sharpe = float(np.mean(ret_series) / max(1e-4, vol_60d))

        feat_18 = [
            chg_1d,
            mom_10d,
            mom_20d,
            win_rate,
            vol_60d,
            vol_60d * 1.25,
            vol_60d * 0.75,
            var_95,
            upside_95,
            sharpe,
            1.0,
            1.0,
            0.02,
            chg_1d * 0.5,
            vol_60d * 2.0,
            0.015,
            0.08,
            0.0
        ]
        features.append(feat_18)

    if gnn_engine is not None:
        gnn_result = gnn_engine.run_inference(symbols, features, corr_matrix)
    else:
        # Fallback heuristic calculation if torch GNN model is not loaded
        mean_corr = float(np.mean(np.abs(corr_df.values)))
        risk_score = round(min(0.85, max(0.15, mean_corr * 0.75)), 2)
        nodes = []
        for idx, sym in enumerate(symbols):
            sym_corr = float(np.mean(np.abs(corr_df[sym].values)))
            nodes.append({
                "node_id": str(idx),
                "asset_name": sym,
                "company_name": COMPANY_NAMES.get(sym, sym),
                "sector": SECTOR_MAPPING.get(sym, "Equities"),
                "risk_score": round(sym_corr * 0.65, 4),
                "centrality": round(sym_corr, 4),
                "systemic_contagion_factor": round(sym_corr * 0.55, 4),
                "features": features[idx][:4]
            })
        gnn_result = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_system_risk": risk_score,
            "contagion_status": "HIGH" if risk_score > 0.55 else ("MODERATE" if risk_score > 0.35 else "LOW"),
            "high_risk_nodes": [n["asset_name"] for n in nodes if n["risk_score"] > 0.35],
            "nodes": nodes,
            "adjacency_matrix": corr_matrix,
            "regime_classification": "DYNAMIC_60D_ROLLING_CORRELATION_REGIME"
        }

    # Enhance node metadata (sector & company name)
    for n in gnn_result.get("nodes", []):
        sym = n.get("asset_name") or n.get("symbol")
        if sym:
            n["company_name"] = COMPANY_NAMES.get(sym, n.get("company_name", sym))
            n["sector"] = SECTOR_MAPPING.get(sym, n.get("sector", "Equities"))

    gnn_result["daily_date"] = latest_trade_date
    gnn_result["updated_at"] = datetime.now(timezone.utc).isoformat()
    if gnn_engine is not None and "nodes" in gnn_result:
        gnn_result["sector_vulnerability"] = gnn_engine.get_sector_vulnerability(gnn_result["nodes"])

    return gnn_result


async def compute_and_cache_daily_gnn(force: bool = False) -> Dict[str, Any]:
    """
    Computes and updates the GNN Systemic Risk Index on a daily basis.
    Persists to JSON cache and in-memory cache.
    """
    global _CURRENT_DAILY_GNN, _LAST_COMPUTED_TIMESTAMP

    # Re-use in-memory cache if less than 6 hours old and not forced
    now = time.time()
    if not force and _CURRENT_DAILY_GNN and (now - _LAST_COMPUTED_TIMESTAMP < 21600):
        return _CURRENT_DAILY_GNN

    logger.info("Computing daily GNN systemic risk index...")
    df = await fetch_stock_prices_from_db()
    if df is not None and not df.empty:
        payload = calculate_daily_gnn_from_dataframe(df)
    else:
        # If DB is empty, read existing cache or use fallback
        if os.path.exists(GNN_CACHE_FILE):
            try:
                with open(GNN_CACHE_FILE, "r") as f:
                    payload = json.load(f)
            except Exception:
                payload = None
        else:
            payload = None

        if not payload:
            payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "daily_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "overall_system_risk": 0.28,
                "contagion_status": "LOW",
                "regime_classification": "BASELINE_STABLE_REGIME",
                "nodes": [],
                "adjacency_matrix": [],
                "sector_vulnerability": [],
                "high_risk_nodes": []
            }

    # Save to disk cache
    try:
        os.makedirs(os.path.dirname(GNN_CACHE_FILE), exist_ok=True)
        with open(GNN_CACHE_FILE, "w") as f:
            json.dump(payload, f, indent=2)
        logger.info(f"Daily GNN index successfully cached to {GNN_CACHE_FILE}. Index={payload.get('overall_system_risk')}")
    except Exception as e:
        logger.error(f"Failed to write GNN cache file: {e}")

    _CURRENT_DAILY_GNN = payload
    _LAST_COMPUTED_TIMESTAMP = now
    return payload


async def get_daily_gnn_metrics(force: bool = False) -> Dict[str, Any]:
    """Primary accessor for the daily GNN metrics payload."""
    global _CURRENT_DAILY_GNN
    if _CURRENT_DAILY_GNN and not force:
        return _CURRENT_DAILY_GNN
    return await compute_and_cache_daily_gnn(force=force)


async def run_daily_gnn_scheduler():
    """Background task running every 24 hours to automatically recalculate the GNN index."""
    while True:
        try:
            await compute_and_cache_daily_gnn(force=True)
            # Sleep 24 hours
            await asyncio.sleep(86400)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in daily GNN scheduler: {e}")
            await asyncio.sleep(3600)
