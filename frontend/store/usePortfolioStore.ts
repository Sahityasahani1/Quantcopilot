import { create } from "zustand";
import { 
  PortfolioSummary, 
  GNNRiskPayload, 
  ConnectionStatus, 
  ActiveTab, 
  MarketTicker, 
  IndianMarketTicker,
  MarketStatus,
  Position,
  PositionInput,
  OptionChainPayload,
  MarketDepth,
  GNNContagionSignal,
  CustomerProfile,
  LiveYfinanceQuote,
  CustomerAuthResponse,
  CustomerLivePortfolioResponse
} from "../types";
import { getApiBaseUrl } from "../lib/api";

const PORTFOLIO_STORAGE_KEY = "quantcopilot_user_portfolio_positions_v1";
const WATCHLIST_STORAGE_KEY = "quantcopilot_user_watchlist_v1";
const CUSTOMER_STORAGE_KEY = "quantcopilot_active_customer_v1";

interface PortfolioStoreState {
  activeTab: ActiveTab;
  connectionStatus: ConnectionStatus;
  portfolio: PortfolioSummary;
  gnnRisk: GNNRiskPayload;
  tickers: Record<string, MarketTicker>;
  indianTickers: Record<string, IndianMarketTicker>;
  marketStatus: MarketStatus | null;
  selectedSectorFilter: string;
  selectedHistorySymbol: string | null;
  selectedFnoSymbol: string;
  selectedSplitContract: string | null;
  fnoOptionChain: OptionChainPayload | null;
  fnoMarketDepth: MarketDepth | null;
  gnnContagionSignal: GNNContagionSignal | null;
  isAddPositionOpen: boolean;
  isImportModalOpen: boolean;
  
  // Custom Customer Database & Yahoo Finance Live Sync State
  currentCustomer: CustomerProfile | null;
  availableCustomers: CustomerProfile[];
  isCustomerLoginModalOpen: boolean;
  isLiveSyncing: boolean;
  lastLiveSyncTime: string | null;
  liveQuotes: Record<string, LiveYfinanceQuote>;
  
  setActiveTab: (tab: ActiveTab) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSelectedSectorFilter: (sector: string) => void;
  setSelectedHistorySymbol: (symbol: string | null) => void;
  setSelectedFnoSymbol: (symbol: string) => void;
  setSelectedSplitContract: (symbol: string | null) => void;
  setFnoOptionChain: (chain: OptionChainPayload | null) => void;
  setFnoMarketDepth: (depth: MarketDepth | null) => void;
  setGNNContagionSignal: (signal: GNNContagionSignal | null) => void;
  setIsAddPositionOpen: (open: boolean) => void;
  setIsImportModalOpen: (open: boolean) => void;
  setMarketStatus: (status: MarketStatus) => void;
  
  // Customer Auth & Sync Actions
  setIsCustomerLoginModalOpen: (open: boolean) => void;
  setCurrentCustomer: (customer: CustomerProfile | null) => void;
  fetchCustomerProfiles: () => Promise<void>;
  loginCustomer: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
  registerCustomer: (name: string, email: string, password: string, capital?: number, tier?: string) => Promise<{ success: boolean; message: string }>;
  logoutCustomer: () => void;
  refreshCustomerPortfolioLive: (customerId?: string) => Promise<void>;
  
  updatePortfolio: (summary: Partial<PortfolioSummary>) => void;
  updateGNNRisk: (payload: GNNRiskPayload) => void;
  updateTicker: (ticker: MarketTicker) => void;
  updateIndianTicker: (ticker: IndianMarketTicker) => void;
  setIndianTickers: (tickers: IndianMarketTicker[]) => void;
  fetchMarketData: () => Promise<void>;
  initLiveFeed: () => void;
  fetchFnoChain: (symbol: string, expiry?: string) => Promise<void>;
  fetchFnoDepth: (symbol: string) => Promise<void>;
  fetchGnnSignals: () => Promise<void>;
  fetchGnnRiskMetrics: () => Promise<void>;
  
  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  hydrateFromStorage: () => void;
  fetchSavedPositionsFromBackend: () => Promise<void>;

  addPosition: (pos: PositionInput) => void;
  deletePosition: (symbol: string) => void;
  clearPortfolio: () => void;
  importPortfolioPositions: (positions: PositionInput[]) => void;
}

