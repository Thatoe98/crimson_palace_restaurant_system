'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getMenuImageUrl } from '@/lib/menu-image'
import { usePosStore } from '@/store/posStore'
import type { PosMenuItem } from '@/components/pos/types'

interface PosMenuPanelProps {
  menuItems: PosMenuItem[]
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function PosMenuPanel({ menuItems }: PosMenuPanelProps) {
  const addItem = usePosStore((state) => state.addItem)
  const cartItems = usePosStore((state) => state.items)
  const [activeSection, setActiveSection] = useState('ALL')

  const sections = useMemo(() => {
    const names = Array.from(new Set(menuItems.map((item) => item.section?.name).filter(Boolean)))
    return ['ALL', ...names]
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
    <Card className="h-full">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg">Menu</CardTitle>
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
            {sections.map((section) => (
              <TabsTrigger key={section} value={section} className="rounded-md border data-[state=active]:border-primary data-[state=active]:text-primary">
                {section}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="overflow-y-auto max-h-[calc(100vh-220px)]">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const imageUrl = getMenuImageUrl(item.name)
            const cartEntry = cartItems.find((entry) => entry.menuItemId === item.id)

            return (
              <button
                key={item.id}
                className="flex flex-col rounded-xl border bg-card text-left shadow-sm transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.97]"
                onClick={() => addItem({
                  menuItemId: item.id,
                  name: item.name,
                  section: item.section?.name ?? 'General',
                  unitPriceMmk: item.salesPriceMmk,
                })}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-slate-100">
                  {imageUrl ? (
                    <Image src={imageUrl} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
                  )}

                  {cartEntry ? (
                    <div className="absolute right-2 top-2">
                      <Badge>{cartEntry.qty}</Badge>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug">{item.name}</p>
                  <p className="text-xs font-bold text-primary">{formatMmk(item.salesPriceMmk)}</p>
                </div>
              </button>
            )
          })}

          {!filteredItems.length ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No menu items in this category.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
