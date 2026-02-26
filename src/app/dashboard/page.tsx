import AppLayout from "@/components/layout/AppLayout";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueTrendChart } from "@/components/dashboard/RevenueTrendChart";
import { CostBreakdownChart } from "@/components/dashboard/CostBreakdownChart";
import { TopItemsTable } from "@/components/dashboard/TopItemsTable";
import { InventoryAlertsPanel } from "@/components/dashboard/InventoryAlertsPanel";
import { DailyRevenueSummaryTable } from "@/components/dashboard/DailyRevenueSummaryTable";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";

export default async function DashboardPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  
  // Initialize data containers
  let summaryData = null;
  let topItemsData = [];
  let costData = [];
  let alertsData = [];
  let kpiData : any = {};
  let trendData = [];
  let summaryTableData = [];

  try {
    const [summaryRes, topItemsRes, costRes, alertsRes, trendRes] = await Promise.all([
      fetch(`${baseUrl}/api/dashboard/summary`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/dashboard/top-items?limit=5`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/dashboard/cost-breakdown`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/dashboard/inventory-alerts`, { next: { revalidate: 60 } }),
      fetch(`${baseUrl}/api/dashboard/trend`, { next: { revalidate: 60 } }),
    ]);

    if (summaryRes.ok) {
        const json = await summaryRes.json();
        const d = json.data ?? json;
        summaryData = d;
        kpiData = {
          totalRevenue: d.totalRevenueMmk,
          grossProfit: d.totalGrossProfitMmk,
          operatingProfit: d.totalOperatingProfitMmk,
          totalCovers: d.totalCovers,
        };
        trendData = [];
        summaryTableData = [];
    }

    if (topItemsRes.ok) { const j = await topItemsRes.json(); topItemsData = j.data ?? j; }
    if (costRes.ok) { const j = await costRes.json(); costData = j.data ?? j; }
      if (alertsRes.ok) {
        const j = await alertsRes.json();
        alertsData = j.data?.alerts ?? j.alerts ?? j.data ?? j;
        if (!Array.isArray(alertsData)) alertsData = [];
      }
    if (trendRes.ok) {
      const j = await trendRes.json();
      const arr = j.data ?? j;
      trendData = arr;
      summaryTableData = arr;
    }

  } catch (error) {
    console.error("Failed to fetch dashboard data", error);
  }

  // Fallback values if data is missing
  const formatMoney = (val: any) => {
      if (typeof val === 'number') return val.toLocaleString() + ' Ks';
      if (typeof val === 'string') return val; // Assume already formatted
      return '0 Ks';
  }

  return (
    <AppLayout>
      <div className="flex flex-col space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manager Dashboard</h1>
                <p className="text-slate-500">Overview of restaurant performance</p>
            </div>
            <div className="bg-white border rounded-md px-4 py-2 text-sm font-medium shadow-sm">
                Feb 1, 2026 — Apr 29, 2026
            </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard 
                title="Total Revenue" 
                value={formatMoney(kpiData.totalRevenue)} 
                icon={<DollarSign className="h-4 w-4" />}
                trend="up"
                subtitle="vs last period"
            />
            <KpiCard 
                title="Gross Profit" 
                value={formatMoney(kpiData.grossProfit)}
                icon={<TrendingUp className="h-4 w-4" />}
                trend="up"
                subtitle="vs last period"
            />
            <KpiCard 
                title="Operating Profit" 
                value={formatMoney(kpiData.operatingProfit)}
                icon={<Wallet className="h-4 w-4" />}
                trend={(kpiData.operatingProfit > 0) ? "up" : "down"}
                subtitle="vs last period"
            />
            <KpiCard 
                title="Total Covers" 
                value={(kpiData.totalCovers || 0).toLocaleString()}
                icon={<Users className="h-4 w-4" />}
                subtitle="customers"
            />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
            <RevenueTrendChart data={trendData} />
            <CostBreakdownChart data={costData} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
            <TopItemsTable data={topItemsData} />
            <InventoryAlertsPanel alerts={alertsData} />
        </div>
        
        {/* Extra: Daily Summary Table */}
        <DailyRevenueSummaryTable data={summaryTableData} />

      </div>
    </AppLayout>
  );
}