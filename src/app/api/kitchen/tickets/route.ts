import { NextRequest, NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  noStore()
  try {
    console.log('[KITCHEN GET] called at', new Date().toISOString())
    const { data: orders, error } = await supabase
      .from('CustomerOrder')
      .select(`
    id, orderNumber, tableId, status, orderedAt,
    table:DiningTable(id, label),
    items:CustomerOrderItem(id, qty, notes, kitchenStatus, menuItem:MenuItem(id, name))
  `)
      .in('status', ['OPEN', 'SENT_TO_KITCHEN', 'IN_PREP'])
      .order('orderedAt', { ascending: true })

    console.log('[KITCHEN GET] orders count=%s error=%j', orders?.length ?? 'null', error?.message ?? null)

    if (error) return jsonError(error.message, 500)

    const tickets = (orders ?? []).map((order): {
      id: string
      orderNumber: string
      tableId: string
      tableLabel: string
      status: string
      orderedAt: string
      elapsedMinutes: number
      isOverdue: boolean
      items: {
        id: string
        menuItemId: string
        menuItemName: string
        qty: number
        notes: string | null
        kitchenStatus: string
      }[]
    } => {
      const elapsedMinutes = Math.floor((Date.now() - new Date(order.orderedAt).getTime()) / 60000)

      return {
        id: String(order.id),
        orderNumber: String(order.orderNumber),
        tableId: String(order.tableId),
        tableLabel: String(order.table?.label ?? order.tableId ?? ''),
        status: String(order.status),
        orderedAt: String(order.orderedAt),
        elapsedMinutes,
        isOverdue: elapsedMinutes > 20,
        items: (order.items ?? []).map((item) => ({
          id: String(item.id),
          menuItemId: String(item.menuItem?.id ?? ''),
          menuItemName: String(item.menuItem?.name ?? ''),
          qty: toNumber(Number(item.qty ?? 0)),
          notes: item.notes ?? null,
          kitchenStatus: String(item.kitchenStatus ?? ''),
        })),
      }
    })

    return jsonData(tickets)
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed', 500)
  }
}
