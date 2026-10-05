"use client";

import React, { useState, useRef } from "react";
import { usePortfolioStore } from "../store/usePortfolioStore";
import { PositionInput } from "../types";
import { X, Upload, FileSpreadsheet, Download, AlertTriangle, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

const SAMPLE_CSV = `symbol,quantity,entry_price,side,leverage
RELIANCE,100,2880.00,LONG,1
HDFCBANK,200,1550.00,LONG,1
TCS,50,4120.00,LONG,1
TATAMOTORS,300,990.00,LONG,1
SBIN,500,790.00,LONG,1`;

export const PortfolioImportModal: React.FC = () => {
  const { isImportModalOpen, setIsImportModalOpen, importPortfolioPositions } = usePortfolioStore();
  const [parsedPositions, setParsedPositions] = useState<PositionInput[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isImportModalOpen) return null;

  const downloadSampleCSV = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio_sample_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseFile = (file: File) => {
    setParseError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Empty file");

        let rows: Record<string, string>[] = [];

        if (file.name.endsWith(".csv")) {
          const text = data as string;
          const lines = text.trim().split("\n");
          if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row");
          const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/['"]/g, ""));
          rows = lines.slice(1).map(line => {
            const vals = line.split(",").map(v => v.trim().replace(/['"]/g, ""));
            const obj: Record<string, string> = {};
            headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
            return obj;
          });
        } else {
          const workbook = XLSX.read(data, { type: "binary" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
          rows = json.map(r => {
            const obj: Record<string, string> = {};
            Object.keys(r).forEach(k => { obj[k.toLowerCase().trim()] = String(r[k]).trim(); });
            return obj;
          });
        }

        const positions: PositionInput[] = [];
        for (const row of rows) {
          const sym = row["symbol"] || row["ticker"] || row["stock"] || "";
          const qty = parseFloat(row["quantity"] || row["qty"] || row["shares"] || "0");
          const price = parseFloat(row["entry_price"] || row["price"] || row["buy_price"] || row["avg_price"] || "0");
          const sideStr = (row["side"] || row["position"] || "LONG").toUpperCase();
          const lev = parseFloat(row["leverage"] || row["lev"] || "1") || 1;

          if (sym && qty > 0 && price > 0) {
            positions.push({
              symbol: sym.toUpperCase().replace(/\s+/g, ""),
              quantity: qty,
              entry_price: price,
              side: sideStr === "SHORT" ? "SHORT" : "LONG",
              leverage: lev
            });
          }
        }

        if (positions.length === 0) {
          throw new Error("No valid positions found. Ensure your file has columns: symbol, quantity, entry_price, side, leverage");
        }

        setParsedPositions(positions);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to parse file";
        setParseError(message);
        setParsedPositions([]);
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleImport = () => {
    if (parsedPositions.length > 0) {
      importPortfolioPositions(parsedPositions);
      setParsedPositions([]);
      setFileName("");
      setIsImportModalOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111614] border border-white/[0.065] rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-[#F2F0E8] font-sans animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-white/[0.065] pb-4">
          <h3 className="text-sm font-semibold font-sans uppercase tracking-wider text-[#F2F0E8] flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-[#159570]" />
            <span>Import Portfolio (CSV / Excel)</span>
          </h3>
          <button 
            onClick={() => { setIsImportModalOpen(false); setParsedPositions([]); setFileName(""); setParseError(""); }} 
            className="p-1.5 bg-[#0C100F] border border-white/[0.065] rounded-sm text-[#A7ADA8] hover:text-[#F2F0E8] hover:bg-[#161C19] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Download Template */}
        <div className="flex items-center justify-between bg-[#0C100F] border border-white/[0.065] rounded-sm p-3">
          <div className="text-xs font-mono text-[#A7ADA8]">
            <span className="text-[#F2F0E8] font-semibold font-sans">Format Required:</span> symbol, quantity, entry_price, side, leverage
          </div>
          <button 
            onClick={downloadSampleCSV} 
            className="flex items-center gap-1.5 bg-[#161C19] hover:bg-[#1B2420] border border-white/[0.065] text-[#F2F0E8] text-xs font-medium font-sans px-3 py-1.5 rounded-sm transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-[#A7ADA8]" />
            <span>Download Sample CSV</span>
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-sm p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragOver 
              ? "border-[#159570] bg-[#159570]/10" 
              : "border-white/[0.08] hover:border-white/[0.15] bg-[#0C100F]"
          }`}
        >
          <Upload className={`h-8 w-8 mb-2 ${isDragOver ? "text-[#159570]" : "text-[#68716C]"}`} />
          <p className="text-xs font-sans text-[#F2F0E8] font-medium">
            {fileName || "Drop your portfolio file here or click to browse"}
          </p>
          <p className="text-[11px] font-sans text-[#68716C] mt-1">
            Supports .csv, .xlsx, .xls files
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Parse Error */}
        {parseError && (
          <div className="flex items-start gap-2 bg-[#C45D62]/10 border border-[#C45D62]/25 rounded-sm p-3 text-xs font-sans text-[#C45D62]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview Table */}
        {parsedPositions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-sans">
              <CheckCircle className="h-4 w-4 text-[#42A77A]" />
              <span className="text-[#42A77A] font-semibold">{parsedPositions.length} positions</span>
              <span className="text-[#A7ADA8]">parsed successfully from {fileName}</span>
            </div>
            <div className="overflow-x-auto border border-white/[0.065] rounded-sm max-h-48 overflow-y-auto bg-[#0C100F]">
              <table className="w-full text-left text-xs font-sans">
                <thead className="sticky top-0 bg-[#0C100F] text-[#A7ADA8] border-b border-white/[0.065] text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Entry Price</th>
                    <th className="py-2 px-2">Side</th>
                    <th className="py-2 px-2 text-right">Leverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] font-mono tabular-nums">
                  {parsedPositions.map((p, i) => (
                    <tr key={i} className="hover:bg-[#161C19]">
                      <td className="py-2 px-3 font-semibold text-[#F2F0E8]">{p.symbol}</td>
                      <td className="py-2 px-2 text-right text-[#F2F0E8]">{p.quantity}</td>
                      <td className="py-2 px-2 text-right text-[#A7ADA8]">₹{p.entry_price.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2">
                        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${p.side === "LONG" ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30" : "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25"}`}>
                          {p.side}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-[#A7ADA8]">{p.leverage || 1}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              className="w-full py-2.5 bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] rounded-sm font-medium font-sans text-xs uppercase tracking-wider transition-colors shadow-sm"
            >
              Import {parsedPositions.length} Positions into Portfolio
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
