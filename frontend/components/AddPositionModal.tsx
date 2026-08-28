"use client";

import React, { useState } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { X, Plus, Search } from "lucide-react";

export const AddPositionModal: React.FC = () => {
  const { isAddPositionOpen, setIsAddPositionOpen, addPosition, indianTickers } = usePortfolioStore();
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isAddPositionOpen) return null;

  const seen = new Set<string>();
  const tickerList = Object.values(indianTickers).filter(
    (t) => {
      const key = t.token || t.symbol;
      if (seen.has(key)) return false;
      seen.add(key);
      return t.type === "EQUITY" && (
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.company_name && t.company_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  );

  const selectTicker = (sym: string) => {
    setSymbol(sym);
    const t = indianTickers[sym];
    if (t) setEntryPrice(t.price.toFixed(2));
    setSearchQuery("");
  };

  const handleSubmit = () => {
    if (!symbol || !quantity || !entryPrice) return;
    addPosition({
      symbol,
      quantity: parseFloat(quantity),
      entry_price: parseFloat(entryPrice),
      side,
      leverage: parseFloat(leverage) || 1
    });
    setSymbol("");
    setQuantity("");
    setEntryPrice("");
    setSide("LONG");
    setLeverage("1");
    setIsAddPositionOpen(false);
  };

  const selectedTicker = indianTickers[symbol];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-400" />
            ADD POSITION TO PORTFOLIO
          </h3>
          <button onClick={() => setIsAddPositionOpen(false)} className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Ticker Selection */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-400 uppercase">Select NSE/BSE Ticker</label>
          {symbol ? (
            <div className="flex items-center justify-between bg-slate-950 border border-emerald-800/50 rounded-lg p-3">
              <div>
                <span className="font-bold font-mono text-emerald-400">{symbol}</span>
                {selectedTicker?.company_name && (
                  <span className="text-xs text-slate-400 ml-2 font-sans">{selectedTicker.company_name}</span>
                )}
              </div>
              <button onClick={() => setSymbol("")} className="text-slate-500 hover:text-slate-200 text-xs font-mono">Change</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search RELIANCE, TCS, HDFCBANK..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              {searchQuery && (
                <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950">
                  {tickerList.slice(0, 10).map((t) => (
                    <button
                      key={t.symbol}
                      onClick={() => selectTicker(t.symbol)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono hover:bg-slate-800 transition-colors"
                    >
                      <div>
                        <span className="text-slate-100 font-bold">{t.symbol}</span>
                        <span className="text-slate-400 ml-2 font-sans text-[11px]">{t.company_name}</span>
                      </div>
                      <span className="text-slate-300">₹{t.price.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                  {tickerList.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-500 font-mono text-center">No matching tickers found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Position Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Entry Price (₹)</label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="2985.40"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Side</label>
            <div className="flex gap-2">
              <button
                onClick={() => setSide("LONG")}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                  side === "LONG" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                LONG
              </button>
              <button
                onClick={() => setSide("SHORT")}
                className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                  side === "SHORT" ? "bg-rose-500 text-slate-950" : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400 uppercase">Leverage</label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!symbol || !quantity || !entryPrice}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 rounded-xl font-bold font-mono text-sm hover:from-emerald-400 hover:to-cyan-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
        >
          ADD POSITION TO PORTFOLIO
        </button>
      </div>
    </div>
  );
};
