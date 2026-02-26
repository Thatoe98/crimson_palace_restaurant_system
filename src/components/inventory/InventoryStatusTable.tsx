"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

interface InventoryStatusTableProps {
  rows: InventoryStatusRow[];
}

function formatAction(action: string | null): string {
  if (!action) {
    return "—";
  }

  return action.replace(/_/g, " ");
}

function StatusBadge({ reorderFlag, expiryFlag }: { reorderFlag: boolean; expiryFlag: boolean }) {
  if (reorderFlag) {
    return <Badge className="bg-red-600 hover:bg-red-700 text-white border-transparent">Reorder</Badge>;
  }

  if (expiryFlag) {
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-black border-transparent">Expiry Risk</Badge>;
  }

  return <Badge className="bg-green-600 hover:bg-green-700 text-white border-transparent">OK</Badge>;
}

export default function InventoryStatusTable({ rows }: InventoryStatusTableProps) {
  const safeRows = Array.isArray(rows) ? rows : [];

  return (
    <div className="max-h-[520px] overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ingredient ID</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>UOM</TableHead>
            <TableHead className="text-right">On Hand</TableHead>
            <TableHead className="text-right">Reorder Point</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Suggested Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No inventory status data available.
              </TableCell>
            </TableRow>
          ) : (
            safeRows.map((row) => (
              <TableRow key={`${row.date}-${row.ingredientId}`}>
                <TableCell className="font-medium">{row.ingredientId}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.uomCode}</TableCell>
                <TableCell className="text-right">{row.closingOnHand.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.reorderPoint.toLocaleString()}</TableCell>
                <TableCell>
                  <StatusBadge reorderFlag={row.reorderFlag} expiryFlag={row.expiryFlag} />
                </TableCell>
                <TableCell>{formatAction(row.suggestedActionRaw)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
