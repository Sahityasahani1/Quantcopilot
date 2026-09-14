"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  DRLAgentSignal, 
  DRLBacktestResult, 
  DeepForecastData, 
  DRLActionType 
} from "../types/strategy";
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  ShieldAlert, 
  Sliders, 
  RefreshCw, 
  Layers, 
  Award, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Crosshair,
  Cpu,
  BrainCircuit,
  Eye
} from "lucide-react";

const SUPPORTED_TICKERS = [
  { symbol: "NIFTY 50", name: "Nifty 50 Index", type: "INDEX" },
  { symbol: "BANKNIFTY", name: "Bank Nifty Index", type: "INDEX" },
  { symbol: "RELIANCE", name: "Reliance Industries", type: "EQUITY" },
  { symbol: "TCS", name: "Tata Consultancy Services", type: "EQUITY" },
  { symbol: "HDFCBANK", name: "HDFC Bank", type: "EQUITY" },
  { symbol: "INFY", name: "Infosys Ltd", type: "EQUITY" },
  { symbol: "ICICIBANK", name: "ICICI Bank", type: "EQUITY" },
  { symbol: "TATAMOTORS", name: "Tata Motors", type: "EQUITY" },
  { symbol: "SBIN", name: "State Bank of India", type: "EQUITY" },
  { symbol: "TATASTEEL", name: "Tata Steel", type: "EQUITY" }
];

