'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { getMenuImageUrl } from '@/lib/menu-image'
import { cn } from '@/lib/utils'

interface PrevOrder {
  id: string
  orderNumber: string
  status: string
  orderedAt: string
  totalMmk: number
  items: {
    id: string
    qty: number
    menuItem?: { id: string; name: string }
  }[]
}

interface PreviousOrdersProps {
  tableId: string
  refreshKey?: number
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} MMK`
}

function getStatusClass(status: string): string {
  if (status === 'READY') return 'bg-green-100 text-green-700'
  if (status === 'IN_PREP') return 'bg-orange-100 text-orange-700'
  if (status === 'SENT_TO_KITCHEN') return 'bg-blue-100 text-blue-700'
  if (status === 'SERVED') return 'bg-slate-100 text-slate-600'
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

export function PreviousOrders({ tableId, refreshKey }: PreviousOrdersProps) {
  const [orders, setOrders] = useState<PrevOrder[]>([])

  useEffect(() => {
    let isMounted = true

    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/orders?tableId=${tableId}`)
        if (!response.ok) return

        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : []
        const nextOrders = data
          .slice()
          .sort((a: PrevOrder, b: PrevOrder) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
          .slice(0, 5)

        if (isMounted) {
          setOrders(nextOrders)
        }
      } catch {
      }
    }

    void fetchOrders()

    const intervalId = window.setInterval(() => {
      if (document.hidden) return
      void fetchOrders()
    }, 30000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [tableId, refreshKey])

  if (!orders.length) return null

  return (
    <section className="mt-4 border-t pt-3">
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-card-foreground">
        <span aria-hidden="true">🧾</span>
        <span>Your Orders</span>
      </h3>

      <div className="space-y-2.5">
        {orders.map((order) => (
          <div key={order.id} className="rounded-xl border bg-card p-3 shadow-sm text-card-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">#{order.orderNumber}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      getStatusClass(order.status)
                    )}
                  >
                    {(order.status ?? '').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(order.orderedAt), { addSuffix: true })}
                </p>
              </div>

              <div className="text-right text-sm font-semibold">{formatMmk(order.totalMmk)}</div>
            </div>

            {order.items?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {order.items.map((item) => {
                  const itemName = item.menuItem?.name ?? 'Item'
                  const imageUrl = item.menuItem?.name ? getMenuImageUrl(item.menuItem.name) : null

                  return (
                    <div key={item.id} className="flex max-w-[44px] flex-col items-center gap-1">
                      <div className="relative h-10 w-10">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={itemName}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm">🍽️</div>
                        )}

                        <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                          {item.qty}
                        </span>
                      </div>

                      <p className="w-full truncate text-center text-[10px] text-muted-foreground">{itemName}</p>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
