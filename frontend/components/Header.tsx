"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Search, 
  User, 
  RefreshCw,
  Radio,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";
import { CustomerLoginModal } from "./CustomerLoginModal";
import { LiveTickPrice } from "./common/LiveTickPrice";

interface BenchmarkDef {
  key: string;
  symbol: string;
  defaultPrice: number;
  defaultPts: number;
  defaultPct: number;
}

const BENCHMARKS: BenchmarkDef[] = [
  { key: "NIFTY 50", symbol: "NIFTY 50", defaultPrice: 24144.10, defaultPts: -74.95, defaultPct: -0.31 },
  { key: "BANKNIFTY", symbol: "BANKNIFTY", defaultPrice: 50820.25, defaultPts: 443.35, defaultPct: 0.88 },
  { key: "FINNIFTY", symbol: "FINNIFTY", defaultPrice: 23450.10, defaultPts: 85.20, defaultPct: 0.36 },
  { key: "SENSEX", symbol: "SENSEX", defaultPrice: 77204.66, defaultPts: -164.45, defaultPct: -0.21 },
  { key: "INDIA VIX", symbol: "INDIA VIX", defaultPrice: 12.85, defaultPts: -0.42, defaultPct: -3.16 }
];

export const Header: React.FC = () => {
  const { 
    gnnRisk, 
    connectionStatus, 
    marketStatus, 
    indianTickers,
    fetchMarketData, 
    initLiveFeed,
    hydrateFromStorage,
    fetchSavedPositionsFromBackend,
    fetchGnnRiskMetrics,
    currentCustomer,
    setIsCustomerLoginModalOpen,
    refreshCustomerPortfolioLive,
    isLiveSyncing
  } = usePortfolioStore();

  const [istTime, setIstTime] = useState<string>("");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Client hydration from localStorage, backend sync & daily GNN index fetch
  useEffect(() => {
    hydrateFromStorage();
    fetchSavedPositionsFromBackend();
    fetchGnnRiskMetrics();
  }, [hydrateFromStorage, fetchSavedPositionsFromBackend, fetchGnnRiskMetrics]);

  // Global Ctrl+K / Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const isMarketOpen = marketStatus ? marketStatus.is_market_open : false;
  const isPreOpen = marketStatus?.status === "PRE_OPEN";

  // Real-time Marquee data enriched from store
  const marqueeItems = useMemo(() => {
    return BENCHMARKS.map((item) => {
      const live = indianTickers[item.key] || indianTickers[item.symbol];
      const price = live?.price ?? item.defaultPrice;
      const pts = live?.change_pts ?? item.defaultPts;
      const pct = live?.change_24h ?? item.defaultPct;
      return {
        symbol: item.symbol,
        price,
        pts,
        pct,
        isPositive: pts >= 0
      };
    });
  }, [indianTickers]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-13 md:h-14 bg-[#0C100F] border-b border-white/[0.065] px-3 md:px-5 flex items-center justify-between text-[#F2F0E8] select-none specular-border transition-colors duration-200">
        
        {/* ================================================================= */}
        {/* LEFT: BRAND IDENTITY, WS TELEMETRY & MARKET BEACON                */}
        {/* ================================================================= */}
        <div className="flex items-center space-x-2.5 md:space-x-3 shrink-0">
          {/* Institutional Brand Lockup */}
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-[3px] bg-[#111614] border border-white/[0.09] flex items-center justify-center font-bold text-xs tracking-wider shadow-inner">
              <span className="text-[#159570]">Q</span>
              <span className="text-[#C8A96B]">C</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-[13px] font-semibold tracking-tight text-[#F2F0E8] font-sans">
                QUANTCOPILOT
              </span>
              <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] bg-[#C8A96B]/12 text-[#C8A96B] border border-[#C8A96B]/25 uppercase tracking-wider">
                AI
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-white/[0.065] hidden sm:block" />

          {/* Exchange Connection Pill: NSE Live 12ms WebSocket */}
          <div className="hidden sm:flex items-center space-x-1.5 bg-[#111614] border border-white/[0.065] rounded-[3px] px-2 py-0.5 text-[10px] font-mono text-[#A7ADA8]">
            <span className="relative flex h-1.5 w-1.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                connectionStatus === "CONNECTED" ? "bg-[#159570]" : "bg-[#B89655]"
              }`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                connectionStatus === "CONNECTED" ? "bg-[#159570]" : "bg-[#B89655]"
              }`} />
            </span>
            <span className="text-[#F2F0E8] font-medium">NSE Live</span>
            <span className="text-[#68716C]">12ms WS</span>
          </div>

          {/* Market Status Beacon */}
          <div className="hidden xl:flex items-center space-x-1.5 bg-[#111614] border border-white/[0.065] rounded-[3px] px-2 py-0.5 text-[10px] font-sans">
            <span className={`h-1.5 w-1.5 rounded-full ${
              isMarketOpen ? "bg-[#42A77A]" : isPreOpen ? "bg-[#B89655]" : "bg-[#68716C]"
            }`} />
            <span className="text-[#A7ADA8] font-medium uppercase tracking-wider text-[10px]">
              {isMarketOpen ? "OPEN" : isPreOpen ? "PRE-OPEN" : "CLOSED"}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CENTER: HIGH-DENSITY LIVE MARQUEE BENCHMARK TICKER                */}
        {/* ================================================================= */}
        <div className="hidden lg:flex items-center overflow-x-auto space-x-4 px-3 py-1 bg-[#080A09]/70 border border-white/[0.04] rounded-[3px] mx-2 text-[11px] font-mono select-none shrink">
          {marqueeItems.map((idx) => {
            return (
              <div key={idx.symbol} className="flex items-center space-x-1.5 shrink-0 whitespace-nowrap">
                <span className="font-medium text-[#68716C] text-[10px]">{idx.symbol}</span>
                <span className="font-semibold text-[#F2F0E8] tabular-nums">
                  <LiveTickPrice
                    value={idx.price}
                    formatter={(v) => `₹${Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                </span>
                <span className={`flex items-center text-[10px] font-semibold tabular-nums px-1 py-0.2 rounded-[2px] ${
                  idx.isPositive 
                    ? "text-[#42A77A] bg-[#42A77A]/12" 
                    : "text-[#C45D62] bg-[#C45D62]/12"
                }`}>
                  {idx.isPositive ? <ArrowUpRight className="h-2.5 w-2.5 inline" /> : <ArrowDownRight className="h-2.5 w-2.5 inline" />}
                  {idx.isPositive ? "+" : ""}{idx.pts.toFixed(1)} ({idx.isPositive ? "+" : ""}{idx.pct.toFixed(2)}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* RIGHT: GNN RISK SCORE, IST CLOCK, CMD+K, INSTITUTIONAL ACCOUNT     */}
        {/* ================================================================= */}
        <div className="flex items-center space-x-2 md:space-x-2.5 text-xs shrink-0">
          
          {/* Real-time Systemic GNN Contagion Risk Score Meter */}
          <div 
            className="flex items-center space-x-2 bg-[#111614] border border-white/[0.065] rounded-[3px] px-2.5 py-1 text-xs"
            title={`PyTorch GNN Contagion Risk Index computed daily from asset returns (Last updated: ${gnnRisk.daily_date || 'Daily EOD'})`}
          >
            {gnnRisk.overall_system_risk < 0.35 ? (
              <ShieldCheck className="h-3.5 w-3.5 text-[#159570] shrink-0" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-[#C45D62] shrink-0" />
            )}
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono text-[#68716C] uppercase font-medium">GNN RISK</span>
              <span className="font-mono text-xs font-semibold text-[#C8A96B] tabular-nums">
                {Number(gnnRisk.overall_system_risk || 0).toFixed(2)}
              </span>
              <span className={`text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] ${
                gnnRisk.overall_system_risk < 0.35 
                  ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30" 
                  : gnnRisk.overall_system_risk < 0.55 
                  ? "bg-[#B89655]/15 text-[#B89655] border border-[#B89655]/30" 
                  : "bg-[#C45D62]/15 text-[#C45D62] border border-[#C45D62]/30"
              }`}>
                {gnnRisk.contagion_status || (gnnRisk.overall_system_risk < 0.35 ? "LOW REGIME" : "ELEVATED")}
              </span>
            </div>
          </div>

          {/* IST Atomic Clock */}
          <div className="hidden sm:flex items-center space-x-1 bg-[#111614] border border-white/[0.065] rounded-[3px] px-2 py-1 text-[11px] font-mono text-[#A7ADA8] tabular-nums">
            <Clock className="h-3 w-3 text-[#68716C]" />
            <span>{istTime || "IST"}</span>
          </div>

          {/* Global Cmd+K Search Trigger */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="flex items-center space-x-1.5 bg-[#111614] hover:bg-[#1B2420] border border-white/[0.065] hover:border-white/[0.12] px-2 py-1 rounded-[3px] text-xs text-[#A7ADA8] hover:text-[#F2F0E8] transition-all"
            title="Open Command Palette (Cmd+K / Ctrl+K)"
          >
            <Search className="h-3 w-3 text-[#68716C]" />
            <kbd className="px-1 py-0.2 text-[9px] font-mono text-[#A7ADA8] bg-[#161C19] border border-white/[0.065] rounded-[2px]">
              ⌘K
            </kbd>
          </button>

          {/* Institutional Account Switcher */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsCustomerLoginModalOpen(true)}
              className="flex items-center space-x-2 bg-[#111614] hover:bg-[#1B2420] border border-white/[0.08] hover:border-[#159570]/50 rounded-[3px] px-2.5 py-1 text-xs transition-all"
              title="Customer Account & Portfolio Database"
            >
              <div className="h-5 w-5 rounded-full bg-[#159570]/20 border border-[#159570]/40 flex items-center justify-center text-[10px] font-bold text-[#159570]">
                {currentCustomer ? currentCustomer.name.charAt(0) : <User className="h-3 w-3" />}
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center space-x-1">
                  <span className="font-medium text-[11px] text-[#F2F0E8] truncate max-w-[90px] sm:max-w-[120px]">
                    {currentCustomer ? currentCustomer.name : "Sahitya Sharma"}
                  </span>
                  <span className="text-[8px] font-mono px-1 py-0.1 rounded-[2px] bg-[#C8A96B]/15 text-[#C8A96B] border border-[#C8A96B]/30">
                    {currentCustomer ? (currentCustomer.account_tier === "PRO_QUANT" ? "PRO" : currentCustomer.account_tier.split("_")[0]) : "PRO"}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#68716C] flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-[#159570]" />
                  <span>YF MTM</span>
                </span>
              </div>
            </button>

            {currentCustomer && (
              <button
                onClick={() => refreshCustomerPortfolioLive()}
                disabled={isLiveSyncing}
                className="p-1.5 bg-[#111614] hover:bg-[#1B2420] border border-white/[0.065] text-[#A7ADA8] hover:text-[#159570] rounded-[3px] transition-colors"
                title="Fetch latest live market quotes from Yahoo Finance"
              >
                <RefreshCw className={`h-3 w-3 ${isLiveSyncing ? "animate-spin text-[#159570]" : ""}`} />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Global Command Palette Dialog */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      {/* Customer Portfolio Login & Account Switcher Modal */}
      <CustomerLoginModal />
    </>
  );
};
