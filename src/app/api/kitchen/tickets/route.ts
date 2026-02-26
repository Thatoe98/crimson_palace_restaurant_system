import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const activeStatuses = ['OPEN', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY']

    const { data: orders, error } = await supabase
      .from('CustomerOrder')
      .select('id,orderNumber,tableId,status,orderedAt,subtotalMmk,totalMmk, table:DiningTable(id,label), items:CustomerOrderItem(id,qty,notes,kitchenStatus, menuItem:MenuItem(id,name))')
      .in('status', activeStatuses)
      .order('orderedAt', { ascending: true })

    if (error) {
      return jsonError(error.message, 500)
    }

    const tickets = (orders ?? []).map((order) => {
      const orderedAt = new Date(order.orderedAt as string)
      const elapsedMinutes = Math.floor((new Date().getTime() - orderedAt.getTime()) / (1000 * 60))

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        tableLabel: order.table?.label ?? order.tableId,
        status: order.status,
        elapsedMinutes,
        isOverdue: elapsedMinutes > 20,
        subtotalMmk: toNumber(Number(order.subtotalMmk)),
        totalMmk: toNumber(Number(order.totalMmk)),
        items: (order.items ?? []).map((item) => ({
          id: item.id,
          menuItemName: item.menuItem?.name ?? '',
          qty: toNumber(Number(item.qty)),
          notes: item.notes,
          kitchenStatus: item.kitchenStatus,
        })),
      }
    })

    return jsonData(tickets)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch kitchen tickets.'
    return jsonError(message, 500)
  }
}
