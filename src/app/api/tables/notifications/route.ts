import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

export const dynamic = 'force-dynamic'

// GET — list all PENDING notifications (last 2 hours), newest first
export async function GET(_request: NextRequest): Promise<NextResponse> {
  noStore()
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('TableNotification')
      .select('id, tableId, type, status, createdAt, acknowledgedAt, table:DiningTable(id, label)')
      .eq('status', 'PENDING')
      .gte('createdAt', twoHoursAgo)
      .order('createdAt', { ascending: false })

    if (error) return jsonError(error.message, 500)

    const notifications = (data ?? []).map((n) => {
      const tbl = Array.isArray(n.table) ? n.table[0] : n.table
      return {
        id: String(n.id),
        tableId: String(n.tableId),
        tableLabel: String(tbl?.label ?? n.tableId),
        type: String(n.type),
        status: String(n.status),
        createdAt: String(n.createdAt),
        acknowledgedAt: n.acknowledgedAt ? String(n.acknowledgedAt) : null,
      }
    })

    return jsonData(notifications)
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed to fetch notifications', 500)
  }
}

// POST — create a notification (with 30s spam guard)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}))
    const tableId = typeof body?.tableId === 'string' ? body.tableId.trim() : ''
    const type = typeof body?.type === 'string' ? body.type.trim() : ''

    if (!tableId) return jsonError('tableId is required', 400)
    if (!['CALL_WAITER', 'ASK_BILL'].includes(type)) {
      return jsonError('type must be CALL_WAITER or ASK_BILL', 400)
    }

    // Spam guard: reject if identical PENDING notification exists from last 30 seconds
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('TableNotification')
      .select('id')
      .eq('tableId', tableId)
      .eq('type', type)
      .eq('status', 'PENDING')
      .gte('createdAt', thirtySecsAgo)
      .limit(1)

    if (existing && existing.length > 0) {
      return jsonData({ success: true, message: 'Already notified', id: existing[0].id })
    }

    // Create notification
    const { data, error } = await supabase
      .from('TableNotification')
      .insert({ tableId, type, status: 'PENDING' })
      .select('id, tableId, type, status, createdAt')
      .single()

    if (error) return jsonError(error.message, 500)

    return jsonData({ success: true, notification: data }, 201)
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed to create notification', 500)
  }
}
