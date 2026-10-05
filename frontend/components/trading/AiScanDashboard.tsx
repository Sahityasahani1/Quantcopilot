"use client";

import React, { useState, useEffect } from "react";
import { 
  AiScanPayload, 
  FinbertNewsItem, 
  SebiPolicyItem, 
  UniverseTickerMatrixRow 
} from "../../types/trading";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  FileText, 
  Cpu, 
  Layers, 
  ExternalLink, 
  RefreshCw, 
  Building, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Calendar,
  Sparkles,
  Clock,
  Radio,
  Rss
} from "lucide-react";
import { getApiBaseUrl } from "../../lib/api";

export interface NewsSyncStatus {
  is_syncing: boolean;
  last_sync_timestamp: string;
  next_sync_seconds: number;
  interval_seconds: number;
  total_news_cached: number;
  total_sebi_circulars: number;
  sources: string[];
  message: string;
}


interface AiScanDashboardProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  onOpenOrderModal?: (side: "BUY" | "SELL") => void;
}

const TRACKED_TICKERS = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "NIFTY 50", name: "Nifty 50 Index" }
];

export const AiScanDashboard: React.FC<AiScanDashboardProps> = ({
  selectedSymbol,
  onSelectSymbol,
  onOpenOrderModal
}) => {
  const [data, setData] = useState<AiScanPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState<string>("ALL");

  // Daily Automated Scheduler & Live RSS State
  const [syncStatus, setSyncStatus] = useState<NewsSyncStatus | null>(null);
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(900);

  const cleanSym = selectedSymbol.replace("-EQ", "");

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/fno/ai-scan/sync-status`);
      if (res.ok) {
        const status: NewsSyncStatus = await res.json();
        setSyncStatus(status);
        if (status.next_sync_seconds !== undefined) {
          setCountdownSeconds(status.next_sync_seconds);
        }
      }
    } catch {
      // Background status fallback
    }
  };

  const triggerSyncLiveNews = async () => {
    setIsSyncingLive(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/fno/ai-scan/sync-news`, {
        method: "POST"
      });
      if (res.ok) {
        const updatedStatus: NewsSyncStatus = await res.json();
        setSyncStatus(updatedStatus);
        setCountdownSeconds(updatedStatus.next_sync_seconds || 900);
      }
      // Re-fetch current symbol AI Scan intelligence with freshly ingested feeds
      await fetchAiScanData(cleanSym);
    } catch (err: any) {
      console.error("Manual sync trigger error:", err);
    } finally {
      setIsSyncingLive(false);
    }
  };

  const fetchAiScanData = async (symbolToFetch: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/fno/ai-scan/${encodeURIComponent(symbolToFetch)}`);

      if (!res.ok) {
        throw new Error(`AI Scan server returned HTTP ${res.status}`);
      }
      const payload: AiScanPayload = await res.json();
      setData(payload);
    } catch (err: any) {
      setError(err.message || "Failed to load AI Scan payload");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and symbol change effect
  useEffect(() => {
    fetchAiScanData(cleanSym);
    fetchSyncStatus();
  }, [cleanSym]);

  // Automated 1-second countdown timer loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Trigger automated background cycle and fetch fresh status
          fetchSyncStatus();
          fetchAiScanData(cleanSym);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cleanSym]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const filteredPolicies = data?.all_sebi_policies.filter((p) => {
    if (selectedPolicyCategory === "ALL") return true;
    return p.category.toUpperCase() === selectedPolicyCategory.toUpperCase();
  }) || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-emerald-200 overflow-y-auto font-mono select-none p-3.5 space-y-4">
      {/* Top Banner: Ticker Switcher & Live Automated Sync Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#040805] border border-emerald-950 rounded-xl p-3 shrink-0 shadow-lg">
        {/* Ticker Set Selector Buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          <div className="flex items-center space-x-1 text-xs text-emerald-400 font-bold px-2 py-1 mr-1">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>TICKER SET:</span>
          </div>
          {TRACKED_TICKERS.map((t) => {
            const isSelected = cleanSym === t.symbol;
            return (
              <button
                key={t.symbol}
                onClick={() => onSelectSymbol(t.symbol)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-emerald-500 text-black font-black shadow-md scale-105 shadow-emerald-500/20"
                    : "bg-black border border-emerald-950 text-emerald-500/80 hover:text-emerald-200 hover:border-emerald-800"
                }`}
              >
                <span>{t.symbol}</span>
              </button>
            );
          })}
        </div>

        {/* Live RSS Status & On-Demand Sync Control */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Real-Time Status & Next Cycle Countdown Badge */}
          <div className="hidden sm:flex items-center space-x-2 bg-black border border-emerald-950 px-2.5 py-1.5 rounded-lg text-[11px]">
            <div className="flex items-center space-x-1.5 text-emerald-400">
              <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
              <span className="font-bold">RSS ACTIVE</span>
            </div>
            <span className="text-emerald-950">|</span>
            <div className="flex items-center space-x-1 text-emerald-500/70">
              <Clock className="h-3 w-3 text-emerald-400" />
              <span>Auto-Sync:</span>
              <span className="text-emerald-400 font-bold">{formatCountdown(countdownSeconds)}</span>
            </div>
          </div>

          {/* Sources Badge */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-black border border-emerald-950 px-2 py-1.5 rounded-lg text-[10px] text-emerald-600">
            <Rss className="h-3 w-3 text-emerald-500" />
            <span>Google News &bull; Moneycontrol &bull; SEBI &bull; Yahoo</span>
          </div>

          {/* On-Demand Sync Live News Action Button */}
          <button
            onClick={triggerSyncLiveNews}
            disabled={isSyncingLive || isLoading}
            className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
            title="Triggers immediate multi-source RSS ingestion from Google News, Moneycontrol, and SEBI"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncingLive ? "animate-spin text-black" : ""}`} />
            <span>{isSyncingLive ? "Syncing Live RSS..." : "Sync Live News"}</span>
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && !data && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-3">
          <Cpu className="h-8 w-8 text-emerald-400 animate-spin" />
          <div className="text-sm font-bold text-emerald-200">
            Running FinBERT NLP, Deep Neural Forecast & SEBI Policy Matrix on {cleanSym}...
          </div>
          <div className="text-xs text-emerald-600">
            Ingesting live market candles, Yahoo Finance corporate releases, and regulatory circulars
          </div>
        </div>
      )}

      {error && !data && (
        <div className="p-4 bg-rose-950/40 border border-rose-900 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>Error loading AI Scan Intelligence: {error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Top Grid: Section 1 Data Summary & Section 2 Future Price Forecaster */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* SECTION 1: DATA SUMMARY (5 COLS) */}
            <div className="lg:col-span-5 bg-[#040805] border border-emerald-950 rounded-xl p-4 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5 mb-3">
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4 text-emerald-400" />
                    <span className="font-extrabold text-sm text-emerald-100">{data.company_name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-black border border-emerald-900 text-[10px] text-emerald-400 font-bold">
                      {data.symbol}
                    </span>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${
                    data.summary.dominant_trend === "BULLISH" 
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800" 
                      : (data.summary.dominant_trend === "BEARISH" ? "bg-rose-950/80 text-rose-400 border border-rose-800" : "bg-black text-emerald-600 border border-emerald-950")
                  }`}>
                    {data.summary.dominant_trend}
                  </span>
                </div>

                {/* Spot Price & Day Change */}
                <div className="flex items-baseline space-x-3 mb-3">
                  <span className="text-2xl font-black text-emerald-100">
                    ₹{data.summary.spot_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className={`flex items-center text-xs font-bold ${data.summary.day_change_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {data.summary.day_change_pct >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{data.summary.day_change >= 0 ? "+" : ""}{data.summary.day_change.toFixed(2)} ({data.summary.day_change_pct >= 0 ? "+" : ""}{data.summary.day_change_pct.toFixed(2)}%)</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3.5">
                  <div className="bg-black p-2 rounded-lg border border-emerald-950">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold">52-Week Range</div>
                    <div className="font-bold text-emerald-200 mt-0.5">
                      ₹{data.summary.low_52w.toFixed(0)} - ₹{data.summary.high_52w.toFixed(0)}
                    </div>
                  </div>
                  <div className="bg-black p-2 rounded-lg border border-emerald-950">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold">P/E Ratio</div>
                    <div className="font-bold text-emerald-200 mt-0.5">
                      {data.summary.pe_ratio ? `${data.summary.pe_ratio.toFixed(1)}x` : "N/A"}
                    </div>
                  </div>
                  <div className="bg-black p-2 rounded-lg border border-emerald-950">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold">Market Cap</div>
                    <div className="font-bold text-emerald-200 mt-0.5">
                      ₹{(data.summary.market_cap_cr ? (data.summary.market_cap_cr / 1000).toFixed(1) : "0")}K Cr
                    </div>
                  </div>
                  <div className="bg-black p-2 rounded-lg border border-emerald-950">
                    <div className="text-[10px] text-emerald-600 uppercase font-bold">RSI (14) & Beta</div>
                    <div className="font-bold text-emerald-200 mt-0.5">
                      {data.summary.rsi_14} · β {data.summary.beta ? data.summary.beta.toFixed(2) : "1.00"}
                    </div>
                  </div>
                </div>

                {/* Executive Summary synthesis */}
                <div className="p-2.5 rounded-lg bg-black border border-emerald-950 text-[11px] leading-relaxed text-emerald-300">
                  <span className="font-bold text-emerald-400 uppercase text-[10px] block mb-1">Executive AI Synthesis</span>
                  {data.summary.executive_summary}
                </div>
              </div>

              {/* Quick Trade Buttons */}
              {onOpenOrderModal && (
                <div className="flex items-center space-x-2 pt-3 border-t border-emerald-950 mt-3">
                  <button
                    onClick={() => onOpenOrderModal("BUY")}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs flex items-center justify-center space-x-1 transition-all shadow-md shadow-emerald-900/30"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>BUY {data.symbol}</span>
                  </button>
                  <button
                    onClick={() => onOpenOrderModal("SELL")}
                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1 transition-all"
                  >
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>SHORT {data.symbol}</span>
                  </button>
                </div>
              )}
            </div>

            {/* SECTION 2: FUTURE PRICE FORECAST (7 COLS) */}
            <div className="lg:col-span-7 bg-[#040805] border border-emerald-950 rounded-xl p-4 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5 mb-3">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span className="font-extrabold text-sm text-emerald-100">AI Deep Forecaster & Quantile Trajectory</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-emerald-500/70">
                      Confidence: <strong className="text-emerald-400">{data.future_price.trend_confidence_pct}%</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                      14-Day Horizon
                    </span>
                  </div>
                </div>

                {/* Forecast Highlights Grid */}
                <div className="grid grid-cols-3 gap-2.5 mb-3.5">
                  <div className="p-2.5 rounded-lg bg-black border border-emerald-950">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Dominant Trend</span>
                    <span className={`text-base font-black ${data.future_price.dominant_trend === "BULLISH" ? "text-emerald-400" : "text-rose-400"}`}>
                      {data.future_price.dominant_trend}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black border border-emerald-950">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Target Price (14D)</span>
                    <span className="text-base font-black text-emerald-100">
                      ₹{data.future_price.target_price.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black border border-emerald-950">
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">Expected Return</span>
                    <span className={`text-base font-black ${data.future_price.expected_return_pct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {data.future_price.expected_return_pct >= 0 ? "+" : ""}{data.future_price.expected_return_pct}%
                    </span>
                  </div>
                </div>

                {/* Trajectory Table Summary (Select Days) */}
                <div className="border border-emerald-950 rounded-lg overflow-hidden mb-3">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-black text-[10px] text-emerald-600 uppercase font-bold border-b border-emerald-950">
                      <tr>
                        <th className="py-1.5 px-2.5">Date</th>
                        <th className="py-1.5 px-2.5">Bearish Floor (-2σ)</th>
                        <th className="py-1.5 px-2.5">Expected Path</th>
                        <th className="py-1.5 px-2.5">Bullish Target (+2σ)</th>
                        <th className="py-1.5 px-2.5">95% Range Band</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-950">
                      {data.future_price.trajectories.filter((_, idx) => [0, 2, 6, 13].includes(idx)).map((pt) => (
                        <tr key={pt.step} className="hover:bg-emerald-950/20">
                          <td className="py-1.5 px-2.5 font-bold text-emerald-200">{pt.timestamp} (D+{pt.step})</td>
                          <td className="py-1.5 px-2.5 text-rose-400 font-mono">₹{pt.bearish_price}</td>
                          <td className="py-1.5 px-2.5 text-emerald-400 font-bold font-mono">₹{pt.base_price}</td>
                          <td className="py-1.5 px-2.5 text-emerald-300 font-mono">₹{pt.bullish_price}</td>
                          <td className="py-1.5 px-2.5 text-emerald-600 text-[11px]">
                            ₹{pt.lower_95} - ₹{pt.upper_95}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Key Alpha Drivers Bar */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block">
                    Top Alpha Predictive Features (Attention Weight)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {data.future_price.key_drivers.slice(0, 3).map((driver, idx) => (
                      <div key={idx} className="bg-black p-2 rounded border border-emerald-950 text-[11px]">
                        <div className="text-emerald-400 truncate">{driver.feature}</div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="w-16 bg-emerald-950 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${driver.importancePct * 2}%` }} />
                          </div>
                          <span className="text-emerald-300 font-bold text-[10px]">{driver.importancePct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Grid: Section 3 FinBERT News & Section 4 SEBI Daily Policy */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* SECTION 3: FinBERT NEWS SENTIMENT (6 COLS) */}
            <div className="lg:col-span-6 bg-[#040805] border border-emerald-950 rounded-xl p-4 flex flex-col shadow-xl">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5 mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <span className="font-extrabold text-sm text-emerald-100">FinBERT Financial News & Sentiment</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    data.finbert_sentiment.sentiment_label === "BULLISH" 
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800" 
                      : (data.finbert_sentiment.sentiment_label === "BEARISH" ? "bg-rose-950 text-rose-400 border border-rose-800" : "bg-black text-emerald-600 border border-emerald-950")
                  }`}>
                    {data.finbert_sentiment.sentiment_label} ({data.finbert_sentiment.overall_score >= 0 ? "+" : ""}{data.finbert_sentiment.overall_score})
                  </span>
                </div>
              </div>

              {/* Sentiment Ratio Bar */}
              <div className="bg-black p-2.5 rounded-lg border border-emerald-950 mb-3 text-xs">
                <div className="flex justify-between text-[11px] mb-1 font-bold">
                  <span className="text-emerald-400">{data.finbert_sentiment.bullish_count} Bullish Articles</span>
                  <span className="text-emerald-600">{data.finbert_sentiment.neutral_count} Neutral</span>
                  <span className="text-rose-400">{data.finbert_sentiment.bearish_count} Bearish</span>
                </div>
                <div className="h-2 w-full bg-emerald-950 rounded-full flex overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full" 
                    style={{ width: `${(data.finbert_sentiment.bullish_count / Math.max(1, data.news_feed.length)) * 100}%` }} 
                  />
                  <div 
                    className="bg-emerald-900/60 h-full" 
                    style={{ width: `${(data.finbert_sentiment.neutral_count / Math.max(1, data.news_feed.length)) * 100}%` }} 
                  />
                  <div 
                    className="bg-rose-500 h-full" 
                    style={{ width: `${(data.finbert_sentiment.bearish_count / Math.max(1, data.news_feed.length)) * 100}%` }} 
                  />
                </div>
              </div>

              {/* News Articles Feed */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {data.news_feed.length === 0 ? (
                  <div className="text-xs text-emerald-700 py-6 text-center">No news items available.</div>
                ) : (
                  data.news_feed.map((news) => (
                    <div 
                      key={news.id} 
                      className="p-3 bg-black hover:bg-emerald-950/20 border border-emerald-950 hover:border-emerald-900 rounded-xl transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <a 
                          href={news.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-bold text-xs text-emerald-200 hover:text-emerald-400 leading-snug line-clamp-2"
                        >
                          {news.title}
                        </a>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          news.sentiment === "POSITIVE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : (news.sentiment === "NEGATIVE" ? "bg-rose-950 text-rose-400 border border-rose-800" : "bg-black text-emerald-600 border border-emerald-950")
                        }`}>
                          {news.sentiment}
                        </span>
                      </div>

                      <p className="text-[11px] text-emerald-500/80 line-clamp-2 leading-relaxed mb-2">
                        {news.summary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-emerald-600 font-mono">
                        <span className="font-bold text-emerald-400">{news.publisher}</span>
                        <div className="flex items-center space-x-1.5">
                          {news.keywords.map((kw, i) => (
                            <span key={i} className="px-1.5 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-900 text-[9px]">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* SECTION 4: SEBI & GOVT REGULATORY POLICY (6 COLS) */}
            <div className="lg:col-span-6 bg-[#040805] border border-emerald-950 rounded-xl p-4 flex flex-col shadow-xl">
              <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5 mb-3">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 text-emerald-400" />
                  <span className="font-extrabold text-sm text-emerald-100">Daily SEBI & Indian Govt Market Policies</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  Daily Regulatory Feed
                </span>
              </div>

              {/* Company Regulatory Exposure Badge */}
              <div className="p-3 rounded-xl bg-black border border-emerald-950 mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-emerald-500/70 font-bold">{data.symbol} Regulatory Risk:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      data.company_policy.exposure_level === "HIGH_MONITORING"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : (data.company_policy.exposure_level === "MODERATE" ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-emerald-950 text-emerald-400 border border-emerald-800")
                    }`}>
                      {data.company_policy.exposure_level} ({data.company_policy.policy_risk_score}/100)
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-500/80 mt-1">
                    {data.company_policy.status_text}
                  </div>
                </div>
              </div>

              {/* Policy Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                {[
                  { id: "ALL", label: "All Directives" },
                  { id: "DERIVATIVES_FNO", label: "F&O Regulations" },
                  { id: "TAXATION", label: "Tax & STT" },
                  { id: "BANKING_LIQUIDITY", label: "Banking & RBI" },
                  { id: "ENERGY_PLI", label: "Green Energy PLI" },
                  { id: "SURVEILLANCE_COMPLIANCE", label: "Surveillance / SDD" }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedPolicyCategory(cat.id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                      selectedPolicyCategory === cat.id
                        ? "bg-emerald-500 text-black font-black shadow-sm"
                        : "bg-black border border-emerald-950 text-emerald-600 hover:text-emerald-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Daily Circulars List */}
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredPolicies.map((pol, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-black border border-emerald-950 hover:border-emerald-900 rounded-xl space-y-2 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 font-mono block">
                          {pol.circular_no} · {pol.issuing_authority}
                        </span>
                        <div className="font-bold text-xs text-emerald-200 mt-0.5">
                          {pol.title}
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                        pol.impact_level === "HIGH" 
                          ? "bg-rose-950 text-rose-400 border border-rose-800" 
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}>
                        {pol.impact_level} IMPACT
                      </span>
                    </div>

                    <p className="text-[11px] text-emerald-500/80 leading-relaxed">
                      {pol.summary}
                    </p>

                    <div className="p-2 rounded bg-black/90 border border-emerald-950 text-[10px] text-emerald-300">
                      <strong>Market & Stock Implication:</strong> {pol.regulatory_implication}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-emerald-600 pt-1 border-t border-emerald-950">
                      <span>Effective: <strong className="text-emerald-300">{pol.effective_date}</strong></span>
                      <div className="flex items-center space-x-1">
                        <span className="text-emerald-600">Affected:</span>
                        {pol.affected_tickers.map((t, i) => (
                          <span 
                            key={i} 
                            onClick={() => onSelectSymbol(t)}
                            className="cursor-pointer hover:underline text-emerald-400 font-bold"
                          >
                            {t}{i < pol.affected_tickers.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 5: MULTI-TICKER CROSS-ASSET INTELLIGENCE MATRIX */}
          <div className="bg-[#040805] border border-emerald-950 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-emerald-950 pb-2.5 mb-3">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-emerald-400" />
                <span className="font-extrabold text-sm text-emerald-100">
                  Multi-Ticker Intelligence & Policy Exposure Matrix
                </span>
              </div>
              <span className="text-[10px] text-emerald-600">
                Click any row to switch active company dashboard
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-black text-[10px] text-emerald-600 uppercase font-bold border-b border-emerald-950">
                  <tr>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-3">Company Name</th>
                    <th className="py-2 px-3">Spot Price</th>
                    <th className="py-2 px-3">FinBERT Sentiment</th>
                    <th className="py-2 px-3">14D AI Target</th>
                    <th className="py-2 px-3">Projected Return</th>
                    <th className="py-2 px-3">Policy Risk Level</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950">
                  {data.universe_matrix.map((row) => {
                    const isRowSelected = cleanSym === row.symbol;
                    return (
                      <tr 
                        key={row.symbol} 
                        onClick={() => onSelectSymbol(row.symbol)}
                        className={`cursor-pointer transition-colors ${
                          isRowSelected 
                            ? "bg-emerald-950/40 text-emerald-100 font-bold" 
                            : "hover:bg-emerald-950/20 text-emerald-300"
                        }`}
                      >
                        <td className="py-2.5 px-3 font-extrabold text-emerald-400 flex items-center space-x-1.5">
                          {isRowSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                          <span>{row.symbol}</span>
                        </td>
                        <td className="py-2.5 px-3 text-emerald-300 font-sans text-xs">{row.company_name}</td>
                        <td className="py-2.5 px-3 font-bold font-mono">
                          ₹{row.spot_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            row.finbert_sentiment === "POSITIVE"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : (row.finbert_sentiment === "NEGATIVE" ? "bg-rose-950 text-rose-400 border border-rose-800" : "bg-black text-emerald-600 border border-emerald-950")
                          }`}>
                            {row.finbert_sentiment} ({row.finbert_score >= 0 ? "+" : ""}{row.finbert_score.toFixed(2)})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-200">
                          ₹{row.future_target.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={row.expected_return_pct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {row.expected_return_pct >= 0 ? "+" : ""}{row.expected_return_pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.policy_impact_level === "HIGH_MONITORING"
                              ? "bg-rose-950 text-rose-400 border border-rose-800"
                              : (row.policy_impact_level === "MODERATE" ? "bg-amber-950 text-amber-400 border border-amber-800" : "bg-emerald-950 text-emerald-400 border border-emerald-800")
                          }`}>
                            {row.policy_impact_level} ({row.policy_risk_score})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSymbol(row.symbol);
                            }}
                            className="px-2 py-1 bg-emerald-950 hover:bg-emerald-500 hover:text-black text-emerald-300 border border-emerald-900/60 rounded text-[10px] font-bold transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
