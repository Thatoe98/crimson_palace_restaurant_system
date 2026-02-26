"use client";

import { Card, CardContent } from "@/components/ui/card";

interface InventoryKpiRowProps {
  totalSkus: number;
  reorderCount: number;
  expiryCount: number;
  criticalCount: number;
}

function KpiCard({ value, label, valueClassName }: { value: number; label: string; valueClassName?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className={`text-3xl font-bold ${valueClassName ?? "text-foreground"}`}>{value.toLocaleString()}</div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function InventoryKpiRow({
  totalSkus,
  reorderCount,
  expiryCount,
  criticalCount,
}: InventoryKpiRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <KpiCard value={totalSkus} label="Total SKUs" />
      <KpiCard value={reorderCount} label="Reorder Needed" valueClassName="text-red-600" />
      <KpiCard value={expiryCount} label="Expiry Risk" valueClassName="text-amber-600" />
      <KpiCard value={criticalCount} label="Critical Items" valueClassName="text-red-600" />
    </div>
  );
}
