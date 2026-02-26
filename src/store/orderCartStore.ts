import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  menuItemId: string
  name: string
  unitPriceMmk: number
  qty: number
  notes: string
}

interface CartStore {
  tableId: string | null
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (menuItemId: string) => void
  updateQty: (menuItemId: string, qty: number) => void
  clearCart: () => void
  totalItems: () => number
  totalMmk: () => number
}

export const useOrderCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      tableId: null,
      items: [],
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
      updateQty: (menuItemId, qty) => {
        if (qty <= 0) {
          set((state) => ({
            items: state.items.filter((item) => item.menuItemId !== menuItemId),
          }))
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.menuItemId === menuItemId
              ? { ...item, qty }
              : item
          ),
        }))
      },
      clearCart: () => {
        set({ items: [] })
      },
      totalItems: () => get().items.reduce((total, item) => total + item.qty, 0),
      totalMmk: () => get().items.reduce((total, item) => total + item.qty * item.unitPriceMmk, 0),
    }),
    {
      name: 'cp-cart',
      partialize: (state) => ({
        tableId: state.tableId,
        items: state.items,
      }),
    }
  )
)
