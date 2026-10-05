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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm w-full max-w-lg shadow-2xl p-6 space-y-5 text-[#F2F0E8] font-sans animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-white/[0.065] pb-4">
          <h3 className="text-sm font-semibold font-sans uppercase tracking-wider text-[#F2F0E8] flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#159570]" />
            <span>Add Position to Portfolio</span>
          </h3>
          <button 
            onClick={() => setIsAddPositionOpen(false)} 
            className="p-1.5 bg-[#0C100F] border border-white/[0.065] rounded-sm text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#161C19] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Ticker Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
            Select NSE / BSE Ticker
          </label>
          {symbol ? (
            <div className="flex items-center justify-between bg-[#0C100F] border border-white/[0.065] rounded-sm p-3">
              <div>
                <span className="font-semibold font-mono text-[#F2F0E8] text-sm">{symbol}</span>
                {selectedTicker?.company_name && (
                  <span className="text-xs text-[#A7ADA8] ml-2 font-sans">{selectedTicker.company_name}</span>
                )}
              </div>
              <button 
                onClick={() => setSymbol("")} 
                className="text-xs font-sans text-[#159570] hover:underline font-medium"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#68716C]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search RELIANCE, TCS, HDFCBANK..."
                  className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm pl-9 pr-3 py-2 text-xs text-[#F2F0E8] font-mono placeholder:text-[#68716C] focus:outline-none focus:border-[#159570] uppercase transition-colors"
                  autoFocus
                />
              </div>
              {searchQuery && (
                <div className="max-h-40 overflow-y-auto border border-white/[0.065] rounded-sm bg-[#0C100F] divide-y divide-white/[0.04]">
                  {tickerList.slice(0, 10).map((t) => (
                    <button
                      key={t.symbol}
                      onClick={() => selectTicker(t.symbol)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono hover:bg-[#161C19] transition-colors"
                    >
                      <div>
                        <span className="text-[#F2F0E8] font-semibold">{t.symbol}</span>
                        <span className="text-[#A7ADA8] ml-2 font-sans text-[11px]">{t.company_name}</span>
                      </div>
                      <span className="text-[#A7ADA8] tabular-nums">₹{t.price.toLocaleString('en-IN')}</span>
                    </button>
                  ))}
                  {tickerList.length === 0 && (
                    <div className="px-3 py-4 text-xs text-[#68716C] font-sans text-center">No matching tickers found</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Position Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-2 text-xs font-mono tabular-nums text-[#F2F0E8] placeholder:text-[#68716C] focus:outline-none focus:border-[#159570]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
              Entry Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="2985.40"
              className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-2 text-xs font-mono tabular-nums text-[#F2F0E8] placeholder:text-[#68716C] focus:outline-none focus:border-[#159570]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
              Side
            </label>
            <div className="grid grid-cols-2 gap-1 bg-[#0C100F] p-1 rounded-sm border border-white/[0.065]">
              <button
                type="button"
                onClick={() => setSide("LONG")}
                className={`py-1.5 rounded-sm text-xs font-mono font-medium transition-colors ${
                  side === "LONG" 
                    ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30" 
                    : "text-[#A7ADA8] hover:text-[#F2F0E8]"
                }`}
              >
                LONG
              </button>
              <button
                type="button"
                onClick={() => setSide("SHORT")}
                className={`py-1.5 rounded-sm text-xs font-mono font-medium transition-colors ${
                  side === "SHORT" 
                    ? "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25" 
                    : "text-[#A7ADA8] hover:text-[#F2F0E8]"
                }`}
              >
                SHORT
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
              Leverage
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-2 text-xs font-mono tabular-nums text-[#F2F0E8] placeholder:text-[#68716C] focus:outline-none focus:border-[#159570]"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!symbol || !quantity || !entryPrice}
          className="w-full py-2.5 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] rounded-sm font-medium font-sans text-xs uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          Add Position to Portfolio
        </button>
      </div>
    </div>
  );
};
