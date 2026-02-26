'use client'

import { Badge } from '@/components/ui/badge'
import { TicketCard } from '@/components/kitchen/TicketCard'
import type { KitchenTicket } from '@/components/kitchen/types'

interface KanbanColumnProps {
  title: string
  status: string
  tickets: KitchenTicket[]
  onStatusChange: (ticketId: string, nextStatus: 'IN_PREP' | 'READY' | 'SERVED') => Promise<void>
}

export function KanbanColumn({ title, status: _status, tickets, onStatusChange }: KanbanColumnProps) {
  return (
    <section className="flex h-[calc(100vh-104px)] flex-col rounded-lg border border-border/60 bg-card/20 p-3">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <Badge variant="outline" className="text-xs">{tickets.length}</Badge>
      </header>

      <div className="space-y-3 overflow-y-auto pr-1">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} onStatusChange={onStatusChange} />
        ))}
        {!tickets.length ? <p className="py-8 text-center text-xs text-muted-foreground">No tickets</p> : null}
      </div>
    </section>
  )
}
