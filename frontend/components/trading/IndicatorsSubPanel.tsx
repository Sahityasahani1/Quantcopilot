"use client";

import React from "react";
import { IndicatorConfig } from "../../types/trading";
import { Activity, X } from "lucide-react";

interface IndicatorsSubPanelProps {
  indicators: IndicatorConfig;
  onCloseIndicator: (key: keyof IndicatorConfig) => void;
  width: number;
}

export const IndicatorsSubPanel: React.FC<IndicatorsSubPanelProps> = ({
  indicators,
  onCloseIndicator,
  width
}) => {
  const showPanel = indicators.rsi || indicators.macd;
  if (!showPanel) return null;

  return (
    <div className="flex flex-col border-t border-slate-800 bg-[#06090e] shrink-0 font-mono select-none">
      {/* RSI Sub-Panel */}
      {indicators.rsi && (
        <div className="h-28 border-b border-slate-800/80 p-2 flex flex-col relative">
          <div className="flex items-center justify-between text-[11px] text-slate-400 shrink-0 mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-pink-400">RSI (14, Close)</span>
              <span className="text-white font-extrabold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                62.40
              </span>
              <span className="text-[10px] text-slate-500">Bullish Momentum</span>
            </div>
            <button
              onClick={() => onCloseIndicator("rsi")}
              className="text-slate-500 hover:text-rose-400 p-0.5"
              title="Close RSI"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* RSI SVG Curve & Levels */}
          <div className="flex-1 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 70" preserveAspectRatio="none">
              <defs>
                <linearGradient id="rsiZone" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Overbought 70 level */}
              <line x1="0" y1="21" x2="500" y2="21" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3,3" />
              <text x="475" y="18" fill="#f43f5e" fontSize="9">70 OB</text>

              {/* 50 Centerline */}
              <line x1="0" y1="35" x2="500" y2="35" stroke="#475569" strokeWidth="1" strokeDasharray="2,4" />

              {/* Oversold 30 level */}
              <line x1="0" y1="49" x2="500" y2="49" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" />
              <text x="475" y="58" fill="#10b981" fontSize="9">30 OS</text>

              {/* RSI fill zone */}
              <rect x="0" y="21" width="500" height="28" fill="url(#rsiZone)" />

              {/* Simulated RSI Curve */}
              <path
                d="M 0,45 Q 60,55 120,40 T 240,28 T 360,34 T 480,26 L 500,24"
                fill="none"
                stroke="#ec4899"
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
      )}

      {/* MACD Sub-Panel */}
      {indicators.macd && (
        <div className="h-28 p-2 flex flex-col relative">
          <div className="flex items-center justify-between text-[11px] text-slate-400 shrink-0 mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-indigo-400">MACD (12, 26, 9)</span>
              <span className="text-cyan-400 font-bold">MACD: +14.2</span>
              <span className="text-amber-400 font-bold">Signal: +9.8</span>
              <span className="text-emerald-400 font-bold">Hist: +4.4</span>
            </div>
            <button
              onClick={() => onCloseIndicator("macd")}
              className="text-slate-500 hover:text-rose-400 p-0.5"
              title="Close MACD"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* MACD SVG Histogram & Signal Lines */}
          <div className="flex-1 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 70" preserveAspectRatio="none">
              {/* Zero line */}
              <line x1="0" y1="35" x2="500" y2="35" stroke="#334155" strokeWidth="1" />

              {/* Histogram bars */}
              {[
                { x: 20, h: -8 }, { x: 50, h: -14 }, { x: 80, h: -6 }, { x: 110, h: 4 },
                { x: 140, h: 10 }, { x: 170, h: 18 }, { x: 200, h: 24 }, { x: 230, h: 20 },
                { x: 260, h: 15 }, { x: 290, h: 8 }, { x: 320, h: -4 }, { x: 350, h: 6 },
                { x: 380, h: 14 }, { x: 410, h: 22 }, { x: 440, h: 28 }, { x: 470, h: 24 }
              ].map((bar, i) => (
                <rect
                  key={i}
                  x={bar.x}
                  y={bar.h >= 0 ? 35 - bar.h : 35}
                  width="18"
                  height={Math.abs(bar.h)}
                  fill={bar.h >= 0 ? "#10b981" : "#f43f5e"}
                  opacity="0.8"
                  rx="1"
                />
              ))}

              {/* MACD Fast Line (Cyan) */}
              <path
                d="M 0,52 Q 100,60 200,20 T 350,38 T 500,16"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.8"
              />

              {/* Signal Slow Line (Amber) */}
              <path
                d="M 0,48 Q 120,54 220,26 T 370,34 T 500,22"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="1.8"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
