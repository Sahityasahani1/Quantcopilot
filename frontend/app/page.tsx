"use client";

import React from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { PnLWidget } from "../components/PnLWidget";
import { RiskHeatmap } from "../components/RiskHeatmap";
import { IndianMarketWidget } from "../components/IndianMarketWidget";
import { TradingTerminal } from "../components/fno";
import { AddPositionModal } from "../components/AddPositionModal";
import { PortfolioImportModal } from "../components/PortfolioImportModal";
import { ShieldCheck, Zap, Plus, Upload, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function Home() {
  const { portfolio, activeTab, setIsAddPositionOpen, setIsImportModalOpen, clearPortfolio, deletePosition } = usePortfolioStore();

  if (activeTab === "fno_terminal") {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <TradingTerminal />
      </div>
    );
  }

  if (activeTab === "nse_market") {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <IndianMarketWidget />
        <AddPositionModal />
        <PortfolioImportModal />
      </div>
    );
  }

  if (activeTab === "gnn_risk") {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <RiskHeatmap />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-mono tracking-tight text-slate-100 uppercase">
            QUANTITATIVE TERMINAL OVERVIEW
          </h2>
          <p className="text-xs font-mono text-slate-400">
            Real-time portfolio delta, GNN contagion vectors, and dynamic risk engine status.
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-slate-300">WEBSOCKET: ACTIVE</span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300">GRL ADVERSARIAL: ENGAGED</span>
          </div>
        </div>
      </div>

      <PnLWidget />

      <IndianMarketWidget />

      <RiskHeatmap />

      {/* Portfolio Positions Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold font-mono text-slate-100 uppercase">
            ACTIVE PORTFOLIO POSITIONS & LEVERAGE
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-slate-400">
              {portfolio.positions.length} Positions
            </span>
            <button
              onClick={() => setIsAddPositionOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </button>
            {portfolio.positions.length > 0 && (
              <button
                onClick={clearPortfolio}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-rose-700 text-slate-400 hover:text-white text-[11px] font-bold font-mono px-3 py-1.5 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800/80 text-[11px] uppercase tracking-wider">
                <th className="pb-2">Symbol</th>
                <th className="pb-2">Side</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2">Entry Price</th>
                <th className="pb-2">Mark Price</th>
                <th className="pb-2">Leverage</th>
                <th className="pb-2 text-right">Unrealized P&L</th>
                <th className="pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {portfolio.positions.map((pos, idx) => {
                const isPos = pos.unrealized_pnl >= 0;
                return (
                  <tr key={`${pos.symbol}-${pos.side}-${idx}`} className="hover:bg-slate-900/80 transition-colors group">
                    <td className="py-3 font-bold text-slate-200">{pos.symbol}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.side === "LONG" ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50" : "bg-rose-950 text-rose-400 border border-rose-800/50"}`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">{pos.quantity}</td>
                    <td className="py-3 text-slate-300">₹{pos.entry_price.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-slate-300">₹{pos.current_price.toLocaleString('en-IN')}</td>
                    <td className="py-3 text-cyan-400 font-semibold">{pos.leverage}x</td>
                    <td className={`py-3 text-right font-bold flex items-center justify-end gap-1 ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {isPos ? "+" : ""}₹{Math.abs(pos.unrealized_pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => deletePosition(pos.symbol)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-400 transition-all"
                        title="Remove position"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {portfolio.positions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-mono text-xs">
                    No positions yet. Add positions or import a portfolio file to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPositionModal />
      <PortfolioImportModal />
    </div>
  );
}
