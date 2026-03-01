'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Clock, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import type { KitchenTicket } from '@/components/kitchen/types'

type FilterTab = 'ALL' | 'NEW' | 'ACCEPTED'

const isNew = (s: string) => s === 'OPEN' || s === 'SENT_TO_KITCHEN'
const isAccepted = (s: string) => s === 'IN_PREP'

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function KitchenClient() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<KitchenTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filter, setFilter] = useState<FilterTab>('ALL')
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch('/api/kitchen/tickets', { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Fetch failed')
      setTickets(Array.isArray(payload.data) ? payload.data : [])
      setLastUpdated(new Date())
    } catch (err) {
      toast({ title: 'Refresh failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchTickets()
    const id = setInterval(() => void fetchTickets(), 5000)
    return () => clearInterval(id)
  }, [fetchTickets])

  async function callStatus(ticketId: string, status: string) {
    if (busy.has(ticketId)) return
    const snapshot = tickets
    setBusy(s => new Set(s).add(ticketId))

    // Optimistic: remove if SERVED or CANCELLED, else update status
    setTickets(prev =>
      status === 'SERVED' || status === 'CANCELLED'
        ? prev.filter(t => t.id !== ticketId)
        : prev.map(t => t.id === ticketId ? { ...t, status } : t)
    )

    try {
      const res = await fetch(`/api/kitchen/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Update failed')
    } catch (err) {
      setTickets(snapshot)
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' })
    } finally {
      setBusy(s => { const n = new Set(s); n.delete(ticketId); return n })
    }
  }

  async function cancelItem(ticketId: string, itemId: string) {
    const snapshot = tickets
    setTickets(prev =>
      prev
        .map(t => t.id !== ticketId ? t : {
          ...t,
          items: t.items.map(i => i.id === itemId ? { ...i, kitchenStatus: 'CANCELLED' } : i),
        })
        .filter(t => t.items.some(i => i.kitchenStatus !== 'CANCELLED'))
    )

    try {
      const res = await fetch(`/api/kitchen/tickets/${ticketId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error ?? 'Cancel failed')
    } catch (err) {
      setTickets(snapshot)
      toast({ title: 'Cancel item failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' })
    }
  }

  const allActive = tickets.filter(t => isNew(t.status) || isAccepted(t.status))
  const newTickets = tickets.filter(t => isNew(t.status))
  const acceptedTickets = tickets.filter(t => isAccepted(t.status))

  const displayed = filter === 'NEW' ? newTickets
    : filter === 'ACCEPTED' ? acceptedTickets
    : allActive

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'ALL',      label: 'All',      count: allActive.length },
    { key: 'NEW',      label: 'New',      count: newTickets.length },
    { key: 'ACCEPTED', label: 'Accepted', count: acceptedTickets.length },
  ]

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-zinc-100">
      <header className="mb-5 flex flex-col gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Kitchen Display</h1>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{lastUpdated ? formatTime(lastUpdated) : '--:--'}</span>
            <span className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs">
              <RefreshCw className="h-3 w-3" /> 5s
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs ${filter === tab.key ? 'bg-zinc-600' : 'bg-zinc-700'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-44 w-full bg-zinc-800" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-zinc-500">No active orders</div>
      ) : (
        <div className="space-y-3">
          {displayed.map((ticket) => {
            const isBusy = busy.has(ticket.id)
            const visibleItems = ticket.items.filter(i => i.kitchenStatus !== 'CANCELLED')
            const accepted = isAccepted(ticket.status)

            return (
              <article
                key={ticket.id}
                className={`rounded-xl border bg-zinc-900 p-4 transition-opacity ${
                  accepted ? 'border-green-500/40' : 'border-amber-500/40'
                } ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {/* Header */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-zinc-100">#{ticket.orderNumber}</span>
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                      Table {ticket.tableLabel}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${
                      accepted
                        ? 'border-green-500/40 bg-green-500/10 text-green-400'
                        : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                    }`}>
                      {accepted ? 'COOKING' : 'NEW'}
                    </span>
                  </div>
                  <div className={`flex shrink-0 items-center gap-1 text-sm font-medium ${ticket.isOverdue ? 'text-red-400' : 'text-zinc-400'}`}>
                    {ticket.isOverdue && <AlertTriangle className="h-3.5 w-3.5" />}
                    {ticket.elapsedMinutes} min
                  </div>
                </div>

                {/* Items */}
                <ul className="mb-4 overflow-hidden rounded-lg bg-zinc-800/50">
                  {visibleItems.map(item => (
                    <li key={item.id} className="flex items-center gap-3 border-b border-zinc-700/50 px-3 py-2 last:border-0">
                      <span className="w-6 shrink-0 text-center text-sm font-semibold text-zinc-300">{item.qty}×</span>
                      <span className="flex-1 text-sm">{item.menuItemName}</span>
                      {item.notes && <span className="text-xs italic text-zinc-500">{item.notes}</span>}
                      <button
                        onClick={() => void cancelItem(ticket.id, item.id)}
                        title="Remove item"
                        className="rounded p-1 text-zinc-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                  {visibleItems.length === 0 && (
                    <li className="px-3 py-2 text-sm italic text-zinc-500">All items removed</li>
                  )}
                </ul>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void callStatus(ticket.id, 'CANCELLED')}
                    className="border-red-800/60 text-red-400 hover:bg-red-900/30 hover:text-red-300"
                  >
                    Cancel Order
                  </Button>
                  {accepted ? (
                    <Button
                      size="sm"
                      onClick={() => void callStatus(ticket.id, 'SERVED')}
                      className="ml-auto bg-green-600 hover:bg-green-700 text-white"
                    >
                      ✓ Done / Served
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => void callStatus(ticket.id, 'IN_PREP')}
                      className="ml-auto"
                    >
                      ▶ Accept
                    </Button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
