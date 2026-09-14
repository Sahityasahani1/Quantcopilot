"""
QuantCopilot AI - Indian Stock Market Historical Data Fetcher & GNN Correlation Matrix Generator
"""

import os
import json
import logging
from typing import Dict, List, Any
import numpy as np
import pandas as pd
import yfinance as yf

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# Top Indian Stocks mapped to Yahoo Finance ticker format (.NS for NSE, .BO or ^BSESN for BSE)
INDIAN_TICKERS_MAP = {
    "RELIANCE-EQ": {"yf": "RELIANCE.NS", "name": "Reliance Industries Ltd", "sector": "Energy", "exchange": "NSE"},
    "TCS-EQ": {"yf": "TCS.NS", "name": "Tata Consultancy Services", "sector": "IT Services", "exchange": "NSE"},
    "HDFCBANK-EQ": {"yf": "HDFCBANK.NS", "name": "HDFC Bank Ltd", "sector": "Banking", "exchange": "NSE"},
    "INFY-EQ": {"yf": "INFY.NS", "name": "Infosys Ltd", "sector": "IT Services", "exchange": "NSE"},
    "ICICIBANK-EQ": {"yf": "ICICIBANK.NS", "name": "ICICI Bank Ltd", "sector": "Banking", "exchange": "NSE"},
    "TATAMOTORS-EQ": {"yf": "TATAMOTORS.NS", "name": "Tata Motors Ltd", "sector": "Automotive", "exchange": "NSE"},
    "SBIN-EQ": {"yf": "SBIN.NS", "name": "State Bank of India", "sector": "Banking", "exchange": "NSE"},
    "ITC-EQ": {"yf": "ITC.NS", "name": "ITC Ltd", "sector": "FMCG", "exchange": "NSE"},
    "BHARTIARTL-EQ": {"yf": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd", "sector": "Telecom", "exchange": "NSE"},
    "LT-EQ": {"yf": "LT.NS", "name": "Larsen & Toubro Ltd", "sector": "Infrastructure", "exchange": "NSE"},
    "AXISBANK-EQ": {"yf": "AXISBANK.NS", "name": "Axis Bank Ltd", "sector": "Banking", "exchange": "NSE"},
    "KOTAKBANK-EQ": {"yf": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "sector": "Banking", "exchange": "NSE"},
    "HINDUNILVR-EQ": {"yf": "HINDUNILVR.NS", "name": "Hindustan Unilever Ltd", "sector": "FMCG", "exchange": "NSE"},
    "MARUTI-EQ": {"yf": "MARUTI.NS", "name": "Maruti Suzuki India", "sector": "Automotive", "exchange": "NSE"},
    "SUNPHARMA-EQ": {"yf": "SUNPHARMA.NS", "name": "Sun Pharma Industries", "sector": "Pharma", "exchange": "NSE"},
    "BAJFINANCE-EQ": {"yf": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd", "sector": "Financial Services", "exchange": "NSE"},
    "TATASTEEL-EQ": {"yf": "TATASTEEL.NS", "name": "Tata Steel Ltd", "sector": "Metals", "exchange": "NSE"},
    "ASIANPAINT-EQ": {"yf": "ASIANPAINT.NS", "name": "Asian Paints Ltd", "sector": "Paints & Coatings", "exchange": "NSE"},
    "TITAN-EQ": {"yf": "TITAN.NS", "name": "Titan Company Ltd", "sector": "Consumer Discretionary", "exchange": "NSE"},
    "WIPRO-EQ": {"yf": "WIPRO.NS", "name": "Wipro Ltd", "sector": "IT Services", "exchange": "NSE"},
    "NIFTY 50": {"yf": "^NSEI", "name": "Nifty 50 Index", "sector": "Index", "exchange": "NSE"},
    "BANKNIFTY": {"yf": "^NSEBANK", "name": "Bank Nifty Index", "sector": "Index", "exchange": "NSE"},
    "SENSEX": {"yf": "^BSESN", "name": "S&P BSE Sensex Index", "sector": "Index", "exchange": "BSE"}
}

DATA_CACHE_DIR = os.path.join(os.path.dirname(__file__), "data_cache")

def fetch_historical_stock_data(period: str = "1y") -> Dict[str, pd.DataFrame]:
    """Fetches daily historical candles for Indian stock tickers from Yahoo Finance."""
    os.makedirs(DATA_CACHE_DIR, exist_ok=True)
    historical_data: Dict[str, pd.DataFrame] = {}

    logging.info(f"Downloading historical {period} data for {len(INDIAN_TICKERS_MAP)} Indian Market Instruments...")
    
    yf_symbols = [info["yf"] for info in INDIAN_TICKERS_MAP.values()]
    try:
        df_all = yf.download(yf_symbols, period=period, interval="1d", group_by="ticker", progress=False)
        
        for symbol, info in INDIAN_TICKERS_MAP.items():
            yf_symbol = info["yf"]
            try:
                if len(yf_symbols) == 1:
                    df = df_all.copy()
                else:
                    df = df_all[yf_symbol].copy()
                
                df.dropna(how="all", inplace=True)
                if not df.empty:
                    historical_data[symbol] = df
                    # Save to local CSV cache
                    csv_path = os.path.join(DATA_CACHE_DIR, f"{symbol.replace(' ', '_')}.csv")
                    df.to_csv(csv_path)
            except Exception as e:
                logging.warning(f"Could not parse data for {symbol} ({yf_symbol}): {e}")
    except Exception as e:
        logging.error(f"Error fetching historical data via yfinance: {e}")

    return historical_data

def generate_gnn_adjacency_matrix(historical_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    """
    Computes log return correlations across historical price series to construct
    the dynamic adjacency matrix and node feature vectors for the Causal GNN model.
    """
    close_prices = {}
    for symbol, df in historical_data.items():
        if "Close" in df.columns:
            close_prices[symbol] = df["Close"].dropna()
        elif "Adj Close" in df.columns:
            close_prices[symbol] = df["Adj Close"].dropna()

    if not close_prices:
        # Fallback dummy matrix if yfinance is offline
        symbols = list(INDIAN_TICKERS_MAP.keys())[:10]
        n = len(symbols)
        corr_matrix = np.eye(n) + np.random.uniform(0.1, 0.4, (n, n))
        np.fill_diagonal(corr_matrix, 1.0)
    else:
        price_df = pd.DataFrame(close_prices).dropna()
        log_returns = np.log(price_df / price_df.shift(1)).dropna()
        corr_df = log_returns.corr().abs()
        symbols = list(corr_df.columns)
        corr_matrix = corr_df.values

    # Normalize adjacency matrix
    adj_matrix = np.clip(corr_matrix, 0.0, 1.0)

    # Compute node metrics (centrality, volatility risk)
    nodes = []
    for idx, sym in enumerate(symbols):
        centrality = float(np.mean(adj_matrix[idx]))
        volatility = float(np.std(adj_matrix[idx]))
        risk_score = float(np.clip(centrality * 0.4 + volatility * 0.6, 0.1, 0.95))
        contagion = float(np.clip(centrality * 0.8, 0.1, 0.99))
        
        info = INDIAN_TICKERS_MAP.get(sym, {"name": sym, "sector": "Equities"})
        nodes.append({
            "node_id": str(idx),
            "asset_name": sym,
            "company_name": info["name"],
            "sector": info["sector"],
            "risk_score": round(risk_score, 2),
            "centrality": round(centrality, 2),
            "systemic_contagion_factor": round(contagion, 2),
            "features": [round(volatility, 4), round(centrality, 4), round(risk_score, 4), round(contagion, 4)]
        })

    payload = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "overall_system_risk": round(float(np.mean([n["risk_score"] for n in nodes])), 2),
        "regime_classification": "HISTORICAL_RETURNS_CORRELATION_REGIME",
        "nodes": nodes,
        "adjacency_matrix": adj_matrix.tolist()
    }

    # Save GNN dynamic adjacency payload to cache JSON
    output_json = os.path.join(DATA_CACHE_DIR, "gnn_correlation_payload.json")
    with open(output_json, "w") as f:
        json.dump(payload, f, indent=2)

    logging.info(f"GNN Adjacency Matrix & Risk Nodes successfully generated for {len(nodes)} assets.")
    return payload

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Download Historical Data & Generate GNN Payloads")
    parser.add_argument("--period", type=str, default="3y", help="Lookback period (e.g. 1y, 3y, 5y, max)")
    args = parser.parse_args()

    hist_data = fetch_historical_stock_data(args.period)
    generate_gnn_adjacency_matrix(hist_data)
