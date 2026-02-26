'use client'

import Image from 'next/image'
import { Clock, Loader2, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { getMenuImageUrl } from '@/lib/menu-image'
import { useOrderCartStore } from '@/store/orderCartStore'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  tableId: string
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function CartDrawer({ open, onClose, tableId }: CartDrawerProps) {
  const { toast } = useToast()
  const items = useOrderCartStore((state) => state.items)
  const totalMmkCount = useOrderCartStore((state) => state.totalMmk())
  const clearCart = useOrderCartStore((state) => state.clearCart)
  const updateQty = useOrderCartStore((state) => state.updateQty)
  const removeItem = useOrderCartStore((state) => state.removeItem)

  const [isPlacing, setIsPlacing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [prevOrders, setPrevOrders] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    fetch(`/api/orders?tableId=${tableId}`)
      .then(r => r.json())
      .then(j => {
        const orders = Array.isArray(j.data) ? j.data : []
        setPrevOrders(orders.slice(0, 3))
      })
      .catch(() => setPrevOrders([]))
  }, [open, tableId])

  async function handlePlaceOrder() {
    if (!items.length) {
      toast({ title: 'Cart is empty', description: 'Add items before placing an order.', variant: 'destructive' })
      return
    }

    setIsPlacing(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          source: 'QR',
          items: items.map((item) => ({
            menuItemId: item.menuItemId,
            qty: item.qty,
            unitPriceMmk: item.unitPriceMmk,
          })),
          notes: items.map((item) => item.notes).filter(Boolean).join(' | ') || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to place order.')
      }

      const orderNumber = payload?.data?.orderNumber ?? 'N/A'
      setSuccessMessage(`Order placed! #${orderNumber}`)
      toast({ title: `Order placed! #${orderNumber}`, description: 'Estimated wait: about 15-20 minutes.' })
      clearCart()
      
      // Refresh previous orders
      fetch(`/api/orders?tableId=${tableId}`)
        .then(res => res.json())
        .then(payload => {
          if (payload?.data) {
            const sorted = [...payload.data].sort((a, b) => 
              new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
            ).slice(0, 3)
            setPrevOrders(sorted)
          }
        })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place order.'
      toast({ title: 'Order failed', description: message, variant: 'destructive' })
    } finally {
      setIsPlacing(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-3xl border bg-background p-5 shadow-2xl animate-in slide-in-from-bottom-full duration-300 flex flex-col">
        <div className="mb-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold tracking-tight">Your Cart</h2>
          <Button size="icon" variant="ghost" className="rounded-full h-8 w-8 bg-secondary/50" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm shadow-sm shrink-0">
            <p className="font-semibold text-green-800">{successMessage}</p>
            <p className="text-green-600 mt-1">Estimated wait time: 15-20 minutes.</p>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-6 pb-4">
          <div className="space-y-3">
            {items.map((item) => {
              return (
                <div key={item.menuItemId} className="rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    {getMenuImageUrl(item.name) ? (
                      <Image
                        src={getMenuImageUrl(item.name)!}
                        alt={item.name}
                        width={52}
                        height={52}
                        className="rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">🍽️</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm leading-tight">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatMmk(item.unitPriceMmk)} each</p>
                          {item.notes ? <p className="text-xs text-muted-foreground mt-0.5">📝 {item.notes}</p> : null}
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeItem(item.menuItemId)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(item.menuItemId, item.qty - 1)}>-</Button>
                          <span className="min-w-6 text-center text-sm font-semibold">{item.qty}</span>
                          <Button size="sm" className="h-7 w-7 p-0" onClick={() => updateQty(item.menuItemId, item.qty + 1)}>+</Button>
                        </div>
                        <span className="text-sm font-bold">{formatMmk(item.unitPriceMmk * item.qty)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {!items.length ? (
              <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center">
                  <span className="text-2xl">🛒</span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">No items in cart yet.</p>
              </div>
            ) : null}
          </div>

          {/* Previous Orders Section */}
          {prevOrders.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Previous Orders
              </p>
              <div className="space-y-2">
                {prevOrders.map((order: any) => (
                  <div key={order.id} className="rounded-lg border bg-slate-50/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">#{order.orderNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        order.status === 'READY' ? 'bg-green-100 text-green-700' :
                        order.status === 'IN_PREP' ? 'bg-orange-100 text-orange-700' :
                        order.status === 'SENT_TO_KITCHEN' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'SERVED' ? 'bg-slate-100 text-slate-500' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {(order.status ?? '').replace(/_/g, ' ')}
                      </span>
                    </div>
                    {order.items?.length > 0 && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {order.items.map((i: any) => `${i.qty}× ${i.menuItem?.name ?? 'Item'}`).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-2 space-y-3 border-t pt-4 shrink-0 bg-background">
          <div className="flex items-center justify-between text-base">
            <span className="font-medium text-muted-foreground">Subtotal</span>
            <span className="font-bold text-lg">{formatMmk(totalMmkCount)}</span>
          </div>
          <Button 
            size="lg"
            className="w-full rounded-full h-12 text-base font-bold bg-[hsl(347,90%,46%)] hover:bg-[hsl(347,90%,40%)] text-white shadow-lg shadow-[hsl(347,90%,46%)]/20" 
            disabled={isPlacing || !items.length} 
            onClick={() => void handlePlaceOrder()}
          >
            {isPlacing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Place Order
          </Button>
        </div>
      </div>
    </>
  )
}
