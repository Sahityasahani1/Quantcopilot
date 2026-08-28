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
  GNNContagionSignal
} from "../types";

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
  
  addPosition: (pos: PositionInput) => void;
  deletePosition: (symbol: string) => void;
  clearPortfolio: () => void;
  importPortfolioPositions: (positions: PositionInput[]) => void;
}

const DEFAULT_INDIAN_TICKERS_DATA: Record<string, IndianMarketTicker> = {
  "NIFTY 50": { token: "26000", symbol: "NIFTY 50", company_name: "Nifty 50 Index", sector: "Index", exchange: "NSE", price: 24144.10, prev_close: 24052.25, open_price: 24100.00, day_high: 24410.00, day_low: 24139.75, change_24h: -0.31, change_pts: -74.95, volume_24h: 184500200, high_24h: 24410.00, low_24h: 24139.75, bid: 24144.00, ask: 24144.50, latency_ms: 1.45, type: "INDEX", pe_ratio: 23.5, market_cap_cr: 0, fifty_two_week_high: 24900.0, fifty_two_week_low: 21700.0, timestamp: Date.now() },
  "BANKNIFTY": { token: "26009", symbol: "BANKNIFTY", company_name: "Bank Nifty Index", sector: "Index", exchange: "NSE", price: 50820.25, prev_close: 50376.90, open_price: 50450.00, day_high: 51100.00, day_low: 50650.00, change_24h: 0.88, change_pts: 443.35, volume_24h: 94200150, high_24h: 51100.00, low_24h: 50650.00, bid: 50819.50, ask: 50821.00, latency_ms: 1.82, type: "INDEX", pe_ratio: 16.8, market_cap_cr: 0, fifty_two_week_high: 53200.0, fifty_two_week_low: 44300.0, timestamp: Date.now() },
  "SENSEX": { token: "1", symbol: "SENSEX", company_name: "S&P BSE Sensex Index", sector: "Index", exchange: "BSE", price: 77204.66, prev_close: 78981.35, open_price: 79100.00, day_high: 80120.00, day_low: 76950.00, change_24h: -0.21, change_pts: -164.45, volume_24h: 124500000, high_24h: 80120.00, low_24h: 76950.00, bid: 77204.00, ask: 77205.00, latency_ms: 1.50, type: "INDEX", pe_ratio: 24.2, market_cap_cr: 0, fifty_two_week_high: 81500.0, fifty_two_week_low: 71200.0, timestamp: Date.now() },
  "RELIANCE": { token: "2885", symbol: "RELIANCE", company_name: "Reliance Industries Ltd", sector: "Energy", exchange: "NSE", price: 2985.40, prev_close: 2922.55, open_price: 2930.00, day_high: 3010.00, day_low: 2940.00, change_24h: 2.15, change_pts: 62.85, volume_24h: 14200450, high_24h: 3010.00, low_24h: 2940.00, bid: 2985.00, ask: 2985.50, latency_ms: 1.12, type: "EQUITY", pe_ratio: 28.4, market_cap_cr: 2018450, fifty_two_week_high: 3217.9, fifty_two_week_low: 2220.3, timestamp: Date.now() },
  "TCS": { token: "11536", symbol: "TCS", company_name: "Tata Consultancy Services", sector: "IT Services", exchange: "NSE", price: 4210.80, prev_close: 4229.85, open_price: 4235.00, day_high: 4260.00, day_low: 4190.00, change_24h: -0.45, change_pts: -19.05, volume_24h: 6120400, high_24h: 4260.00, low_24h: 4190.00, bid: 4210.50, ask: 4211.00, latency_ms: 1.35, type: "EQUITY", pe_ratio: 31.2, market_cap_cr: 1524100, fifty_two_week_high: 4585.9, fifty_two_week_low: 3312.0, timestamp: Date.now() },
  "HDFCBANK": { token: "1333", symbol: "HDFCBANK", company_name: "HDFC Bank Ltd", sector: "Banking", exchange: "NSE", price: 1612.30, prev_close: 1586.12, open_price: 1590.00, day_high: 1625.00, day_low: 1590.00, change_24h: 1.65, change_pts: 26.18, volume_24h: 28450800, high_24h: 1625.00, low_24h: 1590.00, bid: 1612.00, ask: 1612.50, latency_ms: 1.62, type: "EQUITY", pe_ratio: 18.5, market_cap_cr: 1228900, fifty_two_week_high: 1794.0, fifty_two_week_low: 1363.5, timestamp: Date.now() },
  "INFY": { token: "1594", symbol: "INFY", company_name: "Infosys Ltd", sector: "IT Services", exchange: "NSE", price: 1845.60, prev_close: 1828.78, open_price: 1832.00, day_high: 1865.00, day_low: 1830.00, change_24h: 0.92, change_pts: 16.82, volume_24h: 12150900, high_24h: 1865.00, low_24h: 1830.00, bid: 1845.00, ask: 1846.00, latency_ms: 1.28, type: "EQUITY", pe_ratio: 26.8, market_cap_cr: 765400, fifty_two_week_high: 1991.4, fifty_two_week_low: 1355.0, timestamp: Date.now() },
  "ICICIBANK": { token: "4963", symbol: "ICICIBANK", company_name: "ICICI Bank Ltd", sector: "Banking", exchange: "NSE", price: 1178.90, prev_close: 1165.50, open_price: 1168.00, day_high: 1190.00, day_low: 1165.00, change_24h: 1.15, change_pts: 13.40, volume_24h: 19450300, high_24h: 1190.00, low_24h: 1165.00, bid: 1178.50, ask: 1179.00, latency_ms: 1.41, type: "EQUITY", pe_ratio: 17.2, market_cap_cr: 827500, fifty_two_week_high: 1257.8, fifty_two_week_low: 930.0, timestamp: Date.now() },
  "TATAMOTORS": { token: "3456", symbol: "TATAMOTORS", company_name: "Tata Motors Ltd", sector: "Automotive", exchange: "NSE", price: 1042.15, prev_close: 1053.74, open_price: 1055.00, day_high: 1060.00, day_low: 1035.00, change_24h: -1.10, change_pts: -11.59, volume_24h: 16200500, high_24h: 1060.00, low_24h: 1035.00, bid: 1042.00, ask: 1042.50, latency_ms: 1.75, type: "EQUITY", pe_ratio: 10.4, market_cap_cr: 383200, fifty_two_week_high: 1179.0, fifty_two_week_low: 593.5, timestamp: Date.now() },
  "SBIN": { token: "3045", symbol: "SBIN", company_name: "State Bank of India", sector: "Banking", exchange: "NSE", price: 824.50, prev_close: 818.36, open_price: 820.00, day_high: 835.00, day_low: 818.00, change_24h: 0.75, change_pts: 6.14, volume_24h: 21450600, high_24h: 835.00, low_24h: 818.00, bid: 824.00, ask: 824.80, latency_ms: 1.22, type: "EQUITY", pe_ratio: 11.2, market_cap_cr: 735800, fifty_two_week_high: 912.0, fifty_two_week_low: 543.2, timestamp: Date.now() },
  "TATASTEEL": { token: "3499", symbol: "TATASTEEL", company_name: "Tata Steel Ltd", sector: "Metals", exchange: "NSE", price: 184.09, prev_close: 186.30, open_price: 185.00, day_high: 188.00, day_low: 183.50, change_24h: -1.19, change_pts: -2.21, volume_24h: 34890200, high_24h: 188.00, low_24h: 183.50, bid: 184.05, ask: 184.15, latency_ms: 1.18, type: "EQUITY", pe_ratio: 42.1, market_cap_cr: 197800, fifty_two_week_high: 184.6, fifty_two_week_low: 114.6, timestamp: Date.now() },
  "BEL": { token: "383", symbol: "BEL", company_name: "Bharat Electronics Ltd", sector: "Defence", exchange: "NSE", price: 408.55, prev_close: 409.00, open_price: 409.50, day_high: 412.00, day_low: 406.00, change_24h: 0.11, change_pts: 0.45, volume_24h: 8900400, high_24h: 412.00, low_24h: 406.00, bid: 408.50, ask: 408.60, latency_ms: 1.25, type: "EQUITY", pe_ratio: 38.4, market_cap_cr: 298500, fifty_two_week_high: 440.0, fifty_two_week_low: 240.0, timestamp: Date.now() }
};

