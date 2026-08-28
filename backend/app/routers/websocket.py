import asyncio
import json
import time
import random
import numpy as np
from typing import Dict, Any, List, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router: APIRouter = APIRouter(tags=["WebSocket"])

# Live base price dictionary
BASE_PRICES: Dict[str, Dict[str, Any]] = {
    "NIFTY 50": {"price": 24144.10, "change_24h": 0.45, "company_name": "Nifty 50 Index", "sector": "Index", "token": "26000", "type": "INDEX"},
    "BANKNIFTY": {"price": 50820.25, "change_24h": 0.88, "company_name": "Bank Nifty Index", "sector": "Index", "token": "26009", "type": "INDEX"},
    "SENSEX": {"price": 77204.66, "change_24h": -0.21, "company_name": "S&P BSE Sensex Index", "sector": "Index", "token": "1", "type": "INDEX", "exchange": "BSE"},
    "RELIANCE": {"price": 2985.40, "change_24h": 2.15, "company_name": "Reliance Industries Ltd", "sector": "Energy", "token": "2885", "type": "EQUITY"},
    "TCS": {"price": 4210.80, "change_24h": -0.45, "company_name": "Tata Consultancy Services", "sector": "IT Services", "token": "11536", "type": "EQUITY"},
    "HDFCBANK": {"price": 1612.30, "change_24h": 1.65, "company_name": "HDFC Bank Ltd", "sector": "Banking", "token": "1333", "type": "EQUITY"},
    "INFY": {"price": 1845.60, "change_24h": 0.92, "company_name": "Infosys Ltd", "sector": "IT Services", "token": "1594", "type": "EQUITY"},
    "ICICIBANK": {"price": 1178.90, "change_24h": 1.15, "company_name": "ICICI Bank Ltd", "sector": "Banking", "token": "4963", "type": "EQUITY"},
    "TATAMOTORS": {"price": 1042.15, "change_24h": -1.10, "company_name": "Tata Motors Ltd", "sector": "Automotive", "token": "3456", "type": "EQUITY"},
    "SBIN": {"price": 824.50, "change_24h": 0.75, "company_name": "State Bank of India", "sector": "Banking", "token": "3045", "type": "EQUITY"},
    "TATASTEEL": {"price": 184.09, "change_24h": -1.19, "company_name": "Tata Steel Ltd", "sector": "Metals", "token": "3499", "type": "EQUITY"},
    "BEL": {"price": 408.55, "change_24h": 0.11, "company_name": "Bharat Electronics Ltd", "sector": "Defence", "token": "383", "type": "EQUITY"},
    "BHARTIARTL": {"price": 1485.20, "change_24h": 1.85, "company_name": "Bharti Airtel Ltd", "sector": "Telecom", "token": "10604", "type": "EQUITY"},
    "LT": {"price": 3620.40, "change_24h": 0.65, "company_name": "Larsen & Toubro Ltd", "sector": "Infrastructure", "token": "11483", "type": "EQUITY"},
    "AXISBANK": {"price": 1180.30, "change_24h": -0.80, "company_name": "Axis Bank Ltd", "sector": "Banking", "token": "5900", "type": "EQUITY"},
    "KOTAKBANK": {"price": 1790.60, "change_24h": 0.42, "company_name": "Kotak Mahindra Bank", "sector": "Banking", "token": "1922", "type": "EQUITY"},
    "MARUTI": {"price": 12450.00, "change_24h": -0.50, "company_name": "Maruti Suzuki India Ltd", "sector": "Automotive", "token": "10999", "type": "EQUITY"},
    "SUNPHARMA": {"price": 1710.80, "change_24h": 1.40, "company_name": "Sun Pharma Industries Ltd", "sector": "Pharma", "token": "3351", "type": "EQUITY"}
}

class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self.subscribed_symbols: Dict[WebSocket, Set[str]] = {}
        self.live_state: Dict[str, Dict[str, Any]] = {}
        self.broadcaster_task: asyncio.Task = None
        
        # Initialize state with base prices
        for sym, d in BASE_PRICES.items():
            self.live_state[sym] = {
                "token": d.get("token", "0"),
                "symbol": sym,
                "company_name": d.get("company_name", sym),
                "sector": d.get("sector", "Equities"),
                "exchange": d.get("exchange", "NSE"),
                "price": d["price"],
                "prev_close": round(d["price"] / (1 + (d["change_24h"] / 100)), 2),
                "open_price": d["price"],
                "day_high": round(d["price"] * 1.015, 2),
                "day_low": round(d["price"] * 0.985, 2),
                "change_24h": d["change_24h"],
                "change_pts": round(d["price"] * (d["change_24h"] / 100), 2),
                "volume_24h": random.randint(1000000, 25000000),
                "high_24h": round(d["price"] * 1.015, 2),
                "low_24h": round(d["price"] * 0.985, 2),
                "bid": round(d["price"] - 0.05, 2),
                "ask": round(d["price"] + 0.05, 2),
                "latency_ms": round(random.uniform(1.1, 1.8), 2),
                "type": d.get("type", "EQUITY"),
                "timestamp": int(time.time() * 1000)
            }

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
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
        """Continuously simulates and streams live ticks and candle bars to connected clients."""
        while self.active_connections:
            now_sec = int(time.time())
            candle_time = (now_sec // 60) * 60  # 1m aligned candle timestamp
            
            # Select 3-6 random symbols to tick in this interval
            symbols_to_tick = random.sample(list(self.live_state.keys()), k=min(6, len(self.live_state)))
            
            for sym in symbols_to_tick:
                state = self.live_state[sym]
                old_p = state["price"]
                
                # Realistic micro drift (-0.15% to +0.15%)
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
                    "symbol": sym,
                    "ticker": state,
                    "candle": candle_packet,
                    "timestamp": time.time()
                }

                await self.broadcast(tick_msg)

            await asyncio.sleep(0.75)  # Tick rate ~750ms

manager: ConnectionManager = ConnectionManager()

@router.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket) -> None:
    await manager.connect(websocket)
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
    except WebSocketDisconnect:
        manager.disconnect(websocket)
