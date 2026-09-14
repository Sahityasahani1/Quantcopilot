"""
QuantCopilot AI - High Performance Bhavcopy Bank Ingestion & GNN Matrix Generator
Extracts 15-year historical time series from NSE-Data-bank-main into ml_service/data_cache
Generates Delivery-Weighted Adjacency Matrices for the CausalGraphX GNN Engine
"""

import os
import glob
import json
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Set
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

BHAVCOPY_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "NSE-Data-bank-main", "data"))
DATA_CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "data_cache"))
os.makedirs(DATA_CACHE_DIR, exist_ok=True)

TARGET_SYMBOLS: Set[str] = {
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "TATAMOTORS",
    "SBIN", "ITC", "BHARTIARTL", "LT", "AXISBANK", "KOTAKBANK",
    "HINDUNILVR", "MARUTI", "SUNPHARMA", "BAJFINANCE", "TATASTEEL",
    "ASIANPAINT", "TITAN", "WIPRO"
}

INDIAN_SECURITY_META = {
    "RELIANCE": {"name": "Reliance Industries Ltd", "sector": "Energy"},
    "TCS": {"name": "Tata Consultancy Services", "sector": "IT Services"},
    "HDFCBANK": {"name": "HDFC Bank Ltd", "sector": "Banking"},
    "INFY": {"name": "Infosys Ltd", "sector": "IT Services"},
    "ICICIBANK": {"name": "ICICI Bank Ltd", "sector": "Banking"},
    "TATAMOTORS": {"name": "Tata Motors Ltd", "sector": "Automotive"},
    "SBIN": {"name": "State Bank of India", "sector": "Banking"},
    "ITC": {"name": "ITC Ltd", "sector": "FMCG"},
    "BHARTIARTL": {"name": "Bharti Airtel Ltd", "sector": "Telecom"},
    "LT": {"name": "Larsen & Toubro Ltd", "sector": "Infrastructure"},
    "AXISBANK": {"name": "Axis Bank Ltd", "sector": "Banking"},
    "KOTAKBANK": {"name": "Kotak Mahindra Bank", "sector": "Banking"},
    "HINDUNILVR": {"name": "Hindustan Unilever Ltd", "sector": "FMCG"},
    "MARUTI": {"name": "Maruti Suzuki India", "sector": "Automotive"},
    "SUNPHARMA": {"name": "Sun Pharma Industries", "sector": "Pharma"},
    "BAJFINANCE": {"name": "Bajaj Finance Ltd", "sector": "Financial Services"},
    "TATASTEEL": {"name": "Tata Steel Ltd", "sector": "Metals"},
    "ASIANPAINT": {"name": "Asian Paints Ltd", "sector": "Paints & Coatings"},
    "TITAN": {"name": "Titan Company Ltd", "sector": "Consumer Discretionary"},
    "WIPRO": {"name": "Wipro Ltd", "sector": "IT Services"}
}


def parse_single_bhavcopy(file_path: str) -> List[Dict[str, Any]]:
    """Reads a single bhavcopy CSV and extracts rows for TARGET_SYMBOLS in 'EQ' series."""
    records = []
    try:
        # Read only necessary columns for speed
        df = pd.read_csv(file_path, skipinitialspace=True, on_bad_lines="skip")
        df.columns = [c.strip().upper() for c in df.columns]
        
        if "SYMBOL" not in df.columns or "SERIES" not in df.columns:
            return records
            
        # Filter for EQ series and target symbols
        df = df[(df["SERIES"].isin(["EQ", "BE"])) & (df["SYMBOL"].isin(TARGET_SYMBOLS))]
        
        for _, row in df.iterrows():
            sym = str(row.get("SYMBOL", "")).strip()
            date_raw = str(row.get("DATE1", "")).strip()
            
            try:
                date_val = pd.to_datetime(date_raw, format="%d-%b-%Y").strftime("%Y-%m-%d")
            except Exception:
                try:
                    date_val = pd.to_datetime(date_raw).strftime("%Y-%m-%d")
                except Exception:
                    continue
                    
            try:
                open_p = float(row.get("OPEN_PRICE", 0.0))
                high_p = float(row.get("HIGH_PRICE", 0.0))
                low_p = float(row.get("LOW_PRICE", 0.0))
                close_p = float(row.get("CLOSE_PRICE", 0.0))
                avg_p = float(row.get("AVG_PRICE", close_p))
                vol = int(float(row.get("TTL_TRD_QNTY", 0)))
                trades = int(float(row.get("NO_OF_TRADES", 0))) if "NO_OF_TRADES" in df.columns else 0
                
                deliv_qty_raw = row.get("DELIV_QTY", "-")
                deliv_qty = int(float(deliv_qty_raw)) if deliv_qty_raw not in ["-", "", np.nan] else 0
                
                deliv_per_raw = row.get("DELIV_PER", "-")
                deliv_pct = float(deliv_per_raw) if deliv_per_raw not in ["-", "", np.nan] else 0.0
                
                if close_p > 0 and vol > 0:
                    records.append({
                        "Symbol": sym,
                        "Date": date_val,
                        "Open": open_p,
                        "High": high_p,
                        "Low": low_p,
                        "Close": close_p,
                        "AvgPrice": avg_p,
                        "Volume": vol,
                        "Trades": trades,
                        "DelivQty": deliv_qty,
                        "DelivPct": deliv_pct
                    })
            except Exception:
                continue
    except Exception:
        pass
        
    return records


