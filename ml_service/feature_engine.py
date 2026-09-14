"""
QuantCopilot AI - Institutional Alpha Feature Engineering Engine
Extracts 18 quantitative alpha factors, microstructure signals, and volatility estimators.
"""

import numpy as np
import pandas as pd
from typing import List, Tuple

ALPHA_FEATURE_NAMES = [
    "LogReturn_1d",
    "LogReturn_5d",
    "LogReturn_20d",
    "RSI_14",
    "MACD_DIFF",
    "Garman_Klass_Vol",
    "Parkinson_Vol",
    "ATR_14",
    "VWAP_Deviation",
    "Deliv_Ratio_SMA20",
    "Volume_Shock",
    "Trades_Intensity",
    "High_Low_Spread",
    "Close_Open_Spread",
    "Bollinger_ZScore",
    "Trend_SMA20_SMA50",
    "Return_Skewness_20",
    "Normalized_Volume"
]


def compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Computes normalized Relative Strength Index (0 to 1)."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    
    rs = avg_gain / (avg_loss + 1e-9)
    rsi = 100 - (100 / (1 + rs))
    return rsi / 100.0  # Normalize to [0, 1]


def compute_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.Series:
    """Computes normalized MACD Histogram difference."""
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    macd_hist = (macd_line - signal_line) / (series + 1e-9)
    return np.clip(macd_hist * 10.0, -3.0, 3.0)


