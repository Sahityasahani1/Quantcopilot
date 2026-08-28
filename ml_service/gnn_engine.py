import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from typing import List, Dict, Any, Tuple
import time

class GATLayer(nn.Module):
    def __init__(self, in_features: int, out_features: int, heads: int = 4, alpha: float = 0.2):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.heads = heads
        self.alpha = alpha

        self.W = nn.Parameter(torch.empty(size=(heads, in_features, out_features)))
        nn.init.xavier_uniform_(self.W.data, gain=1.414)

        self.a_src = nn.Parameter(torch.empty(size=(heads, out_features, 1)))
        self.a_dst = nn.Parameter(torch.empty(size=(heads, out_features, 1)))
        nn.init.xavier_uniform_(self.a_src.data, gain=1.414)
        nn.init.xavier_uniform_(self.a_dst.data, gain=1.414)

        self.leakyrelu = nn.LeakyReLU(self.alpha)

    def forward(self, h: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        N = h.size(0)
        h_prime = torch.einsum('ni,hij->hnj', h, self.W)
        
        attn_src = torch.einsum('hnj,hjk->hnk', h_prime, self.a_src)
        attn_dst = torch.einsum('hnj,hjk->hnk', h_prime, self.a_dst)
        
        scores = attn_src + attn_dst.transpose(1, 2)
        scores = self.leakyrelu(scores)
        
        zero_vec = -9e15 * torch.ones_like(scores)
        mask = adj.unsqueeze(0).expand(self.heads, N, N) > 0
        attention = torch.where(mask, scores, zero_vec)
        attention = F.softmax(attention, dim=-1)
        
        out = torch.einsum('hnm,hmj->hnj', attention, h_prime)
        out = out.permute(1, 0, 2).contiguous().view(N, self.heads * self.out_features)
        return out

class MarketContagionGAT(nn.Module):
    def __init__(self, in_channels: int = 6, hidden_channels: int = 32, out_channels: int = 16, heads: int = 4):
        super().__init__()
        self.gat1 = GATLayer(in_channels, hidden_channels, heads=heads)
        self.bn1 = nn.BatchNorm1d(hidden_channels * heads)
        self.gat2 = GATLayer(hidden_channels * heads, out_channels, heads=1)
        
        self.risk_head = nn.Sequential(
            nn.Linear(out_channels, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )
        self.volatility_head = nn.Sequential(
            nn.Linear(out_channels, 16),
            nn.ReLU(),
            nn.Linear(16, 1)
        )

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        h = self.gat1(x, adj)
        h = self.bn1(h)
        h = F.elu(h)
        h = F.dropout(h, p=0.1, training=self.training)
        
        embeddings = self.gat2(h, adj)
        h_out = F.elu(embeddings)
        
        risk_score = self.risk_head(h_out)
        vol_forecast = self.volatility_head(h_out)
        
        return h_out, risk_score, vol_forecast

class GNNInferenceEngine:
    def __init__(self):
        self.model = MarketContagionGAT(in_channels=6, hidden_channels=32, out_channels=16, heads=4)
        self.model.eval()

    def run_inference(self, symbols: List[str], features: List[List[float]], corr_matrix: List[List[float]]) -> Dict[str, Any]:
        x = torch.tensor(features, dtype=torch.float32)
        adj = torch.tensor(corr_matrix, dtype=torch.float32)
        
        mask = (torch.abs(adj) > 0.35).float()
        
        with torch.no_grad():
            embeddings, risk, vol = self.model(x, mask)
            
        nodes = []
        for i, sym in enumerate(symbols):
            nodes.append({
                "symbol": sym,
                "risk_score": round(float(risk[i].item()), 4),
                "volatility_forecast": round(float(vol[i].item()), 4),
                "embedding": [round(v, 4) for v in embeddings[i].tolist()]
            })
            
        systemic_risk = float(torch.mean(risk).item())
        gamma_squeeze = float(torch.max(risk).item() * 0.45)
        
        return {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "systemic_contagion": round(systemic_risk, 4),
            "contagion_status": "HIGH" if systemic_risk > 0.6 else ("MODERATE" if systemic_risk > 0.3 else "LOW"),
            "gamma_squeeze_prob": round(gamma_squeeze, 4),
            "predicted_iv_drift": round(float(torch.mean(vol).item()) * 0.5, 4),
            "high_risk_nodes": [n["symbol"] for n in nodes if n["risk_score"] > 0.4],
            "nodes": nodes
        }

gnn_engine = GNNInferenceEngine()
