"use client";

import React from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { ActiveTab } from "../types";
import { 
  LayoutDashboard, 
  Network, 
  TrendingUp, 
  FlaskConical, 
  CandlestickChart, 
  Sparkles, 
  Settings,
  ChevronRight,
  ShieldCheck,
  Target
} from "lucide-react";

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "emerald" | "cyan" | "slate";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = usePortfolioStore();

  const navSections: NavSection[] = [
    {
      title: "MARKETS & DESK",
      items: [
        { 
          id: "fno_terminal", 
          label: "F&O Trading Desk", 
          icon: <CandlestickChart className="h-4 w-4" /> 
        },
        { 
          id: "watchlist", 
          label: "Live Watchlist & Audit", 
          icon: <Target className="h-4 w-4" />,
          badge: "CMP",
          badgeVariant: "emerald"
        },
        { 
          id: "dashboard", 
          label: "Overview Dashboard", 
          icon: <LayoutDashboard className="h-4 w-4" /> 
        },
        { 
          id: "nse_market", 
          label: "Indian Market (NSE)", 
          icon: <TrendingUp className="h-4 w-4" /> 
        }
      ]
    },
    {
      title: "PORTFOLIO & SANDBOX",
      items: [
        { 
          id: "portfolio_lab", 
          label: "Live Portfolio Lab", 
          icon: <FlaskConical className="h-4 w-4" />,
          badge: "LIVE YF",
          badgeVariant: "cyan"
        }
      ]
    },
    {
      title: "QUANT INTELLIGENCE",
      items: [
        { 
          id: "ai_audit", 
          label: "AI Stock & Index Audit", 
          icon: <Sparkles className="h-4 w-4" />,
          badge: "PREDICT",
          badgeVariant: "cyan"
        },
        { 
          id: "gnn_risk", 
          label: "GNN Risk Engine", 
          icon: <Network className="h-4 w-4" /> 
        }
      ]
    },
    {
      title: "RESEARCH",
      items: [
        { 
          id: "strategy", 
          label: "Strategy Lab", 
          icon: <FlaskConical className="h-4 w-4" /> 
        }
      ]
    }
  ];

  return (
    <aside className="w-60 h-[calc(100vh-3.5rem)] bg-[#0C100F] border-r border-white/[0.065] p-3 flex flex-col justify-between select-none overflow-y-auto">
      <div className="space-y-5">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-sans font-medium text-[#68716C] uppercase tracking-wider">
              {section.title}
            </div>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-sans transition-all duration-150 ${
                      isActive
                        ? "bg-[#161C19] text-[#F2F0E8] font-medium border border-white/[0.04]"
                        : "text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#111614]"
                    }`}
                  >
                    {/* Refined Emerald Active Accent Hairline */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#159570] rounded-r transition-all duration-200" />
                    )}

                    <div className="flex items-center space-x-2.5">
                      <span className={`transition-colors duration-150 ${isActive ? "text-[#159570]" : "text-[#68716C]"}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-medium tracking-tight uppercase transition-colors duration-150 ${
                          item.badgeVariant === "cyan"
                            ? "bg-[#C8A96B]/10 text-[#C8A96B] border border-[#C8A96B]/25"
                            : "bg-[#159570]/10 text-[#42A77A] border border-[#159570]/25"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Settings Button & Institutional System Bar */}
      <div className="border-t border-white/[0.065] pt-3 space-y-1.5">
        <button
          onClick={() => setActiveTab("settings")}
          className={`relative w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-sans transition-all duration-150 ${
            activeTab === "settings"
              ? "bg-[#161C19] text-[#F2F0E8] font-medium border border-white/[0.04]"
              : "text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#111614]"
          }`}
        >
          {activeTab === "settings" && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#159570] rounded-r transition-all duration-200" />
          )}
          <div className="flex items-center space-x-2.5">
            <Settings className={`h-4 w-4 transition-colors duration-150 ${activeTab === "settings" ? "text-[#159570]" : "text-[#68716C]"}`} />
            <span>Workstation Settings</span>
          </div>
          <span className="text-[10px] text-[#68716C] font-mono">v1.2</span>
        </button>

        <div className="px-2 py-1 flex items-center justify-between text-[10px] font-mono text-[#68716C]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-[#159570]" /> GNN ACTIVE
          </span>
          <span className="text-[#68716C]">INSTITUTIONAL</span>
        </div>
      </div>
    </aside>
  );
};

