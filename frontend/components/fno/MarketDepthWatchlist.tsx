"use client";

import React, { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { MarketDepth, GNNContagionSignal } from "../../types";
import { usePortfolioStore } from "../../store/usePortfolioStore";

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
  const { indianTickers } = usePortfolioStore();
  const [activeSideTab, setActiveSideTab] = useState<"WATCHLIST" | "DEPTH" | "GNN">("WATCHLIST");
  const [searchQuery, setSearchQuery] = useState("");

  const watchlistUniverse = [
    { symbol: "NIFTY 50", defaultPrice: 22759.35, defaultChange: 0.22, isIndex: true },
    { symbol: "BANKNIFTY", defaultPrice: 54758.55, defaultChange: 0.35, isIndex: true },
    { symbol: "SENSEX", defaultPrice: 72804.50, defaultChange: 0.18, isIndex: true },
    { symbol: "RELIANCE", defaultPrice: 1192.80, defaultChange: 0.85, isIndex: false },
    { symbol: "TCS", defaultPrice: 2095.80, defaultChange: -0.25, isIndex: false },
    { symbol: "HDFCBANK", defaultPrice: 713.80, defaultChange: 0.65, isIndex: false },
    { symbol: "INFY", defaultPrice: 1845.60, defaultChange: 0.92, isIndex: false },
    { symbol: "TATAMOTORS", defaultPrice: 980.50, defaultChange: -0.80, isIndex: false },
    { symbol: "SBIN", defaultPrice: 815.20, defaultChange: 0.45, isIndex: false },
    { symbol: "TATASTEEL", defaultPrice: 172.50, defaultChange: -0.65, isIndex: false },
    { symbol: "BEL", defaultPrice: 385.00, defaultChange: 0.11, isIndex: false }
  ].map((item) => {
    const live = indianTickers[item.symbol] || indianTickers[item.symbol.replace("-EQ", "")];
    return {
      symbol: item.symbol,
      price: live ? live.price : item.defaultPrice,
      change: live ? live.change_24h : item.defaultChange,
      isIndex: item.isIndex
    };
  });

  const filteredWatchlist = watchlistUniverse.filter((item) =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-[#0C100F] flex flex-col text-xs font-mono select-none shrink-0 border-l border-white/[0.065]">
      <div className="flex border-b border-white/[0.065] shrink-0">
        {(["WATCHLIST", "DEPTH", "GNN"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSideTab(tab)}
            className={`flex-1 py-2 font-medium text-[10px] transition-colors ${
              activeSideTab === tab ? "bg-[#111614] text-[#F2F0E8] border-b-2 border-[#159570]" : "text-[#68716C] hover:text-[#A7ADA8]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeSideTab === "WATCHLIST" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-white/[0.065] shrink-0">
            <div className="flex items-center bg-[#111614] rounded-sm px-2 py-1 border border-white/[0.065]">
              <Search className="h-3.5 w-3.5 text-[#68716C] mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Stocks, F&O..."
                className="bg-transparent text-[#F2F0E8] placeholder-[#68716C] text-xs outline-none w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredWatchlist.map((item) => {
              const isPos = item.change >= 0;
              const isSelected = selectedSymbol === item.symbol;
              return (
                <div
                  key={item.symbol}
                  onClick={() => onSelectSymbol(item.symbol)}
                  className={`flex items-center justify-between p-2.5 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#161C19] border-l-2 border-[#159570]" : "hover:bg-[#161C19]"
                  }`}
                >
                  <div>
                    <div className="font-semibold text-[#F2F0E8]">{item.symbol}</div>
                    <div className="text-[10px] text-[#68716C]">{item.isIndex ? "NSE Index" : "NSE Equity"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[#F2F0E8] tabular-nums">₹{item.price.toFixed(2)}</div>
                    <div className={`text-[10px] font-medium tabular-nums ${isPos ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
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
          <div className="text-[10px] text-[#A7ADA8] font-semibold uppercase">
            5-LEVEL L2 DEPTH ({selectedSymbol})
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <div className="text-[#42A77A] font-semibold border-b border-white/[0.065] pb-1 mb-1">BID (BUY)</div>
              {(marketDepth?.bids || [
                { price: 24144.0, orders: 12, qty: 1850 },
                { price: 24143.5, orders: 8, qty: 1200 },
                { price: 24143.0, orders: 15, qty: 3400 },
                { price: 24142.5, orders: 4, qty: 900 },
                { price: 24142.0, orders: 22, qty: 5600 },
              ]).map((b, i) => (
                <div key={i} className="flex justify-between py-0.5 text-[#A7ADA8] tabular-nums">
                  <span>{b.price.toFixed(1)}</span>
                  <span className="text-[#42A77A] font-medium">{b.qty}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-[#C45D62] font-semibold border-b border-white/[0.065] pb-1 mb-1">ASK (SELL)</div>
              {(marketDepth?.asks || [
                { price: 24144.5, orders: 18, qty: 2100 },
                { price: 24145.0, orders: 11, qty: 1650 },
                { price: 24145.5, orders: 9, qty: 1400 },
                { price: 24146.0, orders: 25, qty: 4200 },
                { price: 24146.5, orders: 30, qty: 6100 },
              ]).map((a, i) => (
                <div key={i} className="flex justify-between py-0.5 text-[#A7ADA8] tabular-nums">
                  <span>{a.price.toFixed(1)}</span>
                  <span className="text-[#C45D62] font-medium">{a.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSideTab === "GNN" && (
        <div className="p-3 space-y-3 flex-1 overflow-y-auto">
          <div className="text-[10px] text-[#159570] font-semibold uppercase flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> GNN CONTAGION SIGNALS
          </div>
          <div className="bg-[#111614] p-2.5 rounded-sm border border-white/[0.065] space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#68716C]">System Contagion:</span>
              <span className="text-[#B89655] font-semibold">
                {gnnSignal?.systemic_contagion || 0.38} ({gnnSignal?.contagion_status || "MODERATE"})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#68716C]">Gamma Squeeze Prob:</span>
              <span className="text-[#42A77A] font-semibold">
                {((gnnSignal?.gamma_squeeze_prob || 0.14) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#68716C]">Predicted IV Drift:</span>
              <span className="text-[#F2F0E8] font-semibold">
                +{gnnSignal?.predicted_iv_drift || 0.45} vol pts
              </span>
            </div>
            <div className="pt-2 border-t border-white/[0.065]">
              <div className="text-[10px] text-[#68716C] mb-1">High Contagion Assets:</div>
              <div className="flex flex-wrap gap-1">
                {(gnnSignal?.high_risk_nodes || ["TATAMOTORS", "TATASTEEL"]).map((sym) => (
                  <span key={sym} className="px-1.5 py-0.5 bg-[#C45D62]/10 border border-[#C45D62]/25 text-[#C45D62] rounded-sm text-[10px] font-semibold">
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
