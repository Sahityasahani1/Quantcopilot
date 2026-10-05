"use client";

import React, { useState } from "react";
import { DrawingToolType } from "../../types/trading";
import { 
  MousePointer, 
  Paintbrush, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Split, 
  Square, 
  Ruler, 
  Target, 
  Undo2, 
  Trash2, 
  Sparkles, 
  ChevronRight,
  Info,
  Palette
} from "lucide-react";

interface ChartToolbarProps {
  activeTool: DrawingToolType;
  setActiveTool: (tool: DrawingToolType) => void;
  strokeColor: string;
  setStrokeColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onOpenGoalMatcher: () => void;
  onOpenOverview: () => void;
  onOpenOrderModal: () => void;
}

const COLORS = [
  { name: "Emerald", value: "#159570" },
  { name: "Bull Green", value: "#42A77A" },
  { name: "Champagne", value: "#C8A96B" },
  { name: "Crimson", value: "#C45D62" },
  { name: "Muted Amber", value: "#B89655" },
  { name: "Warm Ivory", value: "#F2F0E8" }
];

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  activeTool,
  setActiveTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  onClear,
  onOpenGoalMatcher,
  onOpenOverview,
  onOpenOrderModal
}) => {
  const [showPatternsMenu, setShowPatternsMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const patternTools: { type: DrawingToolType; name: string; icon: string; desc: string }[] = [
    { type: "PATTERN_DOUBLE_BOTTOM", name: "Double Bottom (W)", icon: "W", desc: "Bullish reversal target" },
    { type: "PATTERN_DOUBLE_TOP", name: "Double Top (M)", icon: "M", desc: "Bearish reversal breakdown" },
    { type: "PATTERN_HEAD_AND_SHOULDERS", name: "Head & Shoulders", icon: "H&S", desc: "Classic reversal with neckline" },
    { type: "PATTERN_BULL_FLAG", name: "Bull Flag Channel", icon: "FLAG", desc: "Continuation breakout" },
    { type: "PATTERN_ASCENDING_TRIANGLE", name: "Ascending Triangle", icon: "TRI", desc: "Horizontal resistance breakout" }
  ];

  return (
    <div className="absolute left-3 top-14 z-30 flex flex-col items-center bg-[#0C100F]/95 backdrop-blur-md border border-white/[0.08] rounded-md p-1.5 shadow-xl space-y-1 select-none text-[#F2F0E8]">
      {/* Cursor / Select */}
      <button
        onClick={() => { setActiveTool("CURSOR"); setShowPatternsMenu(false); }}
        title="Cursor / Select (V)"
        className={`p-2 rounded transition-colors ${
          activeTool === "CURSOR"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <MousePointer className="h-4 w-4" />
      </button>

      {/* Freehand Brush */}
      <button
        onClick={() => { setActiveTool("BRUSH"); setShowPatternsMenu(false); }}
        title="Freehand Brush Tool (B) - Draw on Chart"
        className={`p-2 rounded transition-colors relative ${
          activeTool === "BRUSH"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <Paintbrush className="h-4 w-4" />
        <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: strokeColor }} />
      </button>

      <div className="w-5 h-px bg-white/[0.06] my-0.5" />

      {/* Short Position Risk-Reward Tool */}
      <button
        onClick={() => { setActiveTool("SHORT_POSITION"); setShowPatternsMenu(false); }}
        title="Short Position Risk/Reward Calculator (S)"
        className={`p-2 rounded transition-colors ${
          activeTool === "SHORT_POSITION"
            ? "bg-[#C45D62]/15 text-[#C45D62] border border-[#C45D62]/40"
            : "hover:bg-[#161C19] hover:text-[#C45D62] text-[#C45D62]/80"
        }`}
      >
        <TrendingDown className="h-4 w-4" />
      </button>

      {/* Long Position Risk-Reward Tool */}
      <button
        onClick={() => { setActiveTool("LONG_POSITION"); setShowPatternsMenu(false); }}
        title="Long Position Risk/Reward Calculator (L)"
        className={`p-2 rounded transition-colors ${
          activeTool === "LONG_POSITION"
            ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#42A77A] text-[#42A77A]/80"
        }`}
      >
        <TrendingUp className="h-4 w-4" />
      </button>

      {/* Trendline */}
      <button
        onClick={() => { setActiveTool("TRENDLINE"); setShowPatternsMenu(false); }}
        title="Trendline (T)"
        className={`p-2 rounded transition-colors ${
          activeTool === "TRENDLINE"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <Minus className="h-4 w-4 transform -rotate-45" />
      </button>

      {/* Horizontal Ray / Support Line */}
      <button
        onClick={() => { setActiveTool("HORIZONTAL_RAY"); setShowPatternsMenu(false); }}
        title="Horizontal Support/Resistance Ray (H)"
        className={`p-2 rounded transition-colors ${
          activeTool === "HORIZONTAL_RAY"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <Minus className="h-4 w-4" />
      </button>

      {/* Fibonacci Retracement */}
      <button
        onClick={() => { setActiveTool("FIBONACCI"); setShowPatternsMenu(false); }}
        title="Fibonacci Retracement (F)"
        className={`p-2 rounded transition-colors ${
          activeTool === "FIBONACCI"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <Split className="h-4 w-4" />
      </button>

      {/* Supply / Demand Zone Rectangle */}
      <button
        onClick={() => { setActiveTool("RECTANGLE"); setShowPatternsMenu(false); }}
        title="Demand / Supply Zone Box (R)"
        className={`p-2 rounded transition-colors ${
          activeTool === "RECTANGLE"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <Square className="h-4 w-4" />
      </button>

      {/* Measurement Ruler */}
      <button
        onClick={() => { setActiveTool("RULER"); setShowPatternsMenu(false); }}
        title="Price & Date Measurement Ruler (M)"
        className={`p-2 rounded transition-colors ${
          activeTool === "RULER"
            ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
            : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
        }`}
      >
        <Ruler className="h-4 w-4" />
      </button>

      {/* Chart Patterns Flyout */}
      <div className="relative">
        <button
          onClick={() => setShowPatternsMenu(!showPatternsMenu)}
          title="Classical Chart Patterns (Double Bottom, H&S, Flag...)"
          className={`p-2 rounded transition-colors flex items-center justify-center ${
            activeTool.startsWith("PATTERN_")
              ? "bg-[#161C19] text-[#159570] border border-[#159570]/40"
              : "hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C]"
          }`}
        >
          <span className="text-xs font-semibold font-mono">P</span>
        </button>

        {showPatternsMenu && (
          <div className="absolute left-full top-0 ml-2 w-64 bg-[#0C100F] border border-white/[0.08] rounded-md p-2 shadow-2xl z-40 space-y-1">
            <div className="px-2 py-1 text-[10px] font-mono text-[#A7ADA8] uppercase tracking-wider font-semibold border-b border-white/[0.06] pb-1">
              Chart Pattern Templates
            </div>
            {patternTools.map((p) => (
              <button
                key={p.type}
                onClick={() => {
                  setActiveTool(p.type);
                  setShowPatternsMenu(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded text-xs font-mono text-left transition-colors ${
                  activeTool === p.type ? "bg-[#161C19] text-[#F2F0E8] border border-[#159570]/40" : "hover:bg-[#161C19] text-[#A7ADA8]"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-[#111614] border border-white/[0.06] text-[10px] font-medium flex items-center justify-center text-[#159570]">
                    {p.icon}
                  </span>
                  <div>
                    <div className="font-medium text-[#F2F0E8]">{p.name}</div>
                    <div className="text-[10px] text-[#68716C]">{p.desc}</div>
                  </div>
                </div>
                <ChevronRight className="h-3 w-3 text-[#68716C]" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-5 h-px bg-white/[0.06] my-0.5" />

      {/* Goal Matcher AI & Life Graphs */}
      <button
        onClick={onOpenGoalMatcher}
        title="AI Goal Matcher & Life-Graph Prediction Simulator"
        className="p-2 rounded text-[#C8A96B] hover:text-[#F2F0E8] hover:bg-[#161C19] border border-[#C8A96B]/20 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
      </button>

      {/* Groww Overview & Fundamentals */}
      <button
        onClick={onOpenOverview}
        title="Groww-Style Stock Overview, 52W Range & Fundamentals"
        className="p-2 rounded hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C] transition-colors"
      >
        <Info className="h-4 w-4 text-[#159570]" />
      </button>

      {/* Style & Palette Controls */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          title="Color & Stroke Width"
          className="p-2 rounded hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C] transition-colors"
        >
          <Palette className="h-4 w-4" />
        </button>

        {showColorPicker && (
          <div className="absolute left-full top-0 ml-2 w-48 bg-[#0C100F] border border-white/[0.08] rounded-md p-3 shadow-2xl z-40 space-y-3">
            <div>
              <div className="text-[10px] font-mono text-[#A7ADA8] uppercase font-semibold mb-1.5">Color</div>
              <div className="grid grid-cols-3 gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => { setStrokeColor(c.value); setShowColorPicker(false); }}
                    className={`h-6 rounded border flex items-center justify-center transition-transform hover:scale-105 ${
                      strokeColor === c.value ? "border-[#F2F0E8] ring-1 ring-white/30" : "border-white/[0.08]"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono text-[#A7ADA8] uppercase font-semibold mb-1.5">Width ({strokeWidth}px)</div>
              <div className="flex items-center space-x-1 bg-[#111614] p-1 rounded border border-white/[0.06]">
                {[1, 2, 3, 5].map((w) => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`flex-1 py-1 rounded text-xs font-mono font-medium transition-colors ${
                      strokeWidth === w ? "bg-[#159570] text-[#F2F0E8]" : "text-[#68716C] hover:text-[#F2F0E8]"
                    }`}
                  >
                    {w}p
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-5 h-px bg-white/[0.06] my-0.5" />

      {/* Undo */}
      <button
        onClick={onUndo}
        title="Undo Last Drawing (Ctrl+Z)"
        className="p-2 rounded hover:bg-[#161C19] hover:text-[#F2F0E8] text-[#68716C] transition-colors"
      >
        <Undo2 className="h-4 w-4" />
      </button>

      {/* Clear All */}
      <button
        onClick={onClear}
        title="Clear All Drawings & Overlays"
        className="p-2 rounded hover:bg-[#C45D62]/15 hover:text-[#C45D62] text-[#68716C] transition-colors"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};
