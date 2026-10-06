"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { HistoricalCandle, HistoricalSeriesPayload } from "../types";
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  TrendingUp, 
  BarChart2, 
  X, 
  Filter, 
  Layers,
  ArrowUpDown,
  ExternalLink,
  Clock,
  Activity
} from "lucide-react";
import { getApiBaseUrl, getWsBaseUrl } from "../lib/api";
import { LiveTickPrice } from "./common/LiveTickPrice";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  ColorType, 
  CandlestickData, 
  HistogramData, 
  CrosshairMode,
  MouseEventParams
} from "lightweight-charts";

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

// =========================================================================
// Interactive Equity Candlestick Chart with 1-Year History & Real-Time Ticks
// =========================================================================
interface EquityInteractiveChartProps {
  symbol: string;
  companyName?: string;
  candles: HistoricalCandle[];
  initialLtp?: number;
  onOpenInTradingDesk: () => void;
}

const EquityInteractiveChart: React.FC<EquityInteractiveChartProps> = ({
  symbol,
  companyName,
  candles,
  initialLtp,
  onOpenInTradingDesk
}) => {
  const [range, setRange] = useState<"1M" | "3M" | "6M" | "1Y" | "ALL">("1Y");
  const [livePrice, setLivePrice] = useState<number>(
    initialLtp || (candles.length > 0 ? candles[candles.length - 1].close_price : 1000)
  );
  const [tickFlash, setTickFlash] = useState<"UP" | "DOWN" | null>(null);
  const [hoverCandle, setHoverCandle] = useState<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    changePct: string;
  } | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const latestCandleRef = useRef<any>(null);

  // Filter candles by selected range
  const filteredCandles = React.useMemo(() => {
    if (!candles || candles.length === 0) return [];
    if (range === "1M") return candles.slice(-22);
    if (range === "3M") return candles.slice(-66);
    if (range === "6M") return candles.slice(-130);
    if (range === "1Y") return candles.slice(-253);
    return candles;
  }, [candles, range]);

  // Performance metrics across available dataset
  const firstPrice = candles.length > 0 ? candles[0].close_price : livePrice;
  const lastPrice = livePrice;
  const periodDelta = Number((lastPrice - firstPrice).toFixed(2));
  const periodReturnPct = Number((((lastPrice - firstPrice) / (firstPrice || 1)) * 100).toFixed(2));
  const high52 = Math.max(...candles.map(c => c.high_price), livePrice);
  const low52 = Math.min(...candles.map(c => c.low_price), livePrice);
  const todayBar = candles.length > 0 ? candles[candles.length - 1] : null;

  // Chart initialization & range update
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let isDisposed = false;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch {}
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth || 760,
      height: 340,
      layout: {
        background: { type: ColorType.Solid, color: "#0C100F" },
        textColor: "#A7ADA8",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.065)",
        scaleMargins: { top: 0.08, bottom: 0.22 }
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.065)",
        timeVisible: true,
        secondsVisible: false
      }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#42A77A",
      downColor: "#C45D62",
      borderVisible: false,
      wickUpColor: "#42A77A",
      wickDownColor: "#C45D62",
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.05
      }
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: ""
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Load data
    const chartCandleData: CandlestickData[] = filteredCandles.map(c => ({
      time: c.date as any,
      open: c.open_price,
      high: c.high_price,
      low: c.low_price,
      close: c.close_price
    }));

    const chartVolumeData: HistogramData[] = filteredCandles.map(c => ({
      time: c.date as any,
      value: c.volume,
      color: c.close_price >= c.open_price ? "rgba(66, 167, 122, 0.45)" : "rgba(196, 93, 98, 0.45)"
    }));

    if (chartCandleData.length > 0) {
      candleSeries.setData(chartCandleData);
      volumeSeries.setData(chartVolumeData);
      latestCandleRef.current = { ...chartCandleData[chartCandleData.length - 1] };
      chart.timeScale().fitContent();
    }

    // Crosshair movement listener
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (isDisposed || !param.time || !param.seriesData) {
        setHoverCandle(null);
        return;
      }
      try {
        const cData = param.seriesData.get(candleSeries) as any;
        const vData = param.seriesData.get(volumeSeries) as any;
        if (cData && "open" in cData) {
          const delta = cData.close - cData.open;
          const pct = ((delta / (cData.open || 1)) * 100).toFixed(2);
          setHoverCandle({
            date: String(param.time),
            open: cData.open,
            high: cData.high,
            low: cData.low,
            close: cData.close,
            volume: vData?.value || 0,
            changePct: (delta >= 0 ? "+" : "") + pct + "%"
          });
        }
      } catch {}
    });

    const handleResize = () => {
      if (!isDisposed && chartContainerRef.current && chartRef.current) {
        try {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        } catch {}
      }
    };
    window.addEventListener("resize", handleResize);

    // WebSocket real-time micro-price tick updates
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/live-feed`);
    ws.onmessage = (event) => {
      if (isDisposed) return;
      try {
        const msg = JSON.parse(event.data);
        if (!msg || msg.type !== "TICK") return;

        const targetSym = symbol.replace("-EQ", "").trim().toUpperCase();
        const msgSym = (msg.symbol || "").replace("-EQ", "").trim().toUpperCase();
        const msgClean = (msg.symbol_clean || "").replace("-EQ", "").trim().toUpperCase();

        if (targetSym === msgSym || targetSym === msgClean) {
          const tickPrice: number | null = msg.ticker ? msg.ticker.price : (msg.candle ? msg.candle.close : null);
          if (tickPrice != null) {
            setLivePrice(prev => {
              setTickFlash(tickPrice >= prev ? "UP" : "DOWN");
              setTimeout(() => setTickFlash(null), 600);
              return tickPrice;
            });

            if (latestCandleRef.current && candleSeriesRef.current && !isDisposed) {
              const prev = latestCandleRef.current;
              const updatedHigh = Math.max(prev.high, tickPrice);
              const updatedLow = Math.min(prev.low, tickPrice);
              const updated = {
                time: prev.time,
                open: prev.open,
                high: Number(updatedHigh.toFixed(2)),
                low: Number(updatedLow.toFixed(2)),
                close: Number(tickPrice.toFixed(2))
              };
              latestCandleRef.current = updated;
              candleSeriesRef.current.update(updated);
            }
          }
        }
      } catch {}
    };

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      try { ws.close(); } catch {}
      try { chart.remove(); } catch {}
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [filteredCandles, symbol]);

  return (
    <div className="space-y-4 font-mono select-none">
      {/* Top Header Banner: Live Price & Key Metrics */}
      <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#68716C] uppercase tracking-wider font-sans">Live Spot LTP</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#159570] animate-ping" />
            <span className="text-[10px] text-[#159570] font-sans font-semibold">LIVE NSE TICK</span>
          </div>
          <div className="flex items-baseline space-x-3 mt-0.5">
            <span className={`text-2xl font-bold font-mono transition-colors duration-200 ${
              tickFlash === "UP" ? "text-[#42A77A]" : tickFlash === "DOWN" ? "text-[#C45D62]" : "text-[#F2F0E8]"
            }`}>
              ₹{livePrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`text-xs font-semibold ${periodReturnPct >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
              {periodReturnPct >= 0 ? "+" : ""}{periodReturnPct}% ({periodDelta >= 0 ? "+₹" : "-₹"}{Math.abs(periodDelta)})
            </span>
          </div>
        </div>

        {/* 52W & Day Statistics */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="border-l border-white/[0.065] pl-4">
            <span className="text-[10px] text-[#68716C] block">52W Range</span>
            <span className="text-[#A7ADA8] font-medium">₹{low52.toFixed(1)} - ₹{high52.toFixed(1)}</span>
          </div>
          <div className="border-l border-white/[0.065] pl-4">
            <span className="text-[10px] text-[#68716C] block">Today's Range</span>
            <span className="text-[#A7ADA8] font-medium">
              ₹{(todayBar?.low_price || livePrice * 0.99).toFixed(1)} - ₹{(todayBar?.high_price || livePrice * 1.01).toFixed(1)}
            </span>
          </div>
          <button
            onClick={onOpenInTradingDesk}
            className="flex items-center space-x-1.5 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] text-xs font-sans font-semibold px-3 py-2 rounded-sm transition-colors shadow-sm ml-2"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Open in Full F&O Terminal</span>
            <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* Range Pills & Live Crosshair Readout */}
      <div className="flex flex-wrap items-center justify-between text-xs bg-[#0C100F] border border-white/[0.065] px-3 py-1.5 rounded-sm gap-2">
        {/* Hover Crosshair Info */}
        {hoverCandle ? (
          <div className="flex items-center space-x-3 text-[11px] text-[#A7ADA8]">
            <span>Date: <strong className="text-[#F2F0E8]">{hoverCandle.date}</strong></span>
            <span>O: <strong className="text-[#F2F0E8]">₹{hoverCandle.open.toFixed(2)}</strong></span>
            <span>H: <strong className="text-[#F2F0E8]">₹{hoverCandle.high.toFixed(2)}</strong></span>
            <span>L: <strong className="text-[#F2F0E8]">₹{hoverCandle.low.toFixed(2)}</strong></span>
            <span>C: <strong className={hoverCandle.close >= hoverCandle.open ? "text-[#42A77A]" : "text-[#C45D62]"}>₹{hoverCandle.close.toFixed(2)}</strong></span>
            <span className={hoverCandle.close >= hoverCandle.open ? "text-[#42A77A]" : "text-[#C45D62]"}>({hoverCandle.changePct})</span>
            {hoverCandle.volume > 0 && <span className="text-[#68716C]">Vol: {hoverCandle.volume.toLocaleString()}</span>}
          </div>
        ) : (
          <div className="text-[11px] text-[#68716C] italic font-sans flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[#159570]" />
            <span>Hover on candles to inspect historical OHLCV data • Live ticks update current bar automatically</span>
          </div>
        )}

        {/* Range Selector */}
        <div className="flex items-center space-x-1 bg-[#111614] border border-white/[0.065] p-0.5 rounded-sm">
          {(["1M", "3M", "6M", "1Y", "ALL"] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-sm transition-colors ${
                range === r 
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]" 
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Lightweight Charts Canvas */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-[340px] bg-[#0C100F] border border-white/[0.065] rounded-sm relative overflow-hidden" 
      />
    </div>
  );
};

// =========================================================================
// Main Indian Market Widget
// =========================================================================
export const IndianMarketWidget: React.FC = () => {
  const { 
    indianTickers, 
    selectedSectorFilter, 
    setSelectedSectorFilter,
    selectedHistorySymbol, 
    setSelectedHistorySymbol,
    setSelectedFnoSymbol,
    setActiveTab
  } = usePortfolioStore();

  const [exchangeFilter, setExchangeFilter] = useState<"ALL" | "NSE" | "BSE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"symbol" | "price" | "change" | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [historyPayload, setHistoryPayload] = useState<HistoricalSeriesPayload | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch full 1-year historical price series when a symbol is clicked
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

  // Generates 1 full year (252 trading days) of fallback candles if network is offline
  const generateFallbackSeries = (symbol: string): HistoricalSeriesPayload => {
    const candles: HistoricalCandle[] = [];
    let price = 1000.0;
    const now = new Date();
    for (let i = 252; i >= 0; i--) {
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
    if (exchangeFilter === "NSE" && isBse) return false;
    if (exchangeFilter === "BSE" && !isBse) return false;

    if (selectedSectorFilter !== "ALL" && t.sector !== selectedSectorFilter) {
      return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSym = t.symbol.toLowerCase().includes(q);
      const matchComp = t.company_name?.toLowerCase().includes(q);
      const matchSec = t.sector?.toLowerCase().includes(q);
      if (!matchSym && !matchComp && !matchSec) return false;
    }
    return true;
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

  const handleSort = (field: "symbol" | "price" | "change") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const indices = tickerList.filter(t => t.type === "INDEX" || ["NIFTY 50", "BANKNIFTY", "SENSEX"].includes(t.symbol));

  const handleOpenInTerminal = (sym: string) => {
    const clean = sym.replace("-EQ", "").trim();
    setSelectedFnoSymbol(clean);
    setActiveTab("fno_terminal");
    setSelectedHistorySymbol(null);
  };

  return (
    <div className="space-y-6">
      {/* Benchmark Indices Cards */}
      {indices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {indices.slice(0, 3).map((indexTicker) => {
            const isPos = indexTicker.change_24h >= 0;
            return (
              <div
                key={indexTicker.symbol}
                onClick={() => setSelectedHistorySymbol(indexTicker.symbol)}
                className="bg-[#161C19] border border-white/[0.065] hover:border-white/[0.12] rounded-sm p-3.5 flex flex-col justify-between cursor-pointer transition-colors hover:bg-[#1B2420]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs font-mono text-[#F2F0E8]">{indexTicker.symbol}</span>
                    <span className="text-[10px] bg-[#111614] border border-white/[0.065] text-[#A7ADA8] px-1.5 py-0.5 rounded-sm font-sans font-medium">
                      {indexTicker.exchange || "NSE"}
                    </span>
                  </div>
                  <span className={`text-[11px] font-mono font-medium flex items-center ${isPos ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                    {isPos ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                    {isPos ? "+" : ""}{indexTicker.change_24h}%
                  </span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-between">
                  <LiveTickPrice
                    value={indexTicker.price}
                    prefix="₹"
                    className="text-lg font-bold font-mono text-[#F2F0E8]"
                  />
                  <span className={`text-[11px] font-mono ${isPos ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                    {isPos ? "+₹" : "-₹"}{Math.abs(indexTicker.change_pts || (indexTicker.price * Math.abs(indexTicker.change_24h) / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controls & Search Strip */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Exchange Filter Switcher */}
          <div className="flex items-center space-x-1 bg-[#0C100F] border border-white/[0.065] p-0.5 rounded-sm">
            {(["ALL", "NSE", "BSE"] as const).map((ex) => (
              <button
                key={ex}
                onClick={() => setExchangeFilter(ex)}
                className={`px-3 py-1 rounded-sm text-xs font-mono font-medium transition-colors ${
                  exchangeFilter === ex
                    ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                    : "text-[#68716C] hover:text-[#A7ADA8]"
                }`}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#68716C]" />
            <input
              type="text"
              placeholder="Search Indian stocks (e.g., RELIANCE, TCS, INFY)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0C100F] border border-white/[0.065] text-[#F2F0E8] text-xs font-sans pl-9 pr-3 py-1.5 rounded-sm focus:outline-none focus:border-white/[0.12] placeholder-[#68716C]"
            />
          </div>

          <div className="text-xs text-[#68716C] font-mono">
            Showing <strong className="text-[#F2F0E8]">{sortedTickers.length}</strong> active equities
          </div>
        </div>

        {/* Sector Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="h-3.5 w-3.5 text-[#68716C] shrink-0" />
          {SECTORS.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSectorFilter(sec)}
              className={`px-2.5 py-1 rounded-sm text-[11px] font-sans font-medium whitespace-nowrap transition-colors ${
                selectedSectorFilter === sec
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "bg-[#0C100F] text-[#68716C] hover:text-[#A7ADA8] border border-transparent"
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Indian Securities Master Table */}
      <div className="border border-white/[0.065] rounded-sm overflow-hidden bg-[#111614]">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0C100F] text-[#68716C] border-b border-white/[0.065] text-[11px] font-sans font-medium">
            <tr>
              <th 
                onClick={() => handleSort("symbol")}
                className="py-3 px-4 cursor-pointer hover:text-[#F2F0E8] transition-colors"
              >
                <div className="flex items-center space-x-1">
                  <span>SYMBOL &amp; COMPANY</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3">SECTOR</th>
              <th 
                onClick={() => handleSort("price")}
                className="py-3 px-3 text-right cursor-pointer hover:text-[#F2F0E8] transition-colors"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>LTP (₹)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th 
                onClick={() => handleSort("change")}
                className="py-3 px-3 text-right cursor-pointer hover:text-[#F2F0E8] transition-colors"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>24H CHANGE</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">DAY RANGE (H / L)</th>
              <th className="py-3 px-4 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {sortedTickers.map((t) => {
              const isPos = t.change_24h >= 0;
              return (
                <tr
                  key={t.symbol}
                  onClick={() => setSelectedHistorySymbol(t.symbol)}
                  className="hover:bg-[#161C19] transition-colors duration-150 cursor-pointer group"
                >
                  <td className="py-2.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#F2F0E8] group-hover:text-[#42A77A] transition-colors">
                        {t.symbol}
                      </span>
                      <span className="text-[10px] font-sans bg-[#0C100F] text-[#68716C] px-1.5 py-0.5 rounded-sm border border-white/[0.065]">
                        {t.exchange || "NSE"}
                      </span>
                    </div>
                    {t.company_name && (
                      <div className="text-[11px] text-[#68716C] font-sans truncate max-w-[220px]">
                        {t.company_name}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[11px] font-sans text-[#A7ADA8] bg-[#0C100F] px-2 py-0.5 rounded-sm border border-white/[0.04]">
                      {t.sector || "Equities"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">
                    <LiveTickPrice
                      value={t.price}
                      prefix="₹"
                      className="font-bold text-[#F2F0E8]"
                    />
                  </td>
                  <td className={`py-2.5 px-3 text-right font-medium ${isPos ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                    {isPos ? "+" : ""}{t.change_24h}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#A7ADA8]">
                    ₹{t.high_24h ? t.high_24h.toFixed(1) : (t.price * 1.01).toFixed(1)} / ₹{t.low_24h ? t.low_24h.toFixed(1) : (t.price * 0.99).toFixed(1)}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <button className="inline-flex items-center space-x-1 bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] text-[11px] font-mono px-2.5 py-1 rounded-sm transition-colors border border-white/[0.065]">
                      <BarChart2 className="h-3 w-3 text-[#159570]" />
                      <span>1Y Chart</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historical Trend Chart Modal with Full 1-Year History & Real-Time Ticks */}
      {selectedHistorySymbol && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-4">
              <div>
                <h3 className="text-base font-semibold font-sans text-[#F2F0E8] flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[#159570]" />
                  <span>1-YEAR HISTORICAL OHLCV &amp; LIVE CHART:</span>
                  <span className="text-[#42A77A] font-mono font-bold">{selectedHistorySymbol}</span>
                </h3>
                <p className="text-xs text-[#A7ADA8] font-sans mt-0.5">
                  Full 1-Year daily price action connected to live market telemetry and CausalGraphX risk engine.
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
              <div className="h-72 flex items-center justify-center space-x-3 text-[#A7ADA8] font-mono text-xs">
                <Zap className="h-4 w-4 text-[#159570] animate-spin" />
                <span>Loading 1-Year Historical Dataset from Database &amp; Yahoo Finance...</span>
              </div>
            ) : historyPayload ? (
              <div className="space-y-6">
                {/* Real-Time Interactive Lightweight Candlestick Chart */}
                <EquityInteractiveChart
                  symbol={selectedHistorySymbol}
                  companyName={historyPayload.company_name}
                  candles={historyPayload.candles}
                  initialLtp={indianTickers[selectedHistorySymbol.replace("-EQ", "")]?.price}
                  onOpenInTradingDesk={() => handleOpenInTerminal(selectedHistorySymbol)}
                />

                {/* Historical Candle Data Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-sans font-medium text-[#A7ADA8] uppercase tracking-wider">
                      Recent Daily OHLCV Records ({historyPayload.candles.length} Days Recorded)
                    </h4>
                    <span className="text-[10px] text-[#68716C] font-mono">Sorted Descending (Latest First)</span>
                  </div>
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
                        {historyPayload.candles.slice(-25).reverse().map((c, i) => (
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
