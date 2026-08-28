"use client";

import React from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { IndianRupee, ShieldAlert, ArrowUpRight, ArrowDownRight, Layers, Wallet, TrendingUp } from "lucide-react";

export const PnLWidget: React.FC = () => {
  const { portfolio, marketStatus } = usePortfolioStore();

  const isPosTotal = portfolio.unrealized_pnl >= 0;
  const isPosDaily = portfolio.daily_pnl >= 0;
  const investedAmount = Math.max(0, portfolio.net_exposure - portfolio.unrealized_pnl);
  const totalReturnPct = investedAmount > 0 ? ((portfolio.unrealized_pnl / investedAmount) * 100).toFixed(2) : "0.00";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* 1. Total Portfolio Value */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>PORTFOLIO CURRENT VALUE</span>
          <Wallet className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-slate-100">
            ₹{portfolio.net_exposure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>Invested:</span>
            <span className="text-slate-200 font-semibold">₹{investedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* 2. Total Unrealized Return (Overall P&L) */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>TOTAL P&L (OVERALL)</span>
          {isPosTotal ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-rose-400" />
          )}
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-bold font-mono ${isPosTotal ? "text-emerald-400" : "text-rose-400"}`}>
            {isPosTotal ? "+" : ""}₹{Math.abs(portfolio.unrealized_pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-xs font-mono mt-1 ${isPosTotal ? "text-emerald-500" : "text-rose-500"}`}>
            {isPosTotal ? "+" : ""}{totalReturnPct}% total return
          </div>
        </div>
      </div>

      {/* 3. 1-Day Return (Day's P&L) */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>TODAY&apos;S P&L (1-DAY)</span>
          {isPosDaily ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingUp className="h-4 w-4 text-rose-400 rotate-180" />
          )}
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-bold font-mono ${isPosDaily ? "text-emerald-400" : "text-rose-400"}`}>
            {isPosDaily ? "+" : ""}₹{Math.abs(portfolio.daily_pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className={`text-xs font-mono mt-1 ${isPosDaily ? "text-emerald-500" : "text-rose-500"}`}>
            {isPosDaily ? "+" : ""}{portfolio.daily_pnl_percentage}% from prev close
          </div>
        </div>
      </div>

      {/* 4. Value at Risk / Margin Status */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-lg hover:border-slate-700/80 transition-colors">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>1D VALUE AT RISK (99%)</span>
          <ShieldAlert className="h-4 w-4 text-amber-400" />
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-amber-400">
            ₹{portfolio.var_99.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-mono text-slate-400 mt-1 flex items-center justify-between">
            <span>Margin Usage:</span>
            <span className="text-slate-200 font-semibold">{portfolio.margin_usage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

