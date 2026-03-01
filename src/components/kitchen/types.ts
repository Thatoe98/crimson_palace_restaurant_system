export interface KitchenItem {
  id: string
  menuItemId: string
  menuItemName: string
  qty: number
  notes: string | null
  kitchenStatus: string
}

export interface KitchenTicket {
  id: string
  orderNumber: string
  tableId: string
  tableLabel: string
  status: string
  orderedAt: string
  elapsedMinutes: number
  isOverdue: boolean
  items: KitchenItem[]
}