const DEFAULT_INDIAN_TICKERS_DATA: Record<string, IndianMarketTicker> = {
  "NIFTY 50": { token: "26000", symbol: "NIFTY 50", company_name: "Nifty 50 Index", sector: "Index", exchange: "NSE", price: 22231.80, prev_close: 22603.05, open_price: 22599.05, day_high: 22599.05, day_low: 22179.90, change_24h: -1.64, change_pts: -371.25, volume_24h: 184500200, high_24h: 22599.05, low_24h: 22179.90, bid: 22231.75, ask: 22231.85, latency_ms: 1.45, type: "INDEX", pe_ratio: 23.5, market_cap_cr: 0, fifty_two_week_high: 26277.35, fifty_two_week_low: 21700.0, timestamp: Date.now() },
  "BANKNIFTY": { token: "26009", symbol: "BANKNIFTY", company_name: "Bank Nifty Index", sector: "Index", exchange: "NSE", price: 54515.05, prev_close: 55055.55, open_price: 55042.90, day_high: 55043.00, day_low: 54383.15, change_24h: -0.98, change_pts: -540.50, volume_24h: 94200150, high_24h: 55043.00, low_24h: 54383.15, bid: 54515.00, ask: 54515.10, latency_ms: 1.82, type: "INDEX", pe_ratio: 16.8, market_cap_cr: 0, fifty_two_week_high: 55490.0, fifty_two_week_low: 44300.0, timestamp: Date.now() },
  "SENSEX": { token: "1", symbol: "SENSEX", company_name: "S&P BSE Sensex Index", sector: "Index", exchange: "BSE", price: 71593.24, prev_close: 72638.70, open_price: 72668.00, day_high: 72693.97, day_low: 71327.75, change_24h: -1.44, change_pts: -1045.46, volume_24h: 124500000, high_24h: 72693.97, low_24h: 71327.75, bid: 71593.20, ask: 71593.30, latency_ms: 1.50, type: "INDEX", pe_ratio: 24.2, market_cap_cr: 0, fifty_two_week_high: 85978.25, fifty_two_week_low: 71200.0, timestamp: Date.now() },
  "RELIANCE": { token: "2885", symbol: "RELIANCE", company_name: "Reliance Industries Ltd", sector: "Energy", exchange: "NSE", price: 1178.00, prev_close: 1207.70, open_price: 1207.70, day_high: 1208.00, day_low: 1173.00, change_24h: -2.46, change_pts: -29.70, volume_24h: 13949326, high_24h: 1208.00, low_24h: 1173.00, bid: 1177.95, ask: 1178.05, latency_ms: 1.12, type: "EQUITY", pe_ratio: 28.4, market_cap_cr: 2018450, fifty_two_week_high: 1608.80, fifty_two_week_low: 1150.00, timestamp: Date.now() },
  "TCS": { token: "11536", symbol: "TCS", company_name: "Tata Consultancy Services", sector: "IT Services", exchange: "NSE", price: 2076.00, prev_close: 2080.30, open_price: 2104.00, day_high: 2141.50, day_low: 2060.00, change_24h: -0.21, change_pts: -4.30, volume_24h: 4287064, high_24h: 2141.50, low_24h: 2060.00, bid: 2075.95, ask: 2076.05, latency_ms: 1.35, type: "EQUITY", pe_ratio: 31.2, market_cap_cr: 1524100, fifty_two_week_high: 4585.90, fifty_two_week_low: 2050.00, timestamp: Date.now() },
  "HDFCBANK": { token: "1333", symbol: "HDFCBANK", company_name: "HDFC Bank Ltd", sector: "Banking", exchange: "NSE", price: 692.25, prev_close: 702.75, open_price: 705.80, day_high: 705.80, day_low: 690.50, change_24h: -1.49, change_pts: -10.50, volume_24h: 28450800, high_24h: 705.80, low_24h: 690.50, bid: 692.20, ask: 692.30, latency_ms: 1.62, type: "EQUITY", pe_ratio: 18.5, market_cap_cr: 1228900, fifty_two_week_high: 1794.00, fifty_two_week_low: 680.00, timestamp: Date.now() },
  "INFY": { token: "1594", symbol: "INFY", company_name: "Infosys Ltd", sector: "IT Services", exchange: "NSE", price: 997.00, prev_close: 992.05, open_price: 992.90, day_high: 1012.65, day_low: 992.90, change_24h: 0.50, change_pts: 4.95, volume_24h: 12150900, high_24h: 1012.65, low_24h: 992.90, bid: 996.95, ask: 997.05, latency_ms: 1.28, type: "EQUITY", pe_ratio: 26.8, market_cap_cr: 765400, fifty_two_week_high: 1991.40, fifty_two_week_low: 980.00, timestamp: Date.now() },
  "ICICIBANK": { token: "4963", symbol: "ICICIBANK", company_name: "ICICI Bank Ltd", sector: "Banking", exchange: "NSE", price: 1349.00, prev_close: 1357.50, open_price: 1357.00, day_high: 1360.80, day_low: 1340.00, change_24h: -0.63, change_pts: -8.50, volume_24h: 19450300, high_24h: 1360.80, low_24h: 1340.00, bid: 1348.95, ask: 1349.05, latency_ms: 1.41, type: "EQUITY", pe_ratio: 17.2, market_cap_cr: 827500, fifty_two_week_high: 1450.00, fifty_two_week_low: 930.00, timestamp: Date.now() },
  "TATAMOTORS": { token: "3456", symbol: "TATAMOTORS", company_name: "Tata Motors Ltd", sector: "Automotive", exchange: "NSE", price: 273.00, prev_close: 283.00, open_price: 284.35, day_high: 284.35, day_low: 273.00, change_24h: -3.53, change_pts: -10.00, volume_24h: 16200500, high_24h: 284.35, low_24h: 273.00, bid: 272.95, ask: 273.05, latency_ms: 1.75, type: "EQUITY", pe_ratio: 10.4, market_cap_cr: 383200, fifty_two_week_high: 1179.00, fifty_two_week_low: 260.00, timestamp: Date.now() },
  "SBIN": { token: "3045", symbol: "SBIN", company_name: "State Bank of India", sector: "Banking", exchange: "NSE", price: 940.00, prev_close: 954.00, open_price: 953.90, day_high: 953.90, day_low: 937.50, change_24h: -1.47, change_pts: -14.00, volume_24h: 21450600, high_24h: 953.90, low_24h: 937.50, bid: 939.90, ask: 940.10, latency_ms: 1.22, type: "EQUITY", pe_ratio: 11.2, market_cap_cr: 735800, fifty_two_week_high: 980.00, fifty_two_week_low: 543.20, timestamp: Date.now() },
  "TATASTEEL": { token: "3499", symbol: "TATASTEEL", company_name: "Tata Steel Ltd", sector: "Metals", exchange: "NSE", price: 171.96, prev_close: 175.65, open_price: 176.00, day_high: 176.50, day_low: 170.80, change_24h: -2.10, change_pts: -3.69, volume_24h: 34890200, high_24h: 176.50, low_24h: 170.80, bid: 171.90, ask: 172.00, latency_ms: 1.18, type: "EQUITY", pe_ratio: 42.1, market_cap_cr: 197800, fifty_two_week_high: 184.60, fifty_two_week_low: 114.60, timestamp: Date.now() },
  "BEL": { token: "383", symbol: "BEL", company_name: "Bharat Electronics Ltd", sector: "Defence", exchange: "NSE", price: 367.30, prev_close: 378.30, open_price: 378.00, day_high: 381.50, day_low: 366.00, change_24h: -2.91, change_pts: -11.00, volume_24h: 8900400, high_24h: 381.50, low_24h: 366.00, bid: 367.20, ask: 367.40, latency_ms: 1.25, type: "EQUITY", pe_ratio: 38.4, market_cap_cr: 298500, fifty_two_week_high: 440.00, fifty_two_week_low: 240.00, timestamp: Date.now() }
};


