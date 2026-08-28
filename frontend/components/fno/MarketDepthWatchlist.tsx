"use client";

import React, { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { MarketDepth, GNNContagionSignal } from "../../types";

interface MarketDepthWatchlistProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  marketDepth: MarketDepth | null;
  gnnSignal: GNNContagionSignal | null;
}

export const MarketDepthWatchlist: React.FC<MarketDepthWatchlistProps> = ({
  selectedSymbol,
  onSelectSymbol,
  marketDepth,
  gnnSignal
}) => {
  const [activeSideTab, setActiveSideTab] = useState<"WATCHLIST" | "DEPTH" | "GNN">("WATCHLIST");
  const [searchQuery, setSearchQuery] = useState("");

  const watchlistUniverse = [
    { symbol: "NIFTY 50", price: 24144.10, change: -0.31, isIndex: true },
    { symbol: "BANKNIFTY", price: 50820.25, change: 0.88, isIndex: true },
    { symbol: "SENSEX", price: 77204.66, change: -0.21, isIndex: true },
    { symbol: "RELIANCE", price: 2985.40, change: 2.15, isIndex: false },
    { symbol: "TCS", price: 4210.80, change: -0.45, isIndex: false },
    { symbol: "HDFCBANK", price: 1612.30, change: 1.65, isIndex: false },
    { symbol: "INFY", price: 1845.60, change: 0.92, isIndex: false },
    { symbol: "TATAMOTORS", price: 1042.15, change: -1.10, isIndex: false },
    { symbol: "SBIN", price: 824.50, change: 0.75, isIndex: false },
    { symbol: "TATASTEEL", price: 184.09, change: -1.19, isIndex: false },
    { symbol: "BEL", price: 408.55, change: 0.11, isIndex: false }
  ];

  const filteredWatchlist = watchlistUniverse.filter((item) =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-[#06090e] flex flex-col text-xs font-mono select-none shrink-0 border-l border-slate-800">
      <div className="flex border-b border-slate-800 shrink-0">
        {(["WATCHLIST", "DEPTH", "GNN"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSideTab(tab)}
            className={`flex-1 py-2 font-bold text-[10px] transition-colors ${
              activeSideTab === tab ? "bg-[#0b0f17] text-cyan-400 border-b-2 border-cyan-400" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSideTab === "WATCHLIST" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-800 shrink-0">
            <div className="flex items-center bg-slate-900 rounded px-2 py-1 border border-slate-800">
              <Search className="h-3.5 w-3.5 text-slate-500 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Stocks, F&O..."
                className="bg-transparent text-slate-200 placeholder-slate-500 text-xs outline-none w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
            {filteredWatchlist.map((item) => {
              const isPos = item.change >= 0;
              const isSelected = selectedSymbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-cyan-950/30 border-l-2 border-cyan-400" : "hover:bg-slate-900/60"
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-200">{item.symbol}</div>
                    <div className="text-[10px] text-slate-500">{item.isIndex ? "NSE Index" : "NSE Equity"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-200">₹{item.price.toFixed(2)}</div>
                    <div className={`text-[10px] font-semibold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPos ? "+" : ""}{item.change.toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeSideTab === "DEPTH" && (
        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
          <div className="text-[10px] text-slate-400 font-bold uppercase">
            5-LEVEL L2 DEPTH ({selectedSymbol})
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="text-emerald-400 font-bold border-b border-slate-800 pb-1 mb-1">BID (BUY)</div>
              {(marketDepth?.bids || [
                { price: 24144.0, orders: 12, qty: 1850 },
                { price: 24143.5, orders: 8, qty: 1200 },
                { price: 24143.0, orders: 15, qty: 3400 },
                { price: 24142.5, orders: 4, qty: 900 },
                { price: 24142.0, orders: 22, qty: 5600 },
              ]).map((b, i) => (
                <div key={i} className="flex justify-between py-0.5 text-slate-300">
                  <span>{b.price.toFixed(1)}</span>
                  <span className="text-emerald-400">{b.qty}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-rose-400 font-bold border-b border-slate-800 pb-1 mb-1">ASK (SELL)</div>
              {(marketDepth?.asks || [
                { price: 24144.5, orders: 18, qty: 2100 },
                { price: 24145.0, orders: 11, qty: 1650 },
                { price: 24145.5, orders: 9, qty: 1400 },
                { price: 24146.0, orders: 25, qty: 4200 },
                { price: 24146.5, orders: 30, qty: 6100 },
              ]).map((a, i) => (
                <div key={i} className="flex justify-between py-0.5 text-slate-300">
                  <span>{a.price.toFixed(1)}</span>
                  <span className="text-rose-400">{a.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSideTab === "GNN" && (
        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
          <div className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> GNN CONTAGION SIGNALS
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">System Contagion:</span>
              <span className="text-amber-400 font-bold">
                {gnnSignal?.systemic_contagion || 0.38} ({gnnSignal?.contagion_status || "MODERATE"})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Gamma Squeeze Prob:</span>
              <span className="text-emerald-400 font-bold">
                {((gnnSignal?.gamma_squeeze_prob || 0.14) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Predicted IV Drift:</span>
              <span className="text-cyan-400 font-bold">
                +{gnnSignal?.predicted_iv_drift || 0.45} vol pts
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] text-slate-500 mb-1">High Contagion Assets:</div>
              <div className="flex flex-wrap gap-1">
                {(gnnSignal?.high_risk_nodes || ["TATAMOTORS", "TATASTEEL"]).map((sym) => (
                  <span key={sym} className="px-1.5 py-0.5 bg-rose-950/50 border border-rose-800/50 text-rose-400 rounded text-[10px] font-bold">
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
