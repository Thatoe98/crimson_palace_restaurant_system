"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";

interface Alert {
  ingredientId: string;
    ingredientName?: string; // Add name if available, fallback to ID if not
  actions: string[];
  closingOnHand: number;
  reorderPoint: number;
  earliestExpiryDate: string | null;
}

interface InventoryAlertsPanelProps {
  alerts: Alert[];
}

export function InventoryAlertsPanel({ alerts }: InventoryAlertsPanelProps) {
  const getBadgeVariant = (action: string) => {
    switch (action) {
      case 'REORDER':
        return 'destructive';
      case 'SPOILAGE_WRITE_OFF':
        return 'default'; // Reuse default red for write off 
      case 'USE_FAST_DISCOUNT':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getBadgeColor = (action: string) => {
    switch (action) {
        case 'REORDER':
          return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
        case 'SPOILAGE_WRITE_OFF':
          return 'bg-orange-500 hover:bg-orange-600 text-white border-transparent';
        case 'USE_FAST_DISCOUNT':
            return 'bg-amber-400 hover:bg-amber-500 text-black border-transparent';
        default:
          return 'bg-slate-100 text-slate-900 border-slate-200';
      }
  }

  // Deduplicate alerts by ingredient if needed, or just show list
  // Assuming alerts come sorted by priority

  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Inventory Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {safeAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
            <Info className="h-8 w-8 mb-2" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {safeAlerts.slice(0, 5).map((alert, idx) => (
              <div key={`${alert.ingredientId}-${idx}`} className="flex flex-col space-y-1 pb-3 border-b last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate max-w-[150px]" title={alert.ingredientId}>
                    {alert.ingredientName || alert.ingredientId}
                  </span>
                  <div className="flex gap-1 justify-end flex-wrap">
                      {alert.actions.map(action => (
                           <Badge key={action} className={`text-[10px] px-1.5 py-0.5 h-auto ${getBadgeColor(action)}`}>
                           {action.replace(/_/g, ' ')}
                         </Badge>
                      ))}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className={alert.closingOnHand <= alert.reorderPoint ? "text-red-500 font-medium" : ""}>
                    Stock: {alert.closingOnHand.toLocaleString()} (Min: {alert.reorderPoint.toLocaleString()})
                  </span>
                  {alert.earliestExpiryDate && (
                      <span>Exp: {alert.earliestExpiryDate}</span>
                  )}
                </div>
              </div>
            ))}
            {safeAlerts.length > 5 && (
                <div className="text-center text-xs text-muted-foreground pt-2">
                    + {safeAlerts.length - 5} more alerts
                </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
