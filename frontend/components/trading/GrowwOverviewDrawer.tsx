"use client";

import React from "react";
import { GrowwCompanyOverview } from "../../types/trading";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Building2, 
  BarChart2, 
  Zap, 
  Layers, 
  Scale, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface GrowwOverviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  onOpenOrderModal: (side: "BUY" | "SELL") => void;
}

export const GrowwOverviewDrawer: React.FC<GrowwOverviewDrawerProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  onOpenOrderModal
}) => {
  if (!isOpen) return null;

  const price = currentPrice || 1000;
  const todayLow = Number((price * 0.982).toFixed(2));
  const todayHigh = Number((price * 1.018).toFixed(2));
  const fiftyTwoWeekLow = Number((price * 0.72).toFixed(2));
  const fiftyTwoWeekHigh = Number((price * 1.28).toFixed(2));
  const lowerCircuit = Number((price * 0.90).toFixed(2));
  const upperCircuit = Number((price * 1.10).toFixed(2));

  // Compute position percentage for range sliders
  const todayRangePct = Math.max(0, Math.min(100, ((price - todayLow) / (todayHigh - todayLow || 1)) * 100));
  const fiftyTwoRangePct = Math.max(0, Math.min(100, ((price - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow || 1)) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0b0f19] border-l border-slate-800 w-full max-w-lg h-full shadow-2xl flex flex-col font-mono text-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#080c14]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-md">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white uppercase">{symbol}</h2>
                <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded border border-slate-700 font-bold">
                  NSE / BSE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                Full Company Fundamentals & Market Depth
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Live Price Header */}
          <div className="flex items-baseline justify-between bg-slate-950 border border-slate-800/80 rounded-xl p-4">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Last Traded Price</span>
              <div className="text-2xl font-bold text-slate-100 mt-0.5">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-emerald-400 flex items-center justify-end">
                <ArrowUpRight className="h-4 w-4 mr-0.5" />
                +1.45% (+₹{(price * 0.0145).toFixed(2)})
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Volume: 12.4M shares</div>
            </div>
          </div>

          {/* Groww-style Performance Range Bars */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-5">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-amber-400" />
              PERFORMANCE RANGE
            </div>

            {/* Today's Low / High Range Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <div className="text-slate-400">
                  <span className="text-[10px] text-slate-500 block">Today's Low</span>
                  <strong className="text-slate-200">₹{todayLow}</strong>
                </div>
                <div className="text-right text-slate-400">
                  <span className="text-[10px] text-slate-500 block">Today's High</span>
                  <strong className="text-slate-200">₹{todayHigh}</strong>
                </div>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-visible">
                <div 
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full" 
                  style={{ width: "100%" }}
                />
                {/* Pointer */}
                <div 
                  className="absolute -top-1 w-4 h-4 bg-white border-2 border-cyan-500 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${todayRangePct}%` }}
                />
              </div>
            </div>

            {/* 52-Week Low / High Range Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex justify-between text-xs">
                <div className="text-slate-400">
                  <span className="text-[10px] text-slate-500 block">52-Week Low</span>
                  <strong className="text-slate-200">₹{fiftyTwoWeekLow}</strong>
                </div>
                <div className="text-right text-slate-400">
                  <span className="text-[10px] text-slate-500 block">52-Week High</span>
                  <strong className="text-slate-200">₹{fiftyTwoWeekHigh}</strong>
                </div>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-visible">
                <div 
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full" 
                  style={{ width: "100%" }}
                />
                {/* Pointer */}
                <div 
                  className="absolute -top-1 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full shadow-lg transform -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${fiftyTwoRangePct}%` }}
                />
              </div>
            </div>

            {/* Circuit Limits */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-rose-400 font-bold block">Lower Circuit (10%)</span>
                <strong className="text-slate-200">₹{lowerCircuit}</strong>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-[10px] text-emerald-400 font-bold block">Upper Circuit (10%)</span>
                <strong className="text-slate-200">₹{upperCircuit}</strong>
              </div>
            </div>
          </div>

          {/* Technical Sentiment Dial & Market Indicators */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-400" />
                TECHNICAL SENTIMENT GAUGE
              </span>
              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">
                STRONG BUY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">PCR Ratio</span>
                <strong className="text-emerald-400 text-sm">1.24</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Max Pain</span>
                <strong className="text-amber-400 text-sm">₹{price}</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-500 block">RSI (14)</span>
                <strong className="text-cyan-400 text-sm">62.8</strong>
              </div>
            </div>
          </div>

          {/* Fundamental Ratios Grid (Groww-style) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-cyan-400" />
              KEY FUNDAMENTALS
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Market Cap</span>
                <strong className="text-slate-200">₹18,45,200 Cr</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">P/E Ratio</span>
                <strong className="text-slate-200">26.4</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">P/B Ratio</span>
                <strong className="text-slate-200">3.82</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Industry P/E</span>
                <strong className="text-slate-200">28.1</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Debt to Equity</span>
                <strong className="text-slate-200">0.34</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">ROE</span>
                <strong className="text-emerald-400">18.6%</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">EPS (TTM)</span>
                <strong className="text-slate-200">₹88.40</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Div. Yield</span>
                <strong className="text-slate-200">1.25%</strong>
              </div>
            </div>
          </div>

          {/* Institutional Activity (FII / DII) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase block">Institutional Net Flow Today</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-emerald-300 font-bold">FII Inflow</span>
                <strong className="text-emerald-400">+₹1,450 Cr</strong>
              </div>
              <div className="bg-cyan-950/40 border border-cyan-800/50 p-2.5 rounded-lg flex items-center justify-between">
                <span className="text-cyan-300 font-bold">DII Inflow</span>
                <strong className="text-cyan-400">+₹820 Cr</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Action Order Buttons */}
        <div className="p-4 border-t border-slate-800 bg-[#080c14] flex space-x-3">
          <button
            onClick={() => { onClose(); onOpenOrderModal("BUY"); }}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
          >
            <TrendingUp className="h-4 w-4" />
            <span>BUY {symbol}</span>
          </button>
          <button
            onClick={() => { onClose(); onOpenOrderModal("SELL"); }}
            className="flex-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
          >
            <TrendingDown className="h-4 w-4" />
            <span>SELL {symbol}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
