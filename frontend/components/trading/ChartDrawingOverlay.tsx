"use client";

import React, { useRef, useEffect, useState } from "react";
import { 
  DrawingToolType, 
  ChartDrawingObject, 
  BrushStroke, 
  PositionToolData, 
  TrendlineData, 
  FibonacciData, 
  RectangleData, 
  RulerData, 
  ChartPatternData, 
  Point,
  PredictionPayload
} from "../../types/trading";

interface ChartDrawingOverlayProps {
  activeTool: DrawingToolType;
  setActiveTool: (tool: DrawingToolType) => void;
  strokeColor: string;
  strokeWidth: number;
  drawings: ChartDrawingObject[];
  setDrawings: React.Dispatch<React.SetStateAction<ChartDrawingObject[]>>;
  currentSpotPrice: number;
  prediction: PredictionPayload | null;
  width: number;
  height: number;
}

export const ChartDrawingOverlay: React.FC<ChartDrawingOverlayProps> = ({
  activeTool,
  setActiveTool,
  strokeColor,
  strokeWidth,
  drawings,
  setDrawings,
  currentSpotPrice,
  prediction,
  width,
  height
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [draggedPositionId, setDraggedPositionId] = useState<string | null>(null);
  const [dragHandle, setDragHandle] = useState<"ENTRY" | "TARGET" | "STOP_LOSS" | "MOVE" | null>(null);

  // Redraw canvas on drawings update or size update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw all brush strokes
    drawings.forEach((item) => {
      if (item.type === "BRUSH") {
        const stroke = item as BrushStroke;
        if (stroke.points.length < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          const xc = (stroke.points[i].x + stroke.points[i - 1].x) / 2;
          const yc = (stroke.points[i].y + stroke.points[i - 1].y) / 2;
          ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
        }
        ctx.stroke();
      }
    });

    // Draw current active brush stroke
    if (activeTool === "BRUSH" && isDrawing && currentPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      for (let i = 1; i < currentPoints.length; i++) {
        const xc = (currentPoints[i].x + currentPoints[i - 1].x) / 2;
        const yc = (currentPoints[i].y + currentPoints[i - 1].y) / 2;
        ctx.quadraticCurveTo(currentPoints[i - 1].x, currentPoints[i - 1].y, xc, yc);
      }
      ctx.stroke();
    }
  }, [drawings, currentPoints, isDrawing, width, height, activeTool, strokeColor, strokeWidth]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>): Point => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === "CURSOR") return;
    const pt = getCanvasCoords(e);
    setIsDrawing(true);

    if (activeTool === "BRUSH") {
      setCurrentPoints([pt]);
    } else if (activeTool === "SHORT_POSITION" || activeTool === "LONG_POSITION") {
      const isShort = activeTool === "SHORT_POSITION";
      const entry = currentSpotPrice || 1000;
      const target = isShort ? entry * 0.94 : entry * 1.06;
      const stopLoss = isShort ? entry * 1.02 : entry * 0.98;
      const risk = Math.abs(entry - stopLoss);
      const reward = Math.abs(target - entry);
      const rr = reward > 0 && risk > 0 ? Number((reward / risk).toFixed(2)) : 2.0;

      const newPos: PositionToolData = {
        id: `pos-${Date.now()}`,
        type: activeTool,
        entryPrice: Number(entry.toFixed(2)),
        targetPrice: Number(target.toFixed(2)),
        stopLossPrice: Number(stopLoss.toFixed(2)),
        quantity: 50,
        x: pt.x,
        y: pt.y,
        width: 220,
        riskAmount: Number((risk * 50).toFixed(2)),
        rewardAmount: Number((reward * 50).toFixed(2)),
        riskRewardRatio: rr,
        targetPct: Number(((Math.abs(target - entry) / entry) * 100).toFixed(2)),
        stopLossPct: Number(((Math.abs(stopLoss - entry) / entry) * 100).toFixed(2))
      };

      setDrawings((prev) => [...prev, newPos]);
      setIsDrawing(false);
      setActiveTool("CURSOR");
    } else if (activeTool.startsWith("PATTERN_")) {
      createPatternTemplate(activeTool as ChartPatternData["type"], pt);
      setIsDrawing(false);
      setActiveTool("CURSOR");
    } else {
      setCurrentPoints([pt]);
    }
  };

  const createPatternTemplate = (patternType: ChartPatternData["type"], startPt: Point) => {
    const px = startPt.x;
    const py = startPt.y;
    let points: Point[] = [];
    let name = "Double Bottom";
    let breakoutType: "BULLISH" | "BEARISH" = "BULLISH";
    let color = "#10b981";

    if (patternType === "PATTERN_DOUBLE_BOTTOM") {
      name = "Double Bottom (W)";
      breakoutType = "BULLISH";
      color = "#10b981";
      points = [
        { x: px - 80, y: py - 40 },
        { x: px - 40, y: py + 30 },
        { x: px, y: py - 10 },
        { x: px + 40, y: py + 28 },
        { x: px + 80, y: py - 40 },
        { x: px + 120, y: py - 70 }
      ];
    } else if (patternType === "PATTERN_DOUBLE_TOP") {
      name = "Double Top (M)";
      breakoutType = "BEARISH";
      color = "#f43f5e";
      points = [
        { x: px - 80, y: py + 40 },
        { x: px - 40, y: py - 30 },
        { x: px, y: py + 10 },
        { x: px + 40, y: py - 28 },
        { x: px + 80, y: py + 40 },
        { x: px + 120, y: py + 70 }
      ];
    } else if (patternType === "PATTERN_HEAD_AND_SHOULDERS") {
      name = "Head & Shoulders";
      breakoutType = "BEARISH";
      color = "#f43f5e";
      points = [
        { x: px - 90, y: py + 20 },
        { x: px - 60, y: py - 20 }, // Left shoulder
        { x: px - 30, y: py + 15 },
        { x: px, y: py - 50 }, // Head
        { x: px + 30, y: py + 15 },
        { x: px + 60, y: py - 20 }, // Right shoulder
        { x: px + 90, y: py + 20 }, // Neckline breakout
        { x: px + 120, y: py + 60 }
      ];
    } else if (patternType === "PATTERN_BULL_FLAG") {
      name = "Bull Flag Channel";
      breakoutType = "BULLISH";
      color = "#06b6d4";
      points = [
        { x: px - 80, y: py + 60 },
        { x: px - 40, y: py - 40 }, // Flagpole
        { x: px - 10, y: py - 20 },
        { x: px + 20, y: py - 45 },
        { x: px + 50, y: py - 25 },
        { x: px + 90, y: py - 80 } // Breakout
      ];
    } else if (patternType === "PATTERN_ASCENDING_TRIANGLE") {
      name = "Ascending Triangle";
      breakoutType = "BULLISH";
      color = "#f59e0b";
      points = [
        { x: px - 80, y: py + 40 },
        { x: px - 50, y: py - 20 },
        { x: px - 20, y: py + 20 },
        { x: px + 10, y: py - 20 },
        { x: px + 40, y: py + 5 },
        { x: px + 70, y: py - 20 },
        { x: px + 110, y: py - 60 }
      ];
    }

    const newPattern: ChartPatternData = {
      id: `pat-${Date.now()}`,
      type: patternType,
      name,
      points,
      necklinePrice: Number(currentSpotPrice.toFixed(2)),
      targetPrice: Number((currentSpotPrice * (breakoutType === "BULLISH" ? 1.05 : 0.95)).toFixed(2)),
      breakoutType,
      color
    };

    setDrawings((prev) => [...prev, newPattern]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getCanvasCoords(e);

    if (isDrawing) {
      if (activeTool === "BRUSH") {
        setCurrentPoints((prev) => [...prev, pt]);
      } else if (currentPoints.length > 0) {
        setCurrentPoints([currentPoints[0], pt]);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === "BRUSH" && currentPoints.length > 1) {
      const stroke: BrushStroke = {
        id: `brush-${Date.now()}`,
        type: "BRUSH",
        points: currentPoints,
        color: strokeColor,
        width: strokeWidth
      };
      setDrawings((prev) => [...prev, stroke]);
    } else if (activeTool === "TRENDLINE" || activeTool === "HORIZONTAL_RAY") {
      if (currentPoints.length >= 2) {
        const trendline: TrendlineData = {
          id: `line-${Date.now()}`,
          type: activeTool,
          start: currentPoints[0],
          end: currentPoints[1],
          color: strokeColor,
          width: strokeWidth,
          isRay: activeTool === "HORIZONTAL_RAY"
        };
        setDrawings((prev) => [...prev, trendline]);
        setActiveTool("CURSOR");
      }
    } else if (activeTool === "FIBONACCI" && currentPoints.length >= 2) {
      const p1 = currentPoints[0];
      const p2 = currentPoints[1];
      const diffY = p2.y - p1.y;
      const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618];
      const colors = ["#64748b", "#38bdf8", "#34d399", "#fbbf24", "#f59e0b", "#a855f7", "#ec4899", "#f43f5e"];

      const fib: FibonacciData = {
        id: `fib-${Date.now()}`,
        type: "FIBONACCI",
        start: p1,
        end: p2,
        levels: ratios.map((r, i) => ({
          ratio: r,
          price: Number((currentSpotPrice * (1 + (r - 0.5) * 0.05)).toFixed(2)),
          color: colors[i % colors.length]
        }))
      };
      setDrawings((prev) => [...prev, fib]);
      setActiveTool("CURSOR");
    } else if (activeTool === "RECTANGLE" && currentPoints.length >= 2) {
      const rect: RectangleData = {
        id: `rect-${Date.now()}`,
        type: "RECTANGLE",
        start: currentPoints[0],
        end: currentPoints[1],
        color: strokeColor,
        label: "Demand / Supply Zone"
      };
      setDrawings((prev) => [...prev, rect]);
      setActiveTool("CURSOR");
    } else if (activeTool === "RULER" && currentPoints.length >= 2) {
      const p1 = currentPoints[0];
      const p2 = currentPoints[1];
      const dy = p1.y - p2.y;
      const dx = Math.abs(p2.x - p1.x);
      const deltaPrice = Number((dy * 1.5).toFixed(2));
      const pct = Number(((deltaPrice / currentSpotPrice) * 100).toFixed(2));
      const bars = Math.max(1, Math.round(dx / 10));

      const ruler: RulerData = {
        id: `ruler-${Date.now()}`,
        type: "RULER",
        start: p1,
        end: p2,
        priceDelta: deltaPrice,
        pctChange: pct,
        barsCount: bars
      };
      setDrawings((prev) => [...prev, ruler]);
      setActiveTool("CURSOR");
    }

    setCurrentPoints([]);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`absolute inset-0 pointer-events-auto ${
        activeTool === "BRUSH" ? "cursor-crosshair" : activeTool !== "CURSOR" ? "cursor-crosshair" : "cursor-default"
      }`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Canvas Layer for smooth brush rendering */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0 pointer-events-none"
      />

      {/* SVG Layer for vector objects, patterns, short position boxes, and prediction curves */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
        <defs>
          <linearGradient id="bullishGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="goalGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="confidenceCone" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Render Non-Brush Drawing Objects */}
        {drawings.map((item) => {
          if (item.type === "SHORT_POSITION" || item.type === "LONG_POSITION") {
            const pos = item as PositionToolData;
            const isShort = pos.type === "SHORT_POSITION";
            const boxHeight = 120;
            const targetHeight = isShort ? 75 : 75;
            const stopHeight = isShort ? 45 : 45;

            return (
              <g key={pos.id} transform={`translate(${pos.x}, ${pos.y})`} className="pointer-events-auto cursor-move">
                {/* Target Zone (Green) */}
                <rect
                  x={0}
                  y={isShort ? 0 : -targetHeight}
                  width={pos.width}
                  height={targetHeight}
                  fill="#10b981"
                  fillOpacity="0.25"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray={isShort ? "none" : "none"}
                  rx="3"
                />

                {/* Stop Loss Zone (Red) */}
                <rect
                  x={0}
                  y={isShort ? -stopHeight : 0}
                  width={pos.width}
                  height={stopHeight}
                  fill="#f43f5e"
                  fillOpacity="0.25"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  rx="3"
                />

                {/* Entry Center Line */}
                <line
                  x1={0}
                  y1={0}
                  x2={pos.width}
                  y2={0}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                />

                {/* Info Text Overlay */}
                <rect
                  x={pos.width - 105}
                  y={-24}
                  width={100}
                  height={20}
                  fill="#0f172a"
                  fillOpacity="0.9"
                  stroke="#334155"
                  rx="4"
                />
                <text x={pos.width - 95} y={-10} fill="#f8fafc" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  R:R = 1 : {pos.riskRewardRatio}
                </text>

                {/* Target Label */}
                <text x={8} y={isShort ? targetHeight - 8 : -targetHeight + 14} fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Target: ₹{pos.targetPrice} (+{pos.targetPct}%)
                </text>

                {/* Stop Loss Label */}
                <text x={8} y={isShort ? -stopHeight + 14 : stopHeight - 8} fill="#fb7185" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Stop: ₹{pos.stopLossPrice} (-{pos.stopLossPct}%)
                </text>

                {/* Entry Price Label */}
                <text x={8} y={-4} fill="#7dd3fc" fontSize="9" fontFamily="monospace" fontWeight="bold">
                  Entry: ₹{pos.entryPrice} ({isShort ? "SHORT" : "LONG"})
                </text>
              </g>
            );
          }

          if (item.type === "TRENDLINE" || item.type === "HORIZONTAL_RAY") {
            const line = item as TrendlineData;
            return (
              <g key={line.id}>
                <line
                  x1={line.start.x}
                  y1={line.start.y}
                  x2={line.isRay ? width : line.end.x}
                  y2={line.isRay ? line.start.y : line.end.y}
                  stroke={line.color}
                  strokeWidth={line.width}
                />
                <circle cx={line.start.x} cy={line.start.y} r="3.5" fill={line.color} />
                <circle cx={line.isRay ? width - 10 : line.end.x} cy={line.isRay ? line.start.y : line.end.y} r="3.5" fill={line.color} />
              </g>
            );
          }

          if (item.type === "FIBONACCI") {
            const fib = item as FibonacciData;
            const dy = fib.end.y - fib.start.y;
            return (
              <g key={fib.id}>
                {fib.levels.map((lvl) => {
                  const yPos = fib.start.y + dy * lvl.ratio;
                  return (
                    <g key={lvl.ratio}>
                      <line
                        x1={Math.min(fib.start.x, fib.end.x) - 40}
                        y1={yPos}
                        x2={Math.max(fib.start.x, fib.end.x) + 120}
                        y2={yPos}
                        stroke={lvl.color}
                        strokeWidth="1.5"
                        strokeDasharray={lvl.ratio === 0.618 ? "none" : "3,3"}
                      />
                      <text
                        x={Math.max(fib.start.x, fib.end.x) + 125}
                        y={yPos + 3}
                        fill={lvl.color}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {lvl.ratio} (₹{lvl.price}) {lvl.ratio === 0.618 ? "★ GOLDEN" : ""}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          }

          if (item.type === "RECTANGLE") {
            const rect = item as RectangleData;
            const rx = Math.min(rect.start.x, rect.end.x);
            const ry = Math.min(rect.start.y, rect.end.y);
            const rw = Math.abs(rect.end.x - rect.start.x);
            const rh = Math.abs(rect.end.y - rect.start.y);

            return (
              <g key={rect.id}>
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={rect.color}
                  fillOpacity="0.18"
                  stroke={rect.color}
                  strokeWidth="1.5"
                  rx="4"
                />
                <text x={rx + 8} y={ry + 16} fill={rect.color} fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {rect.label || "Demand Zone"}
                </text>
              </g>
            );
          }

          if (item.type === "RULER") {
            const ruler = item as RulerData;
            const isUp = ruler.pctChange >= 0;
            return (
              <g key={ruler.id}>
                <line
                  x1={ruler.start.x}
                  y1={ruler.start.y}
                  x2={ruler.end.x}
                  y2={ruler.end.y}
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
                <rect
                  x={(ruler.start.x + ruler.end.x) / 2 - 60}
                  y={(ruler.start.y + ruler.end.y) / 2 - 25}
                  width={120}
                  height={34}
                  fill="#090d16"
                  fillOpacity="0.9"
                  stroke="#1e293b"
                  rx="6"
                />
                <text
                  x={(ruler.start.x + ruler.end.x) / 2}
                  y={(ruler.start.y + ruler.end.y) / 2 - 10}
                  fill={isUp ? "#34d399" : "#fb7185"}
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {isUp ? "+" : ""}₹{ruler.priceDelta} ({isUp ? "+" : ""}{ruler.pctChange}%)
                </text>
                <text
                  x={(ruler.start.x + ruler.end.x) / 2}
                  y={(ruler.start.y + ruler.end.y) / 2 + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {ruler.barsCount} Bars Duration
                </text>
              </g>
            );
          }

          if (item.type.startsWith("PATTERN_")) {
            const pat = item as ChartPatternData;
            if (pat.points.length < 2) return null;

            const pathD = pat.points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");

            return (
              <g key={pat.id}>
                <path d={pathD} fill="none" stroke={pat.color} strokeWidth="2.5" strokeLinejoin="round" />
                {pat.points.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="4" fill={pat.color} />
                ))}
                {/* Target Projection line */}
                <line
                  x1={pat.points[pat.points.length - 2].x}
                  y1={pat.points[pat.points.length - 2].y}
                  x2={pat.points[pat.points.length - 1].x}
                  y2={pat.points[pat.points.length - 1].y}
                  stroke={pat.color}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
                <rect
                  x={pat.points[0].x - 10}
                  y={pat.points[0].y - 28}
                  width={140}
                  height={22}
                  fill="#0a0f1d"
                  stroke={pat.color}
                  strokeWidth="1"
                  rx="4"
                />
                <text x={pat.points[0].x - 4} y={pat.points[0].y - 14} fill={pat.color} fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {pat.name} Breakout
                </text>
              </g>
            );
          }

          return null;
        })}

        {/* AI Goal Prediction & Multi-Scenario "Life Graph" Future Projection Overlay */}
        {prediction && prediction.appliedToChart && (
          <g className="transition-all duration-500">
            {/* Cone of Uncertainty / Confidence Band */}
            {prediction.trajectoryPoints.length > 2 && (
              <path
                d={`
                  M ${width - 320} ${height * 0.5}
                  ${prediction.trajectoryPoints.map((pt, i) => `L ${width - 320 + i * 32} ${height * 0.5 - (pt.upperConfidence95 - prediction.currentPrice) * 1.8}`).join(" ")}
                  ${prediction.trajectoryPoints.slice().reverse().map((pt, i) => `L ${width - 320 + (prediction.trajectoryPoints.length - 1 - i) * 32} ${height * 0.5 - (pt.lowerConfidence95 - prediction.currentPrice) * 1.8}`).join(" ")}
                  Z
                `}
                fill="url(#confidenceCone)"
              />
            )}

            {/* Goal-Matched Optimal Trajectory (Yellow/Gold Glowing Path) */}
            <path
              d={`M ${width - 320} ${height * 0.5} ${prediction.trajectoryPoints.map((pt, i) => `L ${width - 320 + i * 32} ${height * 0.5 - (pt.goalPathPrice - prediction.currentPrice) * 1.8}`).join(" ")}`}
              fill="none"
              stroke="url(#goalGradient)"
              strokeWidth="3"
              strokeDasharray="6,4"
            />

            {/* GNN AI Baseline Trajectory (Cyan Path) */}
            <path
              d={`M ${width - 320} ${height * 0.5} ${prediction.trajectoryPoints.map((pt, i) => `L ${width - 320 + i * 32} ${height * 0.5 - (pt.basePrice - prediction.currentPrice) * 1.8}`).join(" ")}`}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />

            {/* Bullish Target Trajectory (Emerald Path) */}
            <path
              d={`M ${width - 320} ${height * 0.5} ${prediction.trajectoryPoints.map((pt, i) => `L ${width - 320 + i * 32} ${height * 0.5 - (pt.bullishPrice - prediction.currentPrice) * 1.8}`).join(" ")}`}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="3,3"
            />

            {/* Goal Milestone Target Badge */}
            {prediction.milestones.length > 0 && (
              <g transform={`translate(${width - 320 + (prediction.trajectoryPoints.length - 1) * 32}, ${height * 0.5 - (prediction.targetPrice - prediction.currentPrice) * 1.8 - 30})`}>
                <rect x="-10" y="-10" width="130" height="34" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" rx="6" />
                <text x="55" y="6" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  ★ GOAL TARGET: ₹{prediction.targetPrice}
                </text>
                <text x="55" y="18" fill="#34d399" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  Feasibility: {prediction.feasibilityScore}%
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};
