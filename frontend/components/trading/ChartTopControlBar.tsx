"use client";

import React, { useState } from "react";
import { ChartType, IndicatorConfig } from "../../types/trading";
import { 
  CandlestickChart, 
  LineChart, 
  Activity, 
  BarChart3, 
  Maximize2, 
  Camera, 
  Sliders, 
  Check, 
  Layers, 
  ChevronDown,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface ChartTopControlBarProps {
  symbol: string;
  timeframe: "1m" | "5m" | "15m" | "1h" | "1D";
  setTimeframe: (tf: "1m" | "5m" | "15m" | "1h" | "1D") => void;
  chartType: ChartType;
  setChartType: (type: ChartType) => void;
  indicators: IndicatorConfig;
  setIndicators: React.Dispatch<React.SetStateAction<IndicatorConfig>>;
  hoverCandle: { open: number; high: number; low: number; close: number; volume?: number; time?: string | number } | null;
  onOpenOrderModal: (side: "BUY" | "SELL") => void;
  onTakeSnapshot: () => void;
  onToggleFullscreen: () => void;
}

export const ChartTopControlBar: React.FC<ChartTopControlBarProps> = ({
  symbol,
  timeframe,
  setTimeframe,
  chartType,
  setChartType,
  indicators,
  setIndicators,
  hoverCandle,
  onOpenOrderModal,
  onTakeSnapshot,
  onToggleFullscreen
}) => {
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);

  const toggleIndicator = (key: keyof IndicatorConfig) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isPos = hoverCandle ? hoverCandle.close >= hoverCandle.open : true;
  const changePct = hoverCandle && hoverCandle.open 
    ? (((hoverCandle.close - hoverCandle.open) / hoverCandle.open) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#090d16] border-b border-slate-800/90 text-xs font-mono select-none shrink-0 gap-2">
      {/* Left: Symbol & Chart Type & Timeframe */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 font-bold text-slate-100 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
          <span className="text-cyan-400 font-extrabold">{symbol}</span>
          <span className="text-[10px] text-slate-500 font-sans">NSE</span>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800/80 rounded-md p-0.5">
          {(["1m", "5m", "15m", "1h", "1D"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                timeframe === tf
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="flex items-center space-x-1 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2 py-1 rounded-md text-slate-300 hover:text-white"
          >
            {chartType === "CANDLE" && <CandlestickChart className="h-3.5 w-3.5 text-emerald-400" />}
            {chartType === "HEIKIN_ASHI" && <Activity className="h-3.5 w-3.5 text-amber-400" />}
            {chartType === "LINE" && <LineChart className="h-3.5 w-3.5 text-cyan-400" />}
            {chartType === "AREA" && <BarChart3 className="h-3.5 w-3.5 text-purple-400" />}
            <span className="text-[11px] capitalize">{chartType.toLowerCase().replace("_", " ")}</span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>

          {showChartTypeMenu && (
            <div className="absolute left-0 top-full mt-1 w-36 bg-[#0a0f1d] border border-slate-800 rounded-lg p-1 shadow-2xl z-40 space-y-0.5">
              {[
                { id: "CANDLE", label: "Candlestick" },
                { id: "HEIKIN_ASHI", label: "Heikin Ashi" },
                { id: "LINE", label: "Line Chart" },
                { id: "AREA", label: "Mountain/Area" }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setChartType(c.id as ChartType); setShowChartTypeMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between ${
                    chartType === c.id ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span>{c.label}</span>
                  {chartType === c.id && <Check className="h-3 w-3 text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Indicators Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-md text-slate-300 hover:text-white"
          >
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold">Indicators</span>
            <ChevronDown className="h-3 w-3 text-slate-500" />
          </button>

          {showIndicatorMenu && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#0a0f1d] border border-slate-800 rounded-xl p-2 shadow-2xl z-40 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase font-bold border-b border-slate-800">
                Technical Overlays & Oscillators
              </div>
              {[
                { key: "ema9" as const, label: "EMA 9 (Fast Trend)", color: "#38bdf8" },
                { key: "ema20" as const, label: "EMA 20 (Momentum)", color: "#fbbf24" },
                { key: "ema50" as const, label: "EMA 50 (Major)", color: "#a855f7" },
                { key: "ema200" as const, label: "SMA 200 (Long term)", color: "#f43f5e" },
                { key: "bollingerBands" as const, label: "Bollinger Bands (20, 2σ)", color: "#06b6d4" },
                { key: "supertrend" as const, label: "SuperTrend (Buy/Sell)", color: "#10b981" },
                { key: "vwap" as const, label: "VWAP (Volume Weighted)", color: "#f97316" },
                { key: "rsi" as const, label: "RSI (14) Oscillator Sub-Panel", color: "#ec4899" },
                { key: "macd" as const, label: "MACD (12, 26, 9) Sub-Panel", color: "#6366f1" }
              ].map((ind) => (
                <button
                  key={ind.key}
                  onClick={() => toggleIndicator(ind.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span className={indicators[ind.key] ? "font-bold text-white" : "text-slate-400"}>{ind.label}</span>
                  </div>
                  {indicators[ind.key] && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle: Live OHLCV Crosshair values */}
      {hoverCandle ? (
        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span>O: <strong className="text-slate-200">₹{hoverCandle.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-slate-200">₹{hoverCandle.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-slate-200">₹{hoverCandle.low.toFixed(2)}</strong></span>
          <span>C: <strong className={isPos ? "text-emerald-400" : "text-rose-400"}>₹{hoverCandle.close.toFixed(2)}</strong></span>
          <span className={isPos ? "text-emerald-400" : "text-rose-400"}>({isPos ? "+" : ""}{changePct}%)</span>
          {hoverCandle.volume && (
            <span className="hidden md:inline text-slate-500">Vol: {hoverCandle.volume.toLocaleString()}</span>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-slate-500 italic">Hover on candles to inspect OHLCV</div>
      )}

      {/* Right: Quick Buy/Sell Buttons & Snapshot/Fullscreen */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onOpenOrderModal("BUY")}
          className="flex items-center space-x-1 bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-md text-xs transition-all shadow-sm active:scale-95"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>BUY</span>
        </button>
        <button
          onClick={() => onOpenOrderModal("SELL")}
          className="flex items-center space-x-1 bg-rose-600/90 hover:bg-rose-500 text-white font-bold px-3 py-1 rounded-md text-xs transition-all shadow-sm active:scale-95"
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>SELL</span>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={onTakeSnapshot}
          title="Save Chart Snapshot"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Camera className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
