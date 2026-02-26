"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CostBreakdownChartProps {
  data: Array<{ category: string; totalMmk: number }>;
}

const COLORS = ['hsl(347, 90%, 46%)', '#0f172a', '#94a3b8', '#f59e0b', '#64748b', '#cbd5e1'];

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  
  const formattedData = data.filter(d => d.totalMmk > 0);

  const formatTooltip = (value: number) => {
    return `${value.toLocaleString()} Ks`;
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 h-full">
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="totalMmk"
              nameKey="category"
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltip} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
