"use client";

import React, { useEffect, useState } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { ShieldAlert, TrendingUp, Cpu, Clock, Sun, Moon, Zap } from "lucide-react";

export const Header: React.FC = () => {
  const { portfolio, gnnRisk, connectionStatus, marketStatus, fetchMarketData, initLiveFeed } = usePortfolioStore();
  const [istTime, setIstTime] = useState<string>("");

  // Live IST Clock Tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      };
      setIstTime(new Intl.DateTimeFormat("en-IN", options).format(now) + " IST");
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll real market quotes and market status every 10 seconds, and connect live WebSocket feed
  useEffect(() => {
    fetchMarketData();
    initLiveFeed();
    const pollInterval = setInterval(() => {
      fetchMarketData();
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [fetchMarketData, initLiveFeed]);

  const isPositiveRealized = portfolio.realized_pnl >= 0;
  const isPositiveUnrealized = portfolio.unrealized_pnl >= 0;
  const isPositiveDaily = portfolio.daily_pnl >= 0;

  const isMarketOpen = marketStatus ? marketStatus.is_market_open : false;
  const isPreOpen = marketStatus?.status === "PRE_OPEN";

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between text-slate-100 shadow-xl">
      {/* Brand & Market Status Session */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-400 flex items-center justify-center shadow-md font-black text-slate-950 text-xs">
            NSE
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-amber-200 to-slate-300 font-mono">
              QUANTCOPILOT AI
            </h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
              INDIAN EQUITIES TERMINAL
            </p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-slate-800" />

        {/* Live Indian Stock Market Session Badge (Zerodha/Groww Standard) */}
        <div className="flex items-center space-x-2.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs font-mono shadow-inner">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isMarketOpen ? "bg-emerald-400" : isPreOpen ? "bg-amber-400" : "bg-slate-500"
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isMarketOpen ? "bg-emerald-500" : isPreOpen ? "bg-amber-500" : "bg-slate-600"
            }`} />
          </span>

          <div className="flex items-center space-x-2">
            <span className={`font-bold text-[11px] ${
              isMarketOpen ? "text-emerald-400" : isPreOpen ? "text-amber-400" : "text-slate-300"
            }`}>
              {isMarketOpen ? "MARKET OPEN (09:15-15:30 IST)" : isPreOpen ? "PRE-OPEN SESSION" : "MARKET CLOSED (AMO)"}
            </span>
            <span className="text-slate-500">|</span>
            <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
              <Clock className="h-3 w-3 text-amber-400/80" />
              <span>{istTime || "IST"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Portfolio Quick Stats */}
      <div className="flex items-center space-x-6 text-xs font-mono">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Portfolio Value</span>
          <span className="font-bold text-sm text-slate-100">
            ₹{portfolio.total_equity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="h-8 w-[1px] bg-slate-800/80" />

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Overall Return</span>
          <span className={`font-semibold flex items-center ${isPositiveUnrealized ? "text-emerald-400" : "text-rose-400"}`}>
            {isPositiveUnrealized ? "+" : ""}₹{Math.abs(portfolio.unrealized_pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">1-Day P&L</span>
          <span className={`font-semibold flex items-center space-x-1 ${isPositiveDaily ? "text-emerald-400" : "text-rose-400"}`}>
            <TrendingUp className={`h-3 w-3 ${isPositiveDaily ? "" : "rotate-180"}`} />
            <span>{isPositiveDaily ? "+" : ""}{portfolio.daily_pnl_percentage}% (₹{Math.abs(portfolio.daily_pnl).toLocaleString('en-IN')})</span>
          </span>
        </div>

        <div className="h-8 w-[1px] bg-slate-800/80" />

        {/* GNN Risk Score */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
          <ShieldAlert className={`h-4 w-4 ${gnnRisk.overall_system_risk < 0.4 ? "text-emerald-400" : gnnRisk.overall_system_risk < 0.7 ? "text-amber-400" : "text-rose-400"}`} />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest">GNN System Risk</span>
            <span className="font-bold text-slate-200">{gnnRisk.overall_system_risk} Index</span>
          </div>
        </div>
      </div>
    </header>
  );
};

