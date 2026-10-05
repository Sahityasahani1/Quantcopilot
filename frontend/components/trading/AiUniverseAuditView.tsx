"use client";

import React, { useState, useEffect } from "react";
import { 
  UniverseAuditResponse, 
  AssetAuditItem 
} from "../../types";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  FileText, 
  Cpu, 
  RefreshCw, 
  AlertTriangle,
  BarChart3,
  Search,
  X
} from "lucide-react";
import { getApiBaseUrl } from "../../lib/api";

interface AiUniverseAuditViewProps {
  onOpenOrderModal?: (symbol: string, side: "BUY" | "SELL") => void;
}

export const AiUniverseAuditView: React.FC<AiUniverseAuditViewProps> = ({ onOpenOrderModal }) => {
  const [auditData, setAuditData] = useState<UniverseAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<"ALL" | "STOCK" | "INDEX_FUND">("ALL");
  const [selectedStance, setSelectedStance] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("EXPECTED_RETURN");
  const [viewMode, setViewMode] = useState<"GRID" | "MATRIX">("GRID");

  // Selected item for deep-dive drawer
  const [selectedItem, setSelectedItem] = useState<AssetAuditItem | null>(null);

  const fetchAuditData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `${getApiBaseUrl()}/api/v1/fno/ai-universe-audit?asset_type=${selectedAssetType}&sort_by=${sortBy}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Audit server returned HTTP ${res.status}`);
      }
      const data: UniverseAuditResponse = await res.json();
      setAuditData(data);
      if (selectedItem) {
        const updated = data.items.find(it => it.symbol === selectedItem.symbol);
        if (updated) setSelectedItem(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load AI universe audit";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedAssetType, sortBy]);

  // Client-side search and stance filtering
  const filteredItems = (auditData?.items || []).filter((item) => {
    const matchesSearch = 
      item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sector.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStance = 
      selectedStance === "ALL" || 
      item.future_prediction.dominant_stance === selectedStance;

    return matchesSearch && matchesStance;
  });

  const getStanceBadge = (stance: string) => {
    switch (stance) {
      case "STRONG_BULLISH":
        return "bg-[#159570]/15 text-[#42A77A] border-[#159570]/30";
      case "MODERATE_BULLISH":
        return "bg-[#159570]/10 text-[#42A77A] border-[#159570]/20";
      case "ACCUMULATION_NEUTRAL":
        return "bg-[#C8A96B]/10 text-[#C8A96B] border-[#C8A96B]/25";
      case "DEFENSIVE_BEARISH":
        return "bg-[#C45D62]/10 text-[#C45D62] border-[#C45D62]/25";
      default:
        return "bg-white/[0.04] text-[#A7ADA8] border-white/[0.08]";
    }
  };

  const getPolicyStanceBadge = (stance: string) => {
    switch (stance) {
      case "TAILWIND":
        return "bg-[#159570]/10 text-[#42A77A] border-[#159570]/25";
      case "HEADWIND":
        return "bg-[#C45D62]/10 text-[#C45D62] border-[#C45D62]/25";
      default:
        return "bg-white/[0.04] text-[#A7ADA8] border-white/[0.08]";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans select-none text-[#F2F0E8] pb-16">
      {/* Top Banner: Header & Macro Overview */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 md:p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="h-6 w-6 rounded-sm bg-[#161C19] border border-white/[0.065] flex items-center justify-center text-[#159570]">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <span className="text-[10px] font-mono text-[#159570] font-medium tracking-wider uppercase">
                MULTI-ASSET PREDICTIVE INTELLIGENCE
              </span>
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-[#161C19] text-[#A7ADA8] border border-white/[0.065] uppercase">
                MULTI-ASSET
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold font-sans tracking-tight text-[#F2F0E8] uppercase">
              AI UNIVERSE AUDIT &amp; PREDICTIVE FORECASTING ENGINE
            </h2>
            <p className="text-xs text-[#A7ADA8] font-sans max-w-3xl leading-relaxed">
              Continuous multi-factor audit across Indian equities and benchmark index funds. 
              Synthesizes historical price microstructure, 52-week volatility envelopes, and live 
              SEBI / Indian Government regulatory policy tailwinds into 14-day forward predictive trajectories.
            </p>
          </div>

          {/* Quick Refresh Button */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={fetchAuditData}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-[#161C19] hover:bg-[#1B2420] text-[#F2F0E8] border border-white/[0.065] font-sans font-medium px-3.5 py-2 rounded-sm text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#159570]" : "text-[#68716C]"}`} />
              <span>{isLoading ? "Running Audit..." : "Refresh Universe Audit"}</span>
            </button>
          </div>
        </div>

        {/* Macro Stat Cards */}
        {auditData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-white/[0.065]">
            <div className="bg-[#161C19] border border-white/[0.065] rounded-sm p-3">
              <span className="text-[10px] text-[#68716C] uppercase font-medium block mb-1">Assets Audited</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-semibold font-mono text-[#F2F0E8] tabular-nums">{auditData.total_assets}</span>
                <span className="text-xs text-[#A7ADA8] font-mono">
                  {auditData.stocks_count} Stocks &bull; {auditData.index_funds_count} Funds
                </span>
              </div>
            </div>

            <div className="bg-[#161C19] border border-white/[0.065] rounded-sm p-3">
              <span className="text-[10px] text-[#68716C] uppercase font-medium block mb-1">Dominant Stance</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-semibold font-mono text-[#42A77A] tabular-nums">{auditData.bullish_count} Bullish</span>
                <span className="text-xs text-[#A7ADA8] font-mono">
                  {auditData.neutral_count} Neutral
                </span>
              </div>
            </div>

            <div className="bg-[#161C19] border border-white/[0.065] rounded-sm p-3">
              <span className="text-[10px] text-[#68716C] uppercase font-medium block mb-1">Top Policy Tailwind</span>
              <div className="text-xs font-medium text-[#C8A96B] truncate" title={auditData.top_policy_tailwind}>
                Green Energy &amp; EV PLI
              </div>
              <span className="text-[11px] text-[#68716C] block mt-0.5">MNRE / MoRTH Incentives</span>
            </div>

            <div className="bg-[#161C19] border border-white/[0.065] rounded-sm p-3">
              <span className="text-[10px] text-[#68716C] uppercase font-medium block mb-1">Forecast Horizon</span>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-semibold font-mono text-[#F2F0E8] tabular-nums">14 Days</span>
                <span className="text-xs text-[#68716C] font-sans">Multi-Quantile</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter & Controls Toolbar */}
      <div className="bg-[#161C19] border border-white/[0.065] rounded-sm p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search & Asset Type Tabs */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#68716C]" />
            <input
              type="text"
              placeholder="Filter ticker, name, sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#111614] border border-white/[0.065] rounded-sm pl-8 pr-3 py-1.5 text-xs text-[#F2F0E8] placeholder:text-[#68716C] focus:outline-none focus:border-white/[0.15] transition-colors w-48 sm:w-60 font-sans"
            />
          </div>

          {/* Asset Type Toggle */}
          <div className="flex items-center bg-[#111614] border border-white/[0.065] rounded-sm p-0.5 text-xs">
            <button
              onClick={() => setSelectedAssetType("ALL")}
              className={`px-3 py-1 rounded-sm font-medium transition-all ${
                selectedAssetType === "ALL"
                  ? "bg-[#1B2420] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              All Assets ({auditData?.total_assets || 16})
            </button>
            <button
              onClick={() => setSelectedAssetType("STOCK")}
              className={`px-3 py-1 rounded-sm font-medium transition-all ${
                selectedAssetType === "STOCK"
                  ? "bg-[#1B2420] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Stocks ({auditData?.stocks_count || 10})
            </button>
            <button
              onClick={() => setSelectedAssetType("INDEX_FUND")}
              className={`px-3 py-1 rounded-sm font-medium transition-all ${
                selectedAssetType === "INDEX_FUND"
                  ? "bg-[#1B2420] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Index Funds ({auditData?.index_funds_count || 6})
            </button>
          </div>
        </div>

        {/* Right: Sort By, Stance Filter & View Mode */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Stance Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[#A7ADA8] text-xs">Stance:</span>
            <select
              value={selectedStance}
              onChange={(e) => setSelectedStance(e.target.value)}
              className="bg-[#111614] border border-white/[0.065] rounded-sm px-2.5 py-1.5 text-xs text-[#F2F0E8] focus:outline-none focus:border-white/[0.15] font-sans"
            >
              <option value="ALL">All Stances</option>
              <option value="STRONG_BULLISH">Strong Bullish</option>
              <option value="MODERATE_BULLISH">Moderate Bullish</option>
              <option value="ACCUMULATION_NEUTRAL">Accumulation / Neutral</option>
              <option value="DEFENSIVE_BEARISH">Defensive / Bearish</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[#A7ADA8] text-xs">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#111614] border border-white/[0.065] rounded-sm px-2.5 py-1.5 text-xs text-[#F2F0E8] focus:outline-none focus:border-white/[0.15] font-sans"
            >
              <option value="EXPECTED_RETURN">Expected Return %</option>
              <option value="POLICY_RISK">Policy Risk Score</option>
              <option value="RSI">RSI (14)</option>
              <option value="MARKET_CAP">Market Cap / AUM</option>
              <option value="DAY_CHANGE">Day Change %</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#111614] border border-white/[0.065] rounded-sm p-0.5">
            <button
              onClick={() => setViewMode("GRID")}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                viewMode === "GRID"
                  ? "bg-[#161C19] text-[#F2F0E8]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("MATRIX")}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                viewMode === "MATRIX"
                  ? "bg-[#161C19] text-[#F2F0E8]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && !auditData && (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Cpu className="h-8 w-8 text-[#159570] animate-spin" />
          <div className="text-sm font-medium text-[#F2F0E8]">
            Running Algorithmic Audit &amp; Policy Alignment across Universe...
          </div>
          <p className="text-xs text-[#A7ADA8]">
            Ingesting historical price action, RSI metrics, and SEBI regulatory circulars
          </p>
        </div>
      )}

      {error && !auditData && (
        <div className="p-4 bg-[#C45D62]/10 border border-[#C45D62]/25 rounded-sm text-xs text-[#C45D62] flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#C45D62]" />
          <span>Error loading AI Universe Audit: {error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {auditData && (
        <div key={viewMode}>
          {viewMode === "GRID" ? (
            /* ==================== CARD GRID VIEW ==================== */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const isPositiveDay = item.day_change >= 0;
                const isPositiveExp = item.future_prediction.expected_return_pct >= 0;

                return (
                  <div
                    key={item.symbol}
                    className="bg-[#111614] border border-white/[0.065] hover:border-white/[0.12] rounded-sm p-5 transition-colors flex flex-col justify-between group hover:bg-[#161C19]"
                  >
                    <div>
                      {/* Card Header: Symbol, Name, Badges */}
                      <div className="flex items-start justify-between border-b border-white/[0.065] pb-3 mb-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-base font-semibold font-mono text-[#F2F0E8] group-hover:text-[#42A77A] transition-colors">
                              {item.symbol}
                            </span>
                            <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono font-medium border bg-[#161C19] text-[#A7ADA8] border-white/[0.065]">
                              {item.asset_type === "STOCK" ? "EQUITY" : "INDEX FUND"}
                            </span>
                          </div>
                          <div className="text-xs text-[#A7ADA8] font-sans font-medium truncate max-w-[280px]">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-[#68716C] font-sans">
                            {item.sector}
                          </div>
                        </div>

                        {/* Stance Badge */}
                        <div className="flex flex-col items-end space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-medium border ${getStanceBadge(item.future_prediction.dominant_stance)}`}>
                            {item.future_prediction.dominant_stance.replace("_", " ")}
                          </span>
                          <span className="text-[11px] font-mono text-[#68716C]">
                            Confidence: <strong className="text-[#C8A96B] font-medium">{item.future_prediction.confidence_pct}%</strong>
                          </span>
                        </div>
                      </div>

                      {/* Current Spot Price & Past Market Snapshot */}
                      <div className="grid grid-cols-2 gap-3 mb-3.5">
                        {/* Spot Price */}
                        <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3">
                          <span className="text-[10px] text-[#68716C] uppercase font-medium block mb-0.5">Current Spot</span>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-lg font-semibold font-mono text-[#F2F0E8] tabular-nums">
                              ₹{item.spot_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`text-xs font-mono font-medium tabular-nums ${isPositiveDay ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                              {isPositiveDay ? "+" : ""}{item.day_change_pct}%
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#68716C] mt-1">
                            MCap/AUM: ₹{(item.market_cap_or_aum_cr / 1000).toFixed(1)}K Cr
                          </div>
                        </div>

                        {/* Past Market Returns */}
                        <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3">
                          <span className="text-[10px] text-[#68716C] uppercase font-medium block mb-0.5">Historical Return</span>
                          <div className="grid grid-cols-3 gap-1 text-xs font-mono font-medium text-center mt-1 tabular-nums">
                            <div className="bg-[#111614] py-1 rounded-sm border border-white/[0.04]">
                              <span className="text-[9px] text-[#68716C] block font-sans">1W</span>
                              <span className={item.past_market.return_1w_pct >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}>
                                {item.past_market.return_1w_pct >= 0 ? "+" : ""}{item.past_market.return_1w_pct}%
                              </span>
                            </div>
                            <div className="bg-[#111614] py-1 rounded-sm border border-white/[0.04]">
                              <span className="text-[9px] text-[#68716C] block font-sans">1M</span>
                              <span className={item.past_market.return_1m_pct >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}>
                                {item.past_market.return_1m_pct >= 0 ? "+" : ""}{item.past_market.return_1m_pct}%
                              </span>
                            </div>
                            <div className="bg-[#111614] py-1 rounded-sm border border-white/[0.04]">
                              <span className="text-[9px] text-[#68716C] block font-sans">1Y</span>
                              <span className={item.past_market.return_1y_pct >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}>
                                {item.past_market.return_1y_pct >= 0 ? "+" : ""}{item.past_market.return_1y_pct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Technical Microstructure Mini-Row */}
                      <div className="flex items-center justify-between bg-[#0C100F] border border-white/[0.04] rounded-sm px-3 py-1.5 mb-3.5 text-xs font-mono">
                        <div>
                          <span className="text-[#68716C] font-sans">RSI (14): </span>
                          <strong className={`tabular-nums font-medium ${item.past_market.rsi_14 > 60 ? "text-[#B89655]" : item.past_market.rsi_14 < 40 ? "text-[#C45D62]" : "text-[#42A77A]"}`}>
                            {item.past_market.rsi_14}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[#68716C] font-sans">EMA Trend: </span>
                          <strong className="text-[#A7ADA8] font-medium">{item.past_market.ema_alignment.replace("_", " ")}</strong>
                        </div>
                        <div>
                          <span className="text-[#68716C] font-sans">52W Position: </span>
                          <strong className="text-[#F2F0E8] font-medium tabular-nums">{item.past_market.range_52w_pct}%</strong>
                        </div>
                      </div>

                      {/* Government Policy Audit Box */}
                      <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3 mb-3.5 space-y-1.5 font-sans">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <ShieldAlert className="h-3.5 w-3.5 text-[#B89655]" />
                            <span className="text-[10px] text-[#A7ADA8] font-medium uppercase tracking-wider">
                              Govt Policy Audit
                            </span>
                          </div>
                          <div className="flex items-center space-x-1.5 font-mono">
                            <span className={`px-2 py-0.5 rounded-sm text-[9px] font-medium border ${getPolicyStanceBadge(item.govt_policy.policy_stance)}`}>
                              {item.govt_policy.policy_stance}
                            </span>
                            <span className="text-xs text-[#68716C]">
                              Risk: <strong className="text-[#A7ADA8] font-medium">{item.govt_policy.policy_risk_score}/100</strong>
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#A7ADA8] leading-snug">
                          {item.govt_policy.key_policy_summary}
                        </p>
                      </div>

                      {/* 14-Day Future Prediction Box */}
                      <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3 mb-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-[#159570]" />
                            <span className="text-[10px] text-[#A7ADA8] font-medium uppercase tracking-wider font-sans">
                              14-Day AI Forecast
                            </span>
                          </div>
                          <div className="flex items-baseline space-x-1 text-xs font-mono">
                            <span className="text-[#68716C] font-sans">Target:</span>
                            <span className="font-semibold text-[#F2F0E8] tabular-nums">
                              ₹{item.future_prediction.target_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`font-semibold tabular-nums ${isPositiveExp ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                              ({isPositiveExp ? "+" : ""}{item.future_prediction.expected_return_pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Bullish vs Bearish Band */}
                        <div className="flex items-center justify-between text-xs font-mono text-[#68716C] bg-[#111614] px-2.5 py-1 rounded-sm border border-white/[0.04] tabular-nums">
                          <span>+2σ Bull: <strong className="text-[#42A77A] font-medium">₹{item.future_prediction.bullish_target_2sigma}</strong></span>
                          <span>-2σ Floor: <strong className="text-[#C45D62] font-medium">₹{item.future_prediction.bearish_floor_2sigma}</strong></span>
                        </div>

                        {/* Alpha Driver Tag */}
                        <div className="text-[11px] text-[#68716C] truncate font-sans">
                          <span className="text-[#68716C] font-medium">Alpha Driver: </span>
                          <span className="text-[#A7ADA8]">{item.future_prediction.alpha_driver}</span>
                        </div>
                      </div>

                      {/* Executive Verdict Quote */}
                      <div className="p-2.5 rounded-sm bg-[#0C100F] border border-white/[0.04] text-xs text-[#A7ADA8] leading-relaxed italic font-sans">
                        &quot;{item.executive_verdict}&quot;
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center space-x-2 pt-3.5 border-t border-white/[0.065] mt-3.5">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="flex-1 py-1.5 rounded-sm bg-[#161C19] hover:bg-[#1B2420] border border-white/[0.065] text-[#A7ADA8] hover:text-[#F2F0E8] font-medium text-xs flex items-center justify-center space-x-1 transition-colors"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-[#68716C]" />
                        <span>Deep Audit Sheet</span>
                      </button>

                      {onOpenOrderModal && (
                        <button
                          onClick={() => onOpenOrderModal(item.symbol, isPositiveExp ? "BUY" : "SELL")}
                          className="px-4 py-1.5 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium text-xs transition-colors"
                        >
                          Trade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ==================== DATA MATRIX VIEW ==================== */
            <div className="bg-[#111614] border border-white/[0.065] rounded-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#0C100F] border-b border-white/[0.065] text-[#68716C] text-[10px] uppercase font-medium tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Asset</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Spot Price</th>
                      <th className="py-2.5 px-3 text-right">Day %</th>
                      <th className="py-2.5 px-3 text-center">1W / 1M / 1Y</th>
                      <th className="py-2.5 px-3 text-center">RSI (14)</th>
                      <th className="py-2.5 px-3">Govt Policy Stance</th>
                      <th className="py-2.5 px-3">14D AI Stance</th>
                      <th className="py-2.5 px-3 text-right">Target</th>
                      <th className="py-2.5 px-3 text-right">Exp Return</th>
                      <th className="py-2.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-mono tabular-nums">
                    {filteredItems.map((item) => {
                      const isPositiveDay = item.day_change >= 0;
                      const isPositiveExp = item.future_prediction.expected_return_pct >= 0;

                      return (
                        <tr key={item.symbol} className="hover:bg-[#161C19] transition-colors group">
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-[#F2F0E8] group-hover:text-[#42A77A]">{item.symbol}</div>
                            <div className="text-[11px] text-[#A7ADA8] truncate max-w-[140px] font-sans">{item.name}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-medium border bg-[#161C19] text-[#A7ADA8] border-white/[0.065]">
                              {item.asset_type === "STOCK" ? "EQUITY" : "INDEX"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-[#F2F0E8]">
                            ₹{item.spot_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-medium ${isPositiveDay ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                            {isPositiveDay ? "+" : ""}{item.day_change_pct}%
                          </td>
                          <td className="py-2.5 px-3 text-center text-[11px] text-[#68716C]">
                            {item.past_market.return_1w_pct}% &bull; {item.past_market.return_1m_pct}% &bull; {item.past_market.return_1y_pct}%
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            <span className={item.past_market.rsi_14 > 60 ? "text-[#B89655]" : "text-[#42A77A]"}>
                              {item.past_market.rsi_14}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-medium border ${getPolicyStanceBadge(item.govt_policy.policy_stance)}`}>
                              {item.govt_policy.policy_stance} ({item.govt_policy.policy_risk_score})
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-medium border ${getStanceBadge(item.future_prediction.dominant_stance)}`}>
                              {item.future_prediction.dominant_stance.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-[#F2F0E8]">
                            ₹{item.future_prediction.target_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-medium ${isPositiveExp ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                            {isPositiveExp ? "+" : ""}{item.future_prediction.expected_return_pct}%
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="px-2.5 py-1 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] text-[10px] font-sans font-medium transition-colors"
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== DEEP DIVE AUDIT DRAWER MODAL ==================== */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative space-y-6 font-sans">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/[0.065] pb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl font-semibold font-mono text-[#F2F0E8]">{selectedItem.symbol}</span>
                  <span className="px-2.5 py-0.5 rounded-sm text-xs font-mono font-medium border bg-[#161C19] text-[#A7ADA8] border-white/[0.065]">
                    {selectedItem.asset_type === "STOCK" ? "EQUITY STOCK" : "INDEX FUND / ETF"}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-sm text-xs font-mono font-medium border ${getStanceBadge(selectedItem.future_prediction.dominant_stance)}`}>
                    {selectedItem.future_prediction.dominant_stance.replace("_", " ")}
                  </span>
                </div>
                <div className="text-xs text-[#A7ADA8] mt-1 font-sans">{selectedItem.name} &bull; {selectedItem.sector}</div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-sm bg-[#161C19] border border-white/[0.065] text-[#68716C] hover:text-[#F2F0E8] hover:bg-[#1B2420] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Trajectory Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3">
                <span className="text-[10px] text-[#68716C] uppercase font-medium block">Spot Price</span>
                <span className="text-lg font-semibold font-mono text-[#F2F0E8] tabular-nums">
                  ₹{selectedItem.spot_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3">
                <span className="text-[10px] text-[#68716C] uppercase font-medium block">14-Day Target</span>
                <span className="text-lg font-semibold font-mono text-[#F2F0E8] tabular-nums">
                  ₹{selectedItem.future_prediction.target_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3">
                <span className="text-[10px] text-[#68716C] uppercase font-medium block">Expected Return</span>
                <span className={`text-lg font-semibold font-mono tabular-nums ${selectedItem.future_prediction.expected_return_pct >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                  {selectedItem.future_prediction.expected_return_pct >= 0 ? "+" : ""}{selectedItem.future_prediction.expected_return_pct}%
                </span>
              </div>
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-3">
                <span className="text-[10px] text-[#68716C] uppercase font-medium block">Policy Risk</span>
                <span className="text-lg font-semibold font-mono text-[#B89655] tabular-nums">
                  {selectedItem.govt_policy.policy_risk_score}/100
                </span>
              </div>
            </div>

            {/* Government Policy Audit Details */}
            <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.065] pb-2">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 text-[#B89655]" />
                  <span className="text-xs font-medium text-[#F2F0E8] uppercase tracking-wider">
                    Indian Government &amp; SEBI Policy Directives
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-sm text-[10px] font-mono font-medium border ${getPolicyStanceBadge(selectedItem.govt_policy.policy_stance)}`}>
                  {selectedItem.govt_policy.policy_stance}
                </span>
              </div>

              <p className="text-xs text-[#A7ADA8] leading-relaxed">
                {selectedItem.govt_policy.key_policy_summary}
              </p>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-[#68716C] uppercase font-medium block">Applicable Circulars:</span>
                {selectedItem.govt_policy.applicable_circulars.map((circ, idx) => (
                  <div key={idx} className="flex items-center space-x-2 text-xs text-[#A7ADA8] bg-[#111614] p-2 rounded-sm border border-white/[0.04]">
                    <FileText className="h-3.5 w-3.5 text-[#68716C] shrink-0" />
                    <span>{circ}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 14-Day Forward Trajectory Curve Points */}
            <div className="bg-[#0C100F] border border-white/[0.04] rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.065] pb-2">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-[#159570]" />
                  <span className="text-xs font-medium text-[#F2F0E8] uppercase tracking-wider">
                    14-Day Multi-Quantile Forecast Path
                  </span>
                </div>
                <span className="text-xs text-[#68716C] font-mono">
                  Confidence: <strong className="text-[#C8A96B] font-medium">{selectedItem.future_prediction.confidence_pct}%</strong>
                </span>
              </div>

              {/* Trajectory Points Table */}
              <div className="max-h-48 overflow-y-auto pr-1">
                <table className="w-full text-left text-xs font-mono tabular-nums">
                  <thead className="bg-[#0C100F] text-[10px] text-[#68716C] uppercase font-medium sticky top-0 border-b border-white/[0.065]">
                    <tr>
                      <th className="py-1.5 px-3">Day Step</th>
                      <th className="py-1.5 px-3">Date</th>
                      <th className="py-1.5 px-3 text-right">Base Path</th>
                      <th className="py-1.5 px-3 text-right">+2σ Bull Target</th>
                      <th className="py-1.5 px-3 text-right">-2σ Bear Floor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {selectedItem.future_prediction.trajectory_points.map((pt) => (
                      <tr key={pt.step} className="hover:bg-[#161C19]">
                        <td className="py-1.5 px-3 text-[#68716C]">Day {pt.step}</td>
                        <td className="py-1.5 px-3 text-[#A7ADA8]">{pt.timestamp}</td>
                        <td className="py-1.5 px-3 text-right font-medium text-[#F2F0E8]">₹{pt.base_price.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-right text-[#42A77A]">₹{pt.bullish_price.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-right text-[#C45D62]">₹{pt.bearish_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.065]">
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-sm bg-[#161C19] hover:bg-[#1B2420] border border-white/[0.065] text-[#A7ADA8] hover:text-[#F2F0E8] font-medium text-xs transition-colors"
              >
                Close Audit Sheet
              </button>

              {onOpenOrderModal && (
                <button
                  onClick={() => {
                    const side = selectedItem.future_prediction.expected_return_pct >= 0 ? "BUY" : "SELL";
                    onOpenOrderModal(selectedItem.symbol, side);
                    setSelectedItem(null);
                  }}
                  className="px-5 py-2 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium text-xs transition-colors"
                >
                  Execute Order on {selectedItem.symbol}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
