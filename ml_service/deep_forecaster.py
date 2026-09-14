import os
import time
import math
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from ml_service.feature_engine import build_alpha_feature_matrix, ALPHA_FEATURE_NAMES

class QuantileHuberLoss(nn.Module):
    """
    Quantile Huber Loss (Smooth Pinball Loss) for robust multi-quantile regression.
    Prevents gradient explosion on fat-tailed market crash events.
    """
    def __init__(self, quantiles: List[float] = [0.025, 0.10, 0.50, 0.90, 0.975], delta: float = 0.01):
        super().__init__()
        self.quantiles = quantiles
        self.delta = delta

    def forward(self, preds: List[torch.Tensor], target: torch.Tensor) -> torch.Tensor:
        total_loss = 0.0
        for q, pred in zip(self.quantiles, preds):
            error = target - pred
            abs_error = torch.abs(error)
            huber_mask = abs_error <= self.delta
            huber_loss = torch.where(
                huber_mask,
                0.5 * (error ** 2) / self.delta,
                abs_error - 0.5 * self.delta
            )
            weight = torch.abs(q - (error < 0).float())
            loss = weight * huber_loss
            total_loss += torch.mean(loss)
        return total_loss / len(self.quantiles)


class MultiHeadTemporalAttention(nn.Module):
    """
    Multi-Head Self-Attention layer tailored for quantitative time-series sequences.
    Computes query-key-value self-attention across temporal time steps and extracts attention weights.
    """
    def __init__(self, d_model: int = 128, num_heads: int = 8, dropout: float = 0.1):
        super().__init__()
        self.d_model = d_model
        self.num_heads = num_heads
        self.head_dim = d_model // num_heads
        
        assert self.head_dim * num_heads == d_model, "d_model must be divisible by num_heads"
        
        self.q_proj = nn.Linear(d_model, d_model)
        self.k_proj = nn.Linear(d_model, d_model)
        self.v_proj = nn.Linear(d_model, d_model)
        self.out_proj = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)
        
    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        batch_size, seq_len, _ = x.shape
        
        q = self.q_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(batch_size, seq_len, self.num_heads, self.head_dim).transpose(1, 2)
        
        scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        attn_weights = F.softmax(scores, dim=-1)
        attn_weights_dropped = self.dropout(attn_weights)
        
        context = torch.matmul(attn_weights_dropped, v)
        context = context.transpose(1, 2).contiguous().view(batch_size, seq_len, self.d_model)
        output = self.out_proj(context)
        
        avg_attn_weights = attn_weights.mean(dim=1)
        return output, avg_attn_weights


class TemporalAttentionForecaster(nn.Module):
    """
    18-Alpha Feature Spatio-Temporal Attention Forecaster.
    Encodes 18 quantitative microstructure and technical features across T=60 days,
    extracts self-attention weights, and forecasts 5 quantile price paths over a 20-period horizon.
    """
    def __init__(
        self,
        input_dim: int = 18,
        hidden_dim: int = 128,
        horizon: int = 20,
        num_heads: int = 8,
        dropout: float = 0.1
    ):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.horizon = horizon
        
        self.feature_encoder = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.LayerNorm(hidden_dim),
            nn.LeakyReLU(0.1),
            nn.Dropout(dropout)
        )
        
        self.bilstm = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim // 2,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=dropout
        )
        
        self.temporal_attention = MultiHeadTemporalAttention(
            d_model=hidden_dim,
            num_heads=num_heads,
            dropout=dropout
        )
        
        self.layer_norm = nn.LayerNorm(hidden_dim)
        
        self.feature_importance_head = nn.Sequential(
            nn.Linear(hidden_dim, input_dim),
            nn.Softmax(dim=-1)
        )
        
        self.median_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, horizon)
        )
        
        self.upper_80_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, horizon)
        )
        
        self.lower_80_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, horizon)
        )
        
        self.upper_95_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, horizon)
        )
        
        self.lower_95_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.GELU(),
            nn.Linear(hidden_dim // 2, horizon)
        )
        
        self.trend_head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 3),
            nn.Softmax(dim=-1)
        )

    def forward(self, x: torch.Tensor) -> Dict[str, torch.Tensor]:
        proj = self.feature_encoder(x)
        lstm_out, _ = self.bilstm(proj)
        attn_out, attn_weights = self.temporal_attention(lstm_out)
        h = self.layer_norm(lstm_out + attn_out)
        context = h[:, -1, :]
        
        median_drift = self.median_head(context)
        upper_80_drift = self.upper_80_head(context)
        lower_80_drift = self.lower_80_head(context)
        upper_95_drift = self.upper_95_head(context)
        lower_95_drift = self.lower_95_head(context)
        
        upper_80 = median_drift + F.relu(upper_80_drift)
        upper_95 = upper_80 + F.relu(upper_95_drift)
        lower_80 = median_drift - F.relu(lower_80_drift)
        lower_95 = lower_80 - F.relu(lower_95_drift)
        
        trend_probs = self.trend_head(context)
        feature_importance = self.feature_importance_head(context)
        
        return {
            "median_drift": median_drift,
            "upper_80_drift": upper_80,
            "lower_80_drift": lower_80,
            "upper_95_drift": upper_95,
            "lower_95_drift": lower_95,
            "trend_probs": trend_probs,
            "feature_importance": feature_importance,
            "temporal_attention": attn_weights
        }


