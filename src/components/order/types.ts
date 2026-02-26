export interface OrderMenuItem {
  id: string
  name: string
  menuType: 'FOOD' | 'DRINK'
  sectionId: number
  section: { id: number; name: string }
  salesPriceMmk: number
  isActive: boolean
}
