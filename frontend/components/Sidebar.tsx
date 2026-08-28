"use client";

import React from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { ActiveTab } from "../types";
import { LayoutDashboard, PieChart, Network, TrendingUp, FlaskConical, Settings, CandlestickChart } from "lucide-react";

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = usePortfolioStore();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "fno_terminal", label: "F&O Trading Desk", icon: <CandlestickChart className="h-4 w-4 text-cyan-400" /> },
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "nse_market", label: "Indian Market (NSE)", icon: <TrendingUp className="h-4 w-4 text-amber-400" /> },
    { id: "analytics", label: "Portfolio Analytics", icon: <PieChart className="h-4 w-4" /> },
    { id: "gnn_risk", label: "GNN Risk Engine", icon: <Network className="h-4 w-4" /> },
    { id: "strategy", label: "Strategy Lab", icon: <FlaskConical className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" /> }
  ];

  return (
    <aside className="w-64 h-[calc(100vh-4rem)] bg-slate-950/70 border-r border-slate-800/80 p-4 flex flex-col justify-between select-none">
      <div className="space-y-6">
        <div className="px-2 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          Workstation Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <span className={isActive ? "text-cyan-400" : "text-slate-400"}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 text-[11px] font-mono text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-slate-300">
          <span>Engine Cluster</span>
          <span className="text-emerald-400 font-semibold">ONLINE</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div className="bg-cyan-400 h-full w-[85%] rounded-full" />
        </div>
        <div className="flex justify-between text-[9px] text-slate-500">
          <span>Latency: 12ms</span>
          <span>GPU: RTX 4090</span>
        </div>
      </div>
    </aside>
  );
};
