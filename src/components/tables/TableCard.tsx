'use client'

import { ReceiptText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TableOverview } from '@/components/tables/types'

interface TableCardProps {
  table: TableOverview
  onAcknowledge: (notificationId: string) => void
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

function formatMinutesAgo(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  return `${Math.max(0, minutes)}m ago`
}

export function TableCard({ table, onAcknowledge }: TableCardProps) {
  const hasPendingNotifications = table.pendingNotifications.length > 0
  const hasActiveOrders = table.activeOrderCount > 0

  const cardStateClass = hasPendingNotifications
    ? 'border-2 border-red-500 shadow-sm shadow-red-500/20'
    : hasActiveOrders
      ? 'border border-amber-400'
      : 'border'

  return (
    <article className={`rounded-xl bg-card p-4 shadow-sm ${cardStateClass}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold">Table {table.label}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          👥 {table.capacity}
        </span>
      </div>

      <div className="mt-3">
        {hasActiveOrders ? (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <ReceiptText className="h-3.5 w-3.5" />
              {table.activeOrderCount} order(s)
            </span>
            <span className="font-semibold">{formatMmk(table.totalMmk)}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No active orders</span>
        )}
      </div>

      {hasPendingNotifications && (
        <div className="mt-3 space-y-2">
          {table.pendingNotifications.map((notification) => {
            const waiter = notification.type === 'CALL_WAITER'
            return (
              <div key={notification.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                <div className="min-w-0 space-y-1">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${
                      waiter
                        ? 'border-red-200 bg-red-100 text-red-700'
                        : 'border-amber-200 bg-amber-100 text-amber-700'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                    {waiter ? '🔔 Waiter Called' : '💳 Bill Requested'}
                  </span>
                  <p className="text-xs text-muted-foreground">{formatMinutesAgo(notification.createdAt)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAcknowledge(notification.id)}
                  className="h-7 px-2 text-xs"
                >
                  ✓ Acknowledge
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}