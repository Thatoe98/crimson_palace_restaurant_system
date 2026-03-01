import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const resolvedParams = await Promise.resolve(context.params)
    const orderId = resolvedParams.id

    const body = await request.json().catch(() => ({}))
    const newStatus = typeof body?.status === 'string' ? body.status.trim() : ''

    console.log('[KITCHEN PATCH] orderId=%s newStatus=%s', orderId, newStatus)

    if (!orderId) {
      return jsonError('Missing order id', 400)
    }

    if (!['IN_PREP', 'SERVED', 'CANCELLED'].includes(newStatus)) {
      return jsonError('status must be IN_PREP, SERVED, or CANCELLED', 400)
    }

    const { data: existingOrder, error: selectError } = await supabase
      .from('CustomerOrder')
      .select('id, status')
      .eq('id', orderId)
      .single()

    console.log('[KITCHEN PATCH] pre-check existingOrder=%j selectError=%j', existingOrder, selectError)

    if (selectError || !existingOrder) {
      const { data: sampleData, error: sampleError } = await supabase
        .from('CustomerOrder')
        .select('id')
        .limit(5)

      console.log('[KITCHEN PATCH] sample ids data=%j error=%j', sampleData, sampleError)

      return jsonError('Order not found or update matched 0 rows', 404, {
        receivedId: orderId,
        sampleIds: sampleData?.map((r) => r.id) ?? [],
        selectError: selectError?.message,
      })
    }

    const { data, error } = await supabase
      .from('CustomerOrder')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select('id, status')

    console.log('[KITCHEN PATCH] result data=%j error=%j', data, error)

    if (error) {
      return jsonError(error.message, 500)
    }

    if (!data || data.length === 0) {
      console.warn('[KITCHEN PATCH] WARNING: 0 rows updated for orderId=%s', orderId)
      return jsonError('Order not found or update matched 0 rows', 404, {
        receivedId: orderId,
        sampleIds: [existingOrder.id],
      })
    }

    return jsonData({ success: true, orderId, status: newStatus, updated: data[0] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[KITCHEN PATCH] exception:', msg)
    return jsonError(msg, 500)
  }
}
