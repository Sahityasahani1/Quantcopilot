"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  User, 
  LogIn, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  Wallet, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Sparkles
} from "lucide-react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { CustomerProfile } from "../types";

export const CustomerLoginModal: React.FC = () => {
  const { 
    isCustomerLoginModalOpen, 
    setIsCustomerLoginModalOpen, 
    currentCustomer, 
    availableCustomers, 
    fetchCustomerProfiles, 
    loginCustomer, 
    registerCustomer, 
    logoutCustomer,
    refreshCustomerPortfolioLive,
    isLiveSyncing
  } = usePortfolioStore();

  const [activeTab, setActiveTab] = useState<"switch" | "login" | "register">("switch");
  
  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState("sahitya@quantcopilot.ai");
  const [loginPassword, setLoginPassword] = useState("quant123");
  
  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCapital, setRegCapital] = useState<number>(500000);
  const [regTier, setRegTier] = useState<string>("PRO_QUANT");

  // Status & error handling
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (isCustomerLoginModalOpen) {
      fetchCustomerProfiles();
      setStatusMessage(null);
    }
  }, [isCustomerLoginModalOpen, fetchCustomerProfiles]);

  if (!isCustomerLoginModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setStatusMessage({ type: "error", text: "Please enter your Email/Customer ID and Password." });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    const result = await loginCustomer(loginIdentifier, loginPassword);
    setIsLoading(false);

    if (result.success) {
      setStatusMessage({ type: "success", text: result.message });
      setTimeout(() => {
        setIsCustomerLoginModalOpen(false);
      }, 700);
    } else {
      setStatusMessage({ type: "error", text: result.message });
    }
  };

  const handleQuickSwitch = async (profile: CustomerProfile) => {
    setIsLoading(true);
    setStatusMessage(null);
    // Standard accounts use default passcode quant123
    const result = await loginCustomer(profile.customer_id, "quant123");
    setIsLoading(false);

    if (result.success) {
      setStatusMessage({ type: "success", text: `Switched to ${profile.name}. Yahoo Finance sync active.` });
      setTimeout(() => {
        setIsCustomerLoginModalOpen(false);
      }, 600);
    } else {
      // Prompt user to enter credentials in login tab
      setLoginIdentifier(profile.email || profile.customer_id);
      setActiveTab("login");
      setStatusMessage({ type: "error", text: "Please enter your password to switch to this account." });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setStatusMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);
    const result = await registerCustomer(regName, regEmail, regPassword, regCapital, regTier);
    setIsLoading(false);

    if (result.success) {
      setStatusMessage({ type: "success", text: result.message });
      setTimeout(() => {
        setIsCustomerLoginModalOpen(false);
      }, 800);
    } else {
      setStatusMessage({ type: "error", text: result.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-[#0F1412] border border-white/[0.08] rounded-md shadow-2xl overflow-hidden flex flex-col text-[#F2F0E8] font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#141A17]">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded bg-[#1A221E] border border-white/[0.08] flex items-center justify-center text-[#159570]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-[#F2F0E8] flex items-center gap-2">
                <span>CUSTOMER PORTFOLIO DESK</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[#1A221E] text-[#C8A96B] border border-white/[0.065]">
                  STANDALONE DB
                </span>
              </h3>
              <p className="text-[11px] text-[#A7ADA8] font-sans">
                Persistent custom database with real-time Yahoo Finance quote integration.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCustomerLoginModalOpen(false)}
            className="p-1.5 text-[#68716C] hover:text-[#F2F0E8] hover:bg-white/[0.06] rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Yahoo Finance Streaming Indicator Banner */}
        <div className="px-5 py-2.5 bg-[#159570]/10 border-b border-[#159570]/20 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#159570] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#159570]"></span>
            </span>
            <span className="text-[11px] text-[#A7ADA8] font-mono">
              YAHOO FINANCE LIVE FEED: <strong className="text-[#159570]">ACTIVE</strong>
            </span>
          </div>
          <span className="text-[10px] text-[#A7ADA8] font-mono">
            Auto-fetches LTP on Login
          </span>
        </div>

        {/* Current Active Account Status */}
        {currentCustomer && (
          <div className="px-5 py-3 bg-[#111614] border-b border-white/[0.065] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-7 w-7 rounded-full bg-[#159570]/20 border border-[#159570]/30 flex items-center justify-center font-bold text-xs text-[#159570]">
                {currentCustomer.name.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-semibold text-[#F2F0E8] flex items-center gap-1.5">
                  <span>{currentCustomer.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#161C19] text-[#C8A96B] rounded border border-white/[0.065]">
                    {currentCustomer.account_tier}
                  </span>
                </div>
                <div className="text-[11px] text-[#A7ADA8] font-mono">
                  {currentCustomer.email} • ID: {currentCustomer.customer_id}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => refreshCustomerPortfolioLive()}
                disabled={isLiveSyncing}
                className="flex items-center space-x-1 px-2.5 py-1 text-[11px] bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] rounded transition-all"
                title="Refresh portfolio from Yahoo Finance"
              >
                <RefreshCw className={`h-3 w-3 ${isLiveSyncing ? "animate-spin text-[#159570]" : ""}`} />
                <span>Sync</span>
              </button>
              <button
                onClick={logoutCustomer}
                className="px-2.5 py-1 text-[11px] bg-[#C45D62]/10 hover:bg-[#C45D62]/20 text-[#C45D62] border border-[#C45D62]/25 rounded transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/[0.08] bg-[#111614] px-5 pt-2">
          <button
            onClick={() => { setActiveTab("switch"); setStatusMessage(null); }}
            className={`flex items-center space-x-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === "switch"
                ? "border-[#159570] text-[#F2F0E8]"
                : "border-transparent text-[#68716C] hover:text-[#A7ADA8]"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Switch Account ({availableCustomers.length})</span>
          </button>
          
          <button
            onClick={() => { setActiveTab("login"); setStatusMessage(null); }}
            className={`flex items-center space-x-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === "login"
                ? "border-[#159570] text-[#F2F0E8]"
                : "border-transparent text-[#68716C] hover:text-[#A7ADA8]"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Customer Sign In</span>
          </button>

          <button
            onClick={() => { setActiveTab("register"); setStatusMessage(null); }}
            className={`flex items-center space-x-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-all ${
              activeTab === "register"
                ? "border-[#159570] text-[#F2F0E8]"
                : "border-transparent text-[#68716C] hover:text-[#A7ADA8]"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Register Profile</span>
          </button>
        </div>

        {/* Status Message Notification */}
        {statusMessage && (
          <div className={`mx-5 mt-4 p-3 rounded text-xs flex items-center space-x-2 ${
            statusMessage.type === "success" 
              ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30" 
              : "bg-[#C45D62]/15 text-[#C45D62] border border-[#C45D62]/30"
          }`}>
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Fast Account Switch */}
        {activeTab === "switch" && (
          <div className="p-5 space-y-3 max-h-[380px] overflow-y-auto">
            <div className="text-[11px] text-[#A7ADA8] font-sans mb-1 flex items-center justify-between">
              <span>Select an account stored in your custom database:</span>
              <span className="font-mono text-[10px] text-[#68716C]">Default PIN: quant123</span>
            </div>

            <div className="space-y-2">
              {availableCustomers.map((profile) => {
                const isSelected = currentCustomer?.customer_id === profile.customer_id;
                return (
                  <div
                    key={profile.customer_id}
                    className={`p-3 rounded border transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-[#159570]/10 border-[#159570]/40 shadow-sm"
                        : "bg-[#141A17] hover:bg-[#18201C] border-white/[0.065]"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded flex items-center justify-center font-bold text-xs ${
                        isSelected 
                          ? "bg-[#159570] text-black" 
                          : "bg-[#1E2722] text-[#F2F0E8] border border-white/[0.065]"
                      }`}>
                        {profile.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#F2F0E8] flex items-center gap-2">
                          <span>{profile.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-[#C8A96B] border border-white/[0.065]">
                            {profile.account_tier}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-mono text-[#159570] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A7ADA8] font-mono flex items-center gap-2 mt-0.5">
                          <span>{profile.email}</span>
                          <span>•</span>
                          <span>{profile.positions_count || 0} holdings</span>
                          <span>•</span>
                          <span className="text-[#C8A96B]">₹{Number(profile.total_equity || profile.cash_balance).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickSwitch(profile)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-all flex items-center space-x-1 ${
                        isSelected
                          ? "bg-[#159570] text-black hover:bg-[#128160]"
                          : "bg-[#1A221E] hover:bg-[#159570] text-[#F2F0E8] hover:text-black border border-white/[0.08]"
                      }`}
                    >
                      <span>{isSelected ? "Active" : "Switch"}</span>
                      {!isSelected && <ArrowRight className="h-3 w-3 ml-0.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Customer Login */}
        {activeTab === "login" && (
          <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A7ADA8]">
                Email or Customer ID
              </label>
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="e.g. sahitya@quantcopilot.ai or cust_sahitya"
                className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-3 py-2 text-xs text-[#F2F0E8] outline-none font-mono transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#A7ADA8]">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-3 py-2 text-xs text-[#F2F0E8] outline-none font-mono transition-colors"
                required
              />
              <span className="text-[10px] text-[#68716C] font-mono">
                Hint: Demo accounts use &quot;quant123&quot;
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-semibold text-xs py-2.5 rounded transition-all flex items-center justify-center space-x-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Synchronizing Live Yahoo Finance Portfolio...</span>
                </>
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In &amp; Load Live Yahoo Finance Portfolio</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Register New Customer */}
        {activeTab === "register" && (
          <form onSubmit={handleRegisterSubmit} className="p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A7ADA8]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Sahitya Sharma"
                  className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-3 py-1.5 text-xs text-[#F2F0E8] outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A7ADA8]">
                  Account Tier
                </label>
                <select
                  value={regTier}
                  onChange={(e) => setRegTier(e.target.value)}
                  className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-2.5 py-1.5 text-xs text-[#F2F0E8] outline-none transition-colors font-mono"
                >
                  <option value="PRO_QUANT">PRO_QUANT (Quant Trader)</option>
                  <option value="RETAIL_TRADER">RETAIL_TRADER (Investor)</option>
                  <option value="INSTITUTIONAL_ALPHA">INSTITUTIONAL_ALPHA (Hedge Fund)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#A7ADA8]">
                Work Email Address
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="trader@quantcopilot.ai"
                className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-3 py-1.5 text-xs text-[#F2F0E8] outline-none font-mono transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A7ADA8]">
                  Password
                </label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create secure password"
                  className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-3 py-1.5 text-xs text-[#F2F0E8] outline-none font-mono transition-colors"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#A7ADA8]">
                  Initial Cash (₹ INR)
                </label>
                <input
                  type="number"
                  value={regCapital}
                  onChange={(e) => setRegCapital(Number(e.target.value))}
                  placeholder="500000"
                  step="50000"
                  min="10000"
                  className="w-full bg-[#141A17] border border-white/[0.08] focus:border-[#159570] rounded px-3 py-1.5 text-xs text-[#F2F0E8] outline-none font-mono transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] font-semibold text-xs py-2.5 rounded transition-all flex items-center justify-center space-x-2 shadow-sm mt-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Customer Record in Custom Database...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Create Account in Custom DB &amp; Initialize Portfolio</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0A0D0C] border-t border-white/[0.065] flex items-center justify-between text-[11px] text-[#68716C]">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#159570]" />
            <span>Encrypted Custom Database (quantcopilot_db_v2)</span>
          </div>
          <span className="font-mono text-[10px]">
            Fast Yahoo Finance Engine
          </span>
        </div>

      </div>
    </div>
  );
};
