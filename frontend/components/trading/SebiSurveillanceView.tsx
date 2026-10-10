"use client";

import React, { useState, useMemo } from "react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Search, 
  ExternalLink, 
  Filter, 
  Layers, 
  Activity,
  FileText,
  BadgeAlert
} from "lucide-react";

interface ScripSurveillanceItem {
  symbol: string;
  name: string;
  stage: "ASM_STAGE_1" | "ASM_STAGE_2" | "GSM_STAGE_1" | "GSM_STAGE_2" | "T2T" | "CIRCUIT_FILTER";
  stageLabel: string;
  priceBand: "5%" | "10%" | "20%";
  marginRequirement: string;
  surveillanceReason: string;
  effectiveDate: string;
  ltp: number;
  changePct: number;
}

const SURVEILLANCE_SCRIPS: ScripSurveillanceItem[] = [
  {
    symbol: "RPOWER",
    name: "Reliance Power Ltd",
    stage: "ASM_STAGE_1",
    stageLabel: "ASM Stage I",
    priceBand: "5%",
    marginRequirement: "100% Upfront Margin",
    surveillanceReason: "Unusual volume volatility (>450% 20D average) with retail concentration",
    effectiveDate: "2026-08-12",
    ltp: 46.85,
    changePct: -3.40
  },
  {
    symbol: "SUZLON",
    name: "Suzlon Energy Ltd",
    stage: "CIRCUIT_FILTER",
    stageLabel: "Dynamic Band 5%",
    priceBand: "5%",
    marginRequirement: "Standard VAR+ELM",
    surveillanceReason: "Daily Price Limit Filter based on high intra-week momentum drift",
    effectiveDate: "2026-07-28",
    ltp: 74.20,
    changePct: 2.15
  },
  {
    symbol: "JPPOWER",
    name: "Jaiprakash Power Ventures",
    stage: "ASM_STAGE_2",
    stageLabel: "ASM Stage II",
    priceBand: "5%",
    marginRequirement: "100% Cash / No Intraday Leverage",
    surveillanceReason: "Multi-day upper circuit lock with abnormal delivery ratio variance",
    effectiveDate: "2026-08-01",
    ltp: 18.90,
    changePct: -1.05
  },
  {
    symbol: "YESBANK",
    name: "Yes Bank Limited",
    stage: "CIRCUIT_FILTER",
    stageLabel: "Surveillance Watch",
    priceBand: "10%",
    marginRequirement: "Standard F&O MWPL",
    surveillanceReason: "Market Wide Position Limit (MWPL) threshold monitored near 85%",
    effectiveDate: "2026-08-14",
    ltp: 23.45,
    changePct: -0.65
  },
  {
    symbol: "IDEA",
    name: "Vodafone Idea Ltd",
    stage: "T2T",
    stageLabel: "Trade-for-Trade (BE)",
    priceBand: "5%",
    marginRequirement: "100% Upfront (Compulsory Delivery)",
    surveillanceReason: "SEBI F&O ban period entry due to MWPL breach > 95%",
    effectiveDate: "2026-08-18",
    ltp: 9.85,
    changePct: -2.48
  },
  {
    symbol: "ADANIGREEN",
    name: "Adani Green Energy Ltd",
    stage: "CIRCUIT_FILTER",
    stageLabel: "Surveillance Stable",
    priceBand: "10%",
    marginRequirement: "Standard",
    surveillanceReason: "Periodic ASM exit under quarterly review, subject to standard price filter",
    effectiveDate: "2026-06-30",
    ltp: 1780.00,
    changePct: 1.45
  }
];

const SEBI_CIRCULARS = [
  {
    ref: "SEBI/HO/MRD/DOP2/CIR/P/2026/41",
    title: "Enhanced Surveillance Measures for Derivative Inclusions & Mid-Cap Equities",
    date: "14 Aug 2026",
    summary: "Requires 100% margin upfront for securities entering short-term ASM Framework Stage II."
  },
  {
    ref: "NSE/SURV/61482",
    title: "Graded Surveillance Measure (GSM) Periodic Review & Action List",
    date: "08 Aug 2026",
    summary: "Revised criteria for micro-cap scrips experiencing sustained abnormal P/E multiple deviations."
  },
  {
    ref: "BSE/SURV/2026/89",
    title: "Dynamic Circuit Filter Limit Updates for S&P BSE 500 Equities",
    date: "01 Aug 2026",
    summary: "Standardizes 5% and 10% circuit filter cooling-off intervals during market wide surges."
  }
];

