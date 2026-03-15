'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getMenuImageUrl } from '@/lib/menu-image'
import { cn } from '@/lib/utils'

interface OrderItem {
  id: string
  qty: number
  unitPriceMmk?: number
  lineTotalMmk?: number
  menuItem?: { id: string; name: string }
}

interface PrevOrder {
  id: string
  orderNumber: string
  status: string
  orderedAt: string
  totalMmk: number
  items: OrderItem[]
}

interface OrdersSheetProps {
  open: boolean
  onClose: () => void
  tableId: string
  refreshKey?: number
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

function getStatusClass(status: string): string {
  if (status === 'READY') return 'bg-green-100 text-green-700'
  if (status === 'IN_PREP') return 'bg-orange-100 text-orange-700'
  if (status === 'SENT_TO_KITCHEN') return 'bg-blue-100 text-blue-700'
  if (status === 'SERVED') return 'bg-slate-100 text-slate-600'
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function formatStatus(status: string): string {
  return (status ?? '').replace(/_/g, ' ').toUpperCase()
}

export function OrdersSheet({ open, onClose, tableId, refreshKey }: OrdersSheetProps) {
  const [orders, setOrders] = useState<PrevOrder[]>([])

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders?tableId=${tableId}`)
      if (!response.ok) return

      const payload = await response.json()
      const data = Array.isArray(payload?.data) ? payload.data : []
      const nextOrders = data
        .slice()
        .sort((a: PrevOrder, b: PrevOrder) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
        .slice(0, 10)

      setOrders(nextOrders)
    } catch {
    }
  }, [tableId])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders, refreshKey])

  useEffect(() => {
    if (!open) return

    void fetchOrders()

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      void fetchOrders()
    }, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [open, fetchOrders])

  const activeOrders = orders.filter((order) => order.status !== 'CANCELLED')
  const grandTotal = activeOrders.reduce((sum, order) => sum + (order.totalMmk ?? 0), 0)

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <SheetContent side="right" className="w-[88vw] max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <span>🧾</span> Your Orders
          </SheetTitle>
        </SheetHeader>

        {orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="h-16 w-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <p className="font-medium text-muted-foreground">No orders yet</p>
            <p className="text-sm text-muted-foreground mt-1">Orders you place will appear here</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className={cn('rounded-xl border bg-card p-3 shadow-sm', order.status === 'CANCELLED' && 'opacity-60')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">#{order.orderNumber}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      getStatusClass(order.status)
                    )}
                  >
                    {formatStatus(order.status)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.orderedAt), { addSuffix: true })}
                </p>

                <div className="mt-3 space-y-2">
                  {order.items?.map((item) => {
                    const itemName = item.menuItem?.name ?? 'Item'
                    const imageUrl = item.menuItem?.name ? getMenuImageUrl(item.menuItem.name) : null
                    const lineTotal = item.lineTotalMmk ?? item.qty * (item.unitPriceMmk ?? 0)
                    const unitPrice = item.unitPriceMmk ?? (item.qty > 0 ? lineTotal / item.qty : 0)

                    return (
                      <div key={item.id} className="flex gap-3 items-center">
                        <div className="relative h-10 w-10 shrink-0">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={itemName}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-secondary/30 flex items-center justify-center">🍽️</div>
                          )}
                          <span className="absolute -right-1 -top-1 h-4 w-4 bg-[hsl(347,90%,46%)] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                            {item.qty}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.qty} × {formatMmk(unitPrice)} = {formatMmk(lineTotal)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-3 text-right font-bold">{formatMmk(order.totalMmk ?? 0)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="px-5 py-4 border-t shrink-0 bg-background">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total Orders</span>
            <span className="text-sm font-medium">{activeOrders.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Grand Total</span>
            <span className="text-lg font-bold text-[hsl(347,90%,46%)]">{formatMmk(grandTotal)}</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
