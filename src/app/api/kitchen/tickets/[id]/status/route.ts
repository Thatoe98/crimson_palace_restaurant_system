import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

interface RouteContext {
  params: {
    id: string
  }
}

type KitchenItemStatus = 'IN_PREP' | 'READY' | 'SERVED'

export async function PATCH(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const body = await request.json()
    const status = body?.status as KitchenItemStatus | undefined

    if (!status || !['IN_PREP', 'READY', 'SERVED'].includes(status)) {
      return jsonError('status is required and must be IN_PREP, READY, or SERVED.', 400)
    }

    const now = new Date().toISOString()

    // Map kitchen status to order status
    const orderStatusMap: Record<string, string> = {
      IN_PREP: 'IN_PREP',
      READY: 'READY',
      SERVED: 'SERVED',
    }

    // Update CustomerOrder status
    const { error: orderError } = await supabase
      .from('CustomerOrder')
      .update({ status: orderStatusMap[status] })
      .eq('id', params.id)

    if (orderError) {
      return jsonError(orderError.message, 500)
    }

    // Update CustomerOrderItem kitchenStatus + timestamps
    const itemPatch: Record<string, string> = { kitchenStatus: status }
    if (status === 'IN_PREP') itemPatch.sentToKitchenAt = now
    if (status === 'READY') itemPatch.readyAt = now
    if (status === 'SERVED') itemPatch.servedAt = now

    const { error: itemError } = await supabase
      .from('CustomerOrderItem')
      .update(itemPatch)
      .eq('orderId', params.id)

    if (itemError) {
      return jsonError(itemError.message, 500)
    }

    return jsonData({
      success: true,
      orderId: params.id,
      status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update kitchen ticket status.'
    return jsonError(message, 500)
  }
}
