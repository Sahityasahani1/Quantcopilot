"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { ActiveTab } from "../types";
import { 
  Search, 
  CandlestickChart, 
  LayoutDashboard, 
  TrendingUp, 
  FlaskConical, 
  Sparkles, 
  Network, 
  Settings, 
  Plus, 
  Upload, 
  CornerDownLeft, 
  X,
  ArrowRight,
  Target
} from "lucide-react";

interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  category: "DESKS" | "ACTIONS" | "TICKERS";
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    setActiveTab, 
    setSelectedFnoSymbol, 
    setSelectedHistorySymbol,
    setIsAddPositionOpen, 
    setIsImportModalOpen 
  } = usePortfolioStore();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const items: PaletteItem[] = [
    {
      id: "desk_fno",
      title: "F&O Trading Desk",
      subtitle: "Switch to derivatives terminal and order book",
      category: "DESKS",
      icon: <CandlestickChart className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setActiveTab("fno_terminal");
        onClose();
      }
    },
    {
      id: "desk_watchlist",
      title: "Live Watchlist & Predictive Audit",
      subtitle: "Real-time CMP tracking and 14-day AI forecast cones",
      category: "DESKS",
      icon: <Target className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setActiveTab("watchlist");
        onClose();
      }
    },
    {
      id: "desk_dashboard",
      title: "Overview Dashboard",
      subtitle: "Executive overview of portfolio delta & systemic risk",
      category: "DESKS",
      icon: <LayoutDashboard className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setActiveTab("dashboard");
        onClose();
      }
    },
    {
      id: "desk_nse",
      title: "Indian Market (NSE)",
      subtitle: "NSE equity feed, benchmarks, and market depth",
      category: "DESKS",
      icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setActiveTab("nse_market");
        onClose();
      }
    },
    {
      id: "desk_portfolio_lab",
      title: "Live Portfolio Lab",
      subtitle: "Dynamic Yahoo Finance sandbox and MTM valuation",
      category: "DESKS",
      icon: <FlaskConical className="h-4 w-4 text-cyan-400" />,
      action: () => {
        setActiveTab("portfolio_lab");
        onClose();
      }
    },
    {
      id: "desk_ai_audit",
      title: "AI Stock & Index Audit",
      subtitle: "Multi-factor audit, predictions, and policy intelligence",
      category: "DESKS",
      icon: <Sparkles className="h-4 w-4 text-cyan-400" />,
      action: () => {
        setActiveTab("ai_audit");
        onClose();
      }
    },
    {
      id: "desk_gnn_risk",
      title: "GNN Risk Engine",
      subtitle: "Graph contagion matrix and what-if shock stress testing",
      category: "DESKS",
      icon: <Network className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setActiveTab("gnn_risk");
        onClose();
      }
    },
    {
      id: "desk_strategy",
      title: "Strategy Lab",
      subtitle: "DRL agent backtesting and quantile fan charts",
      category: "DESKS",
      icon: <FlaskConical className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setActiveTab("strategy");
        onClose();
      }
    },
    {
      id: "desk_settings",
      title: "Workstation Settings",
      subtitle: "API endpoints, VaR limits, and engine configuration",
      category: "DESKS",
      icon: <Settings className="h-4 w-4 text-slate-400" />,
      action: () => {
        setActiveTab("settings");
        onClose();
      }
    },
    {
      id: "act_add_pos",
      title: "Add Portfolio Position",
      subtitle: "Enter a new cash or derivative position",
      category: "ACTIONS",
      icon: <Plus className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setIsAddPositionOpen(true);
        onClose();
      }
    },
    {
      id: "act_import_csv",
      title: "Import Portfolio CSV",
      subtitle: "Bulk upload positions from broker export",
      category: "ACTIONS",
      icon: <Upload className="h-4 w-4 text-slate-400" />,
      action: () => {
        setIsImportModalOpen(true);
        onClose();
      }
    },
    {
      id: "sym_nifty",
      title: "NIFTY 50",
      subtitle: "National Stock Exchange Benchmark Index",
      category: "TICKERS",
      icon: <TrendingUp className="h-4 w-4 text-cyan-400" />,
      action: () => {
        setSelectedFnoSymbol("NIFTY");
        setSelectedHistorySymbol("NIFTY 50");
        setActiveTab("fno_terminal");
        onClose();
      }
    },
    {
      id: "sym_banknifty",
      title: "BANKNIFTY",
      subtitle: "NSE Banking Sector Benchmark Index",
      category: "TICKERS",
      icon: <TrendingUp className="h-4 w-4 text-cyan-400" />,
      action: () => {
        setSelectedFnoSymbol("BANKNIFTY");
        setSelectedHistorySymbol("NIFTY BANK");
        setActiveTab("fno_terminal");
        onClose();
      }
    },
    {
      id: "sym_reliance",
      title: "RELIANCE.NS",
      subtitle: "Reliance Industries Ltd - Energy & Digital",
      category: "TICKERS",
      icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setSelectedFnoSymbol("RELIANCE");
        setSelectedHistorySymbol("RELIANCE-EQ");
        setActiveTab("fno_terminal");
        onClose();
      }
    },
    {
      id: "sym_tcs",
      title: "TCS.NS",
      subtitle: "Tata Consultancy Services Ltd - Technology",
      category: "TICKERS",
      icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setSelectedFnoSymbol("TCS");
        setSelectedHistorySymbol("TCS-EQ");
        setActiveTab("fno_terminal");
        onClose();
      }
    },
    {
      id: "sym_hdfc",
      title: "HDFCBANK.NS",
      subtitle: "HDFC Bank Ltd - Banking & Finance",
      category: "TICKERS",
      icon: <TrendingUp className="h-4 w-4 text-emerald-400" />,
      action: () => {
        setSelectedFnoSymbol("HDFCBANK");
        setSelectedHistorySymbol("HDFCBANK-EQ");
        setActiveTab("fno_terminal");
        onClose();
      }
    }
  ];

  const filteredItems = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 px-4 transition-all"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[#0b0f17] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Box */}
        <div className="flex items-center px-4 py-3 border-b border-slate-800/80 bg-[#0e1422]">
          <Search className="h-4 w-4 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, desk, or symbol (e.g. F&O, RELIANCE, Risk)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm font-sans text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs font-sans text-slate-500">
              No matching desks, actions, or tickers found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#131b2a] text-white border-l-2 border-emerald-500"
                      : "text-slate-300 hover:bg-[#0e1422] border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-1 rounded bg-[#090d16] border border-slate-800 shrink-0">
                      {item.icon}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold font-sans text-slate-100 flex items-center space-x-2">
                        <span>{item.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-[11px] font-sans text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-2">
                    {isSelected && (
                      <span className="flex items-center text-[10px] font-mono text-emerald-400">
                        <span>SELECT</span>
                        <CornerDownLeft className="h-3 w-3 ml-1" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard Quick Navigation Footer */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-[#090d16] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 text-[10px]">
                ↑
              </kbd>{" "}
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 text-[10px]">
                ↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 text-[10px]">
                ↵
              </kbd>{" "}
              Execute
            </span>
          </div>
          <span>QuantCopilot Navigation</span>
        </div>
      </div>
    </div>
  );
};
