import { InventoryAlertsPanel } from "@/components/dashboard/InventoryAlertsPanel";
import InventoryKpiRow from "@/components/inventory/InventoryKpiRow";
import InventoryStatusTable from "@/components/inventory/InventoryStatusTable";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InventoryStatusRow {
  date: string;
  ingredientId: string;
  category: string;
  uomCode: string;
  closingOnHand: number;
  reorderPoint: number;
  reorderFlag: boolean;
  expiryFlag: boolean;
  suggestedActionRaw: string | null;
}

interface CriticalItem {
  ingredientId: string;
  ingredientUom: string;
  closingOnHand: number;
  reorderPoint: number;
  actions: string[];
}

interface LatestAlertsResponse {
  date: string;
  summaryByAction: {
    REORDER: number;
    SPOILAGE_WRITE_OFF: number;
    USE_FAST: number;
    DISCOUNT: number;
  };
  criticalItems: CriticalItem[];
}

interface InventoryAlert {
  ingredientId: string;
  ingredientName?: string;
  actions: string[];
  closingOnHand: number;
  reorderPoint: number;
  earliestExpiryDate: string | null;
}

const EMPTY_ALERTS: LatestAlertsResponse = {
  date: "",
  summaryByAction: {
    REORDER: 0,
    SPOILAGE_WRITE_OFF: 0,
    USE_FAST: 0,
    DISCOUNT: 0,
  },
  criticalItems: [],
};

async function getInventoryStatus(): Promise<InventoryStatusRow[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/inventory/status`, { next: { revalidate: 60 } });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    const data = json.data ?? json;
    return Array.isArray(data) ? (data as InventoryStatusRow[]) : [];
  } catch {
    return [];
  }
}

async function getLatestAlerts(): Promise<LatestAlertsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/inventory/alerts/latest`, { next: { revalidate: 60 } });
    if (!res.ok) {
      return EMPTY_ALERTS;
    }

    const json = await res.json();
    const data = json.data ?? json;

    if (!data || typeof data !== "object") {
      return EMPTY_ALERTS;
    }

    const summaryByAction = data.summaryByAction ?? EMPTY_ALERTS.summaryByAction;

    return {
      date: typeof data.date === "string" ? data.date : "",
      summaryByAction: {
        REORDER: Number(summaryByAction.REORDER ?? 0),
        SPOILAGE_WRITE_OFF: Number(summaryByAction.SPOILAGE_WRITE_OFF ?? 0),
        USE_FAST: Number(summaryByAction.USE_FAST ?? 0),
        DISCOUNT: Number(summaryByAction.DISCOUNT ?? 0),
      },
      criticalItems: Array.isArray(data.criticalItems) ? (data.criticalItems as CriticalItem[]) : [],
    };
  } catch {
    return EMPTY_ALERTS;
  }
}

export default async function InventoryPage() {
  const [statusRows, latestAlerts] = await Promise.all([getInventoryStatus(), getLatestAlerts()]);

  const totalSkus = statusRows.length;
  const reorderCount = statusRows.filter((row) => row.reorderFlag).length;
  const expiryCount = statusRows.filter((row) => row.expiryFlag).length;
  const criticalCount = latestAlerts.criticalItems.length;

  const adaptedAlerts: InventoryAlert[] = latestAlerts.criticalItems.map((item) => ({
    ingredientId: item.ingredientId,
    actions: item.actions.map((action) => (action === "USE_FAST" ? "USE_FAST_DISCOUNT" : action)),
    closingOnHand: item.closingOnHand,
    reorderPoint: item.reorderPoint,
    earliestExpiryDate: null,
  }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          {latestAlerts.date ? (
            <p className="text-muted-foreground text-sm">Snapshot: {latestAlerts.date}</p>
          ) : null}
        </div>

        <InventoryKpiRow
          totalSkus={totalSkus}
          reorderCount={reorderCount}
          expiryCount={expiryCount}
          criticalCount={criticalCount}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Status</CardTitle>
              </CardHeader>
              <CardContent>
                <InventoryStatusTable rows={statusRows} />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <InventoryAlertsPanel alerts={adaptedAlerts} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
