'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { TableCard } from '@/components/tables/TableCard'
import type { TableOverview, TableNotificationData } from '@/components/tables/types'
import { Skeleton } from '@/components/ui/skeleton'

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function TablesClient() {
  const { toast } = useToast()

  const [tables, setTables] = useState<TableOverview[]>([])
  const [notifications, setNotifications] = useState<TableNotificationData[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const prevNotifIds = useRef<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (document.hidden) return

    try {
      const [overviewRes, notificationsRes] = await Promise.all([
        fetch('/api/tables/overview', { cache: 'no-store' }),
        fetch('/api/tables/notifications', { cache: 'no-store' }),
      ])

      const [overviewPayload, notificationsPayload] = await Promise.all([
        overviewRes.json(),
        notificationsRes.json(),
      ])

      if (!overviewRes.ok) throw new Error(overviewPayload?.error ?? 'Failed to load tables')
      if (!notificationsRes.ok) throw new Error(notificationsPayload?.error ?? 'Failed to load notifications')

      const fetchedTables: TableOverview[] = Array.isArray(overviewPayload?.data) ? overviewPayload.data : []
      const fetchedNotifications: TableNotificationData[] = Array.isArray(notificationsPayload?.data)
        ? notificationsPayload.data
        : []

      const pendingNotifications = fetchedNotifications.filter((notification) => notification.status === 'PENDING')

      const pendingByTable = new Map<string, TableNotificationData[]>()
      for (const notification of pendingNotifications) {
        const existing = pendingByTable.get(notification.tableId) ?? []
        pendingByTable.set(notification.tableId, [...existing, notification])
      }

      const normalizedTables = fetchedTables.map((table) => ({
        ...table,
        pendingNotifications: pendingByTable.get(table.id) ?? table.pendingNotifications ?? [],
      }))

      const labelByTableId = new Map(normalizedTables.map((table) => [table.id, table.label]))
      const newNotifications = pendingNotifications.filter(
        (notification) => !prevNotifIds.current.has(notification.id)
      )

      for (const notification of newNotifications) {
        const label = notification.tableLabel ?? labelByTableId.get(notification.tableId) ?? notification.tableId
        if (notification.type === 'CALL_WAITER') {
          toast({
            title: '🔔 Waiter Requested',
            description: `Table ${label} is calling a waiter!`,
          })
          continue
        }

        toast({
          title: '💳 Bill Requested',
          description: `Table ${label} is requesting the bill!`,
        })
      }

      prevNotifIds.current = new Set(pendingNotifications.map((notification) => notification.id))
      setTables(normalizedTables)
      setNotifications(pendingNotifications)
      setLastUpdated(new Date())
    } catch (err) {
      toast({
        title: 'Refresh failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchData()
    const id = setInterval(() => void fetchData(), 5000)
    return () => clearInterval(id)
  }, [fetchData])

  async function handleAcknowledge(notificationId: string) {
    const notificationsSnapshot = notifications
    const tablesSnapshot = tables

    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId))
    setTables((prev) => prev.map((table) => ({
      ...table,
      pendingNotifications: table.pendingNotifications.filter((notification) => notification.id !== notificationId),
    })))

    try {
      const res = await fetch(`/api/tables/notifications/${notificationId}/acknowledge`, {
        method: 'PATCH',
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? 'Acknowledge failed')
    } catch (err) {
      setNotifications(notificationsSnapshot)
      setTables(tablesSnapshot)
      await fetchData()
      toast({
        title: 'Acknowledge failed',
        description: err instanceof Error ? err.message : 'Error',
        variant: 'destructive',
      })
    }
  }

  return (
    <main className="min-h-screen p-4">
      <header className="mb-5 flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Table Management</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{lastUpdated ? formatTime(lastUpdated) : '--:--'}</span>
          <span className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs">
            <RefreshCw className="h-3 w-3" /> 5s
          </span>
        </div>
      </header>

      {notifications.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-[hsl(347,90%,46%)] px-4 py-3 text-white">
          <span className="animate-pulse">🔔</span>
          <span className="font-medium">{notifications.length} pending notification(s)</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onAcknowledge={handleAcknowledge}
            />
          ))}
        </div>
      )}
    </main>
  )
}