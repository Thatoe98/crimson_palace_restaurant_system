'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { CartDrawer } from '@/components/order/CartDrawer'
import { MenuItemCard } from '@/components/order/MenuItemCard'
import type { OrderMenuItem } from '@/components/order/types'
import { useOrderCartStore } from '@/store/orderCartStore'
import { cn } from '@/lib/utils'

interface OrderPageClientProps {
  tableId: string
  menuItems: OrderMenuItem[]
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function OrderPageClient({ tableId, menuItems }: OrderPageClientProps) {
  const totalItemsCount = useOrderCartStore((state) => state.totalItems())
  const totalMmkCount = useOrderCartStore((state) => state.totalMmk())

  const [activeSection, setActiveSection] = useState('ALL')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  const prevTotalItems = useRef(totalItemsCount)

  useEffect(() => {
    useOrderCartStore.setState({ tableId })
  }, [tableId])

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 250)
    return () => clearTimeout(timer)
  }, [menuItems])

  useEffect(() => {
    if (totalItemsCount > prevTotalItems.current) {
      setCartBadgeAnimate(true)
      const timer = setTimeout(() => setCartBadgeAnimate(false), 300)
      prevTotalItems.current = totalItemsCount
      return () => clearTimeout(timer)
    }
    prevTotalItems.current = totalItemsCount
  }, [totalItemsCount])

  const sections = useMemo(() => {
    const uniqueSections = Array.from(new Set(menuItems.map((item) => item.section?.name).filter(Boolean)))
    return ['ALL', ...uniqueSections]
  }, [menuItems])

  const filteredItems = useMemo(() => {
    const seen = new Set<string>()
    const deduped = menuItems.filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    if (activeSection === 'ALL') return deduped
    return deduped.filter((item) => item.section?.name === activeSection)
  }, [menuItems, activeSection])

  return (
    <main className="min-h-screen bg-background pb-28 scroll-smooth">
      {/* Hero Section */}
      <div className="bg-[hsl(347,90%,46%)] text-white px-4 py-6 shadow-md">
        <div className="flex flex-col items-center justify-center text-center space-y-1">
          <h1 className="text-2xl font-serif font-bold tracking-wide">Crimson Palace</h1>
          <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
            Table {tableId}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold leading-tight">Menu</h2>
          </div>
          <button
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/50 hover:bg-secondary transition-colors"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && totalItemsCount > 0 ? (
              <span 
                className={cn(
                  "absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(347,90%,46%)] px-1.5 text-[10px] font-bold text-white shadow-sm transition-transform",
                  cartBadgeAnimate ? "scale-125" : "scale-100"
                )}
              >
                {totalItemsCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="p-4">
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                activeSection === section
                  ? 'border-[hsl(347,90%,46%)] bg-[hsl(347,90%,46%)] text-white'
                  : 'border-border bg-background text-muted-foreground'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
            <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} />
            ))}
            {!filteredItems.length ? (
              <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No items in this category.</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Floating Action Button for Cart */}
      {mounted && totalItemsCount > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-4 z-30 flex items-center gap-2 rounded-full bg-[hsl(347,90%,46%)] px-5 py-3 text-white shadow-xl shadow-red-900/20 transition-all duration-300"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="font-semibold">{totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''}</span>
          <span className="opacity-70">·</span>
          <span className="font-medium">{formatMmk(totalMmkCount)}</span>
        </button>
      )}

      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} tableId={tableId} />
    </main>
  )
}
