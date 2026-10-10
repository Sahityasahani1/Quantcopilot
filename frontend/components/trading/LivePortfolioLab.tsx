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
  Download, 
  Sliders, 
  AlertCircle,
  FlaskConical,
  Zap,
  Globe,
  User,
  Save,
  DownloadCloud,
  FileSpreadsheet
} from "lucide-react";
import { LiveYfinanceQuote, LabPortfolioPosition } from "../../types";
import { getApiBaseUrl } from "../../lib/api";
import { LiveTickPrice } from "../common/LiveTickPrice";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { LivePortfolioCsvModal } from "./LivePortfolioCsvModal";


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
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "Financials" },
  { symbol: "MARUTI", name: "Maruti Suzuki India", sector: "Automotive" },
  { symbol: "SUNPHARMA", name: "Sun Pharma Industries", sector: "Pharma" },
  { symbol: "TITAN", name: "Titan Company Ltd", sector: "Consumer" },
  { symbol: "ZOMATO", name: "Zomato Ltd", sector: "Tech Platform" },
  { symbol: "TRENT", name: "Trent Ltd (Tata Retail)", sector: "Retail" }
];

const LOCAL_STORAGE_KEY = "quantcopilot_lab_portfolio_v1";

export const LivePortfolioLab: React.FC = () => {
  const { currentCustomer, portfolio, setIsCustomerLoginModalOpen, importPortfolioPositions, indianTickers } = usePortfolioStore();

  // Positions in custom lab
  const [positions, setPositions] = useState<LabPortfolioPosition[]>([]);
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);


  // Live quotes map fetched from yfinance
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveYfinanceQuote>>({});
  const [isQuotesLoading, setIsQuotesLoading] = useState(false);
  const [lastQuotesSync, setLastQuotesSync] = useState<Date | null>(null);

  // Stock picker state
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activePickerQuote, setActivePickerQuote] = useState<LiveYfinanceQuote | null>(null);
  const [isPickerQuoteLoading, setIsPickerQuoteLoading] = useState(false);

  // Trade form
  const [quantity, setQuantity] = useState<number>(50);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG");
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);

  // Auto-refresh timer
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(30); // seconds
  const [countdown, setCountdown] = useState<number>(30);

  // Load positions from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPositions(parsed);
        }
      }
    } catch {
      // Ignore storage error
    }
    setIsLoadedFromStorage(true);
  }, []);

  // Save positions to LocalStorage
  useEffect(() => {
    if (isLoadedFromStorage) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(positions));
      } catch {
        // Ignore storage error
      }
    }
  }, [positions, isLoadedFromStorage]);

  // Fetch live quote for picker whenever selectedSymbol changes
  const fetchPickerQuote = useCallback(async (sym: string) => {
    if (!sym) return;
    setIsPickerQuoteLoading(true);
    try {
      const cleanSym = sym.trim().toUpperCase();
      const res = await fetch(`${getApiBaseUrl()}/api/v1/portfolio/yfinance-quote/${cleanSym}`);
      if (res.ok) {
        const data: LiveYfinanceQuote = await res.json();
        setActivePickerQuote(data);
        // Default entry price to current live market price
        setEntryPrice(data.price);
      }
    } catch (err) {
      console.error("Failed to fetch picker live quote:", err);
    } finally {
      setIsPickerQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPickerQuote(selectedSymbol);
  }, [selectedSymbol, fetchPickerQuote]);

  // Batch fetch live quotes from yfinance for all portfolio positions
  const fetchPortfolioBatchQuotes = useCallback(async (posList: LabPortfolioPosition[]) => {
    if (posList.length === 0) return;
    setIsQuotesLoading(true);
    try {
      const symbols = Array.from(new Set(posList.map((p) => p.symbol)));
      const res = await fetch(`${getApiBaseUrl()}/api/v1/portfolio/yfinance-batch-quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quotes) {
          setLiveQuotes((prev) => ({ ...prev, ...data.quotes }));
          setLastQuotesSync(new Date());
        }
      }
    } catch (err) {
      console.error("Failed to fetch batch yfinance quotes:", err);
    } finally {
      setIsQuotesLoading(false);
    }
  }, []);

  // Sync batch quotes when positions change
  useEffect(() => {
    if (positions.length > 0) {
      fetchPortfolioBatchQuotes(positions);
    }
  }, [positions, fetchPortfolioBatchQuotes]);

  // Auto-refresh countdown loop
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (positions.length > 0) {
            fetchPortfolioBatchQuotes(positions);
          }
          if (selectedSymbol) {
            fetchPickerQuote(selectedSymbol);
          }
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, positions, selectedSymbol, fetchPortfolioBatchQuotes, fetchPickerQuote]);

  // Add position handler
  const handleAddPosition = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSymbol || quantity <= 0) return;
    const fallbackPrice = indianTickers[selectedSymbol]?.price || activePickerQuote?.price || 2400;
    const currentPriceToUse = entryPrice > 0 ? entryPrice : fallbackPrice;
    const matchedStock = POPULAR_NSE_TICKERS.find((t) => t.symbol === selectedSymbol);

    const newPos: LabPortfolioPosition = {
      id: `${selectedSymbol}-${Date.now()}`,
      symbol: selectedSymbol,
      company_name: matchedStock?.name || selectedSymbol,
      exchange: "NSE",
      quantity,
      entry_price: currentPriceToUse,
      side,
      added_at: new Date().toISOString()
    };

    // If already exists with same side, update quantity & avg price
    setPositions((prev) => {
      const existingIdx = prev.findIndex((p) => p.symbol === selectedSymbol && p.side === side);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const totalQty = existing.quantity + quantity;
        const avgPrice = Number(
          (((existing.entry_price * existing.quantity) + (currentPriceToUse * quantity)) / totalQty).toFixed(2)
        );
        const updated = [...prev];
        updated[existingIdx] = { ...existing, quantity: totalQty, entry_price: avgPrice };
        return updated;
      }
      return [newPos, ...prev];
    });

    setAddSuccessMessage(`Added ${quantity} qty of ${selectedSymbol} @ Rs ${currentPriceToUse}`);
    setTimeout(() => setAddSuccessMessage(null), 3000);
  };

  // Remove individual position
  const handleRemovePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  // Clear all positions (Clean slate)
  const handleClearAllPositions = () => {
    if (positions.length === 0) return;
    if (confirm("Clear all positions from Live Portfolio Lab to start with an empty slate?")) {
      setPositions([]);
      setLiveQuotes({});
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  };

  // Load sample starter portfolio
  const handleLoadSamplePositions = () => {
    const samples: LabPortfolioPosition[] = [
      { id: "s1", symbol: "RELIANCE", company_name: "Reliance Industries", exchange: "NSE", quantity: 50, entry_price: 1180.0, side: "LONG", added_at: new Date().toISOString() },
      { id: "s2", symbol: "TCS", company_name: "Tata Consultancy Services", exchange: "NSE", quantity: 30, entry_price: 2100.0, side: "LONG", added_at: new Date().toISOString() },
      { id: "s3", symbol: "INFY", company_name: "Infosys Ltd", exchange: "NSE", quantity: 60, entry_price: 1015.0, side: "LONG", added_at: new Date().toISOString() },
      { id: "s4", symbol: "TATAMOTORS", company_name: "Tata Motors Ltd", exchange: "NSE", quantity: 100, entry_price: 1040.0, side: "LONG", added_at: new Date().toISOString() }
    ];
    setPositions(samples);
  };

  // Load positions from active Customer Account
  const handleLoadCustomerPositions = () => {
    if (portfolio.positions.length === 0) {
      setAddSuccessMessage("Active customer portfolio has no positions. Add positions below or switch account.");
      setTimeout(() => setAddSuccessMessage(null), 3000);
      return;
    }
    const loaded: LabPortfolioPosition[] = portfolio.positions.map((p, idx) => ({
      id: `cust_${p.symbol}_${idx}`,
      symbol: p.symbol,
      company_name: p.symbol,
      exchange: "NSE",
      quantity: p.quantity,
      entry_price: p.entry_price,
      side: p.side,
      added_at: new Date().toISOString()
    }));
    setPositions(loaded);
    setAddSuccessMessage(`Loaded ${loaded.length} positions from ${currentCustomer?.name || 'Customer'} portfolio.`);
    setTimeout(() => setAddSuccessMessage(null), 3000);
  };

  // Save current Lab positions into persistent Customer Database
  const handleSaveToCustomerAccount = () => {
    if (positions.length === 0) return;
    const posInputs = positions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      entry_price: p.entry_price,
      side: p.side
    }));
    importPortfolioPositions(posInputs);
    setAddSuccessMessage(`Saved ${positions.length} positions to ${currentCustomer?.name || 'Customer'} custom database!`);
    setTimeout(() => setAddSuccessMessage(null), 3000);
  };


  // Compute portfolio valuation with live quotes
  const portfolioMetrics = useMemo(() => {
    let totalInvested = 0;
    let totalCurrent = 0;
    let totalDayChange = 0;
    let totalUnrealizedPnl = 0;

    const computedPositions = positions.map((p) => {
      const quote = liveQuotes[p.symbol];
      const livePrice = quote?.price || p.entry_price;
      const prevClose = quote?.prev_close || livePrice;

      const mult = p.side === "LONG" ? 1 : -1;
      const investedValue = p.quantity * p.entry_price;
      const currentValue = p.quantity * livePrice;
      const unrealizedPnl = (currentValue - investedValue) * mult;
      const pnlPct = investedValue > 0 ? (unrealizedPnl / investedValue) * 100 : 0;
      const dayChangeVal = (livePrice - prevClose) * p.quantity * mult;

      totalInvested += investedValue;
      totalCurrent += currentValue;
      totalDayChange += dayChangeVal;
      totalUnrealizedPnl += unrealizedPnl;

      return {
        ...p,
        livePrice,
        prevClose,
        investedValue,
        currentValue,
        unrealizedPnl,
        pnlPct,
        dayChangeVal,
        change24hPct: quote?.change_pct || 0,
        dayHigh: quote?.day_high,
        dayLow: quote?.day_low,
        volume: quote?.volume || 0,
        marketCapCr: quote?.market_cap_cr || 0
      };
    });

    const netUnrealizedPnl = totalUnrealizedPnl;
    const netReturnPct = totalInvested > 0 ? (netUnrealizedPnl / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrent,
      netUnrealizedPnl,
      netReturnPct,
      totalDayChange,
      positionsWithLive: computedPositions
    };
  }, [positions, liveQuotes]);

  // Handle import from CSV modal
  const handleImportFromCsv = (importedList: LabPortfolioPosition[], mode: "replace" | "append") => {
    if (importedList.length === 0) return;

    if (mode === "replace") {
      setPositions(importedList);
      fetchPortfolioBatchQuotes(importedList);
      setAddSuccessMessage(`Imported ${importedList.length} positions from CSV! Streaming live Yahoo Finance quotes...`);
    } else {
      // Append mode: merge into existing positions
      setPositions((prev) => {
        const updated = [...prev];
        for (const item of importedList) {
          const existingIdx = updated.findIndex((p) => p.symbol === item.symbol && p.side === item.side);
          if (existingIdx >= 0) {
            const existing = updated[existingIdx];
            const totalQty = existing.quantity + item.quantity;
            const avgPrice = Number(
              (((existing.entry_price * existing.quantity) + (item.entry_price * item.quantity)) / totalQty).toFixed(2)
            );
            updated[existingIdx] = { ...existing, quantity: totalQty, entry_price: avgPrice };
          } else {
            updated.unshift(item);
          }
        }
        return updated;
      });
      fetchPortfolioBatchQuotes([...importedList, ...positions]);
      setAddSuccessMessage(`Appended ${importedList.length} positions from CSV! Streaming live Yahoo Finance quotes...`);
    }

    setTimeout(() => setAddSuccessMessage(null), 4000);
  };

  // Export current positions to CSV
  const handleExportToCsv = () => {
    if (positions.length === 0) return;

    const headers = [
      "symbol",
      "company_name",
      "exchange",
      "side",
      "quantity",
      "entry_price",
      "live_ltp",
      "invested_value",
      "current_value",
      "unrealized_pnl",
      "unrealized_pnl_pct",
      "added_at"
    ];
    
    const rows = portfolioMetrics.positionsWithLive.map(p => [
      p.symbol,
      `"${(p.company_name || p.symbol).replace(/"/g, '""')}"`,
      p.exchange || "NSE",
      p.side,
      p.quantity,
      p.entry_price,
      p.livePrice,
      p.investedValue.toFixed(2),
      p.currentValue.toFixed(2),
      p.unrealizedPnl.toFixed(2),
      p.pnlPct.toFixed(2),
      p.added_at
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quantcopilot_live_portfolio_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered popular tickers for search
  const filteredTickers = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_NSE_TICKERS;
    const q = searchQuery.trim().toUpperCase();
    return POPULAR_NSE_TICKERS.filter(
      (t) => t.symbol.includes(q) || t.name.toUpperCase().includes(q) || t.sector.toUpperCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-[#F2F0E8] font-sans pb-16">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.065] pb-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <span className="p-1.5 rounded-sm bg-[#0C100F] border border-white/[0.065] text-[#159570]">
              <FlaskConical className="h-4 w-4" />
            </span>
            <span className="text-[10px] font-mono text-[#159570] font-semibold tracking-wider uppercase">
              SANDBOX &amp; PORTFOLIO LAB
            </span>
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-[#161C19] text-[#A7ADA8] border border-white/[0.065] uppercase">
              YAHOO FINANCE DIRECT (.NS)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-[#F2F0E8] uppercase">
            LIVE PORTFOLIO LAB
          </h2>
          <p className="text-xs text-[#A7ADA8] font-sans mt-0.5 max-w-3xl">
            Clean-slate quantitative experimentation sandbox. Choose equities at their current market value, eliminate pre-loaded positions, and monitor positions streaming directly from Yahoo Finance (.NS).
          </p>
        </div>

        {/* Live Status Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2 bg-[#111614] border border-white/[0.065] rounded-sm px-2.5 py-1.5 shadow-sm">
            <Globe className="h-3.5 w-3.5 text-[#159570]" />
            <span className="text-[#F2F0E8] font-medium text-[11px]">FEED: YFINANCE LIVE</span>
          </div>

          <div className="flex items-center space-x-2 bg-[#111614] border border-white/[0.065] rounded-sm px-2.5 py-1.5 shadow-sm">
            <Clock className="h-3.5 w-3.5 text-[#68716C]" />
            <span className="text-[#A7ADA8] text-[11px]">
              {lastQuotesSync ? `SYNCED: ${lastQuotesSync.toLocaleTimeString()}` : "CONNECTING..."}
            </span>
          </div>

          <button
            onClick={() => {
              if (positions.length > 0) fetchPortfolioBatchQuotes(positions);
              if (selectedSymbol) fetchPickerQuote(selectedSymbol);
              setCountdown(autoRefreshInterval);
            }}
            disabled={isQuotesLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#F2F0E8] border border-white/[0.065] font-sans font-medium text-xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isQuotesLoading ? "animate-spin text-[#159570]" : "text-[#A7ADA8]"}`} />
            <span>REFRESH ({countdown}s)</span>
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-sans font-medium text-xs transition-colors shadow-sm"
            title="Import stock positions from CSV or Excel file and inspect row data"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>IMPORT CSV</span>
          </button>

          <button
            onClick={handleExportToCsv}
            disabled={positions.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#F2F0E8] border border-white/[0.065] font-sans font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export active portfolio positions and live MTM metrics to CSV file"
          >
            <Download className="h-3 w-3 text-[#159570]" />
            <span>EXPORT CSV</span>
          </button>

          <button
            onClick={handleLoadCustomerPositions}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#F2F0E8] border border-white/[0.065] font-sans font-medium text-xs transition-colors"
            title="Load holdings from active customer database profile"
          >
            <DownloadCloud className="h-3 w-3 text-[#159570]" />
            <span>LOAD FROM {currentCustomer ? currentCustomer.name.split(" ")[0].toUpperCase() : "CUSTOMER"}</span>
          </button>

          <button
            onClick={handleSaveToCustomerAccount}
            disabled={positions.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#159570]/15 hover:bg-[#159570]/25 text-[#42A77A] border border-[#159570]/30 font-sans font-medium text-xs transition-colors disabled:opacity-40"
            title="Save current lab positions to customer database"
          >
            <Save className="h-3 w-3" />
            <span>SAVE TO DB</span>
          </button>

          <button
            onClick={handleClearAllPositions}
            disabled={positions.length === 0}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#C45D62]/10 hover:bg-[#C45D62]/20 text-[#C45D62] border border-[#C45D62]/25 font-sans font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Remove all positions to start with a clean slate"
          >
            <Trash2 className="h-3 w-3" />
            <span>CLEAR ALL</span>
          </button>
        </div>
      </div>

      {/* Aggregate Portfolio KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 shadow-sm">
          <div className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider flex items-center justify-between">
            <span>Invested Capital</span>
            <Layers className="h-3.5 w-3.5 text-[#68716C]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#F2F0E8] tabular-nums">
            <LiveTickPrice
              value={portfolioMetrics.totalInvested}
              prefix="₹"
              formatter={(v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
            />
          </div>
          <div className="mt-1 text-xs text-[#68716C] font-sans">
            {positions.length} Active Position{positions.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 shadow-sm">
          <div className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider flex items-center justify-between">
            <span>Live Market Valuation</span>
            <Zap className="h-3.5 w-3.5 text-[#159570]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#F2F0E8] tabular-nums">
            <LiveTickPrice
              value={portfolioMetrics.totalCurrent}
              prefix="₹"
              formatter={(v) => `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
            />
          </div>
          <div className="mt-1 text-xs text-[#68716C] font-sans">
            Real-time Mark-to-Market
          </div>
        </div>

        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 shadow-sm">
          <div className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider flex items-center justify-between">
            <span>Total Unrealized P&amp;L</span>
            {portfolioMetrics.netUnrealizedPnl >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-[#42A77A]" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-[#C45D62]" />
            )}
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums flex items-center space-x-1">
            <LiveTickPrice
              value={portfolioMetrics.netUnrealizedPnl}
              formatter={(v) => `${Number(v) >= 0 ? "+" : ""}₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              colorize={true}
              showDirectionIcon={true}
            />
          </div>
          <div className="mt-1 text-xs font-mono tabular-nums">
            <LiveTickPrice
              value={portfolioMetrics.netReturnPct}
              formatter={(v) => `${Number(v) >= 0 ? "+" : ""}${Number(v).toFixed(2)}% Overall`}
              colorize={true}
              className="font-medium text-xs font-mono"
            />
          </div>
        </div>

        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 shadow-sm">
          <div className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider flex items-center justify-between">
            <span>Today&#39;s Day P&amp;L</span>
            <Activity className="h-3.5 w-3.5 text-[#68716C]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tabular-nums">
            <LiveTickPrice
              value={portfolioMetrics.totalDayChange}
              formatter={(v) => `${Number(v) >= 0 ? "+" : ""}₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
              colorize={true}
            />
          </div>
          <div className="mt-1 text-xs text-[#68716C] font-sans">
            Source: yfinance (.NS) Close
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Stock Selector & Live Market Value Card; Right = User Portfolio Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stock Selector & Live Value Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-3">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-[#159570]" />
                <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-[#F2F0E8]">
                  CHOOSE STOCK &amp; LIVE VALUE
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#161C19] text-[#A7ADA8] border border-white/[0.065]">
                NSE / BSE
              </span>
            </div>

            {/* Custom Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search symbol (e.g. RELIANCE, ZOMATO)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    setSelectedSymbol(searchQuery.trim().toUpperCase());
                  }
                }}
                className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-2 text-xs font-mono text-[#F2F0E8] placeholder:text-[#68716C] focus:outline-none focus:border-[#159570] uppercase transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      setSelectedSymbol(searchQuery.trim().toUpperCase());
                    }
                  }}
                  className="absolute right-2 top-2 px-2 py-0.5 rounded-sm text-[10px] font-sans font-medium bg-[#161C19] text-[#F2F0E8] border border-white/[0.065] hover:bg-[#1B2420]"
                >
                  LOAD
                </button>
              )}
            </div>

            {/* Quick-Pick Popular Stock Pills */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider block">
                Quick Select Popular Equities:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredTickers.map((t) => {
                  const isSelected = selectedSymbol === t.symbol;
                  return (
                    <button
                      key={t.symbol}
                      onClick={() => {
                        setSelectedSymbol(t.symbol);
                        setSearchQuery("");
                      }}
                      className={`px-2.5 py-1 rounded-sm text-xs font-mono transition-all ${
                        isSelected
                          ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30 font-semibold shadow-sm"
                          : "bg-[#0C100F] text-[#A7ADA8] border border-white/[0.065] hover:border-white/[0.12] hover:text-[#F2F0E8]"
                      }`}
                    >
                      {t.symbol}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Current Market Value Display Card */}
            <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-base font-bold font-mono text-[#F2F0E8] tracking-wide">
                    {selectedSymbol}
                  </span>
                  <span className="text-[11px] font-sans text-[#A7ADA8] block">
                    {activePickerQuote?.company_name || selectedSymbol} (NSE)
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider">Feed Source</div>
                  <span className="text-[10px] font-mono text-[#159570] font-semibold">
                    Yahoo Finance (.NS)
                  </span>
                </div>
              </div>

              {isPickerQuoteLoading ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="h-4 w-4 text-[#159570] animate-spin" />
                  <span className="text-xs font-sans text-[#A7ADA8]">Fetching live market value...</span>
                </div>
              ) : activePickerQuote ? (
                <div className="space-y-3 pt-1">
                  {/* Big Live Price */}
                  <div className="flex items-baseline justify-between border-b border-white/[0.065] pb-2.5">
                    <div>
                      <span className="text-2xl font-bold font-mono text-[#F2F0E8] tabular-nums">
                        ₹{activePickerQuote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div
                      className={`flex items-center space-x-1 text-xs font-mono font-medium px-2 py-0.5 rounded-sm tabular-nums ${
                        activePickerQuote.change_pct >= 0
                          ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30"
                          : "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25"
                      }`}
                    >
                      {activePickerQuote.change_pct >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      <span>
                        {activePickerQuote.change_pct >= 0 ? "+" : ""}
                        {activePickerQuote.change_pct.toFixed(2)}% (₹{activePickerQuote.change_pts})
                      </span>
                    </div>
                  </div>

                  {/* Day Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#161C19] p-2 rounded-sm border border-white/[0.04]">
                      <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Day Range</span>
                      <span className="text-[#F2F0E8] font-mono font-medium tabular-nums">
                        ₹{activePickerQuote.day_low} - ₹{activePickerQuote.day_high}
                      </span>
                    </div>
                    <div className="bg-[#161C19] p-2 rounded-sm border border-white/[0.04]">
                      <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">52-Week Range</span>
                      <span className="text-[#F2F0E8] font-mono font-medium tabular-nums">
                        ₹{activePickerQuote.fifty_two_week_low || "N/A"} - ₹{activePickerQuote.fifty_two_week_high || "N/A"}
                      </span>
                    </div>
                    <div className="bg-[#161C19] p-2 rounded-sm border border-white/[0.04]">
                      <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Day Volume</span>
                      <span className="text-[#F2F0E8] font-mono font-medium tabular-nums">
                        {activePickerQuote.volume.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="bg-[#161C19] p-2 rounded-sm border border-white/[0.04]">
                      <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Market Cap</span>
                      <span className="text-[#F2F0E8] font-mono font-medium tabular-nums">
                        {activePickerQuote.market_cap_cr
                          ? `₹${activePickerQuote.market_cap_cr.toLocaleString("en-IN")} Cr`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[#68716C] font-sans">
                  Select a ticker to inspect live price
                </div>
              )}
            </div>

            {/* Position Trade Input Form */}
            <form onSubmit={handleAddPosition} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider block mb-1">
                    Side
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-[#0C100F] p-1 rounded-sm border border-white/[0.065]">
                    <button
                      type="button"
                      onClick={() => setSide("LONG")}
                      className={`py-1 text-xs font-mono font-medium rounded-sm transition-colors ${
                        side === "LONG"
                          ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30"
                          : "text-[#A7ADA8] hover:text-[#F2F0E8]"
                      }`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide("SHORT")}
                      className={`py-1 text-xs font-mono font-medium rounded-sm transition-colors ${
                        side === "SHORT"
                          ? "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25"
                          : "text-[#A7ADA8] hover:text-[#F2F0E8]"
                      }`}
                    >
                      SELL / SHORT
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-1.5 text-xs font-mono tabular-nums text-[#F2F0E8] focus:outline-none focus:border-[#159570]"
                  />
                </div>
              </div>

              {/* Quick Qty Preset Chips */}
              <div className="flex items-center space-x-1">
                <span className="text-[10px] font-sans text-[#68716C] mr-1">Presets:</span>
                {[10, 25, 50, 100, 250].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuantity(q)}
                    className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-[#0C100F] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] hover:border-white/[0.12] transition-colors"
                  >
                    +{q}
                  </button>
                ))}
              </div>

              {/* Entry Price (Pre-filled with Live Market Value) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
                    Entry Price (₹)
                  </label>
                  {activePickerQuote && (
                    <button
                      type="button"
                      onClick={() => setEntryPrice(activePickerQuote.price)}
                      className="text-[10px] font-mono text-[#159570] hover:text-[#42A77A] hover:underline"
                    >
                      Use Live LTP (₹{activePickerQuote.price})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.05"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm px-3 py-1.5 text-xs font-mono tabular-nums text-[#F2F0E8] focus:outline-none focus:border-[#159570]"
                />
              </div>

              {/* Add Button */}
              <button
                type="submit"
                disabled={!selectedSymbol || quantity <= 0}
                className="w-full py-2.5 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-sans font-medium text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>ADD TO LIVE PORTFOLIO</span>
              </button>

              {addSuccessMessage && (
                <div className="p-2 rounded-sm bg-[#159570]/10 border border-[#159570]/30 text-xs font-mono text-[#42A77A] flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-[#42A77A] flex-shrink-0" />
                  <span>{addSuccessMessage}</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: User's Custom Portfolio Positions Table (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.065] pb-3">
              <div>
                <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-[#F2F0E8] flex items-center space-x-2">
                  <span>ACTIVE LAB PORTFOLIO</span>
                  <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-[#161C19] text-[#A7ADA8] border border-white/[0.065]">
                    {positions.length} STOCKS
                  </span>
                </h3>
                <p className="text-xs text-[#A7ADA8] font-sans mt-0.5">
                  Data streaming live from Yahoo Finance (.NS) for mark-to-market execution
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsCsvModalOpen(true)}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-sm bg-[#159570]/15 hover:bg-[#159570]/25 text-[#42A77A] border border-[#159570]/30 text-xs font-sans font-medium transition-colors"
                  title="Import CSV or Excel file and inspect row data"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Import CSV</span>
                </button>
                {positions.length > 0 && (
                  <button
                    onClick={handleExportToCsv}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] text-xs font-sans font-medium transition-colors"
                    title="Export active positions to CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV</span>
                  </button>
                )}
                {positions.length === 0 && (
                  <button
                    onClick={handleLoadSamplePositions}
                    className="px-3 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#F2F0E8] border border-white/[0.065] text-xs font-sans font-medium transition-colors"
                  >
                    Load Sample Equities
                  </button>
                )}
                {positions.length > 0 && (
                  <button
                    onClick={handleClearAllPositions}
                    className="px-3 py-1.5 rounded-sm bg-[#C45D62]/10 hover:bg-[#C45D62]/20 text-[#C45D62] border border-[#C45D62]/25 text-xs font-sans font-medium transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Position Table or Clean Slate Screen */}
            {positions.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-white/[0.08] rounded-sm bg-[#0C100F] p-8 space-y-4">
                <div className="w-10 h-10 rounded-sm bg-[#161C19] border border-white/[0.065] flex items-center justify-center mx-auto text-[#159570]">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold font-sans text-[#F2F0E8] uppercase tracking-wider">
                    EMPTY LAB SANDBOX - CLEAN SLATE
                  </h4>
                  <p className="text-xs text-[#A7ADA8] font-sans max-w-md mx-auto">
                    Pre-added mock positions have been removed. Choose stocks on the left at their live current market value from Yahoo Finance, or upload a CSV file to build your custom portfolio.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-2.5">
                  <button
                    onClick={() => setIsCsvModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] text-xs font-medium font-sans transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>Import Portfolio CSV / Excel</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSymbol("RELIANCE");
                      fetchPickerQuote("RELIANCE");
                    }}
                    className="px-3.5 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#F2F0E8] border border-white/[0.08] text-xs font-medium font-sans transition-colors"
                  >
                    Choose RELIANCE (₹{activePickerQuote?.price || 1186})
                  </button>
                  <button
                    onClick={handleLoadSamplePositions}
                    className="px-3.5 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] text-xs font-sans font-medium transition-colors"
                  >
                    Load 4 Sample Equities
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/[0.065] rounded-sm bg-[#0C100F]/60">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="bg-[#0C100F] text-[#A7ADA8] border-b border-white/[0.065] text-[10px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Asset</th>
                      <th className="py-2.5 px-3">Side</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Entry (₹)</th>
                      <th className="py-2.5 px-3 text-right">Live LTP (₹)</th>
                      <th className="py-2.5 px-3 text-right">Invested</th>
                      <th className="py-2.5 px-3 text-right">Current Value</th>
                      <th className="py-2.5 px-3 text-right">Unrealized P&amp;L</th>
                      <th className="py-2.5 px-3 text-right">Day Chg</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {portfolioMetrics.positionsWithLive.map((pos) => {
                      const isProfit = pos.unrealizedPnl >= 0;
                      return (
                        <tr
                          key={pos.id}
                          className="hover:bg-[#161C19] transition-colors group"
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#F2F0E8] font-mono flex items-center space-x-1.5">
                              <span>{pos.symbol}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded-sm bg-[#161C19] text-[#A7ADA8] border border-white/[0.065] font-sans">
                                .NS
                              </span>
                            </div>
                            <span className="text-[11px] text-[#A7ADA8] block truncate max-w-[130px] font-sans">
                              {pos.company_name || pos.symbol}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono font-medium ${
                                pos.side === "LONG"
                                  ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30"
                                  : "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25"
                              }`}
                            >
                              {pos.side}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#F2F0E8] tabular-nums">
                            {pos.quantity}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#A7ADA8] tabular-nums">
                            ₹{pos.entry_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-[#F2F0E8] tabular-nums">
                            <LiveTickPrice value={pos.livePrice} prefix="₹" />
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#A7ADA8] tabular-nums">
                            ₹{pos.investedValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-[#F2F0E8] tabular-nums">
                            <LiveTickPrice value={pos.currentValue} prefix="₹" />
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <div className="font-semibold">
                              <LiveTickPrice
                                value={pos.unrealizedPnl}
                                formatter={(v) => `${Number(v) >= 0 ? "+" : ""}₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                                colorize={true}
                                showDirectionIcon={true}
                              />
                            </div>
                            <div
                              className={`text-[10px] ${
                                isProfit ? "text-[#42A77A]" : "text-[#C45D62]"
                              }`}
                            >
                              {pos.pnlPct >= 0 ? "+" : ""}
                              {pos.pnlPct.toFixed(2)}%
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            <span
                              className={`text-xs ${
                                pos.change24hPct >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"
                              }`}
                            >
                              {pos.change24hPct >= 0 ? "+" : ""}
                              {pos.change24hPct.toFixed(2)}%
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleRemovePosition(pos.id)}
                              className="p-1 rounded-sm text-[#68716C] hover:text-[#C45D62] hover:bg-[#C45D62]/10 transition-colors"
                              title="Remove position"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Footer Info */}
            {positions.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-sans text-[#68716C] pt-3 border-t border-white/[0.065]">
                <div className="flex items-center space-x-2">
                  <Check className="h-3.5 w-3.5 text-[#159570]" />
                  <span>
                    Auto-persisted to Local Storage. Live prices query Yahoo Finance API (.NS) with zero mock latency.
                  </span>
                </div>
                <div className="mt-1 sm:mt-0 text-[#A7ADA8] font-mono tabular-nums">
                  Total Exposure: ₹{portfolioMetrics.totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            )}
          </div>

          {/* Allocation & Risk Breakdown Bar */}
          {positions.length > 0 && (
            <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 md:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="font-semibold uppercase tracking-wider text-[#F2F0E8]">
                  PORTFOLIO ALLOCATION BREAKDOWN
                </span>
                <span className="text-[#68716C] font-mono">100% Total Capital</span>
              </div>

              {/* Progress Bar (Restrained Luxury Palette) */}
              <div className="w-full h-2 rounded-sm overflow-hidden flex bg-white/[0.06]">
                {portfolioMetrics.positionsWithLive.map((pos, idx) => {
                  const weight = portfolioMetrics.totalCurrent > 0 
                    ? (pos.currentValue / portfolioMetrics.totalCurrent) * 100 
                    : 0;
                  const paletteColors = [
                    "bg-[#159570]",
                    "bg-[#42A77A]",
                    "bg-[#C8A96B]",
                    "bg-[#0E6B50]",
                    "bg-[#B89655]",
                    "bg-[#7D8782]"
                  ];
                  const color = paletteColors[idx % paletteColors.length];
                  return (
                    <div
                      key={pos.id}
                      style={{ width: `${weight}%` }}
                      className={`${color} h-full transition-all`}
                      title={`${pos.symbol}: ${weight.toFixed(1)}%`}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-1 text-xs">
                {portfolioMetrics.positionsWithLive.map((pos, idx) => {
                  const weight = portfolioMetrics.totalCurrent > 0 
                    ? (pos.currentValue / portfolioMetrics.totalCurrent) * 100 
                    : 0;
                  const paletteTextColors = [
                    "text-[#159570]",
                    "text-[#42A77A]",
                    "text-[#C8A96B]",
                    "text-[#0E6B50]",
                    "text-[#B89655]",
                    "text-[#7D8782]"
                  ];
                  const color = paletteTextColors[idx % paletteTextColors.length];
                  return (
                    <div key={pos.id} className="flex items-center space-x-1 font-mono text-[11px] tabular-nums">
                      <span className={`font-semibold ${color}`}>{pos.symbol}:</span>
                      <span className="text-[#A7ADA8]">{weight.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive CSV / Excel Upload & Data Inspection Modal */}
      <LivePortfolioCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportPositions={handleImportFromCsv}
        currentPositionsCount={positions.length}
      />
    </div>
  );
};
