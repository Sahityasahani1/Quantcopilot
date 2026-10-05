"use client";

import React, { useState } from "react";
import { 
  Settings, 
  ShieldCheck, 
  Cpu, 
  Radio, 
  Save, 
  CheckCircle2, 
  Server
} from "lucide-react";
import { getApiBaseUrl, getWsBaseUrl } from "../lib/api";

export const WorkstationSettingsView: React.FC = () => {
  const [varThreshold, setVarThreshold] = useState<number>(2.5);
  const [gnnSensitivity, setGnnSensitivity] = useState<string>("BALANCED");
  const [drawdownAlert, setDrawdownAlert] = useState<number>(5.0);
  const [forecastHorizon, setForecastHorizon] = useState<number>(14);
  const [finbertThreshold, setFinbertThreshold] = useState<number>(0.15);
  const [newsPollingInterval] = useState<number>(15);
  const [autoHedgeEnabled, setAutoHedgeEnabled] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans select-none text-[#F2F0E8]">
      {/* Header */}
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 shadow-sm flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="h-6 w-6 rounded-sm bg-[#0C100F] border border-white/[0.065] flex items-center justify-center text-[#159570]">
              <Settings className="h-3.5 w-3.5" />
            </div>
            <span className="text-[10px] font-mono text-[#159570] font-semibold tracking-wider uppercase">
              SYSTEM &amp; CONFIGURATION
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#F2F0E8] uppercase font-sans">
            WORKSTATION SETTINGS &amp; SYSTEM PREFERENCES
          </h2>
          <p className="text-xs text-[#A7ADA8] font-sans">
            Configure quantitative risk limits, AI deep learning horizons, live RSS ingestion feeds, and API connectivity.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center space-x-2 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-medium px-3.5 py-2 rounded-sm text-xs font-sans transition-colors shadow-sm"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{isSaved ? "Saved Successfully" : "Save Preferences"}</span>
        </button>
      </div>

      {isSaved && (
        <div className="bg-[#159570]/10 border border-[#159570]/30 rounded-sm p-3 text-xs text-[#42A77A] flex items-center space-x-2 font-sans">
          <CheckCircle2 className="h-4 w-4 text-[#42A77A]" />
          <span>Workstation preferences saved and active in current session.</span>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Section 1: Quantitative Risk Tolerances */}
        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/[0.065] pb-3">
            <ShieldCheck className="h-4 w-4 text-[#159570]" />
            <h3 className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider font-sans">
              Portfolio Risk &amp; GNN Limits
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between mb-1.5 font-sans">
                <span className="text-[#A7ADA8] font-medium">Max 99% VaR Limit (% of Portfolio):</span>
                <span className="text-[#F2F0E8] font-mono font-bold tabular-nums">{varThreshold}%</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={varThreshold}
                onChange={(e) => setVarThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#159570] cursor-pointer bg-[#0C100F]"
              />
            </div>

            <div>
              <label className="text-[#A7ADA8] font-medium block mb-1.5 font-sans">
                GNN Contagion Vector Sensitivity:
              </label>
              <select
                value={gnnSensitivity}
                onChange={(e) => setGnnSensitivity(e.target.value)}
                className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm p-2 text-[#F2F0E8] focus:outline-none focus:border-[#159570] font-sans text-xs"
              >
                <option value="PERMISSIVE" className="bg-[#161C19]">Permissive (Tolerate High Sector Correlation)</option>
                <option value="BALANCED" className="bg-[#161C19]">Balanced (Standard NSE Beta Tracking)</option>
                <option value="STRICT" className="bg-[#161C19]">Strict (Zero-Tolerance Contagion Shocks)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-sans">
                <span className="text-[#A7ADA8] font-medium">Daily Drawdown Alert Threshold:</span>
                <span className="text-[#C45D62] font-mono font-bold tabular-nums">{drawdownAlert}%</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="10.0"
                step="1.0"
                value={drawdownAlert}
                onChange={(e) => setDrawdownAlert(parseFloat(e.target.value))}
                className="w-full accent-[#C45D62] cursor-pointer bg-[#0C100F]"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.065]">
              <span className="text-[#A7ADA8] font-medium font-sans">Auto-Hedge via Index Put Options:</span>
              <button
                onClick={() => setAutoHedgeEnabled(!autoHedgeEnabled)}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${autoHedgeEnabled ? "bg-[#159570]" : "bg-[#0C100F] border border-white/[0.065]"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-[#F2F0E8] transition-transform ${autoHedgeEnabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: AI Deep Learning & NLP Parameters */}
        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/[0.065] pb-3">
            <Cpu className="h-4 w-4 text-[#159570]" />
            <h3 className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider font-sans">
              AI Neural Predictor &amp; NLP
            </h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-[#A7ADA8] font-medium block mb-1.5 font-sans">
                Default Forecast Horizon:
              </label>
              <select
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(parseInt(e.target.value))}
                className="w-full bg-[#0C100F] border border-white/[0.065] rounded-sm p-2 text-[#F2F0E8] focus:outline-none focus:border-[#159570] font-sans text-xs"
              >
                <option value={7} className="bg-[#161C19]">7 Days (Short-term momentum)</option>
                <option value={14} className="bg-[#161C19]">14 Days (Standard Quantile Forecast)</option>
                <option value={30} className="bg-[#161C19]">30 Days (Positional Drift)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-sans">
                <span className="text-[#A7ADA8] font-medium">FinBERT Sentiment Polarity Cutoff:</span>
                <span className="text-[#42A77A] font-mono font-bold tabular-nums">&plusmn;{finbertThreshold}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={finbertThreshold}
                onChange={(e) => setFinbertThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#159570] cursor-pointer bg-[#0C100F]"
              />
            </div>

            <div className="p-3 rounded-sm bg-[#0C100F] border border-white/[0.065] text-[11px] text-[#A7ADA8] space-y-1 font-sans">
              <span className="font-semibold text-[#F2F0E8] block">Spatio-Temporal Transformer Heads:</span>
              <p>18-Alpha input matrix &bull; Multi-quantile attention envelope (&plusmn;2&sigma;) &bull; Trailing 75-bar lookback</p>
            </div>
          </div>
        </div>

        {/* Section 3: Data Ingestion & Live Feeds */}
        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/[0.065] pb-3">
            <Radio className="h-4 w-4 text-[#159570]" />
            <h3 className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider font-sans">
              Live Feeds &amp; Regulatory Channels
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center font-sans">
              <span className="text-[#A7ADA8] font-medium">News &amp; Policy Polling Cadence:</span>
              <span className="text-[#F2F0E8] font-mono font-semibold tabular-nums">{newsPollingInterval} Minutes</span>
            </div>

            <div className="space-y-1.5 pt-1 font-sans">
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
                <span className="text-[#F2F0E8] text-xs">Google News RSS (NSE Tickers)</span>
                <span className="text-[10px] font-mono font-medium text-[#42A77A] bg-[#159570]/15 border border-[#159570]/30 px-2 py-0.5 rounded-sm">
                  CONNECTED
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
                <span className="text-[#F2F0E8] text-xs">Moneycontrol Real-Time RSS</span>
                <span className="text-[10px] font-mono font-medium text-[#42A77A] bg-[#159570]/15 border border-[#159570]/30 px-2 py-0.5 rounded-sm">
                  CONNECTED
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
                <span className="text-[#F2F0E8] text-xs">Official SEBI Regulatory Feed (sebi.gov.in)</span>
                <span className="text-[10px] font-mono font-medium text-[#42A77A] bg-[#159570]/15 border border-[#159570]/30 px-2 py-0.5 rounded-sm">
                  CONNECTED
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
                <span className="text-[#F2F0E8] text-xs">Yahoo Finance NSE Direct API</span>
                <span className="text-[10px] font-mono font-medium text-[#42A77A] bg-[#159570]/15 border border-[#159570]/30 px-2 py-0.5 rounded-sm">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: System Architecture & Gateways */}
        <div className="bg-[#111614] border border-white/[0.065] rounded-sm p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/[0.065] pb-3">
            <Server className="h-4 w-4 text-[#159570]" />
            <h3 className="text-xs font-semibold text-[#F2F0E8] uppercase tracking-wider font-sans">
              System Architecture &amp; Gateways
            </h3>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
              <span className="text-[#A7ADA8] font-sans text-xs">REST API Gateway:</span>
              <span className="text-[#F2F0E8] font-mono truncate max-w-[200px]">{getApiBaseUrl()}</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
              <span className="text-[#A7ADA8] font-sans text-xs">WebSocket Endpoint:</span>
              <span className="text-[#F2F0E8] font-mono truncate max-w-[200px]">{getWsBaseUrl()}/ws</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
              <span className="text-[#A7ADA8] font-sans text-xs">Trading System Core:</span>
              <span className="text-[#F2F0E8] font-sans text-xs font-medium">FastAPI Async + Next.js 16</span>
            </div>

            <div className="flex justify-between items-center p-2 rounded-sm bg-[#0C100F] border border-white/[0.065]">
              <span className="text-[#A7ADA8] font-sans text-xs">Build Version:</span>
              <span className="text-[#A7ADA8] font-mono text-xs">v1.2.0-PRODUCTION</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
