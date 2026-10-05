"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface LiveTickPriceProps {
  value: number | string;
  formatter?: (val: number | string) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
  colorize?: boolean;
  showDirectionIcon?: boolean;
}

export const LiveTickPrice: React.FC<LiveTickPriceProps> = ({
  value,
  formatter,
  className = "",
  prefix = "",
  suffix = "",
  colorize = false,
  showDirectionIcon = false
}) => {
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "idle">("idle");
  const prevValueRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));

  useEffect(() => {
    if (isNaN(numericValue)) return;

    if (prevValueRef.current !== null && prevValueRef.current !== numericValue) {
      if (numericValue > prevValueRef.current) {
        setTickDirection("up");
      } else if (numericValue < prevValueRef.current) {
        setTickDirection("down");
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setTickDirection("idle");
      }, 500);
    }

    prevValueRef.current = numericValue;

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [numericValue]);

  const displayFormatted = formatter
    ? formatter(value)
    : typeof value === "number"
    ? `${prefix}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`
    : `${prefix}${value}${suffix}`;

  const tickAnimClass =
    tickDirection === "up"
      ? "animate-tick-up"
      : tickDirection === "down"
      ? "animate-tick-down"
      : "";

  const colorClass = colorize
    ? numericValue > 0
      ? "text-emerald-400"
      : numericValue < 0
      ? "text-rose-400"
      : "text-slate-300"
    : "";

  return (
    <span
      suppressHydrationWarning
      className={`inline-flex items-center gap-0.5 tabular-nums transition-colors duration-200 ${tickAnimClass} ${colorClass} ${className}`}
    >
      {showDirectionIcon && (
        <>
          {numericValue >= 0 ? (
            <ArrowUpRight className="h-3 w-3 inline text-emerald-400 shrink-0" />
          ) : (
            <ArrowDownRight className="h-3 w-3 inline text-rose-400 shrink-0" />
          )}
        </>
      )}
      <span suppressHydrationWarning>{displayFormatted}</span>
    </span>
  );
};
