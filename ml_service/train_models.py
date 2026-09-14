"""
QuantCopilot AI - Institutional Deep Learning & Alpha Model Training Pipeline
Trains:
1. 18-Alpha Temporal Attention Forecaster from PostgreSQL & Redis SQL data
2. Sortino & Friction-Aware Deep RL Agent (Actor-Critic with GAE)
"""

import os
import glob
import json
import time
import argparse
import logging
from typing import List, Dict, Tuple, Any
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

from ml_service.feature_engine import build_alpha_feature_matrix, ALPHA_FEATURE_NAMES
from ml_service.deep_forecaster import TemporalAttentionForecaster, QuantileHuberLoss
from ml_service.drl_policy import DeepRLTradingAgent, DRLExecutionSimulator
from ml_service.db_loader import db_market_loader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

CHECKPOINT_DIR = os.path.join(os.path.dirname(__file__), "checkpoints")
os.makedirs(CHECKPOINT_DIR, exist_ok=True)


# ==============================================================================
# 1. DATABASE & REDIS-FED 18-ALPHA TIME-SERIES DATASET LOADER
# ==============================================================================
class MarketSequenceDataset(Dataset):
    def __init__(self, source: str = "postgres", seq_len: int = 60, horizon: int = 20):
        self.seq_len = seq_len
        self.horizon = horizon
        self.samples_x: List[np.ndarray] = []
        self.samples_y: List[np.ndarray] = []
        
        logging.info(f"Loading market datasets from SQL database (source: {source.upper()})...")
        symbol_dfs = db_market_loader.load_market_history()
        
        for sym, df in symbol_dfs.items():
            try:
                close_col = "Close" if "Close" in df.columns else ("Adj Close" if "Adj Close" in df.columns else None)
                if close_col is None or len(df) < (seq_len + horizon + 10):
                    continue
                
                # Check Redis for live intraday buffer
                live_tick = db_market_loader.load_live_buffer_from_redis(sym)
                if live_tick and "price" in live_tick:
                    live_row = {
                        "Date": time.strftime("%Y-%m-%d"),
                        "Open": live_tick.get("open_price", live_tick["price"]),
                        "High": live_tick.get("day_high", live_tick["price"]),
                        "Low": live_tick.get("day_low", live_tick["price"]),
                        "Close": live_tick["price"],
                        "AvgPrice": live_tick.get("price"),
                        "Volume": live_tick.get("volume_24h", 100000),
                        "DelivQty": 0,
                        "DelivPct": 50.0,
                        "Trades": 10000
                    }
                    df = pd.concat([df, pd.DataFrame([live_row])], ignore_index=True)
                
                prices = df[close_col].dropna().values.astype(np.float32)
                features, _ = build_alpha_feature_matrix(df)
                
                # Sliding windows with step size 2 for balanced density
                for i in range(0, len(features) - seq_len - horizon, 2):
                    x = features[i : i + seq_len]
                    curr_p = prices[i + seq_len - 1]
                    future_p = prices[i + seq_len : i + seq_len + horizon]
                    y_drift = (future_p - curr_p) / (curr_p + 1e-6)
                    
                    self.samples_x.append(x)
                    self.samples_y.append(y_drift)
            except Exception as e:
                logging.warning(f"Skipping symbol {sym} due to error: {e}")
                
        logging.info(f"Constructed {len(self.samples_x)} 18-Alpha multi-horizon sequence windows from SQL database (T={seq_len}).")

    def __len__(self) -> int:
        return max(1, len(self.samples_x))

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        if not self.samples_x:
            return torch.zeros((self.seq_len, 18), dtype=torch.float32), torch.zeros(self.horizon, dtype=torch.float32)
        return (
            torch.tensor(self.samples_x[idx], dtype=torch.float32),
            torch.tensor(self.samples_y[idx], dtype=torch.float32)
        )


