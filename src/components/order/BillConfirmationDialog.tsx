'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Loader2, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getMenuImageUrl } from '@/lib/menu-image'

interface BillConfirmationDialogProps {
  open: boolean
  onClose: () => void
  tableId: string
}

interface BillOrder {
  id: string
  orderNumber: string
  status: string
  totalMmk: number
  items: { id: string; qty: number; lineTotalMmk?: number; menuItem?: { name: string } }[]
}

type Stage = 'summary' | 'sending' | 'goodbye'

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

export function BillConfirmationDialog({ open, onClose, tableId }: BillConfirmationDialogProps) {
  const [stage, setStage] = useState<Stage>('summary')
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    let mounted = true
    const controller = new AbortController()

    setStage('summary')
    setLoading(true)
    setError(null)

    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/orders?tableId=${tableId}`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error('Failed to load your order summary. Please try again.')
        }

        const payload = await response.json()
        const data = Array.isArray(payload?.data) ? payload.data : []

        if (mounted) {
          setOrders(data)
        }
      } catch (err) {
        if (controller.signal.aborted) return
        if (!mounted) return

        const message = err instanceof Error ? err.message : 'Failed to load your order summary. Please try again.'
        setError(message)
        setOrders([])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void fetchOrders()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [open, tableId])

  const activeOrders = useMemo(() => {
    return (orders as BillOrder[]).filter((order) => order.status !== 'CANCELLED')
  }, [orders])

  const grandTotal = useMemo(() => {
    return activeOrders.reduce((sum, order) => sum + (order.totalMmk ?? 0), 0)
  }, [activeOrders])

  const hasOrders = activeOrders.length > 0

  const requestBill = async () => {
    setStage('sending')
    setError(null)

    try {
      const response = await fetch('/api/tables/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, type: 'ASK_BILL' }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = typeof payload?.error === 'string' ? payload.error : 'Failed to request your bill. Please try again.'
        throw new Error(message)
      }

      setStage('goodbye')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request your bill. Please try again.'
      setError(message)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        {stage === 'summary' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-left">Ask for Bill</DialogTitle>
              <DialogDescription className="text-left">
                Please review your order summary before requesting your bill.
              </DialogDescription>
            </DialogHeader>

            {loading ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(347,90%,46%)]" />
              </div>
            ) : (
              <div className="space-y-4">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                ) : null}

                {hasOrders ? (
                  <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                    {activeOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">#{order.orderNumber}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getStatusClass(order.status)}`}
                          >
                            {formatStatus(order.status)}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2">
                          {order.items?.map((item) => {
                            const itemName = item.menuItem?.name ?? 'Item'
                            const imageUrl = item.menuItem?.name ? getMenuImageUrl(item.menuItem.name) : null
                            const lineTotal = item.lineTotalMmk ?? 0

                            return (
                              <div key={item.id} className="flex items-center gap-3">
                                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                                  {imageUrl ? (
                                    <Image src={imageUrl} alt={itemName} width={36} height={36} className="h-9 w-9 object-cover" />
                                  ) : (
                                    <div className="flex h-9 w-9 items-center justify-center text-sm">🍽️</div>
                                  )}
                                </div>

                                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                                  <p className="truncate text-sm">
                                    {item.qty} × {itemName}
                                  </p>
                                  <p className="shrink-0 text-sm font-medium">{formatMmk(lineTotal)}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                    No orders found
                  </div>
                )}

                <div className="rounded-xl bg-secondary/30 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Grand Total</span>
                    <span className="text-2xl font-bold">{formatMmk(grandTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-[hsl(347,90%,46%)] hover:bg-[hsl(347,90%,42%)]"
                    onClick={() => void requestBill()}
                    disabled={!hasOrders || loading}
                  >
                    Confirm — Request Bill
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {stage === 'sending' && (
          <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
            {error ? (
              <div className="space-y-3">
                <p className="text-sm text-red-700">{error}</p>
                <Button type="button" onClick={() => void requestBill()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[hsl(347,90%,46%)]" />
                <p className="text-sm text-muted-foreground">Requesting your bill...</p>
              </div>
            )}
          </div>
        )}

        {stage === 'goodbye' && (
          <div className="flex flex-col items-center text-center space-y-4 py-6">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold">Thank you for dining with us! 🙏</h3>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Your bill is being prepared. A staff member will be with you shortly.
            </p>
            <p className="text-muted-foreground text-sm">Please wait at your table.</p>
            <div className="pt-4">
              <Button variant="outline" onClick={onClose} className="rounded-full">
                Back to Menu
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
