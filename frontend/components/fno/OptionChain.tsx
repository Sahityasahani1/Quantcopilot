"use client";

import React, { useEffect, useState, useMemo } from "react";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { OptionStrike } from "../../types";
import { Info, HelpCircle, ArrowUpRight, ArrowDownRight, Layers, Zap } from "lucide-react";

interface OptionChainProps {
  onSelectContract: (symbol: string) => void;
}

const getUpcomingExpiries = () => {
  const expiries: { value: string; label: string }[] = [];
  const now = new Date();
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  
  const d = new Date(now);
  const day = d.getDay();
  const diffToThursday = (4 - day + 7) % 7;
  d.setDate(d.getDate() + (diffToThursday === 0 && d.getHours() >= 16 ? 7 : diffToThursday));
  
  for (let i = 0; i < 4; i++) {
    const cur = new Date(d);
    cur.setDate(cur.getDate() + (i * 7));
    const dayStr = String(cur.getDate()).padStart(2, "0");
    const monStr = months[cur.getMonth()];
    const yrStr = cur.getFullYear();
    const val = `${dayStr}-${monStr}-${yrStr}`;
    const isMonthly = (i === 3);
    expiries.push({
      value: val,
      label: `${val} (${isMonthly ? "Monthly" : "Weekly"})`
    });
  }
  return expiries;
};

