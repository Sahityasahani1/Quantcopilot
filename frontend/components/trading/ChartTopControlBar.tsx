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
  TrendingDown,
  Target,
  Cpu
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
  onApplyPattern?: (patternType: "PATTERN_DOUBLE_BOTTOM" | "PATTERN_DOUBLE_TOP" | "PATTERN_HEAD_AND_SHOULDERS" | "PATTERN_BULL_FLAG" | "PATTERN_ASCENDING_TRIANGLE") => void;
  onScanPatterns?: () => void;
  isScanningPatterns?: boolean;
  detectedPatternsCount?: number;
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
  onToggleFullscreen,
  onApplyPattern,
  onScanPatterns,
  isScanningPatterns = false,
  detectedPatternsCount = 0
}) => {
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showPatternMenu, setShowPatternMenu] = useState(false);

  const toggleIndicator = (key: keyof IndicatorConfig) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isPos = hoverCandle ? hoverCandle.close >= hoverCandle.open : true;
  const changePct = hoverCandle && hoverCandle.open 
    ? (((hoverCandle.close - hoverCandle.open) / hoverCandle.open) * 100).toFixed(2)
    : "0.00";

  return (
    <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-[#0C100F] border-b border-white/[0.065] text-xs font-mono select-none shrink-0 gap-2">
      {/* Left: Symbol & Chart Type & Timeframe */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 font-semibold text-[#F2F0E8] bg-[#111614] border border-white/[0.065] px-2.5 py-1 rounded-sm">
          <span className="text-[#F2F0E8] font-bold">{symbol}</span>
          <span className="text-[10px] text-[#68716C] font-sans">NSE</span>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center bg-[#111614] border border-white/[0.065] rounded-sm p-0.5">
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

        {/* Chart Style Selector */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="flex items-center space-x-1 bg-[#111614] border border-white/[0.065] hover:border-white/[0.12] px-2 py-1 rounded-sm text-[#F2F0E8]"
          >
            {chartType === "CANDLE" && <CandlestickChart className="h-3.5 w-3.5 text-[#159570]" />}
            {chartType === "HEIKIN_ASHI" && <Activity className="h-3.5 w-3.5 text-[#159570]" />}
            {chartType === "LINE" && <LineChart className="h-3.5 w-3.5 text-[#159570]" />}
            {chartType === "AREA" && <BarChart3 className="h-3.5 w-3.5 text-[#159570]" />}
            <span className="text-[11px] capitalize">{chartType.toLowerCase().replace("_", " ")}</span>
            <ChevronDown className="h-3 w-3 text-[#68716C]" />
          </button>

          {showChartTypeMenu && (
            <div className="absolute left-0 top-full mt-1 w-36 bg-[#161C19] border border-white/[0.08] rounded-sm p-1 shadow-2xl z-40 space-y-0.5">
              {[
                { id: "CANDLE", label: "Candlestick" },
                { id: "HEIKIN_ASHI", label: "Heikin Ashi" },
                { id: "LINE", label: "Line Chart" },
                { id: "AREA", label: "Mountain/Area" }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setChartType(c.id as ChartType); setShowChartTypeMenu(false); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-sm text-xs flex items-center justify-between ${
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

        {/* Indicators Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className="flex items-center space-x-1.5 bg-[#111614] border border-white/[0.065] hover:border-white/[0.12] px-2.5 py-1 rounded-sm text-[#F2F0E8]"
          >
            <Sliders className="h-3.5 w-3.5 text-[#159570]" />
            <span className="text-[11px] font-medium">Indicators</span>
            <ChevronDown className="h-3 w-3 text-[#68716C]" />
          </button>

          {showIndicatorMenu && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-[#161C19] border border-white/[0.08] rounded-sm p-2 shadow-2xl z-40 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono text-[#A7ADA8] uppercase font-semibold border-b border-white/[0.065]">
                Technical Overlays &amp; Oscillators
              </div>
              {[
                { key: "ema9" as const, label: "EMA 9 (Fast Trend)", color: "#42A77A" },
                { key: "ema20" as const, label: "EMA 20 (Momentum)", color: "#C8A96B" },
                { key: "ema50" as const, label: "EMA 50 (Major)", color: "#159570" },
                { key: "ema200" as const, label: "SMA 200 (Long term)", color: "#C45D62" },
                { key: "bollingerBands" as const, label: "Bollinger Bands (20, 2σ)", color: "#7D8782" },
                { key: "supertrend" as const, label: "SuperTrend (Buy/Sell)", color: "#42A77A" },
                { key: "vwap" as const, label: "VWAP (Volume Weighted)", color: "#B89655" },
                { key: "rsi" as const, label: "RSI (14) Oscillator Sub-Panel", color: "#C8A96B" },
                { key: "macd" as const, label: "MACD (12, 26, 9) Sub-Panel", color: "#42A77A" }
              ].map((ind) => (
                <button
                  key={ind.key}
                  onClick={() => toggleIndicator(ind.key)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-[#1B2420] text-[#A7ADA8] text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span className={indicators[ind.key] ? "font-semibold text-[#F2F0E8]" : "text-[#A7ADA8]"}>{ind.label}</span>
                  </div>
                  {indicators[ind.key] && <Check className="h-3.5 w-3.5 text-[#42A77A]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Scan Patterns Button */}
        <button
          onClick={onScanPatterns}
          disabled={isScanningPatterns}
          title="Scan live candlestick wicks with AI morphological pattern detector"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-all shadow-sm ${
            isScanningPatterns
              ? "bg-[#159570]/10 border border-[#159570]/30 text-[#42A77A] animate-pulse cursor-wait"
              : "bg-[#159570]/15 hover:bg-[#159570]/25 border border-[#159570]/30 text-[#42A77A] hover:text-[#F2F0E8]"
          }`}
        >
          <Cpu className={`h-3.5 w-3.5 ${isScanningPatterns ? "animate-spin text-[#42A77A]" : "text-[#159570]"}`} />
          <span>{isScanningPatterns ? "AI Scanning..." : "AI Scan Patterns"}</span>
          {detectedPatternsCount !== undefined && detectedPatternsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-sm text-[9px] bg-[#159570] text-[#F2F0E8] font-bold font-mono">
              {detectedPatternsCount}
            </span>
          )}
        </button>

        {/* Classical Chart Patterns Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowPatternMenu(!showPatternMenu);
              setShowIndicatorMenu(false);
              setShowChartTypeMenu(false);
            }}
            className="flex items-center space-x-1.5 bg-[#111614] border border-white/[0.065] hover:border-white/[0.12] px-2.5 py-1 rounded-sm text-[#F2F0E8] transition-all shadow-sm"
          >
            <Target className="h-3.5 w-3.5 text-[#159570]" />
            <span className="text-[11px] font-medium">Patterns &amp; Target</span>
            <ChevronDown className="h-3 w-3 text-[#68716C]" />
          </button>

          {showPatternMenu && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-[#161C19] border border-white/[0.08] rounded-sm p-2 shadow-2xl z-40 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono text-[#A7ADA8] uppercase font-semibold border-b border-white/[0.065] flex justify-between items-center">
                <span>Classical Chart Patterns</span>
                <span className="text-[#42A77A] font-normal">Auto-Target</span>
              </div>
              {[
                { type: "PATTERN_DOUBLE_BOTTOM" as const, name: "Double Bottom (W)", desc: "Bullish Reversal & Neckline Target", icon: "W", color: "#42A77A" },
                { type: "PATTERN_DOUBLE_TOP" as const, name: "Double Top (M)", desc: "Bearish Breakdown & Target", icon: "M", color: "#C45D62" },
                { type: "PATTERN_HEAD_AND_SHOULDERS" as const, name: "Head & Shoulders", desc: "Classic Reversal with Neckline", icon: "H&S", color: "#C45D62" },
                { type: "PATTERN_BULL_FLAG" as const, name: "Bull Flag Channel", desc: "Pole Height Continuation Target", icon: "FLAG", color: "#42A77A" },
                { type: "PATTERN_ASCENDING_TRIANGLE" as const, name: "Ascending Triangle", desc: "Horizontal Resistance Breakout", icon: "TRI", color: "#42A77A" }
              ].map((p) => (
                <button
                  key={p.type}
                  onClick={() => {
                    if (onApplyPattern) onApplyPattern(p.type);
                    setShowPatternMenu(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-sm hover:bg-[#1B2420] text-left transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-5 rounded-sm bg-[#0C100F] border border-white/[0.065] text-[9px] font-bold flex items-center justify-center font-mono" style={{ color: p.color }}>
                      {p.icon}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-[#F2F0E8] group-hover:text-white">{p.name}</div>
                      <div className="text-[9px] text-[#68716C]">{p.desc}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-sm bg-[#0C100F] text-[#42A77A] border border-white/[0.065] group-hover:bg-[#159570] group-hover:text-[#F2F0E8] transition-colors">
                    Apply
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle: Live OHLCV Crosshair values */}
      {hoverCandle ? (
        <div className="flex items-center space-x-3 text-[11px] text-[#A7ADA8] tabular-nums">
          <span>O: <strong className="text-[#F2F0E8]">₹{hoverCandle.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-[#F2F0E8]">₹{hoverCandle.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-[#F2F0E8]">₹{hoverCandle.low.toFixed(2)}</strong></span>
          <span>C: <strong className={isPos ? "text-[#42A77A]" : "text-[#C45D62]"}>₹{hoverCandle.close.toFixed(2)}</strong></span>
          <span className={isPos ? "text-[#42A77A]" : "text-[#C45D62]"}>({isPos ? "+" : ""}{changePct}%)</span>
          {hoverCandle.volume && (
            <span className="hidden md:inline text-[#68716C]">Vol: {hoverCandle.volume.toLocaleString()}</span>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-[#68716C] italic font-sans">Hover on candles to inspect OHLCV</div>
      )}

      {/* Right: Quick Buy/Sell Buttons & Snapshot/Fullscreen */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onOpenOrderModal("BUY")}
          className="flex items-center space-x-1 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium px-3 py-1 rounded-sm text-xs transition-all shadow-sm"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>BUY</span>
        </button>
        <button
          onClick={() => onOpenOrderModal("SELL")}
          className="flex items-center space-x-1 bg-[#C45D62] hover:bg-[#A84B50] text-[#F2F0E8] font-medium px-3 py-1 rounded-sm text-xs transition-all shadow-sm"
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>SELL</span>
        </button>

        <div className="h-4 w-px bg-white/[0.08]" />

        <button
          onClick={onTakeSnapshot}
          title="Save Chart Snapshot"
          className="p-1.5 text-[#68716C] hover:text-[#F2F0E8] hover:bg-[#161C19] rounded-sm transition-colors"
        >
          <Camera className="h-4 w-4" />
        </button>
        <button
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen"
          className="p-1.5 text-[#68716C] hover:text-[#F2F0E8] hover:bg-[#161C19] rounded-sm transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
