import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  noStore()
  try {
    // 1. Fetch all active tables
    const { data: tables, error: tablesError } = await supabase
      .from('DiningTable')
      .select('id, label, capacity, isActive')
      .eq('isActive', true)
      .order('label', { ascending: true })

    if (tablesError) return jsonError(tablesError.message, 500)

    // 2. Fetch active orders (OPEN, SENT_TO_KITCHEN, IN_PREP, READY) grouped by table
    const { data: orders, error: ordersError } = await supabase
      .from('CustomerOrder')
      .select('id, tableId, status, totalMmk')
      .in('status', ['OPEN', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY'])

    if (ordersError) return jsonError(ordersError.message, 500)

    // 3. Fetch pending notifications (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { data: notifications, error: notifError } = await supabase
      .from('TableNotification')
      .select('id, tableId, type, status, createdAt')
      .eq('status', 'PENDING')
      .gte('createdAt', twoHoursAgo)

    if (notifError) return jsonError(notifError.message, 500)

    // 4. Aggregate per table
    const ordersByTable = new Map<string, { count: number; total: number }>()
    for (const order of (orders ?? [])) {
      const tid = String(order.tableId)
      const existing = ordersByTable.get(tid) ?? { count: 0, total: 0 }
      existing.count += 1
      existing.total += Number(order.totalMmk ?? 0)
      ordersByTable.set(tid, existing)
    }

    const notifsByTable = new Map<string, Array<{ id: string; type: string; createdAt: string }>>()
    for (const n of (notifications ?? [])) {
      const tid = String(n.tableId)
      const arr = notifsByTable.get(tid) ?? []
      arr.push({ id: String(n.id), type: String(n.type), createdAt: String(n.createdAt) })
      notifsByTable.set(tid, arr)
    }

    const result = (tables ?? []).map((table) => {
      const tid = String(table.id)
      const orderInfo = ordersByTable.get(tid) ?? { count: 0, total: 0 }
      const pendingNotifs = notifsByTable.get(tid) ?? []

      return {
        id: tid,
        label: String(table.label),
        capacity: Number(table.capacity ?? 0),
        isActive: Boolean(table.isActive),
        activeOrderCount: orderInfo.count,
        totalMmk: orderInfo.total,
        pendingNotifications: pendingNotifs,
      }
    })

    return jsonData(result)
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed to fetch table overview', 500)
  }
}
