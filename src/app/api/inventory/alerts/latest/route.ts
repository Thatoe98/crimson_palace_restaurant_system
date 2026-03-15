import { NextRequest, NextResponse } from 'next/server'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'
import { supabase } from '@/lib/db'

export const revalidate = 60

type AlertAction = 'REORDER' | 'SPOILAGE_WRITE_OFF' | 'USE_FAST' | 'DISCOUNT'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { data: latest, error: latestError } = await supabase
      .from('InventoryAlert')
      .select('businessDate')
      .order('businessDate', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestError) {
      return jsonError(latestError.message, 500)
    }

    if (!latest) {
      return jsonData({
        date: '',
        summaryByAction: {
          REORDER: 0,
          SPOILAGE_WRITE_OFF: 0,
          USE_FAST: 0,
          DISCOUNT: 0,
        },
        criticalItems: [],
      })
    }

    const { data: alerts, error } = await supabase
      .from('InventoryAlert')
      .select('businessDate,ingredientId,closingOnHand,reorderPoint, ingredient:Ingredient(uomCode), actions:InventoryAlertAction(action)')
      .eq('businessDate', latest.businessDate)
      .order('ingredientId')

    if (error) {
      return jsonError(error.message, 500)
    }

    const summaryByAction: Record<AlertAction, number> = {
      REORDER: 0,
      SPOILAGE_WRITE_OFF: 0,
      USE_FAST: 0,
      DISCOUNT: 0,
    }

    for (const alert of alerts ?? []) {
      for (const actionEntry of alert.actions ?? []) {
        const action = actionEntry.action as AlertAction
        if (action in summaryByAction) {
          summaryByAction[action] += 1
        }
      }
    }

    const criticalItems = (alerts ?? [])
      .filter((alert) => toNumber(alert.closingOnHand) < toNumber(alert.reorderPoint) * 0.5)
      .map((alert) => ({
        ingredientId: alert.ingredientId,
        ingredientUom: (Array.isArray(alert.ingredient) ? alert.ingredient[0]?.uomCode : (alert.ingredient as any)?.uomCode) ?? '',
        closingOnHand: toNumber(alert.closingOnHand),
        reorderPoint: toNumber(alert.reorderPoint),
        actions: (alert.actions ?? []).map((entry) => entry.action),
      }))

    return jsonData({
      date: typeof latest.businessDate === 'string' ? latest.businessDate : '',
      summaryByAction,
      criticalItems,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch latest inventory alerts.'
    return jsonError(message, 500)
  }
}
