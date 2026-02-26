import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseDateParam } from '@/lib/api/route-helpers'

export const revalidate = 60

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const from = request.nextUrl.searchParams.get('from')
    const to = request.nextUrl.searchParams.get('to')

    const fromDate = parseDateParam(from)
    const toDate = parseDateParam(to)

    let query = supabase
      .from('DailySummary')
      .select('cogsMmk,rentMmk,waitersSalariesMmk,chefsSalariesMmk,otherStaffSalariesMmk,electricityGridMmk,generatorFuelMmk,marketingSocialMmk,maintenanceSanitationMmk,consumablesMmk,cardFeesMmk,bankChargesMmk')

    if (fromDate) query = query.gte('businessDate', fromDate.toISOString().slice(0, 10))
    if (toDate) query = query.lte('businessDate', toDate.toISOString().slice(0, 10))

    const { data, error } = await query

    if (error) {
      return jsonError(error.message, 500)
    }

    const rows = data ?? []

    const sum = (field: string) =>
      rows.reduce((acc, row) => acc + Number((row as any)[field] ?? 0), 0)

    const breakdown = [
      { category: 'COGS',             totalMmk: sum('cogsMmk') },
      { category: 'Rent',             totalMmk: sum('rentMmk') },
      { category: 'Waiters Salaries', totalMmk: sum('waitersSalariesMmk') },
      { category: 'Chefs Salaries',   totalMmk: sum('chefsSalariesMmk') },
      { category: 'Other Staff',      totalMmk: sum('otherStaffSalariesMmk') },
      { category: 'Electricity',      totalMmk: sum('electricityGridMmk') },
      { category: 'Generator',        totalMmk: sum('generatorFuelMmk') },
      { category: 'Marketing',        totalMmk: sum('marketingSocialMmk') },
      { category: 'Maintenance',      totalMmk: sum('maintenanceSanitationMmk') },
      { category: 'Consumables',      totalMmk: sum('consumablesMmk') },
      { category: 'Card Fees',        totalMmk: sum('cardFeesMmk') },
      { category: 'Bank Charges',     totalMmk: sum('bankChargesMmk') },
    ].filter(item => item.totalMmk > 0)

    return jsonData(breakdown)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch cost breakdown.'
    return jsonError(message, 500)
  }
}
