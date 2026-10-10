"use client";

import React, { useState } from "react";
import { OrderInput } from "../../types/trading";
import { usePortfolioStore } from "../../store/usePortfolioStore";
import { 
  X, 
  Check, 
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
  const { addPosition, indianTickers } = usePortfolioStore();
  const cleanSym = symbol ? symbol.replace("-EQ", "").toUpperCase() : "";
  const effectivePrice = currentPrice > 0 ? currentPrice : (indianTickers[cleanSym]?.price || 2400);

  const [side, setSide] = useState<"BUY" | "SELL">(initialSide);
  const [productType, setProductType] = useState<"INTRADAY" | "DELIVERY" | "OPTIONS_NRML">("INTRADAY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [quantity, setQuantity] = useState<number>(50);
  const [limitPrice, setLimitPrice] = useState<number>(effectivePrice);
  const [hasBracketSL, setHasBracketSL] = useState<boolean>(false);
  const [stopLossPrice, setStopLossPrice] = useState<number>(Number((effectivePrice * 0.98).toFixed(2)));
  const [targetPrice, setTargetPrice] = useState<number>(Number((effectivePrice * 1.04).toFixed(2)));
  const [orderPlaced, setOrderPlaced] = useState<boolean>(false);

  if (!isOpen) return null;

  const price = orderType === "MARKET" ? (currentPrice > 0 ? currentPrice : effectivePrice) : limitPrice;
  const leverage = productType === "INTRADAY" ? 5 : 1;
  const grossValue = price * quantity;
  const marginRequired = Number((grossValue / leverage).toFixed(2));
  
  // Statutory charges calculation
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111614] border border-white/[0.08] rounded-md w-full max-w-md shadow-2xl overflow-hidden font-sans text-[#F2F0E8]">
        {/* Header Bar */}
        <div className={`p-4 flex items-center justify-between border-b ${
          side === "BUY" ? "bg-[#159570] text-[#F2F0E8] border-[#159570]" : "bg-[#C45D62] text-[#F2F0E8] border-[#C45D62]"
        }`}>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-wider uppercase">{side} {symbol}</span>
              <span className="text-[10px] bg-black/25 font-mono px-2 py-0.5 rounded">
                NSE
              </span>
            </div>
            <div className="text-xs font-mono mt-0.5 opacity-90">
              LTP: ₹{currentPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded opacity-80 hover:opacity-100 hover:bg-black/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {orderPlaced ? (
          <div className="p-10 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-[#159570]/20 text-[#42A77A] border border-[#159570]/40 flex items-center justify-center">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-[#F2F0E8]">ORDER EXECUTED</h3>
            <p className="text-xs text-[#A7ADA8] font-mono">
              {quantity} qty {side} placed successfully at ₹{price.toFixed(2)}
            </p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Side Switcher (BUY / SELL) */}
            <div className="grid grid-cols-2 gap-2 bg-[#0C100F] p-1 rounded border border-white/[0.06]">
              <button
                onClick={() => setSide("BUY")}
                className={`py-2 rounded text-xs font-medium tracking-wide transition-colors ${
                  side === "BUY" ? "bg-[#159570] text-[#F2F0E8]" : "text-[#68716C] hover:text-[#F2F0E8]"
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setSide("SELL")}
                className={`py-2 rounded text-xs font-medium tracking-wide transition-colors ${
                  side === "SELL" ? "bg-[#C45D62] text-[#F2F0E8]" : "text-[#68716C] hover:text-[#F2F0E8]"
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
                  className={`p-2 rounded border text-center transition-colors ${
                    productType === p.id 
                      ? "bg-[#161C19] border-[#159570] text-[#F2F0E8]" 
                      : "bg-[#0C100F] border-white/[0.06] text-[#68716C] hover:text-[#F2F0E8]"
                  }`}
                >
                  <div className="text-[11px] font-medium">{p.label}</div>
                  <div className="text-[9px] text-[#68716C] font-mono">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Order Type & Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-[#A7ADA8] uppercase tracking-wider font-mono">Quantity (Shares)</label>
                <div className="flex items-center space-x-1 bg-[#0C100F] border border-white/[0.06] rounded p-1">
                  <input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-transparent px-2 py-1 text-sm font-mono font-medium text-[#F2F0E8] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#A7ADA8] uppercase tracking-wider font-mono">Order Type</label>
                <div className="flex bg-[#0C100F] border border-white/[0.06] rounded p-1">
                  {(["MARKET", "LIMIT"] as const).map((ot) => (
                    <button
                      key={ot}
                      onClick={() => setOrderType(ot)}
                      className={`flex-1 py-1 rounded text-xs font-mono font-medium transition-colors ${
                        orderType === ot ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]" : "text-[#68716C] hover:text-[#F2F0E8]"
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
                <label className="text-[10px] text-[#A7ADA8] uppercase tracking-wider font-mono">Limit Price (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(Number(e.target.value))}
                  className="w-full bg-[#0C100F] border border-white/[0.06] rounded px-3 py-2 text-sm font-mono text-[#F2F0E8] focus:outline-none focus:border-[#159570]"
                />
              </div>
            )}

            {/* Bracket Order (SL & Target) Toggle */}
            <div className="bg-[#161C19] border border-white/[0.06] rounded p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#F2F0E8] font-medium">Bracket Target & Stop Loss</span>
                <input
                  type="checkbox"
                  checked={hasBracketSL}
                  onChange={(e) => setHasBracketSL(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#159570]"
                />
              </div>

              {hasBracketSL && (
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div>
                    <span className="text-[10px] text-[#A7ADA8] block">Stop Loss (₹)</span>
                    <input
                      type="number"
                      value={stopLossPrice}
                      onChange={(e) => setStopLossPrice(Number(e.target.value))}
                      className="w-full bg-[#0C100F] border border-white/[0.06] rounded px-2 py-1 text-xs text-[#C45D62] font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A7ADA8] block">Target (₹)</span>
                    <input
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Number(e.target.value))}
                      className="w-full bg-[#0C100F] border border-white/[0.06] rounded px-2 py-1 text-xs text-[#42A77A] font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Charges & Margin Breakdown */}
            <div className="bg-[#161C19] border border-white/[0.06] rounded p-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-[#A7ADA8]">
                <span>Margin Required:</span>
                <span className="text-sm font-semibold text-[#F2F0E8]">₹{marginRequired.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-[#68716C] pt-1 border-t border-white/[0.04]">
                <span>Est. Charges (Brokerage + STT + GST):</span>
                <span className="text-[#A7ADA8]">₹{totalCharges}</span>
              </div>
            </div>

            {/* Submit Execution Button */}
            <button
              onClick={handleExecuteOrder}
              className={`w-full py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors flex items-center justify-center space-x-2 ${
                side === "BUY"
                  ? "bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8]"
                  : "bg-[#C45D62] hover:bg-[#A84B50] text-[#F2F0E8]"
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
