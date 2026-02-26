'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { usePosStore } from '@/store/posStore'
import type { PosOrderResult, PosTable } from '@/components/pos/types'

interface PosCartPanelProps {
  tables: PosTable[]
  onPlaced: (result: PosOrderResult) => void
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function PosCartPanel({ tables, onPlaced }: PosCartPanelProps) {
  const { toast } = useToast()
  const items = usePosStore((state) => state.items)
  const selectedTable = usePosStore((state) => state.selectedTable)
  const setTable = usePosStore((state) => state.setTable)
  const updateQty = usePosStore((state) => state.updateQty)
  const removeItem = usePosStore((state) => state.removeItem)
  const subtotal = usePosStore((state) => state.subtotal)

  const [isPlacing, setIsPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePlaceOrder() {
    setError(null)

    if (!items.length) {
      setError('Add items before placing an order.')
      return
    }

    if (!selectedTable) {
      setError('Select a table before placing an order.')
      return
    }

    setIsPlacing(true)

    try {
      const response = await fetch('/api/pos/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId: selectedTable,
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            qty: item.qty,
            unitPriceMmk: item.unitPriceMmk,
          })),
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to place POS order.')
      }

      const result = {
        orderNumber: String(payload?.data?.orderNumber ?? 'N/A'),
        totalMmk: Number(payload?.data?.totalMmk ?? subtotal()),
      }

      toast({ title: `Order placed #${result.orderNumber}`, description: 'Ticket sent to kitchen.' })
      onPlaced(result)
    } catch (errorValue) {
      const message = errorValue instanceof Error ? errorValue.message : 'Failed to place POS order.'
      setError(message)
      toast({ title: 'POS order failed', description: message, variant: 'destructive' })
    } finally {
      setIsPlacing(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Bill Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Table</p>
          <Select value={selectedTable ?? ''} onValueChange={(value) => setTable(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>{table.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.menuItemId} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatMmk(item.unitPriceMmk)} each</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeItem(item.menuItemId)}>Remove</Button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateQty(item.menuItemId, -1)}>-</Button>
                  <span className="min-w-8 text-center font-medium">{item.qty}</span>
                  <Button size="sm" onClick={() => updateQty(item.menuItemId, 1)}>+</Button>
                </div>
                <p className="font-semibold">{formatMmk(item.qty * item.unitPriceMmk)}</p>
              </div>
            </div>
          ))}

          {!items.length ? <p className="py-8 text-center text-sm text-muted-foreground">No items selected yet.</p> : null}
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between font-semibold">
            <span>Subtotal</span>
            <span>{formatMmk(subtotal())}</span>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button className="w-full" disabled={isPlacing} onClick={() => void handlePlaceOrder()}>
            {isPlacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Place Order
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { useState } from 'react'