export const SebiSurveillanceView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  const filteredScrips = useMemo(() => {
    return SURVEILLANCE_SCRIPS.filter((item) => {
      const matchesSearch = 
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = stageFilter === "ALL" || item.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [searchTerm, stageFilter]);

  return (
    <div className="space-y-5 text-[#F2F0E8] font-sans pb-16">
      
      {/* ================================================================= */}
      {/* HEADER SECTION                                                    */}
      {/* ================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.065] pb-4">
        <div>
          <div className="text-[10px] font-mono text-[#C8A96B] font-semibold tracking-wider uppercase mb-1 flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>REGULATORY SURVEILLANCE &amp; MARKET INTEGRITY</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans tracking-tight text-[#F2F0E8]">
            SEBI ASM / GSM SURVEILLANCE TRACKER
          </h2>
          <p className="text-xs text-[#A7ADA8] mt-0.5">
            Real-time regulatory oversight tracking Additional Surveillance Measures (ASM), Graded Surveillance (GSM), and Price Circuit Filters.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] px-3 py-1.5 flex items-center space-x-2">
            <Activity className="h-3.5 w-3.5 text-[#159570]" />
            <span className="text-[#A7ADA8]">COMPLIANCE SHIELD:</span>
            <span className="text-[#42A77A] font-semibold">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* METRIC SCORECARDS                                                */}
      {/* ================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] p-3.5 space-y-1 specular-border font-mono">
          <div className="text-[10px] text-[#A7ADA8] uppercase font-sans font-medium">ASM Tracked Scrips</div>
          <div className="text-xl font-bold text-[#F2F0E8] tabular-nums">18</div>
          <div className="text-[10px] text-[#C8A96B]">Stage I &amp; II Active</div>
        </div>

        <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] p-3.5 space-y-1 specular-border font-mono">
          <div className="text-[10px] text-[#A7ADA8] uppercase font-sans font-medium">GSM Surveillance</div>
          <div className="text-xl font-bold text-[#F2F0E8] tabular-nums">6</div>
          <div className="text-[10px] text-[#68716C]">Micro-Cap Band Filters</div>
        </div>

        <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] p-3.5 space-y-1 specular-border font-mono">
          <div className="text-[10px] text-[#A7ADA8] uppercase font-sans font-medium">Trade-for-Trade (BE)</div>
          <div className="text-xl font-bold text-[#C45D62] tabular-nums">4</div>
          <div className="text-[10px] text-[#C45D62]">Compulsory 100% Cash</div>
        </div>

        <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] p-3.5 space-y-1 specular-border font-mono">
          <div className="text-[10px] text-[#A7ADA8] uppercase font-sans font-medium">F&amp;O MWPL Restrictions</div>
          <div className="text-xl font-bold text-[#C8A96B] tabular-nums">2</div>
          <div className="text-[10px] text-[#A7ADA8]">&gt;85% Ban Threshold</div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MAIN DATA TABLE & FILTER CONTROLS                                */}
      {/* ================================================================= */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] p-4 space-y-3.5 specular-border">
        
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.065]">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[#68716C] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search symbol or name..."
                className="bg-[#0C100F] border border-white/[0.08] rounded-[3px] pl-8 pr-3 py-1 text-xs text-[#F2F0E8] placeholder-[#68716C] outline-none focus:border-[#159570]/50 w-56"
              />
            </div>

            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-[#0C100F] border border-white/[0.08] rounded-[3px] px-2.5 py-1 text-xs text-[#F2F0E8] outline-none cursor-pointer"
            >
              <option value="ALL">All Stages</option>
              <option value="ASM_STAGE_1">ASM Stage I</option>
              <option value="ASM_STAGE_2">ASM Stage II</option>
              <option value="T2T">Trade-for-Trade</option>
              <option value="CIRCUIT_FILTER">Price Circuit Filters</option>
            </select>
          </div>

          <div className="text-[11px] font-mono text-[#68716C]">
            Showing {filteredScrips.length} of {SURVEILLANCE_SCRIPS.length} securities
          </div>
        </div>

        {/* Tabular Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-white/[0.065] text-[10px] text-[#A7ADA8] font-mono uppercase">
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Security Name</th>
                <th className="py-2 px-3">Framework / Stage</th>
                <th className="py-2 px-3">Price Band</th>
                <th className="py-2 px-3">LTP (₹)</th>
                <th className="py-2 px-3">Margin Requirement</th>
                <th className="py-2 px-3">Trigger / Surveillance Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredScrips.map((scrip) => {
                const isPos = scrip.changePct >= 0;
                return (
                  <tr key={scrip.symbol} className="hover:bg-[#161C19] transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#F2F0E8]">
                      {scrip.symbol}
                    </td>
                    <td className="py-2.5 px-3 text-[#A7ADA8] text-[11px]">
                      {scrip.name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium border ${
                        scrip.stage.includes("STAGE_2") || scrip.stage === "T2T"
                          ? "bg-[#C45D62]/12 text-[#C45D62] border-[#C45D62]/30"
                          : scrip.stage.includes("STAGE_1")
                          ? "bg-[#C8A96B]/12 text-[#C8A96B] border-[#C8A96B]/30"
                          : "bg-[#159570]/12 text-[#42A77A] border-[#159570]/30"
                      }`}>
                        {scrip.stageLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#F2F0E8] font-medium">
                      {scrip.priceBand}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums">
                      <span className="font-semibold text-[#F2F0E8]">₹{scrip.ltp.toFixed(2)}</span>
                      <span className={`ml-1.5 text-[10px] ${isPos ? "text-[#42A77A]" : "text-[#C45D62]"}`}>
                        {isPos ? "+" : ""}{scrip.changePct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#C8A96B]">
                      {scrip.marginRequirement}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[#68716C] max-w-xs truncate" title={scrip.surveillanceReason}>
                      {scrip.surveillanceReason}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================= */}
      {/* REGULATORY CIRCULARS & ENFORCEMENT NOTICES                       */}
      {/* ================================================================= */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-[3px] p-4 space-y-3 specular-border">
        <div className="flex items-center space-x-2 border-b border-white/[0.065] pb-2">
          <FileText className="h-4 w-4 text-[#159570]" />
          <h3 className="text-xs font-sans font-semibold text-[#F2F0E8] uppercase tracking-wider">
            RECENT SEBI &amp; EXCHANGE REGULATORY CIRCULARS
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SEBI_CIRCULARS.map((cir) => (
            <div key={cir.ref} className="bg-[#0C100F] border border-white/[0.065] rounded-[3px] p-3 space-y-1.5 font-sans">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#C8A96B]">
                <span>{cir.ref}</span>
                <span className="text-[#68716C]">{cir.date}</span>
              </div>
              <div className="text-xs font-semibold text-[#F2F0E8] leading-tight">
                {cir.title}
              </div>
              <p className="text-[11px] text-[#A7ADA8] leading-relaxed">
                {cir.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
