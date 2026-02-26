import { MenuAdminClient } from '@/components/menu/MenuAdminClient'
import type { MenuAdminItem } from '@/components/menu/types'
import AppLayout from '@/components/layout/AppLayout'

export const dynamic = 'force-dynamic'

async function getMenuItems(): Promise<MenuAdminItem[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const response = await fetch(`${baseUrl}/api/menu`, { cache: 'no-store' })
  const payload = await response.json()
  if (!response.ok) return []
  return Array.isArray(payload.data) ? payload.data as MenuAdminItem[] : []
}

export default async function MenuAdminPage() {
  const initialItems = await getMenuItems()

  return (
    <AppLayout>
      <MenuAdminClient initialItems={initialItems} />
    </AppLayout>
  )
}