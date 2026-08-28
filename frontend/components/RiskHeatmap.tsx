"use client";

import React from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { Network, Activity, AlertTriangle } from "lucide-react";

export const RiskHeatmap: React.FC = () => {
  const { gnnRisk } = usePortfolioStore();

  const numNodes = gnnRisk.nodes.length || 1;
  const gridCols = Math.min(Math.max(Math.ceil(Math.sqrt(numNodes)), 3), 8);

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Network className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-bold font-mono text-slate-100 tracking-wide">
            CAUSALGRAPHX GNN RISK ENGINE MATRIX
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span>Regime:</span>
          <span className="text-cyan-400 font-semibold px-2 py-0.5 bg-cyan-950/60 border border-cyan-800/50 rounded">
            {gnnRisk.regime_classification}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Asset Contagion & Centrality</h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {gnnRisk.nodes.map((node) => (
              <div
                key={node.node_id}
                className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-3 flex items-center justify-between text-xs font-mono hover:border-cyan-500/40 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${node.risk_score > 0.35 ? "bg-rose-500 shadow-sm shadow-rose-500" : "bg-emerald-500 shadow-sm shadow-emerald-500"}`} />
                  <div>
                    <span className="font-bold text-slate-200">{node.asset_name}</span>
                    {node.company_name && (
                      <span className="text-[10px] text-slate-500 ml-2 font-sans">({node.company_name})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500">Centrality</span>
                    <span className="text-slate-300">{node.centrality}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500">Contagion Factor</span>
                    <span className="text-slate-300">{node.systemic_contagion_factor}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500">GNN Risk</span>
                    <span className={`font-bold ${node.risk_score > 0.35 ? "text-rose-400" : "text-emerald-400"}`}>
                      {node.risk_score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider">Historical Return Correlation Heatmap</h3>
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center">
            <div 
              className="grid gap-1 w-full aspect-square max-w-[240px]"
              style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
            >
              {gnnRisk.adjacency_matrix.slice(0, gridCols).map((row, i) =>
                row.slice(0, gridCols).map((val, j) => {
                  return (
                    <div
                      key={`${i}-${j}`}
                      title={`Correlation Edge (${i}, ${j}): ${val}`}
                      style={{
                        backgroundColor: `rgba(6, 182, 212, ${Math.max(0.15, val)})`
                      }}
                      className="rounded border border-cyan-900/40 flex items-center justify-center text-[9px] font-mono text-slate-950 font-bold transition-all hover:scale-110"
                    >
                      {val.toFixed(2)}
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-3 text-center">
              Dynamic Cross-Asset Adjacency Matrix (Learned from 1Y OHLCV Return Time-Series)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
