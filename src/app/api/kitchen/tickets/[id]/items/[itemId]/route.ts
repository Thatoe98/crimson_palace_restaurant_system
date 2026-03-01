import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

export async function PATCH(
  _request: NextRequest,
  context: { params: { id: string; itemId: string } | Promise<{ id: string; itemId: string }> }
): Promise<NextResponse> {
  try {
    const resolvedParams = await Promise.resolve(context.params)
    const orderId = resolvedParams.id

    console.log('[KITCHEN ITEM CANCEL] orderId=%s', orderId)

    const { data, error } = await supabase
      .from('CustomerOrder')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId)
      .select('id, status')

    console.log('[KITCHEN ITEM CANCEL] result data=%j error=%j', data, error)

    if (error) return jsonError(error.message, 500)

    if (!data || data.length === 0) {
      return jsonError('Order not found', 404)
    }

    return jsonData({ success: true, orderCancelled: true })
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed', 500)
  }
}