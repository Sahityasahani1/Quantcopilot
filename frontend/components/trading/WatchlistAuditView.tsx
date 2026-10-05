"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Layers, 
  Activity, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  BarChart3, 
  Sliders, 
  AlertCircle,
  Zap,
  Target,
  ShieldCheck,
  Eye,
  X,
  Compass,
  ArrowRight,
  Briefcase,
  ChevronRight,
  DollarSign
} from "lucide-react";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { LiveYfinanceQuote, AssetAuditItem, PositionInput } from "../../types";
import { getApiBaseUrl } from "../../lib/api";
import { LiveTickPrice } from "../common/LiveTickPrice";

const POPULAR_NSE_TICKERS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking" },
  { symbol: "INFY", name: "Infosys Ltd", sector: "IT Services" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Banking" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Automotive" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecom" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", sector: "Infrastructure" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "Financial Services" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", sector: "Automotive" },
  { symbol: "SUNPHARMA", name: "Sun Pharma Industries", sector: "Pharma" },
  { symbol: "TITAN", name: "Titan Company Ltd", sector: "Consumer" },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", sector: "Metals" },
  { symbol: "ZOMATO", name: "Zomato Ltd", sector: "Tech Platform" },
  { symbol: "TRENT", name: "Trent Ltd (Tata Retail)", sector: "Retail" },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate" },
  { symbol: "NTPC", name: "NTPC Ltd", sector: "Power" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp", sector: "Energy" }
];

export const WatchlistAuditView: React.FC = () => {
  const { 
    watchlist, 
    addToWatchlist, 
    removeFromWatchlist, 
    addPosition,
    fetchSavedPositionsFromBackend 
  } = usePortfolioStore();

  // Live quotes state
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveYfinanceQuote>>({});
  const [isQuotesLoading, setIsQuotesLoading] = useState<boolean>(false);
  const [lastQuotesSync, setLastQuotesSync] = useState<Date | null>(null);

  // AI Predictive Audits state
  const [auditMap, setAuditMap] = useState<Record<string, AssetAuditItem>>({});
  const [auditsLoading, setAuditsLoading] = useState<Record<string, boolean>>({});

  // Auto-refresh timer (60s, 120s, 300s, 0=manual)
  const [refreshInterval, setRefreshInterval] = useState<number>(120); // 2 minutes default
  const [countdown, setCountdown] = useState<number>(120);

  // Search & add scrip
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Filter & view modes
  const [filterStance, setFilterStance] = useState<"ALL" | "BULLISH" | "ACCUMULATION" | "BEARISH">("ALL");
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Detailed Audit Inspection Modal / Drawer
  const [selectedAuditDrawer, setSelectedAuditDrawer] = useState<AssetAuditItem | null>(null);

  // Order Quick Add Modal (Add to Portfolio)
  const [orderModalStock, setOrderModalStock] = useState<{
    symbol: string;
    quote?: LiveYfinanceQuote;
    audit?: AssetAuditItem;
  } | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(50);
  const [orderSide, setOrderSide] = useState<"LONG" | "SHORT">("LONG");
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // Initial database sync for portfolio
  useEffect(() => {
    fetchSavedPositionsFromBackend();
  }, [fetchSavedPositionsFromBackend]);

  // Fetch batch live market quotes for watched stocks
  const fetchQuotes = useCallback(async () => {
    if (!watchlist || watchlist.length === 0) return;
    setIsQuotesLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/portfolio/yfinance-batch-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: watchlist })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quotes) {
          setLiveQuotes(prev => ({ ...prev, ...data.quotes }));
          setLastQuotesSync(new Date());
        }
      }
    } catch (err) {
      console.error("Error fetching watchlist quotes:", err);
    } finally {
      setIsQuotesLoading(false);
    }
  }, [watchlist]);

  // Fetch predictive quantitative audit for a single stock
  const fetchSingleAudit = useCallback(async (symbol: string) => {
    const cleanSym = symbol.trim().toUpperCase().replace("-EQ", "");
    setAuditsLoading(prev => ({ ...prev, [cleanSym]: true }));
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/fno/stock-audit/${cleanSym}`);
      if (res.ok) {
        const item: AssetAuditItem = await res.json();
        setAuditMap(prev => ({ ...prev, [cleanSym]: item }));
      }
    } catch (err) {
      console.error(`Error auditing ${cleanSym}:`, err);
    } finally {
      setAuditsLoading(prev => ({ ...prev, [cleanSym]: false }));
    }
  }, []);

  // Fetch predictive audits for any missing or outdated stocks
  const fetchAllAudits = useCallback(async () => {
    if (!watchlist || watchlist.length === 0) return;
    for (const sym of watchlist) {
      fetchSingleAudit(sym);
    }
  }, [watchlist, fetchSingleAudit]);

  // Initial load
  useEffect(() => {
    fetchQuotes();
    fetchAllAudits();
  }, [fetchQuotes, fetchAllAudits]);

  // Ticking countdown timer for automated refreshes
  useEffect(() => {
    if (refreshInterval <= 0) return;

    setCountdown(refreshInterval);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchQuotes();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshInterval, fetchQuotes]);

  // Search filtered stocks
  const filteredSearchList = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_NSE_TICKERS.filter(t => !watchlist.includes(t.symbol));
    const q = searchQuery.toLowerCase().trim();
    return POPULAR_NSE_TICKERS.filter(t => 
      !watchlist.includes(t.symbol) &&
      (t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.sector.toLowerCase().includes(q))
    );
  }, [searchQuery, watchlist]);

  // Filter watchlist items
  const displayItems = useMemo(() => {
    return watchlist.filter(sym => {
      if (filterStance === "ALL") return true;
      const audit = auditMap[sym];
      if (!audit) return true;
      const stance = audit.future_prediction?.dominant_stance || "";
      if (filterStance === "BULLISH") return stance.includes("BULLISH");
      if (filterStance === "ACCUMULATION") return stance.includes("ACCUMULATION") || stance.includes("RANGE");
      if (filterStance === "BEARISH") return stance.includes("BEARISH");
      return true;
    });
  }, [watchlist, filterStance, auditMap]);

  // Handle adding custom symbol
  const handleAddCustomSymbol = (sym: string) => {
    addToWatchlist(sym);
    setSearchQuery("");
    setIsSearchOpen(false);
    fetchSingleAudit(sym);
  };

  // Handle execute add to portfolio
  const handleExecuteAddToPortfolio = () => {
    if (!orderModalStock) return;
    const sym = orderModalStock.symbol;
    const quote = orderModalStock.quote;
    const curPrice = quote?.price || orderModalStock.audit?.spot_price || 1000.0;

    const newPos: PositionInput = {
      symbol: sym,
      quantity: Number(orderQuantity),
      entry_price: Number(curPrice.toFixed(2)),
      side: orderSide,
      leverage: 1.0
    };

    addPosition(newPos);
    setOrderSuccess(`Added ${orderQuantity}x ${sym} at ₹${curPrice.toFixed(2)} to live portfolio!`);
    setTimeout(() => {
      setOrderSuccess(null);
      setOrderModalStock(null);
    }, 1400);
  };

  // Helper for Stance badge styling
  const renderStanceBadge = (stance: string) => {
    const s = (stance || "").toUpperCase();
    if (s.includes("STRONG_BULLISH")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wider uppercase bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30">
          <TrendingUp className="w-3 h-3 text-[#42A77A]" />
          Strong Bullish
        </span>
      );
    }
    if (s.includes("MODERATE_BULLISH")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wider uppercase bg-[#159570]/10 text-[#42A77A] border border-[#159570]/20">
          <TrendingUp className="w-3 h-3 text-[#42A77A]" />
          Moderate Bullish
        </span>
      );
    }
    if (s.includes("ACCUMULATION") || s.includes("RANGE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wider uppercase bg-[#C8A96B]/10 text-[#C8A96B] border border-[#C8A96B]/25">
          <Activity className="w-3 h-3 text-[#C8A96B]" />
          Accumulation
        </span>
      );
    }
    if (s.includes("BEARISH")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wider uppercase bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25">
          <TrendingDown className="w-3 h-3 text-[#C45D62]" />
          Bearish Pullback
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-medium tracking-wider uppercase bg-white/[0.04] text-[#A7ADA8] border border-white/[0.08]">
        <Activity className="w-3 h-3 text-[#68716C]" />
        Neutral
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto space-y-6">
      {/* ==================== DESK HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.065] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-sm bg-[#159570]/10 border border-[#159570]/25 text-[#159570]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-[#F2F0E8] flex items-center gap-2.5">
                Live Watchlist &amp; Predictive Audit Desk
                <span className="text-xs px-2 py-0.5 rounded-sm font-mono font-medium bg-[#161C19] text-[#159570] border border-[#159570]/25">
                  CMP REALTIME
                </span>
              </h1>
              <p className="text-xs text-[#A7ADA8] mt-0.5">
                Dynamic Current Market Price quotes with multi-horizon AI price forecast cones &amp; institutional governance audits.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh controls & Search trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh interval selector */}
          <div className="flex items-center gap-1.5 bg-[#161C19] border border-white/[0.065] rounded-sm px-2.5 py-1.5 text-xs text-[#A7ADA8]">
            <Clock className="w-3.5 h-3.5 text-[#68716C]" />
            <span className="text-[#68716C] hidden sm:inline">Interval:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent border-none text-[#F2F0E8] text-xs focus:ring-0 cursor-pointer pr-1 outline-none font-mono"
            >
              <option value={60} className="bg-[#111614] text-[#F2F0E8]">1 Min</option>
              <option value={120} className="bg-[#111614] text-[#F2F0E8]">2 Min</option>
              <option value={300} className="bg-[#111614] text-[#F2F0E8]">5 Min</option>
              <option value={0} className="bg-[#111614] text-[#F2F0E8]">Manual</option>
            </select>
          </div>

          {/* Countdown badge */}
          {refreshInterval > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161C19] border border-white/[0.065] rounded-sm text-xs font-mono text-[#A7ADA8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#159570]" />
              <span>Next tick:</span>
              <span className="text-[#42A77A] font-medium">{countdown}s</span>
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={() => {
              fetchQuotes();
              fetchAllAudits();
              setCountdown(refreshInterval);
            }}
            disabled={isQuotesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161C19] hover:bg-[#1B2420] border border-white/[0.065] rounded-sm text-xs font-medium text-[#F2F0E8] transition-colors disabled:opacity-50"
            title="Force immediate quotes & audit refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isQuotesLoading ? "animate-spin text-[#159570]" : "text-[#68716C]"}`} />
            <span>Refresh Now</span>
          </button>

          {/* Add Stock to Watchlist Button */}
          <div className="relative">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium rounded-sm text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Stock</span>
            </button>

            {/* Quick Add Popover */}
            {isSearchOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[#111614] border border-white/[0.08] rounded-sm shadow-2xl p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.065]">
                  <span className="text-xs font-medium text-[#F2F0E8]">Add to Watchlist</span>
                  <button 
                    onClick={() => setIsSearchOpen(false)}
                    className="text-[#68716C] hover:text-[#F2F0E8] p-1 rounded-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 text-[#68716C] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search scrip (e.g. RELIANCE, ZOMATO)..."
                    className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm pl-8 pr-3 py-1.5 text-xs text-[#F2F0E8] placeholder-[#68716C] focus:outline-none focus:border-white/[0.15]"
                    autoFocus
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredSearchList.length === 0 ? (
                    <div className="text-center py-3 text-xs text-[#68716C]">
                      No matching securities available
                    </div>
                  ) : (
                    filteredSearchList.map(item => (
                      <button
                        key={item.symbol}
                        onClick={() => handleAddCustomSymbol(item.symbol)}
                        className="w-full flex items-center justify-between p-2 rounded-sm hover:bg-[#161C19] text-left transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-medium text-[#F2F0E8] group-hover:text-[#42A77A]">
                            {item.symbol}
                          </div>
                          <div className="text-[10px] text-[#A7ADA8] truncate max-w-[170px]">
                            {item.name}
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-[#161C19] text-[#A7ADA8] font-mono border border-white/[0.04]">
                          {item.sector}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== STATS STRIP & VIEW SWITCHER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161C19] border border-white/[0.065] rounded-sm p-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[#A7ADA8] mr-1 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-[#68716C]" />
            <span>Stance:</span>
          </span>
          {(["ALL", "BULLISH", "ACCUMULATION", "BEARISH"] as const).map((stance) => (
            <button
              key={stance}
              onClick={() => setFilterStance(stance)}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-all ${
                filterStance === stance
                  ? "bg-[#1B2420] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              {stance}
            </button>
          ))}
        </div>

        {/* Summary counts & View mode toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#A7ADA8] font-mono">
            Tracking: <strong className="text-[#F2F0E8] font-medium">{watchlist.length}</strong> securities
          </span>
          <div className="flex items-center bg-[#111614] p-0.5 rounded-sm border border-white/[0.065]">
            <button
              onClick={() => setViewMode("CARDS")}
              className={`px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                viewMode === "CARDS" ? "bg-[#161C19] text-[#F2F0E8]" : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Audit Cards
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`px-2 py-1 rounded-sm text-xs font-medium transition-colors ${
                viewMode === "TABLE" ? "bg-[#161C19] text-[#F2F0E8]" : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Dense Table
            </button>
          </div>
        </div>
      </div>

      {/* ==================== CARDS VIEW ==================== */}
      {viewMode === "CARDS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayItems.map((symbol) => {
            const quote = liveQuotes[symbol];
            const audit = auditMap[symbol];
            const isLoadingAudit = auditsLoading[symbol];

            const curPrice = quote?.price ?? audit?.spot_price ?? 0;
            const changePts = quote?.change_pts ?? audit?.day_change ?? 0;
            const changePct = quote?.change_pct ?? audit?.day_change_pct ?? 0;
            const isPositive = changePts >= 0;

            const pred = audit?.future_prediction;
            const targetPrice = pred?.target_price ?? (curPrice * 1.04);
            const expectedReturn = pred?.expected_return_pct ?? 4.0;
            const confidence = pred?.confidence_pct ?? 82.0;
            const stance = pred?.dominant_stance ?? "MODERATE_BULLISH";

            const trajectory = pred?.trajectory_points || [];

            return (
              <div 
                key={symbol}
                className="bg-[#111614] border border-white/[0.065] hover:border-white/[0.12] rounded-sm p-4 flex flex-col justify-between transition-colors hover:bg-[#161C19] group"
              >
                <div>
                  {/* Top Row: Symbol, Sector, Remove button */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-[#F2F0E8] tracking-tight">
                          {symbol}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#161C19] text-[#A7ADA8] border border-white/[0.04]">
                          NSE
                        </span>
                      </div>
                      <div className="text-xs text-[#A7ADA8] truncate max-w-[200px] mt-0.5">
                        {quote?.company_name || audit?.name || symbol}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {renderStanceBadge(stance)}
                      <button
                        onClick={() => removeFromWatchlist(symbol)}
                        className="text-[#68716C] hover:text-[#C45D62] p-1 rounded-sm hover:bg-[#1B2420] transition-colors"
                        title="Remove from Watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* CMP Section with LiveTickPrice */}
                  <div className="mt-3.5 pt-3 border-t border-white/[0.065] flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-medium text-[#68716C] block tracking-wider">
                        Current Market Price (CMP)
                      </span>
                      <div className="text-xl font-semibold font-mono text-[#F2F0E8] mt-0.5">
                        <LiveTickPrice
                          value={curPrice}
                          formatter={(v) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        />
                      </div>
                    </div>

                    <div className={`text-right ${isPositive ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                      <div className="flex items-center justify-end gap-1 font-mono text-xs font-semibold">
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{isPositive ? "+" : ""}{changePts.toFixed(2)}</span>
                      </div>
                      <div className="text-[11px] font-mono font-medium">
                        ({isPositive ? "+" : ""}{changePct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Day High / Low bar */}
                  {quote && quote.day_high && quote.day_low && (
                    <div className="mt-2.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#68716C] mb-1">
                        <span>L: ₹{quote.day_low.toFixed(1)}</span>
                        <span>H: ₹{quote.day_high.toFixed(1)}</span>
                      </div>
                      <div className="w-full h-1 bg-[#0C100F] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#159570] rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(5, ((curPrice - quote.day_low) / Math.max(1, quote.day_high - quote.day_low)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI Predictive Audit Panel */}
                  <div className="mt-3.5 p-3 rounded-sm bg-[#0C100F] border border-white/[0.065] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#F2F0E8] font-medium">
                        <Target className="w-3.5 h-3.5 text-[#159570]" />
                        <span>AI Price Forecast Audit</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#68716C]">
                        Horizon: 14 Days
                      </span>
                    </div>

                    {/* Target & Expected Return */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[#111614] p-2 rounded-sm border border-white/[0.04]">
                        <span className="text-[10px] text-[#68716C] block">Projected CMP Target</span>
                        <span className="font-mono font-semibold text-[#F2F0E8] text-sm">
                          ₹{targetPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-[#111614] p-2 rounded-sm border border-white/[0.04]">
                        <span className="text-[10px] text-[#68716C] block">Expected Return %</span>
                        <span className={`font-mono font-semibold text-sm ${expectedReturn >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                          {expectedReturn >= 0 ? "+" : ""}{expectedReturn.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* AI Confidence Meter */}
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-[#A7ADA8] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-[#C8A96B]" />
                        AI Quant Confidence:
                      </span>
                      <span className="font-mono font-medium text-[#C8A96B]">
                        {confidence.toFixed(1)}%
                      </span>
                    </div>

                    {/* Trajectory Mini Sparkline */}
                    {trajectory.length > 0 && (
                      <div className="h-9 w-full pt-1">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                          {/* Bearish floor boundary */}
                          <polyline
                            fill="none"
                            stroke="#C45D62"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.5"
                            points={trajectory.map((p, idx) => {
                              const x = (idx / Math.max(1, trajectory.length - 1)) * 100;
                              const minP = Math.min(...trajectory.map(t => t.bearish_price));
                              const maxP = Math.max(...trajectory.map(t => t.bullish_price));
                              const y = 24 - ((p.bearish_price - minP) / Math.max(1, maxP - minP)) * 24;
                              return `${x},${y}`;
                            }).join(" ")}
                          />
                          {/* Bullish upper boundary */}
                          <polyline
                            fill="none"
                            stroke="#42A77A"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                            opacity="0.5"
                            points={trajectory.map((p, idx) => {
                              const x = (idx / Math.max(1, trajectory.length - 1)) * 100;
                              const minP = Math.min(...trajectory.map(t => t.bearish_price));
                              const maxP = Math.max(...trajectory.map(t => t.bullish_price));
                              const y = 24 - ((p.bullish_price - minP) / Math.max(1, maxP - minP)) * 24;
                              return `${x},${y}`;
                            }).join(" ")}
                          />
                          {/* Base Forecast Path */}
                          <polyline
                            fill="none"
                            stroke={expectedReturn >= 0 ? "#42A77A" : "#C45D62"}
                            strokeWidth="1.5"
                            points={trajectory.map((p, idx) => {
                              const x = (idx / Math.max(1, trajectory.length - 1)) * 100;
                              const minP = Math.min(...trajectory.map(t => t.bearish_price));
                              const maxP = Math.max(...trajectory.map(t => t.bullish_price));
                              const y = 24 - ((p.base_price - minP) / Math.max(1, maxP - minP)) * 24;
                              return `${x},${y}`;
                            }).join(" ")}
                          />
                        </svg>
                      </div>
                    )}

                    {/* Microstructure Indicators strip */}
                    {audit?.past_market && (
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#68716C] pt-1 border-t border-white/[0.04]">
                        <span>RSI: <strong className={audit.past_market.rsi_14 > 60 ? "text-[#42A77A]" : audit.past_market.rsi_14 < 40 ? "text-[#C45D62]" : "text-[#F2F0E8]"}>{audit.past_market.rsi_14}</strong></span>
                        <span>Vol: <strong className="text-[#F2F0E8]">{audit.past_market.volatility_annualized_pct}%</strong></span>
                        <span>EMA: <strong className="text-[#F2F0E8]">{audit.past_market.ema_alignment}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Inspect Audit & Add to Portfolio */}
                <div className="mt-4 pt-3 border-t border-white/[0.065] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedAuditDrawer(audit || null)}
                    disabled={!audit}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-xs font-medium text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] transition-colors disabled:opacity-50"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#68716C]" />
                    <span>Audit Detail</span>
                  </button>

                  <button
                    onClick={() => {
                      setOrderModalStock({ symbol, quote, audit });
                      setOrderQuantity(50);
                      setOrderSide("LONG");
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-sm bg-[#159570]/15 hover:bg-[#159570]/25 border border-[#159570]/30 text-[#42A77A] text-xs font-medium transition-colors"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>+ Portfolio</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== TABLE VIEW ==================== */}
      {viewMode === "TABLE" && (
        <div className="bg-[#111614] border border-white/[0.065] rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0C100F] text-[#68716C] font-mono uppercase text-[10px] tracking-wider border-b border-white/[0.065]">
                <tr>
                  <th className="py-3 px-4">Symbol / Name</th>
                  <th className="py-3 px-4">Current Price (CMP)</th>
                  <th className="py-3 px-4">24h Change</th>
                  <th className="py-3 px-4">AI Stance</th>
                  <th className="py-3 px-4">Target (14d)</th>
                  <th className="py-3 px-4">Expected Return</th>
                  <th className="py-3 px-4">AI Confidence</th>
                  <th className="py-3 px-4">RSI (14)</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-sans">
                {displayItems.map((symbol) => {
                  const quote = liveQuotes[symbol];
                  const audit = auditMap[symbol];

                  const curPrice = quote?.price ?? audit?.spot_price ?? 0;
                  const changePts = quote?.change_pts ?? audit?.day_change ?? 0;
                  const changePct = quote?.change_pct ?? audit?.day_change_pct ?? 0;
                  const isPositive = changePts >= 0;

                  const pred = audit?.future_prediction;
                  const targetPrice = pred?.target_price ?? (curPrice * 1.04);
                  const expectedReturn = pred?.expected_return_pct ?? 4.0;
                  const confidence = pred?.confidence_pct ?? 82.0;
                  const stance = pred?.dominant_stance ?? "MODERATE_BULLISH";

                  return (
                    <tr key={symbol} className="hover:bg-[#161C19] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#F2F0E8]">{symbol}</div>
                        <div className="text-[11px] text-[#A7ADA8] truncate max-w-[150px]">
                          {quote?.company_name || audit?.name || symbol}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-[#F2F0E8]">
                        <LiveTickPrice
                          value={curPrice}
                          formatter={(v) => `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium">
                        <div className={`flex items-center gap-1 ${isPositive ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{isPositive ? "+" : ""}{changePts.toFixed(2)}</span>
                          <span className="text-[10px]">({isPositive ? "+" : ""}{changePct.toFixed(2)}%)</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderStanceBadge(stance)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-[#F2F0E8]">
                        ₹{targetPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3.5 px-4 font-mono font-medium ${expectedReturn >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                        {expectedReturn >= 0 ? "+" : ""}{expectedReturn.toFixed(2)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#C8A96B] font-medium">
                        {confidence.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#A7ADA8]">
                        {audit?.past_market?.rsi_14 ?? "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAuditDrawer(audit || null)}
                            disabled={!audit}
                            className="p-1.5 rounded-sm hover:bg-[#1B2420] text-[#68716C] hover:text-[#F2F0E8] transition-colors"
                            title="Inspect Audit"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setOrderModalStock({ symbol, quote, audit });
                              setOrderQuantity(50);
                              setOrderSide("LONG");
                            }}
                            className="px-2.5 py-1 rounded-sm bg-[#159570]/15 hover:bg-[#159570]/25 border border-[#159570]/30 text-[#42A77A] text-xs font-medium transition-colors"
                            title="Add to Portfolio"
                          >
                            + Add
                          </button>
                          <button
                            onClick={() => removeFromWatchlist(symbol)}
                            className="p-1.5 rounded-sm hover:bg-[#1B2420] text-[#68716C] hover:text-[#C45D62] transition-colors"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== AUDIT INSPECTION DRAWER MODAL ==================== */}
      {selectedAuditDrawer && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-white/[0.065] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-[#F2F0E8] tracking-tight">
                    {selectedAuditDrawer.symbol}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-sm font-mono bg-[#161C19] text-[#A7ADA8] border border-white/[0.04]">
                    {selectedAuditDrawer.sector}
                  </span>
                  {renderStanceBadge(selectedAuditDrawer.future_prediction?.dominant_stance)}
                </div>
                <p className="text-xs text-[#A7ADA8] mt-1">
                  {selectedAuditDrawer.name} — Institutional Microstructure &amp; Policy Audit
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditDrawer(null)}
                className="text-[#68716C] hover:text-[#F2F0E8] p-1.5 rounded-sm hover:bg-[#161C19] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verdict summary */}
            <div className="bg-[#0C100F] p-3.5 rounded-sm border border-white/[0.065] space-y-1.5">
              <span className="text-[10px] uppercase font-medium text-[#159570] tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Executive Quant Verdict
              </span>
              <p className="text-xs text-[#F2F0E8] leading-relaxed">
                {selectedAuditDrawer.executive_verdict}
              </p>
            </div>

            {/* Forecast metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#0C100F] p-3 rounded-sm border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">Spot CMP</span>
                <span className="font-mono font-semibold text-[#F2F0E8] text-base">
                  ₹{selectedAuditDrawer.spot_price.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#0C100F] p-3 rounded-sm border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">Target (14d)</span>
                <span className="font-mono font-semibold text-[#42A77A] text-base">
                  ₹{selectedAuditDrawer.future_prediction?.target_price?.toFixed(2)}
                </span>
              </div>
              <div className="bg-[#0C100F] p-3 rounded-sm border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">Expected Return</span>
                <span className="font-mono font-semibold text-[#42A77A] text-base">
                  +{selectedAuditDrawer.future_prediction?.expected_return_pct}%
                </span>
              </div>
              <div className="bg-[#0C100F] p-3 rounded-sm border border-white/[0.04]">
                <span className="text-[10px] text-[#68716C] block">AI Confidence</span>
                <span className="font-mono font-medium text-[#C8A96B] text-base">
                  {selectedAuditDrawer.future_prediction?.confidence_pct}%
                </span>
              </div>
            </div>

            {/* Quant Signals strip */}
            {selectedAuditDrawer.past_market && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs bg-[#0C100F] p-3 rounded-sm border border-white/[0.04]">
                <div>
                  <span className="text-[10px] text-[#68716C] block">1W Return</span>
                  <span className="font-mono text-[#A7ADA8] font-medium">{selectedAuditDrawer.past_market.return_1w_pct}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716C] block">1M Return</span>
                  <span className="font-mono text-[#A7ADA8] font-medium">{selectedAuditDrawer.past_market.return_1m_pct}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716C] block">RSI (14)</span>
                  <span className="font-mono text-[#42A77A] font-semibold">{selectedAuditDrawer.past_market.rsi_14}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716C] block">Volatility</span>
                  <span className="font-mono text-[#A7ADA8] font-medium">{selectedAuditDrawer.past_market.volatility_annualized_pct}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716C] block">52W High</span>
                  <span className="font-mono text-[#A7ADA8] font-medium">₹{selectedAuditDrawer.past_market.high_52w}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#68716C] block">52W Low</span>
                  <span className="font-mono text-[#A7ADA8] font-medium">₹{selectedAuditDrawer.past_market.low_52w}</span>
                </div>
              </div>
            )}

            {/* Policy & Regulatory Audit */}
            {selectedAuditDrawer.govt_policy && (
              <div className="bg-[#0C100F] p-3.5 rounded-sm border border-white/[0.065] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-medium text-[#C8A96B] tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Government &amp; SEBI Regulatory Impact
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#C8A96B]/10 text-[#C8A96B] border border-[#C8A96B]/25">
                    Stance: {selectedAuditDrawer.govt_policy.policy_stance}
                  </span>
                </div>
                <p className="text-xs text-[#A7ADA8] leading-relaxed">
                  {selectedAuditDrawer.govt_policy.key_policy_summary}
                </p>
                {selectedAuditDrawer.govt_policy.applicable_circulars?.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-[#68716C] font-medium block">Active Circulars:</span>
                    {selectedAuditDrawer.govt_policy.applicable_circulars.map((circ, idx) => (
                      <div key={idx} className="text-[11px] font-mono text-[#68716C] bg-[#111614] border border-white/[0.04] px-2 py-1 rounded-sm">
                        {circ}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action button inside modal */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedAuditDrawer(null)}
                className="px-4 py-2 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-xs font-medium text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setOrderModalStock({ 
                    symbol: selectedAuditDrawer.symbol, 
                    quote: liveQuotes[selectedAuditDrawer.symbol], 
                    audit: selectedAuditDrawer 
                  });
                  setSelectedAuditDrawer(null);
                }}
                className="px-4 py-2 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] text-xs font-medium transition-colors"
              >
                Add to Live Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== QUICK ADD TO PORTFOLIO MODAL ==================== */}
      {orderModalStock && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#159570]" />
                <h3 className="text-base font-semibold text-[#F2F0E8]">
                  Add {orderModalStock.symbol} to Portfolio
                </h3>
              </div>
              <button
                onClick={() => setOrderModalStock(null)}
                className="text-[#68716C] hover:text-[#F2F0E8] p-1 rounded-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {orderSuccess ? (
              <div className="p-4 bg-[#159570]/15 border border-[#159570]/30 rounded-sm text-center space-y-2">
                <Check className="w-8 h-8 text-[#42A77A] mx-auto" />
                <div className="text-xs font-medium text-[#42A77A]">{orderSuccess}</div>
              </div>
            ) : (
              <>
                <div className="bg-[#0C100F] p-3 rounded-sm border border-white/[0.065] space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#68716C]">Current Market Price (CMP):</span>
                    <span className="font-mono font-medium text-[#F2F0E8]">
                      ₹{(orderModalStock.quote?.price ?? orderModalStock.audit?.spot_price ?? 1000).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#68716C]">AI 14d Target Objective:</span>
                    <span className="font-mono font-medium text-[#42A77A]">
                      ₹{(orderModalStock.audit?.future_prediction?.target_price ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#A7ADA8] block mb-1">Position Side</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderSide("LONG")}
                        className={`py-2 rounded-sm text-xs font-medium transition-colors ${
                          orderSide === "LONG"
                            ? "bg-[#159570]/20 text-[#42A77A] border border-[#159570]/40"
                            : "bg-[#161C19] text-[#68716C] hover:bg-[#1B2420] border border-white/[0.04]"
                        }`}
                      >
                        LONG (BUY)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderSide("SHORT")}
                        className={`py-2 rounded-sm text-xs font-medium transition-colors ${
                          orderSide === "SHORT"
                            ? "bg-[#C45D62]/20 text-[#C45D62] border border-[#C45D62]/40"
                            : "bg-[#161C19] text-[#68716C] hover:bg-[#1B2420] border border-white/[0.04]"
                        }`}
                      >
                        SHORT (SELL)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#A7ADA8] block mb-1">Quantity (Shares)</label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-2 text-[#F2F0E8] font-mono text-sm focus:outline-none focus:border-white/[0.15]"
                    />
                  </div>

                  <div className="flex justify-between text-xs text-[#68716C] pt-1 font-mono">
                    <span>Total Investment Exposure:</span>
                    <span className="text-[#F2F0E8] font-medium">
                      ₹{(((orderModalStock.quote?.price ?? orderModalStock.audit?.spot_price ?? 1000)) * orderQuantity).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderModalStock(null)}
                    className="flex-1 py-2 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-xs font-medium text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteAddToPortfolio}
                    className="flex-1 py-2 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium text-xs transition-colors"
                  >
                    Confirm &amp; Save Position
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
