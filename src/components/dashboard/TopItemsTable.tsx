"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TopItem {
  menuItemId: string;
  name: string;
  section: string;
  totalQty: number;
  totalSalesMmk: number;
  totalGrossProfitMmk: number;
  costPct: number;
}

interface TopItemsTableProps {
  data: TopItem[];
}

export function TopItemsTable({ data }: TopItemsTableProps) {
  return (
    <Card className="col-span-1 md:col-span-3 lg:col-span-6 h-full">
      <CardHeader>
        <CardTitle>Top Selling Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={item.menuItemId}>
                <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline" className="w-fit mt-1 text-[10px] px-1 py-0 h-5 font-normal text-slate-500 border-slate-200">
                      {item.section}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-slate-600">{item.totalQty}</TableCell>
                <TableCell className="text-right font-mono font-medium">{item.totalSalesMmk.toLocaleString()} Ks</TableCell>
                <TableCell className="text-right font-mono text-slate-600">
                  {((1 - (item.costPct / 100)) * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
