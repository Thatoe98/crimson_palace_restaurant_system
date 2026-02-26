export type MenuType = 'FOOD' | 'DRINK'
export type OpenStatus = 'OPEN' | 'CLOSED'
export type OrderStatus = 'OPEN' | 'SENT_TO_KITCHEN' | 'IN_PREP' | 'READY' | 'SERVED' | 'CANCELLED' | 'CLOSED'
export type OrderSource = 'QR' | 'POS'
export type AlertAction = 'REORDER' | 'SPOILAGE_WRITE_OFF' | 'USE_FAST' | 'DISCOUNT'

export interface MenuItem {
  id: string
  menuCode: string
  name: string
  menuType: MenuType
  section: string
  unitSold: string
  portionSize: string | null
  salesPriceMmk: number
  supplierCostMmk: number
  targetCostPct: number | null
  highValue: boolean
  highTheftRisk: boolean
  expiryTracking: boolean
  storage: string | null
  prepStation: string | null
  leadTimeDays: number | null
  notes: string | null
  sourceUrl: string | null
  isActive: boolean
}

export interface DashboardSummary {
  totalRevenueMmk: number
  totalCogsMmk: number
  totalGrossProfitMmk: number
  totalOperatingProfitMmk: number
  averageDailyRevenueMmk: number
  totalCovers: number
  dateRangeStart: string
  dateRangeEnd: string
  openDays: number
}

export interface TopItem {
  menuItemId: string
  name: string
  section: string
  totalQty: number
  totalSalesMmk: number
  totalGrossProfitMmk: number
}

export interface InventoryAlert {
  date: string
  ingredient: string
  closingOnHand: number
  reorderPoint: number
  actions: AlertAction[]
  earliestExpiryDate: string | null
}

export interface Ingredient {
  id: string
  category: string
  uom: string
  avgDailyUsage: number
  reorderPoint: number
  targetStockQty: number
  shelfLifeDays: number
}