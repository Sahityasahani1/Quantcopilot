"use client";

import React, { useState, useRef, useMemo } from "react";
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Database
} from "lucide-react";
import * as XLSX from "xlsx";
import { LabPortfolioPosition } from "../../types";

export interface ParsedCsvRow {
  rowNumber: number;
  symbol: string;
  company_name: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  total_value: number;
  isValid: boolean;
  validationError?: string;
}

interface LivePortfolioCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPositions: (positions: LabPortfolioPosition[], mode: "replace" | "append") => void;
  currentPositionsCount: number;
}

const SAMPLE_PORTFOLIO_CSV = `symbol,quantity,entry_price,side,company_name
RELIANCE,100,2880.00,LONG,Reliance Industries
HDFCBANK,200,1550.00,LONG,HDFC Bank Ltd
TCS,50,4120.00,LONG,Tata Consultancy Services
INFY,150,1845.00,LONG,Infosys Ltd
TATAMOTORS,300,990.00,LONG,Tata Motors Ltd
SBIN,400,790.00,LONG,State Bank of India
ITC,500,430.00,LONG,ITC Limited
BHARTIARTL,120,1580.00,LONG,Bharti Airtel`;

export const LivePortfolioCsvModal: React.FC<LivePortfolioCsvModalProps> = ({
  isOpen,
  onClose,
  onImportPositions,
  currentPositionsCount
}) => {
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [parseError, setParseError] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [viewFilter, setViewFilter] = useState<"ALL" | "VALID" | "INVALID">("ALL");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_PORTFOLIO_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quantcopilot_portfolio_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const processData = (content: string | ArrayBuffer, isBinary: boolean, name: string, sizeBytes: number) => {
    setParseError("");
    setFileName(name);
    setFileSize(
      sizeBytes > 1024 * 1024 
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB` 
        : `${(sizeBytes / 1024).toFixed(1)} KB`
    );

    try {
      let rows: Record<string, string>[] = [];

      if (!isBinary && typeof content === "string") {
        setRawText(content);
        const text = content.trim();
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2) {
          throw new Error("CSV file must have a header row and at least one data row.");
        }

        // Detect delimiter: comma, semicolon, tab
        const firstLine = lines[0];
        let delimiter = ",";
        if (firstLine.includes("\t")) delimiter = "\t";
        else if (firstLine.includes(";") && !firstLine.includes(",")) delimiter = ";";

        const headers = firstLine.split(delimiter).map(h => 
          h.trim().toLowerCase().replace(/['"]/g, "")
        );

        rows = lines.slice(1).map(line => {
          const vals = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ""));
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h] = vals[i] || "";
          });
          return obj;
        });
      } else {
        const workbook = XLSX.read(content, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) throw new Error("Excel workbook contains no sheets");
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
        rows = json.map(r => {
          const obj: Record<string, string> = {};
          Object.keys(r).forEach(k => {
            obj[k.toLowerCase().trim()] = String(r[k]).trim();
          });
          return obj;
        });
      }

      if (rows.length === 0) {
        throw new Error("No data rows found in the uploaded file.");
      }

      // Map rows into validated ParsedCsvRow
      const processed: ParsedCsvRow[] = rows.map((r, idx) => {
        const rowNumber = idx + 1;
        const sym = (r["symbol"] || r["ticker"] || r["stock"] || r["scrip"] || r["name"] || "").trim().toUpperCase().replace(/\s+/g, "");
        const rawQty = r["quantity"] || r["qty"] || r["shares"] || r["lots"] || r["volume"] || "";
        const rawPrice = r["entry_price"] || r["price"] || r["buy_price"] || r["avg_price"] || r["rate"] || r["cost"] || "";
        const rawSide = (r["side"] || r["action"] || r["type"] || r["position"] || "LONG").trim().toUpperCase();
        const companyName = r["company_name"] || r["company"] || r["companyname"] || sym;

        const qty = parseFloat(rawQty);
        const price = parseFloat(rawPrice);
        const side: "LONG" | "SHORT" = rawSide === "SHORT" || rawSide === "SELL" ? "SHORT" : "LONG";

        let isValid = true;
        let validationError = "";

        if (!sym) {
          isValid = false;
          validationError = "Missing stock symbol";
        } else if (isNaN(qty) || qty <= 0) {
          isValid = false;
          validationError = `Invalid quantity (${rawQty || 'empty'})`;
        } else if (isNaN(price) || price <= 0) {
          isValid = false;
          validationError = `Invalid entry price (${rawPrice || 'empty'})`;
        }

        const totalValue = isValid ? Number((qty * price).toFixed(2)) : 0;

        return {
          rowNumber,
          symbol: sym,
          company_name: companyName,
          side,
          quantity: isNaN(qty) ? 0 : qty,
          entry_price: isNaN(price) ? 0 : price,
          total_value: totalValue,
          isValid,
          validationError
        };
      });

      setParsedRows(processed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file";
      setParseError(msg);
      setParsedRows([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCsvOrText = file.name.endsWith(".csv") || file.name.endsWith(".txt");
    const reader = new FileReader();

    if (isCsvOrText) {
      reader.onload = (evt) => {
        const res = evt.target?.result;
        if (res) processData(res as string, false, file.name, file.size);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        const res = evt.target?.result;
        if (res) processData(res as ArrayBuffer, true, file.name, file.size);
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const isCsvOrText = file.name.endsWith(".csv") || file.name.endsWith(".txt");
    const reader = new FileReader();

    if (isCsvOrText) {
      reader.onload = (evt) => {
        const res = evt.target?.result;
        if (res) processData(res as string, false, file.name, file.size);
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        const res = evt.target?.result;
        if (res) processData(res as ArrayBuffer, true, file.name, file.size);
      };
      reader.readAsBinaryString(file);
    }
  };

  // Convert valid parsed rows into LabPortfolioPosition objects
  const validPositions: LabPortfolioPosition[] = useMemo(() => {
    return parsedRows
      .filter(r => r.isValid)
      .map(r => ({
        id: `${r.symbol}-${Date.now()}-${r.rowNumber}`,
        symbol: r.symbol,
        company_name: r.company_name,
        exchange: "NSE",
        quantity: r.quantity,
        entry_price: r.entry_price,
        side: r.side,
        added_at: new Date().toISOString()
      }));
  }, [parsedRows]);

  // Summary statistics
  const summary = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter(r => r.isValid);
    const invalid = total - valid.length;
    const totalQty = valid.reduce((sum, r) => sum + r.quantity, 0);
    const totalInvested = valid.reduce((sum, r) => sum + r.total_value, 0);
    const longCount = valid.filter(r => r.side === "LONG").length;
    const shortCount = valid.filter(r => r.side === "SHORT").length;

    return {
      total,
      validCount: valid.length,
      invalidCount: invalid,
      totalQty,
      totalInvested,
      longCount,
      shortCount
    };
  }, [parsedRows]);

  // Filtered rows for the preview table
  const displayedRows = useMemo(() => {
    return parsedRows.filter(r => {
      if (viewFilter === "VALID" && !r.isValid) return false;
      if (viewFilter === "INVALID" && r.isValid) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        return (
          r.symbol.toLowerCase().includes(q) ||
          r.company_name.toLowerCase().includes(q) ||
          r.side.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [parsedRows, viewFilter, searchFilter]);

  const handleConfirmImport = (mode: "replace" | "append") => {
    if (validPositions.length === 0) return;
    onImportPositions(validPositions, mode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#111614] border border-white/[0.08] rounded-sm w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-[#F2F0E8] font-sans animate-fade-in-up overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/[0.065] bg-[#0C100F] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-sm bg-[#161C19] border border-white/[0.08] flex items-center justify-center text-[#159570]">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F2F0E8] font-sans">
                  IMPORT CSV / EXCEL PORTFOLIO
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#161C19] text-[#159570] border border-[#159570]/30 font-semibold">
                  LIVE PORTFOLIO LAB
                </span>
              </div>
              <p className="text-xs text-[#A7ADA8] font-sans mt-0.5">
                Upload your stock positions from CSV, Excel, or broker reports. Inspect full row data with real-time validation before importing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-sm bg-[#161C19] hover:bg-[#1F2723] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          
          {/* File Upload & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-sm p-5 text-center cursor-pointer transition-all ${
              isDragOver
                ? "border-[#159570] bg-[#159570]/10"
                : "border-white/[0.1] hover:border-white/[0.2] bg-[#0C100F]/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-[#161C19] border border-white/[0.065] flex items-center justify-center text-[#159570]">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#F2F0E8] block">
                  {fileName ? `File Selected: ${fileName} (${fileSize})` : "Click to Browse or Drag & Drop Portfolio CSV / Excel"}
                </span>
                <span className="text-[11px] text-[#A7ADA8] mt-0.5 block">
                  Supports columns: <strong>symbol</strong>, <strong>quantity</strong>, <strong>entry_price</strong>, <strong>side</strong> (LONG/SHORT), <strong>company_name</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Helpers */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-[#A7ADA8]">
              <FileText className="h-3.5 w-3.5 text-[#159570]" />
              <span>Don&#39;t have a file ready?</span>
            </div>
            <button
              onClick={handleDownloadSample}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-sm bg-[#161C19] hover:bg-[#1F2723] text-[#F2F0E8] border border-white/[0.08] text-xs font-mono transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-[#159570]" />
              <span>Download Sample Template (.CSV)</span>
            </button>
          </div>

          {/* Error Banner */}
          {parseError && (
            <div className="bg-[#C45D62]/10 border border-[#C45D62]/30 rounded-sm p-3 flex items-center space-x-2.5 text-xs text-[#C45D62]">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Parsed CSV Data Summary Telemetry */}
          {parsedRows.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0C100F] border border-white/[0.065] rounded-sm p-3.5">
              <div>
                <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Total CSV Rows</span>
                <span className="text-base font-bold font-mono text-[#F2F0E8]">{summary.total}</span>
                <span className="text-[10px] text-[#A7ADA8] block">
                  {summary.validCount} Valid &bull; {summary.invalidCount} Skipped
                </span>
              </div>

              <div>
                <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Total Shares / Qty</span>
                <span className="text-base font-bold font-mono text-[#F2F0E8]">{summary.totalQty.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-[#A7ADA8] block">
                  Across {summary.validCount} valid assets
                </span>
              </div>

              <div>
                <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Total Invested Value</span>
                <span className="text-base font-bold font-mono text-[#42A77A]">
                  ₹{summary.totalInvested.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-[#A7ADA8] block">
                  Calculated from CSV entry prices
                </span>
              </div>

              <div>
                <span className="text-[10px] font-sans text-[#68716C] uppercase tracking-wider block">Position Bias</span>
                <div className="flex items-center space-x-2 mt-0.5">
                  <span className="text-xs font-mono font-semibold text-[#42A77A]">{summary.longCount} LONG</span>
                  <span className="text-xs text-[#68716C]">&bull;</span>
                  <span className="text-xs font-mono font-semibold text-[#C45D62]">{summary.shortCount} SHORT</span>
                </div>
                <span className="text-[10px] text-[#A7ADA8] block">Ready for MTM execution</span>
              </div>
            </div>
          )}

          {/* Data Table Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold font-sans uppercase tracking-wider text-[#F2F0E8] flex items-center space-x-2">
                    <span>CSV DATA TABLE PREVIEW</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#161C19] text-[#A7ADA8] border border-white/[0.065]">
                      {displayedRows.length} OF {parsedRows.length} DISPLAYED
                    </span>
                  </h4>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Status filter pills */}
                  <div className="flex items-center bg-[#0C100F] border border-white/[0.065] p-0.5 rounded-sm text-xs font-mono">
                    <button
                      onClick={() => setViewFilter("ALL")}
                      className={`px-2 py-0.5 rounded-sm transition-colors ${
                        viewFilter === "ALL" ? "bg-[#161C19] text-[#F2F0E8] border border-white/[0.08]" : "text-[#68716C] hover:text-[#A7ADA8]"
                      }`}
                    >
                      ALL ({summary.total})
                    </button>
                    <button
                      onClick={() => setViewFilter("VALID")}
                      className={`px-2 py-0.5 rounded-sm transition-colors ${
                        viewFilter === "VALID" ? "bg-[#161C19] text-[#42A77A] border border-white/[0.08]" : "text-[#68716C] hover:text-[#A7ADA8]"
                      }`}
                    >
                      VALID ({summary.validCount})
                    </button>
                    {summary.invalidCount > 0 && (
                      <button
                        onClick={() => setViewFilter("INVALID")}
                        className={`px-2 py-0.5 rounded-sm transition-colors ${
                          viewFilter === "INVALID" ? "bg-[#161C19] text-[#C45D62] border border-white/[0.08]" : "text-[#68716C] hover:text-[#A7ADA8]"
                        }`}
                      >
                        INVALID ({summary.invalidCount})
                      </button>
                    )}
                  </div>

                  {/* Search bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-[#68716C]" />
                    <input
                      type="text"
                      placeholder="Search row..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="bg-[#0C100F] border border-white/[0.065] text-[#F2F0E8] text-xs font-sans pl-7 pr-2 py-1 rounded-sm focus:outline-none focus:border-[#159570] placeholder-[#68716C]"
                    />
                  </div>
                </div>
              </div>

              {/* Interactive Table */}
              <div className="max-h-[320px] overflow-y-auto border border-white/[0.065] rounded-sm bg-[#0C100F]/80">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0C100F] text-[#68716C] border-b border-white/[0.065] text-[10px] uppercase font-semibold sticky top-0 z-10">
                    <tr>
                      <th className="py-2 px-3 w-12">#</th>
                      <th className="py-2 px-3">Symbol / Ticker</th>
                      <th className="py-2 px-3">Company</th>
                      <th className="py-2 px-3">Side</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3 text-right">Entry Price (₹)</th>
                      <th className="py-2 px-3 text-right">Total Value (₹)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {displayedRows.map((row) => (
                      <tr 
                        key={row.rowNumber}
                        className={`hover:bg-[#161C19] transition-colors ${
                          !row.isValid ? "bg-[#C45D62]/5 opacity-70" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-[#68716C] text-[11px]">{row.rowNumber}</td>
                        <td className="py-2 px-3 font-bold text-[#F2F0E8]">{row.symbol || "—"}</td>
                        <td className="py-2 px-3 text-[#A7ADA8] font-sans truncate max-w-[160px]">
                          {row.company_name || row.symbol || "—"}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[10px] font-semibold ${
                              row.side === "LONG"
                                ? "bg-[#159570]/15 text-[#42A77A] border border-[#159570]/30"
                                : "bg-[#C45D62]/10 text-[#C45D62] border border-[#C45D62]/25"
                            }`}
                          >
                            {row.side}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-[#F2F0E8] font-semibold tabular-nums">
                          {row.quantity > 0 ? row.quantity.toLocaleString("en-IN") : "0"}
                        </td>
                        <td className="py-2 px-3 text-right text-[#F2F0E8] tabular-nums">
                          {row.entry_price > 0 ? `₹${row.entry_price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-[#42A77A] tabular-nums">
                          {row.total_value > 0 ? `₹${row.total_value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-[#42A77A] bg-[#159570]/10 border border-[#159570]/25 px-1.5 py-0.2 rounded-sm">
                              <CheckCircle className="h-3 w-3" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] text-[#C45D62] bg-[#C45D62]/10 border border-[#C45D62]/25 px-1.5 py-0.2 rounded-sm"
                              title={row.validationError}
                            >
                              <AlertCircle className="h-3 w-3" />
                              <span>{row.validationError || "Invalid"}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-white/[0.065] bg-[#0C100F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#A7ADA8] font-sans">
            {parsedRows.length > 0 ? (
              <span>
                Found <strong className="text-[#42A77A]">{summary.validCount}</strong> valid positions ready to inject into live sandbox.
              </span>
            ) : (
              <span>Upload a file or download sample template to begin inspection.</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-sm bg-[#161C19] hover:bg-[#1B2420] text-[#A7ADA8] hover:text-[#F2F0E8] border border-white/[0.065] text-xs font-sans font-medium transition-colors"
            >
              Cancel
            </button>

            {parsedRows.length > 0 && summary.validCount > 0 && (
              <>
                {currentPositionsCount > 0 && (
                  <button
                    onClick={() => handleConfirmImport("append")}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-sm bg-[#161C19] hover:bg-[#1F2723] text-[#F2F0E8] border border-white/[0.1] text-xs font-sans font-medium transition-colors shadow-sm"
                    title="Append imported positions to existing positions"
                  >
                    <Layers className="h-3.5 w-3.5 text-[#159570]" />
                    <span>Append ({summary.validCount})</span>
                  </button>
                )}

                <button
                  onClick={() => handleConfirmImport("replace")}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-sm bg-[#159570] hover:bg-[#0E6B50] text-[#F2F0E8] text-xs font-sans font-medium transition-colors shadow-sm"
                  title="Replace all current sandbox positions with these CSV positions"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>
                    {currentPositionsCount > 0 ? `Replace All with CSV (${summary.validCount})` : `Import to Live Portfolio (${summary.validCount})`}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
