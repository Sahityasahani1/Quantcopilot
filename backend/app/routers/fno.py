import os
import sys
import time
import math
import numpy as np
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException

from app.schemas import (
    OptionChainPayloadSchema,
    OptionStrikeSchema,
    MarketDepthSchema,
    MarketDepthEntrySchema,
    CandleBarSchema,
    GNNContagionSignalSchema,
    GoalPredictionResponseSchema,
    PredictionScenarioPointSchema
)

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
try:
    from ml_service.gnn_engine import gnn_engine
    from ml_service.deep_forecaster import forecaster_engine
except ImportError:
    gnn_engine = None
    forecaster_engine = None

router: APIRouter = APIRouter(prefix="/fno", tags=["F&O and Derivatives"])

SPOT_PRICE_MAP = {
    "NIFTY 50": 24144.10,
    "BANKNIFTY": 50820.25,
    "SENSEX": 77204.66,
    "RELIANCE": 2985.40,
    "TCS": 4210.80,
    "HDFCBANK": 1612.30,
    "INFY": 1845.60,
    "ICICIBANK": 1178.90,
    "TATAMOTORS": 1042.15,
    "SBIN": 824.50,
    "TATASTEEL": 184.09,
    "BEL": 408.55,
    "CRUDEOIL": 8218.00,
    "NATURALGAS": 261.90
}

STEP_MAP = {
    "NIFTY 50": 50.0,
    "BANKNIFTY": 100.0,
    "SENSEX": 100.0,
    "RELIANCE": 20.0,
    "TCS": 50.0,
    "HDFCBANK": 20.0,
    "INFY": 20.0,
    "ICICIBANK": 10.0,
    "TATAMOTORS": 10.0,
    "SBIN": 10.0,
    "TATASTEEL": 2.5,
    "BEL": 5.0,
    "CRUDEOIL": 50.0,
    "NATURALGAS": 5.0
}

@router.get("/chain/{symbol}", response_model=OptionChainPayloadSchema)
async def get_option_chain(symbol: str, expiry: str = Query("28-AUG-2026", description="Expiry date")):
    clean_sym = symbol.strip().upper()
    spot = SPOT_PRICE_MAP.get(clean_sym, 24144.10)
    step = STEP_MAP.get(clean_sym, 50.0)
    
    base_strike = round(spot / step) * step
    strikes: List[OptionStrikeSchema] = []
    total_call_oi = 0
    total_put_oi = 0

    for i in range(-10, 11):
        strike = base_strike + (i * step)
        is_call_itm = strike < spot
        is_put_itm = strike > spot
        diff = abs(strike - spot)
        
        call_oi = int(np.random.randint(20000, 95000) * (1.25 if i >= 0 else 0.75))
        put_oi = int(np.random.randint(20000, 95000) * (1.25 if i <= 0 else 0.75))
        total_call_oi += call_oi
        total_put_oi += put_oi

        call_chg_oi = int(np.random.randint(-4000, 14000))
        put_chg_oi = int(np.random.randint(-4000, 14000))
        
        call_iv = round(13.2 + abs(i) * 0.35, 2)
        put_iv = round(14.0 + abs(i) * 0.38, 2)

        call_intrinsic = max(0.0, spot - strike)
        put_intrinsic = max(0.0, strike - spot)
        time_val = max(5.0, (11 - abs(i)) * (step * 0.25))

        call_ltp = round(call_intrinsic + time_val, 2)
        put_ltp = round(put_intrinsic + time_val, 2)

        call_delta = round(max(0.01, min(0.99, 0.5 + (spot - strike) / (step * 12))), 2)
        put_delta = round(-max(0.01, min(0.99, 0.5 - (spot - strike) / (step * 12))), 2)
        gamma = round(0.0025 * math.exp(-0.5 * ((i / 3.5) ** 2)), 4)

        strikes.append(OptionStrikeSchema(
            strike_price=strike,
            call_oi=call_oi,
            call_change_oi=call_chg_oi,
            call_volume=int(np.random.randint(15000, 250000)),
            call_iv=call_iv,
            call_ltp=call_ltp,
            call_delta=call_delta,
            call_gamma=gamma,
            put_ltp=put_ltp,
            put_iv=put_iv,
            put_volume=int(np.random.randint(15000, 220000)),
            put_delta=put_delta,
            put_gamma=gamma,
            put_oi=put_oi,
            put_change_oi=put_chg_oi
        ))

    pcr = round(total_put_oi / max(1, total_call_oi), 2)

    return OptionChainPayloadSchema(
        underlying_symbol=clean_sym,
        spot_price=spot,
        pcr_ratio=pcr,
        max_pain_strike=base_strike,
        total_call_oi=total_call_oi,
        total_put_oi=total_put_oi,
        expiry_date=expiry,
        gnn_gamma_risk_index=0.38,
        gnn_regime="GAMMA_SQUEEZE_ACCUMULATION",
        strikes=strikes
    )