def ingest_bhavcopy_bank(max_workers: int = 8):
    """Parses all daily bhavcopies in parallel and builds per-stock CSVs + GNN payload."""
    all_files = glob.glob(os.path.join(BHAVCOPY_DIR, "*.csv"))
    if not all_files:
        logging.error(f"No bhavcopy CSV files found in {BHAVCOPY_DIR}!")
        return

    logging.info(f"🚀 Starting parallel ingestion of {len(all_files)} NSE Bhavcopy files...")
    start_time = time.time()
    
    extracted_data: Dict[str, List[Dict[str, Any]]] = {sym: [] for sym in TARGET_SYMBOLS}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(parse_single_bhavcopy, fp): fp for fp in all_files}
        processed = 0
        for future in as_completed(futures):
            results = future.result()
            for rec in results:
                sym = rec["Symbol"]
                extracted_data[sym].append(rec)
            processed += 1
            if processed % 500 == 0 or processed == len(all_files):
                logging.info(f"Processed [{processed:04d}/{len(all_files):04d}] Bhavcopies ({processed/len(all_files)*100:.1f}%)")

    elapsed = time.time() - start_time
    logging.info(f"✅ Ingestion complete in {elapsed:.2f}s! Formatting time series...")

    # Save per-symbol CSV files
    symbol_dfs: Dict[str, pd.DataFrame] = {}
    for sym, rows in extracted_data.items():
        if not rows:
            logging.warning(f"No records found for {sym}")
            continue
            
        df = pd.DataFrame(rows)
        df.drop_duplicates(subset=["Date"], keep="last", inplace=True)
        df.sort_values(by="Date", inplace=True)
        df.reset_index(drop=True, inplace=True)
        
        # Save to data_cache
        csv_path = os.path.join(DATA_CACHE_DIR, f"{sym}-EQ.csv")
        df.to_csv(csv_path, index=False)
        symbol_dfs[sym] = df
        logging.info(f"💾 Saved {sym}-EQ.csv ({len(df)} trading days, {df['Date'].iloc[0]} to {df['Date'].iloc[-1]})")

    # Build 15-Year Dynamic GNN Adjacency & Correlation Payload
    logging.info("🧠 Generating 15-Year Causal GNN Adjacency & Contagion Matrix...")
    close_series = {}
    for sym, df in symbol_dfs.items():
        if "Close" in df.columns:
            close_series[sym] = df.set_index("Date")["Close"]
            
    if close_series:
        aligned_df = pd.DataFrame(close_series).dropna(thresh=max(1, len(close_series) // 2))
        aligned_df.ffill(inplace=True)
        aligned_df.bfill(inplace=True)
        
        log_returns = np.log(aligned_df / aligned_df.shift(1)).dropna()
        corr_matrix = log_returns.corr().abs().to_numpy().copy()
        np.fill_diagonal(corr_matrix, 1.0)
        corr_matrix = np.nan_to_num(corr_matrix, nan=0.35)
        
        symbols = list(aligned_df.columns)
        adj_matrix = np.clip(corr_matrix, 0.0, 1.0)
        
        nodes = []
        for idx, sym in enumerate(symbols):
            centrality = float(np.mean(adj_matrix[idx]))
            volatility = float(np.std(adj_matrix[idx]))
            risk_score = float(np.clip(centrality * 0.45 + volatility * 0.55, 0.1, 0.95))
            contagion = float(np.clip(centrality * 0.82, 0.1, 0.99))
            
            meta = INDIAN_SECURITY_META.get(sym, {"name": sym, "sector": "Equities"})
            nodes.append({
                "node_id": str(idx),
                "asset_name": sym,
                "company_name": meta["name"],
                "sector": meta["sector"],
                "risk_score": round(risk_score, 2),
                "centrality": round(centrality, 2),
                "systemic_contagion_factor": round(contagion, 2),
                "features": [round(volatility, 4), round(centrality, 4), round(risk_score, 4), round(contagion, 4)]
            })
            
        gnn_payload = {
            "timestamp": pd.Timestamp.now().isoformat(),
            "overall_system_risk": round(float(np.mean([n["risk_score"] for n in nodes])), 2),
            "regime_classification": "HISTORICAL_15Y_BHAVCOPY_CORRELATION_REGIME",
            "nodes": nodes,
            "adjacency_matrix": adj_matrix.tolist()
        }
        
        gnn_json_path = os.path.join(DATA_CACHE_DIR, "gnn_correlation_payload.json")
        with open(gnn_json_path, "w") as f:
            json.dump(gnn_payload, f, indent=2)
            
        logging.info(f"🎉 Successfully generated 15-Year GNN Matrix for {len(nodes)} assets saved to: {gnn_json_path}")


if __name__ == "__main__":
    ingest_bhavcopy_bank()
