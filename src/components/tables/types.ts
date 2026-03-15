export interface TableOverview {
  id: string
  label: string
  capacity: number
  isActive: boolean
  activeOrderCount: number
  totalMmk: number
  pendingNotifications: TableNotificationData[]
}

export interface TableNotificationData {
  id: string
  tableId: string
  tableLabel?: string
  type: 'CALL_WAITER' | 'ASK_BILL'
  status: 'PENDING' | 'ACKNOWLEDGED'
  createdAt: string
  acknowledgedAt: string | null
}