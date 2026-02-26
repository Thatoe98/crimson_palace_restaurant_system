export interface MenuSection {
  id: number
  name: string
}

export interface NamedEntity {
  id: number
  name: string
}

export interface MenuAdminItem {
  id: string
  menuCode: string
  name: string
  menuType: 'FOOD' | 'DRINK'
  sectionId: number
  section: MenuSection
  unitSold: string
  portionSize: string | null
  salesPriceMmk: number
  supplierCostMmk: number
  targetCostPct: number | null
  highValue: boolean
  highTheftRisk: boolean
  expiryTracking: boolean
  storageLocationId: number | null
  storageLocation: NamedEntity | null
  prepStationId: number | null
  prepStation: NamedEntity | null
  leadTimeDays: number | null
  notes: string | null
  isActive: boolean
}

export interface MenuPayload {
  name: string
  menuType: 'FOOD' | 'DRINK'
  section: string
  unitSold: string
  portionSize: string
  salesPriceMmk: number
  supplierCostMmk: number
  targetCostPct: number | null
  storageLocation: string
  prepStation: string
  leadTimeDays: number | null
  notes: string
  highValue: boolean
  highTheftRisk: boolean
  expiryTracking: boolean
  isActive: boolean
}
