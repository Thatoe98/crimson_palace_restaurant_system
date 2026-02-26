import { NextRequest, NextResponse } from 'next/server'
import { formatDate } from '@/lib/date'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseDateParam, toNumber } from '@/lib/api/route-helpers'

const ORDER_STATUSES = ['OPEN', 'PENDING', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELLED', 'CLOSED'] as const
const ORDER_SOURCES = ['QR', 'POS', 'TABLE', 'WALKIN'] as const

type OrderStatus = (typeof ORDER_STATUSES)[number]
type OrderSource = (typeof ORDER_SOURCES)[number]

interface CreateOrderBody {
  tableId: string
  source: OrderSource
  items: Array<{
    menuItemId: string
    qty: number
    unitPriceMmk: number
  }>
  notes?: string
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as CreateOrderBody

    if (!body?.tableId || typeof body.tableId !== 'string') {
      return jsonError('tableId is required.', 400)
    }

    if (!ORDER_SOURCES.includes(body.source)) {
      return jsonError('source must be QR, POS, TABLE, or WALKIN.', 400)
    }

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

    const { data: table, error: tableError } = await supabase
      .from('DiningTable')
      .select('id,isActive')
      .eq('id', body.tableId)
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
      p_table_id: body.tableId,
      p_source: body.source,
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

    // Immediately transition to SENT_TO_KITCHEN so it appears in kitchen
    if (orderId) {
      const { error: statusError } = await supabase
        .from('CustomerOrder')
        .update({ status: 'SENT_TO_KITCHEN' })
        .eq('id', orderId)
      if (statusError) {
        console.error('[create order] Failed to update status to SENT_TO_KITCHEN:', statusError.message)
      }
    }

    return jsonData({ id: orderId, orderNumber }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create order.'
    return jsonError(message, 500)
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const statusParam = request.nextUrl.searchParams.get('status') as OrderStatus | null
    const tableId = request.nextUrl.searchParams.get('tableId')
    const dateParam = request.nextUrl.searchParams.get('date')

    if (statusParam && !ORDER_STATUSES.includes(statusParam)) {
      return jsonError('Invalid status value.', 400)
    }

    const date = parseDateParam(dateParam)
    if (dateParam && !date) {
      return jsonError('Invalid date format. Use YYYY-MM-DD.', 400)
    }

    const nextDate = date ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : null

    let query = supabase
      .from('CustomerOrder')
      .select('*, table:DiningTable(*), items:CustomerOrderItem(*, menuItem:MenuItem(*))')

    if (statusParam) query = query.eq('status', statusParam)
    if (tableId) query = query.eq('tableId', tableId)
    if (date && nextDate) {
      query = query.gte('orderedAt', date.toISOString()).lt('orderedAt', nextDate.toISOString())
    }

    query = query.order('orderedAt', { ascending: false })

    const { data: orders, error } = await query

    if (error) {
      return jsonError(error.message, 500)
    }

    const data = (orders ?? []).map((order) => ({
      ...order,
      orderedAt: formatDate(new Date(order.orderedAt as string)),
      subtotalMmk: toNumber(Number(order.subtotalMmk)),
      serviceChargeMmk: toNumber(Number(order.serviceChargeMmk)),
      taxMmk: toNumber(Number(order.taxMmk)),
      totalMmk: toNumber(Number(order.totalMmk)),
      items: (order.items ?? []).map((item) => ({
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
    }))

    return jsonData(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders.'
    return jsonError(message, 500)
  }
}
