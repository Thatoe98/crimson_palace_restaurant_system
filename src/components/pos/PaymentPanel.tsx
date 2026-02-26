'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PosOrderResult } from '@/components/pos/types'

interface PaymentPanelProps {
  result: PosOrderResult
  onNewOrder: () => void
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function PaymentPanel({ result, onNewOrder }: PaymentPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Confirmation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-primary/10 p-4">
          <p className="text-sm text-muted-foreground">Order Number</p>
          <p className="text-xl font-semibold text-primary">#{result.orderNumber}</p>
          <p className="mt-3 text-sm text-muted-foreground">Total</p>
          <p className="text-xl font-semibold">{formatMmk(result.totalMmk)}</p>
        </div>

        <Button className="w-full" onClick={onNewOrder}>New Order</Button>
      </CardContent>
    </Card>
  )
}
