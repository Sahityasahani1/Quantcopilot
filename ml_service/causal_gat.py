from typing import Tuple, Optional, Any
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor
from torch_geometric.nn import GATConv

class GradientReversalFunction(torch.autograd.Function):
    @staticmethod
    def forward(ctx: Any, x: Tensor, alpha: float) -> Tensor:
        ctx.alpha = alpha
        return x.view_as(x)

    @staticmethod
    def backward(ctx: Any, grad_output: Tensor) -> Tuple[Tensor, None]:
        output = grad_output.neg() * ctx.alpha
        return output, None

class GradientReversalLayer(nn.Module):
    def __init__(self, alpha: float = 1.0) -> None:
        super(GradientReversalLayer, self).__init__()
        self.alpha: float = alpha

    def forward(self, x: Tensor) -> Tensor:
        return GradientReversalFunction.apply(x, self.alpha)

class CausalGraphXGAT(nn.Module):
    def __init__(
        self,
        in_channels: int,
        hidden_channels: int,
        out_channels: int,
        num_heads: int = 8,
        num_regimes: int = 4,
        grl_alpha: float = 1.0,
        dropout: float = 0.1
    ) -> None:
        super(CausalGraphXGAT, self).__init__()
        self.in_channels: int = in_channels
        self.hidden_channels: int = hidden_channels
        self.out_channels: int = out_channels
        self.num_heads: int = num_heads
        self.dropout_rate: float = dropout

        self.gat1: GATConv = GATConv(
            in_channels=in_channels,
            out_channels=hidden_channels,
            heads=num_heads,
            concat=True,
            dropout=dropout
        )
        
        self.gat2: GATConv = GATConv(
            in_channels=hidden_channels * num_heads,
            out_channels=hidden_channels,
            heads=num_heads,
            concat=True,
            dropout=dropout
        )

        self.gat3: GATConv = GATConv(
            in_channels=hidden_channels * num_heads,
            out_channels=out_channels,
            heads=1,
            concat=False,
            dropout=dropout
        )

        self.batch_norm1: nn.BatchNorm1d = nn.BatchNorm1d(hidden_channels * num_heads)
        self.batch_norm2: nn.BatchNorm1d = nn.BatchNorm1d(hidden_channels * num_heads)

        self.grl: GradientReversalLayer = GradientReversalLayer(alpha=grl_alpha)
        
        self.domain_classifier: nn.Sequential = nn.Sequential(
            nn.Linear(hidden_channels * num_heads, hidden_channels),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_channels, num_regimes)
        )

        self.risk_head: nn.Sequential = nn.Sequential(
            nn.Linear(out_channels, hidden_channels // 2),
            nn.ReLU(),
            nn.Linear(hidden_channels // 2, 1),
            nn.Sigmoid()
        )

    def forward(
        self,
        x: Tensor,
        edge_index: Tensor,
        return_attention_weights: bool = False
    ) -> Tuple[Tensor, Tensor, Optional[Tensor]]:
        h1 = self.gat1(x, edge_index)
        h1 = self.batch_norm1(h1)
        h1 = F.elu(h1)
        h1 = F.dropout(h1, p=self.dropout_rate, training=self.training)

        h2 = self.gat2(h1, edge_index)
        h2 = self.batch_norm2(h2)
        h2 = F.elu(h2)
        h2 = F.dropout(h2, p=self.dropout_rate, training=self.training)

        reversed_features = self.grl(h2)
        regime_logits = self.domain_classifier(reversed_features)

        h3 = self.gat3(h2, edge_index)
        risk_scores = self.risk_head(h3)

        return risk_scores, regime_logits, h3
