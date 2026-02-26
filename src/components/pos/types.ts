export interface PosMenuItem {
  id: string
  name: string
  menuType: 'FOOD' | 'DRINK'
  sectionId: number
  section: { id: number; name: string }
  salesPriceMmk: number
  isActive: boolean
}

export interface PosTable {
  id: string
  label: string
  isActive: boolean
}

export interface PosOrderResult {
  orderNumber: string
  totalMmk: number
}
