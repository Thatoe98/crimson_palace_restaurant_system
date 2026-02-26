'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Minus, Plus, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMenuImageUrl } from '@/lib/menu-image'
import { useOrderCartStore } from '@/store/orderCartStore'
import type { OrderMenuItem } from '@/components/order/types'
import { cn } from '@/lib/utils'

interface MenuItemCardProps {
  item: OrderMenuItem
}

function formatMmk(value: number): string {
  return `${value.toLocaleString()} Ks`
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const addItem = useOrderCartStore((state) => state.addItem)
  const updateQty = useOrderCartStore((state) => state.updateQty)
  const cartItem = useOrderCartStore((state) => state.items.find((entry) => entry.menuItemId === item.id))
  const qty = cartItem?.qty ?? 0

  const [noteDraft, setNoteDraft] = useState(cartItem?.notes ?? '')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [added, setAdded] = useState(false)
  const pressTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setNoteDraft(cartItem?.notes ?? '')
  }, [cartItem?.notes])

  function handleAdd() {
    addItem({
      menuItemId: item.id,
      name: item.name,
      unitPriceMmk: item.salesPriceMmk,
      notes: noteDraft.trim(),
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 400)
  }

  const imageUrl = getMenuImageUrl(item.name)

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 active:scale-[0.98]",
        added ? "ring-2 ring-green-400 shadow-lg shadow-green-100" : ""
      )}
      onPointerDown={() => {
        pressTimeout.current = setTimeout(() => setShowNoteInput(true), 650)
      }}
      onPointerUp={() => {
        if (pressTimeout.current) clearTimeout(pressTimeout.current)
      }}
      onPointerLeave={() => {
        if (pressTimeout.current) clearTimeout(pressTimeout.current)
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-slate-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🍽️</div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Price badge floating bottom-left */}
        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
          {formatMmk(item.salesPriceMmk)}
        </span>

        {qty > 0 ? (
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow animate-in zoom-in duration-200">
            {qty}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col space-y-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{item.name}</h3>
        </div>

        <Badge variant="outline" className="w-fit text-[10px] text-muted-foreground">
          {item.section?.name ?? 'General'}
        </Badge>

        {showNoteInput ? (
          <Input
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add notes..."
            className="h-8 text-xs mt-2"
          />
        ) : null}

        <div className="mt-auto pt-2">
          {qty > 0 ? (
            <div className="flex w-full items-center justify-between gap-1">
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 shrink-0 rounded-full"
                onClick={() => updateQty(item.id, qty - 1)}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="flex-1 text-center text-sm font-semibold">{qty}</span>
              <Button size="icon" className="h-9 w-9 shrink-0 rounded-full" onClick={() => {
                updateQty(item.id, qty + 1)
                setAdded(true)
                setTimeout(() => setAdded(false), 400)
              }}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button 
              className={cn(
                "h-9 w-full text-sm rounded-full transition-colors",
                added ? "bg-green-500 hover:bg-green-600 text-white" : ""
              )} 
              onClick={handleAdd}
            >
              {added ? <Check className="h-4 w-4 mr-1" /> : null}
              {added ? "Added" : "Add"}
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
