import { OrderPageClient } from '@/components/order/OrderPageClient'
import type { OrderMenuItem } from '@/components/order/types'

interface DiningTable {
  id: string
  label: string
  isActive: boolean
}

export const dynamic = 'force-dynamic'

async function getActiveMenu(): Promise<OrderMenuItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/menu?active=true`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) return []
  return Array.isArray(payload.data) ? payload.data as OrderMenuItem[] : []
}

async function getTables(): Promise<DiningTable[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/tables`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) return []
  return Array.isArray(payload.data) ? payload.data as DiningTable[] : []
}

export default async function OrderPage({ params }: { params: { table_id: string } }) {
  const [tables, items] = await Promise.all([getTables(), getActiveMenu()])
  const tableId = params.table_id
  const tableExists = tables.some((table) => table.id === tableId || table.label === tableId)

  if (!tableExists) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-lg font-medium">Invalid table</p>
      </main>
    )
  }

  return <OrderPageClient tableId={tableId} menuItems={items} />
}