const calculatePortfolioMetrics = (positions: Position[], currentTickers: Record<string, IndianMarketTicker>): PortfolioSummary => {
  let totalInvested = 0;
  let totalCurrent = 0;
  let totalDayPnl = 0;

  positions.forEach((p) => {
    const symClean = p.symbol.replace("-EQ", "");
    const marketTicker = currentTickers[symClean] || currentTickers[p.symbol];
    const markPrice = marketTicker ? marketTicker.price : p.current_price;
    const prevClose = marketTicker && marketTicker.prev_close 
      ? marketTicker.prev_close 
      : (markPrice / (1 + ((marketTicker?.change_24h || 0) / 100)));

    const mult = p.side === "LONG" ? 1 : -1;
    const positionInvested = p.entry_price * p.quantity;
    const positionCurrent = markPrice * p.quantity * mult * (p.leverage || 1.0);
    const positionDayPnl = (markPrice - prevClose) * p.quantity * mult * (p.leverage || 1.0);

    totalInvested += positionInvested;
    totalCurrent += positionCurrent;
    totalDayPnl += positionDayPnl;
  });

  const baseCash = 500000;
  const totalUnrealized = totalCurrent - totalInvested;
  const totalEquity = Number((baseCash + totalCurrent).toFixed(2));
  const dailyPnl = Number(totalDayPnl.toFixed(2));
  
  const prevDayPortfolioValue = totalCurrent - dailyPnl;
  const dailyPct = prevDayPortfolioValue > 0 ? Number(((dailyPnl / prevDayPortfolioValue) * 100).toFixed(2)) : 0;
  
  const marginUsage = totalEquity > 0 ? Math.min(100, Number(((totalCurrent / (totalEquity * 4)) * 100).toFixed(1))) : 0;
  const var99 = Number((totalCurrent * 0.028).toFixed(2));

  return {
    total_equity: totalEquity,
    realized_pnl: 13200.0,
    unrealized_pnl: Number(totalUnrealized.toFixed(2)),
    daily_pnl: dailyPnl,
    daily_pnl_percentage: dailyPct,
    net_exposure: Number(totalCurrent.toFixed(2)),
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

const INITIAL_POSITIONS: Position[] = [
  { symbol: "RELIANCE", quantity: 100, entry_price: 2880.0, current_price: 2985.40, unrealized_pnl: 10540.0, realized_pnl: 4500.0, side: "LONG", leverage: 1.0 },
  { symbol: "TCS", quantity: 50, entry_price: 4120.0, current_price: 4210.80, unrealized_pnl: 4540.0, realized_pnl: 3200.0, side: "LONG", leverage: 1.0 },
  { symbol: "HDFCBANK", quantity: 150, entry_price: 1550.0, current_price: 1612.30, unrealized_pnl: 9345.0, realized_pnl: 2800.0, side: "LONG", leverage: 1.0 },
  { symbol: "INFY", quantity: 120, entry_price: 1780.0, current_price: 1845.60, unrealized_pnl: 7872.0, realized_pnl: 1500.0, side: "LONG", leverage: 1.0 },
  { symbol: "TATAMOTORS", quantity: 200, entry_price: 990.0, current_price: 1042.15, unrealized_pnl: 10430.0, realized_pnl: 0.0, side: "LONG", leverage: 1.0 },
  { symbol: "SBIN", quantity: 250, entry_price: 790.0, current_price: 824.50, unrealized_pnl: 8625.0, realized_pnl: 1200.0, side: "LONG", leverage: 1.0 }
];

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
  
  portfolio: calculatePortfolioMetrics(INITIAL_POSITIONS, DEFAULT_INDIAN_TICKERS_DATA),
  
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
      const updatedPortfolio = calculatePortfolioMetrics(state.portfolio.positions, updatedMap);
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
      const updatedPortfolio = calculatePortfolioMetrics(state.portfolio.positions, map);
      return { 
        indianTickers: map,
        portfolio: updatedPortfolio
      };
    });
  },

  fetchMarketData: async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/nse/tickers");
      if (res.ok) {
        const data = await res.json();
        if (data.market_status) {
          get().setMarketStatus(data.market_status);
        }
        if (data.tickers && data.tickers.length > 0) {
          get().setIndianTickers(data.tickers);
        }
      }
    } catch {}
  },

  initLiveFeed: () => {
    if (typeof window === "undefined") return;
    if (liveFeedSocket && (liveFeedSocket.readyState === WebSocket.OPEN || liveFeedSocket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    get().setConnectionStatus("CONNECTING");

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      const wsUrl = `${protocol}//${host}:8000/ws/live-feed`;

      liveFeedSocket = new WebSocket(wsUrl);

      liveFeedSocket.onopen = () => {
        get().setConnectionStatus("CONNECTED");
      };

      liveFeedSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "INITIAL_SNAPSHOT" && Array.isArray(data.tickers)) {
            get().setIndianTickers(data.tickers);
          } else if (data.type === "TICK" && data.ticker) {
            get().updateIndianTicker(data.ticker);
          }
        } catch {}
      };

      liveFeedSocket.onerror = () => {
        get().setConnectionStatus("ERROR");
      };

      liveFeedSocket.onclose = () => {
        get().setConnectionStatus("DISCONNECTED");
        liveFeedSocket = null;
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            get().initLiveFeed();
          }, 5000);
        }
      };
    } catch {
      get().setConnectionStatus("ERROR");
    }
  },

  fetchFnoChain: async (symbol: string, expiry: string = "28-AUG-2026") => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/fno/chain/${encodeURIComponent(symbol)}?expiry=${expiry}`);
      if (res.ok) {
        const data = await res.json();
        get().setFnoOptionChain(data);
      }
    } catch {}
  },

  fetchFnoDepth: async (symbol: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/fno/depth/${encodeURIComponent(symbol)}`);
      if (res.ok) {
        const data = await res.json();
        get().setFnoMarketDepth(data);
      }
    } catch {}
  },

  fetchGnnSignals: async () => {
    try {
      const res = await fetch("http://localhost:8000/api/v1/fno/gnn-signals");
      if (res.ok) {
        const data = await res.json();
        get().setGNNContagionSignal(data);
      }
    } catch {}
  },

  addPosition: (pos: PositionInput) => {
    set((state) => {
      const symClean = pos.symbol.replace("-EQ", "");
      const ticker = state.indianTickers[symClean] || state.indianTickers[pos.symbol];
      const curPrice = ticker ? ticker.price : pos.entry_price;
      const leverage = pos.leverage || 1.0;
      const mult = pos.side === "LONG" ? 1 : -1;
      const pnl = Number(((curPrice - pos.entry_price) * pos.quantity * mult * leverage).toFixed(2));
      
      const newPos: Position = {
        symbol: symClean,
        quantity: pos.quantity,
        entry_price: pos.entry_price,
        current_price: curPrice,
        unrealized_pnl: pnl,
        realized_pnl: 0,
        side: pos.side,
        leverage: leverage
      };

      const existingIdx = state.portfolio.positions.findIndex(p => p.symbol === symClean && p.side === pos.side);
      let updatedPositions: Position[];
      
      if (existingIdx >= 0) {
        const existing = state.portfolio.positions[existingIdx];
        const totalQty = existing.quantity + pos.quantity;
        const avgEntry = Number((((existing.entry_price * existing.quantity) + (pos.entry_price * pos.quantity)) / totalQty).toFixed(2));
        const updatedPnl = Number(((curPrice - avgEntry) * totalQty * mult * leverage).toFixed(2));
        
        updatedPositions = [...state.portfolio.positions];
        updatedPositions[existingIdx] = {
          ...existing,
          quantity: totalQty,
          entry_price: avgEntry,
          current_price: curPrice,
          unrealized_pnl: updatedPnl
        };
      } else {
        updatedPositions = [newPos, ...state.portfolio.positions];
      }

      return {
        portfolio: calculatePortfolioMetrics(updatedPositions, state.indianTickers)
      };
    });
  },

  deletePosition: (symbol: string) => {
    set((state) => {
      const filtered = state.portfolio.positions.filter(p => p.symbol !== symbol);
      return {
        portfolio: calculatePortfolioMetrics(filtered, state.indianTickers)
      };
    });
  },

  clearPortfolio: () => {
    set((state) => ({
      portfolio: calculatePortfolioMetrics([], state.indianTickers)
    }));
  },

  importPortfolioPositions: (imported: PositionInput[]) => {
    set((state) => {
      const newPositions: Position[] = imported.map(pos => {
        const symClean = pos.symbol.replace("-EQ", "");
        const ticker = state.indianTickers[symClean] || state.indianTickers[pos.symbol];
        const curPrice = ticker ? ticker.price : pos.entry_price;
        const leverage = pos.leverage || 1.0;
        const mult = pos.side === "LONG" ? 1 : -1;
        const pnl = Number(((curPrice - pos.entry_price) * pos.quantity * mult * leverage).toFixed(2));
        return {
          symbol: symClean,
          quantity: pos.quantity,
          entry_price: pos.entry_price,
          current_price: curPrice,
          unrealized_pnl: pnl,
          realized_pnl: 0,
          side: pos.side,
          leverage: leverage
        };
      });

      return {
        portfolio: calculatePortfolioMetrics(newPositions, state.indianTickers)
      };
    });
  }
}));
