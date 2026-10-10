"use client";

import React, { useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Target,
  BrainCircuit,
  Binary,
  Radio,
  ExternalLink
} from "lucide-react";

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: "emerald" | "gold" | "slate";
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    currentCustomer 
  } = usePortfolioStore();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const navSections: NavSection[] = [
    {
      title: "MARKETS & EXECUTION",
      items: [
        { 
          id: "fno_terminal", 
          label: "F&O Options Terminal", 
          icon: <CandlestickChart className="h-4 w-4" /> 
        },
        { 
          id: "watchlist", 
          label: "Live Watchlist & L2 Depth", 
          icon: <Target className="h-4 w-4" />,
          badge: "CMP",
          badgeVariant: "emerald"
        },
        { 
          id: "nse_market", 
          label: "Indian Market (NSE)", 
          icon: <TrendingUp className="h-4 w-4" /> 
        }
      ]
    },
    {
      title: "QUANT INTELLIGENCE",
      items: [
        { 
          id: "strategy", 
          label: "Strategy Lab (Sortino DRL)", 
          icon: <Binary className="h-4 w-4" />,
          badge: "DRL",
          badgeVariant: "gold"
        },
        { 
          id: "alpha_forecaster", 
          label: "18-Alpha Forecaster", 
          icon: <BrainCircuit className="h-4 w-4" />,
          badge: "18-α",
          badgeVariant: "gold"
        },
        { 
          id: "ai_audit", 
          label: "AI Universe Audit", 
          icon: <Sparkles className="h-4 w-4" /> 
        }
      ]
    },
    {
      title: "RISK & COMPLIANCE",
      items: [
        { 
          id: "gnn_risk", 
          label: "CausalGraphX GNN Engine", 
          icon: <Network className="h-4 w-4" />,
          badge: "PyTorch",
          badgeVariant: "emerald"
        },
        { 
          id: "sebi_surveillance", 
          label: "SEBI Surveillance (ASM/GSM)", 
          icon: <ShieldCheck className="h-4 w-4" /> 
        },
        { 
          id: "portfolio_lab", 
          label: "Live Portfolio Lab", 
          icon: <FlaskConical className="h-4 w-4" />,
          badge: "YF MTM",
          badgeVariant: "slate"
        }
      ]
    },
    {
      title: "WORKSTATION",
      items: [
        { 
          id: "settings", 
          label: "Hotkeys & Telemetry", 
          icon: <Settings className="h-4 w-4" /> 
        }
      ]
    }
  ];

  return (
    <aside 
      className={`h-[calc(100vh-3.25rem)] md:h-[calc(100vh-3.5rem)] bg-[#0C100F] border-r border-white/[0.065] flex flex-col justify-between select-none transition-all duration-200 shrink-0 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="space-y-3.5 p-2.5 overflow-y-auto">
        
        {/* QuantSensei Portal Backlink Pill */}
        <a
          href="http://localhost:8080/dashboard"
          className={`flex items-center rounded-[3px] bg-[#111614] hover:bg-[#161C19] border border-white/[0.08] hover:border-[#159570]/40 text-[#F2F0E8] transition-all group ${
            isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2"
          }`}
          title="Return to QuantSensei Unified Hub (:8080)"
        >
          <div className="flex items-center space-x-2">
            <span className="text-[#159570] group-hover:-translate-x-0.5 transition-transform text-xs font-bold">←</span>
            {!isCollapsed && (
              <span className="text-[11px] font-sans font-medium text-[#F2F0E8]">QuantSensei Portal</span>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-[9px] font-mono text-[#68716C] group-hover:text-[#159570]">8080</span>
          )}
        </a>

        {/* Navigation Sections */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-2.5 py-1 text-[9px] font-mono font-medium text-[#68716C] uppercase tracking-wider">
                {section.title}
              </div>
            ) : (
              <div className="h-[1px] bg-white/[0.065] my-2 mx-1" />
            )}

            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`relative w-full flex items-center rounded-[3px] text-xs font-sans transition-all duration-150 ${
                      isCollapsed ? "justify-center py-2.5 px-0" : "justify-between px-3 py-2"
                    } ${
                      isActive
                        ? "bg-[#161C19] text-[#F2F0E8] font-medium border border-white/[0.06] shadow-sm"
                        : "text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#111614]"
                    }`}
                  >
                    {/* Active Hairline Accent Indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#159570] rounded-r" />
                    )}

                    <div className="flex items-center space-x-2.5">
                      <span className={`shrink-0 transition-colors duration-150 ${
                        isActive ? "text-[#159570]" : "text-[#68716C]"
                      }`}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="truncate text-left text-[12px]">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono font-medium tracking-tight uppercase ${
                          item.badgeVariant === "gold"
                            ? "bg-[#C8A96B]/12 text-[#C8A96B] border border-[#C8A96B]/25"
                            : item.badgeVariant === "emerald"
                            ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/25"
                            : "bg-white/[0.04] text-[#A7ADA8] border border-white/[0.065]"
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

      {/* Footer Collapse Toggle & Version Bar */}
      <div className="p-2 border-t border-white/[0.065] bg-[#080A09]/60">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full flex items-center rounded-[3px] py-1.5 px-2 text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#111614] border border-transparent hover:border-white/[0.04] text-xs transition-colors ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
          title={isCollapsed ? "Expand Navigation Rail" : "Collapse Navigation Rail"}
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-2 text-[10px] font-mono text-[#68716C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#159570]" />
              <span>TERMINAL v2.4</span>
            </div>
          )}
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
};
