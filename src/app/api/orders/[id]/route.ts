import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { data: order, error } = await supabase
      .from('CustomerOrder')
      .select('*, table:DiningTable(*), items:CustomerOrderItem(*, menuItem:MenuItem(*))')
      .eq('id', params.id)
      .maybeSingle()

    if (error) {
      return jsonError(error.message, 500)
    }

    if (!order) return jsonError('Order not found.', 404)

    return jsonData({
      ...order,
      subtotalMmk: toNumber(Number(order.subtotalMmk)),
      serviceChargeMmk: toNumber(Number(order.serviceChargeMmk)),
      taxMmk: toNumber(Number(order.taxMmk)),
      totalMmk: toNumber(Number(order.totalMmk)),
      items: (order.items ?? []).map((item: any) => ({
        ...item,
        qty: toNumber(Number(item.qty)),
        unitPriceMmk: toNumber(Number(item.unitPriceMmk)),
        lineTotalMmk: toNumber(Number(item.lineTotalMmk)),
        menuItem: {
          ...item.menuItem,
          salesPriceMmk: toNumber(Number(item.menuItem.salesPriceMmk)),
          supplierCostMmk: toNumber(Number(item.menuItem.supplierCostMmk)),
          targetCostPct: item.menuItem.targetCostPct == null ? null : toNumber(Number(item.menuItem.targetCostPct)),
        },
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order.'
    return jsonError(message, 500)
  }
}
