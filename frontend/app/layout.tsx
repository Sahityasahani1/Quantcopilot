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
      <body className="bg-[#080A09] text-[#F2F0E8] min-h-screen flex flex-col antialiased selection:bg-[#0E6B50] selection:text-white font-sans">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#080A09]">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