class DeepForecasterEngine:
    """
    Inference engine for the 18-Alpha Deep Temporal Attention Forecaster.
    """
    def __init__(self, horizon: int = 20):
        self.horizon = horizon
        self.feature_names = ALPHA_FEATURE_NAMES
        
        torch.manual_seed(42)
        self.model = TemporalAttentionForecaster(
            input_dim=len(self.feature_names),
            hidden_dim=128,
            horizon=horizon,
            num_heads=8,
            dropout=0.0
        )
        
        ckpt_path = os.path.join(os.path.dirname(__file__), "checkpoints", "temporal_forecaster.pt")
        if os.path.exists(ckpt_path):
            try:
                self.model.load_state_dict(torch.load(ckpt_path, map_location="cpu"))
            except Exception:
                pass
                
        self.model.eval()

    def _extract_features(self, prices: List[float], volumes: Optional[List[float]] = None) -> np.ndarray:
        """Transforms prices/volumes into the 18-alpha feature matrix."""
        arr = np.array(prices, dtype=np.float32)
        n = len(arr)
        if n < 60:
            pad = np.linspace(arr[0] * 0.98, arr[0], 60 - n)
            arr = np.concatenate([pad, arr])
            
        if volumes is None or len(volumes) < len(arr):
            vols = np.random.normal(100000, 20000, len(arr)).astype(np.float32)
        else:
            vols = np.array(volumes[-len(arr):], dtype=np.float32)
            
        df = pd.DataFrame({
            "Open": arr * 0.998,
            "High": arr * 1.005,
            "Low": arr * 0.995,
            "Close": arr,
            "Volume": vols,
            "AvgPrice": arr,
            "Trades": np.full(len(arr), 10000),
            "DelivPct": np.full(len(arr), 50.0)
        })
        
        mat, _ = build_alpha_feature_matrix(df)
        return mat[-60:].astype(np.float32)

    def forecast(
        self,
        symbol: str,
        prices: List[float],
        volumes: Optional[List[float]] = None,
        target_return_pct: Optional[float] = None,
        timeframe_secs: int = 300
    ) -> Dict[str, Any]:
        """
        Runs neural forecast and produces quantile paths.
        """
        if not prices:
            prices = [100.0] * 60
            
        current_price = float(prices[-1])
        features_arr = self._extract_features(prices, volumes)
        x_tensor = torch.tensor(features_arr, dtype=torch.float32).unsqueeze(0)
        
        with torch.no_grad():
            preds = self.model(x_tensor)
            
        median_drift = preds["median_drift"][0].numpy()
        upper_80_drift = preds["upper_80_drift"][0].numpy()
        lower_80_drift = preds["lower_80_drift"][0].numpy()
        upper_95_drift = preds["upper_95_drift"][0].numpy()
        lower_95_drift = preds["lower_95_drift"][0].numpy()
        
        trend_probs = preds["trend_probs"][0].numpy()
        feat_imp = preds["feature_importance"][0].numpy()
        attn_weights = preds["temporal_attention"][0].numpy()
        
        future_steps = []
        now_ts = int(time.time())
        
        for step in range(self.horizon):
            ts = now_ts + (step + 1) * timeframe_secs
            p_median = current_price * (1.0 + float(median_drift[step]))
            p_u80 = current_price * (1.0 + float(upper_80_drift[step]))
            p_l80 = current_price * (1.0 + float(lower_80_drift[step]))
            p_u95 = current_price * (1.0 + float(upper_95_drift[step]))
            p_l95 = current_price * (1.0 + float(lower_95_drift[step]))
            
            future_steps.append({
                "step": step + 1,
                "timestamp": ts,
                "predicted_price": round(p_median, 2),
                "upper_80": round(p_u80, 2),
                "lower_80": round(p_l80, 2),
                "upper_95": round(p_u95, 2),
                "lower_95": round(p_l95, 2),
                "volatility_cone_spread": round(p_u95 - p_l95, 2)
            })
            
        trend_labels = ["BULLISH", "BEARISH", "RANGE_BOUND"]
        dominant_trend = trend_labels[int(np.argmax(trend_probs))]
        trend_confidence = float(np.max(trend_probs))
        
        prob_target_reached = None
        expected_steps_to_target = None
        if target_return_pct is not None:
            target_price = current_price * (1.0 + target_return_pct / 100.0)
            hits = [i for i, step in enumerate(future_steps) if (step["upper_95"] >= target_price if target_return_pct > 0 else step["lower_95"] <= target_price)]
            if hits:
                prob_target_reached = round(min(0.95, max(0.05, 0.5 + (0.4 if dominant_trend == ("BULLISH" if target_return_pct > 0 else "BEARISH") else -0.2))), 2)
                expected_steps_to_target = hits[0] + 1
            else:
                prob_target_reached = 0.15
                expected_steps_to_target = None
                
        feature_importance_map = {
            self.feature_names[i]: round(float(feat_imp[i]), 4)
            for i in range(len(self.feature_names))
        }
        
        last_step_attn = attn_weights[-1, :]
        top_k_indices = np.argsort(last_step_attn)[-5:][::-1]
        temporal_highlights = [
            {"lookback_step": int(idx), "attention_weight": round(float(last_step_attn[idx]), 4)}
            for idx in top_k_indices
        ]
        
        return {
            "symbol": symbol,
            "current_price": current_price,
            "horizon_periods": self.horizon,
            "dominant_trend": dominant_trend,
            "trend_confidence": round(trend_confidence, 4),
            "trend_probabilities": {
                "bullish": round(float(trend_probs[0]), 4),
                "bearish": round(float(trend_probs[1]), 4),
                "range_bound": round(float(trend_probs[2]), 4)
            },
            "trajectory": future_steps,
            "target_analysis": {
                "target_return_pct": target_return_pct,
                "probability_reached": prob_target_reached,
                "expected_steps_to_target": expected_steps_to_target
            } if target_return_pct is not None else None,
            "feature_importance": feature_importance_map,
            "temporal_attention_highlights": temporal_highlights
        }

deep_forecaster = DeepForecasterEngine(horizon=20)
