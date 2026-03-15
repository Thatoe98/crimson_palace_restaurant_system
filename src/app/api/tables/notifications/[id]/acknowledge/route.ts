import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

export async function PATCH(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const resolvedParams = await Promise.resolve(context.params)
    const id = resolvedParams.id

    if (!id) return jsonError('Notification id is required', 400)

    const { data, error } = await supabase
      .from('TableNotification')
      .update({ status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'PENDING')
      .select('id, status, acknowledgedAt')

    if (error) return jsonError(error.message, 500)

    if (!data || data.length === 0) {
      return jsonError('Notification not found or already acknowledged', 404)
    }

    return jsonData({ success: true, notification: data[0] })
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Failed to acknowledge notification', 500)
  }
}
