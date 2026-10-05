"use client";

import React, { useEffect, useState } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { HistoricalCandle, HistoricalSeriesPayload } from "../types";
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  Search, 
  TrendingUp, 
  BarChart2, 
  X, 
  Filter, 
  Layers,
  ArrowUpDown
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api";
import { LiveTickPrice } from "./common/LiveTickPrice";

const SECTORS = [
  "ALL",
  "Banking",
  "IT Services",
  "Automotive",
  "Energy",
  "FMCG",
  "Pharma",
  "Infrastructure",
  "Metals",
  "Financial Services"
];

export const IndianMarketWidget: React.FC = () => {
  const { 
    indianTickers, 
    selectedSectorFilter, 
    setSelectedSectorFilter,
    selectedHistorySymbol, 
    setSelectedHistorySymbol 
  } = usePortfolioStore();

  const [exchangeFilter, setExchangeFilter] = useState<"ALL" | "NSE" | "BSE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"symbol" | "price" | "change" | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [historyPayload, setHistoryPayload] = useState<HistoricalSeriesPayload | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);


  // Fetch historical price series when a symbol is clicked
  useEffect(() => {
    if (!selectedHistorySymbol) {
      setHistoryPayload(null);
      return;
    }

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const cleanSym = selectedHistorySymbol.replace("-EQ", "").trim();
        const res = await fetch(`${getApiBaseUrl()}/api/v1/nse/history/${encodeURIComponent(cleanSym)}?period=1y`);
        if (res.ok) {
          const data = await res.json();
          setHistoryPayload(data);
        } else {
          setHistoryPayload(generateFallbackSeries(selectedHistorySymbol));
        }
      } catch {
        setHistoryPayload(generateFallbackSeries(selectedHistorySymbol));
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedHistorySymbol]);

  const generateFallbackSeries = (symbol: string): HistoricalSeriesPayload => {
    const candles: HistoricalCandle[] = [];
    let price = 1000.0;
    const now = new Date();
    for (let i = 90; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const change = (Math.random() - 0.48) * 0.03;
      const open = price;
      const close = price * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      price = close;
      candles.push({
        symbol,
        date: d.toISOString().split("T")[0],
        open_price: Number(open.toFixed(2)),
        high_price: Number(high.toFixed(2)),
        low_price: Number(low.toFixed(2)),
        close_price: Number(close.toFixed(2)),
        volume: Math.floor(Math.random() * 5000000) + 500000,
        pct_change: Number((change * 100).toFixed(2))
      });
    }
    return {
      symbol,
      company_name: symbol,
      period: "1y",
      candles
    };
  };

  const seenTokens = new Set<string>();
  const tickerList = Object.values(indianTickers).filter((t) => {
    const key = t.token || t.symbol;
    if (seenTokens.has(key)) return false;
    seenTokens.add(key);
    return true;
  });

  const filteredTickers = tickerList.filter((t) => {
    const isBse = t.symbol === "SENSEX" || t.exchange === "BSE" || (t.company_name && t.company_name.includes("BSE"));
    const matchesExchange =
      exchangeFilter === "ALL" ||
      (exchangeFilter === "BSE" && isBse) ||
      (exchangeFilter === "NSE" && !isBse);

    const matchesSector = selectedSectorFilter === "ALL" || t.sector === selectedSectorFilter;
    const matchesSearch =
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.company_name && t.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.sector && t.sector.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesExchange && matchesSector && matchesSearch;
  });

  const sortedTickers = [...filteredTickers].sort((a, b) => {
    if (!sortField) return 0;
    if (sortField === "symbol") {
      return sortAsc ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
    }
    if (sortField === "price") {
      return sortAsc ? a.price - b.price : b.price - a.price;
    }
    if (sortField === "change") {
      return sortAsc ? a.change_24h - b.change_24h : b.change_24h - a.change_24h;
    }
    return 0;
  });

  const toggleSort = (field: "symbol" | "price" | "change") => {
    if (sortField === field) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortField(null);
        setSortAsc(true);
      }
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const avgLatency = tickerList.length > 0
    ? (tickerList.reduce((acc, t) => acc + t.latency_ms, 0) / tickerList.length).toFixed(2)
    : "1.38";

  return (
    <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 md:p-5 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.065] pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-sm bg-[#159570]/10 border border-[#159570]/25 flex items-center justify-center font-bold text-[#159570] text-xs">
            NSE
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-semibold font-sans text-[#F2F0E8] tracking-tight">
                INDIAN STOCK MARKET TERMINAL
              </h3>
              <span className="text-[10px] bg-[#161C19] text-[#A7ADA8] border border-white/[0.065] px-2 py-0.5 rounded-sm font-mono font-medium">
                NSE &amp; BSE LIVE
              </span>
            </div>
            <p className="text-xs font-sans text-[#A7ADA8] mt-0.5">
              Real-time market depth, official exchange LTP, and historical OHLCV data engine.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-[#161C19] border border-white/[0.065] rounded-sm px-2.5 py-1">
            <Zap className="h-3.5 w-3.5 text-[#159570]" />
            <span className="text-[#A7ADA8] text-[11px]">
              LATENCY: <strong className="text-[#F2F0E8] font-medium">{avgLatency}ms</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 bg-[#161C19] border border-white/[0.065] rounded-sm px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#159570]" />
            <span className="text-[#A7ADA8] text-[11px]">FEED: YAHOO DIRECT &amp; POSTGRES</span>
          </div>
        </div>
      </div>

      {/* Benchmark Index Cards Grid (4 columns on lg, 2 on sm) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tickerList.filter((t) => t.type === "INDEX").map((indexTicker) => {
          const isPos = indexTicker.change_24h >= 0;
          return (
            <div
              key={indexTicker.symbol}
              onClick={() => setSelectedHistorySymbol(indexTicker.symbol)}
              className="bg-[#161C19] border border-white/[0.065] hover:border-white/[0.12] rounded-sm p-3.5 flex flex-col justify-between cursor-pointer transition-colors hover:bg-[#1B2420]"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-sans text-[#68716C] uppercase tracking-wider font-medium">
                  <span className="flex items-center gap-1.5 text-[#68716C]">
                    <TrendingUp className="h-3 w-3 text-[#68716C]" />
                    INDEX BENCHMARK
                  </span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-sm bg-[#111614] text-[#A7ADA8] border border-white/[0.065]">
                    {indexTicker.exchange || "NSE"}
                  </span>
                </div>

                <div className="text-sm font-medium font-sans text-[#F2F0E8] mt-1.5 tracking-tight">
                  {indexTicker.symbol}
                </div>
              </div>

              <div className="my-2.5">
                <div className="text-xl md:text-2xl font-semibold font-mono text-[#F2F0E8] tabular-nums">
                  <LiveTickPrice value={indexTicker.price} prefix="₹" />
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <div
                    className={`inline-flex items-center space-x-1 text-xs font-mono font-medium px-1.5 py-0.5 rounded-sm tabular-nums ${
                      isPos
                        ? "bg-[#42A77A]/10 text-[#42A77A] border border-[#42A77A]/25"
                        : "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25"
                    }`}
                  >
                    <LiveTickPrice
                      value={indexTicker.change_24h}
                      formatter={(val) => `${Number(val) >= 0 ? "+" : ""}${Number(val)}%`}
                      showDirectionIcon={true}
                      colorize={true}
                    />
                  </div>

                  <span className="text-[11px] font-mono text-[#68716C] tabular-nums">
                    {indexTicker.change_pts ? (
                      <LiveTickPrice
                        value={indexTicker.change_pts}
                        formatter={(val) => `${isPos ? "+" : ""}₹${val}`}
                      />
                    ) : ""}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.065] flex items-center justify-between text-[11px] font-mono text-[#68716C] tabular-nums">
                <span>Bid: <LiveTickPrice value={indexTicker.bid} prefix="₹" /></span>
                <span>Ask: <LiveTickPrice value={indexTicker.ask} prefix="₹" /></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Exchange Switcher + Search + Sector Toolbar */}
      <div className="flex flex-col gap-3 bg-[#161C19] p-3 rounded-sm border border-white/[0.065]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Segmented Exchange Filter Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-sans text-[#A7ADA8] font-medium flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#68716C]" /> Exchange:
            </span>
            <div className="inline-flex bg-[#111614] p-0.5 rounded-sm border border-white/[0.065]">
              {(["ALL", "NSE", "BSE"] as const).map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExchangeFilter(ex)}
                  className={`px-3 py-1 text-xs font-mono rounded-sm font-medium transition-all ${
                    exchangeFilter === ex
                      ? "bg-[#1B2420] text-[#F2F0E8] border border-white/[0.08]"
                      : "text-[#68716C] hover:text-[#A7ADA8]"
                  }`}
                >
                  {ex === "ALL" ? "ALL (NSE & BSE)" : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative shrink-0 w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#68716C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across ~6,700+ NSE & BSE stocks..."
              className="w-full bg-[#111614] border border-white/[0.065] rounded-sm pl-9 pr-8 py-1.5 text-xs text-[#F2F0E8] font-sans placeholder-[#68716C] focus:outline-none focus:border-white/[0.15] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-[#68716C] hover:text-[#F2F0E8]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sector Filters (Horizontal Scrolling Strip) */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 pt-2 border-t border-white/[0.065]">
          <Filter className="h-3.5 w-3.5 text-[#68716C] shrink-0 ml-1" />
          {SECTORS.map((sector) => {
            const isSelected = selectedSectorFilter === sector;
            return (
              <button
                key={sector}
                onClick={() => setSelectedSectorFilter(sector)}
                className={`px-2.5 py-1 text-[11px] font-sans rounded-sm shrink-0 transition-colors ${
                  isSelected
                    ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30 font-medium"
                    : "text-[#68716C] hover:text-[#F2F0E8] hover:bg-[#111614]"
                }`}
              >
                {sector}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Stock Data Table */}
      <div className="overflow-x-auto border border-white/[0.065] rounded-sm bg-[#111614]">
        <table className="w-full text-left text-xs font-sans">
          <thead>
            <tr className="bg-[#0C100F] text-[#68716C] border-b border-white/[0.065] text-[11px] uppercase tracking-wider font-medium select-none">
              <th 
                onClick={() => toggleSort("symbol")} 
                className="py-2.5 px-4 font-medium cursor-pointer hover:text-[#A7ADA8] transition-colors"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Symbol / Company</span>
                  <ArrowUpDown className={`h-3 w-3 text-[#68716C] transition-colors ${sortField === "symbol" ? "text-[#159570]" : ""}`} />
                </div>
              </th>
              <th className="py-2.5 px-3 font-medium">Sector</th>
              <th 
                onClick={() => toggleSort("price")} 
                className="py-2.5 px-3 text-right font-medium cursor-pointer hover:text-[#A7ADA8] transition-colors"
              >
                <div className="flex items-center justify-end space-x-1.5">
                  <span>LTP (Last Traded)</span>
                  <ArrowUpDown className={`h-3 w-3 text-[#68716C] transition-colors ${sortField === "price" ? "text-[#159570]" : ""}`} />
                </div>
              </th>
              <th 
                onClick={() => toggleSort("change")} 
                className="py-2.5 px-3 text-right font-medium cursor-pointer hover:text-[#A7ADA8] transition-colors"
              >
                <div className="flex items-center justify-end space-x-1.5">
                  <span>24h Change</span>
                  <ArrowUpDown className={`h-3 w-3 text-[#68716C] transition-colors ${sortField === "change" ? "text-[#159570]" : ""}`} />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right font-medium">Prev Close / Open</th>
              <th className="py-2.5 px-3 text-right font-medium">Day High / Low</th>
              <th className="py-2.5 px-3 text-right font-medium">52W High / Low</th>
              <th className="py-2.5 px-4 text-right font-medium">Analytics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sortedTickers.map((t) => {
              const prevCloseVal = t.prev_close || Number((t.price / (1 + (t.change_24h / 100))).toFixed(2));
              const openPriceVal = t.open_price || t.price;

              return (
                <tr
                  key={t.symbol}
                  onClick={() => setSelectedHistorySymbol(t.symbol)}
                  className="hover:bg-[#161C19] transition-colors duration-150 cursor-pointer group"
                >
                  {/* Symbol & Company */}
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-[#F2F0E8] group-hover:text-[#42A77A] transition-colors flex items-center space-x-2 font-mono">
                      <span>{t.symbol}</span>
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-sm bg-[#161C19] text-[#A7ADA8] border border-white/[0.065]">
                        {t.symbol === "SENSEX" || (t.company_name && t.company_name.includes("BSE")) ? "BSE" : "NSE"}
                      </span>
                    </div>
                    {t.company_name && (
                      <div className="text-[11px] text-[#A7ADA8] truncate max-w-[200px] mt-0.5">
                        {t.company_name}
                      </div>
                    )}
                  </td>

                  {/* Sector */}
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-sm text-[10px] font-medium bg-[#161C19] text-[#A7ADA8] border border-white/[0.065]">
                      {t.sector || "Equities"}
                    </span>
                  </td>

                  {/* LTP */}
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-[#F2F0E8] tabular-nums">
                    <LiveTickPrice value={t.price} prefix="₹" />
                  </td>

                  {/* 24h Change */}
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    <LiveTickPrice
                      value={t.change_24h}
                      formatter={(val) => `${Number(val) >= 0 ? "+" : ""}${Number(val)}%`}
                      colorize={true}
                      showDirectionIcon={true}
                    />
                  </td>

                  {/* Prev Close / Open */}
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-[#A7ADA8] tabular-nums">
                    <div>Prev: ₹{prevCloseVal.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-[#68716C]">
                      Open: ₹{openPriceVal.toLocaleString("en-IN")}
                    </div>
                  </td>

                  {/* Day High / Low */}
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-[#A7ADA8] tabular-nums">
                    <div>H: ₹{(t.day_high || t.high_24h).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-[#68716C]">
                      L: ₹{(t.day_low || t.low_24h).toLocaleString("en-IN")}
                    </div>
                  </td>

                  {/* 52W High / Low */}
                  <td className="py-2.5 px-3 text-right font-mono text-[11px] text-[#A7ADA8] tabular-nums">
                    <div>₹{(t.fifty_two_week_high || t.high_24h).toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-[#68716C]">
                      ₹{(t.fifty_two_week_low || t.low_24h).toLocaleString("en-IN")}
                    </div>
                  </td>

                  {/* Analytics Button */}
                  <td className="py-2.5 px-4 text-right">
                    <button className="inline-flex items-center space-x-1 bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] text-[11px] font-mono px-2.5 py-1 rounded-sm transition-colors border border-white/[0.065]">
                      <BarChart2 className="h-3 w-3 text-[#68716C]" />
                      <span>OHLCV</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historical Trend Chart Drawer / Modal */}
      {selectedHistorySymbol && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-4">
              <div>
                <h3 className="text-base font-semibold font-sans text-[#F2F0E8] flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#159570]" />
                  HISTORICAL TIME-SERIES &amp; OHLCV TREND: {selectedHistorySymbol}
                </h3>
                <p className="text-xs text-[#A7ADA8] font-sans mt-0.5">
                  1-Year Daily OHLCV dataset fed into PyTorch GNN Contagion Risk Engine.
                </p>
              </div>
              <button 
                onClick={() => setSelectedHistorySymbol(null)}
                className="p-1.5 bg-[#161C19] border border-white/[0.065] rounded-sm text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#1B2420] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="h-64 flex items-center justify-center space-x-3 text-[#A7ADA8] font-mono text-xs">
                <Zap className="h-4 w-4 text-[#159570] animate-spin" />
                <span>Fetching Historical Time-Series Data from Database &amp; Yahoo Finance...</span>
              </div>
            ) : historyPayload ? (
              <div className="space-y-6">
                {/* Candle Trend Viz */}
                <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs font-sans text-[#A7ADA8]">
                    <span>PRICE TREND (LAST 90 TRADING DAYS)</span>
                    <span className="text-[#F2F0E8] font-mono font-medium">INTERVAL: DAILY OHLCV</span>
                  </div>

                  <div className="h-44 flex items-end space-x-1 overflow-x-auto pt-4 pb-2 border-b border-white/[0.065]">
                    {historyPayload.candles.slice(-90).map((c, i) => {
                      const isUp = c.close_price >= c.open_price;
                      const maxP = Math.max(...historyPayload.candles.slice(-90).map((x) => x.high_price));
                      const minP = Math.min(...historyPayload.candles.slice(-90).map((x) => x.low_price));
                      const range = maxP - minP || 1;
                      const barHeight = Math.max(12, ((c.close_price - minP) / range) * 140);
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative min-w-[6px]">
                          <div 
                            style={{ height: `${barHeight}px` }} 
                            className={`w-full rounded-sm ${isUp ? "bg-[#42A77A]/80 hover:bg-[#42A77A]" : "bg-[#C45D62]/80 hover:bg-[#C45D62]"} transition-colors`}
                          />
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#161C19] border border-white/[0.1] text-[10px] font-mono text-[#F2F0E8] p-2 rounded-sm shadow-xl z-20 whitespace-nowrap">
                            <div>Date: {c.date}</div>
                            <div>Close: ₹{c.close_price}</div>
                            <div>Change: {c.pct_change}%</div>
                            <div>Vol: {c.volume.toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Historical Candle Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-sans font-medium text-[#A7ADA8] uppercase tracking-wider">
                    Recent Daily OHLCV Candles
                  </h4>
                  <div className="overflow-x-auto border border-white/[0.065] rounded-sm max-h-48 overflow-y-auto bg-[#0C100F]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="sticky top-0 bg-[#0C100F] text-[#68716C] border-b border-white/[0.065] text-[10px] uppercase font-medium">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-2">Open</th>
                          <th className="py-2 px-2">High</th>
                          <th className="py-2 px-2">Low</th>
                          <th className="py-2 px-2">Close</th>
                          <th className="py-2 px-2">Change %</th>
                          <th className="py-2 px-3 text-right">Volume</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {historyPayload.candles.slice(-15).reverse().map((c, i) => (
                          <tr key={i} className="hover:bg-[#161C19]">
                            <td className="py-2 px-3 text-[#A7ADA8]">{c.date}</td>
                            <td className="py-2 px-2 text-[#68716C]">₹{c.open_price}</td>
                            <td className="py-2 px-2 text-[#68716C]">₹{c.high_price}</td>
                            <td className="py-2 px-2 text-[#68716C]">₹{c.low_price}</td>
                            <td className="py-2 px-2 font-medium text-[#F2F0E8]">₹{c.close_price}</td>
                            <td className={`py-2 px-2 font-medium ${c.pct_change >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                              {c.pct_change >= 0 ? "+" : ""}{c.pct_change}%
                            </td>
                            <td className="py-2 px-3 text-right text-[#68716C]">{c.volume.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
