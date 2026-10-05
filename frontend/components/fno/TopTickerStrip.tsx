"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export interface IndexItem {
  symbol: string;
  price: number;
  change: number;
  pct: number;
}

interface TopTickerStripProps {
  indices?: IndexItem[];
}

const DEFAULT_INDICES: IndexItem[] = [
  { symbol: "NIFTY 50", price: 24144.10, change: -74.95, pct: -0.31 },
  { symbol: "SENSEX", price: 77204.66, change: -164.45, pct: -0.21 },
  { symbol: "BANKNIFTY", price: 50820.25, change: 443.35, pct: 0.88 },
  { symbol: "CRUDE OIL FUT", price: 8218.00, change: -60.00, pct: -0.72 },
  { symbol: "NATURAL GAS FUT", price: 261.90, change: -4.50, pct: -1.69 }
];

export const TopTickerStrip: React.FC<TopTickerStripProps> = ({ indices = DEFAULT_INDICES }) => {
  return (
    <div className="flex items-center overflow-x-auto space-x-6 px-4 py-2 bg-[#0C100F] border-b border-white/[0.065] text-xs shrink-0 select-none font-mono">
      {indices.map((idx) => {
        const isPos = idx.change >= 0;
        return (
          <div key={idx.symbol} className="flex items-center space-x-2 shrink-0">
            <span className="font-semibold text-[#F2F0E8]">{idx.symbol}</span>
            <span className="text-[#F2F0E8] font-medium tabular-nums">₹{idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span className={`flex items-center text-[11px] font-semibold tabular-nums ${isPos ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
              {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {isPos ? "+" : ""}{idx.change.toFixed(2)} ({isPos ? "+" : ""}{idx.pct.toFixed(2)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
};
