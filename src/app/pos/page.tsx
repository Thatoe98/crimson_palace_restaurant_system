import { PosClient } from '@/components/pos/PosClient'
import type { PosMenuItem, PosTable } from '@/components/pos/types'
import AppLayout from '@/components/layout/AppLayout'

export const dynamic = 'force-dynamic'

async function getMenuItems(): Promise<PosMenuItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/menu?active=true`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) return []
  return Array.isArray(payload.data) ? payload.data as PosMenuItem[] : []
}

async function getTables(): Promise<PosTable[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/tables`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) return []
  return Array.isArray(payload.data) ? payload.data as PosTable[] : []
}

export default async function PosPage() {
  const [menuItems, tables] = await Promise.all([getMenuItems(), getTables()])
  return (
    <AppLayout>
      <PosClient menuItems={menuItems} tables={tables} />
    </AppLayout>
  )
}