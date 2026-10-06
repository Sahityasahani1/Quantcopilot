"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { OptionChain } from "./OptionChain";
import { TopTickerStrip } from "./TopTickerStrip";
import { MarketDepthWatchlist } from "./MarketDepthWatchlist";
import { 
  ChartToolbar, 
  ChartTopControlBar, 
  ChartDrawingOverlay, 
  GoalMatcherDrawer, 
  GrowwOverviewDrawer, 
  OrderExecutionModal, 
  IndicatorsSubPanel,
  recomputePatternMetrics,
  AiScanDashboard
} from "../trading";
import { 
  ChartType, 
  DrawingToolType, 
  ChartDrawingObject, 
  ChartPatternData,
  IndicatorConfig, 
  PredictionPayload,
  DetectedPatternAPI,
  Point
} from "../../types/trading";
import { Activity, X, Cpu } from "lucide-react";
import { getApiBaseUrl, getWsBaseUrl } from "../../lib/api";


export const TradingTerminal: React.FC = () => {
  const {
    selectedFnoSymbol,
    setSelectedFnoSymbol,
    selectedSplitContract,
    setSelectedSplitContract,
    fnoMarketDepth,
    fetchFnoDepth,
    gnnContagionSignal,
    fetchGnnSignals,
    indianTickers
  } = usePortfolioStore();

  const [activeDesk, setActiveDesk] = useState<"EQUITY" | "FNO" | "AI_SCAN">("FNO");

  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h" | "1D">("5m");
  const [chartType, setChartType] = useState<ChartType>("CANDLE");

  // Indicators state
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    ema9: false,
    ema20: false,
    ema50: false,
    ema200: false,
    bollingerBands: false,
    supertrend: false,
    vwap: false,
    rsi: false,
    macd: false,
    volumeProfile: false
  });

  // Drawing Tools state
  const [activeTool, setActiveTool] = useState<DrawingToolType>("CURSOR");
  const [strokeColor, setStrokeColor] = useState<string>("#10b981");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [drawings, setDrawings] = useState<ChartDrawingObject[]>([]);

  // Modals & Drawers state
  const [isGoalMatcherOpen, setIsGoalMatcherOpen] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderModalSide, setOrderModalSide] = useState<"BUY" | "SELL">("BUY");

  // Prediction payload applied to chart
  const [prediction, setPrediction] = useState<PredictionPayload | null>(null);

  // AI Pattern Scanning State
  const [isScanningPatterns, setIsScanningPatterns] = useState<boolean>(false);
  const [detectedPatternsCount, setDetectedPatternsCount] = useState<number>(0);
  const [patternNotification, setPatternNotification] = useState<string | null>(null);

  // Live Hover Candle for OHLCV crosshair inspector

  const [hoverCandle, setHoverCandle] = useState<{ open: number; high: number; low: number; close: number; volume?: number; time?: string | number } | null>(null);

  // Container dimensions
  const [chartDims, setChartDims] = useState<{ width: number; height: number }>({ width: 800, height: 400 });

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const splitChartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const splitChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const splitSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const latestCandleRef = useRef<any>(null);
  const livePriceRef = useRef<number>(24144.10);

  // Indicator series refs
  const ema9SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  // Current ticker spot price
  const cleanSym = selectedFnoSymbol.replace("-EQ", "");
  const currentTicker = indianTickers[cleanSym] || indianTickers[selectedFnoSymbol];
  const currentSpotPrice = currentTicker ? currentTicker.price : 24144.10;

  useEffect(() => {
    fetchFnoDepth(selectedFnoSymbol);
    fetchGnnSignals();
  }, [selectedFnoSymbol, fetchFnoDepth, fetchGnnSignals]);

  // Main Chart Initialization
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let isDisposed = false;

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {}
      chartRef.current = null;
    }

    const width = chartContainerRef.current.clientWidth || 800;
    const height = chartContainerRef.current.clientHeight || 400;
    setChartDims({ width, height });

    let chart: IChartApi;
    try {
      chart = createChart(chartContainerRef.current, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "#0C100F" },
          textColor: "#A7ADA8",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.04)" },
          horzLines: { color: "rgba(255, 255, 255, 0.04)" },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.065)", scaleMargins: { top: 0.1, bottom: 0.2 } },
        timeScale: { borderColor: "rgba(255, 255, 255, 0.065)", timeVisible: true, secondsVisible: false },
      });
    } catch {
      return;
    }

    let mainSeries: ISeriesApi<any>;
    try {
      if (chartType === "LINE") {
        mainSeries = chart.addLineSeries({
          color: "#42A77A",
          lineWidth: 2,
        });
      } else if (chartType === "AREA") {
        mainSeries = chart.addAreaSeries({
          topColor: "rgba(66, 167, 122, 0.3)",
          bottomColor: "rgba(66, 167, 122, 0.0)",
          lineColor: "#42A77A",
          lineWidth: 2,
        });
      } else {
        mainSeries = chart.addCandlestickSeries({
          upColor: "#42A77A",
          downColor: "#C45D62",
          borderVisible: false,
          wickUpColor: "#42A77A",
          wickDownColor: "#C45D62",
        });
      }
    } catch {
      try { chart.remove(); } catch {}
      return;
    }

    chartRef.current = chart;
    seriesRef.current = mainSeries;

    // Optional EMA Overlays
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

    // Subscribe to crosshair move for live OHLCV inspector
    try {
      chart.subscribeCrosshairMove((param: MouseEventParams) => {
        if (isDisposed) return;
        if (param.time && param.seriesData && mainSeries) {
          try {
            const data = param.seriesData.get(mainSeries) as any;
            if (data) {
              if ("open" in data) {
                setHoverCandle({
                  open: data.open,
                  high: data.high,
                  low: data.low,
                  close: data.close,
                  time: param.time as any
                });
              } else if ("value" in data) {
                setHoverCandle({
                  open: data.value,
                  high: data.value,
                  low: data.value,
                  close: data.value,
                  time: param.time as any
                });
              }
            }
          } catch {}
        }
      });
    } catch {}

    // Fetch candle history (Full 1-Year on 1D timeframe)
    const queryLimit = timeframe === "1D" ? 365 : (timeframe === "1h" ? 250 : (timeframe === "15m" ? 200 : 160));
    fetch(`${getApiBaseUrl()}/api/v1/fno/history/${encodeURIComponent(selectedFnoSymbol)}?timeframe=${timeframe}&limit=${queryLimit}`)
      .then((res) => res.json())
      .then((data: CandlestickData[]) => {
        if (isDisposed) return;
        if (!chartRef.current || !seriesRef.current) return;

        try {
          if (data && data.length > 0 && seriesRef.current) {
            latestCandleRef.current = { ...data[data.length - 1] };
            livePriceRef.current = data[data.length - 1].close;

            if (chartType === "LINE" || chartType === "AREA") {
              const lineData: LineData[] = data.map(d => ({ time: d.time, value: d.close }));
              mainSeries.setData(lineData);
            } else if (chartType === "HEIKIN_ASHI") {
              const haData: CandlestickData[] = [];
              for (let i = 0; i < data.length; i++) {
                const cur = data[i];
                const prevHa = i > 0 ? haData[i - 1] : cur;
                const haClose = (cur.open + cur.high + cur.low + cur.close) / 4;
                const haOpen = i === 0 ? cur.open : (prevHa.open + prevHa.close) / 2;
                const haHigh = Math.max(cur.high, haOpen, haClose);
                const haLow = Math.min(cur.low, haOpen, haClose);
                haData.push({
                  time: cur.time,
                  open: Number(haOpen.toFixed(2)),
                  high: Number(haHigh.toFixed(2)),
                  low: Number(haLow.toFixed(2)),
                  close: Number(haClose.toFixed(2))
                });
              }
              mainSeries.setData(haData);
            } else {
              mainSeries.setData(data);
            }

            if (indicators.ema9 && ema9SeriesRef.current) {
              const ema9 = calculateEMA(data, 9);
              ema9SeriesRef.current.setData(ema9);
            }
            if (indicators.ema20 && ema20SeriesRef.current) {
              const ema20 = calculateEMA(data, 20);
              ema20SeriesRef.current.setData(ema20);
            }
            if (indicators.ema50 && ema50SeriesRef.current) {
              const ema50 = calculateEMA(data, 50);
              ema50SeriesRef.current.setData(ema50);
            }
            if (indicators.ema200 && ema200SeriesRef.current) {
              const ema200 = calculateEMA(data, Math.min(60, data.length - 1));
              ema200SeriesRef.current.setData(ema200);
            }
          }
        } catch {}
      })
      .catch(() => {});

    // WebSocket real-time updates for high-precision live ticks
    const ws = new WebSocket(`${getWsBaseUrl()}/ws/live-feed`);

    ws.onmessage = (event) => {
      if (isDisposed) return;
      try {
        const msg = JSON.parse(event.data);
        if (!msg || msg.type !== "TICK") return;

        const targetSym = selectedFnoSymbol.replace("-EQ", "").trim().toUpperCase();
        const msgSym = (msg.symbol || "").replace("-EQ", "").trim().toUpperCase();
        const msgClean = (msg.symbol_clean || "").replace("-EQ", "").trim().toUpperCase();

        // 1. Direct stock / benchmark match
        let isMatch = targetSym === msgSym || targetSym === msgClean;
        let livePrice: number | null = msg.ticker ? msg.ticker.price : (msg.candle ? msg.candle.close : null);

        // 2. Option contract matching (derive option price tick from underlying spot)
        if (!isMatch && (targetSym.startsWith(msgSym) || targetSym.startsWith(msgClean))) {
          const parts = targetSym.split(" ");
          if (parts.length >= 3) {
            const strike = parseFloat(parts[1]);
            const optType = parts[2].toUpperCase();
            if (!isNaN(strike) && livePrice != null) {
              const spot = livePrice;
              const intr = optType === "CE" ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
              const timeVal = Math.max(12.0, spot * 0.007);
              livePrice = Number((intr + timeVal).toFixed(2));
              isMatch = true;
            }
          }
        }

        if (isMatch && livePrice != null && seriesRef.current && !isDisposed) {
          try {
            const nowSec = Math.floor(Date.now() / 1000);
            const intervalSec = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : timeframe === "1h" ? 3600 : 86400;

            livePriceRef.current = livePrice;

            if (latestCandleRef.current) {
              const prev = latestCandleRef.current;
              const barTime = timeframe === "1D" ? prev.time : Math.floor(nowSec / intervalSec) * intervalSec;
              
              const updatedHigh = Math.max(prev.high, livePrice);
              const updatedLow = Math.min(prev.low, livePrice);
              const updatedBar = {
                time: barTime,
                open: prev.open,
                high: Number(updatedHigh.toFixed(2)),
                low: Number(updatedLow.toFixed(2)),
                close: Number(livePrice.toFixed(2))
              };

              latestCandleRef.current = updatedBar;

              if (chartType === "LINE" || chartType === "AREA") {
                mainSeries.update({ time: barTime, value: Number(livePrice.toFixed(2)) });
              } else {
                mainSeries.update(updatedBar);
              }

              // Flash live OHLCV inspector with every small price tick
              setHoverCandle({
                open: prev.open,
                high: updatedBar.high,
                low: updatedBar.low,
                close: updatedBar.close,
                time: barTime
              });
            }
          } catch {}
        }
      } catch {}
    };

    const handleResize = () => {
      if (isDisposed) return;
      if (chartContainerRef.current && chartRef.current) {
        try {
          const newWidth = chartContainerRef.current.clientWidth;
          const newHeight = chartContainerRef.current.clientHeight;
          chartRef.current.applyOptions({ width: newWidth, height: newHeight });
          setChartDims({ width: newWidth, height: newHeight });
        } catch {}
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      try {
        ws.close();
      } catch {}
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
      seriesRef.current = null;
      ema9SeriesRef.current = null;
      ema20SeriesRef.current = null;
      ema50SeriesRef.current = null;
      ema200SeriesRef.current = null;
    };
  }, [selectedFnoSymbol, timeframe, chartType, indicators]);

  // Split Contract Chart
  useEffect(() => {
    let isSplitDisposed = false;

    if (!selectedSplitContract || !splitChartContainerRef.current) {
      if (splitChartRef.current) {
        try {
          splitChartRef.current.remove();
        } catch {}
        splitChartRef.current = null;
      }
      return;
    }

    if (splitChartRef.current) {
      try {
        splitChartRef.current.remove();
      } catch {}
      splitChartRef.current = null;
    }

    let splitChart: IChartApi;
    let splitSeries: ISeriesApi<"Candlestick">;
    try {
      splitChart = createChart(splitChartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: "#0C100F" },
          textColor: "#A7ADA8",
        },
        grid: {
          vertLines: { color: "rgba(255, 255, 255, 0.04)" },
          horzLines: { color: "rgba(255, 255, 255, 0.04)" },
        },
        rightPriceScale: { borderColor: "rgba(255, 255, 255, 0.065)" },
        timeScale: { borderColor: "rgba(255, 255, 255, 0.065)", timeVisible: true },
      });

      splitSeries = splitChart.addCandlestickSeries({
        upColor: "#42A77A",
        downColor: "#C45D62",
        borderVisible: false,
        wickUpColor: "#42A77A",
        wickDownColor: "#C45D62",
      });
    } catch {
      return;
    }

    splitChartRef.current = splitChart;
    splitSeriesRef.current = splitSeries;

    fetch(`${getApiBaseUrl()}/api/v1/fno/history/${encodeURIComponent(selectedSplitContract)}?timeframe=${timeframe}&limit=80`)

      .then((res) => res.json())
      .then((data: CandlestickData[]) => {
        if (isSplitDisposed) return;
        if (!splitChartRef.current || !splitSeriesRef.current) return;
        try {
          if (data && data.length > 0 && splitSeriesRef.current) {
            splitSeries.setData(data);
          }
        } catch {}
      })
      .catch(() => {});

    const handleResize = () => {
      if (isSplitDisposed) return;
      if (splitChartContainerRef.current && splitChartRef.current) {
        try {
          splitChartRef.current.applyOptions({ width: splitChartContainerRef.current.clientWidth });
        } catch {}
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isSplitDisposed = true;
      window.removeEventListener("resize", handleResize);
      try {
        splitChart.remove();
      } catch {}
      splitChartRef.current = null;
      splitSeriesRef.current = null;
    };
  }, [selectedSplitContract, timeframe]);

  // Helper for EMA calculation
  const calculateEMA = (candles: CandlestickData[], period: number): LineData[] => {
    const result: LineData[] = [];
    const k = 2 / (period + 1);
    let ema = candles[0].close;

    for (let i = 0; i < candles.length; i++) {
      const price = candles[i].close;
      if (i === 0) {
        ema = price;
      } else {
        ema = price * k + ema * (1 - k);
      }
      if (i >= period - 1) {
        result.push({ time: candles[i].time, value: Number(ema.toFixed(2)) });
      }
    }
    return result;
  };

  const handleUndo = () => {
    setDrawings(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDrawings([]);
    if (prediction) {
      setPrediction(prev => prev ? { ...prev, appliedToChart: false } : null);
    }
  };

  const handleTradePattern = (side: "BUY" | "SELL", price: number, target: number, stop: number) => {
    setOrderModalSide(side);
    setIsOrderModalOpen(true);
  };

  const handleApplyPattern = (patternType: ChartPatternData["type"]) => {
    const px = Math.round((chartDims.width || 800) * 0.45);
    const py = Math.round((chartDims.height || 400) * 0.45);
    let points: { x: number; y: number }[] = [];
    let name = "Double Bottom";
    let breakoutType: "BULLISH" | "BEARISH" = "BULLISH";
    let color = "#10b981";

    if (patternType === "PATTERN_DOUBLE_BOTTOM") {
      name = "Double Bottom (W)";
      breakoutType = "BULLISH";
      color = "#10b981";
      points = [
        { x: px - 80, y: py - 40 },
        { x: px - 40, y: py + 30 },
        { x: px, y: py - 10 },
        { x: px + 40, y: py + 28 },
        { x: px + 80, y: py - 40 },
        { x: px + 120, y: py - 70 }
      ];
    } else if (patternType === "PATTERN_DOUBLE_TOP") {
      name = "Double Top (M)";
      breakoutType = "BEARISH";
      color = "#f43f5e";
      points = [
        { x: px - 80, y: py + 40 },
        { x: px - 40, y: py - 30 },
        { x: px, y: py + 10 },
        { x: px + 40, y: py - 28 },
        { x: px + 80, y: py + 40 },
        { x: px + 120, y: py + 70 }
      ];
    } else if (patternType === "PATTERN_HEAD_AND_SHOULDERS") {
      name = "Head & Shoulders";
      breakoutType = "BEARISH";
      color = "#f43f5e";
      points = [
        { x: px - 90, y: py + 20 },
        { x: px - 60, y: py - 20 },
        { x: px - 30, y: py + 15 },
        { x: px, y: py - 50 },
        { x: px + 30, y: py + 15 },
        { x: px + 60, y: py - 20 },
        { x: px + 90, y: py + 20 },
        { x: px + 120, y: py + 60 }
      ];
    } else if (patternType === "PATTERN_BULL_FLAG") {
      name = "Bull Flag Channel";
      breakoutType = "BULLISH";
      color = "#06b6d4";
      points = [
        { x: px - 80, y: py + 60 },
        { x: px - 40, y: py - 40 },
        { x: px - 10, y: py - 20 },
        { x: px + 20, y: py - 45 },
        { x: px + 50, y: py - 25 },
        { x: px + 90, y: py - 80 }
      ];
    } else if (patternType === "PATTERN_ASCENDING_TRIANGLE") {
      name = "Ascending Triangle";
      breakoutType = "BULLISH";
      color = "#f59e0b";
      points = [
        { x: px - 80, y: py + 40 },
        { x: px - 50, y: py - 20 },
        { x: px - 20, y: py + 20 },
        { x: px + 10, y: py - 20 },
        { x: px + 40, y: py + 5 },
        { x: px + 70, y: py - 20 },
        { x: px + 110, y: py - 60 }
      ];
    }

    const raw: ChartPatternData = {
      id: `pat-${Date.now()}`,
      type: patternType,
      name,
      points,
      necklinePrice: Number(currentSpotPrice.toFixed(2)),
      targetPrice: Number((currentSpotPrice * (breakoutType === "BULLISH" ? 1.05 : 0.95)).toFixed(2)),
      breakoutType,
      color
    };

    const newPat = recomputePatternMetrics(raw, currentSpotPrice);
    setDrawings((prev) => [...prev, newPat]);
    setActiveTool("CURSOR");
  };

  const handleScanPatterns = async () => {
    if (isScanningPatterns) return;
    setIsScanningPatterns(true);
    setPatternNotification(null);

    try {
      const clean = selectedFnoSymbol.replace("-EQ", "");
      const res = await fetch(`${getApiBaseUrl()}/api/v1/fno/detect-patterns/${encodeURIComponent(clean)}?timeframe=${timeframe}&limit=120`);

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data: DetectedPatternAPI[] = await res.json();
      setDetectedPatternsCount(data.length);

      if (!data || data.length === 0) {
        setPatternNotification(`AI Pattern Engine: No active chart formations detected on ${clean} (${timeframe}). Try another timeframe or symbol.`);
        setTimeout(() => setPatternNotification(null), 5000);
        setIsScanningPatterns(false);
        return;
      }

      const chart = chartRef.current;
      const series = seriesRef.current;
      const width = chartDims.width || 800;
      const height = chartDims.height || 400;

      const newPatterns: ChartPatternData[] = [];

      data.forEach((pat) => {
        const mappedPoints: Point[] = [];

        pat.pivots.forEach((piv, pIdx) => {
          let px: number | null = null;
          let py: number | null = null;

          if (chart && series) {
            try {
              px = chart.timeScale().timeToCoordinate(piv.time as any);
              py = series.priceToCoordinate(piv.price);
            } catch {}
          }

          if (px === null || px === undefined) {
            const prev = mappedPoints[pIdx - 1];
            px = prev ? prev.x + 35 : width * 0.45 + pIdx * 25;
          }

          if (py === null || py === undefined) {
            const prev = mappedPoints[pIdx - 1];
            py = prev ? prev.y : height * 0.45;
          }

          mappedPoints.push({ x: Math.round(px), y: Math.round(py) });
        });

        const patObj: ChartPatternData = {
          id: pat.id,
          type: pat.pattern_type,
          name: pat.name,
          points: mappedPoints,
          necklinePrice: pat.neckline_price,
          targetPrice: pat.target_price,
          stopLossPrice: pat.stop_loss_price,
          targetPct: pat.target_pct,
          stopLossPct: pat.stop_loss_pct,
          riskRewardRatio: pat.risk_reward_ratio,
          breakoutType: pat.breakout_type,
          color: pat.breakout_type === "BULLISH" ? "#10b981" : "#f43f5e",
          confidencePct: pat.confidence_pct,
          status: pat.status,
          description: pat.description,
          isAiDetected: true
        };

        newPatterns.push(patObj);
      });

      // Clear previous AI patterns and plot the newly detected ones snapped to wicks
      setDrawings((prev) => [
        ...prev.filter((d) => !d.id.startsWith("ai-pat-")),
        ...newPatterns
      ]);

      const patternSummary = data.map((p) => `${p.name} (${p.confidence_pct}%)`).join(", ");
      setPatternNotification(`AI Engine Auto-Plotted ${data.length} Formations: ${patternSummary}`);
      setTimeout(() => setPatternNotification(null), 6000);

    } catch (err: any) {
      setPatternNotification(`AI Pattern Scan Error: ${err.message}`);
      setTimeout(() => setPatternNotification(null), 4000);
    } finally {
      setIsScanningPatterns(false);
    }
  };

  const handleOpenOrderModal = (side: "BUY" | "SELL") => {

    setOrderModalSide(side);
    setIsOrderModalOpen(true);
  };

  const handleTakeSnapshot = () => {
    if (chartContainerRef.current) {
      alert(`Chart snapshot of ${selectedFnoSymbol} saved!`);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] w-full bg-[#111614] text-[#F2F0E8] overflow-hidden font-mono select-none rounded-sm border border-white/[0.065] shadow-2xl">
      <TopTickerStrip />

      {/* Desk Switcher & Engine Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0C100F] border-b border-white/[0.065] text-xs shrink-0 font-sans">
        <div className="flex items-center space-x-1 bg-[#111614] p-0.5 rounded-sm border border-white/[0.065]">
          <button
            onClick={() => setActiveDesk("EQUITY")}
            className={`px-3 py-1 rounded-sm text-xs font-medium transition-all duration-150 ${
              activeDesk === "EQUITY" ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08] shadow-sm" : "text-[#A7ADA8] hover:text-[#F2F0E8]"
            }`}
          >
            EQUITY TERMINAL
          </button>
          <button
            onClick={() => setActiveDesk("FNO")}
            className={`px-3 py-1 rounded-sm text-xs font-medium transition-all duration-150 ${
              activeDesk === "FNO" ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08] shadow-sm" : "text-[#A7ADA8] hover:text-[#F2F0E8]"
            }`}
          >
            F&amp;O OPTIONS DESK
          </button>
          <button
            onClick={() => setActiveDesk("AI_SCAN")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-sm text-xs font-medium transition-all duration-150 ${
              activeDesk === "AI_SCAN"
                ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08] shadow-sm"
                : "text-[#A7ADA8] hover:text-[#F2F0E8]"
            }`}
          >
            <Cpu className="h-3.5 w-3.5 text-[#159570]" />
            <span>AI SCAN &amp; POLICY</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="text-[#A7ADA8] flex items-center gap-1.5 text-[11px]">
            <Activity className="h-3.5 w-3.5 text-[#159570]" /> GNN RISK ENGINE ACTIVE
          </span>
        </div>
      </div>

      <div key={activeDesk} className="flex flex-1 overflow-hidden animate-fade-in-up">
        {activeDesk === "AI_SCAN" ? (
          <div className="flex-1 flex overflow-hidden border-r border-white/[0.065]">
            <AiScanDashboard
              selectedSymbol={selectedFnoSymbol}
              onSelectSymbol={(sym) => {
                setSelectedFnoSymbol(sym);
                setSelectedSplitContract(null);
              }}
              onOpenOrderModal={handleOpenOrderModal}
            />
          </div>
        ) : (
          /* Main Chart Area */
          <div className="flex-1 flex flex-col border-r border-white/[0.065] overflow-hidden">
            <div className={`flex ${activeDesk === "FNO" ? "h-[55%]" : "h-full"} w-full`}>

            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Top Control Bar */}
              <ChartTopControlBar
                symbol={selectedFnoSymbol}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                chartType={chartType}
                setChartType={setChartType}
                indicators={indicators}
                setIndicators={setIndicators}
                hoverCandle={hoverCandle}
                onOpenOrderModal={handleOpenOrderModal}
                onTakeSnapshot={handleTakeSnapshot}
                onToggleFullscreen={handleToggleFullscreen}
                onApplyPattern={handleApplyPattern}
                onScanPatterns={handleScanPatterns}
                isScanningPatterns={isScanningPatterns}
                detectedPatternsCount={detectedPatternsCount}
              />

              {/* Chart Drawing Toolbar (Left Floating) */}
              <ChartToolbar
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                strokeWidth={strokeWidth}
                setStrokeWidth={setStrokeWidth}
                onUndo={handleUndo}
                onClear={handleClear}
                onOpenGoalMatcher={() => setIsGoalMatcherOpen(true)}
                onOpenOverview={() => setIsOverviewOpen(true)}
                onOpenOrderModal={() => handleOpenOrderModal("BUY")}
              />

              {/* Lightweight Chart Canvas Container & Drawing Overlay */}
              <div className="flex-1 w-full relative">
                <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
                
                {/* AI Pattern Scan Notification HUD */}
                {patternNotification && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#0b0f17]/95 border border-slate-700 text-slate-200 text-xs px-3.5 py-1.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse shrink-0" />
                    <span className="font-semibold font-sans">{patternNotification}</span>
                    <button onClick={() => setPatternNotification(null)} className="ml-1 text-slate-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <ChartDrawingOverlay
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  strokeColor={strokeColor}
                  strokeWidth={strokeWidth}
                  drawings={drawings}
                  setDrawings={setDrawings}
                  currentSpotPrice={currentSpotPrice}
                  prediction={prediction}
                  width={chartDims.width}
                  height={chartDims.height}
                  onTradePattern={handleTradePattern}
                />
              </div>

              {/* RSI / MACD Indicators Sub-Panel */}
              <IndicatorsSubPanel
                indicators={indicators}
                onCloseIndicator={(k) => setIndicators(prev => ({ ...prev, [k]: false }))}
                width={chartDims.width}
              />
            </div>

            {/* Split Contract Chart if Selected */}
            {selectedSplitContract && (
              <div className="flex-1 flex flex-col border-l border-white/[0.065]">
                <div className="px-3 py-1 bg-[#0C100F] border-b border-white/[0.065] flex justify-between items-center text-[11px] shrink-0 font-sans">
                  <span className="font-semibold text-[#F2F0E8] font-mono">{selectedSplitContract} &bull; DERIVATIVE</span>
                  <button onClick={() => setSelectedSplitContract(null)} className="text-[#A7ADA8] hover:text-[#F2F0E8]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div ref={splitChartContainerRef} className="flex-1 w-full" />
              </div>
            )}
          </div>

          {activeDesk === "FNO" && (
            <div className="h-[45%] border-t border-white/[0.065] bg-[#0C100F] flex flex-col overflow-hidden">
              <OptionChain
                onSelectContract={(sym) => setSelectedSplitContract(sym)}
              />
            </div>
          )}
        </div>
      )}


        {/* Watchlist & Market Depth */}
        <MarketDepthWatchlist
          selectedSymbol={selectedFnoSymbol}
          onSelectSymbol={(sym) => {
            setSelectedFnoSymbol(sym);
            setSelectedSplitContract(null);
          }}
          marketDepth={fnoMarketDepth}
          gnnSignal={gnnContagionSignal}
        />
      </div>

      {/* Goal Matcher & Life-Graphs Drawer */}
      <GoalMatcherDrawer
        isOpen={isGoalMatcherOpen}
        onClose={() => setIsGoalMatcherOpen(false)}
        symbol={selectedFnoSymbol}
        currentPrice={currentSpotPrice}
        prediction={prediction}
        onApplyPrediction={(pred) => setPrediction(pred)}
      />

      {/* Groww-Style Overview Drawer */}
      <GrowwOverviewDrawer
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        symbol={selectedFnoSymbol}
        currentPrice={currentSpotPrice}
        onOpenOrderModal={handleOpenOrderModal}
      />

      {/* Buy / Sell Order Modal */}
      <OrderExecutionModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        symbol={selectedFnoSymbol}
        currentPrice={currentSpotPrice}
        initialSide={orderModalSide}
      />
    </div>
  );
};
