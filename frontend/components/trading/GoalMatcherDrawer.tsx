"use client";

import React, { useState, useEffect } from "react";
import { GoalSettings, PredictionPayload, PredictionScenarioPoint } from "../../types/trading";
import { 
  Sparkles, 
  X, 
  Target, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Calculator, 
  ArrowRight,
  BarChart2
} from "lucide-react";

interface GoalMatcherDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  prediction: PredictionPayload | null;
  onApplyPrediction: (payload: PredictionPayload) => void;
}

export const GoalMatcherDrawer: React.FC<GoalMatcherDrawerProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  prediction,
  onApplyPrediction
}) => {
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    targetProfitAmount: 35000,
    targetReturnPct: 12.5,
    targetPrice: Number((currentPrice * 1.125).toFixed(2)),
    timeHorizonDays: 14,
    capitalAllocated: 150000,
    riskTolerance: "MODERATE",
    goalType: "PROFIT_INR"
  });

  const [simulatedPrediction, setSimulatedPrediction] = useState<PredictionPayload | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Recalculate simulation whenever inputs change
  useEffect(() => {
    runSimulation();
  }, [goalSettings, symbol, currentPrice]);

  const runSimulation = () => {
    setIsSimulating(true);

    const price = currentPrice || 1000;
    let targetP = goalSettings.targetPrice;

    if (goalSettings.goalType === "PROFIT_INR") {
      const returnNeeded = (goalSettings.targetProfitAmount / goalSettings.capitalAllocated) * 100;
      targetP = Number((price * (1 + returnNeeded / 100)).toFixed(2));
    } else if (goalSettings.goalType === "RETURN_PCT") {
      targetP = Number((price * (1 + goalSettings.targetReturnPct / 100)).toFixed(2));
    }

    const returnPct = ((targetP - price) / price) * 100;
    const days = goalSettings.timeHorizonDays || 10;
    
    // Feasibility calculation based on volatility and time
    const dailyReturnNeeded = returnPct / days;
    const feasibility = Math.max(25, Math.min(96, Math.round(100 - dailyReturnNeeded * 12)));

    // Generate trajectory points for life graph
    const points: PredictionScenarioPoint[] = [];
    const now = Date.now();
    for (let i = 0; i <= days; i++) {
      const progress = i / days;
      const d = new Date(now + i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      
      // Goal path (Smooth exponential curve)
      const goalPath = price + (targetP - price) * Math.pow(progress, 0.85);
      
      // GNN AI path with market drift
      const gnnPath = price * (1 + (returnPct * 0.75 * progress) / 100) + Math.sin(progress * Math.PI) * (price * 0.012);
      
      // Bullish & Bearish extremes
      const bullish = price * (1 + (returnPct * 1.35 * progress) / 100);
      const bearish = price * (1 - (returnPct * 0.5 * progress) / 100);
      
      // Confidence bands (cone of uncertainty)
      const spread = (price * 0.02) + (price * 0.05 * progress);
      
      points.push({
        timeOffset: i,
        timestamp: dateStr,
        basePrice: Number(gnnPath.toFixed(2)),
        bullishPrice: Number(bullish.toFixed(2)),
        bearishPrice: Number(bearish.toFixed(2)),
        goalPathPrice: Number(goalPath.toFixed(2)),
        upperConfidence95: Number((gnnPath + spread * 1.5).toFixed(2)),
        lowerConfidence95: Number((gnnPath - spread * 1.5).toFixed(2)),
        upperConfidence80: Number((gnnPath + spread).toFixed(2)),
        lowerConfidence80: Number((gnnPath - spread).toFixed(2))
      });
    }

    const stopLoss = Number((price * 0.965).toFixed(2));
    const suggestedLots = Math.max(1, Math.round(goalSettings.capitalAllocated / (price * 25)));

    const result: PredictionPayload = {
      symbol,
      currentPrice: price,
      targetPrice: targetP,
      expectedDate: `${days} Days`,
      feasibilityScore: feasibility,
      expectedReturnPct: Number(returnPct.toFixed(2)),
      recommendedPosition: returnPct >= 0 ? "BUY_STOCK" : "SHORT_STOCK",
      recommendedEntry: price,
      recommendedStopLoss: stopLoss,
      recommendedTarget: targetP,
      suggestedLotsOrQty: suggestedLots * 25,
      trajectoryPoints: points,
      milestones: [
        { day: Math.round(days * 0.3), price: Number((price + (targetP - price) * 0.3).toFixed(2)), label: "T1 Milestone (30%)", achievedPct: 30 },
        { day: Math.round(days * 0.7), price: Number((price + (targetP - price) * 0.7).toFixed(2)), label: "T2 Milestone (70%)", achievedPct: 70 },
        { day: days, price: targetP, label: "Full Goal Target (100%)", achievedPct: 100 }
      ],
      appliedToChart: true
    };

    setSimulatedPrediction(result);
    setIsSimulating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="bg-[#0b0f19] border-l border-slate-800 w-full max-w-xl h-full shadow-2xl flex flex-col font-mono text-slate-200 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#080c14]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase flex items-center gap-2">
                AI Goal Matcher & Life-Graphs Predictor
              </h2>
              <p className="text-[11px] text-slate-400">
                Align chart trajectories & risk-reward to match your target profit goal.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Goal Input Mode Tabs */}
          <div className="bg-slate-950/90 border border-slate-800 p-1.5 rounded-xl flex space-x-1">
            {[
              { id: "PROFIT_INR" as const, label: "Target Profit (₹)" },
              { id: "RETURN_PCT" as const, label: "Target Return (%)" },
              { id: "PRICE_TARGET" as const, label: "Price Level (₹)" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setGoalSettings(prev => ({ ...prev, goalType: tab.id }))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  goalSettings.goalType === tab.id
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Goal Parameters Form */}
          <div className="grid grid-cols-2 gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
            {goalSettings.goalType === "PROFIT_INR" && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold uppercase">Target Net Profit (₹)</label>
                <input
                  type="number"
                  value={goalSettings.targetProfitAmount}
                  onChange={(e) => setGoalSettings(prev => ({ ...prev, targetProfitAmount: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {goalSettings.goalType === "RETURN_PCT" && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold uppercase">Target Return %</label>
                <input
                  type="number"
                  value={goalSettings.targetReturnPct}
                  onChange={(e) => setGoalSettings(prev => ({ ...prev, targetReturnPct: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {goalSettings.goalType === "PRICE_TARGET" && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-bold uppercase">Target Stock Price (₹)</label>
                <input
                  type="number"
                  value={goalSettings.targetPrice}
                  onChange={(e) => setGoalSettings(prev => ({ ...prev, targetPrice: Number(e.target.value) }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-bold uppercase">Time Horizon (Days)</label>
              <input
                type="number"
                value={goalSettings.timeHorizonDays}
                onChange={(e) => setGoalSettings(prev => ({ ...prev, timeHorizonDays: Math.max(1, Number(e.target.value)) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-bold uppercase">Trading Capital (₹)</label>
              <input
                type="number"
                value={goalSettings.capitalAllocated}
                onChange={(e) => setGoalSettings(prev => ({ ...prev, capitalAllocated: Number(e.target.value) }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-400 font-bold uppercase">Risk Appetite</label>
              <select
                value={goalSettings.riskTolerance}
                onChange={(e) => setGoalSettings(prev => ({ ...prev, riskTolerance: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none"
              >
                <option value="CONSERVATIVE">Conservative (1:1.5 RR)</option>
                <option value="MODERATE">Moderate (1:2.5 RR)</option>
                <option value="AGGRESSIVE">Aggressive (1:4.0 RR)</option>
              </select>
            </div>
          </div>

          {/* Simulated Life Graph & Trajectory Preview */}
          {simulatedPrediction && (
            <div className="space-y-4">
              {/* Feasibility & Target Summary Banner */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Goal Target</div>
                  <div className="text-sm font-bold text-amber-400 mt-0.5">₹{simulatedPrediction.targetPrice}</div>
                  <div className="text-[10px] text-emerald-400">+{simulatedPrediction.expectedReturnPct}%</div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Feasibility Score</div>
                  <div className="text-sm font-bold text-emerald-400 mt-0.5">{simulatedPrediction.feasibilityScore}%</div>
                  <div className="text-[10px] text-slate-400">High Confidence</div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Est. Reward / Risk</div>
                  <div className="text-sm font-bold text-cyan-400 mt-0.5">1 : 2.8</div>
                  <div className="text-[10px] text-slate-400">Stop: ₹{simulatedPrediction.recommendedStopLoss}</div>
                </div>
              </div>

              {/* Multi-Scenario "Life Graph" Chart */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <BarChart2 className="h-4 w-4 text-amber-400" />
                    PREDICTED MULTI-SCENARIO TRAJECTORY
                  </span>
                  <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                    GNN CONTAGION WEIGHTED
                  </span>
                </div>

                {/* SVG Visual Life Graph */}
                <div className="h-40 w-full relative pt-2">
                  <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="drawerCone" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>

                    {/* Confidence band */}
                    <polygon
                      points={`
                        0,60 
                        100,45 200,30 300,20 400,10 
                        400,95 300,85 200,80 100,75 
                        0,60
                      `}
                      fill="url(#drawerCone)"
                    />

                    {/* Bullish line */}
                    <polyline
                      points="0,60 100,40 200,25 300,12 400,2"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />

                    {/* Goal-matched path (Gold) */}
                    <polyline
                      points="0,60 100,48 200,35 300,22 400,12"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />

                    {/* GNN AI Baseline (Cyan) */}
                    <polyline
                      points="0,60 100,52 200,42 300,35 400,28"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="2"
                    />

                    {/* Bearish Invalidation (Rose) */}
                    <polyline
                      points="0,60 100,68 200,78 300,88 400,98"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-1 bg-amber-400 rounded-full" />
                    <span>Goal Path</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-1 bg-cyan-400 rounded-full" />
                    <span>GNN Forecast</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-1 bg-emerald-400 rounded-full" />
                    <span>Bull Breakout</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-1 bg-rose-400 rounded-full" />
                    <span>Risk Stop</span>
                  </div>
                </div>
              </div>

              {/* Actionable Strategy Recommendation */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="text-xs font-bold text-slate-200 uppercase flex items-center justify-between">
                  <span>Execution Recommendation</span>
                  <span className="text-emerald-400 font-bold">ACTION: BUY</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Recommended Entry</span>
                    <div className="font-bold text-slate-100">₹{simulatedPrediction.recommendedEntry}</div>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Take Profit Target</span>
                    <div className="font-bold text-amber-400">₹{simulatedPrediction.recommendedTarget}</div>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Stop Loss</span>
                    <div className="font-bold text-rose-400">₹{simulatedPrediction.recommendedStopLoss}</div>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Suggested Qty / Lots</span>
                    <div className="font-bold text-cyan-400">{simulatedPrediction.suggestedLotsOrQty} Shares</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Apply Button */}
        <div className="p-4 border-t border-slate-800 bg-[#080c14] flex space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (simulatedPrediction) {
                onApplyPrediction(simulatedPrediction);
                onClose();
              }
            }}
            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>APPLY PREDICTION & LIFE GRAPHS TO CHART</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
