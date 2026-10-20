"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { 
  createChart, 
  IChartApi, 
  ISeriesApi, 
  ColorType, 
  CandlestickData, 
  LineData,
  CrosshairMode,
  MouseEventParams
} from "lightweight-charts";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { 
  ChartType, 
  DrawingToolType, 
  ChartDrawingObject, 
  IndicatorConfig 
} from "../../types/trading";
import { 
  computeAllIndicators, 
  SyncedIndicatorPoint, 
  calculateEMAValues 
} from "../../lib/indicators";
import { getApiBaseUrl, getWsBaseUrl } from "../../lib/api";
import { 
  ChartToolbar, 
  IndicatorsSubPanel, 
  GrowwOverviewDrawer, 
  GoalMatcherDrawer, 
  OrderExecutionModal 
} from "./index";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Search, 
  Sliders, 
  Check, 
  ChevronDown, 
  Maximize2, 
  Camera, 
  CandlestickChart, 
  LineChart, 
  BarChart3, 
  Cpu, 
  Layers, 
  Table, 
  Info, 
  Clock, 
  ShieldCheck, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";

const NIFTY_EQUITIES = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", basePrice: 1313.10 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", basePrice: 3890.40 },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking", basePrice: 1720.50 },
  { symbol: "INFY", name: "Infosys Ltd", sector: "IT", basePrice: 1845.20 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Banking", basePrice: 1245.80 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", basePrice: 795.30 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecom", basePrice: 1680.00 },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG", basePrice: 475.60 },
  { symbol: "LT", name: "Larsen & Toubro Ltd", sector: "Infrastructure", basePrice: 3520.00 },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Auto", basePrice: 890.50 }
];