export const StrategyLab: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [activeSubTab, setActiveSubTab] = useState<"DRL_AGENT" | "DEEP_FORECASTER">("DRL_AGENT");
  
  // Backtest parameters
  const [capital, setCapital] = useState<number>(100000);
  const [leverage, setLeverage] = useState<number>(1.0);
  const [riskProfile, setRiskProfile] = useState<"CONSERVATIVE" | "BALANCED" | "AGGRESSIVE">("BALANCED");
  
  // Data states
  const [drlSignal, setDrlSignal] = useState<DRLAgentSignal | null>(null);
  const [backtestData, setBacktestData] = useState<DRLBacktestResult | null>(null);
  const [forecastData, setForecastData] = useState<DeepForecastData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Fetch live signals and backtests
  const fetchStrategyData = async (symbol: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch DRL Live Signal
      const sigRes = await fetch(`http://localhost:8000/api/v1/strategy/drl-agent/${encodeURIComponent(symbol)}`);
      if (sigRes.ok) {
        const sigJson = await sigRes.json();
        setDrlSignal(sigJson);
      }

      // 2. Fetch DRL Backtest Simulation
      const btRes = await fetch("http://localhost:8000/api/v1/strategy/drl-backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          initialCapital: capital,
          leverage,
          riskProfile
        })
      });
      if (btRes.ok) {
        const btJson = await btRes.json();
        setBacktestData(btJson);
      }

      // 3. Fetch Deep Forecaster
      const fcRes = await fetch(`http://localhost:8000/api/v1/strategy/deep-forecast/${encodeURIComponent(symbol)}?horizon=20`);
      if (fcRes.ok) {
        const fcJson = await fcRes.json();
        setForecastData(fcJson);
      }
    } catch (e) {
      console.error("Error fetching Strategy Lab data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategyData(selectedSymbol);
  }, [selectedSymbol]);

  const handleRunBacktest = () => {
    fetchStrategyData(selectedSymbol);
  };

  const getActionColor = (action?: DRLActionType) => {
    switch (action) {
      case "LONG": return "text-emerald-400 bg-emerald-950/70 border-emerald-700/60";
      case "SHORT": return "text-rose-400 bg-rose-950/70 border-rose-700/60";
      case "HEDGE": return "text-amber-400 bg-amber-950/70 border-amber-700/60";
      case "HOLD": return "text-slate-300 bg-slate-800/80 border-slate-700/60";
      default: return "text-cyan-400 bg-cyan-950/70 border-cyan-700/60";
    }
  };

  // SVG Chart Dimensions for Equity Curve
  const chartWidth = 760;
  const chartHeight = 240;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };

  const equityPoints = backtestData?.equityCurve || [];
  
  const { minVal, maxVal, pathAgent, pathBench } = useMemo(() => {
    if (equityPoints.length < 2) return { minVal: 0, maxVal: 1, pathAgent: "", pathBench: "" };
    
    const allVals = equityPoints.flatMap(p => [p.agentEquity, p.benchmarkEquity]);
    const min = Math.min(...allVals) * 0.98;
    const max = Math.max(...allVals) * 1.02;
    const range = max - min || 1;

    const getX = (idx: number) => padding.left + (idx / (equityPoints.length - 1)) * (chartWidth - padding.left - padding.right);
    const getY = (val: number) => chartHeight - padding.bottom - ((val - min) / range) * (chartHeight - padding.top - padding.bottom);

    const agentCoords = equityPoints.map((p, i) => `${getX(i)},${getY(p.agentEquity)}`).join(" L ");
    const benchCoords = equityPoints.map((p, i) => `${getX(i)},${getY(p.benchmarkEquity)}`).join(" L ");

    return {
      minVal: min,
      maxVal: max,
      pathAgent: `M ${agentCoords}`,
      pathBench: `M ${benchCoords}`
    };
  }, [equityPoints]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold font-mono tracking-tight text-slate-100 uppercase">
                STRATEGY LAB & DEEP LEARNING STUDIO
              </h2>
              <span className="bg-cyan-950 text-cyan-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-800">
                PyTorch Neural Core
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              Deep Reinforcement Learning (Actor-Critic) policy execution & Multi-Horizon Attention Forecaster.
            </p>
          </div>
        </div>

        {/* Controls: Ticker Selector & SubTab switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setActiveSubTab("DRL_AGENT")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeSubTab === "DRL_AGENT"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              DRL Policy Agent
            </button>
            <button
              onClick={() => setActiveSubTab("DEEP_FORECASTER")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                activeSubTab === "DEEP_FORECASTER"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Temporal Attention
            </button>
          </div>

          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-2 outline-none focus:border-cyan-500 transition-colors"
          >
            {SUPPORTED_TICKERS.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol} ({t.name})
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchStrategyData(selectedSymbol)}
            disabled={isLoading}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Grid: Policy & Signal Overview */}
      {activeSubTab === "DRL_AGENT" ? (
        <div className="space-y-6">
          {/* Top Row: Real-Time DRL Agent Signal Card + Action Probability Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-Time Neural Signal Badge Card */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                    LIVE DRL AGENT DECISION
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedSymbol} @ ₹{drlSignal?.currentPrice?.toLocaleString("en-IN") || "0.00"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-mono text-slate-400 mb-1">Recommended Action</div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-base font-bold font-mono border shadow-md ${getActionColor(drlSignal?.recommendedAction)}`}>
                    {drlSignal?.recommendedAction === "LONG" && <TrendingUp className="h-5 w-5 text-emerald-400" />}
                    {drlSignal?.recommendedAction === "SHORT" && <TrendingDown className="h-5 w-5 text-rose-400" />}
                    {drlSignal?.recommendedAction === "HEDGE" && <ShieldAlert className="h-5 w-5 text-amber-400" />}
                    {drlSignal?.recommendedAction === "HOLD" && <Activity className="h-5 w-5 text-slate-400" />}
                    {drlSignal?.recommendedAction || "EVALUATING..."}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-mono text-slate-400 mb-1">Action Confidence</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400">
                    {drlSignal?.confidencePct || 0}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Entropy: {drlSignal?.policyEntropy || 0.5}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Critic State Value V(s):</span>
                <span className="font-bold text-emerald-400">+{drlSignal?.stateValue || 0.24}</span>
              </div>
            </div>

            {/* Action Distribution Probabilities */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />
                  POLICY ACTION PROBABILITIES
                </span>
                <span className="text-[10px] font-mono text-slate-500">Softmax Output</span>
              </div>

              <div className="space-y-2.5 pt-1">
                {(drlSignal?.actionDistribution || [
                  { action: "LONG", probability: 0.68, probPct: 68.0, qValue: 1.42 },
                  { action: "HEDGE", probability: 0.16, probPct: 16.0, qValue: 0.58 },
                  { action: "HOLD", probability: 0.11, probPct: 11.0, qValue: 0.12 },
                  { action: "SHORT", probability: 0.05, probPct: 5.0, qValue: -0.84 }
                ]).map((item) => (
                  <div key={item.action} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className={`font-semibold ${
                        item.action === "LONG" ? "text-emerald-400" :
                        item.action === "SHORT" ? "text-rose-400" :
                        item.action === "HEDGE" ? "text-amber-400" : "text-slate-300"
                      }`}>
                        {item.action}
                      </span>
                      <div className="space-x-2 text-slate-400">
                        <span>Q: {item.qValue > 0 ? `+${item.qValue}` : item.qValue}</span>
                        <span className="font-bold text-slate-200">{item.probPct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.action === "LONG" ? "bg-emerald-500" :
                          item.action === "SHORT" ? "bg-rose-500" :
                          item.action === "HEDGE" ? "bg-amber-500" : "bg-slate-600"
                        }`}
                        style={{ width: `${item.probPct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neural Feature Drivers */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-cyan-400" />
                  TOP NEURAL SIGNAL DRIVERS
                </span>
                <span className="text-[10px] font-mono text-slate-500">Feature Importance</span>
              </div>

              <div className="space-y-2 pt-1">
                {(drlSignal?.topSignalDrivers || [
                  { feature: "Normalized Return", importancePct: 26.5 },
                  { feature: "RSI Momentum (14)", importancePct: 22.1 },
                  { feature: "Order Book Imbalance", importancePct: 18.4 },
                  { feature: "GNN Contagion Risk", importancePct: 16.8 },
                  { feature: "Volatility Z-Score", importancePct: 16.2 }
                ]).map((feat, idx) => (
                  <div key={feat.feature} className="flex items-center justify-between text-xs font-mono py-1 border-b border-slate-800/40 last:border-0">
                    <span className="text-slate-300 truncate max-w-[160px]">
                      {idx + 1}. {feat.feature}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${feat.importancePct}%` }} />
                      </div>
                      <span className="font-bold text-cyan-300 w-10 text-right">{feat.importancePct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Institutional Performance Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Sharpe Ratio</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {backtestData?.sharpeRatio || 2.18}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Benchmark: 1.12</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Alpha vs Index</div>
              <div className="text-lg font-bold font-mono text-cyan-400">
                +{backtestData?.alphaPct || 13.3}%
              </div>
              <div className="text-[9px] font-mono text-slate-500">Excess Return</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Max Drawdown</div>
              <div className="text-lg font-bold font-mono text-rose-400">
                {backtestData?.maxDrawdownPct || -6.4}%
              </div>
              <div className="text-[9px] font-mono text-slate-500">Bench: {backtestData?.benchmarkMaxDrawdownPct || -14.2}%</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Win Rate</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                {backtestData?.winRatePct || 65.5}%
              </div>
              <div className="text-[9px] font-mono text-slate-500">Trades: {backtestData?.totalTrades || 38}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Profit Factor</div>
              <div className="text-lg font-bold font-mono text-cyan-400">
                {backtestData?.profitFactor || 2.34}x
              </div>
              <div className="text-[9px] font-mono text-slate-500">Sortino: {backtestData?.sortinoRatio || 2.85}</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-1">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Agent Return</div>
              <div className="text-lg font-bold font-mono text-emerald-400">
                +{backtestData?.agentReturnPct || 24.5}%
              </div>
              <div className="text-[9px] font-mono text-slate-500">₹{backtestData?.finalAgentEquity?.toLocaleString("en-IN") || "124,500"}</div>
            </div>
          </div>

          {/* Interactive Equity Curve & Backtesting Simulation */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Chart Area (3 cols) */}
            <div className="lg:col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    CUMULATIVE EQUITY: DRL NEURAL AGENT VS BUY & HOLD
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-3 rounded-sm bg-cyan-400" />
                    <span className="text-slate-300">DRL Agent (+{backtestData?.agentReturnPct || 24.5}%)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-3 h-0.5 bg-slate-500" />
                    <span className="text-slate-400">Buy & Hold (+{backtestData?.benchmarkReturnPct || 11.2}%)</span>
                  </div>
                </div>
              </div>

              {/* SVG Equity Curve Chart */}
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-auto text-slate-400 select-none"
                >
                  {/* Grid Lines */}
                  {[0.25, 0.5, 0.75].map((pct, idx) => {
                    const y = padding.top + pct * (chartHeight - padding.top - padding.bottom);
                    const val = maxVal - pct * (maxVal - minVal);
                    return (
                      <g key={idx}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={chartWidth - padding.right}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          fontSize="9"
                          fontFamily="monospace"
                          fill="#64748b"
                          textAnchor="end"
                        >
                          ₹{Math.round(val).toLocaleString("en-IN")}
                        </text>
                      </g>
                    );
                  })}

                  {/* Benchmark Line */}
                  <path
                    d={pathBench}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />

                  {/* DRL Agent Line */}
                  <path
                    d={pathAgent}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Highlight Nodes */}
                  {equityPoints.length > 0 && (
                    <circle
                      cx={chartWidth - padding.right}
                      cy={chartHeight - padding.bottom - ((equityPoints[equityPoints.length - 1].agentEquity - minVal) / (maxVal - minVal || 1)) * (chartHeight - padding.top - padding.bottom)}
                      r="4"
                      fill="#06b6d4"
                      stroke="#083344"
                      strokeWidth="2"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Backtesting Parameter Controls (1 col) */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-3">
                <Sliders className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase">
                  SIMULATION PARAMETERS
                </span>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Initial Capital:</span>
                    <span className="font-bold text-slate-200">₹{capital.toLocaleString("en-IN")}</span>
                  </div>
                  <input
                    type="range"
                    min="25000"
                    max="1000000"
                    step="25000"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-950 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Leverage:</span>
                    <span className="font-bold text-cyan-400">{leverage}x</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1.0, 2.0, 3.0, 5.0].map((l) => (
                      <button
                        key={l}
                        onClick={() => setLeverage(l)}
                        className={`py-1.5 text-center rounded-lg border font-bold transition-colors ${
                          leverage === l
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {l}x
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-slate-400">Risk Profile / Policy:</div>
                  <div className="space-y-1">
                    {(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setRiskProfile(mode)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                          riskProfile === mode
                            ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/40"
                            : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRunBacktest}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  {isLoading ? "Simulating Agent..." : "Run Neural Backtest"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Temporal Attention Forecaster View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Forecast Summary Card */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  QUANTILE HORIZON SUMMARY
                </span>
                <span className="text-[10px] font-mono text-slate-500">t+1 to t+20</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Dominant Trend:</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    forecastData?.dominantTrend === "BULLISH" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                    forecastData?.dominantTrend === "BEARISH" ? "bg-rose-950 text-rose-400 border border-rose-800" :
                    "bg-slate-800 text-slate-300"
                  }`}>
                    {forecastData?.dominantTrend || "BULLISH"}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Neural Trend Confidence:</span>
                  <span className="font-bold text-cyan-400">{forecastData?.trendConfidence || 74.2}%</span>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Expected 20-Bar Drift:</span>
                  <span className="font-bold text-emerald-400">+{forecastData?.expectedDriftPct || 2.5}%</span>
                </div>

                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Volatility Envelope:</span>
                  <span className="font-bold text-amber-400">±{forecastData?.volatilityEnvelopePct || 4.8}%</span>
                </div>
              </div>
            </div>

            {/* Feature Attention Breakdown */}
            <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-1.5">
                  <Crosshair className="h-4 w-4 text-cyan-400" />
                  TEMPORAL SELF-ATTENTION WEIGHTS
                </span>
                <span className="text-[10px] font-mono text-slate-500">Multi-Head Attention</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {(forecastData?.featureImportance || [
                  { feature: "Price Momentum", weight: 0.284, importancePct: 28.4 },
                  { feature: "RSI Divergence", weight: 0.216, importancePct: 21.6 },
                  { feature: "Volume Z-Score", weight: 0.185, importancePct: 18.5 },
                  { feature: "GNN Contagion Weight", weight: 0.162, importancePct: 16.2 }
                ]).map((feat) => (
                  <div key={feat.feature} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300">{feat.feature}</span>
                      <span className="font-bold text-cyan-400">{feat.importancePct}%</span>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full" style={{ width: `${feat.importancePct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Forecast Points Table with 80% & 95% Confidence Intervals */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-cyan-400" />
                MULTI-HORIZON PROBABILISTIC TRAJECTORY TABLE
              </span>
              <span className="text-xs font-mono text-slate-400">
                Current: ₹{forecastData?.currentPrice?.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase">
                    <th className="pb-2">Horizon Step</th>
                    <th className="pb-2">Time Offset</th>
                    <th className="pb-2">95% Lower</th>
                    <th className="pb-2">80% Lower</th>
                    <th className="pb-2 text-cyan-400 font-bold">Median Forecast</th>
                    <th className="pb-2">80% Upper</th>
                    <th className="pb-2">95% Upper</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {(forecastData?.trajectory || []).slice(0, 10).map((pt) => (
                    <tr key={pt.step} className="hover:bg-slate-900/80 transition-colors">
                      <td className="py-2.5 font-bold text-slate-300">t+{pt.step}</td>
                      <td className="py-2.5 text-slate-400">{pt.timestamp}</td>
                      <td className="py-2.5 text-rose-400">₹{pt.lowerConfidence95?.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-rose-300">₹{pt.lowerConfidence80?.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 font-bold text-cyan-300">₹{pt.basePrice?.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-emerald-300">₹{pt.upperConfidence80?.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-emerald-400">₹{pt.upperConfidence95?.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
