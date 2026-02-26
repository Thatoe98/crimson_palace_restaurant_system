'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { KanbanColumn } from '@/components/kitchen/KanbanColumn'
import type { KitchenTicket } from '@/components/kitchen/types'

interface KitchenResponse {
  data: KitchenTicket[]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function KitchenClient() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const isUpdating = useRef(false)

  const fetchTickets = useCallback(async () => {
    if (isUpdating.current) return

    try {
      const response = await fetch('/api/kitchen/tickets', { cache: 'no-store' })
      const payload = await response.json() as KitchenResponse
      if (!response.ok) {
        throw new Error((payload as { error?: string }).error ?? 'Failed to fetch kitchen tickets.')
      }

      setTickets(Array.isArray(payload.data) ? payload.data : [])
      setLastUpdated(new Date())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch kitchen tickets.'
      toast({ title: 'Kitchen refresh failed', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchTickets()

    const intervalId = setInterval(() => {
      void fetchTickets()
    }, 5000)

    return () => clearInterval(intervalId)
  }, [fetchTickets])

  async function handleStatusChange(ticketId: string, nextStatus: 'IN_PREP' | 'READY' | 'SERVED') {
    isUpdating.current = true

    setTickets((prev) =>
      prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: nextStatus } : ticket))
    )

    try {
      const response = await fetch(`/api/kitchen/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to update status.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update ticket status.'
      toast({ title: 'Status update failed', description: message, variant: 'destructive' })
    } finally {
      isUpdating.current = false
      void fetchTickets()
    }
  }

  const waitingTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'SENT_TO_KITCHEN'), [tickets])
  const cookingTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'IN_PREP'), [tickets])
  const readyTickets = useMemo(() => tickets.filter((ticket) => ticket.status === 'READY'), [tickets])

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <header className="mb-4 flex flex-col gap-2 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Kitchen Display</h1>
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <span>Last updated: {lastUpdated ? formatTime(lastUpdated) : '--:--'}</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1">
            <RefreshCw className="h-3.5 w-3.5" />
            Auto-refresh 5s
          </span>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[70vh] bg-zinc-800" />
          <Skeleton className="h-[70vh] bg-zinc-800" />
          <Skeleton className="h-[70vh] bg-zinc-800" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <KanbanColumn title="WAITING" status="SENT_TO_KITCHEN" tickets={waitingTickets} onStatusChange={handleStatusChange} />
          <KanbanColumn title="COOKING" status="IN_PREP" tickets={cookingTickets} onStatusChange={handleStatusChange} />
          <KanbanColumn title="READY" status="READY" tickets={readyTickets} onStatusChange={handleStatusChange} />
        </div>
      )}
    </main>
  )
}