export const EquityTerminalView: React.FC = () => {
  const { indianTickers } = usePortfolioStore();

  const [symbol, setSymbol] = useState<string>("RELIANCE");
  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "1D">("1D");
  const [chartType, setChartType] = useState<ChartType>("CANDLE");

  // Indicator Toggles
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    ema9: true,
    ema20: true,
    ema50: false,
    ema200: true,
    bollingerBands: false,
    supertrend: false,
    vwap: false,
    rsi: true,
    macd: true,
    volumeProfile: false
  });

  // Drawings & Tools
  const [activeTool, setActiveTool] = useState<DrawingToolType>("CURSOR");
  const [strokeColor, setStrokeColor] = useState<string>("#159570");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  // Modals & Drawers
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isGoalMatcherOpen, setIsGoalMatcherOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [showDataTable, setShowDataTable] = useState(false);

  // UI Dropdowns
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState("");
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // Raw Candles & Synchronized Indicators Data
  const [rawCandles, setRawCandles] = useState<any[]>([]);
  const [syncedData, setSyncedData] = useState<SyncedIndicatorPoint[]>([]);
  const [timeMap, setTimeMap] = useState<Map<string | number, SyncedIndicatorPoint>>(new Map());

  // Active Crosshair Hover State
  const [hoveredPoint, setHoveredPoint] = useState<SyncedIndicatorPoint | null>(null);

  // Chart References
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Container dimensions
  const [chartWidth, setChartWidth] = useState<number>(1000);

  // Latest point fallback
  const latestPoint = useMemo(() => {
    return syncedData.length > 0 ? syncedData[syncedData.length - 1] : null;
  }, [syncedData]);

  // Current display point (Hovered candle if active, else latest)
  const displayPoint = hoveredPoint || latestPoint;

  // Fetch candle data and compute all indicators
  useEffect(() => {
    let isDisposed = false;
    const cleanSym = symbol.replace("-EQ", "");
    const limit = timeframe === "1D" ? 120 : (timeframe === "1h" ? 250 : 200);

    fetch(`${getApiBaseUrl()}/api/v1/fno/history/${encodeURIComponent(cleanSym)}?timeframe=${timeframe}&limit=${limit}`)
      .then((res) => res.json())
      .then((data: CandlestickData[]) => {
        if (isDisposed || !Array.isArray(data) || data.length === 0) return;

        setRawCandles(data);
        const { points, timeMap: tMap } = computeAllIndicators(data);
        setSyncedData(points);
        setTimeMap(tMap);
      })
      .catch((err) => {
        console.error("Failed to fetch candle history:", err);
      });

    return () => {
      isDisposed = true;
    };
  }, [symbol, timeframe]);

  // Initialize and update Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch {}
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 450;
    setChartWidth(width);

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#111614" },
        textColor: "#A7ADA8",
        fontSize: 11,
        fontFamily: "var(--font-mono, monospace)"
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.35)",
          width: 1,
          style: 3,
          visible: true,
          labelBackgroundColor: "#161C19"
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.35)",
          width: 1,
          style: 3,
          visible: true,
          labelBackgroundColor: "#161C19"
        }
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        scaleMargins: { top: 0.1, bottom: 0.15 }
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.08)",
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    let mainSeries: ISeriesApi<any>;
    if (chartType === "LINE") {
      mainSeries = chart.addLineSeries({
        color: "#42A77A",
        lineWidth: 2,
        priceLineVisible: true
      });
    } else if (chartType === "AREA") {
      mainSeries = chart.addAreaSeries({
        topColor: "rgba(66, 167, 122, 0.3)",
        bottomColor: "rgba(66, 167, 122, 0.0)",
        lineColor: "#42A77A",
        lineWidth: 2
      });
    } else {
      mainSeries = chart.addCandlestickSeries({
        upColor: "#42A77A",
        downColor: "#C45D62",
        borderVisible: false,
        wickUpColor: "#42A77A",
        wickDownColor: "#C45D62"
      });
    }

    seriesRef.current = mainSeries;

    // Moving average overlays
    try {
      if (indicators.ema9) {
        ema9SeriesRef.current = chart.addLineSeries({ color: "#38bdf8", lineWidth: 1, title: "EMA 9" });
      }
      if (indicators.ema20) {
        ema20SeriesRef.current = chart.addLineSeries({ color: "#fbbf24", lineWidth: 1, title: "EMA 20" });
      }
      if (indicators.ema50) {
        ema50SeriesRef.current = chart.addLineSeries({ color: "#a855f7", lineWidth: 1, title: "EMA 50" });
      }
      if (indicators.ema200) {
        ema200SeriesRef.current = chart.addLineSeries({ color: "#f43f5e", lineWidth: 2, title: "SMA 200" });
      }
    } catch {}

    // Populate series data
    if (rawCandles.length > 0) {
      if (chartType === "LINE" || chartType === "AREA") {
        const lineData: LineData[] = rawCandles.map((c) => ({ time: c.time, value: c.close }));
        mainSeries.setData(lineData);
      } else {
        mainSeries.setData(rawCandles);
      }

      const closes = rawCandles.map((c) => c.close);
      if (indicators.ema9 && ema9SeriesRef.current) {
        const ema9 = calculateEMAValues(closes, 9).map((v, i) => ({ time: rawCandles[i].time, value: v }));
        ema9SeriesRef.current.setData(ema9);
      }
      if (indicators.ema20 && ema20SeriesRef.current) {
        const ema20 = calculateEMAValues(closes, 20).map((v, i) => ({ time: rawCandles[i].time, value: v }));
        ema20SeriesRef.current.setData(ema20);
      }
      if (indicators.ema50 && ema50SeriesRef.current) {
        const ema50 = calculateEMAValues(closes, 50).map((v, i) => ({ time: rawCandles[i].time, value: v }));
        ema50SeriesRef.current.setData(ema50);
      }
      if (indicators.ema200 && ema200SeriesRef.current) {
        const ema200 = calculateEMAValues(closes, Math.min(200, closes.length)).map((v, i) => ({ time: rawCandles[i].time, value: v }));
        ema200SeriesRef.current.setData(ema200);
      }

      try {
        chart.timeScale().fitContent();
      } catch {}
    }

    // Subscribe to crosshair move for EXACT MATCHING with equity indicators
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param || !param.time) {
        setHoveredPoint(null);
        return;
      }

      // Look up point from timeMap
      const pt = timeMap.get(param.time as any) || timeMap.get(String(param.time));
      if (pt) {
        setHoveredPoint(pt);
      } else if (param.seriesData && mainSeries) {
        const d = param.seriesData.get(mainSeries) as any;
        if (d && "close" in d) {
          // Fallback matching
          const matched = syncedData.find((p) => p.time === param.time || Math.abs(p.close - d.close) < 0.01);
          setHoveredPoint(matched || null);
        }
      }
    });

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const w = chartContainerRef.current.clientWidth;
        const h = chartContainerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          chartRef.current.applyOptions({ width: w, height: h });
          setChartWidth(w);
        }
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      try { chart.remove(); } catch {}
      chartRef.current = null;
      seriesRef.current = null;
      ema9SeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
    };
  }, [rawCandles, chartType, indicators, timeMap]);

  // Filtered equities list
  const filteredEquities = useMemo(() => {
    if (!symbolFilter) return NIFTY_EQUITIES;
    return NIFTY_EQUITIES.filter(
      (e) =>
        e.symbol.toLowerCase().includes(symbolFilter.toLowerCase()) ||
        e.name.toLowerCase().includes(symbolFilter.toLowerCase()) ||
        e.sector.toLowerCase().includes(symbolFilter.toLowerCase())
    );
  }, [symbolFilter]);

  const toggleIndicator = (key: keyof IndicatorConfig) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4.5rem)] bg-[#0C100F] text-[#F2F0E8] overflow-hidden font-mono select-none rounded-sm border border-white/[0.065] shadow-2xl">
      {/* Top Header & Ticker Strip */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#111614] border-b border-white/[0.065] text-xs shrink-0 gap-2 font-sans">
        {/* Left: Brand & Symbol Selector */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 bg-[#161C19] border border-[#159570]/30 px-2.5 py-1 rounded-sm shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#159570] animate-pulse" />
            <span className="font-bold text-[#F2F0E8] text-xs font-mono">EQUITY TERMINAL</span>
            <span className="text-[10px] bg-[#159570]/20 text-[#42A77A] font-semibold px-1.5 py-0.2 rounded font-mono">
              SYNCED HOVER
            </span>
          </div>

          {/* Symbol Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
              className="flex items-center space-x-2 bg-[#0C100F] border border-white/[0.08] hover:border-[#159570]/50 px-3 py-1 rounded-sm text-xs font-mono transition-colors"
            >
              <span className="font-bold text-[#F2F0E8]">{symbol}</span>
              <span className="text-[10px] text-[#A7ADA8] font-sans">NSE</span>
              <ChevronDown className="h-3 w-3 text-[#68716C]" />
            </button>

            {showSymbolDropdown && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-[#161C19] border border-white/[0.1] rounded-sm p-2 shadow-2xl z-50 space-y-1 font-mono">
                <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#0C100F] rounded border border-white/[0.06] mb-1.5">
                  <Search className="h-3.5 w-3.5 text-[#68716C]" />
                  <input
                    type="text"
                    placeholder="Search Nifty 50..."
                    value={symbolFilter}
                    onChange={(e) => setSymbolFilter(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#F2F0E8] focus:outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {filteredEquities.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        setSymbol(item.symbol);
                        setShowSymbolDropdown(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-sm text-xs flex items-center justify-between transition-colors ${
                        symbol === item.symbol
                          ? "bg-[#159570]/15 text-[#42A77A] font-semibold"
                          : "text-[#A7ADA8] hover:bg-[#1B2420] hover:text-[#F2F0E8]"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[#F2F0E8]">{item.symbol}</div>
                        <div className="text-[10px] text-[#68716C] font-sans">{item.name}</div>
                      </div>
                      <span className="text-[10px] text-[#A7ADA8] font-sans">{item.sector}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeframe Pills */}
          <div className="flex items-center bg-[#0C100F] border border-white/[0.065] rounded-sm p-0.5 font-mono">
            {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded-sm text-[11px] font-medium transition-all ${
                  timeframe === tf
                    ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08] shadow-sm font-semibold"
                    : "text-[#68716C] hover:text-[#A7ADA8]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Style Switcher */}
          <div className="relative font-mono">
            <button
              onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
              className="flex items-center space-x-1.5 bg-[#0C100F] border border-white/[0.065] hover:border-white/[0.12] px-2 py-1 rounded-sm text-[#F2F0E8]"
            >
              {chartType === "CANDLE" && <CandlestickChart className="h-3.5 w-3.5 text-[#159570]" />}
              {chartType === "LINE" && <LineChart className="h-3.5 w-3.5 text-[#159570]" />}
              {chartType === "AREA" && <BarChart3 className="h-3.5 w-3.5 text-[#159570]" />}
              <span className="text-[11px] capitalize">{chartType.toLowerCase()}</span>
              <ChevronDown className="h-3 w-3 text-[#68716C]" />
            </button>

            {showChartTypeMenu && (
              <div className="absolute left-0 top-full mt-1 w-36 bg-[#161C19] border border-white/[0.08] rounded-sm p-1 shadow-2xl z-40 space-y-0.5">
                {[
                  { id: "CANDLE", label: "Candlestick" },
                  { id: "LINE", label: "Line Chart" },
                  { id: "AREA", label: "Area/Mountain" }
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setChartType(c.id as ChartType);
                      setShowChartTypeMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-sm text-xs flex items-center justify-between ${
                      chartType === c.id ? "bg-[#159570]/15 text-[#42A77A] font-semibold" : "text-[#A7ADA8] hover:bg-[#1B2420]"
                    }`}
                  >
                    <span>{c.label}</span>
                    {chartType === c.id && <Check className="h-3 w-3 text-[#42A77A]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Indicators Multi-Toggle Dropdown */}
          <div className="relative font-mono">
            <button
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className="flex items-center space-x-1.5 bg-[#0C100F] border border-white/[0.065] hover:border-white/[0.12] px-2.5 py-1 rounded-sm text-[#F2F0E8]"
            >
              <Sliders className="h-3.5 w-3.5 text-[#159570]" />
              <span className="text-[11px] font-medium">Indicators</span>
              <ChevronDown className="h-3 w-3 text-[#68716C]" />
            </button>

            {showIndicatorMenu && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#161C19] border border-white/[0.08] rounded-sm p-2 shadow-2xl z-40 space-y-1">
                <div className="px-2 py-1 text-[10px] font-mono text-[#A7ADA8] uppercase font-semibold border-b border-white/[0.065]">
                  Active Indicators &amp; Oscillators
                </div>
                {[
                  { key: "rsi" as const, label: "RSI (14) Sub-Panel", color: "#C8A96B" },
                  { key: "macd" as const, label: "MACD (12, 26, 9) Sub-Panel", color: "#42A77A" },
                  { key: "ema9" as const, label: "EMA 9 (Fast Trend)", color: "#38bdf8" },
                  { key: "ema20" as const, label: "EMA 20 (Momentum)", color: "#fbbf24" },
                  { key: "ema50" as const, label: "EMA 50 (Major)", color: "#a855f7" },
                  { key: "ema200" as const, label: "SMA 200 (Long Term)", color: "#f43f5e" }
                ].map((ind) => (
                  <button
                    key={ind.key}
                    onClick={() => toggleIndicator(ind.key)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-[#1B2420] text-[#A7ADA8] text-xs transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                      <span className={indicators[ind.key] ? "font-semibold text-[#F2F0E8]" : "text-[#A7ADA8]"}>
                        {ind.label}
                      </span>
                    </div>
                    {indicators[ind.key] && <Check className="h-3.5 w-3.5 text-[#42A77A]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Trade Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDataTable(!showDataTable)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-xs transition-all border ${
              showDataTable
                ? "bg-[#159570]/20 text-[#42A77A] border-[#159570]/40 font-semibold"
                : "bg-[#0C100F] text-[#A7ADA8] border-white/[0.065] hover:text-[#F2F0E8]"
            }`}
          >
            <Table className="h-3.5 w-3.5" />
            <span>Data Grid</span>
          </button>

          <button
            onClick={() => {
              setOrderSide("BUY");
              setIsOrderModalOpen(true);
            }}
            className="flex items-center space-x-1 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium px-3 py-1 rounded-sm text-xs transition-all shadow-sm"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>BUY</span>
          </button>
          <button
            onClick={() => {
              setOrderSide("SELL");
              setIsOrderModalOpen(true);
            }}
            className="flex items-center space-x-1 bg-[#C45D62] hover:bg-[#A84B50] text-[#F2F0E8] font-medium px-3 py-1 rounded-sm text-xs transition-all shadow-sm"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>SELL</span>
          </button>
        </div>
      </div>

      {/* Synchronized Live Hover HUD Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#0C100F] border-b border-white/[0.065] text-xs font-mono shrink-0 gap-3">
        {displayPoint ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] tabular-nums">
            {/* Timestamp */}
            <div className="flex items-center space-x-1 text-[#68716C]">
              <Clock className="h-3 w-3 text-[#159570]" />
              <span className="text-[#A7ADA8] font-semibold">{displayPoint.dateStr}</span>
              {hoveredPoint && (
                <span className="bg-[#159570]/20 text-[#42A77A] px-1 rounded text-[9px] font-bold">
                  MATCHED
                </span>
              )}
            </div>

            {/* OHLC */}
            <div className="flex items-center space-x-2.5">
              <span>O: <strong className="text-[#F2F0E8]">₹{displayPoint.open.toFixed(2)}</strong></span>
              <span>H: <strong className="text-[#F2F0E8]">₹{displayPoint.high.toFixed(2)}</strong></span>
              <span>L: <strong className="text-[#F2F0E8]">₹{displayPoint.low.toFixed(2)}</strong></span>
              <span>C: <strong className={displayPoint.isGreen ? "text-[#42A77A]" : "text-[#C45D62]"}>₹{displayPoint.close.toFixed(2)}</strong></span>
              <span className={displayPoint.isGreen ? "text-[#42A77A]" : "text-[#C45D62]"}>
                ({displayPoint.isGreen ? "+" : ""}{displayPoint.changePct.toFixed(2)}%)
              </span>
            </div>

            {/* Exact RSI Match */}
            <div className="flex items-center space-x-1 border-l border-white/[0.08] pl-3">
              <span className="text-[#A7ADA8]">RSI(14):</span>
              <strong className={`font-bold ${
                displayPoint.rsi >= 70 ? "text-[#C45D62]" : displayPoint.rsi <= 30 ? "text-[#42A77A]" : "text-[#F2F0E8]"
              }`}>
                {displayPoint.rsi.toFixed(2)}
              </strong>
              <span className="text-[9px] px-1 rounded bg-[#161C19] text-[#A7ADA8] border border-white/[0.06]">
                {displayPoint.rsiStatus}
              </span>
            </div>

            {/* Exact MACD Match */}
            <div className="flex items-center space-x-2 border-l border-white/[0.08] pl-3">
              <span>MACD: <strong className={displayPoint.macd >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}>{displayPoint.macd >= 0 ? `+${displayPoint.macd.toFixed(2)}` : displayPoint.macd.toFixed(2)}</strong></span>
              <span>Sig: <strong className="text-[#C8A96B]">{displayPoint.macdSignal >= 0 ? `+${displayPoint.macdSignal.toFixed(2)}` : displayPoint.macdSignal.toFixed(2)}</strong></span>
              <span>Hist: <strong className={displayPoint.macdHist >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}>{displayPoint.macdHist >= 0 ? `+${displayPoint.macdHist.toFixed(2)}` : displayPoint.macdHist.toFixed(2)}</strong></span>
            </div>

            {/* Moving Averages */}
            <div className="hidden lg:flex items-center space-x-2 border-l border-white/[0.08] pl-3 text-[10px] text-[#A7ADA8]">
              <span>EMA9: <span className="text-[#38bdf8]">₹{displayPoint.ema9}</span></span>
              <span>EMA20: <span className="text-[#fbbf24]">₹{displayPoint.ema20}</span></span>
              <span>SMA200: <span className="text-[#f43f5e]">₹{displayPoint.sma200}</span></span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-[#68716C] italic font-sans flex items-center space-x-2">
            <Activity className="h-3.5 w-3.5 text-[#159570] animate-pulse" />
            <span>Hover on candlestick chart to view exact matched indicators</span>
          </div>
        )}

        <div className="text-[10px] text-[#68716C] flex items-center space-x-1.5 font-sans">
          <ShieldCheck className="h-3.5 w-3.5 text-[#159570]" />
          <span>REAL-TIME DUAL SYNC</span>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Floating Drawing & Tool Bar */}
        <div className="relative">
          <ChartToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            strokeColor={strokeColor}
            setStrokeColor={setStrokeColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            onUndo={() => {}}
            onClear={() => {}}
            onOpenGoalMatcher={() => setIsGoalMatcherOpen(true)}
            onOpenOverview={() => setIsOverviewOpen(true)}
            onOpenOrderModal={() => setIsOrderModalOpen(true)}
          />
        </div>

        {/* Center: Candlestick Chart & Synchronized Indicator Sub-Panels */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Candlestick Canvas Container */}
          <div className="flex-1 w-full relative">
            <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
          </div>

          {/* Synchronized RSI and MACD Indicator Sub-Panel */}
          <IndicatorsSubPanel
            indicators={indicators}
            onCloseIndicator={(k) => setIndicators((prev) => ({ ...prev, [k]: false }))}
            width={chartWidth}
            data={syncedData}
            hoveredPoint={hoveredPoint}
            onHoverIndex={(idx) => {
              if (idx !== null && idx >= 0 && idx < syncedData.length) {
                setHoveredPoint(syncedData[idx]);
              } else {
                setHoveredPoint(null);
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Collapsible Exact Matching Data Table */}
      {showDataTable && (
        <div className="h-44 border-t border-white/[0.08] bg-[#0C100F] flex flex-col font-mono text-[11px] shrink-0">
          <div className="px-3 py-1.5 bg-[#111614] border-b border-white/[0.06] flex items-center justify-between text-[#A7ADA8] text-[10px]">
            <span className="font-bold text-[#F2F0E8]">SYNCHRONIZED CANDLESTICK &amp; QUANT DATA ENGINE</span>
            <span>Showing last {Math.min(30, syncedData.length)} candles with exact mathematical match</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead className="bg-[#111614] text-[#68716C] sticky top-0 text-[10px] border-b border-white/[0.06]">
                <tr>
                  <th className="py-1 px-2.5">Date</th>
                  <th className="py-1 px-2.5">Open</th>
                  <th className="py-1 px-2.5">High</th>
                  <th className="py-1 px-2.5">Low</th>
                  <th className="py-1 px-2.5">Close</th>
                  <th className="py-1 px-2.5">% Chg</th>
                  <th className="py-1 px-2.5 text-[#C8A96B]">RSI(14)</th>
                  <th className="py-1 px-2.5 text-[#42A77A]">MACD</th>
                  <th className="py-1 px-2.5 text-[#C8A96B]">Signal</th>
                  <th className="py-1 px-2.5">Hist</th>
                  <th className="py-1 px-2.5 text-[#38bdf8]">EMA 9</th>
                  <th className="py-1 px-2.5 text-[#fbbf24]">EMA 20</th>
                </tr>
              </thead>
              <tbody>
                {syncedData.slice(-30).reverse().map((pt) => {
                  const isHovered = hoveredPoint?.index === pt.index;
                  return (
                    <tr
                      key={pt.index}
                      onMouseEnter={() => setHoveredPoint(pt)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      className={`border-b border-white/[0.03] transition-colors cursor-pointer ${
                        isHovered
                          ? "bg-[#159570]/20 text-[#F2F0E8]"
                          : "hover:bg-[#161C19] text-[#A7ADA8]"
                      }`}
                    >
                      <td className="py-1 px-2.5 text-[#F2F0E8]">{pt.dateStr}</td>
                      <td className="py-1 px-2.5">₹{pt.open.toFixed(2)}</td>
                      <td className="py-1 px-2.5">₹{pt.high.toFixed(2)}</td>
                      <td className="py-1 px-2.5">₹{pt.low.toFixed(2)}</td>
                      <td className={`py-1 px-2.5 font-semibold ${pt.isGreen ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                        ₹{pt.close.toFixed(2)}
                      </td>
                      <td className={`py-1 px-2.5 ${pt.isGreen ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                        {pt.isGreen ? "+" : ""}{pt.changePct.toFixed(2)}%
                      </td>
                      <td className="py-1 px-2.5 font-bold text-[#C8A96B]">{pt.rsi.toFixed(2)}</td>
                      <td className={`py-1 px-2.5 ${pt.macd >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                        {pt.macd >= 0 ? `+${pt.macd.toFixed(2)}` : pt.macd.toFixed(2)}
                      </td>
                      <td className="py-1 px-2.5 text-[#C8A96B]">{pt.macdSignal.toFixed(2)}</td>
                      <td className={`py-1 px-2.5 font-bold ${pt.macdHist >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                        {pt.macdHist >= 0 ? `+${pt.macdHist.toFixed(2)}` : pt.macdHist.toFixed(2)}
                      </td>
                      <td className="py-1 px-2.5 text-[#38bdf8]">₹{pt.ema9}</td>
                      <td className="py-1 px-2.5 text-[#fbbf24]">₹{pt.ema20}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <GrowwOverviewDrawer
        symbol={symbol}
        currentPrice={displayPoint ? displayPoint.close : 1313.10}
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        onOpenOrderModal={(side) => {
          setOrderSide(side);
          setIsOrderModalOpen(true);
        }}
      />

      <GoalMatcherDrawer
        symbol={symbol}
        currentPrice={displayPoint ? displayPoint.close : 1313.10}
        prediction={null}
        onApplyPrediction={() => {}}
        isOpen={isGoalMatcherOpen}
        onClose={() => setIsGoalMatcherOpen(false)}
      />

      <OrderExecutionModal
        symbol={symbol}
        currentPrice={displayPoint ? displayPoint.close : 1313.10}
        initialSide={orderSide}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
    </div>
  );
};
