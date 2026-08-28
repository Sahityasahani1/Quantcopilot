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
    <div className="flex items-center overflow-x-auto space-x-6 px-4 py-2 bg-[#090d16] border-b border-slate-800 text-xs shrink-0 select-none">
      {indices.map((idx) => {
        const isPos = idx.change >= 0;
        return (
          <div key={idx.symbol} className="flex items-center space-x-2 shrink-0">
            <span className="font-bold text-slate-300">{idx.symbol}</span>
            <span className="text-white font-semibold">₹{idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            <span className={`flex items-center text-[11px] font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
              {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {isPos ? "+" : ""}{idx.change.toFixed(2)} ({isPos ? "+" : ""}{idx.pct.toFixed(2)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
};
