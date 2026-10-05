"use client";

import React, { useEffect, useState } from "react";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { OptionStrike } from "../../types";

interface OptionChainProps {
  onSelectContract: (symbol: string) => void;
}

export const OptionChain: React.FC<OptionChainProps> = React.memo(({ onSelectContract }) => {
  const { selectedFnoSymbol, fnoOptionChain, fetchFnoChain } = usePortfolioStore();
  const [expiry, setExpiry] = useState("28-AUG-2026");

  useEffect(() => {
    fetchFnoChain(selectedFnoSymbol, expiry);
  }, [selectedFnoSymbol, expiry, fetchFnoChain]);

  const spot = fnoOptionChain?.spot_price || 24144.10;
  const pcr = fnoOptionChain?.pcr_ratio || 1.15;
  const maxPain = fnoOptionChain?.max_pain_strike || 24150.0;
  const totalCalls = fnoOptionChain?.total_call_oi || 450000;
  const totalPuts = fnoOptionChain?.total_put_oi || 520000;
  const strikes: OptionStrike[] = fnoOptionChain?.strikes || [];

  return (
    <div className="flex flex-col h-full w-full bg-[#0C100F] text-[11px] font-mono select-none overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111614] border-b border-white/[0.065] shrink-0">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-[#F2F0E8] uppercase">OPTION CHAIN ({selectedFnoSymbol})</span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="bg-[#161C19] border border-white/[0.065] text-[#F2F0E8] rounded-sm px-2 py-0.5 text-[10px] outline-none"
          >
            <option value="28-AUG-2026" className="bg-[#161C19]">28-AUG-2026 (Weekly)</option>
            <option value="04-SEP-2026" className="bg-[#161C19]">04-SEP-2026 (Weekly)</option>
            <option value="25-SEP-2026" className="bg-[#161C19]">25-SEP-2026 (Monthly)</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <span className="text-[#68716C]">PCR:</span>
            <span className={`font-semibold ${pcr >= 1 ? "text-[#42A77A]" : "text-[#C45D62]"}`}>{pcr}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[#68716C]">Max Pain:</span>
            <span className="font-semibold text-[#F2F0E8]">₹{maxPain}</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[#68716C]">Call OI:</span>
            <span className="text-[#A7ADA8]">{(totalCalls / 100000).toFixed(2)}L</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-[#68716C]">Put OI:</span>
            <span className="text-[#A7ADA8]">{(totalPuts / 100000).toFixed(2)}L</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-center border-collapse">
          <thead className="sticky top-0 bg-[#0C100F] text-[10px] text-[#A7ADA8] border-b border-white/[0.065] z-10">
            <tr>
              <th colSpan={6} className="py-1 bg-[#159570]/10 text-[#42A77A] border-r border-white/[0.065] font-semibold">CALLS</th>
              <th className="py-1 bg-[#111614] text-[#F2F0E8] font-semibold">STRIKE</th>
              <th colSpan={6} className="py-1 bg-[#C45D62]/10 text-[#C45D62] border-l border-white/[0.065] font-semibold">PUTS</th>
            </tr>
            <tr className="border-b border-white/[0.065] text-[9px] text-[#68716C]">
              <th className="py-1">OI</th>
              <th>CHG OI</th>
              <th>VOL</th>
              <th>IV</th>
              <th>DELTA</th>
              <th className="border-r border-white/[0.065] text-[#42A77A]">LTP</th>
              <th className="bg-[#111614] text-[#F2F0E8]">PRICE</th>
              <th className="border-l border-white/[0.065] text-[#C45D62]">LTP</th>
              <th>DELTA</th>
              <th>IV</th>
              <th>VOL</th>
              <th>CHG OI</th>
              <th>OI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {strikes.map((row) => {
              const isATM = Math.abs(row.strike_price - spot) < 30;
              const isITMCall = row.strike_price < spot;
              const isITMPut = row.strike_price > spot;

              return (
                <tr
                  key={row.strike_price}
                  className={`hover:bg-[#161C19] transition-colors ${
                    isATM ? "bg-[#161C19] border-y border-[#159570]/40 font-semibold" : ""
                  }`}
                >
                  <td className={`py-1 text-[#A7ADA8] ${isITMCall ? "bg-[#159570]/05" : ""}`}>{row.call_oi.toLocaleString("en-IN")}</td>
                  <td className={`${row.call_change_oi >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"} ${isITMCall ? "bg-[#159570]/05" : ""}`}>
                    {row.call_change_oi > 0 ? "+" : ""}{row.call_change_oi}
                  </td>
                  <td className={`text-[#68716C] ${isITMCall ? "bg-[#159570]/05" : ""}`}>{row.call_volume.toLocaleString("en-IN")}</td>
                  <td className={`text-[#68716C] ${isITMCall ? "bg-[#159570]/05" : ""}`}>{row.call_iv}%</td>
                  <td className={`text-[#68716C] ${isITMCall ? "bg-[#159570]/05" : ""}`}>{row.call_delta}</td>
                  <td
                    onClick={() => onSelectContract(`${selectedFnoSymbol} ${row.strike_price} CE`)}
                    className={`font-semibold cursor-pointer hover:bg-[#159570]/20 text-[#42A77A] border-r border-white/[0.065] transition-colors ${
                      isITMCall ? "bg-[#159570]/10" : ""
                    }`}
                  >
                    ₹{row.call_ltp.toFixed(2)}
                  </td>

                  <td className="py-1 font-semibold bg-[#111614] text-[#F2F0E8]">
                    {row.strike_price}
                  </td>

                  <td
                    onClick={() => onSelectContract(`${selectedFnoSymbol} ${row.strike_price} PE`)}
                    className={`font-semibold cursor-pointer hover:bg-[#C45D62]/20 text-[#C45D62] border-l border-white/[0.065] transition-colors ${
                      isITMPut ? "bg-[#C45D62]/10" : ""
                    }`}
                  >
                    ₹{row.put_ltp.toFixed(2)}
                  </td>
                  <td className={`text-[#68716C] ${isITMPut ? "bg-[#C45D62]/05" : ""}`}>{row.put_delta}</td>
                  <td className={`text-[#68716C] ${isITMPut ? "bg-[#C45D62]/05" : ""}`}>{row.put_iv}%</td>
                  <td className={`text-[#68716C] ${isITMPut ? "bg-[#C45D62]/05" : ""}`}>{row.put_volume.toLocaleString("en-IN")}</td>
                  <td className={`${row.put_change_oi >= 0 ? "text-[#42A77A]" : "text-[#C45D62]"} ${isITMPut ? "bg-[#C45D62]/05" : ""}`}>
                    {row.put_change_oi > 0 ? "+" : ""}{row.put_change_oi}
                  </td>
                  <td className={`text-[#A7ADA8] ${isITMPut ? "bg-[#C45D62]/05" : ""}`}>{row.put_oi.toLocaleString("en-IN")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

OptionChain.displayName = "OptionChain";