@router.get("/history/{symbol}", response_model=List[CandleBarSchema])
async def get_fno_candle_history(
    symbol: str,
    timeframe: str = Query("5m", description="Timeframe: 1m, 5m, 15m, 1D"),
    limit: int = Query(100, ge=10, le=500)
):
    clean_sym = symbol.strip().upper()
    
    is_option = " CE" in clean_sym or " PE" in clean_sym
    base_price = 125.50 if is_option else SPOT_PRICE_MAP.get(clean_sym, 24144.10)
    
    tf_seconds = 300
    if timeframe == "1m":
        tf_seconds = 60
    elif timeframe == "15m":
        tf_seconds = 900
    elif timeframe == "1D":
        tf_seconds = 86400

    now = int(time.time())
    now_aligned = (now // tf_seconds) * tf_seconds
    
    candles: List[CandleBarSchema] = []
    curr = base_price * 0.985
    
    for i in range(limit, 0, -1):
        bar_time = now_aligned - (i * tf_seconds)
        drift = np.random.normal(0.0002, 0.003 if not is_option else 0.015)
        open_p = curr
        close_p = open_p * (1 + drift)
        high_spread = abs(np.random.normal(0, 0.002 if not is_option else 0.01))
        low_spread = abs(np.random.normal(0, 0.002 if not is_option else 0.01))
        high_p = max(open_p, close_p) * (1 + high_spread)
        low_p = min(open_p, close_p) * (1 - low_spread)
        vol = int(np.random.randint(5000, 80000) if not is_option else np.random.randint(1000, 35000))
        
        curr = close_p
        candles.append(CandleBarSchema(
            time=bar_time,
            open=round(open_p, 2),
            high=round(high_p, 2),
            low=round(low_p, 2),
            close=round(close_p, 2),
            volume=vol
        ))
        
    return candles

@router.get("/depth/{symbol}", response_model=MarketDepthSchema)
async def get_market_depth(symbol: str):
    clean_sym = symbol.strip().upper()
    spot = SPOT_PRICE_MAP.get(clean_sym, 24144.10)
    
    bids: List[MarketDepthEntrySchema] = []
    asks: List[MarketDepthEntrySchema] = []
    
    total_buy = 0
    total_sell = 0
    
    for i in range(5):
        bid_price = round(spot - (i + 1) * 0.5, 2)
        bid_qty = int(np.random.randint(800, 5000))
        bid_orders = int(np.random.randint(4, 25))
        total_buy += bid_qty
        bids.append(MarketDepthEntrySchema(price=bid_price, orders=bid_orders, qty=bid_qty))
        
        ask_price = round(spot + (i + 1) * 0.5, 2)
        ask_qty = int(np.random.randint(800, 5000))
        ask_orders = int(np.random.randint(4, 25))
        total_sell += ask_qty
        asks.append(MarketDepthEntrySchema(price=ask_price, orders=ask_orders, qty=ask_qty))
        
    return MarketDepthSchema(
        symbol=clean_sym,
        bids=bids,
        asks=asks,
        total_buy_qty=total_buy,
        total_sell_qty=total_sell
    )

@router.get("/gnn-signals", response_model=GNNContagionSignalSchema)
async def get_gnn_signals():
    symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "TATAMOTORS", "SBIN", "TATASTEEL"]
    features = [
        [0.015, 1.25, 58.4, 14.5, 0.54, 8.2],
        [-0.005, -0.85, 46.2, 13.8, 0.48, -3.4],
        [0.018, 1.42, 62.1, 15.2, 0.56, 12.5],
        [0.008, 0.65, 52.3, 14.1, 0.51, 4.1],
        [0.012, 1.10, 59.0, 14.8, 0.53, 6.8],
        [-0.011, 1.65, 41.5, 18.2, -0.45, 15.4],
        [0.007, 0.88, 54.0, 15.0, 0.50, 5.0],
        [0.022, 2.10, 68.5, 21.4, 0.62, 22.0]
    ]
    
    corr_matrix = [
        [1.0, 0.65, 0.82, 0.58, 0.79, 0.52, 0.74, 0.48],
        [0.65, 1.0, 0.61, 0.88, 0.59, 0.44, 0.55, 0.42],
        [0.82, 0.61, 1.0, 0.55, 0.89, 0.58, 0.84, 0.51],
        [0.58, 0.88, 0.55, 1.0, 0.54, 0.41, 0.50, 0.39],
        [0.79, 0.59, 0.89, 0.54, 1.0, 0.55, 0.81, 0.49],
        [0.52, 0.44, 0.58, 0.41, 0.55, 1.0, 0.62, 0.46],
        [0.74, 0.55, 0.84, 0.50, 0.81, 0.62, 1.0, 0.53],
        [0.48, 0.42, 0.51, 0.39, 0.49, 0.46, 0.53, 1.0]
    ]
    
    if gnn_engine is not None:
        res = gnn_engine.run_inference(symbols, features, corr_matrix)
        return GNNContagionSignalSchema(
            timestamp=res["timestamp"],
            systemic_contagion=res["systemic_contagion"],
            contagion_status=res["contagion_status"],
            gamma_squeeze_prob=res["gamma_squeeze_prob"],
            predicted_iv_drift=res["predicted_iv_drift"],
            high_risk_nodes=res["high_risk_nodes"]
        )
        
    return GNNContagionSignalSchema(
        timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        systemic_contagion=0.38,
        contagion_status="MODERATE",
        gamma_squeeze_prob=0.14,
        predicted_iv_drift=0.45,
        high_risk_nodes=["TATAMOTORS", "TATASTEEL"]
    )

