"use client";

import React, { useEffect, useState } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { ShieldCheck, ShieldAlert, TrendingUp, TrendingDown, Clock, Activity, Zap, Search } from "lucide-react";
import { LiveTickPrice } from "./common/LiveTickPrice";
import { CommandPalette } from "./CommandPalette";

export const Header: React.FC = () => {
  const { 
    portfolio, 
    gnnRisk, 
    connectionStatus, 
    marketStatus, 
    fetchMarketData, 
    initLiveFeed,
    hydrateFromStorage,
    fetchSavedPositionsFromBackend
  } = usePortfolioStore();
  const [istTime, setIstTime] = useState<string>("");
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Client hydration from localStorage & backend sync
  useEffect(() => {
    hydrateFromStorage();
    fetchSavedPositionsFromBackend();
  }, [hydrateFromStorage, fetchSavedPositionsFromBackend]);

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

  const isPositiveDaily = portfolio.daily_pnl >= 0;
  const isMarketOpen = marketStatus ? marketStatus.is_market_open : false;
  const isPreOpen = marketStatus?.status === "PRE_OPEN";

  return (
    <>
      <header className="sticky top-0 z-40 w-full h-14 bg-[#0C100F] border-b border-white/[0.065] px-4 md:px-6 flex items-center justify-between text-[#F2F0E8] select-none transition-colors duration-200">
        {/* Left: Brand Identity & Live Session Module */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {/* Brand Lockup - Institutional Luxury */}
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-md bg-[#111614] border border-white/[0.08] flex items-center justify-center font-bold text-xs tracking-wider transition-colors duration-150">
              <span className="text-[#159570]">Q</span>
              <span className="text-[#C8A96B]">C</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-sm font-semibold tracking-tight text-[#F2F0E8] font-sans">
                QUANTCOPILOT
              </span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[#111614] text-[#C8A96B] border border-white/[0.065] uppercase">
                AI
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-white/[0.065] hidden sm:block" />

          {/* Live Indian Stock Market Session Badge - Restrained Institutional */}
          <div className="hidden sm:flex items-center space-x-2.5 bg-[#111614] border border-white/[0.065] rounded-md px-2.5 py-1 text-xs transition-all duration-200">
            <span className="flex h-1.5 w-1.5 relative">
              {isMarketOpen ? (
                <span className="inline-flex rounded-full h-1.5 w-1.5 bg-[#159570]" />
              ) : isPreOpen ? (
                <span className="inline-flex rounded-full h-1.5 w-1.5 bg-[#B89655]" />
              ) : (
                <span className="inline-flex rounded-full h-1.5 w-1.5 bg-[#68716C]" />
              )}
            </span>

            <span className="font-sans text-[11px] font-medium text-[#A7ADA8] tracking-wide">
              {isMarketOpen
                ? "NSE ● MARKET OPEN"
                : isPreOpen
                ? "NSE ● PRE-OPEN"
                : "NSE ● MARKET CLOSED"}
            </span>

            <span className="text-[#68716C]/60">|</span>

            <div className="flex items-center space-x-1.5 text-[#68716C] font-mono text-[11px] tabular-nums">
              <Clock className="h-3 w-3 text-[#68716C]" />
              <span className="text-[#A7ADA8]">{istTime || "IST"}</span>
            </div>
          </div>

          {/* Quick Command Palette Button */}
          <button
            onClick={() => setIsPaletteOpen(true)}
            className="hidden lg:flex items-center space-x-2 bg-[#111614] hover:bg-[#161C19] border border-white/[0.065] px-2.5 py-1 rounded-md text-xs text-[#A7ADA8] hover:text-[#F2F0E8] transition-colors duration-150 active:translate-y-[0.5px]"
            title="Open Command Palette (Ctrl+K)"
          >
            <Search className="h-3 w-3 text-[#68716C]" />
            <span className="text-[11px] font-sans">Search</span>
            <kbd className="px-1.5 py-0.2 text-[9px] font-mono text-[#A7ADA8] bg-[#161C19] border border-white/[0.065] rounded">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Telemetry & Dynamic Portfolio Summary Bar */}
        <div className="flex items-center space-x-4 md:space-x-6 text-xs">
          {/* Dynamic Portfolio Value - Visually Dominant Warm Ivory */}
          <div className="flex flex-col items-end" suppressHydrationWarning>
            <span className="text-[9px] font-sans text-[#68716C] uppercase tracking-wider font-medium">
              PORTFOLIO VALUE
            </span>
            <LiveTickPrice
              value={portfolio.total_equity}
              prefix="Rs "
              className="font-mono font-medium text-xs md:text-sm text-[#F2F0E8] tabular-nums"
            />
          </div>

          <div className="h-6 w-[1px] bg-white/[0.065] hidden md:block" />

          {/* Dynamic Day P&L - Muted Refined Colors */}
          <div className="hidden md:flex flex-col items-end" suppressHydrationWarning>
            <span className="text-[9px] font-sans text-[#68716C] uppercase tracking-wider font-medium">
              DAY P&amp;L
            </span>
            <div className="flex items-center space-x-1 font-mono text-xs font-medium tabular-nums">
              {isPositiveDaily ? (
                <TrendingUp className="h-3 w-3 inline text-[#42A77A] shrink-0" />
              ) : (
                <TrendingDown className="h-3 w-3 inline text-[#C45D62] shrink-0" />
              )}
              <LiveTickPrice
                value={portfolio.daily_pnl_percentage}
                prefix={isPositiveDaily ? "+" : ""}
                suffix="%"
                colorize={true}
                className="font-mono text-xs font-medium tabular-nums"
              />
              <span className="text-[#68716C] text-[11px]">
                (Rs {Math.abs(portfolio.daily_pnl).toLocaleString("en-IN")})
              </span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/[0.065] hidden lg:block" />

          {/* Dynamic GNN Contagion Risk Score */}
          <div className="hidden lg:flex items-center space-x-2 bg-[#111614] border border-white/[0.065] rounded-md px-2.5 py-1 transition-colors duration-200">
            {gnnRisk.overall_system_risk < 0.4 ? (
              <ShieldCheck className="h-3.5 w-3.5 text-[#159570] shrink-0 transition-colors duration-200" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5 text-[#B89655] shrink-0 transition-colors duration-200" />
            )}
            <div className="flex flex-col">
              <span className="text-[9px] font-sans text-[#68716C] uppercase tracking-wider">
                SYSTEM RISK
              </span>
              <div className="flex items-center space-x-1">
                <LiveTickPrice
                  value={gnnRisk.overall_system_risk}
                  className="font-mono text-[11px] font-medium text-[#F2F0E8] tabular-nums"
                />
                <span className="font-mono text-[10px] text-[#68716C]">Idx</span>
              </div>
            </div>
          </div>

          {/* Feed & WebSocket Status Pill */}
          <div className="flex items-center space-x-1.5 bg-[#111614] border border-white/[0.065] rounded-md px-2.5 py-1 text-[11px] font-mono transition-all duration-200">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === "CONNECTED" ? "bg-[#159570]" : "bg-[#B89655]"
              }`}
            />
            <span className="text-[#A7ADA8] hidden sm:inline transition-colors duration-200">
              {connectionStatus === "CONNECTED" ? "LIVE FEED" : connectionStatus}
            </span>
          </div>
        </div>
      </header>

      {/* Global Command Palette Dialog */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
};

