import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseDateParam } from '@/lib/api/route-helpers'

export const revalidate = 60

interface DashboardSummaryResponse {
  totalRevenueMmk: number
  totalCogsMmk: number
  totalGrossProfitMmk: number
  totalOperatingProfitMmk: number
  totalOpexMmk: number
  averageDailyRevenueMmk: number
  totalCovers: number
  openDays: number
  dateRangeStart: string
  dateRangeEnd: string
  totalPayrollMmk: number
}

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

    const { data, error } = await supabase.rpc('dashboard_summary', {
      p_from: fromDate ? fromDate.toISOString().slice(0, 10) : null,
      p_to: toDate ? toDate.toISOString().slice(0, 10) : null,
    })

    if (error) {
      return jsonError(error.message, 500)
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      return jsonData({})
    }

    return jsonData({
      totalRevenueMmk: Number(row.totalRevenue ?? 0),
      totalCogsMmk: Number(row.totalCogs ?? 0),
      totalGrossProfitMmk: Number(row.totalGrossProfit ?? 0),
      totalOperatingProfitMmk: Number(row.totalOperatingProfit ?? 0),
      totalCovers: Number(row.totalCovers ?? 0),
      openDays: Number(row.openDays ?? 0),
      averageDailyRevenueMmk: Number(row.avgDailyRevenue ?? 0),
      avgGrossMarginPct: Number(row.avgGrossMarginPct ?? 0),
      dateRangeStart: row.dateFrom ?? null,
      dateRangeEnd: row.dateTo ?? null,
      totalPayrollMmk: Number(row.totalPayrollMmk ?? 0),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard summary.'
    return jsonError(message, 500)
  }
}