const calculatePortfolioMetrics = (
  positions: Position[], 
  currentTickers: Record<string, IndianMarketTicker>,
  customCash: number = 500000,
  cumulativeRealized: number = 0
): PortfolioSummary => {
  let totalInvested = 0;
  let netExposure = 0;
  let grossExposure = 0;
  let totalUnrealized = 0;
  let totalDayPnl = 0;
  let totalPositionRealized = 0;

  positions.forEach((p) => {
    const symClean = p.symbol.replace("-EQ", "");
    const marketTicker = currentTickers[symClean] || currentTickers[p.symbol];
    const markPrice = marketTicker ? marketTicker.price : p.current_price;
    const prevClose = marketTicker && marketTicker.prev_close 
      ? marketTicker.prev_close 
      : (markPrice / (1 + ((marketTicker?.change_24h || 0) / 100)));

    const mult = p.side === "LONG" ? 1 : -1;
    const leverage = p.leverage || 1.0;
    const positionInvested = p.entry_price * p.quantity;
    const positionCurrent = markPrice * p.quantity * mult * leverage;
    const positionGross = markPrice * p.quantity * leverage;
    const positionUnrealized = (markPrice - p.entry_price) * p.quantity * mult * leverage;
    const positionDayPnl = (markPrice - prevClose) * p.quantity * mult * leverage;

    totalInvested += positionInvested;
    netExposure += positionCurrent;
    grossExposure += positionGross;
    totalUnrealized += positionUnrealized;
    totalDayPnl += positionDayPnl;
    totalPositionRealized += (p.realized_pnl || 0);
  });

  const finalRealized = Number((cumulativeRealized + totalPositionRealized).toFixed(2));
  const totalEquity = Number((customCash + finalRealized + totalUnrealized).toFixed(2));
  const dailyPnl = Number(totalDayPnl.toFixed(2));
  
  const prevDayPortfolioValue = grossExposure - dailyPnl;
  const dailyPct = prevDayPortfolioValue > 0 ? Number(((dailyPnl / prevDayPortfolioValue) * 100).toFixed(2)) : 0;
  
  const marginUsage = totalEquity > 0 ? Math.min(100, Math.max(0, Number(((grossExposure / (totalEquity * 4)) * 100).toFixed(1)))) : 0;
  const var99 = Number((grossExposure * 0.028).toFixed(2));

  return {
    total_equity: totalEquity,
    realized_pnl: finalRealized,
    unrealized_pnl: Number(totalUnrealized.toFixed(2)),
    daily_pnl: dailyPnl,
    daily_pnl_percentage: dailyPct,
    net_exposure: Number(netExposure.toFixed(2)),
    margin_usage: marginUsage,
    sharpe_ratio: 2.85,
    var_99: var99,
    positions: positions.map(p => {
      const symClean = p.symbol.replace("-EQ", "");
      const marketTicker = currentTickers[symClean] || currentTickers[p.symbol];
      const curPrice = marketTicker ? marketTicker.price : p.current_price;
      const mult = p.side === "LONG" ? 1 : -1;
      return {
        ...p,
        current_price: curPrice,
        unrealized_pnl: Number(((curPrice - p.entry_price) * p.quantity * mult * (p.leverage || 1.0)).toFixed(2))
      };
    })
  };
};

