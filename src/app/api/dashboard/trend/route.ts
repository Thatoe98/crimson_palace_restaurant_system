import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseDateParam, toNumber } from '@/lib/api/route-helpers'

export const revalidate = 60

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const from = request.nextUrl.searchParams.get('from')
    const to = request.nextUrl.searchParams.get('to')

    const fromDate = parseDateParam(from)
    const toDate = parseDateParam(to)

    if (from && !fromDate) {
      return jsonError('Invalid from date format. Use YYYY-MM-DD.', 400)
    }

    if (to && !toDate) {
      return jsonError('Invalid to date format. Use YYYY-MM-DD.', 400)
    }

    if (fromDate && toDate && fromDate > toDate) {
      return jsonError('from date cannot be after to date.', 400)
    }

    let query = supabase
      .from('DailySummary')
      .select('businessDate,netSalesMmk,operatingProfitMmk,cogsMmk,grossProfitMmk,covers,openStatus')
      .order('businessDate', { ascending: true })

    if (fromDate) {
      query = query.gte('businessDate', fromDate.toISOString().slice(0, 10))
    }

    if (toDate) {
      query = query.lte('businessDate', toDate.toISOString().slice(0, 10))
    }

    const { data: rows, error } = await query

    if (error) {
      return jsonError(error.message, 500)
    }

    const data = (rows ?? []).map((r) => ({
      date: typeof r.businessDate === 'string' ? r.businessDate : '',
      netSalesMmk: toNumber(r.netSalesMmk),
      operatingProfitMmk: toNumber(r.operatingProfitMmk),
      grossProfitMmk: toNumber(r.grossProfitMmk),
      totalCostMmk: toNumber(r.cogsMmk),
      totalCovers: r.covers ?? 0,
      isOpen: r.openStatus === 'OPEN',
    }))

    return jsonData(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trend data.'
    return jsonError(message, 500)
  }
}
