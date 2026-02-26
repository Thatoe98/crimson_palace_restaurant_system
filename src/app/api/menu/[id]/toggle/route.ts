import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'

interface RouteContext {
  params: {
    id: string
  }
}

export async function PATCH(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { data: updated, error } = await supabase.rpc('toggle_menu_item_active', { p_id: params.id })

    if (error) return jsonError(error.message, 500)
    const payload = Array.isArray(updated) ? updated[0] : updated
    if (!payload) return jsonError('Menu item not found.', 404)

    return jsonData({
      ...payload,
      salesPriceMmk: toNumber(payload.salesPriceMmk),
      supplierCostMmk: toNumber(payload.supplierCostMmk),
      targetCostPct: payload.targetCostPct == null ? null : toNumber(payload.targetCostPct),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle menu item status.'
    return jsonError(message, 500)
  }
}