const DEFAULT_WATCHLIST: string[] = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "TATAMOTORS",
  "SBIN",
  "ICICIBANK",
  "ITC"
];

const getSavedPositions = (): Position[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }
  return [];
};

const getSavedWatchlist = (): string[] => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return DEFAULT_WATCHLIST;
};

const saveWatchlist = (watchlist: string[]) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch {}
  }
};

const getSavedAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    try {
      const custStr = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (custStr) {
        const cust = JSON.parse(custStr);
        return cust.auth_token || null;
      }
    } catch {}
  }
  return null;
};

const syncPositionsToBackend = async (positions: Position[], customerId?: string) => {
  if (typeof window === "undefined") return;
  try {
    const baseUrl = getApiBaseUrl();
    const endpoint = customerId 
      ? `${baseUrl}/api/v1/portfolio/customer/${customerId}/sync-positions`
      : `${baseUrl}/api/v1/portfolio/sync-positions`;

    const token = getSavedAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        positions: positions.map(p => ({
          symbol: p.symbol,
          quantity: p.quantity,
          entry_price: p.entry_price,
          current_price: p.current_price,
          unrealized_pnl: p.unrealized_pnl,
          realized_pnl: p.realized_pnl,
          side: p.side,
          leverage: p.leverage
        }))
      })
    });
  } catch {}
};

const savePositions = (positions: Position[], customerId?: string) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(positions));
    } catch {}
  }
  syncPositionsToBackend(positions, customerId);
};

let liveFeedSocket: WebSocket | null = null;
let reconnectTimer: any = null;

