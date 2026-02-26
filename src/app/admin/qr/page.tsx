import AppLayout from '@/components/layout/AppLayout'
import { QrPageClient } from '@/components/qr/QrPageClient'

export const dynamic = 'force-dynamic'

interface DiningTable {
  id: string
  label: string
  capacity: number
  qrSlug: string | null
}

async function getTables(): Promise<DiningTable[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/tables`, { cache: 'no-store' })
    const json = await res.json()
    const data = json.data ?? json
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export default async function QrAdminPage() {
  const tables = await getTables()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return (
    <AppLayout>
      <QrPageClient tables={tables} baseUrl={baseUrl} />
    </AppLayout>
  )
}
