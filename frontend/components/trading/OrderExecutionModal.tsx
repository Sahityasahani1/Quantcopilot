"use client";

import React, { useState } from "react";
import { OrderInput } from "../../types/trading";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Check, 
  Info, 
  Zap, 
  ArrowRight 
} from "lucide-react";

interface OrderExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  initialSide?: "BUY" | "SELL";
}

export const OrderExecutionModal: React.FC<OrderExecutionModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  initialSide = "BUY"
}) => {
  const { addPosition } = usePortfolioStore();

  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [productType, setProductType] = useState<"INTRADAY" | "DELIVERY" | "OPTIONS_NRML">("INTRADAY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL_LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(50);
  const [limitPrice, setLimitPrice] = useState<number>(currentPrice || 1000);
  const [hasBracketSL, setHasBracketSL] = useState<boolean>(false);
  const [stopLossPrice, setStopLossPrice] = useState<number>(Number(((currentPrice || 1000) * 0.98).toFixed(2)));
  const [targetPrice, setTargetPrice] = useState<number>(Number(((currentPrice || 1000) * 1.04).toFixed(2)));
  const [orderPlaced, setOrderPlaced] = useState<boolean>(false);

  if (!isOpen) return null;

  const price = orderType === "MARKET" ? currentPrice : limitPrice;
  const leverage = productType === "INTRADAY" ? 5 : 1;
  const grossValue = price * quantity;
  const marginRequired = Number((grossValue / leverage).toFixed(2));
  
  // Groww / Zerodha estimated statutory charges calculation
  const brokerage = Math.min(20, Number((grossValue * 0.0003).toFixed(2)));
  const stt = Number((grossValue * (side === "SELL" || productType === "DELIVERY" ? 0.001 : 0.00025)).toFixed(2));
  const exchangeCharges = Number((grossValue * 0.0000345).toFixed(2));
  const gst = Number(((brokerage + exchangeCharges) * 0.18).toFixed(2));
  const sebiCharges = Number((grossValue * 0.000001).toFixed(2));
  const totalCharges = Number((brokerage + stt + exchangeCharges + gst + sebiCharges).toFixed(2));

  const handleExecuteOrder = () => {
    addPosition({
      symbol: symbol.toUpperCase(),
      quantity,
      entry_price: price,
      side: side === "BUY" ? "LONG" : "SHORT",
      leverage: productType === "INTRADAY" ? 5 : 1
    });

    setOrderPlaced(true);
    setTimeout(() => {
      setOrderPlaced(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-mono text-slate-200">
        {/* Header Bar */}
        <div className={`p-4 flex items-center justify-between text-slate-950 ${
          side === "BUY" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-gradient-to-r from-rose-400 to-pink-500"
        }`}>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm uppercase">{side} {symbol}</span>
              <span className="text-[10px] bg-slate-950/20 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                NSE
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-900 mt-0.5">
              LTP: ₹{currentPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-950/70 hover:text-slate-950 hover:bg-black/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {orderPlaced ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-100">ORDER EXECUTED</h3>
            <p className="text-xs text-slate-400">
              {quantity} qty {side} placed successfully at ₹{price.toFixed(2)}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Side Switcher (BUY / SELL) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSide("BUY")}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  side === "BUY" ? "bg-emerald-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setSide("SELL")}
                className={`py-2 rounded-lg text-xs font-bold transition-all ${
                  side === "SELL" ? "bg-rose-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                SELL
              </button>
            </div>

            {/* Product Type (Intraday MIS vs Delivery CNC) */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: "INTRADAY" as const, label: "Intraday (5x)", desc: "MIS" },
                { id: "DELIVERY" as const, label: "Delivery (1x)", desc: "CNC" },
                { id: "OPTIONS_NRML" as const, label: "Options", desc: "NRML" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProductType(p.id)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    productType === p.id 
                      ? "bg-cyan-500/10 border-cyan-500/60 text-cyan-400 font-bold" 
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="text-[11px]">{p.label}</div>
                  <div className="text-[9px] text-slate-500">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Order Type & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Quantity (Shares)</label>
                <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                  <input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent px-2 py-1 text-sm font-bold text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Order Type</label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1">
                  {(["MARKET", "LIMIT"] as const).map((ot) => (
                    <button
                      key={ot}
                      onClick={() => setOrderType(ot)}
                      className={`flex-1 py-1 rounded text-xs font-bold ${
                        orderType === ot ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {ot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Limit Price Input if LIMIT */}
            {orderType === "LIMIT" && (
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Limit Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Bracket Order (SL & Target) Toggle */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">Bracket Target & Stop Loss</span>
                <input
                  type="checkbox"
                  checked={hasBracketSL}
                  onChange={(e) => setHasBracketSL(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
              </div>

              {hasBracketSL && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stop Loss (₹)</span>
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-rose-400 font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target (₹)</span>
                    <input
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Groww Charges & Margin Breakdown */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300 font-bold">
                <span>Margin Required:</span>
                <span className="text-sm font-extrabold text-white">₹{marginRequired.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Est. Charges (Brokerage + STT + GST):</span>
                <span>₹{totalCharges}</span>
              </div>
            </div>

            {/* Submit Execution Button */}
            <button
              onClick={handleExecuteOrder}
              className={`w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center justify-center space-x-2 ${
                side === "BUY"
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                  : "bg-rose-500 hover:bg-rose-400 text-slate-950"
              }`}
            >
              <span>{side} {quantity} {symbol} @ ₹{price.toFixed(2)}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
