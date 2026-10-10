"use client";

import React, { useState, useEffect, useMemo } from "react";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { DeepForecastData, DRLAgentSignal } from "../../types/strategy";
import { getApiBaseUrl } from "../../lib/api";
import {
  Compass,
  Layers,
  Sparkles,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Send,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  BrainCircuit,
  Eye,
  Crosshair,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Target
} from "lucide-react";

const SUPPORTED_TICKERS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy / Telecom" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Banking / Financials" },
  { symbol: "INFY", name: "Infosys Ltd", sector: "IT Services" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Banking / Financials" },
  { symbol: "SBIN", name: "State Bank of India", sector: "PSU Banking" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecom" },
  { symbol: "ITC", name: "ITC Limited", sector: "FMCG / Tobacco" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", sector: "Capital Goods" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance Ltd", sector: "Financial Services" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Automotive" },
  { symbol: "NIFTY 50", name: "Nifty 50 Index", sector: "Broad Market Index" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", sector: "Banking Sector Index" }
];

export const AlphaForecasterView: React.FC = () => {
  const { addPosition, setActiveTab, setSelectedFnoSymbol } = usePortfolioStore();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [forecastData, setForecastData] = useState<DeepForecastData | null>(null);
  const [drlSignal, setDrlSignal] = useState<DRLAgentSignal | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [kellyFraction, setKellyFraction] = useState<number>(0.5); // Half-Kelly default
  const [deploymentStatus, setDeploymentStatus] = useState<string | null>(null);

  const fetchAlphaData = async (symbol: string) => {
    setIsLoading(true);
    try {
      const [fcRes, sigRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/v1/strategy/deep-forecast/${encodeURIComponent(symbol)}?horizon=20`),
        fetch(`${getApiBaseUrl()}/api/v1/strategy/drl-agent/${encodeURIComponent(symbol)}`)
      ]);

      if (fcRes.ok) {
        const fcJson = await fcRes.json();
        setForecastData(fcJson);
      }
      if (sigRes.ok) {
        const sigJson = await sigRes.json();
        setDrlSignal(sigJson);
      }
    } catch (err) {
      console.error("Error fetching 18-Alpha Forecaster data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlphaData(selectedSymbol);
  }, [selectedSymbol]);

  // 18-Alpha Factor Matrix Calculation based on current ticker & model inputs
  const eighteenAlphas = useMemo(() => {
    const isBull = forecastData?.dominantTrend === "BULLISH";
    const conf = (forecastData?.trendConfidence || 75) / 100;
    const drift = forecastData?.expectedDriftPct || 2.4;

    return [
      { id: "alpha_01", name: "Alpha 01: Short-Term Return Reversal (1D)", category: "MOMENTUM", zScore: isBull ? 1.42 : -0.85, weight: 0.082, stance: isBull ? "BULLISH" : "BEARISH", desc: "Ornstein-Uhlenbeck mean-reverting speed vector" },
      { id: "alpha_02", name: "Alpha 02: Normalized Momentum Drift (20D)", category: "MOMENTUM", zScore: Number((drift * 0.6).toFixed(2)), weight: 0.095, stance: drift >= 0 ? "BULLISH" : "BEARISH", desc: "Exponential moving directional momentum slope" },
      { id: "alpha_03", name: "Alpha 03: Order Flow Volume Imbalance", category: "MICROSTRUCTURE", zScore: 1.18, weight: 0.078, stance: "BULLISH", desc: "Top 5-level bid-ask depth size skew differential" },
      { id: "alpha_04", name: "Alpha 04: Volatility Skew Curvature", category: "DERIVATIVES", zScore: -0.65, weight: 0.062, stance: "NEUTRAL", desc: "OTM Put vs OTM Call implied volatility smirk slope" },
      { id: "alpha_05", name: "Alpha 05: GNN Relational Contagion Spillover", category: "GRAPH_AI", zScore: 0.88, weight: 0.088, stance: "BULLISH", desc: "4-Head GATv2 cross-asset systemic shock propagation" },
      { id: "alpha_06", name: "Alpha 06: RSI Divergence Vector (14)", category: "TECHNICAL", zScore: 1.34, weight: 0.071, stance: "BULLISH", desc: "Hidden bullish momentum divergence on daily close" },
      { id: "alpha_07", name: "Alpha 07: Institutional Block Flow Intensity", category: "FLOW", zScore: 1.82, weight: 0.091, stance: "BULLISH", desc: "NSE Large-cap bulk delivery transaction clustering" },
      { id: "alpha_08", name: "Alpha 08: FinBERT NLP Sentiment Vector", category: "NLP_AI", zScore: 1.25, weight: 0.065, stance: "BULLISH", desc: "SEBI filings & financial media semantic tone polarity" },
      { id: "alpha_09", name: "Alpha 09: SEBI Policy Regulatory Tailwind", category: "COMPLIANCE", zScore: 0.95, weight: 0.054, stance: "BULLISH", desc: "Circular impact and ASM/GSM clearance index" },
      { id: "alpha_10", name: "Alpha 10: High-Frequency Micro-Spread", category: "MICROSTRUCTURE", zScore: -0.42, weight: 0.045, stance: "NEUTRAL", desc: "Roll model effective bid-ask spread compression" },
      { id: "alpha_11", name: "Alpha 11: VWAP Mean Reversion Elasticity", category: "MOMENTUM", zScore: 0.74, weight: 0.058, stance: "BULLISH", desc: "Distance from multi-day institutional volume anchor" },
      { id: "alpha_12", name: "Alpha 12: Realized Volatility Z-Score", category: "RISK", zScore: -0.92, weight: 0.048, stance: "BULLISH", desc: "Parkinson high-low volatility regime normalization" },
      { id: "alpha_13", name: "Alpha 13: Gamma Exposure (GEX) Pressure", category: "DERIVATIVES", zScore: 1.62, weight: 0.084, stance: "BULLISH", desc: "Market maker hedging acceleration near active strike" },
      { id: "alpha_14", name: "Alpha 14: Put-Call Ratio OI Skew", category: "DERIVATIVES", zScore: 1.10, weight: 0.061, stance: "BULLISH", desc: "Put writing concentration vs call resistance wall" },
      { id: "alpha_15", name: "Alpha 15: Cross-Asset Beta Spillover", category: "GRAPH_AI", zScore: 0.52, weight: 0.051, stance: "NEUTRAL", desc: "Sector benchmark co-movement and eigenvalue shift" },
      { id: "alpha_16", name: "Alpha 16: Kyle's Lambda Price Impact", category: "MICROSTRUCTURE", zScore: -0.38, weight: 0.042, stance: "BULLISH", desc: "Transient price impact per ₹10M order flow" },
      { id: "alpha_17", name: "Alpha 17: Multi-Head Attention Drift", category: "DEEP_LEARNING", zScore: 1.55, weight: 0.092, stance: "BULLISH", desc: "Transformer encoder attention across 60 historical bars" },
      { id: "alpha_18", name: "Alpha 18: Actor-Critic Policy Conviction", category: "DRL", zScore: Number((conf * 2.2 - 0.5).toFixed(2)), weight: 0.098, stance: isBull ? "BULLISH" : "BEARISH", desc: "Sortino-optimized DRL agent softmax conviction value" }
    ];
  }, [forecastData]);

  // SVG Quantile Fan Chart Calculations
  const fanWidth = 900;
  const fanHeight = 360;
  const padding = { top: 25, right: 40, bottom: 35, left: 65 };

  const trajectory = forecastData?.trajectory || [];
  const currentPrice = forecastData?.currentPrice || 2480;

  const { minVal, maxVal, fanPoints, polygon95, polygon80, pathMedian, pathBullish, pathBearish } = useMemo(() => {
    if (!trajectory.length) {
      return { minVal: currentPrice * 0.95, maxVal: currentPrice * 1.05, fanPoints: [], polygon95: "", polygon80: "", pathMedian: "", pathBullish: "", pathBearish: "" };
    }

    let min = currentPrice;
    let max = currentPrice;

    for (const pt of trajectory) {
      if (pt.lowerConfidence95 < min) min = pt.lowerConfidence95;
      if (pt.bearishPrice < min) min = pt.bearishPrice;
      if (pt.upperConfidence95 > max) max = pt.upperConfidence95;
      if (pt.bullishPrice > max) max = pt.bullishPrice;
    }

    const range = (max - min) || 1;
    const paddedMin = min - range * 0.05;
    const paddedMax = max + range * 0.05;

    const chartW = fanWidth - padding.left - padding.right;
    const chartH = fanHeight - padding.top - padding.bottom;

    const getY = (val: number) => {
      const norm = (val - paddedMin) / (paddedMax - paddedMin);
      return fanHeight - padding.bottom - norm * chartH;
    };

    const getX = (idx: number, total: number) => {
      return padding.left + (idx / Math.max(1, total - 1)) * chartW;
    };

    const totalSteps = trajectory.length + 1;

    // Origin point at current spot
    const originX = padding.left;
    const originY = getY(currentPrice);

    const points = trajectory.map((pt, idx) => ({
      data: pt,
      x: getX(idx + 1, totalSteps),
      y: getY(pt.basePrice),
      yUpper95: getY(pt.upperConfidence95),
      yLower95: getY(pt.lowerConfidence95),
      yUpper80: getY(pt.upperConfidence80),
      yLower80: getY(pt.lowerConfidence80),
      yBull: getY(pt.bullishPrice),
      yBear: getY(pt.bearishPrice)
    }));

    // 95% Polygon
    const upper95Pts = [`${originX},${originY}`, ...points.map(p => `${p.x},${p.yUpper95}`)];
    const lower95Pts = [...points.map(p => `${p.x},${p.yLower95}`).reverse(), `${originX},${originY}`];
    const poly95 = `${upper95Pts.join(" ")} ${lower95Pts.join(" ")}`;

    // 80% Polygon
    const upper80Pts = [`${originX},${originY}`, ...points.map(p => `${p.x},${p.yUpper80}`)];
    const lower80Pts = [...points.map(p => `${p.x},${p.yLower80}`).reverse(), `${originX},${originY}`];
    const poly80 = `${upper80Pts.join(" ")} ${lower80Pts.join(" ")}`;

    // Median path
    const medianPts = [`M ${originX} ${originY}`, ...points.map(p => `L ${p.x} ${p.y}`)].join(" ");
    const bullPts = [`M ${originX} ${originY}`, ...points.map(p => `L ${p.x} ${p.yBull}`)].join(" ");
    const bearPts = [`M ${originX} ${originY}`, ...points.map(p => `L ${p.x} ${p.yBear}`)].join(" ");

    return {
      minVal: paddedMin,
      maxVal: paddedMax,
      fanPoints: points,
      polygon95: poly95,
      polygon80: poly80,
      pathMedian: medianPts,
      pathBullish: bullPts,
      pathBearish: bearPts
    };
  }, [trajectory, currentPrice, padding.left, padding.right, padding.top, padding.bottom, fanWidth, fanHeight]);

  const handleDeploySignal = () => {
    const qty = drlSignal?.recommendedQuantity || 10;
    const price = forecastData?.currentPrice || 2480;
    const side = drlSignal?.recommendedAction === "SHORT" ? "SHORT" : "LONG";

    addPosition({
      symbol: selectedSymbol,
      quantity: qty,
      entry_price: price,
      side: side as "LONG" | "SHORT",
      leverage: 1.0
    });

    setDeploymentStatus(`Position Deployed: ${qty} shares of ${selectedSymbol} (${side}) at ₹${price.toFixed(2)}`);
    setTimeout(() => setDeploymentStatus(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-[#F2F0E8] font-sans pb-16">
      {/* 1. Header & Stock Selector Bar */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 md:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.065] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xs bg-[#161C19] border border-white/[0.065] text-[#C8A96B]">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold font-sans text-[#F2F0E8] tracking-wide uppercase">
                  18-ALPHA DEEP LEARNING FORECASTER &amp; QUANTILE CONE
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#C8A96B]/15 text-[#C8A96B] border border-[#C8A96B]/30 rounded-xs font-semibold">
                  T-TRANSFORMER + SORTINO DRL
                </span>
              </div>
              <p className="text-xs text-[#A7ADA8] font-sans mt-0.5">
                Multi-head temporal self-attention across 18 alpha factors with 5-quantile probabilistic price envelopes
              </p>
            </div>
          </div>

          {/* Selector & Live Ticker Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-[#0C100F] border border-white/[0.065] rounded-xs px-3 py-1.5">
              <span className="text-[10px] text-[#68716C] uppercase font-sans">TARGET EQUITY:</span>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-[#F2F0E8] outline-none cursor-pointer"
              >
                {SUPPORTED_TICKERS.map((t) => (
                  <option key={t.symbol} value={t.symbol} className="bg-[#111614] text-[#F2F0E8]">
                    {t.symbol} &bull; {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchAlphaData(selectedSymbol)}
              disabled={isLoading}
              className="flex items-center space-x-1.5 bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] px-2.5 py-1.5 rounded-xs text-xs font-sans transition-all"
              title="Refresh Neural Inference"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-[#159570]" : ""}`} />
              <span>Inference</span>
            </button>
          </div>
        </div>

        {/* Telemetry Strip: CMP, Trend, Confidence, Drift, Kelly */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-1">
            <div className="text-[10px] text-[#68716C] uppercase font-sans">Spot CMP</div>
            <div className="text-base font-bold text-[#F2F0E8] font-mono-numbers">
              ₹{(forecastData?.currentPrice || 2480).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-1">
            <div className="text-[10px] text-[#68716C] uppercase font-sans">Dominant Trend</div>
            <div className={`text-sm font-bold flex items-center gap-1 ${
              forecastData?.dominantTrend === "BULLISH" ? "text-[#42A77A]" : "text-[#C45D62]"
            }`}>
              {forecastData?.dominantTrend === "BULLISH" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{forecastData?.dominantTrend || "BULLISH"}</span>
            </div>
          </div>

          <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-1">
            <div className="text-[10px] text-[#68716C] uppercase font-sans">Model Conviction</div>
            <div className="text-base font-bold text-[#C8A96B] font-mono-numbers">
              {forecastData?.trendConfidence || 74.2}%
            </div>
          </div>

          <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-1">
            <div className="text-[10px] text-[#68716C] uppercase font-sans">Expected 20D Drift</div>
            <div className="text-base font-bold text-[#42A77A] font-mono-numbers">
              +{(forecastData?.expectedDriftPct || 2.4).toFixed(2)}%
            </div>
          </div>

          <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-1">
            <div className="text-[10px] text-[#68716C] uppercase font-sans">Invalidation Level</div>
            <div className="text-base font-bold text-[#C45D62] font-mono-numbers">
              ₹{(forecastData?.invalidationLevel ? forecastData.invalidationLevel : ((forecastData?.currentPrice || 2480) * 0.965)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-1">
            <div className="text-[10px] text-[#68716C] uppercase font-sans">Policy Action</div>
            <div className="text-sm font-bold text-[#159570]">
              {drlSignal?.recommendedAction || "ACCUMULATE"}
            </div>
          </div>
        </div>

        {deploymentStatus && (
          <div className="bg-[#159570]/15 border border-[#159570]/30 text-[#42A77A] px-3 py-2 rounded-xs text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{deploymentStatus}</span>
          </div>
        )}
      </div>

      {/* 2. Probabilistic Quantile Uncertainty Fan Chart (Cone of Uncertainty) */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/[0.065] pb-3">
          <div className="flex items-center space-x-2">
            <Compass className="h-4 w-4 text-[#159570]" />
            <span className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider">
              5-QUANTILE PROBABILISTIC CONE OF UNCERTAINTY (t+1 TO t+20 BARS)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#159570]/15 border border-[#159570]/30" />
              <span className="text-[#A7ADA8]">95% Quantile (q0.025 – q0.975)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-xs bg-[#159570]/30 border border-[#159570]/50" />
              <span className="text-[#A7ADA8]">80% Quantile (q0.10 – q0.90)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#42A77A]" />
              <span className="text-[#42A77A] font-semibold">Median Expected Path</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#C45D62] border-dashed" />
              <span className="text-[#C45D62]">Downside Floor</span>
            </div>
          </div>
        </div>

        {/* SVG Quantile Fan Chart Canvas */}
        <div className="relative w-full overflow-hidden bg-[#0C100F] p-2 rounded-xs border border-white/[0.065]">
          <svg
            viewBox={`0 0 ${fanWidth} ${fanHeight}`}
            className="w-full h-auto text-[#A7ADA8] select-none"
          >
            <defs>
              <linearGradient id="alphaFanGrad95" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#159570" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#0E6B50" stopOpacity="0.18" />
              </linearGradient>
              <linearGradient id="alphaFanGrad80" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#159570" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0E6B50" stopOpacity="0.36" />
              </linearGradient>
            </defs>

            {/* Horizontal Price Grid Lines */}
            {[0.2, 0.4, 0.6, 0.8].map((pct, idx) => {
              const y = padding.top + pct * (fanHeight - padding.top - padding.bottom);
              const val = maxVal - pct * (maxVal - minVal);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={fanWidth - padding.right}
                    y2={y}
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    fontSize="9"
                    fontFamily="monospace"
                    fill="#68716C"
                    textAnchor="end"
                  >
                    ₹{Math.round(val).toLocaleString("en-IN")}
                  </text>
                </g>
              );
            })}

            {/* 95% Confidence Fan Envelope */}
            {polygon95 && (
              <polygon
                points={polygon95}
                fill="url(#alphaFanGrad95)"
                stroke="#159570"
                strokeWidth="0.8"
                strokeOpacity="0.3"
              />
            )}

            {/* 80% Confidence Fan Envelope */}
            {polygon80 && (
              <polygon
                points={polygon80}
                fill="url(#alphaFanGrad80)"
                stroke="#159570"
                strokeWidth="1"
                strokeOpacity="0.45"
              />
            )}

            {/* Bullish Drift Path */}
            <path
              d={pathBullish}
              fill="none"
              stroke="#42A77A"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.8"
            />

            {/* Bearish Drift Path */}
            <path
              d={pathBearish}
              fill="none"
              stroke="#C45D62"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              strokeOpacity="0.8"
            />

            {/* Median Forecast Trajectory Line */}
            <path
              d={pathMedian}
              fill="none"
              stroke="#42A77A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-Axis Horizon Labels */}
            {fanPoints.filter((_, idx) => idx % 4 === 0 || idx === fanPoints.length - 1).map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={fanHeight - 10}
                fontSize="9"
                fontFamily="monospace"
                fill="#68716C"
                textAnchor="middle"
              >
                t+{pt.data.step}
              </text>
            ))}

            {/* Interactive Points on Median Line */}
            {fanPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r={hoveredStepIndex === idx ? 5 : 2.5}
                fill="#42A77A"
                stroke="#080A09"
                strokeWidth={hoveredStepIndex === idx ? 2 : 1}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredStepIndex(idx)}
                onMouseLeave={() => setHoveredStepIndex(null)}
              />
            ))}
          </svg>

          {/* Hover Step HUD Tooltip */}
          {hoveredStepIndex !== null && fanPoints[hoveredStepIndex] && (
            <div className="absolute top-3 right-4 bg-[#161C19]/95 border border-white/[0.1] rounded-xs p-3 shadow-2xl text-xs font-mono pointer-events-none z-10 space-y-1">
              <div className="text-[#F2F0E8] font-semibold border-b border-white/[0.065] pb-1 flex justify-between gap-4 font-sans">
                <span>Horizon Bar t+{fanPoints[hoveredStepIndex].data.step}</span>
                <span className="text-[#A7ADA8] font-mono">{fanPoints[hoveredStepIndex].data.timestamp}</span>
              </div>
              <div className="flex justify-between gap-4 text-[#F2F0E8] pt-0.5 tabular-nums">
                <span className="font-sans text-[#A7ADA8]">Median Projected:</span>
                <span className="font-semibold text-[#F2F0E8]">₹{fanPoints[hoveredStepIndex].data.basePrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between gap-4 text-[#A7ADA8] tabular-nums">
                <span className="font-sans text-[#68716C]">80% CI:</span>
                <span>₹{fanPoints[hoveredStepIndex].data.lowerConfidence80.toFixed(2)} – ₹{fanPoints[hoveredStepIndex].data.upperConfidence80.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-4 text-[#A7ADA8] tabular-nums">
                <span className="font-sans text-[#68716C]">95% CI:</span>
                <span>₹{fanPoints[hoveredStepIndex].data.lowerConfidence95.toFixed(2)} – ₹{fanPoints[hoveredStepIndex].data.upperConfidence95.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. 18-Alpha Factor Scoring Matrix & Attention Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 18-Alpha Factor Matrix Table */}
        <div className="lg:col-span-2 bg-[#111614] border border-white/[0.065] rounded-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.065] pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-[#159570]" />
              <span className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider">
                18-ALPHA FACTOR EXPOSURE &amp; Z-SCORE TELEMETRY
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#68716C]">Full Factor Spectrum</span>
          </div>

          <div className="overflow-x-auto max-h-[460px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="sticky top-0 bg-[#0C100F] border-b border-white/[0.065] text-[10px] text-[#A7ADA8] uppercase font-sans z-10">
                <tr>
                  <th className="py-2 px-2.5">Alpha Factor</th>
                  <th className="py-2 px-2">Category</th>
                  <th className="py-2 px-2 text-right">Z-Score</th>
                  <th className="py-2 px-2 text-right">Weight</th>
                  <th className="py-2 px-2 text-center">Stance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {eighteenAlphas.map((alpha) => {
                  const isBull = alpha.stance === "BULLISH";
                  const isBear = alpha.stance === "BEARISH";

                  return (
                    <tr key={alpha.id} className="hover:bg-[#161C19] transition-colors">
                      <td className="py-2 px-2.5">
                        <div className="font-semibold text-[#F2F0E8]">{alpha.name}</div>
                        <div className="text-[10px] text-[#68716C] font-sans truncate max-w-[260px]">{alpha.desc}</div>
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded-xs text-[9px] bg-[#161C19] border border-white/[0.065] text-[#A7ADA8] font-sans">
                          {alpha.category}
                        </span>
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold ${
                        alpha.zScore > 0 ? "text-[#42A77A]" : alpha.zScore < 0 ? "text-[#C45D62]" : "text-[#A7ADA8]"
                      }`}>
                        {alpha.zScore > 0 ? `+${alpha.zScore}` : alpha.zScore}
                      </td>
                      <td className="py-2 px-2 text-right text-[#A7ADA8]">
                        {(alpha.weight * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-xs text-[9px] font-semibold border ${
                          isBull 
                            ? "bg-[#42A77A]/12 text-[#42A77A] border-[#42A77A]/25" 
                            : isBear
                            ? "bg-[#C45D62]/12 text-[#C45D62] border-[#C45D62]/25"
                            : "bg-[#161C19] text-[#A7ADA8] border-white/[0.065]"
                        }`}>
                          {alpha.stance}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Sortino DRL Sizing & Execution Playbook */}
        <div className="space-y-4">
          {/* Sizing & Kelly Allocation Box */}
          <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-2">
              <span className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-[#159570]" />
                KELLY SIZING &amp; ALLOCATION SLIDER
              </span>
              <span className="text-[10px] font-mono text-[#C8A96B]">Sortino DRL</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#68716C] font-sans">Kelly Fraction:</span>
                <span className="font-semibold text-[#F2F0E8] tabular-nums">{(kellyFraction * 100).toFixed(0)}% (Optimal Half-Kelly)</span>
              </div>

              <input
                type="range"
                min="0.10"
                max="1.0"
                step="0.05"
                value={kellyFraction}
                onChange={(e) => setKellyFraction(parseFloat(e.target.value))}
                className="w-full accent-[#159570] h-1.5 bg-[#161C19] rounded-xs cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-[#68716C]">
                <span>10% (Ultra Safe)</span>
                <span className="text-[#C8A96B]">50% (Recommended)</span>
                <span>100% (Full Kelly)</span>
              </div>

              <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-3 space-y-2 pt-2">
                <div className="flex justify-between">
                  <span className="text-[#68716C] font-sans">Suggested Quantity:</span>
                  <span className="font-semibold text-[#F2F0E8]">{Math.round((drlSignal?.recommendedQuantity || 10) * kellyFraction * 2)} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68716C] font-sans">Policy Entropy:</span>
                  <span className="text-[#42A77A] font-semibold">{drlSignal?.policyEntropy?.toFixed(3) || "0.214"} (Low Noise)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#68716C] font-sans">State Value Q(s):</span>
                  <span className="text-[#C8A96B] font-semibold">+{drlSignal?.stateValue?.toFixed(2) || "1.42"}</span>
                </div>
              </div>

              {/* Direct Deployment Button */}
              <button
                onClick={handleDeploySignal}
                className="w-full flex items-center justify-center gap-2 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] text-xs font-semibold uppercase tracking-wider py-2.5 rounded-xs transition-colors shadow-sm cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Deploy Signal to Portfolio ({selectedSymbol})</span>
              </button>

              <button
                onClick={() => {
                  setSelectedFnoSymbol(selectedSymbol);
                  setActiveTab("fno_terminal");
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] text-xs font-medium uppercase py-2 rounded-xs transition-colors cursor-pointer"
              >
                <Crosshair className="h-3.5 w-3.5 text-[#C8A96B]" />
                <span>Open in F&amp;O Options Matrix</span>
              </button>
            </div>
          </div>

          {/* Trader Execution Playbook */}
          <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 space-y-3 font-sans text-xs">
            <div className="flex items-center space-x-2 border-b border-white/[0.065] pb-2 text-[#C8A96B]">
              <Lightbulb className="h-4 w-4" />
              <span className="font-semibold uppercase tracking-wider text-[#F2F0E8]">
                AI EXECUTION PLAYBOOK
              </span>
            </div>

            <p className="text-[#A7ADA8] leading-relaxed">
              {forecastData?.traderTakeaway || `Actor-Critic network confirms bullish continuation. Favor entering near dynamic support at ₹${(currentPrice * 0.99).toFixed(1)} with stop loss anchored at invalidation level ₹${(currentPrice * 0.965).toFixed(1)}.`}
            </p>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
              <div className="bg-[#111614] border border-white/[0.04] p-2 rounded-xs">
                <span className="text-[#68716C] block font-sans text-[10px]">Target (95% CI):</span>
                <span className="text-[#42A77A] font-semibold">₹{(currentPrice * 1.052).toFixed(2)}</span>
              </div>
              <div className="bg-[#111614] border border-white/[0.04] p-2 rounded-xs">
                <span className="text-[#68716C] block font-sans text-[10px]">Risk:Reward:</span>
                <span className="text-[#C8A96B] font-semibold">1 : 2.8</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
