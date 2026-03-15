import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseDateParam, toNumber } from '@/lib/api/route-helpers'

export const revalidate = 60

type AlertAction = 'REORDER' | 'SPOILAGE_WRITE_OFF' | 'USE_FAST'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const dateParam = request.nextUrl.searchParams.get('date')
    const parsedDate = parseDateParam(dateParam)

    if (dateParam && !parsedDate) {
      return jsonError('Invalid date format. Use YYYY-MM-DD.', 400)
    }

    let targetDate = parsedDate ? parsedDate.toISOString().slice(0, 10) : null

    if (!targetDate) {
      const { data: latest, error: latestError } = await supabase
        .from('InventoryAlert')
        .select('businessDate')
        .order('businessDate', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestError) {
        return jsonError(latestError.message, 500)
      }

      targetDate = latest?.businessDate ?? null
    }

    if (!targetDate) {
      return jsonData({
        alerts: [],
        summaryByAction: {
          REORDER: 0,
          SPOILAGE_WRITE_OFF: 0,
          USE_FAST: 0,
        },
      })
    }

    const { data: alerts, error } = await supabase
      .from('InventoryAlert')
      .select('businessDate,ingredientId,closingOnHand,reorderPoint,earliestExpiryDate, ingredient:Ingredient(uomCode), actions:InventoryAlertAction(action)')
      .eq('businessDate', targetDate)
      .order('ingredientId')

    if (error) {
      return jsonError(error.message, 500)
    }

    const summaryByAction: Record<'REORDER' | 'SPOILAGE_WRITE_OFF' | 'USE_FAST', number> = {
      REORDER: 0,
      SPOILAGE_WRITE_OFF: 0,
      USE_FAST: 0,
    }

    const data = (alerts ?? []).map((alert) => {
      const actions = (alert.actions ?? [])
        .map((entry) => entry.action as AlertAction)
        .filter((action): action is AlertAction => Boolean(action))

      for (const action of actions) {
        if (action === 'REORDER') summaryByAction.REORDER += 1
        if (action === 'SPOILAGE_WRITE_OFF') summaryByAction.SPOILAGE_WRITE_OFF += 1
        if (action === 'USE_FAST') summaryByAction.USE_FAST += 1
      }

      return {
        date: typeof alert.businessDate === 'string' ? alert.businessDate : '',
        ingredientId: alert.ingredientId,
        ingredientUom: (Array.isArray(alert.ingredient) ? alert.ingredient[0]?.uomCode : (alert.ingredient as any)?.uomCode) ?? '',
        closingOnHand: toNumber(alert.closingOnHand),
        reorderPoint: toNumber(alert.reorderPoint),
        actions,
        earliestExpiryDate: typeof alert.earliestExpiryDate === 'string' ? alert.earliestExpiryDate : '',
      }
    })

    return jsonData({
      alerts: data,
      summaryByAction,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory alerts.'
    return jsonError(message, 500)
  }
}