def build_alpha_feature_matrix(df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
    """
    Computes an 18-dimensional quantitative alpha matrix from raw OHLCV + Bhavcopy data.
    Returns: (features_array of shape [N, 18], feature_names)
    """
    data = df.copy()
    
    # Ensure numerical columns
    for col in ["Open", "High", "Low", "Close", "Volume"]:
        if col in data.columns:
            data[col] = pd.to_numeric(data[col], errors="coerce")
            
    close = data["Close"].ffill().bfill()
    open_p = data.get("Open", close).ffill().bfill()
    high_p = data.get("High", close).ffill().bfill()
    low_p = data.get("Low", close).ffill().bfill()
    volume = data.get("Volume", pd.Series(100000, index=data.index)).ffill().bfill()
    avg_p = data.get("AvgPrice", close).ffill().bfill()
    trades = data.get("Trades", pd.Series(5000, index=data.index)).ffill().bfill()
    deliv_pct = data.get("DelivPct", pd.Series(45.0, index=data.index)).ffill().bfill()

    # 1-3. Log Returns across multiple horizons
    log_ret_1 = np.log(close / close.shift(1).clip(lower=1e-5)).fillna(0.0)
    log_ret_5 = np.log(close / close.shift(5).clip(lower=1e-5)).fillna(0.0)
    log_ret_20 = np.log(close / close.shift(20).clip(lower=1e-5)).fillna(0.0)

    # 4. RSI (14)
    rsi_14 = compute_rsi(close, 14).fillna(0.5)

    # 5. MACD Histogram Difference
    macd_diff = compute_macd(close).fillna(0.0)

    # 6. Garman-Klass Volatility (combines Open, High, Low, Close)
    # GK = 0.5 * (ln(H/L))^2 - (2*ln(2) - 1) * (ln(C/O))^2
    log_hl = np.log(high_p.clip(lower=1e-5) / low_p.clip(lower=1e-5))
    log_co = np.log(close.clip(lower=1e-5) / open_p.clip(lower=1e-5))
    gk_var = 0.5 * (log_hl ** 2) - (2.0 * np.log(2.0) - 1.0) * (log_co ** 2)
    gk_vol = np.sqrt(np.maximum(gk_var, 1e-9)).rolling(14, min_periods=1).mean().fillna(0.01)

    # 7. Parkinson Volatility (High-Low range estimator)
    parkinson_vol = np.sqrt((log_hl ** 2) / (4.0 * np.log(2.0))).rolling(14, min_periods=1).mean().fillna(0.01)

    # 8. Normalized Average True Range (ATR 14)
    tr1 = high_p - low_p
    tr2 = (high_p - close.shift(1)).abs()
    tr3 = (low_p - close.shift(1)).abs()
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr_14 = (true_range.rolling(14, min_periods=1).mean() / close.clip(lower=1e-5)).fillna(0.015)

    # 9. VWAP Deviation
    vwap_dev = ((close - avg_p) / (true_range.clip(lower=1e-5))).clip(-3.0, 3.0).fillna(0.0)

    # 10. Delivery Ratio Momentum
    deliv_sma20 = deliv_pct.rolling(20, min_periods=1).mean().clip(lower=1e-5)
    deliv_mom = (deliv_pct / deliv_sma20).clip(0.0, 3.0).fillna(1.0)

    # 11. Volume Shock (Vol / SMA20(Vol))
    vol_sma20 = volume.rolling(20, min_periods=1).mean().clip(lower=1e-5)
    vol_shock = (volume / vol_sma20).clip(0.1, 5.0).fillna(1.0)

    # 12. Trades Intensity
    trades_sma20 = trades.rolling(20, min_periods=1).mean().clip(lower=1e-5)
    trades_intensity = (trades / trades_sma20).clip(0.1, 5.0).fillna(1.0)

    # 13. High-Low Spread
    hl_spread = ((high_p - low_p) / close.clip(lower=1e-5)).clip(0.0, 0.2).fillna(0.01)

    # 14. Close-Open Spread
    co_spread = ((close - open_p) / open_p.clip(lower=1e-5)).clip(-0.15, 0.15).fillna(0.0)

    # 15. Bollinger Band Z-Score (20, 2)
    sma_20 = close.rolling(20, min_periods=1).mean()
    std_20 = close.rolling(20, min_periods=1).std().clip(lower=1e-5)
    bb_zscore = ((close - sma_20) / std_20).clip(-3.0, 3.0).fillna(0.0)

    # 16. Trend Indicator (SMA20 / SMA50 - 1)
    sma_50 = close.rolling(50, min_periods=1).mean().clip(lower=1e-5)
    trend_20_50 = ((sma_20 / sma_50) - 1.0).clip(-0.2, 0.2).fillna(0.0)

    # 17. Return Skewness (20-day)
    ret_skew_20 = log_ret_1.rolling(20, min_periods=5).skew().clip(-3.0, 3.0).fillna(0.0)

    # 18. Normalized Volume (Z-score)
    vol_std = volume.rolling(50, min_periods=1).std().clip(lower=1e-5)
    norm_vol = ((volume - volume.rolling(50, min_periods=1).mean()) / vol_std).clip(-3.0, 3.0).fillna(0.0)

    feature_df = pd.DataFrame({
        "LogReturn_1d": log_ret_1,
        "LogReturn_5d": log_ret_5,
        "LogReturn_20d": log_ret_20,
        "RSI_14": rsi_14,
        "MACD_DIFF": macd_diff,
        "Garman_Klass_Vol": gk_vol,
        "Parkinson_Vol": parkinson_vol,
        "ATR_14": atr_14,
        "VWAP_Deviation": vwap_dev,
        "Deliv_Ratio_SMA20": deliv_mom,
        "Volume_Shock": vol_shock,
        "Trades_Intensity": trades_intensity,
        "High_Low_Spread": hl_spread,
        "Close_Open_Spread": co_spread,
        "Bollinger_ZScore": bb_zscore,
        "Trend_SMA20_SMA50": trend_20_50,
        "Return_Skewness_20": ret_skew_20,
        "Normalized_Volume": norm_vol
    })

    # Clean and replace infinite/NaN
    feature_df.replace([np.inf, -np.inf], np.nan, inplace=True)
    feature_df.ffill(inplace=True)
    feature_df.bfill(inplace=True)
    feature_df.fillna(0.0, inplace=True)

    matrix = feature_df[ALPHA_FEATURE_NAMES].to_numpy(dtype=np.float32)
    return matrix, ALPHA_FEATURE_NAMES