@router.get("/goal-prediction/{symbol}", response_model=GoalPredictionResponseSchema)
async def get_goal_prediction(
    symbol: str, 
    target_profit: float = Query(35000.0, description="Target profit in INR"),
    capital: float = Query(150000.0, description="Allocated capital in INR"),
    days: int = Query(14, description="Time horizon in days"),
    risk_profile: str = Query("MODERATE", description="Risk tolerance")
):
    clean_sym = symbol.strip().upper()
    spot = SPOT_PRICE_MAP.get(clean_sym, 24144.10)
    
    return_needed_pct = (target_profit / max(1000.0, capital)) * 100.0
    target_price = round(spot * (1.0 + return_needed_pct / 100.0), 2)
    
    daily_rate = return_needed_pct / max(1, days)
    feasibility = max(20.0, min(96.0, round(100.0 - daily_rate * 10.5, 1)))
    
    points: List[PredictionScenarioPointSchema] = []
    now = int(time.time())
    
    for i in range(days + 1):
        progress = i / max(1, days)
        t_str = time.strftime("%b %d", time.localtime(now + i * 86400))
        
        goal_path = spot + (target_price - spot) * (progress ** 0.85)
        gnn_drift = spot * (1.0 + (return_needed_pct * 0.72 * progress) / 100.0) + math.sin(progress * math.pi) * (spot * 0.01)
        bullish = spot * (1.0 + (return_needed_pct * 1.35 * progress) / 100.0)
        bearish = spot * (1.0 - (return_needed_pct * 0.45 * progress) / 100.0)
        
        spread = (spot * 0.018) + (spot * 0.045 * progress)
        
        points.append(PredictionScenarioPointSchema(
            timeOffset=i,
            timestamp=t_str,
            basePrice=round(gnn_drift, 2),
            bullishPrice=round(bullish, 2),
            bearishPrice=round(bearish, 2),
            goalPathPrice=round(goal_path, 2),
            upperConfidence95=round(gnn_drift + spread * 1.5, 2),
            lowerConfidence95=round(gnn_drift - spread * 1.5, 2),
            upperConfidence80=round(gnn_drift + spread, 2),
            lowerConfidence80=round(gnn_drift - spread, 2)
        ))
        
    stop_loss = round(spot * 0.965, 2)
    qty = max(25, round(capital / (spot * 0.2)))
    
    # Feature importance and neural trend
    feature_imp = [
        {"feature": "Order Flow Momentum", "weight": 0.28, "importancePct": 28.0},
        {"feature": "RSI / Price Divergence", "weight": 0.22, "importancePct": 22.0},
        {"feature": "GNN Systemic Contagion", "weight": 0.18, "importancePct": 18.0},
        {"feature": "Volume Z-Score", "weight": 0.17, "importancePct": 17.0},
        {"feature": "EMA Trend Spread", "weight": 0.15, "importancePct": 15.0}
    ]
    
    return GoalPredictionResponseSchema(
        symbol=clean_sym,
        currentPrice=spot,
        targetPrice=target_price,
        expectedDate=f"{days} Days",
        feasibilityScore=feasibility,
        expectedReturnPct=round(return_needed_pct, 2),
        recommendedPosition="BUY_STOCK" if return_needed_pct >= 0 else "SHORT_STOCK",
        recommendedEntry=spot,
        recommendedStopLoss=stop_loss,
        recommendedTarget=target_price,
        suggestedLotsOrQty=qty,
        trajectoryPoints=points,
        milestones=[
            {"day": max(1, round(days * 0.3)), "price": round(spot + (target_price - spot) * 0.3, 2), "label": "T1 Milestone (30%)", "achievedPct": 30},
            {"day": max(2, round(days * 0.7)), "price": round(spot + (target_price - spot) * 0.7, 2), "label": "T2 Milestone (70%)", "achievedPct": 70},
            {"day": days, "price": target_price, "label": "Full Goal Target (100%)", "achievedPct": 100}
        ],
        featureImportance=feature_imp,
        neuralTrend="BULLISH" if return_needed_pct >= 0 else "BEARISH",
        neuralConfidence=round(feasibility * 0.92, 1)
    )

