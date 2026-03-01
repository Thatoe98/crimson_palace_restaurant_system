import { create } from 'zustand'
import type { PosOrderResult } from '@/components/pos/types'

export interface PosCartItem {
  menuItemId: string
  name: string
  section: string
  unitPriceMmk: number
  qty: number
}

interface PosStore {
  items: PosCartItem[]
  selectedTable: string | null
  lastOrderResult: PosOrderResult | null
  addItem: (item: Omit<PosCartItem, 'qty'>) => void
  removeItem: (menuItemId: string) => void
  updateQty: (menuItemId: string, delta: number) => void
  setTable: (tableId: string | null) => void
  setLastOrderResult: (result: PosOrderResult | null) => void
  clearOrder: () => void
  subtotal: () => number
  itemCount: () => number
}

export const usePosStore = create<PosStore>((set, get) => ({
  items: [],
  selectedTable: null,
  lastOrderResult: null,
  addItem: (item) => {
    const existing = get().items.find((cartItem) => cartItem.menuItemId === item.menuItemId)

    if (existing) {
      set((state) => ({
        items: state.items.map((cartItem) =>
          cartItem.menuItemId === item.menuItemId
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        ),
      }))
      return
    }

    set((state) => ({
      items: [...state.items, { ...item, qty: 1 }],
    }))
  },
  removeItem: (menuItemId) => {
    set((state) => ({
      items: state.items.filter((item) => item.menuItemId !== menuItemId),
    }))
  },
  updateQty: (menuItemId, delta) => {
    set((state) => {
      const updated = state.items
        .map((item) => {
          if (item.menuItemId !== menuItemId) return item
          return { ...item, qty: item.qty + delta }
        })
        .filter((item) => item.qty > 0)

      return { items: updated }
    })
  },
  setTable: (tableId) => {
    set({ selectedTable: tableId })
  },
  setLastOrderResult: (result) => {
    set({ lastOrderResult: result })
  },
  clearOrder: () => {
    set({ items: [], selectedTable: null, lastOrderResult: null })
  },
  subtotal: () => get().items.reduce((sum, item) => sum + item.qty * item.unitPriceMmk, 0),
  itemCount: () => get().items.reduce((sum, item) => sum + item.qty, 0),
}))
