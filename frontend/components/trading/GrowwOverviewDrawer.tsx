"use client";

import React from "react";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  BarChart2, 
  Activity,
  ArrowUpRight
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0C100F] border-l border-white/[0.08] w-full max-w-lg h-full shadow-2xl flex flex-col font-sans text-[#F2F0E8] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#111614]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-[#161C19] border border-white/[0.08] flex items-center justify-center font-bold text-[#159570] text-sm">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-[#F2F0E8] uppercase">{symbol}</h2>
                <span className="text-[10px] bg-[#0C100F] text-[#A7ADA8] px-2 py-0.5 rounded border border-white/[0.06] font-mono">
                  NSE / BSE
                </span>
              </div>
              <p className="text-[11px] text-[#68716C]">
                Institutional Fundamentals & Market Profile
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded text-[#68716C] hover:text-[#F2F0E8] hover:bg-[#161C19] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1 font-mono">
          {/* Live Price Header */}
          <div className="flex items-baseline justify-between bg-[#111614] border border-white/[0.06] rounded p-4">
            <div>
              <span className="text-[10px] text-[#68716C] uppercase tracking-wider block font-sans">Live Last Traded Price</span>
              <div className="text-2xl font-bold text-[#F2F0E8] mt-0.5">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-[#42A77A] flex items-center justify-end">
                <ArrowUpRight className="h-4 w-4 mr-0.5" />
                +1.45% (+₹{(price * 0.0145).toFixed(2)})
              </div>
              <div className="text-[10px] text-[#68716C] mt-0.5">Volume: 12.4M shares</div>
            </div>
          </div>

          {/* Performance Range Bars */}
          <div className="bg-[#111614] border border-white/[0.06] rounded p-4 space-y-5">
            <div className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <BarChart2 className="h-4 w-4 text-[#159570]" />
              PERFORMANCE RANGE
            </div>

            {/* Today's Low / High Range Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#68716C] block">Today's Low</span>
                  <strong className="text-[#A7ADA8]">₹{todayLow}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#68716C] block">Today's High</span>
                  <strong className="text-[#A7ADA8]">₹{todayHigh}</strong>
                </div>
              </div>
              <div className="relative h-2 bg-[#161C19] rounded overflow-visible border border-white/[0.04]">
                <div 
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-[#C45D62] via-[#B89655] to-[#42A77A] rounded opacity-75" 
                  style={{ width: "100%" }}
                />
                {/* Pointer */}
                <div 
                  className="absolute -top-1 w-4 h-4 bg-[#F2F0E8] border-2 border-[#111614] rounded-full shadow-md transform -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${todayRangePct}%` }}
                />
              </div>
            </div>

            {/* 52-Week Low / High Range Bar */}
            <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
              <div className="flex justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#68716C] block">52-Week Low</span>
                  <strong className="text-[#A7ADA8]">₹{fiftyTwoWeekLow}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#68716C] block">52-Week High</span>
                  <strong className="text-[#A7ADA8]">₹{fiftyTwoWeekHigh}</strong>
                </div>
              </div>
              <div className="relative h-2 bg-[#161C19] rounded overflow-visible border border-white/[0.04]">
                <div 
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-[#C45D62] via-[#B89655] to-[#42A77A] rounded opacity-75" 
                  style={{ width: "100%" }}
                />
                {/* Pointer */}
                <div 
                  className="absolute -top-1 w-4 h-4 bg-[#F2F0E8] border-2 border-[#111614] rounded-full shadow-md transform -translate-x-1/2 transition-all duration-300"
                  style={{ left: `${fiftyTwoRangePct}%` }}
                />
              </div>
            </div>

            {/* Circuit Limits */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.04] text-xs">
              <div className="bg-[#0C100F] p-2.5 rounded border border-white/[0.04]">
                <span className="text-[10px] text-[#C45D62] font-semibold block">Lower Circuit (10%)</span>
                <strong className="text-[#F2F0E8]">₹{lowerCircuit}</strong>
              </div>
              <div className="bg-[#0C100F] p-2.5 rounded border border-white/[0.04]">
                <span className="text-[10px] text-[#42A77A] font-semibold block">Upper Circuit (10%)</span>
                <strong className="text-[#F2F0E8]">₹{upperCircuit}</strong>
              </div>
            </div>
          </div>

          {/* Technical Sentiment Dial & Market Indicators */}
          <div className="bg-[#111614] border border-white/[0.06] rounded p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#F2F0E8] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Activity className="h-4 w-4 text-[#159570]" />
                TECHNICAL SENTIMENT GAUGE
              </span>
              <span className="text-[10px] bg-[#161C19] text-[#42A77A] px-2 py-0.5 rounded border border-[#159570]/30 font-semibold font-mono">
                STRONG BUY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#0C100F] p-2 rounded border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">PCR Ratio</span>
                <strong className="text-[#42A77A] text-sm">1.24</strong>
              </div>
              <div className="bg-[#0C100F] p-2 rounded border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">Max Pain</span>
                <strong className="text-[#F2F0E8] text-sm">₹{price}</strong>
              </div>
              <div className="bg-[#0C100F] p-2 rounded border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">RSI (14)</span>
                <strong className="text-[#42A77A] text-sm">62.8</strong>
              </div>
            </div>
          </div>

          {/* Fundamental Ratios Grid */}
          <div className="bg-[#111614] border border-white/[0.06] rounded p-4 space-y-3">
            <div className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Building2 className="h-4 w-4 text-[#159570]" />
              KEY FUNDAMENTALS
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">Market Cap</span>
                <strong className="text-[#F2F0E8]">₹18,45,200 Cr</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">P/E Ratio</span>
                <strong className="text-[#F2F0E8]">26.4</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">P/B Ratio</span>
                <strong className="text-[#F2F0E8]">3.82</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">Industry P/E</span>
                <strong className="text-[#F2F0E8]">28.1</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">Debt to Equity</span>
                <strong className="text-[#F2F0E8]">0.34</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">ROE</span>
                <strong className="text-[#42A77A]">18.6%</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">EPS (TTM)</span>
                <strong className="text-[#F2F0E8]">₹88.40</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-[#68716C]">Div. Yield</span>
                <strong className="text-[#F2F0E8]">1.25%</strong>
              </div>
            </div>
          </div>

          {/* Institutional Activity (FII / DII) */}
          <div className="bg-[#111614] border border-white/[0.06] rounded p-4 space-y-2">
            <span className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider block font-sans">Institutional Net Flow Today</span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#161C19] border border-white/[0.06] p-2.5 rounded flex items-center justify-between">
                <span className="text-[#A7ADA8]">FII Inflow</span>
                <strong className="text-[#42A77A] font-semibold">+₹1,450 Cr</strong>
              </div>
              <div className="bg-[#161C19] border border-white/[0.06] p-2.5 rounded flex items-center justify-between">
                <span className="text-[#A7ADA8]">DII Inflow</span>
                <strong className="text-[#42A77A] font-semibold">+₹820 Cr</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Action Order Buttons */}
        <div className="p-4 border-t border-white/[0.08] bg-[#111614] flex space-x-3">
          <button
            onClick={() => { onClose(); onOpenOrderModal("BUY"); }}
            className="flex-1 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-semibold py-2.5 rounded text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            <span>BUY {symbol}</span>
          </button>
          <button
            onClick={() => { onClose(); onOpenOrderModal("SELL"); }}
            className="flex-1 bg-[#C45D62] hover:bg-[#A84B50] text-[#F2F0E8] font-semibold py-2.5 rounded text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
          >
            <TrendingDown className="h-4 w-4" />
            <span>SELL {symbol}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