# ==============================================================================
# 2. TRAINING ROUTINES
# ==============================================================================
def train_temporal_forecaster(source: str = "postgres", epochs: int = 8, batch_size: int = 64, lr: float = 1e-3, device: str = "cpu"):
    """Trains the 18-Alpha Spatio-Temporal Attention Forecaster from PostgreSQL & Redis."""
    logging.info("=" * 65)
    logging.info(f"🧠 TRAINING 18-ALPHA FORECASTER (SOURCE: {source.upper()}, T=60)")
    logging.info("=" * 65)

    dataset = MarketSequenceDataset(source=source, seq_len=60, horizon=20)
    if len(dataset) < 5:
        logging.error("Not enough historical data found in database. Run db_loader.py --sync first.")
        return

    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    model = TemporalAttentionForecaster(input_dim=18, hidden_dim=128, horizon=20, num_heads=8, dropout=0.1).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    criterion = QuantileHuberLoss()
    scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(optimizer, T_0=max(2, epochs // 2), T_mult=2)

    model.train()
    start_time = time.time()
    
    for epoch in range(1, epochs + 1):
        epoch_loss = 0.0
        batches = 0
        for batch_x, batch_y in dataloader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            optimizer.zero_grad()
            
            preds = model(batch_x)
            pred_heads = [
                preds["lower_95_drift"],
                preds["lower_80_drift"],
                preds["median_drift"],
                preds["upper_80_drift"],
                preds["upper_95_drift"]
            ]
            
            loss = criterion(pred_heads, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            
            epoch_loss += loss.item()
            batches += 1
            
        scheduler.step()
        avg_loss = epoch_loss / max(1, batches)
        if epoch % 2 == 0 or epoch == 1 or epoch == epochs:
            logging.info(f"Epoch [{epoch:02d}/{epochs:02d}] | Quantile Huber Loss: {avg_loss:.5f} | LR: {scheduler.get_last_lr()[0]:.6f}")

    elapsed = time.time() - start_time
    save_path = os.path.join(CHECKPOINT_DIR, "temporal_forecaster.pt")
    torch.save(model.state_dict(), save_path)
    logging.info(f"✅ Forecaster training finished in {elapsed:.2f}s! Checkpoint saved to: {save_path}\n")


def train_drl_agent(source: str = "postgres", episodes: int = 25, lr: float = 5e-4, gamma: float = 0.99, device: str = "cpu"):
    """Trains the Sortino & Friction-Aware Deep RL Trading Agent from SQL records."""
    logging.info("=" * 65)
    logging.info(f"🤖 TRAINING FRICTION-AWARE SORTINO DRL AGENT (SOURCE: {source.upper()})")
    logging.info("=" * 65)

    symbol_dfs = db_market_loader.load_market_history()
    if not symbol_dfs:
        logging.error("No data found for DRL training in SQL database.")
        return

    agent = DeepRLTradingAgent(state_dim=18, hidden_dim=128, num_actions=4, dropout=0.05).to(device)
    optimizer = torch.optim.AdamW(agent.parameters(), lr=lr, weight_decay=1e-4)

    price_series_list = []
    for sym, df in list(symbol_dfs.items())[:12]:
        try:
            c = "Close" if "Close" in df.columns else "Adj Close"
            if c in df.columns and len(df) > 100:
                price_series_list.append(df[c].dropna().values.astype(np.float32))
        except Exception:
            pass

    if not price_series_list:
        logging.error("Could not load price series for DRL training.")
        return

    agent.train()
    start_time = time.time()
    simulator = DRLExecutionSimulator()
    transaction_cost_pct = 0.0003

    for ep in range(1, episodes + 1):
        prices = price_series_list[ep % len(price_series_list)]
        n_steps = min(200, len(prices) - 2)
        start_idx = np.random.randint(15, max(16, len(prices) - n_steps - 1))
        
        log_probs = []
        values = []
        rewards = []
        
        position = 0.0
        entry_price = 0.0
        returns_history = []
        
        for t in range(start_idx, start_idx + n_steps):
            curr_p = prices[t]
            state_vec = simulator._build_state_tensor(prices.tolist(), t, position)
            state_t = torch.tensor(state_vec, dtype=torch.float32, device=device).unsqueeze(0)
            
            probs, val, _, size_t = agent(state_t)
            dist = torch.distributions.Categorical(probs)
            action = dist.sample()
            
            log_probs.append(dist.log_prob(action))
            values.append(val[0, 0])
            
            act_idx = action.item()
            step_ret = 0.0
            
            if act_idx == 0:  # LONG
                if position <= 0:
                    position = float(size_t[0].item())
                    entry_price = curr_p
                    step_ret -= transaction_cost_pct
            elif act_idx == 1:  # SHORT
                if position >= 0:
                    position = -float(size_t[0].item())
                    entry_price = curr_p
                    step_ret -= transaction_cost_pct
            elif act_idx == 3:  # HEDGE
                position = 0.0
                step_ret -= (transaction_cost_pct * 0.5)
                
            next_p = prices[t + 1]
            price_delta = (next_p - curr_p) / curr_p
            trade_ret = position * price_delta
            step_ret += trade_ret
            returns_history.append(step_ret)
            
            downside = [r for r in returns_history[-20:] if r < 0]
            downside_std = np.std(downside) if len(downside) > 1 else 0.01
            sortino_reward = (step_ret / (downside_std + 1e-4)) - (0.5 if step_ret < 0 else 0.0)
            rewards.append(sortino_reward)

        returns = []
        g = 0.0
        for r in reversed(rewards):
            g = r + gamma * g
            returns.insert(0, g)
        returns = torch.tensor(returns, dtype=torch.float32, device=device)
        returns = (returns - returns.mean()) / (returns.std() + 1e-6)

        policy_loss = []
        value_loss = []
        for log_prob, val, ret in zip(log_probs, values, returns):
            advantage = ret - val.item()
            policy_loss.append(-log_prob * advantage)
            value_loss.append(F.mse_loss(val, ret))

        optimizer.zero_grad()
        total_loss = torch.stack(policy_loss).sum() + 0.5 * torch.stack(value_loss).sum()
        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(agent.parameters(), max_norm=1.0)
        optimizer.step()

        if ep % 5 == 0 or ep == 1 or ep == episodes:
            total_ep_ret = sum(returns_history) * 100.0
            logging.info(f"Episode [{ep:02d}/{episodes:02d}] | Sortino Return: {total_ep_ret:+.2f}% | Loss: {total_loss.item():.4f}")

    elapsed = time.time() - start_time
    save_path = os.path.join(CHECKPOINT_DIR, "drl_agent.pt")
    torch.save(agent.state_dict(), save_path)
    logging.info(f"✅ DRL Agent training finished in {elapsed:.2f}s! Checkpoint saved to: {save_path}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QuantCopilot 18-Alpha SQL/Redis Deep Learning Training")
    parser.add_argument("--source", type=str, default="postgres", help="Data source: postgres, redis, or csv")
    parser.add_argument("--epochs", type=int, default=8, help="Forecaster training epochs")
    parser.add_argument("--episodes", type=int, default=25, help="DRL agent training episodes")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu or cuda)")
    args = parser.parse_args()

    logging.info(f"Starting 18-Alpha training on device: {args.device.upper()} from Source: {args.source.upper()}")
    train_temporal_forecaster(source=args.source, epochs=args.epochs, batch_size=args.batch_size, device=args.device)
    train_drl_agent(source=args.source, episodes=args.episodes, device=args.device)
    logging.info("🎉 All 18-Alpha Institutional Deep Learning models trained and checkpointed from SQL Database!")
