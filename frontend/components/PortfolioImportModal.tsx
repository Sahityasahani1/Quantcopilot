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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold font-mono text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-amber-400" />
            IMPORT PORTFOLIO (CSV / EXCEL)
          </h3>
          <button onClick={() => { setIsImportModalOpen(false); setParsedPositions([]); setFileName(""); setParseError(""); }} className="p-1.5 bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Download Template */}
        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
          <div className="text-xs font-mono text-slate-400">
            <span className="text-slate-200 font-bold">Format Required:</span> symbol, quantity, entry_price, side, leverage
          </div>
          <button onClick={downloadSampleCSV} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold font-mono px-3 py-1.5 rounded-lg transition-colors">
            <Download className="h-3.5 w-3.5" />
            Download Sample CSV
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragOver ? "border-amber-500 bg-amber-950/20" : "border-slate-700 hover:border-slate-600 bg-slate-950/50"
          }`}
        >
          <Upload className={`h-10 w-10 mb-3 ${isDragOver ? "text-amber-400" : "text-slate-500"}`} />
          <p className="text-sm font-mono text-slate-300">
            {fileName || "Drop your portfolio file here or click to browse"}
          </p>
          <p className="text-[11px] font-mono text-slate-500 mt-1">
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
          <div className="flex items-start gap-2 bg-rose-950/30 border border-rose-800/50 rounded-lg p-3 text-xs font-mono text-rose-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview Table */}
        {parsedPositions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400 font-bold">{parsedPositions.length} positions</span>
              <span className="text-slate-400">parsed successfully from {fileName}</span>
            </div>
            <div className="overflow-x-auto border border-slate-800 rounded-lg max-h-48 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="sticky top-0 bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Symbol</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Entry Price</th>
                    <th className="py-2 px-2">Side</th>
                    <th className="py-2 px-2">Leverage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {parsedPositions.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-bold text-slate-100">{p.symbol}</td>
                      <td className="py-2 px-2 text-slate-300">{p.quantity}</td>
                      <td className="py-2 px-2 text-slate-300">₹{p.entry_price.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${p.side === "LONG" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"}`}>
                          {p.side}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-300">{p.leverage || 1}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={handleImport}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 rounded-xl font-bold font-mono text-sm hover:from-amber-400 hover:to-emerald-400 transition-all shadow-lg"
            >
              IMPORT {parsedPositions.length} POSITIONS INTO PORTFOLIO
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