export const usePortfolioStore = create<PortfolioStoreState>((set, get) => ({
  activeTab: "fno_terminal",
  connectionStatus: "CONNECTED",
  selectedSectorFilter: "ALL",
  selectedHistorySymbol: null,
  selectedFnoSymbol: "NIFTY 50",
  selectedSplitContract: null,
  fnoOptionChain: null,
  fnoMarketDepth: null,
  gnnContagionSignal: null,
  isAddPositionOpen: false,
  isImportModalOpen: false,
  marketStatus: null,
  watchlist: DEFAULT_WATCHLIST,
  
  // Custom Customer Database & Yahoo Finance State
  currentCustomer: null,
  availableCustomers: [],
  isCustomerLoginModalOpen: false,
  isLiveSyncing: false,
  lastLiveSyncTime: null,
  liveQuotes: {},

  portfolio: calculatePortfolioMetrics([], DEFAULT_INDIAN_TICKERS_DATA),
  
  gnnRisk: {
    timestamp: new Date().toISOString(),
    overall_system_risk: 0.28,
    regime_classification: "HISTORICAL_RETURNS_CORRELATION_REGIME",
    nodes: [
      { node_id: "0", asset_name: "RELIANCE", company_name: "Reliance Industries Ltd", sector: "Energy", risk_score: 0.28, centrality: 0.92, systemic_contagion_factor: 0.72, features: [0.015, 1.25, 0.92, 0.95] },
      { node_id: "1", asset_name: "TCS", company_name: "Tata Consultancy Services", sector: "IT Services", risk_score: 0.22, centrality: 0.85, systemic_contagion_factor: 0.58, features: [0.012, 1.10, 0.85, 0.88] },
      { node_id: "2", asset_name: "HDFCBANK", company_name: "HDFC Bank Ltd", sector: "Banking", risk_score: 0.35, centrality: 0.94, systemic_contagion_factor: 0.81, features: [0.018, 1.42, 0.94, 0.91] },
      { node_id: "3", asset_name: "INFY", company_name: "Infosys Ltd", sector: "IT Services", risk_score: 0.24, centrality: 0.82, systemic_contagion_factor: 0.60, features: [0.013, 1.15, 0.82, 0.85] },
      { node_id: "4", asset_name: "ICICIBANK", company_name: "ICICI Bank Ltd", sector: "Banking", risk_score: 0.31, centrality: 0.89, systemic_contagion_factor: 0.76, features: [0.016, 1.35, 0.89, 0.89] },
      { node_id: "5", asset_name: "TATAMOTORS", company_name: "Tata Motors Ltd", sector: "Automotive", risk_score: 0.42, centrality: 0.78, systemic_contagion_factor: 0.68, features: [0.022, 1.65, 0.78, 0.82] },
      { node_id: "6", asset_name: "SBIN", company_name: "State Bank of India", sector: "Banking", risk_score: 0.38, centrality: 0.88, systemic_contagion_factor: 0.79, features: [0.019, 1.50, 0.88, 0.86] },
      { node_id: "7", asset_name: "ITC", company_name: "ITC Ltd", sector: "FMCG", risk_score: 0.18, centrality: 0.71, systemic_contagion_factor: 0.45, features: [0.009, 0.88, 0.71, 0.78] }
    ],
    adjacency_matrix: [
      [1.0, 0.65, 0.82, 0.58, 0.79, 0.52, 0.74, 0.48],
      [0.65, 1.0, 0.61, 0.88, 0.59, 0.44, 0.55, 0.42],
      [0.82, 0.61, 1.0, 0.55, 0.89, 0.58, 0.84, 0.51],
      [0.58, 0.88, 0.55, 1.0, 0.54, 0.41, 0.50, 0.39],
      [0.79, 0.59, 0.89, 0.54, 1.0, 0.55, 0.81, 0.49],
      [0.52, 0.44, 0.58, 0.41, 0.55, 1.0, 0.62, 0.46],
      [0.74, 0.55, 0.84, 0.50, 0.81, 0.62, 1.0, 0.53],
      [0.48, 0.42, 0.51, 0.39, 0.49, 0.46, 0.53, 1.0]
    ]
  },
  
  tickers: {},
  indianTickers: DEFAULT_INDIAN_TICKERS_DATA,
  
  setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),
  setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),
  setSelectedSectorFilter: (sector: string) => set({ selectedSectorFilter: sector }),
  setSelectedHistorySymbol: (symbol: string | null) => set({ selectedHistorySymbol: symbol }),
  setSelectedFnoSymbol: (symbol: string) => set({ selectedFnoSymbol: symbol }),
  setSelectedSplitContract: (symbol: string | null) => set({ selectedSplitContract: symbol }),
  setFnoOptionChain: (chain: OptionChainPayload | null) => set({ fnoOptionChain: chain }),
  setFnoMarketDepth: (depth: MarketDepth | null) => set({ fnoMarketDepth: depth }),
  setGNNContagionSignal: (signal: GNNContagionSignal | null) => set({ gnnContagionSignal: signal }),
  setIsAddPositionOpen: (open: boolean) => set({ isAddPositionOpen: open }),
  setIsImportModalOpen: (open: boolean) => set({ isImportModalOpen: open }),
  setMarketStatus: (status: MarketStatus) => set({ marketStatus: status }),
  
  // Custom Customer Actions
  setIsCustomerLoginModalOpen: (open: boolean) => set({ isCustomerLoginModalOpen: open }),
  setCurrentCustomer: (customer: CustomerProfile | null) => set({ currentCustomer: customer }),

  fetchCustomerProfiles: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/portfolio/customer/profiles`);
      if (res.ok) {
        const data: CustomerProfile[] = await res.json();
        set({ availableCustomers: data });
      }
    } catch (err) {
      console.warn("Failed to fetch customer profiles:", err);
    }
  },

  loginCustomer: async (identifier: string, password: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/portfolio/customer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password })
      });
      const data: CustomerAuthResponse = await res.json();
      
      if (res.ok && data.customer && data.portfolio) {
        const custWithToken: CustomerProfile = {
          ...data.customer,
          auth_token: data.auth_token || data.customer.auth_token
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(custWithToken));
          localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(data.portfolio.positions));
        }
        set({
          currentCustomer: custWithToken,
          portfolio: data.portfolio,
          liveQuotes: data.live_quotes || {},
          lastLiveSyncTime: new Date().toLocaleTimeString(),
          isCustomerLoginModalOpen: false
        });
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Authentication failed" };
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Failed to reach backend server" };
    }
  },

  registerCustomer: async (name: string, email: string, password: string, capital: number = 500000, tier: string = "PRO_QUANT") => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/portfolio/customer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, initial_capital: capital, account_tier: tier })
      });
      const data: CustomerAuthResponse = await res.json();
      
      if (res.ok && data.customer) {
        const custWithToken: CustomerProfile = {
          ...data.customer,
          auth_token: data.auth_token || data.customer.auth_token
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(custWithToken));
          if (data.portfolio) {
            localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(data.portfolio.positions));
          }
        }
        set({
          currentCustomer: custWithToken,
          portfolio: data.portfolio || calculatePortfolioMetrics([], get().indianTickers, capital, 0),
          isCustomerLoginModalOpen: false
        });
        get().fetchCustomerProfiles();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || "Registration failed" };
      }
    } catch (err: any) {
      return { success: false, message: err.message || "Registration connection error" };
    }
  },

  logoutCustomer: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
      localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
    }
    set({
      currentCustomer: null,
      portfolio: calculatePortfolioMetrics([], get().indianTickers),
      liveQuotes: {}
    });
  },

  refreshCustomerPortfolioLive: async (customerId?: string) => {
    const cid = customerId || get().currentCustomer?.customer_id || "cust_sahitya";
    set({ isLiveSyncing: true });
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/portfolio/customer/${cid}/live?refresh_live=true`);
      if (res.ok) {
        const data: CustomerLivePortfolioResponse = await res.json();
        set((state) => ({
          currentCustomer: state.currentCustomer ? { ...state.currentCustomer, total_equity: data.summary.total_equity, cash_balance: data.customer.cash_balance } : data.customer,
          portfolio: data.summary,
          liveQuotes: data.live_quotes,
          lastLiveSyncTime: new Date().toLocaleTimeString(),
          isLiveSyncing: false
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(data.summary.positions));
        }
      }
    } catch (err) {
      console.warn("Failed to refresh live customer portfolio:", err);
    } finally {
      set({ isLiveSyncing: false });
    }
  },

  updatePortfolio: (summary: Partial<PortfolioSummary>) =>
    set((state) => ({ portfolio: { ...state.portfolio, ...summary } })),
  updateGNNRisk: (payload: GNNRiskPayload) => set({ gnnRisk: payload }),
  updateTicker: (ticker: MarketTicker) =>
    set((state) => ({ tickers: { ...state.tickers, [ticker.symbol]: ticker } })),
  
  updateIndianTicker: (ticker: IndianMarketTicker) => {
    set((state) => {
      const symClean = ticker.symbol.replace("-EQ", "");
      const normalised = { ...ticker, symbol: symClean };
      const updatedMap = { ...state.indianTickers, [symClean]: normalised };
      const cash = state.currentCustomer ? state.currentCustomer.cash_balance : 500000;
      const updatedPortfolio = calculatePortfolioMetrics(state.portfolio.positions, updatedMap, cash, state.portfolio.realized_pnl || 0);
      return { 
        indianTickers: updatedMap,
        portfolio: updatedPortfolio
      };
    });
  },
  
  setIndianTickers: (tickers: IndianMarketTicker[]) => {
    set((state) => {
      const map: Record<string, IndianMarketTicker> = {};
      tickers.forEach((t) => {
        const symClean = t.symbol.replace("-EQ", "");
        map[symClean] = { ...t, symbol: symClean };
      });
      const cash = state.currentCustomer ? state.currentCustomer.cash_balance : 500000;
      const updatedPortfolio = calculatePortfolioMetrics(state.portfolio.positions, map, cash, state.portfolio.realized_pnl || 0);
      return { 
        indianTickers: map,
        portfolio: updatedPortfolio
      };
    });
  },

  fetchMarketData: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      let res = await fetch(`${baseUrl}/api/v1/nse/tickers`);
      if (!res.ok) {
        res = await fetch(`${baseUrl}/api/v1/market/tickers`);
      }
      if (res.ok) {
        const data = await res.json();
        if (data.tickers && Array.isArray(data.tickers)) {
          get().setIndianTickers(data.tickers);
        }
        if (data.market_status) {
          get().setMarketStatus(data.market_status);
        }
      }
    } catch {}
  },

  initLiveFeed: () => {
    if (typeof window === "undefined") return;
    if (liveFeedSocket && (liveFeedSocket.readyState === WebSocket.OPEN || liveFeedSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = getApiBaseUrl().replace(/^http/, "ws") + "/ws/live-feed";
    
    try {
      liveFeedSocket = new WebSocket(wsUrl);

      liveFeedSocket.onopen = () => {
        set({ connectionStatus: "CONNECTED" });
      };

      liveFeedSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "INITIAL_SNAPSHOT" && Array.isArray(msg.tickers)) {
            get().setIndianTickers(msg.tickers);
          } else if (msg.type === "TICK" || msg.event === "TICK") {
            const tickData = msg.ticker || msg.data;
            if (tickData) {
              get().updateIndianTicker(tickData);
            }
          } else if (msg.type === "MARKET_STATUS" || msg.event === "MARKET_STATUS" || msg.type === "HEARTBEAT") {
            const statusData = msg.market_status || msg.data;
            if (statusData) {
              get().setMarketStatus(statusData);
            }
          }
        } catch {}
      };

      liveFeedSocket.onclose = () => {
        set({ connectionStatus: "DISCONNECTED" });
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          get().initLiveFeed();
        }, 5000);
      };

      liveFeedSocket.onerror = () => {
        set({ connectionStatus: "ERROR" });
      };
    } catch {
      set({ connectionStatus: "ERROR" });
    }
  },

  fetchFnoChain: async (symbol: string, expiry?: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const query = expiry ? `?expiry=${encodeURIComponent(expiry)}` : "";
      const res = await fetch(`${baseUrl}/api/v1/fno/option-chain/${encodeURIComponent(symbol)}${query}`);
      if (res.ok) {
        const data = await res.json();
        set({ fnoOptionChain: data });
      }
    } catch {}
  },

  fetchFnoDepth: async (symbol: string) => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/fno/depth/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        set({ fnoMarketDepth: data });
      }
    } catch {}
  },

  fetchGnnSignals: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/fno/gnn-contagion-signals`);
      if (res.ok) {
        const data = await res.json();
        set({ gnnContagionSignal: data });
      }
    } catch {}
  },

  fetchGnnRiskMetrics: async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/portfolio/risk/gnn-metrics`);
      if (res.ok) {
        const data = await res.json();
        set({ gnnRisk: data });
      }
    } catch {}
  },

  addPosition: (pos: PositionInput) => {
    if (!pos || !pos.symbol || !pos.quantity || pos.quantity <= 0 || !pos.entry_price || pos.entry_price <= 0) {
      return;
    }
    const custId = get().currentCustomer?.customer_id;
    set((state) => {
      const symClean = pos.symbol.trim().toUpperCase().replace("-EQ", "");
      const ticker = state.indianTickers[symClean] || state.indianTickers[pos.symbol];
      const curPrice = ticker ? ticker.price : pos.entry_price;
      const leverage = Math.max(1.0, pos.leverage || 1.0);
      const side = (pos.side || "LONG").toUpperCase() as "LONG" | "SHORT";

      // Match existing position for this symbol
      const existingIdx = state.portfolio.positions.findIndex(
        p => p.symbol.trim().toUpperCase().replace("-EQ", "") === symClean
      );

      let updatedPositions = [...state.portfolio.positions];
      let cumulativeRealized = state.portfolio.realized_pnl || 0;

      if (existingIdx === -1) {
        // Brand new position
        const mult = side === "LONG" ? 1 : -1;
        const pnl = Number(((curPrice - pos.entry_price) * pos.quantity * mult * leverage).toFixed(2));
        const newPos: Position = {
          symbol: symClean,
          quantity: pos.quantity,
          entry_price: pos.entry_price,
          current_price: curPrice,
          unrealized_pnl: pnl,
          realized_pnl: 0,
          side: side,
          leverage: leverage
        };
        updatedPositions = [newPos, ...updatedPositions];
      } else {
        const existing = updatedPositions[existingIdx];

        if (existing.side === side) {
          // Adding to position in the same direction: safe weighted average entry price
          const totalQty = existing.quantity + pos.quantity;
          const avgEntry = totalQty > 0
            ? Number((((existing.entry_price * existing.quantity) + (pos.entry_price * pos.quantity)) / totalQty).toFixed(2))
            : pos.entry_price;
          const mult = side === "LONG" ? 1 : -1;
          const updatedPnl = Number(((curPrice - avgEntry) * totalQty * mult * leverage).toFixed(2));

          updatedPositions[existingIdx] = {
            ...existing,
            quantity: totalQty,
            entry_price: avgEntry,
            current_price: curPrice,
            unrealized_pnl: updatedPnl,
            leverage: leverage
          };
        } else {
          // Opposing side: position netting / closing / flipping
          const mult = existing.side === "LONG" ? 1 : -1;
          const closedQty = Math.min(existing.quantity, pos.quantity);
          const realizedDelta = Number(((pos.entry_price - existing.entry_price) * closedQty * mult * (existing.leverage || 1.0)).toFixed(2));

          if (pos.quantity < existing.quantity) {
            // Partial close (trim)
            const remainingQty = existing.quantity - pos.quantity;
            const updatedUnrealized = Number(((curPrice - existing.entry_price) * remainingQty * mult * (existing.leverage || 1.0)).toFixed(2));
            updatedPositions[existingIdx] = {
              ...existing,
              quantity: remainingQty,
              current_price: curPrice,
              unrealized_pnl: updatedUnrealized,
              realized_pnl: Number(((existing.realized_pnl || 0) + realizedDelta).toFixed(2))
            };
          } else if (pos.quantity === existing.quantity) {
            // Full close: remove position and fold all realized P&L into cumulative
            cumulativeRealized = Number((cumulativeRealized + (existing.realized_pnl || 0) + realizedDelta).toFixed(2));
            updatedPositions = updatedPositions.filter((_, idx) => idx !== existingIdx);
          } else {
            // Position flip: close old position, open leftover quantity in new direction
            cumulativeRealized = Number((cumulativeRealized + (existing.realized_pnl || 0) + realizedDelta).toFixed(2));
            const excessQty = pos.quantity - existing.quantity;
            const newMult = side === "LONG" ? 1 : -1;
            const newPnl = Number(((curPrice - pos.entry_price) * excessQty * newMult * leverage).toFixed(2));

            updatedPositions[existingIdx] = {
              symbol: symClean,
              quantity: excessQty,
              entry_price: pos.entry_price,
              current_price: curPrice,
              unrealized_pnl: newPnl,
              realized_pnl: 0,
              side: side,
              leverage: leverage
            };
          }
        }
      }

      savePositions(updatedPositions, custId);

      const cash = state.currentCustomer ? state.currentCustomer.cash_balance : 500000;
      return {
        portfolio: calculatePortfolioMetrics(updatedPositions, state.indianTickers, cash, cumulativeRealized)
      };
    });
  },

  deletePosition: (symbol: string) => {
    const custId = get().currentCustomer?.customer_id;
    const cleanSym = symbol.trim().toUpperCase().replace("-EQ", "");
    set((state) => {
      const deleted = state.portfolio.positions.find(
        p => p.symbol.trim().toUpperCase().replace("-EQ", "") === cleanSym
      );
      const retainedRealized = deleted ? (deleted.realized_pnl || 0) : 0;
      const newCumulativeRealized = Number(((state.portfolio.realized_pnl || 0) + retainedRealized).toFixed(2));
      const filtered = state.portfolio.positions.filter(
        p => p.symbol.trim().toUpperCase().replace("-EQ", "") !== cleanSym
      );
      savePositions(filtered, custId);

      if (custId) {
        const baseUrl = getApiBaseUrl();
        const token = getSavedAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        fetch(`${baseUrl}/api/v1/portfolio/customer/${custId}/positions/${cleanSym}`, { method: "DELETE", headers }).catch(() => {});
      } else {
        const baseUrl = getApiBaseUrl();
        fetch(`${baseUrl}/api/v1/portfolio/positions/${cleanSym}`, { method: "DELETE" }).catch(() => {});
      }

      const cash = state.currentCustomer ? state.currentCustomer.cash_balance : 500000;
      return {
        portfolio: calculatePortfolioMetrics(filtered, state.indianTickers, cash, newCumulativeRealized)
      };
    });
  },

  clearPortfolio: () => {
    const custId = get().currentCustomer?.customer_id;
    savePositions([], custId);

    if (custId) {
      const baseUrl = getApiBaseUrl();
      const token = getSavedAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch(`${baseUrl}/api/v1/portfolio/customer/${custId}/clear`, { method: "POST", headers }).catch(() => {});
    } else {
      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/api/v1/portfolio/positions/clear`, { method: "POST" }).catch(() => {});
    }

    set((state) => {
      const cash = state.currentCustomer ? state.currentCustomer.cash_balance : 500000;
      return {
        portfolio: calculatePortfolioMetrics([], state.indianTickers, cash, 0)
      };
    });
  },

  importPortfolioPositions: (imported: PositionInput[]) => {
    const custId = get().currentCustomer?.customer_id;
    set((state) => {
      const valid = imported.filter(pos => pos && pos.symbol && pos.quantity > 0 && pos.entry_price > 0);
      const newPositions: Position[] = valid.map(pos => {
        const symClean = pos.symbol.trim().toUpperCase().replace("-EQ", "");
        const ticker = state.indianTickers[symClean] || state.indianTickers[pos.symbol];
        const curPrice = ticker ? ticker.price : pos.entry_price;
        const leverage = Math.max(1.0, pos.leverage || 1.0);
        const side = (pos.side || "LONG").toUpperCase() as "LONG" | "SHORT";
        const mult = side === "LONG" ? 1 : -1;
        const pnl = Number(((curPrice - pos.entry_price) * pos.quantity * mult * leverage).toFixed(2));
        return {
          symbol: symClean,
          quantity: pos.quantity,
          entry_price: pos.entry_price,
          current_price: curPrice,
          unrealized_pnl: pnl,
          realized_pnl: 0,
          side: side,
          leverage: leverage
        };
      });

      savePositions(newPositions, custId);

      const cash = state.currentCustomer ? state.currentCustomer.cash_balance : 500000;
      return {
        portfolio: calculatePortfolioMetrics(newPositions, state.indianTickers, cash, 0)
      };
    });
  },

  addToWatchlist: (symbol: string) => {
    const clean = symbol.trim().toUpperCase().replace("-EQ", "");
    set((state) => {
      if (state.watchlist.includes(clean)) return state;
      const updated = [clean, ...state.watchlist];
      saveWatchlist(updated);
      return { watchlist: updated };
    });
  },

  removeFromWatchlist: (symbol: string) => {
    const clean = symbol.trim().toUpperCase().replace("-EQ", "");
    set((state) => {
      const updated = state.watchlist.filter(s => s !== clean);
      saveWatchlist(updated);
      return { watchlist: updated };
    });
  },

  hydrateFromStorage: () => {
    if (typeof window !== "undefined") {
      const savedWatchlist = getSavedWatchlist();
      set({ watchlist: savedWatchlist });

      // Fetch customer profiles list
      get().fetchCustomerProfiles();

      // Check if user previously logged in
      const savedCustStr = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (savedCustStr) {
        try {
          const parsedCust: CustomerProfile = JSON.parse(savedCustStr);
          set({ currentCustomer: parsedCust });
          get().refreshCustomerPortfolioLive(parsedCust.customer_id);
          return;
        } catch {}
      }

      // Default initial load: pull default customer portfolio with live quotes
      get().refreshCustomerPortfolioLive("cust_sahitya");
    }
  },

  fetchSavedPositionsFromBackend: async () => {
    try {
      const custId = get().currentCustomer?.customer_id || "cust_sahitya";
      await get().refreshCustomerPortfolioLive(custId);
    } catch {}
  }
}));
