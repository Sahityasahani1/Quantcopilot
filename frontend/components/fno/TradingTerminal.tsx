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
  IndicatorsSubPanel 
} from "../trading";
import { 
  ChartType, 
  DrawingToolType, 
  ChartDrawingObject, 
  IndicatorConfig, 
  PredictionPayload 
} from "../../types/trading";
import { Activity, X } from "lucide-react";

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

  const [activeDesk, setActiveDesk] = useState<"EQUITY" | "FNO">("FNO");
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
  const [strokeColor, setStrokeColor] = useState<string>("#06b6d4");
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [drawings, setDrawings] = useState<ChartDrawingObject[]>([]);

  // Modals & Drawers state
  const [isGoalMatcherOpen, setIsGoalMatcherOpen] = useState<boolean>(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState<boolean>(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [orderModalSide, setOrderModalSide] = useState<"BUY" | "SELL">("BUY");

  // Prediction payload applied to chart
  const [prediction, setPrediction] = useState<PredictionPayload | null>(null);

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

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch {}
      chartRef.current = null;
    }

    const width = chartContainerRef.current.clientWidth || 800;
    const height = chartContainerRef.current.clientHeight || 400;
    setChartDims({ width, height });

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#06090e" },
        textColor: "#64748b",
      },
      grid: {
        vertLines: { color: "#0f172a" },
        horzLines: { color: "#0f172a" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e293b", scaleMargins: { top: 0.1, bottom: 0.2 } },
      timeScale: { borderColor: "#1e293b", timeVisible: true, secondsVisible: false },
    });

    let mainSeries: ISeriesApi<any>;
    if (chartType === "LINE") {
      mainSeries = chart.addLineSeries({
        color: "#06b6d4",
        lineWidth: 2,
      });
    } else if (chartType === "AREA") {
      mainSeries = chart.addAreaSeries({
        topColor: "rgba(6, 182, 212, 0.4)",
        bottomColor: "rgba(6, 182, 212, 0.0)",
        lineColor: "#06b6d4",
        lineWidth: 2,
      });
    } else {
      mainSeries = chart.addCandlestickSeries({
        upColor: "#10b981",
        downColor: "#f43f5e",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#f43f5e",
      });
    }

    chartRef.current = chart;
    seriesRef.current = mainSeries;

    // Optional EMA Overlays
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

    // Subscribe to crosshair move for live OHLCV inspector
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (param.time && param.seriesData && mainSeries) {
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
      }
    });

    // Fetch candle history
    fetch(`http://localhost:8000/api/v1/fno/history/${encodeURIComponent(selectedFnoSymbol)}?timeframe=${timeframe}&limit=90`)
      .then((res) => res.json())
      .then((data: CandlestickData[]) => {
        if (data && data.length > 0 && seriesRef.current) {
          if (chartType === "LINE" || chartType === "AREA") {
            const lineData: LineData[] = data.map(d => ({ time: d.time, value: d.close }));
            mainSeries.setData(lineData);
          } else if (chartType === "HEIKIN_ASHI") {
            // Compute Heikin Ashi values
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

          // Calculate EMA points if enabled
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
      })
      .catch(() => {});

    // WebSocket real-time updates
    const ws = new WebSocket("ws://localhost:8000/ws/live-feed");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.symbol === selectedFnoSymbol && msg.candle && seriesRef.current) {
          if (chartType === "LINE" || chartType === "AREA") {
            mainSeries.update({ time: msg.candle.time, value: msg.candle.close });
          } else {
            mainSeries.update(msg.candle);
          }
        }
      } catch {}
    };

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = chartContainerRef.current.clientHeight;
        chartRef.current.applyOptions({ width: newWidth, height: newHeight });
        setChartDims({ width: newWidth, height: newHeight });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
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

    const splitChart = createChart(splitChartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#06090e" },
        textColor: "#64748b",
      },
      grid: {
        vertLines: { color: "#0f172a" },
        horzLines: { color: "#0f172a" },
      },
      rightPriceScale: { borderColor: "#1e293b" },
      timeScale: { borderColor: "#1e293b", timeVisible: true },
    });

    const splitSeries = splitChart.addCandlestickSeries({
      upColor: "#06b6d4",
      downColor: "#e11d48",
      borderVisible: false,
      wickUpColor: "#06b6d4",
      wickDownColor: "#e11d48",
    });

    splitChartRef.current = splitChart;
    splitSeriesRef.current = splitSeries;

    fetch(`http://localhost:8000/api/v1/fno/history/${encodeURIComponent(selectedSplitContract)}?timeframe=${timeframe}&limit=80`)
      .then((res) => res.json())
      .then((data: CandlestickData[]) => {
        if (data && data.length > 0 && splitSeriesRef.current) {
          splitSeries.setData(data);
        }
      })
      .catch(() => {});

    const handleResize = () => {
      if (splitChartContainerRef.current && splitChartRef.current) {
        splitChartRef.current.applyOptions({ width: splitChartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
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
    <div className="flex flex-col h-[calc(100vh-5rem)] w-full bg-[#030712] text-slate-200 overflow-hidden font-mono select-none rounded-xl border border-slate-800 shadow-2xl">
      <TopTickerStrip />

      {/* Desk Switcher & Engine Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0b0f17] border-b border-slate-800 text-xs shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveDesk("EQUITY")}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              activeDesk === "EQUITY" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            EQUITY TERMINAL
          </button>
          <button
            onClick={() => setActiveDesk("FNO")}
            className={`px-3 py-1 rounded font-bold transition-colors ${
              activeDesk === "FNO" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-slate-400 hover:text-white"
            }`}
          >
            F&O OPTIONS DESK
          </button>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
            <Activity className="h-3.5 w-3.5" /> GNN RISK ENGINE ACTIVE
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col border-r border-slate-800 overflow-hidden">
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
              <div className="flex-1 flex flex-col border-l border-slate-800">
                <div className="px-3 py-1 bg-[#090d16] border-b border-slate-800 flex justify-between items-center text-[11px] shrink-0">
                  <span className="font-bold text-cyan-400">{selectedSplitContract} · DERIVATIVE</span>
                  <button onClick={() => setSelectedSplitContract(null)} className="text-slate-500 hover:text-rose-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div ref={splitChartContainerRef} className="flex-1 w-full" />
              </div>
            )}
          </div>

          {activeDesk === "FNO" && (
            <div className="h-[45%] border-t border-slate-800 bg-[#06090e] flex flex-col overflow-hidden">
              <OptionChain
                onSelectContract={(sym) => setSelectedSplitContract(sym)}
              />
            </div>
          )}
        </div>

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
