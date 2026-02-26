import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

export function KpiCard({ title, value, subtitle, trend, icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-[hsl(347,90%,46%)]">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            {trend === 'up' && <ArrowUp className="mr-1 h-3 w-3 text-green-600" />}
            {trend === 'down' && <ArrowDown className="mr-1 h-3 w-3 text-red-600" />}
            {trend === 'neutral' && <Minus className="mr-1 h-3 w-3 text-slate-400" />}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
