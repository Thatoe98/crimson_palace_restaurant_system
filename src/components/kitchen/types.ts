export interface KitchenTicket {
  id: string
  orderNumber: string
  tableId: string
  tableLabel: string
  elapsedMinutes: number
  isOverdue: boolean
  items: Array<{
    id: string
    menuItemName: string
    qty: number
    notes: string | null
    kitchenStatus: string
  }>
  status: string
}
