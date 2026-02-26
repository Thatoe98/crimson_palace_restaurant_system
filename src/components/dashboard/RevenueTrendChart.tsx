"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RevenueTrendChartProps {
  data: Array<{ date: string; netSalesMmk: number; operatingProfitMmk: number }>;
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  // Format numbers to "K Ks" for Y-axis
  const formatYAxis = (value: number) => {
    return `${(value / 1000).toFixed(0)}K`;
  };

  // Format tooltip values
  const formatTooltip = (value: number) => {
    return `${value.toLocaleString()} Ks`;
  };

  return (
    <Card className="col-span-1 md:col-span-3 lg:col-span-6 h-full">
      <CardHeader>
        <CardTitle>Revenue & Profit Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 0,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: "#647481" }} 
              axisLine={false} 
              tickLine={false}
              minTickGap={30}
            />
            <YAxis 
               tickFormatter={formatYAxis}
               tick={{ fontSize: 12, fill: "#647481" }} 
               axisLine={false} 
               tickLine={false}
               width={45}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="netSalesMmk" 
              name="Net Sales" 
              stroke="hsl(347, 90%, 46%)" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 6 }} 
            />
            <Line 
              type="monotone" 
              dataKey="operatingProfitMmk" 
              name="Operating Profit" 
              stroke="#64748b" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
