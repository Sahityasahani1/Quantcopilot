import type { Metadata } from "next";
import "./globals.css";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

export const metadata: Metadata = {
  title: "QuantCopilot AI - Financial Analytics Workstation & GNN Risk Engine",
  description: "Integrated real-time quantitative analytics workstation powered by GNN risk engines and FastAPI async gateways."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-slate-950">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 bg-slate-950/40">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
