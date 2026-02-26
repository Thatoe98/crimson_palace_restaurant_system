"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Define the interface based on the actual data structure
interface DailySummary {
  date: string;
  totalCovers: number;
  netSalesMmk: number;
  totalCostMmk: number;
  grossProfitMmk: number;
  operatingProfitMmk: number;
  isOpen: boolean;
}

interface DailyRevenueSummaryTableProps {
  data: DailySummary[];
}

export function DailyRevenueSummaryTable({ data }: DailyRevenueSummaryTableProps) {
  // Sort by date descending if not already
  const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 7);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Daily Performance (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Covers</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right hidden md:table-cell">COGS</TableHead>
              <TableHead className="text-right">Gross Profit</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Op. Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row) => (
              <TableRow key={row.date} className={cn(!row.isOpen && "opacity-50 bg-slate-50")}>
                <TableCell className="font-medium whitespace-nowrap">
                    {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {!row.isOpen && <span className="ml-2 text-xs italic text-slate-500">(Closed)</span>}
                </TableCell>
                <TableCell className="text-right font-mono">{row.isOpen ? row.totalCovers : '-'}</TableCell>
                <TableCell className="text-right font-mono font-medium">{row.isOpen ? `${row.netSalesMmk.toLocaleString()} Ks` : '-'}</TableCell>
                <TableCell className="text-right font-mono text-slate-600 hidden md:table-cell">{row.isOpen ? `${row.totalCostMmk.toLocaleString()} Ks` : '-'}</TableCell>
                <TableCell className="text-right font-mono text-green-700">{row.isOpen ? `${row.grossProfitMmk.toLocaleString()} Ks` : '-'}</TableCell>
                <TableCell className="text-right font-mono hidden sm:table-cell font-bold text-slate-800">{row.isOpen ? `${row.operatingProfitMmk.toLocaleString()} Ks` : '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
