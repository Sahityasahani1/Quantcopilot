"use client";

import React, { useState, useMemo } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { GNNRiskNode, GNNShockResponse } from "../types";
import { 
  Network, 
  Sliders, 
  Play, 
  RotateCcw, 
  Zap, 
  ShieldAlert, 
  X, 
  ChevronRight, 
  BarChart2,
  Activity,
  Orbit,
  Compass,
  Layers,
  Sparkles
} from "lucide-react";
import { getApiBaseUrl } from "../lib/api";

export const RiskHeatmap: React.FC = () => {
  const { gnnRisk } = usePortfolioStore();

  // State for What-If Stress Testing Simulator
  const [selectedShockSymbol, setSelectedShockSymbol] = useState<string>("HDFCBANK");
  const [shockPercentage, setShockPercentage] = useState<number>(-5.0);
  const [customShockInput, setCustomShockInput] = useState<string>("-5.0");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<GNNShockResponse | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // State for Dynamic Edge Sparsification Filter (0.10 to 0.80)
  const [edgeThreshold, setEdgeThreshold] = useState<number>(0.15);

  // State for Deep Node Inspector
  const [inspectedNode, setInspectedNode] = useState<GNNRiskNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Active view mode within GNN interface: "CIRCULAR" | "MATRIX" | "SECTORS"
  const [viewMode, setViewMode] = useState<"CIRCULAR" | "MATRIX" | "SECTORS">("CIRCULAR");

  const numNodes = gnnRisk.nodes.length || 1;
  const gridCols = Math.min(Math.max(Math.ceil(Math.sqrt(numNodes)), 3), 8);

  // Execute Shock Simulation via backend
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/portfolio/risk/gnn-simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedShockSymbol,
          shock_percentage: shockPercentage,
          damping: 0.82
        })
      });

      if (!res.ok) {
        throw new Error(`Simulation failed with status ${res.status}`);
      }

      const data: GNNShockResponse = await res.json();
      setSimulationResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error executing stress test";
      setSimError(message);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSimulation = () => {
    setSimulationResult(null);
    setSimError(null);
  };

  const handleQuickShockSelect = (val: number) => {
    setShockPercentage(val);
    setCustomShockInput(val.toString());
  };

  // Node correlation lookup for Deep Node Inspector
  const inspectedNodeCorrelations = useMemo(() => {
    if (!inspectedNode || !gnnRisk.adjacency_matrix.length) return [];
    const idx = gnnRisk.nodes.findIndex(n => n.node_id === inspectedNode.node_id);
    if (idx === -1) return [];

    const row = gnnRisk.adjacency_matrix[idx] || [];
    const corrs = gnnRisk.nodes.map((node, i) => ({
      symbol: node.asset_name,
      company: node.company_name,
      corr: row[i] || 0.0,
      risk: node.risk_score
    })).filter(item => item.symbol !== inspectedNode.asset_name);

    corrs.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
    return corrs.slice(0, 5);
  }, [inspectedNode, gnnRisk]);

  // Sector breakdown aggregation
  const sectorList = useMemo(() => {
    const secMap: Record<string, { totalRisk: number; count: number; maxRisk: number; symbols: string[] }> = {};
    for (const node of gnnRisk.nodes) {
      const sec = node.sector || "Other Equities";
      if (!secMap[sec]) {
        secMap[sec] = { totalRisk: 0, count: 0, maxRisk: 0, symbols: [] };
      }
      secMap[sec].totalRisk += node.risk_score;
      secMap[sec].count += 1;
      secMap[sec].maxRisk = Math.max(secMap[sec].maxRisk, node.risk_score);
      secMap[sec].symbols.push(node.asset_name);
    }

    return Object.entries(secMap).map(([sector, data]) => ({
      sector,
      avg_risk: roundTo(data.totalRisk / data.count, 4),
      max_risk: data.maxRisk,
      node_count: data.count,
      status: (data.totalRisk / data.count > 0.35 ? "CRITICAL" : (data.totalRisk / data.count > 0.22 ? "ELEVATED" : "STABLE")) as "CRITICAL" | "ELEVATED" | "STABLE",
      symbols: data.symbols
    })).sort((a, b) => b.avg_risk - a.avg_risk);
  }, [gnnRisk.nodes]);

  function roundTo(n: number, digits: number) {
    return Number(n.toFixed(digits));
  }

  // Count active edges above threshold
  const activeEdgeCount = useMemo(() => {
    let count = 0;
    const mat = gnnRisk.adjacency_matrix.slice(0, gridCols);
    mat.forEach(row => {
      row.slice(0, gridCols).forEach(val => {
        if (Math.abs(val) >= edgeThreshold) count++;
      });
    });
    return count;
  }, [gnnRisk.adjacency_matrix, gridCols, edgeThreshold]);

  // Circular Contagion Graph Coordinates Calculation
  const circularWidth = 640;
  const circularHeight = 560;
  const circularCX = circularWidth / 2;
  const circularCY = circularHeight / 2;
  const circularRadius = 195;

  const circularNodes = useMemo(() => {
    const raw = gnnRisk.nodes.slice(0, 16);
    const total = raw.length || 1;
    return raw.map((node, i) => {
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      const x = circularCX + circularRadius * Math.cos(angle);
      const y = circularCY + circularRadius * Math.sin(angle);
      const labelX = circularCX + (circularRadius + 26) * Math.cos(angle);
      const labelY = circularCY + (circularRadius + 26) * Math.sin(angle);
      return {
        ...node,
        index: i,
        x,
        y,
        labelX,
        labelY,
        angle
      };
    });
  }, [gnnRisk.nodes, circularCX, circularCY, circularRadius]);

  const circularEdges = useMemo(() => {
    const edges: Array<{
      source: typeof circularNodes[0];
      target: typeof circularNodes[0];
      corr: number;
      path: string;
      isHighRisk: boolean;
    }> = [];

    for (let i = 0; i < circularNodes.length; i++) {
      for (let j = i + 1; j < circularNodes.length; j++) {
        const src = circularNodes[i];
        const tgt = circularNodes[j];
        const row = gnnRisk.adjacency_matrix[i];
        const corr = row ? (row[j] ?? 0) : 0;

        if (Math.abs(corr) >= edgeThreshold) {
          const qX = circularCX * 0.35 + ((src.x + tgt.x) / 2) * 0.65;
          const qY = circularCY * 0.35 + ((src.y + tgt.y) / 2) * 0.65;
          const path = `M ${src.x} ${src.y} Q ${qX} ${qY} ${tgt.x} ${tgt.y}`;
          const isHighRisk = src.risk_score > 0.35 || tgt.risk_score > 0.35;
          edges.push({ source: src, target: tgt, corr, path, isHighRisk });
        }
      }
    }
    return edges;
  }, [circularNodes, gnnRisk.adjacency_matrix, edgeThreshold, circularCX, circularCY]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-[#F2F0E8] font-sans pb-16">
      {/* 1. Main Header & High-level Status */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.065] pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-sm bg-[#161C19] border border-white/[0.065] text-[#159570]">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold font-sans text-[#F2F0E8] tracking-wide uppercase">
                  CAUSALGRAPHX GNN RISK ENGINE MATRIX
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#C8A96B]/15 text-[#C8A96B] border border-[#C8A96B]/30 rounded-xs font-semibold">
                  4-HEAD GATv2
                </span>
              </div>
              <p className="text-xs text-[#A7ADA8] font-sans mt-0.5">
                Relational shock diffusion and covariance transmission vectors across Indian NSE equities
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 text-xs font-mono">
            <div className="flex items-center space-x-2 bg-[#161C19] px-3 py-1.5 rounded-xs border border-white/[0.065]">
              <span className="text-[#68716C] uppercase font-sans">Regime:</span>
              <span className="text-[#42A77A] font-semibold">
                {gnnRisk.regime_classification}
              </span>
            </div>

            <div className="flex items-center space-x-2 bg-[#161C19] px-3 py-1.5 rounded-xs border border-white/[0.065]">
              <span className="text-[#68716C] uppercase font-sans">System Risk:</span>
              <span className={`font-semibold font-mono-numbers tabular-nums ${
                simulationResult 
                  ? "text-[#C45D62]" 
                  : gnnRisk.overall_system_risk > 0.35 ? "text-[#C8A96B]" : "text-[#42A77A]"
              }`}>
                {simulationResult ? simulationResult.post_shock_system_risk : gnnRisk.overall_system_risk}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Interactive "What-If" Contagion Stress Test Simulator Panel */}
        <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.065] pb-3">
            <div className="flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-[#159570]" />
              <span className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider">
                INTERACTIVE CONTAGION SHOCK SIMULATOR (WHAT-IF STRESS TESTING)
              </span>
            </div>
            <span className="text-xs text-[#68716C] font-sans">
              Trace shock propagation across attention-weighted graph edges
            </span>
          </div>

          {/* Simulator Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Select Target Asset to Shock */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-sans font-medium text-[#68716C] uppercase tracking-wider block">
                1. Target Asset to Shock
              </label>
              <select
                value={selectedShockSymbol}
                onChange={(e) => setSelectedShockSymbol(e.target.value)}
                className="w-full bg-[#111614] border border-white/[0.065] rounded-xs px-3 py-2 text-xs font-mono font-medium text-[#F2F0E8] outline-none focus:border-white/[0.15] transition-colors cursor-pointer"
              >
                {gnnRisk.nodes.map((n) => (
                  <option key={n.asset_name} value={n.asset_name}>
                    {n.asset_name} ({n.company_name || n.sector || "Equity"})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Shock Selectors */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-sans font-medium text-[#68716C] uppercase tracking-wider block">
                2. Price Shock Magnitude (%)
              </label>
              <div className="flex items-center space-x-2">
                {[-2.0, -5.0, -8.0, -12.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleQuickShockSelect(val)}
                    className={`flex-1 py-1.5 px-2 text-xs font-mono font-medium rounded-xs transition-all tabular-nums ${
                      shockPercentage === val
                        ? "bg-[#C45D62]/20 text-[#C45D62] border border-[#C45D62]/40"
                        : "bg-[#111614] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] hover:border-white/[0.12]"
                    }`}
                  >
                    {val}%
                  </button>
                ))}
                <input
                  type="number"
                  step="0.5"
                  value={customShockInput}
                  onChange={(e) => {
                    setCustomShockInput(e.target.value);
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed)) setShockPercentage(parsed);
                  }}
                  className="w-20 bg-[#111614] border border-white/[0.065] rounded-xs px-2 py-1.5 text-xs font-mono tabular-nums text-[#F2F0E8] focus:outline-none focus:border-white/[0.15] text-center"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-sans text-xs font-semibold uppercase rounded-xs transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isSimulating ? (
                  <>
                    <Zap className="h-3.5 w-3.5 animate-spin" />
                    <span>Propagating...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Run Simulation</span>
                  </>
                )}
              </button>

              {simulationResult && (
                <button
                  onClick={handleResetSimulation}
                  className="py-2 px-3 bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] font-sans text-xs rounded-xs transition-colors border border-white/[0.065]"
                  title="Reset simulation baseline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Simulation Output Banner */}
          {simulationResult && (
            <div className="bg-[#C45D62]/10 border border-[#C45D62]/30 rounded-xs p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#C45D62]/20 pb-2.5">
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <ShieldAlert className="h-4 w-4 text-[#C45D62]" />
                  <span className="font-semibold text-[#C45D62]">
                    SIMULATION IMPACT: {simulationResult.shocked_asset} SHOCKED BY {simulationResult.shock_percentage}%
                  </span>
                  <span className="text-xs text-[#68716C]">({simulationResult.latency_ms}ms)</span>
                </div>
                <div className="flex items-center space-x-3 text-xs font-mono tabular-nums">
                  <span className="text-[#68716C]">System Risk:</span>
                  <span className="text-[#68716C] line-through">{simulationResult.baseline_system_risk}</span>
                  <span className="font-semibold text-[#C45D62]">&rarr; {simulationResult.post_shock_system_risk}</span>
                  <span className="px-2 py-0.5 rounded-xs text-[10px] font-semibold bg-[#C45D62]/20 text-[#C45D62] border border-[#C45D62]/30">
                    {simulationResult.contagion_status}
                  </span>
                </div>
              </div>

              {/* Top Cascade Victims Cards */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-sans font-medium text-[#A7ADA8] uppercase tracking-wider">
                  Top Cascade Victims (Secondary Distressed Assets)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {simulationResult.top_cascade_victims.map((vic) => (
                    <div
                      key={vic.symbol}
                      className="bg-[#111614] border border-white/[0.04] rounded-xs p-2.5 space-y-1 text-xs font-mono"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#F2F0E8]">{vic.symbol}</span>
                        <span className="text-[11px] text-[#C45D62] font-semibold tabular-nums">{vic.projected_price_delta_pct}%</span>
                      </div>
                      <div className="text-[11px] text-[#68716C] truncate font-sans">{vic.sector || "Equities"}</div>
                      <div className="flex justify-between items-center text-[10px] pt-1 border-t border-white/[0.04]">
                        <span className="text-[#68716C] font-sans">Risk:</span>
                        <span className="text-[#C45D62] font-semibold tabular-nums">+{vic.risk_delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {simError && (
            <div className="text-xs font-sans text-[#C45D62] bg-[#C45D62]/10 p-2.5 rounded-xs border border-[#C45D62]/20">
              {simError}
            </div>
          )}
        </div>

        {/* 3. View Switcher Tabs: Circular Network vs Matrix vs Sector Aggregator */}
        <div className="flex items-center justify-between border-b border-white/[0.065] pb-2 text-xs font-sans">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode("CIRCULAR")}
              className={`px-3 py-1.5 rounded-xs transition-colors font-medium flex items-center gap-1.5 ${
                viewMode === "CIRCULAR"
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              <Orbit className="h-3.5 w-3.5 text-[#159570]" />
              <span>Circular Contagion Graph</span>
            </button>
            <button
              onClick={() => setViewMode("MATRIX")}
              className={`px-3 py-1.5 rounded-xs transition-colors font-medium flex items-center gap-1.5 ${
                viewMode === "MATRIX"
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              <Network className="h-3.5 w-3.5 text-[#A7ADA8]" />
              <span>Asset Matrix &amp; Vectors</span>
            </button>
            <button
              onClick={() => setViewMode("SECTORS")}
              className={`px-3 py-1.5 rounded-xs transition-colors font-medium flex items-center gap-1.5 ${
                viewMode === "SECTORS"
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-[#A7ADA8]" />
              <span>Sector Fragility Clusters</span>
            </button>
          </div>

          {/* Dynamic Edge Threshold Filter Slider */}
          <div className="flex items-center space-x-2 font-mono">
            <span className="text-[10px] text-[#68716C] uppercase font-sans">Corr Threshold (&tau;):</span>
            <input
              type="range"
              min="0.10"
              max="0.80"
              step="0.05"
              value={edgeThreshold}
              onChange={(e) => setEdgeThreshold(parseFloat(e.target.value))}
              className="w-24 accent-[#159570] h-1 bg-[#161C19] rounded-xs cursor-pointer"
            />
            <span className="text-xs font-semibold text-[#F2F0E8] w-8 text-right tabular-nums">
              {edgeThreshold.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 4. Main Views: Circular Graph vs Matrix vs Sector View */}
        <div key={viewMode}>
          {viewMode === "CIRCULAR" ? (
            /* PREMIER CIRCULAR CONTAGION GRAPH */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* SVG Circular Graph Visualizer */}
              <div className="lg:col-span-2 bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-full flex justify-between items-center text-xs font-sans text-[#A7ADA8] mb-2 px-2">
                  <div className="flex items-center space-x-2">
                    <Compass className="h-4 w-4 text-[#159570]" />
                    <span className="uppercase font-semibold tracking-wider text-[#F2F0E8]">
                      CROSS-STOCK SYSTEMIC CONTAGION TOPOLOGY
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-[#159570] font-semibold">{circularEdges.length} Chords Active</span>
                    <span className="text-[#68716C]">&bull;</span>
                    <span className="text-[#A7ADA8]">&tau; &ge; {edgeThreshold.toFixed(2)}</span>
                  </div>
                </div>

                <div className="relative w-full max-w-[580px] aspect-square flex items-center justify-center">
                  <svg
                    viewBox={`0 0 ${circularWidth} ${circularHeight}`}
                    className="w-full h-full select-none"
                  >
                    <defs>
                      <filter id="glowJade" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <radialGradient id="centerAura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#159570" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#080A09" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Central Atmosphere Aura */}
                    <circle cx={circularCX} cy={circularCY} r={circularRadius - 30} fill="url(#centerAura)" />

                    {/* Outer Circumference Guide Ring */}
                    <circle
                      cx={circularCX}
                      cy={circularCY}
                      r={circularRadius}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeDasharray="3 3"
                    />

                    {/* Chords (Curved Transmission Edges) */}
                    {circularEdges.map((edge, idx) => {
                      const isConnectedToHovered = hoveredNodeId && 
                        (edge.source.node_id === hoveredNodeId || edge.target.node_id === hoveredNodeId);
                      const isShocked = (edge.source.asset_name === selectedShockSymbol || edge.target.asset_name === selectedShockSymbol);

                      const opacity = isConnectedToHovered ? 0.95 : hoveredNodeId ? 0.08 : Math.max(0.20, Math.abs(edge.corr) * 0.8);
                      const strokeColor = isShocked ? "#C45D62" : isConnectedToHovered ? "#C8A96B" : edge.isHighRisk ? "#C45D62" : "#42A77A";
                      const strokeWidth = isConnectedToHovered ? 2.5 : Math.max(1, Math.abs(edge.corr) * 3);

                      return (
                        <path
                          key={idx}
                          d={edge.path}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeOpacity={opacity}
                          className="transition-all duration-200"
                        />
                      );
                    })}

                    {/* Central HUD Info Lockup */}
                    <g transform={`translate(${circularCX}, ${circularCY})`}>
                      <circle r={52} fill="#111614" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
                      <text y={-14} fontSize={9} fill="#68716C" textAnchor="middle" fontFamily="sans-serif" letterSpacing="0.05em">
                        SYSTEM RISK
                      </text>
                      <text y={6} fontSize={18} fill="#F2F0E8" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                        {simulationResult ? simulationResult.post_shock_system_risk : gnnRisk.overall_system_risk}
                      </text>
                      <text y={22} fontSize={8} fill="#42A77A" textAnchor="middle" fontFamily="monospace" fontWeight="600">
                        {gnnRisk.regime_classification}
                      </text>
                      <text y={34} fontSize={7} fill="#68716C" textAnchor="middle" fontFamily="sans-serif">
                        Damping: 0.82
                      </text>
                    </g>

                    {/* Nodes and Ticker Badges */}
                    {circularNodes.map((node) => {
                      const isHigh = node.risk_score > 0.35;
                      const isHovered = hoveredNodeId === node.node_id;
                      const isSelected = selectedShockSymbol === node.asset_name;
                      const isInspected = inspectedNode?.node_id === node.node_id;

                      const nodeRadius = 8 + (node.centrality || 0.4) * 8;
                      const borderColor = isSelected ? "#C8A96B" : isHigh ? "#C45D62" : "#42A77A";

                      return (
                        <g
                          key={node.node_id}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredNodeId(node.node_id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          onClick={() => {
                            setSelectedShockSymbol(node.asset_name);
                            setInspectedNode(node);
                          }}
                        >
                          {/* Halo ring if active */}
                          {(isHovered || isSelected || isInspected) && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={nodeRadius + 5}
                              fill="none"
                              stroke={borderColor}
                              strokeWidth={1.5}
                              strokeDasharray="2 2"
                              className="animate-spin-slow"
                            />
                          )}

                          {/* Main Node Body */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeRadius}
                            fill="#111614"
                            stroke={borderColor}
                            strokeWidth={2}
                          />

                          {/* Inner Core Dot */}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={3}
                            fill={borderColor}
                          />

                          {/* Text Label */}
                          <text
                            x={node.labelX}
                            y={node.labelY}
                            fontSize={10}
                            fontFamily="monospace"
                            fontWeight={isSelected || isHovered ? "bold" : "normal"}
                            fill={isSelected ? "#C8A96B" : isHovered ? "#F2F0E8" : isHigh ? "#C45D62" : "#A7ADA8"}
                            textAnchor="middle"
                            dominantBaseline="central"
                          >
                            {node.asset_name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="w-full flex justify-between items-center text-[10px] text-[#68716C] mt-2 border-t border-white/[0.04] pt-2 font-sans px-2">
                  <span>Click any node to select shock target or inspect transmission weights</span>
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#42A77A]" /> Stable Vector
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#C45D62]" /> Critical Contagion
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#C8A96B]" /> Active Target
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Node Details & High Centrality Ranks */}
              <div className="space-y-4">
                <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/[0.065] pb-2">
                    <span className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-[#159570]" />
                      ACTIVE ASSET FOCUS: {selectedShockSymbol}
                    </span>
                    <button
                      onClick={() => {
                        const target = gnnRisk.nodes.find(n => n.asset_name === selectedShockSymbol);
                        if (target) setInspectedNode(target);
                      }}
                      className="text-[10px] text-[#C8A96B] hover:underline font-mono"
                    >
                      Deep Profile &rarr;
                    </button>
                  </div>

                  {(() => {
                    const node = gnnRisk.nodes.find(n => n.asset_name === selectedShockSymbol) || gnnRisk.nodes[0];
                    if (!node) return null;
                    return (
                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#68716C] font-sans">Company:</span>
                          <span className="text-[#F2F0E8] font-sans">{node.company_name || node.asset_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#68716C] font-sans">Sector:</span>
                          <span className="text-[#A7ADA8] font-sans">{node.sector || "Equities"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#68716C] font-sans">Centrality Index:</span>
                          <span className="text-[#F2F0E8] font-semibold">{node.centrality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#68716C] font-sans">Contagion Spillover:</span>
                          <span className="text-[#C8A96B] font-semibold">{node.systemic_contagion_factor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#68716C] font-sans">GNN Risk Score:</span>
                          <span className={`font-semibold ${node.risk_score > 0.35 ? "text-[#C45D62]" : "text-[#42A77A]"}`}>
                            {node.risk_score}
                          </span>
                        </div>

                        {/* Quick Shock Button */}
                        <button
                          onClick={handleRunSimulation}
                          disabled={isSimulating}
                          className="w-full mt-2 py-2 bg-[#C45D62]/15 hover:bg-[#C45D62]/25 text-[#C45D62] border border-[#C45D62]/30 text-xs font-semibold uppercase rounded-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>Simulate -{Math.abs(shockPercentage)}% Shock on {node.asset_name}</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Top Systemic Centrality Leaderboard */}
                <div className="bg-[#0C100F] border border-white/[0.065] rounded-sm p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/[0.065] pb-2">
                    <span className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider">
                      SYSTEMIC CENTRALITY RANKINGS
                    </span>
                    <span className="text-[10px] text-[#68716C] font-mono">PageRank / Degree</span>
                  </div>

                  <div className="space-y-2">
                    {[...gnnRisk.nodes]
                      .sort((a, b) => b.centrality - a.centrality)
                      .slice(0, 5)
                      .map((node, rank) => (
                        <div
                          key={node.node_id}
                          onClick={() => {
                            setSelectedShockSymbol(node.asset_name);
                            setInspectedNode(node);
                          }}
                          className="flex items-center justify-between p-2 rounded-xs bg-[#111614] border border-white/[0.04] hover:border-white/[0.12] cursor-pointer transition-colors text-xs font-mono"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-[#68716C] w-4 text-center font-sans font-medium">{rank + 1}</span>
                            <span className="font-semibold text-[#F2F0E8]">{node.asset_name}</span>
                            <span className="text-[9px] text-[#A7ADA8] font-sans truncate max-w-[80px]">{node.sector}</span>
                          </div>
                          <div className="flex items-center space-x-3 tabular-nums">
                            <span className="text-[#A7ADA8]">{node.centrality}</span>
                            <span className={`font-semibold ${node.risk_score > 0.35 ? "text-[#C45D62]" : "text-[#42A77A]"}`}>
                              {node.risk_score}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === "MATRIX" ? (
            /* Matrix View */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Asset Contagion & Centrality Vector List */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-sans font-semibold text-[#A7ADA8] uppercase tracking-wider">
                    Asset Contagion &amp; Centrality Vectors
                  </h3>
                  <span className="text-[11px] font-sans text-[#68716C]">
                    Click any node to inspect transmission edges
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {gnnRisk.nodes.map((node) => {
                    const isHigh = node.risk_score > 0.35;
                    const isInspected = inspectedNode?.node_id === node.node_id;

                    return (
                      <div
                        key={node.node_id}
                        onClick={() => setInspectedNode(node)}
                        className={`bg-[#0C100F] border rounded-xs p-3 flex items-center justify-between text-xs font-mono cursor-pointer transition-colors hover:border-white/[0.12] ${
                          isInspected 
                            ? "border-[#159570]/50 bg-[#161C19]" 
                            : "border-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isHigh ? "bg-[#C45D62]" : "bg-[#159570]"}`} />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-[#F2F0E8] font-mono">{node.asset_name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-[#161C19] border border-white/[0.065] rounded-xs text-[#A7ADA8] font-sans">
                                {node.sector || "Equities"}
                              </span>
                            </div>
                            {node.company_name && (
                              <span className="text-[11px] text-[#A7ADA8] font-sans block">
                                {node.company_name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-6">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#68716C] font-sans">Centrality</span>
                            <span className="text-[#A7ADA8] tabular-nums">{node.centrality}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#68716C] font-sans">Contagion</span>
                            <span className="text-[#A7ADA8] tabular-nums">{node.systemic_contagion_factor}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-[#68716C] font-sans">GNN Risk</span>
                            <span className={`font-semibold tabular-nums ${isHigh ? "text-[#C45D62]" : "text-[#42A77A]"}`}>
                              {node.risk_score}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-[#68716C]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Dynamic Adjacency Correlation Heatmap */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-sans text-[#A7ADA8]">
                  <span className="uppercase font-semibold tracking-wider">Correlation Heatmap</span>
                  <span className="text-xs font-mono text-[#159570] font-semibold">{activeEdgeCount} Edges Active</span>
                </div>

                <div className="bg-[#0C100F] border border-white/[0.065] rounded-xs p-4 flex flex-col items-center justify-center">
                  <div 
                    className="grid gap-1 w-full aspect-square max-w-[240px]"
                    style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                  >
                    {gnnRisk.adjacency_matrix.slice(0, gridCols).map((row, i) =>
                      row.slice(0, gridCols).map((val, j) => {
                        const isPassing = Math.abs(val) >= edgeThreshold;
                        const opacity = isPassing ? Math.max(0.20, Math.abs(val)) : 0.05;

                        return (
                          <div
                            key={`${i}-${j}`}
                            title={`Correlation Edge (${i}, ${j}): ${val.toFixed(2)}`}
                            style={{
                              backgroundColor: `rgba(21, 149, 112, ${opacity})`
                            }}
                            className={`rounded-xs border flex items-center justify-center text-[9px] font-mono font-medium transition-colors tabular-nums ${
                              isPassing 
                                ? "border-[#159570]/40 text-[#F2F0E8]" 
                                : "border-white/[0.04] text-[#68716C] opacity-20"
                            }`}
                          >
                            {isPassing ? val.toFixed(2) : "·"}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="text-[11px] font-sans text-[#68716C] mt-3 text-center">
                    Thresholded Backbone ({edgeThreshold.toFixed(2)}+ correlation). Hover cell for pair values.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Sector Vulnerability Fragility View */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-sans text-[#A7ADA8]">
                <span className="uppercase font-semibold tracking-wider">SECTOR-LEVEL SYSTEMIC RISK &amp; CONTAGION CLUSTERS</span>
                <span className="text-xs font-mono">{sectorList.length} Sectors Modeled</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectorList.map((sec) => (
                  <div
                    key={sec.sector}
                    className="bg-[#0C100F] border border-white/[0.065] rounded-xs p-4 space-y-3 font-sans text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.065] pb-2">
                      <span className="font-semibold text-[#F2F0E8]">{sec.sector}</span>
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-xs border ${
                        sec.status === "CRITICAL"
                          ? "bg-[#C45D62]/10 text-[#C45D62] border-[#C45D62]/25"
                          : sec.status === "ELEVATED"
                          ? "bg-[#C8A96B]/15 text-[#C8A96B] border-[#C8A96B]/30"
                          : "bg-[#159570]/10 text-[#42A77A] border-[#159570]/25"
                      }`}>
                        {sec.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between text-[#A7ADA8] text-xs">
                        <span className="font-sans text-[#68716C]">Avg Contagion Score:</span>
                        <span className="font-semibold tabular-nums text-[#F2F0E8]">{sec.avg_risk}</span>
                      </div>
                      {/* Visual Risk Progress Bar */}
                      <div className="w-full bg-[#161C19] rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            sec.avg_risk > 0.35 ? "bg-[#C45D62]" : sec.avg_risk > 0.22 ? "bg-[#C8A96B]" : "bg-[#159570]"
                          }`}
                          style={{ width: `${Math.min(100, sec.avg_risk * 200)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-[#68716C] pt-1">
                      <span>{sec.node_count} Constituents</span>
                      <span className="truncate max-w-[150px] font-mono text-[#A7ADA8]">{sec.symbols.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Deep Node Inspector Modal */}
      {inspectedNode && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-lg shadow-2xl p-6 space-y-5 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-white/[0.065] pb-3">
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-4 w-4 text-[#159570]" />
                <span className="text-sm font-semibold text-[#F2F0E8] uppercase tracking-wider">
                  NODE TRANSMISSION PROFILE: {inspectedNode.asset_name}
                </span>
              </div>
              <button
                onClick={() => setInspectedNode(null)}
                className="p-1.5 bg-[#161C19] rounded-xs text-[#68716C] hover:text-[#F2F0E8] hover:bg-[#1B2420] transition-colors cursor-pointer border border-white/[0.065]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-2.5 text-center">
                <div className="text-[10px] text-[#68716C] uppercase font-sans">Risk Score</div>
                <div className="text-base font-semibold text-[#C45D62] mt-1">{inspectedNode.risk_score}</div>
              </div>
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-2.5 text-center">
                <div className="text-[10px] text-[#68716C] uppercase font-sans">Centrality</div>
                <div className="text-base font-semibold text-[#F2F0E8] mt-1">{inspectedNode.centrality}</div>
              </div>
              <div className="bg-[#0C100F] border border-white/[0.04] rounded-xs p-2.5 text-center">
                <div className="text-[10px] text-[#68716C] uppercase font-sans">Contagion Factor</div>
                <div className="text-base font-semibold text-[#42A77A] mt-1">{inspectedNode.systemic_contagion_factor}</div>
              </div>
            </div>

            {/* Top Correlated Transmission Neighbors */}
            <div className="space-y-2">
              <div className="text-[10px] font-sans font-medium text-[#A7ADA8] uppercase tracking-wider">
                Top Correlated Transmission Neighbors
              </div>
              <div className="space-y-1.5 font-mono">
                {inspectedNodeCorrelations.map((peer) => (
                  <div
                    key={peer.symbol}
                    className="flex items-center justify-between bg-[#0C100F] border border-white/[0.04] rounded-xs px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-[#F2F0E8]">{peer.symbol}</span>
                      {peer.company && (
                        <span className="text-[11px] text-[#68716C] ml-2 font-sans">{peer.company}</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 tabular-nums">
                      <span className="text-xs text-[#68716C] font-sans">Edge: {peer.corr.toFixed(3)}</span>
                      <span className={`font-semibold ${peer.risk > 0.35 ? "text-[#C45D62]" : "text-[#42A77A]"}`}>
                        {peer.risk}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 18-Alpha Feature Vector Readings */}
            {inspectedNode.features && inspectedNode.features.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-white/[0.065] font-mono">
                <div className="text-[10px] font-sans font-medium text-[#68716C] uppercase tracking-wider">
                  Alpha Vector Feature Signature (Partial)
                </div>
                <div className="grid grid-cols-4 gap-1 text-[11px] tabular-nums">
                  {inspectedNode.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="bg-[#0C100F] px-2 py-1 rounded-xs border border-white/[0.04] text-center text-[#A7ADA8]">
                      &alpha;_{i+1}: <span className="text-[#F2F0E8] font-semibold">{f.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
