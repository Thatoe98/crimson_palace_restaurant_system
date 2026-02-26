'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { KitchenTicket } from '@/components/kitchen/types'

interface TicketCardProps {
  ticket: KitchenTicket
  onStatusChange: (ticketId: string, nextStatus: 'IN_PREP' | 'READY' | 'SERVED') => Promise<void>
}

function getAction(status: string): { label: string; nextStatus: 'IN_PREP' | 'READY' | 'SERVED' } | null {
  if (status === 'SENT_TO_KITCHEN') return { label: 'Start Cooking', nextStatus: 'IN_PREP' }
  if (status === 'IN_PREP') return { label: 'Mark Ready', nextStatus: 'READY' }
  if (status === 'READY') return { label: 'Served', nextStatus: 'SERVED' }
  return null
}

export function TicketCard({ ticket, onStatusChange }: TicketCardProps) {
  const action = getAction(ticket.status)

  return (
    <article className={`rounded-lg border bg-card/30 p-3 ${ticket.isOverdue ? 'border-destructive' : 'border-border'}`}>
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Order #{ticket.orderNumber}</p>
          <p className="text-xs text-muted-foreground">Table {ticket.tableLabel ?? ticket.tableId}</p>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${ticket.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
          {ticket.isOverdue ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
          {ticket.elapsedMinutes} min
        </div>
      </header>

      <ul className="space-y-1 text-sm">
        {ticket.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{item.qty} ×</span>
            <span className="flex-1">{item.menuItemName}</span>
          </li>
        ))}
      </ul>

      {action ? (
        <Button className="mt-3 w-full" onClick={() => void onStatusChange(ticket.id, action.nextStatus)}>
          {action.label}
        </Button>
      ) : null}
    </article>
  )
}