export const OptionChain: React.FC<OptionChainProps> = React.memo(({ onSelectContract }) => {
  const { selectedFnoSymbol, fnoOptionChain, fetchFnoChain } = usePortfolioStore();
  const expiryList = useMemo(() => getUpcomingExpiries(), []);
  const [expiry, setExpiry] = useState(expiryList[0]?.value || "28-AUG-2026");
  const [strikeFilter, setStrikeFilter] = useState<"ALL" | "NEAR_ATM" | "GREEKS">("NEAR_ATM");
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  useEffect(() => {
    fetchFnoChain(selectedFnoSymbol, expiry);
  }, [selectedFnoSymbol, expiry, fetchFnoChain]);

  const spot = fnoOptionChain?.spot_price || 24144.10;
  const pcr = fnoOptionChain?.pcr_ratio || 1.15;
  const maxPain = fnoOptionChain?.max_pain_strike || 24150.0;
  const totalCalls = fnoOptionChain?.total_call_oi || 450000;
  const totalPuts = fnoOptionChain?.total_put_oi || 520000;
  const rawStrikes: OptionStrike[] = fnoOptionChain?.strikes || [];

  // Determine Max OI strikes for Support and Resistance badges
  const { maxCallOIStrike, maxPutOIStrike, maxSingleOI } = useMemo(() => {
    let maxCall = 0;
    let callStrike = 0;
    let maxPut = 0;
    let putStrike = 0;
    let maxSingle = 1;

    for (const s of rawStrikes) {
      if (s.call_oi > maxCall) {
        maxCall = s.call_oi;
        callStrike = s.strike_price;
      }
      if (s.put_oi > maxPut) {
        maxPut = s.put_oi;
        putStrike = s.strike_price;
      }
      if (s.call_oi > maxSingle) maxSingle = s.call_oi;
      if (s.put_oi > maxSingle) maxSingle = s.put_oi;
    }

    return { maxCallOIStrike: callStrike, maxPutOIStrike: putStrike, maxSingleOI: maxSingle };
  }, [rawStrikes]);

  // Find ATM strike closest to spot
  const atmStrike = useMemo(() => {
    if (!rawStrikes.length) return spot;
    return rawStrikes.reduce((prev, curr) => 
      Math.abs(curr.strike_price - spot) < Math.abs(prev.strike_price - spot) ? curr : prev
    ).strike_price;
  }, [rawStrikes, spot]);

  // Filter strikes according to selected view filter
  const visibleStrikes = useMemo(() => {
    if (strikeFilter === "ALL") return rawStrikes;
    const atmIdx = rawStrikes.findIndex(s => s.strike_price === atmStrike);
    if (atmIdx === -1) return rawStrikes;
    const range = 8;
    const start = Math.max(0, atmIdx - range);
    const end = Math.min(rawStrikes.length, atmIdx + range + 1);
    return rawStrikes.slice(start, end);
  }, [rawStrikes, strikeFilter, atmStrike]);

  const totalOI = (totalCalls + totalPuts) || 1;
  const callOIPct = Math.round((totalCalls / totalOI) * 100);
  const putOIPct = 100 - callOIPct;

  return (
    <div className="flex flex-col h-full w-full bg-[#080A09] text-[11px] font-mono select-none overflow-hidden border-t border-white/[0.065]">
      {/* Top Institutional Header & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-2 bg-[#0C100F] border-b border-white/[0.065] gap-3 shrink-0">
        {/* Left: Contract Symbol, Expiry, Spot */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-xs tracking-wider text-[#F2F0E8] uppercase">
              {selectedFnoSymbol}
            </span>
            <span className="px-1.5 py-0.5 rounded-xs text-[9px] font-bold tracking-tight bg-[#C8A96B]/15 text-[#C8A96B] border border-[#C8A96B]/30 font-sans">
              F&amp;O MATRIX
            </span>
          </div>

          <div className="flex items-center space-x-1.5 bg-[#111614] border border-white/[0.065] rounded-xs px-2 py-0.5 text-[10px]">
            <span className="text-[#68716C] uppercase font-sans">SPOT:</span>
            <span className="font-semibold text-[#F2F0E8] font-mono-numbers">
              ₹{spot.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] text-[#A7ADA8] font-mono-numbers">
              (ATM {atmStrike})
            </span>
          </div>

          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="bg-[#161C19] border border-white/[0.08] hover:border-white/[0.15] text-[#F2F0E8] rounded-xs px-2 py-1 text-[10px] outline-none transition-colors cursor-pointer"
          >
            {expiryList.map((item) => (
              <option key={item.value} value={item.value} className="bg-[#111614] text-[#F2F0E8]">
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Open Interest Ratio Gauge */}
        <div className="hidden lg:flex items-center space-x-3 bg-[#111614] border border-white/[0.065] rounded-xs px-3 py-1">
          <div className="flex flex-col items-center">
            <div className="flex justify-between w-40 text-[9px] text-[#A7ADA8] mb-0.5">
              <span className="text-[#42A77A] font-semibold">CE {callOIPct}%</span>
              <span className="text-[#68716C] font-sans">OI RATIO</span>
              <span className="text-[#C45D62] font-semibold">PE {putOIPct}%</span>
            </div>
            <div className="w-40 h-1.5 bg-[#161C19] rounded-xs overflow-hidden flex">
              <div style={{ width: `${callOIPct}%` }} className="bg-[#42A77A] h-full" />
              <div style={{ width: `${putOIPct}%` }} className="bg-[#C45D62] h-full" />
            </div>
          </div>
        </div>

        {/* Right: Key Quantitative Indices & Filter Pills */}
        <div className="flex items-center space-x-4">
          {/* PCR */}
          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-[#68716C] font-sans uppercase">PCR:</span>
            <span className={`font-semibold font-mono-numbers px-1.5 py-0.5 rounded-xs ${
              pcr >= 1.0 
                ? "bg-[#42A77A]/12 text-[#42A77A] border border-[#42A77A]/25" 
                : "bg-[#C45D62]/12 text-[#C45D62] border border-[#C45D62]/25"
            }`}>
              {pcr.toFixed(2)}
            </span>
            <span className="text-[9px] text-[#A7ADA8] font-sans hidden sm:inline">
              {pcr >= 1.2 ? "Strong Bullish" : pcr >= 1.0 ? "Moderate Put Bias" : "Bearish Call Bias"}
            </span>
          </div>

          {/* Max Pain */}
          <div className="flex items-center space-x-1.5 text-[10px]">
            <span className="text-[#68716C] font-sans uppercase">MAX PAIN:</span>
            <span className="font-semibold text-[#C8A96B] font-mono-numbers">
              ₹{maxPain.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Filter Segmented Control */}
          <div className="flex items-center bg-[#111614] border border-white/[0.065] rounded-xs p-0.5 text-[9px] font-sans">
            <button
              onClick={() => setStrikeFilter("NEAR_ATM")}
              className={`px-2 py-0.5 rounded-xs transition-colors font-medium ${
                strikeFilter === "NEAR_ATM"
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              ±8 ATM
            </button>
            <button
              onClick={() => setStrikeFilter("ALL")}
              className={`px-2 py-0.5 rounded-xs transition-colors font-medium ${
                strikeFilter === "ALL"
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              All Strikes
            </button>
            <button
              onClick={() => setStrikeFilter("GREEKS")}
              className={`px-2 py-0.5 rounded-xs transition-colors font-medium ${
                strikeFilter === "GREEKS"
                  ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]"
                  : "text-[#68716C] hover:text-[#A7ADA8]"
              }`}
            >
              Greeks Precision
            </button>
          </div>
        </div>
      </div>

      {/* Main High-Density Split Options Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-center border-collapse">
          {/* Grouping Headers */}
          <thead className="sticky top-0 bg-[#0C100F] text-[10px] text-[#A7ADA8] border-b border-white/[0.065] z-20">
            <tr>
              <th colSpan={strikeFilter === "GREEKS" ? 6 : 6} className="py-1 bg-[#42A77A]/[0.08] text-[#42A77A] border-r border-white/[0.065] font-semibold tracking-wider font-sans">
                CALL OPTIONS (CE) &bull; BULLISH DERIVATIVE
              </th>
              <th className="py-1 bg-[#161C19] text-[#C8A96B] font-bold tracking-wider border-x border-white/[0.065] min-w-[90px] font-sans">
                STRIKE (₹)
              </th>
              <th colSpan={strikeFilter === "GREEKS" ? 6 : 6} className="py-1 bg-[#C45D62]/[0.08] text-[#C45D62] border-l border-white/[0.065] font-semibold tracking-wider font-sans">
                PUT OPTIONS (PE) &bull; BEARISH DERIVATIVE
              </th>
            </tr>
            {/* Column Metric Headers */}
            <tr className="border-b border-white/[0.065] text-[9px] text-[#68716C] font-mono uppercase bg-[#0C100F]">
              {/* Call Columns */}
              <th className="py-1.5 px-2 text-right">OI (L)</th>
              <th className="py-1.5 px-2 text-right">CHG OI</th>
              <th className="py-1.5 px-2 text-right">VOL</th>
              <th className="py-1.5 px-2" title="Implied Volatility">IV%</th>
              <th className="py-1.5 px-2" title="Delta (Δ): Sensitivity of contract price to ₹1 move in spot">
                <span className="flex items-center justify-center gap-0.5">
                  Δ DELTA
                </span>
              </th>
              <th className="py-1.5 px-3 border-r border-white/[0.065] text-[#42A77A] font-semibold text-right">
                LTP (₹)
              </th>

              {/* Center Strike */}
              <th className="py-1.5 px-2 bg-[#161C19] text-[#C8A96B] font-semibold border-x border-white/[0.065]">
                STRIKE
              </th>

              {/* Put Columns */}
              <th className="py-1.5 px-3 border-l border-white/[0.065] text-[#C45D62] font-semibold text-left">
                LTP (₹)
              </th>
              <th className="py-1.5 px-2" title="Delta (Δ): Put sensitivity to spot move">
                <span className="flex items-center justify-center gap-0.5">
                  Δ DELTA
                </span>
              </th>
              <th className="py-1.5 px-2" title="Implied Volatility">IV%</th>
              <th className="py-1.5 px-2 text-left">VOL</th>
              <th className="py-1.5 px-2 text-left">CHG OI</th>
              <th className="py-1.5 px-2 text-left">OI (L)</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/[0.03] text-[11px] font-mono-numbers">
            {visibleStrikes.map((row) => {
              const isATM = row.strike_price === atmStrike;
              const isITMCall = row.strike_price < spot;
              const isITMPut = row.strike_price > spot;
              const isCallMaxOI = row.strike_price === maxCallOIStrike;
              const isPutMaxOI = row.strike_price === maxPutOIStrike;

              // Horizontal depth gauge widths (0% to 100%)
              const callDepthPct = Math.min(100, Math.round((row.call_oi / maxSingleOI) * 100));
              const putDepthPct = Math.min(100, Math.round((row.put_oi / maxSingleOI) * 100));

              return (
                <tr
                  key={row.strike_price}
                  className={`transition-colors group ${
                    isATM 
                      ? "bg-[#161C19] border-y-2 border-[#C8A96B]/50 font-semibold" 
                      : "hover:bg-[#1B2420]"
                  }`}
                >
                  {/* CALLS: OI (with horizontal depth bar behind) */}
                  <td className={`relative py-1.5 px-2 text-right tabular-nums text-[#A7ADA8] ${isITMCall ? "bg-[#42A77A]/[0.06]" : ""}`}>
                    <div 
                      className="absolute inset-y-0 right-0 bg-[#42A77A]/[0.10] pointer-events-none transition-all"
                      style={{ width: `${callDepthPct}%` }}
                    />
                    <span className="relative z-10">
                      {(row.call_oi / 100000).toFixed(2)}L
                    </span>
                    {isCallMaxOI && (
                      <span className="ml-1 relative z-10 px-1 py-0.2 text-[8px] bg-[#C45D62]/20 text-[#C45D62] rounded-xs border border-[#C45D62]/30 uppercase font-sans">
                        RES
                      </span>
                    )}
                  </td>

                  {/* CALLS: CHG OI */}
                  <td className={`py-1.5 px-2 text-right tabular-nums ${row.call_change_oi >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"} ${isITMCall ? "bg-[#42A77A]/[0.06]" : ""}`}>
                    {row.call_change_oi > 0 ? "+" : ""}{row.call_change_oi.toLocaleString("en-IN")}
                  </td>

                  {/* CALLS: Volume */}
                  <td className={`py-1.5 px-2 text-right tabular-nums text-[#68716C] ${isITMCall ? "bg-[#42A77A]/[0.06]" : ""}`}>
                    {(row.call_volume / 1000).toFixed(1)}k
                  </td>

                  {/* CALLS: IV */}
                  <td className={`py-1.5 px-2 tabular-nums text-[#A7ADA8] ${isITMCall ? "bg-[#42A77A]/[0.06]" : ""}`}>
                    {row.call_iv.toFixed(1)}%
                  </td>

                  {/* CALLS: Delta */}
                  <td className={`py-1.5 px-2 tabular-nums ${isITMCall ? "text-[#42A77A] font-semibold bg-[#42A77A]/[0.06]" : "text-[#68716C]"}`}>
                    {row.call_delta > 0 ? `+${row.call_delta.toFixed(2)}` : row.call_delta.toFixed(2)}
                  </td>

                  {/* CALLS: LTP (Click-to-trade trigger) */}
                  <td
                    onClick={() => onSelectContract(`${selectedFnoSymbol} ${row.strike_price} CE`)}
                    className={`py-1.5 px-3 text-right font-semibold cursor-pointer border-r border-white/[0.065] text-[#42A77A] hover:bg-[#42A77A]/20 transition-all ${
                      isITMCall ? "bg-[#42A77A]/[0.12]" : ""
                    }`}
                    title={`Click to analyze ${selectedFnoSymbol} ${row.strike_price} CE`}
                  >
                    <span className="group-hover:underline">
                      ₹{row.call_ltp.toFixed(2)}
                    </span>
                  </td>

                  {/* CENTER: STRIKE (Sticky column in Champagne Gold) */}
                  <td className={`py-1.5 px-2 font-bold bg-[#111614] border-x border-white/[0.065] text-[#C8A96B] tabular-nums ${
                    isATM ? "bg-[#161C19] text-[#F2F0E8]" : ""
                  }`}>
                    <div className="flex items-center justify-center space-x-1">
                      <span>{row.strike_price.toLocaleString("en-IN")}</span>
                      {isATM && (
                        <span className="text-[8px] bg-[#C8A96B] text-[#080A09] font-bold px-1 rounded-xs font-sans tracking-tight">
                          ATM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* PUTS: LTP (Click-to-trade trigger) */}
                  <td
                    onClick={() => onSelectContract(`${selectedFnoSymbol} ${row.strike_price} PE`)}
                    className={`py-1.5 px-3 text-left font-semibold cursor-pointer border-l border-white/[0.065] text-[#C45D62] hover:bg-[#C45D62]/20 transition-all ${
                      isITMPut ? "bg-[#C45D62]/[0.12]" : ""
                    }`}
                    title={`Click to analyze ${selectedFnoSymbol} ${row.strike_price} PE`}
                  >
                    <span className="group-hover:underline">
                      ₹{row.put_ltp.toFixed(2)}
                    </span>
                  </td>

                  {/* PUTS: Delta */}
                  <td className={`py-1.5 px-2 tabular-nums ${isITMPut ? "text-[#C45D62] font-semibold bg-[#C45D62]/[0.06]" : "text-[#68716C]"}`}>
                    {row.put_delta.toFixed(2)}
                  </td>

                  {/* PUTS: IV */}
                  <td className={`py-1.5 px-2 tabular-nums text-[#A7ADA8] ${isITMPut ? "bg-[#C45D62]/[0.06]" : ""}`}>
                    {row.put_iv.toFixed(1)}%
                  </td>

                  {/* PUTS: Volume */}
                  <td className={`py-1.5 px-2 text-left tabular-nums text-[#68716C] ${isITMPut ? "bg-[#C45D62]/[0.06]" : ""}`}>
                    {(row.put_volume / 1000).toFixed(1)}k
                  </td>

                  {/* PUTS: CHG OI */}
                  <td className={`py-1.5 px-2 text-left tabular-nums ${row.put_change_oi >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"} ${isITMPut ? "bg-[#C45D62]/[0.06]" : ""}`}>
                    {row.put_change_oi > 0 ? "+" : ""}{row.put_change_oi.toLocaleString("en-IN")}
                  </td>

                  {/* PUTS: OI (with horizontal depth bar behind) */}
                  <td className={`relative py-1.5 px-2 text-left tabular-nums text-[#A7ADA8] ${isITMPut ? "bg-[#C45D62]/[0.06]" : ""}`}>
                    <div 
                      className="absolute inset-y-0 left-0 bg-[#C45D62]/[0.10] pointer-events-none transition-all"
                      style={{ width: `${putDepthPct}%` }}
                    />
                    <span className="relative z-10">
                      {(row.put_oi / 100000).toFixed(2)}L
                    </span>
                    {isPutMaxOI && (
                      <span className="ml-1 relative z-10 px-1 py-0.2 text-[8px] bg-[#42A77A]/20 text-[#42A77A] rounded-xs border border-[#42A77A]/30 uppercase font-sans">
                        SUPP
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Telemetry & Greek Explanation Strip */}
      <div className="flex flex-wrap items-center justify-between px-3.5 py-1.5 bg-[#0C100F] border-t border-white/[0.065] text-[10px] text-[#68716C] font-sans">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#42A77A]/20 border border-[#42A77A]/40" />
            <span>ITM Calls (In The Money)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#C45D62]/20 border border-[#C45D62]/40" />
            <span>ITM Puts (In The Money)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-xs bg-[#C8A96B]" />
            <span className="text-[#C8A96B]">ATM Strike Anchor</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-[9px] text-[#A7ADA8]">
          <span>TOTAL CE OI: <strong className="text-[#42A77A] font-mono-numbers">{(totalCalls / 100000).toFixed(2)}L</strong></span>
          <span>&bull;</span>
          <span>TOTAL PE OI: <strong className="text-[#C45D62] font-mono-numbers">{(totalPuts / 100000).toFixed(2)}L</strong></span>
          <span>&bull;</span>
          <span className="text-[#68716C]">NSE TICK LATENCY: 12ms</span>
        </div>
      </div>
    </div>
  );
});

OptionChain.displayName = "OptionChain";
