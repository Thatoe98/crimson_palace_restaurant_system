import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseDateParam } from '@/lib/api/route-helpers'

export const revalidate = 60

interface TopItemResponse {
  menuItemId: string
  name: string
  section: string
  menuType: string
  totalQty: number
  totalSalesMmk: number
  totalGrossProfitMmk: number
  costPct: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const from = request.nextUrl.searchParams.get('from')
    const to = request.nextUrl.searchParams.get('to')
    const limitParam = request.nextUrl.searchParams.get('limit')

    const fromDate = parseDateParam(from)
    const toDate = parseDateParam(to)

    if (from && !fromDate) {
      return jsonError('Invalid from date format. Use YYYY-MM-DD.', 400)
    }

    if (to && !toDate) {
      return jsonError('Invalid to date format. Use YYYY-MM-DD.', 400)
    }

    const limit = limitParam ? Number(limitParam) : null
    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
      return jsonError('limit must be a positive integer.', 400)
    }

    const { data, error } = await supabase.rpc('top_items', {
      p_from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
      p_to: toDate ? toDate.toISOString().slice(0, 10) : null,
      p_limit: limit ?? 10,
    })

    if (error) {
      return jsonError(error.message, 500)
    }

    return jsonData((data ?? []) as TopItemResponse[])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch top items.'
    return jsonError(message, 500)
  }
}
