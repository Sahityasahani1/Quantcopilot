"use client";

import React from "react";
import { IndicatorConfig } from "../../types/trading";
import { SyncedIndicatorPoint } from "../../lib/indicators";
import { X, TrendingUp, TrendingDown, Activity, AlertCircle } from "lucide-react";

interface IndicatorsSubPanelProps {
  indicators: IndicatorConfig;
  onCloseIndicator: (key: keyof IndicatorConfig) => void;
  width: number;
  data?: SyncedIndicatorPoint[];
  hoveredPoint?: SyncedIndicatorPoint | null;
  onHoverIndex?: (index: number | null) => void;
}

export const IndicatorsSubPanel: React.FC<IndicatorsSubPanelProps> = ({
  indicators,
  onCloseIndicator,
  width,
  data = [],
  hoveredPoint,
  onHoverIndex
}) => {
  const showPanel = indicators.rsi || indicators.macd;
  if (!showPanel) return null;

  const count = data.length;
  const activePoint = hoveredPoint || (count > 0 ? data[count - 1] : null);

  // SVG coordinate helpers
  const svgWidth = 1000;
  const svgHeight = 70;

  // Compute X coordinate for a point index
  const getX = (i: number) => {
    if (count <= 1) return svgWidth / 2;
    return (i / (count - 1)) * svgWidth;
  };

  // --- RSI Calculation & SVG Path ---
  const rsiPath = React.useMemo(() => {
    if (count < 2) return "M 0,35 L 1000,35";
    return data
      .map((d, i) => {
        const x = getX(i);
        const y = Math.max(2, Math.min(68, svgHeight - (d.rsi / 100) * svgHeight));
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, count]);

  // Hovered X position
  const hoveredIndex = activePoint ? activePoint.index : -1;
  const hoveredX = hoveredIndex >= 0 && count > 1 ? getX(hoveredIndex) : null;
  const hoveredRsiY = activePoint
    ? Math.max(2, Math.min(68, svgHeight - (activePoint.rsi / 100) * svgHeight))
    : null;

  // --- MACD Calculation & SVG Paths ---
  const { macdPath, signalPath, maxAbs } = React.useMemo(() => {
    if (count < 2) {
      return { macdPath: "M 0,35 L 1000,35", signalPath: "M 0,35 L 1000,35", maxAbs: 10 };
    }
    let maxVal = 0.5;
    data.forEach((d) => {
      maxVal = Math.max(maxVal, Math.abs(d.macd), Math.abs(d.macdSignal), Math.abs(d.macdHist));
    });

    const scale = 28 / maxVal;
    const mPath = data
      .map((d, i) => {
        const x = getX(i);
        const y = Math.max(3, Math.min(67, 35 - d.macd * scale));
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const sPath = data
      .map((d, i) => {
        const x = getX(i);
        const y = Math.max(3, Math.min(67, 35 - d.macdSignal * scale));
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return { macdPath: mPath, signalPath: sPath, maxAbs: maxVal };
  }, [data, count]);

  const macdScale = 28 / maxAbs;
  const hoveredMacdY = activePoint
    ? Math.max(3, Math.min(67, 35 - activePoint.macd * macdScale))
    : null;
  const hoveredSignalY = activePoint
    ? Math.max(3, Math.min(67, 35 - activePoint.macdSignal * macdScale))
    : null;

  // Handle direct mouse move over SVG to inspect
  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onHoverIndex || count <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clientX / rect.width));
    const idx = Math.round(pct * (count - 1));
    onHoverIndex(idx);
  };

  const handleSvgMouseLeave = () => {
    if (onHoverIndex) onHoverIndex(null);
  };

  return (
    <div className="flex flex-col border-t border-white/[0.08] bg-[#0C100F] shrink-0 font-mono select-none">
      {/* RSI Sub-Panel */}
      {indicators.rsi && (
        <div className="h-28 border-b border-white/[0.06] p-2 flex flex-col relative bg-[#111614]">
          <div className="flex items-center justify-between text-[11px] text-[#A7ADA8] shrink-0 mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-[#F2F0E8]">RSI (14, Close)</span>
              <span className="text-[#F2F0E8] font-bold bg-[#0C100F] px-1.5 py-0.5 rounded border border-white/[0.08] tabular-nums">
                {activePoint ? activePoint.rsi.toFixed(2) : "62.40"}
              </span>
              {activePoint && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                    activePoint.rsi >= 70
                      ? "text-[#C45D62] bg-[#C45D62]/10 border-[#C45D62]/30"
                      : activePoint.rsi <= 30
                      ? "text-[#42A77A] bg-[#42A77A]/10 border-[#42A77A]/30"
                      : activePoint.rsi >= 50
                      ? "text-[#42A77A] bg-[#42A77A]/5 border-[#42A77A]/20"
                      : "text-[#C8A96B] bg-[#C8A96B]/5 border-[#C8A96B]/20"
                  }`}
                >
                  {activePoint.rsi >= 70
                    ? "Overbought Zone"
                    : activePoint.rsi <= 30
                    ? "Oversold Opportunity"
                    : activePoint.rsi >= 50
                    ? "Bullish Momentum"
                    : "Bearish Pressure"}
                </span>
              )}
              {hoveredPoint && (
                <span className="text-[10px] text-[#68716C] border-l border-white/[0.08] pl-2 hidden sm:inline">
                  Candle: {hoveredPoint.dateStr}
                </span>
              )}
            </div>
            <button
              onClick={() => onCloseIndicator("rsi")}
              className="text-[#68716C] hover:text-[#C45D62] p-0.5 transition-colors"
              title="Close RSI"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* RSI SVG Curve & Levels */}
          <div className="flex-1 w-full relative">
            <svg
              className="w-full h-full cursor-crosshair"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
            >
              <defs>
                <linearGradient id="rsiZone" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#42A77A" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#42A77A" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Overbought 70 level */}
              <line
                x1="0"
                y1="21"
                x2={svgWidth}
                y2="21"
                stroke="#C45D62"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              <text x={svgWidth - 36} y="18" fill="#C45D62" fontSize="9" fontFamily="monospace">
                70 OB
              </text>

              {/* 50 Centerline */}
              <line
                x1="0"
                y1="35"
                x2={svgWidth}
                y2="35"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                strokeDasharray="2,4"
              />

              {/* Oversold 30 level */}
              <line
                x1="0"
                y1="49"
                x2={svgWidth}
                y2="49"
                stroke="#42A77A"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              <text x={svgWidth - 36} y="58" fill="#42A77A" fontSize="9" fontFamily="monospace">
                30 OS
              </text>

              {/* RSI fill zone between 30 and 70 */}
              <rect x="0" y="21" width={svgWidth} height="28" fill="url(#rsiZone)" />

              {/* Real Computed RSI Curve */}
              <path d={rsiPath} fill="none" stroke="#42A77A" strokeWidth="2" />

              {/* Hover Crosshair & Dot */}
              {hoveredX !== null && hoveredRsiY !== null && (
                <>
                  <line
                    x1={hoveredX}
                    y1="0"
                    x2={hoveredX}
                    y2={svgHeight}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <circle
                    cx={hoveredX}
                    cy={hoveredRsiY}
                    r="4"
                    fill="#42A77A"
                    stroke="#F2F0E8"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* MACD Sub-Panel */}
      {indicators.macd && (
        <div className="h-28 p-2 flex flex-col relative bg-[#111614]">
          <div className="flex items-center justify-between text-[11px] text-[#A7ADA8] shrink-0 mb-1">
            <div className="flex items-center space-x-2 tabular-nums">
              <span className="font-semibold text-[#F2F0E8]">MACD (12, 26, 9)</span>
              <span
                className={`font-medium ${
                  (activePoint?.macd ?? 0) >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"
                }`}
              >
                MACD: {activePoint ? (activePoint.macd >= 0 ? `+${activePoint.macd.toFixed(2)}` : activePoint.macd.toFixed(2)) : "+14.20"}
              </span>
              <span className="text-[#C8A96B] font-medium">
                Signal: {activePoint ? (activePoint.macdSignal >= 0 ? `+${activePoint.macdSignal.toFixed(2)}` : activePoint.macdSignal.toFixed(2)) : "+9.80"}
              </span>
              <span
                className={`font-medium ${
                  (activePoint?.macdHist ?? 0) >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"
                }`}
              >
                Hist: {activePoint ? (activePoint.macdHist >= 0 ? `+${activePoint.macdHist.toFixed(2)}` : activePoint.macdHist.toFixed(2)) : "+4.40"}
              </span>
              {activePoint && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded border font-sans uppercase font-bold ${
                    activePoint.macdStatus === "BULLISH_CROSSOVER"
                      ? "text-[#42A77A] bg-[#42A77A]/15 border-[#42A77A]/40"
                      : activePoint.macdStatus === "BEARISH_CROSSOVER"
                      ? "text-[#C45D62] bg-[#C45D62]/15 border-[#C45D62]/40"
                      : activePoint.macdHist >= 0
                      ? "text-[#42A77A] bg-[#42A77A]/5 border-[#42A77A]/20"
                      : "text-[#C45D62] bg-[#C45D62]/5 border-[#C45D62]/20"
                  }`}
                >
                  {activePoint.macdStatus.replace("_", " ")}
                </span>
              )}
            </div>
            <button
              onClick={() => onCloseIndicator("macd")}
              className="text-[#68716C] hover:text-[#C45D62] p-0.5 transition-colors"
              title="Close MACD"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* MACD SVG Histogram & Signal Lines */}
          <div className="flex-1 w-full relative">
            <svg
              className="w-full h-full cursor-crosshair"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="none"
              onMouseMove={handleSvgMouseMove}
              onMouseLeave={handleSvgMouseLeave}
            >
              {/* Zero line */}
              <line
                x1="0"
                y1="35"
                x2={svgWidth}
                y2="35"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />

              {/* Dynamic Histogram bars calculated from real data */}
              {count > 0 ? (
                data.map((d, i) => {
                  const x = getX(i);
                  const barW = Math.max(2, (svgWidth / count) * 0.75);
                  const h = d.macdHist * macdScale;
                  const isHovered = i === hoveredIndex;

                  if (h >= 0) {
                    return (
                      <rect
                        key={i}
                        x={x - barW / 2}
                        y={Math.max(2, 35 - h)}
                        width={barW}
                        height={Math.max(1.5, Math.min(33, h))}
                        fill={isHovered ? "#5eead4" : "#42A77A"}
                        opacity={isHovered ? "1" : "0.85"}
                        rx="1"
                      />
                    );
                  } else {
                    return (
                      <rect
                        key={i}
                        x={x - barW / 2}
                        y={35}
                        width={barW}
                        height={Math.max(1.5, Math.min(33, Math.abs(h)))}
                        fill={isHovered ? "#f87171" : "#C45D62"}
                        opacity={isHovered ? "1" : "0.85"}
                        rx="1"
                      />
                    );
                  }
                })
              ) : (
                /* Static fallback if no data provided yet */
                [
                  { x: 20, h: -8 }, { x: 50, h: -14 }, { x: 80, h: -6 }, { x: 110, h: 4 },
                  { x: 140, h: 10 }, { x: 170, h: 18 }, { x: 200, h: 24 }, { x: 230, h: 20 },
                  { x: 260, h: 15 }, { x: 290, h: 8 }, { x: 320, h: -4 }, { x: 350, h: 6 },
                  { x: 380, h: 14 }, { x: 410, h: 22 }, { x: 440, h: 28 }, { x: 470, h: 24 }
                ].map((bar, i) => (
                  <rect
                    key={i}
                    x={bar.x * 2}
                    y={bar.h >= 0 ? 35 - bar.h : 35}
                    width="14"
                    height={Math.abs(bar.h)}
                    fill={bar.h >= 0 ? "#42A77A" : "#C45D62"}
                    opacity="0.85"
                    rx="1"
                  />
                ))
              )}

              {/* MACD Line (Solid Emerald Green) */}
              <path d={macdPath} fill="none" stroke="#159570" strokeWidth="2" />

              {/* Signal Line (Champagne Dashed) */}
              <path
                d={signalPath}
                fill="none"
                stroke="#C8A96B"
                strokeWidth="1.5"
                strokeDasharray="4,3"
              />

              {/* Hover Crosshair, Bar Highlight, and Dots */}
              {hoveredX !== null && hoveredMacdY !== null && hoveredSignalY !== null && (
                <>
                  <line
                    x1={hoveredX}
                    y1="0"
                    x2={hoveredX}
                    y2={svgHeight}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <circle
                    cx={hoveredX}
                    cy={hoveredMacdY}
                    r="3.5"
                    fill="#159570"
                    stroke="#F2F0E8"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={hoveredX}
                    cy={hoveredSignalY}
                    r="3.5"
                    fill="#C8A96B"
                    stroke="#F2F0E8"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
