'use client'

import Image from 'next/image'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/use-toast'
import { getMenuImageUrl } from '@/lib/menu-image'
import { useOrderCartStore } from '@/store/orderCartStore'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  tableId: string
  onOrderPlaced?: () => void
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function CartDrawer({ open, onClose, tableId, onOrderPlaced }: CartDrawerProps) {
  const { toast } = useToast()
  const items = useOrderCartStore((state) => state.items)
  const totalMmkCount = useOrderCartStore((state) => state.totalMmk())
  const clearCart = useOrderCartStore((state) => state.clearCart)
  const updateQty = useOrderCartStore((state) => state.updateQty)
  const removeItem = useOrderCartStore((state) => state.removeItem)

  const [isPlacing, setIsPlacing] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

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
      onOrderPlaced?.()
      closeTimerRef.current = window.setTimeout(() => {
        setSuccessMessage(null)
        onClose()
      }, 2500)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to place order.'
      toast({ title: 'Order failed', description: message, variant: 'destructive' })
    } finally {
      setIsPlacing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(value) => { if (!value) onClose() }}>
      <SheetContent side="right" className="w-[85vw] max-w-md flex flex-col p-0">
        <SheetHeader className="sticky top-0 z-10 border-b bg-background px-5 pt-5 pb-3">
          <div className="flex items-center justify-between pr-8">
            <SheetTitle className="text-xl font-bold tracking-tight">Your Cart</SheetTitle>
            <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-secondary px-2 text-sm font-semibold">
              {items.length}
            </span>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5">
          {successMessage ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700 animate-bounce">
                <Check className="h-7 w-7" />
              </div>
              <p className="text-base font-semibold text-green-700">{successMessage}</p>
              <p className="mt-1 text-sm text-muted-foreground">Estimated wait time: 15-20 minutes.</p>
            </div>
          ) : items.length ? (
            <div className="space-y-3 py-4">
              {items.map((item) => {
                return (
                  <div key={item.menuItemId} className="rounded-xl border p-3 bg-card">
                    <div className="flex items-start gap-3">
                      {getMenuImageUrl(item.name) ? (
                        <Image
                          src={getMenuImageUrl(item.name)!}
                          alt={item.name}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">🍽️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm leading-tight">{item.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatMmk(item.unitPriceMmk)} each</p>
                            {item.notes ? <p className="text-xs text-muted-foreground mt-0.5">📝 {item.notes}</p> : null}
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full" onClick={() => removeItem(item.menuItemId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0" onClick={() => updateQty(item.menuItemId, item.qty - 1)}>-</Button>
                            <span className="min-w-6 text-center text-sm font-semibold">{item.qty}</span>
                            <Button size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => updateQty(item.menuItemId, item.qty + 1)}>+</Button>
                          </div>
                          <span className="text-sm font-bold">{formatMmk(item.unitPriceMmk * item.qty)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="text-5xl">🛒</div>
              <p className="mt-3 text-base font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your favorites from the menu to get started.</p>
              <SheetClose asChild>
                <Button className="mt-5 rounded-full" variant="outline" onClick={onClose}>
                  Browse Menu
                </Button>
              </SheetClose>
            </div>
          )}
        </div>

        <SheetFooter className="sticky bottom-0 border-t bg-background px-5 pb-5 pt-3">
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-base">
              <span className="font-medium text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">{formatMmk(totalMmkCount)}</span>
            </div>
            <Button
              size="lg"
              className="w-full bg-[hsl(347,90%,46%)] hover:bg-[hsl(347,90%,40%)] text-white rounded-full h-12 text-base font-bold"
              disabled={isPlacing || !items.length || Boolean(successMessage)}
              onClick={() => void handlePlaceOrder()}
            >
              {isPlacing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Place Order
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
