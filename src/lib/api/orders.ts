import { supabase } from '../db'

export const ORDER_SOURCE = {
  QR: 'QR',
  POS: 'POS',
} as const

export type OrderSource = (typeof ORDER_SOURCE)[keyof typeof ORDER_SOURCE]

export interface CreateOrderInput {
  tableId: string
  source: OrderSource
  items: Array<{
    menuItemId: string
    qty: number
    unitPriceMmk: number
  }>
  notes?: string
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  totalMmk: number
}

export async function createCustomerOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const rpcItems = input.items.map((item) => ({
    menu_item_id: item.menuItemId,
    qty: item.qty,
    notes: null as string | null,
  }))

  const { data, error } = await supabase.rpc('create_customer_order', {
    p_table_id: input.tableId,
    p_source: input.source,
    p_items: rpcItems,
    p_notes: input.notes?.trim() || null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as CreateOrderResult
}
