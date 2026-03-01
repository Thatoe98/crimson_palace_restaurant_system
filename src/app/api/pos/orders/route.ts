import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

interface PosOrderBody {
  tableId?: string
  items: Array<{
    menuItemId: string
    qty: number
    unitPriceMmk: number
  }>
  notes?: string
}

async function resolvePosTableId(tableId?: string): Promise<string> {
  if (tableId) return tableId

  const { data: existingWalkIn, error: walkinError } = await supabase
    .from('DiningTable')
    .select('id')
    .eq('id', 'WALKIN')
    .maybeSingle()

  if (walkinError) throw new Error(walkinError.message)

  if (existingWalkIn) return existingWalkIn.id

  const { data: created, error: createError } = await supabase
    .from('DiningTable')
    .insert({ id: 'WALKIN', label: 'Walk-in', capacity: 0, qrSlug: 'walkin', isActive: true })
    .select('id')
    .single()

  if (createError) throw new Error(createError.message)

  return created.id
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as PosOrderBody

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return jsonError('items is required and must contain at least one item.', 400)
    }

    const hasInvalidItem = body.items.some((item) => {
      return !item.menuItemId || typeof item.menuItemId !== 'string'
        || typeof item.qty !== 'number' || item.qty <= 0
        || typeof item.unitPriceMmk !== 'number' || item.unitPriceMmk < 0
    })
    if (hasInvalidItem) {
      return jsonError('Each item must include menuItemId, qty > 0, and unitPriceMmk >= 0.', 400)
    }

    const finalTableId = await resolvePosTableId(body.tableId)
    const { data: table, error: tableError } = await supabase
      .from('DiningTable')
      .select('id,isActive')
      .eq('id', finalTableId)
      .maybeSingle()

    if (tableError) {
      return jsonError(tableError.message, 500)
    }

    if (!table || !table.isActive) {
      return jsonError('DiningTable does not exist or is inactive.', 400)
    }

    const uniqueIds = Array.from(new Set(body.items.map((item) => item.menuItemId)))
    const { data: foundMenuItems, error: menuItemError } = await supabase
      .from('MenuItem')
      .select('id')
      .in('id', uniqueIds)

    if (menuItemError) {
      return jsonError(menuItemError.message, 500)
    }

    if (foundMenuItems.length !== uniqueIds.length) {
      return jsonError('One or more menuItemIds are invalid.', 400)
    }

    const { data, error } = await supabase.rpc('create_customer_order', {
      p_table_id: finalTableId,
      p_source: 'POS',
      p_items: body.items.map((item) => ({
        menu_item_id: item.menuItemId,
        qty: item.qty,
        notes: null,
      })),
      p_notes: body.notes ?? null,
    })

    if (error) {
      return jsonError(error.message, 500)
    }

    const created = Array.isArray(data) ? data[0] : data
    const orderId = created?.order_id ?? created?.id
    const orderNumber = created?.order_number ?? created?.orderNumber

    return jsonData({ id: orderId, orderNumber }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create POS order.'
    return jsonError(message, 500)
  }
}
