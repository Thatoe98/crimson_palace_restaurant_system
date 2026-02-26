import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'

interface RouteContext {
  params: {
    id: string
  }
}

const ORDER_STATUSES = ['PENDING', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELLED'] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'SENT_TO_KITCHEN',
  SENT_TO_KITCHEN: 'IN_PREP',
  IN_PREP: 'READY',
  READY: 'SERVED',
}

function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  if (next === 'CANCELLED') return true
  if (current === next) return true
  return NEXT_STATUS[current] === next
}

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const body = await request.json()
    const nextStatus = body?.status as OrderStatus | undefined

    if (!nextStatus || !ORDER_STATUSES.includes(nextStatus)) {
      return jsonError('status is required and must be a valid OrderStatus.', 400)
    }

    const { data: current, error: currentError } = await supabase
      .from('CustomerOrder')
      .select('status')
      .eq('id', params.id)
      .single()

    if (currentError) {
      if (currentError.code === 'PGRST116') return jsonError('Order not found.', 404)
      return jsonError(currentError.message, 500)
    }

    const currentStatus = current.status as OrderStatus

    if (!canTransition(currentStatus, nextStatus)) {
      return jsonError(`Invalid status transition from ${currentStatus} to ${nextStatus}.`, 400)
    }

    const { data: updated, error: updateError } = await supabase
      .from('CustomerOrder')
      .update({ status: nextStatus })
      .eq('id', params.id)
      .select('*, table:DiningTable(*), items:CustomerOrderItem(*, menuItem:MenuItem(*))')
      .single()

    if (updateError) {
      return jsonError(updateError.message, 500)
    }

    return jsonData({
      ...updated,
      subtotalMmk: toNumber(Number(updated.subtotalMmk)),
      serviceChargeMmk: toNumber(Number(updated.serviceChargeMmk)),
      taxMmk: toNumber(Number(updated.taxMmk)),
      totalMmk: toNumber(Number(updated.totalMmk)),
      items: (updated.items ?? []).map((item) => ({
        ...item,
        qty: toNumber(Number(item.qty)),
        unitPriceMmk: toNumber(Number(item.unitPriceMmk)),
        lineTotalMmk: toNumber(Number(item.lineTotalMmk)),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order status.'
    return jsonError(message, 500)
  }
}
