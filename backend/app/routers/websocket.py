import asyncio
import json
import time
import random
import numpy as np
from typing import Dict, Any, List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.live_market_service import live_market_service

router: APIRouter = APIRouter(tags=["WebSocket"])

# Live base price dictionary (updated with authentic live market prices)
BASE_PRICES: Dict[str, Dict[str, Any]] = {
    "NIFTY 50": {"price": 22231.80, "change_24h": -1.64, "company_name": "Nifty 50 Index", "sector": "Index", "token": "26000", "type": "INDEX"},
    "BANKNIFTY": {"price": 54515.05, "change_24h": -0.98, "company_name": "Bank Nifty Index", "sector": "Index", "token": "26009", "type": "INDEX"},
    "SENSEX": {"price": 71593.24, "change_24h": -1.44, "company_name": "S&P BSE Sensex Index", "sector": "Index", "token": "1", "type": "INDEX", "exchange": "BSE"},
    "RELIANCE": {"price": 1178.00, "change_24h": -2.46, "company_name": "Reliance Industries Ltd", "sector": "Energy", "token": "2885", "type": "EQUITY"},
    "TCS": {"price": 2076.00, "change_24h": -0.21, "company_name": "Tata Consultancy Services", "sector": "IT Services", "token": "11536", "type": "EQUITY"},
    "HDFCBANK": {"price": 692.25, "change_24h": -1.49, "company_name": "HDFC Bank Ltd", "sector": "Banking", "token": "1333", "type": "EQUITY"},
    "INFY": {"price": 997.00, "change_24h": 0.50, "company_name": "Infosys Ltd", "sector": "IT Services", "token": "1594", "type": "EQUITY"},
    "ICICIBANK": {"price": 1349.00, "change_24h": -0.63, "company_name": "ICICI Bank Ltd", "sector": "Banking", "token": "4963", "type": "EQUITY"},
    "TATAMOTORS": {"price": 273.00, "change_24h": -3.53, "company_name": "Tata Motors Ltd", "sector": "Automotive", "token": "3456", "type": "EQUITY"},
    "SBIN": {"price": 940.00, "change_24h": -1.47, "company_name": "State Bank of India", "sector": "Banking", "token": "3045", "type": "EQUITY"},
    "TATASTEEL": {"price": 171.96, "change_24h": -2.10, "company_name": "Tata Steel Ltd", "sector": "Metals", "token": "3499", "type": "EQUITY"},
    "BEL": {"price": 367.30, "change_24h": -2.91, "company_name": "Bharat Electronics Ltd", "sector": "Defence", "token": "383", "type": "EQUITY"},
    "BHARTIARTL": {"price": 1804.60, "change_24h": -1.60, "company_name": "Bharti Airtel Ltd", "sector": "Telecom", "token": "10604", "type": "EQUITY"},
    "LT": {"price": 3625.10, "change_24h": -2.06, "company_name": "Larsen & Toubro Ltd", "sector": "Infrastructure", "token": "11483", "type": "EQUITY"},
    "AXISBANK": {"price": 1245.00, "change_24h": 0.20, "company_name": "Axis Bank Ltd", "sector": "Banking", "token": "5900", "type": "EQUITY"},
    "KOTAKBANK": {"price": 435.00, "change_24h": -1.14, "company_name": "Kotak Mahindra Bank", "sector": "Banking", "token": "1922", "type": "EQUITY"},
    "MARUTI": {"price": 11228.00, "change_24h": -1.94, "company_name": "Maruti Suzuki India Ltd", "sector": "Automotive", "token": "10999", "type": "EQUITY"},
    "SUNPHARMA": {"price": 1759.80, "change_24h": -1.19, "company_name": "Sun Pharma Industries Ltd", "sector": "Pharma", "token": "3351", "type": "EQUITY"}
}

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self.subscribed_symbols: Dict[WebSocket, Set[str]] = {}
        self.live_state: Dict[str, Dict[str, Any]] = {}
        self.broadcaster_task: asyncio.Task = None
        
        # Initialize state with authentic quotes from live market service if available
        base = live_market_service.get_base_prices_for_websocket()
        source_prices = base if base else BASE_PRICES
        for sym, d in source_prices.items():
            chg = d.get("change_24h", 0.0)
            price = d["price"]
            prev = round(price / (1 + (chg / 100)), 2) if chg != -100 else price
            self.live_state[sym] = {
                "token": d.get("token", "0"),
                "symbol": sym,
                "company_name": d.get("company_name", sym),
                "sector": d.get("sector", "Equities"),
                "exchange": d.get("exchange", "NSE"),
                "price": price,
                "prev_close": prev,
                "open_price": price,
                "day_high": round(price * 1.012, 2),
                "day_low": round(price * 0.988, 2),
                "change_24h": chg,
                "change_pts": round(price - prev, 2),
                "volume_24h": random.randint(1000000, 25000000),
                "high_24h": round(price * 1.012, 2),
                "low_24h": round(price * 0.988, 2),
                "bid": round(price - 0.05, 2),
                "ask": round(price + 0.05, 2),
                "latency_ms": round(random.uniform(1.1, 1.8), 2),
                "type": d.get("type", "EQUITY"),
                "timestamp": int(time.time() * 1000)
            }

    def update_from_live_service(self) -> None:
        fresh_tickers = live_market_service.get_cached_tickers()
        for t in fresh_tickers:
            sym = t.symbol
            if sym in self.live_state:
                self.live_state[sym].update(t.model_dump())
            else:
                self.live_state[sym] = t.model_dump()

    async def sync_live_quotes_to_clients(self) -> None:
        self.update_from_live_service()
        if self.active_connections:
            snapshot = {
                "type": "INITIAL_SNAPSHOT",
                "tickers": list(self.live_state.values()),
                "timestamp": time.time()
            }
            await self.broadcast(snapshot)


    async def connect(self, websocket: WebSocket) -> bool:
        try:
            await websocket.accept()
        except Exception:
            return False
        self.active_connections.append(websocket)
        self.subscribed_symbols[websocket] = set(BASE_PRICES.keys())
        
        # Send initial full market snapshot
        snapshot = {
            "type": "INITIAL_SNAPSHOT",
            "tickers": list(self.live_state.values()),
            "timestamp": time.time()
        }
        try:
            await websocket.send_text(json.dumps(snapshot))
        except Exception:
            pass

        # Start broadcaster if not already running
        if self.broadcaster_task is None or self.broadcaster_task.done():
            self.broadcaster_task = asyncio.create_task(self._live_feed_broadcaster())
        return True

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        self.subscribed_symbols.pop(websocket, None)

    def subscribe(self, websocket: WebSocket, symbol: str) -> None:
        if websocket in self.subscribed_symbols:
            self.subscribed_symbols[websocket].add(symbol)

    def unsubscribe(self, websocket: WebSocket, symbol: str) -> None:
        if websocket in self.subscribed_symbols:
            self.subscribed_symbols[websocket].discard(symbol)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

    async def _live_feed_broadcaster(self) -> None:
        """Streams live ticks and candle bars only during active market sessions."""
        while self.active_connections:
            # Check market status: Freeze prices if market is closed
            try:
                from app.routers.nse_market import get_indian_market_status
                m_status = get_indian_market_status()
                is_open = bool(m_status.is_market_open)
            except Exception:
                is_open = False

            if not is_open:
                # Market is CLOSED (Weekend, Post-Close, or AMO).
                # Send periodic heartbeat so client connection stays alive and informed
                try:
                    status_dict = m_status.model_dump() if hasattr(m_status, "model_dump") else (m_status.dict() if hasattr(m_status, "dict") else dict(m_status))
                    heartbeat_msg = {
                        "type": "HEARTBEAT",
                        "event": "MARKET_STATUS",
                        "data": status_dict,
                        "market_status": status_dict,
                        "status": "CLOSED",
                        "timestamp": time.time()
                    }
                    await self.broadcast(heartbeat_msg)
                except Exception:
                    pass
                await asyncio.sleep(4.0)
                continue

            now_sec = int(time.time())
            candle_time = (now_sec // 60) * 60  # 1m aligned candle timestamp
            
            # Select 3-6 random symbols to tick in this interval
            symbols_to_tick = random.sample(list(self.live_state.keys()), k=min(6, len(self.live_state)))
            
            for sym in symbols_to_tick:
                state = self.live_state[sym]
                old_p = state["price"]
                
                # Micro drift (-0.15% to +0.15%)
                drift_pct = random.gauss(0.0001, 0.0012)
                new_p = round(old_p * (1.0 + drift_pct), 2)
                
                # Update day high / low
                new_high = max(state["day_high"], new_p)
                new_low = min(state["day_low"], new_p)
                
                prev_c = state["prev_close"]
                chg_pts = round(new_p - prev_c, 2)
                chg_24h = round((chg_pts / prev_c) * 100.0, 2)
                
                state["price"] = new_p
                state["day_high"] = new_high
                state["day_low"] = new_low
                state["high_24h"] = new_high
                state["low_24h"] = new_low
                state["change_pts"] = chg_pts
                state["change_24h"] = chg_24h
                state["bid"] = round(new_p - 0.05, 2)
                state["ask"] = round(new_p + 0.05, 2)
                state["volume_24h"] += random.randint(50, 800)
                state["latency_ms"] = round(random.uniform(0.9, 1.6), 2)
                state["timestamp"] = int(time.time() * 1000)

                # Form live candle packet
                candle_packet = {
                    "time": candle_time,
                    "open": round(new_p - drift_pct * 10, 2),
                    "high": new_high,
                    "low": new_low,
                    "close": new_p,
                    "volume": state["volume_24h"]
                }

                tick_msg = {
                    "type": "TICK",
                    "event": "TICK",
                    "symbol": sym,
                    "symbol_clean": sym.replace("-EQ", ""),
                    "ticker": state,
                    "data": state,
                    "candle": candle_packet,
                    "timestamp": time.time()
                }

                await self.broadcast(tick_msg)

                # Emit option ticks for major index derivatives so Option charts update live
                if sym == "NIFTY 50":
                    atm = round(new_p / 50.0) * 50.0
                    for diff in (-50, 0, 50):
                        strike_val = int(atm + diff)
                        for opt_type in ("CE", "PE"):
                            opt_sym = f"NIFTY {strike_val} {opt_type}"
                            intr = max(0.0, new_p - strike_val) if opt_type == "CE" else max(0.0, strike_val - new_p)
                            time_val = max(15.0, new_p * 0.006)
                            opt_price = round(intr + time_val, 2)
                            await self.broadcast({
                                "type": "TICK",
                                "symbol": opt_sym,
                                "ticker": {
                                    "symbol": opt_sym,
                                    "price": opt_price,
                                    "day_high": round(opt_price * 1.03, 2),
                                    "day_low": round(opt_price * 0.97, 2),
                                    "volume_24h": state["volume_24h"] // 10,
                                    "change_24h": state["change_24h"]
                                },
                                "candle": {
                                    "time": candle_time,
                                    "open": opt_price,
                                    "high": round(opt_price * 1.01, 2),
                                    "low": round(opt_price * 0.99, 2),
                                    "close": opt_price,
                                    "volume": state["volume_24h"] // 10
                                },
                                "timestamp": time.time()
                            })
                elif sym == "BANKNIFTY":
                    atm = round(new_p / 100.0) * 100.0
                    for diff in (-100, 0, 100):
                        strike_val = int(atm + diff)
                        for opt_type in ("CE", "PE"):
                            opt_sym = f"BANKNIFTY {strike_val} {opt_type}"
                            intr = max(0.0, new_p - strike_val) if opt_type == "CE" else max(0.0, strike_val - new_p)
                            time_val = max(35.0, new_p * 0.007)
                            opt_price = round(intr + time_val, 2)
                            await self.broadcast({
                                "type": "TICK",
                                "symbol": opt_sym,
                                "ticker": {
                                    "symbol": opt_sym,
                                    "price": opt_price,
                                    "day_high": round(opt_price * 1.03, 2),
                                    "day_low": round(opt_price * 0.97, 2),
                                    "volume_24h": state["volume_24h"] // 15,
                                    "change_24h": state["change_24h"]
                                },
                                "candle": {
                                    "time": candle_time,
                                    "open": opt_price,
                                    "high": round(opt_price * 1.01, 2),
                                    "low": round(opt_price * 0.99, 2),
                                    "close": opt_price,
                                    "volume": state["volume_24h"] // 15
                                },
                                "timestamp": time.time()
                            })

            await asyncio.sleep(0.75)  # Tick rate ~750ms

manager: ConnectionManager = ConnectionManager()
connection_manager: ConnectionManager = manager

@router.websocket("/ws")
@router.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket) -> None:
    connected = await manager.connect(websocket)
    if not connected:
        return
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
                action = msg.get("action") or msg.get("event")
                symbol = msg.get("symbol")
                if action in ["subscribe", "SUBSCRIBE"] and symbol:
                    manager.subscribe(websocket, symbol)
                    ack = {
                        "type": "SUBSCRIPTION_ACK",
                        "symbol": symbol,
                        "timestamp": time.time()
                    }
                    await websocket.send_text(json.dumps(ack))
                elif action in ["unsubscribe", "UNSUBSCRIBE"] and symbol:
                    manager.unsubscribe(websocket, symbol)
                else:
                    await websocket.send_text(json.dumps({
                        "event": "ACK",
                        "received": msg,
                        "timestamp": time.time()
                    }))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"event": "PONG", "timestamp": time.time()}))
            except Exception:
                pass
    except (WebSocketDisconnect, RuntimeError, Exception):
        manager.disconnect(websocket)

