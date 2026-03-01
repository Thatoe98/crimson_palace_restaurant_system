'use client'

import { PosCartPanel } from '@/components/pos/PosCartPanel'
import { PosMenuPanel } from '@/components/pos/PosMenuPanel'
import { PaymentPanel } from '@/components/pos/PaymentPanel'
import type { PosMenuItem, PosOrderResult, PosTable } from '@/components/pos/types'
import { usePosStore } from '@/store/posStore'

interface PosClientProps {
  menuItems: PosMenuItem[]
  tables: PosTable[]
}

export function PosClient({ menuItems, tables }: PosClientProps) {
  const clearOrder = usePosStore((state) => state.clearOrder)
  const lastOrderResult = usePosStore((state) => state.lastOrderResult)
  const setLastOrderResult = usePosStore((state) => state.setLastOrderResult)

  function handleNewOrder() {
    clearOrder()
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <h1 className="mb-4 text-2xl font-bold">POS Manual Entry</h1>
      <div className="grid gap-4 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <PosMenuPanel menuItems={menuItems} />
        </section>
        <section className="lg:col-span-2">
          {lastOrderResult ? (
            <PaymentPanel result={lastOrderResult} onNewOrder={handleNewOrder} />
          ) : (
            <PosCartPanel tables={tables} onPlaced={setLastOrderResult} />
          )}
        </section>
      </div>
    </main>
  )
}
