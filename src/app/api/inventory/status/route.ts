import { NextRequest, NextResponse } from 'next/server'
import { jsonData, jsonError, parseDateParam, toNumber } from '@/lib/api/route-helpers'
import { supabase } from '@/lib/db'

export const revalidate = 60

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const dateParam = request.nextUrl.searchParams.get('date')
    const ingredientId = request.nextUrl.searchParams.get('ingredient')

    const parsedDate = parseDateParam(dateParam)
    if (dateParam && !parsedDate) {
      return jsonError('Invalid date format. Use YYYY-MM-DD.', 400)
    }

    let targetDate = parsedDate ? parsedDate.toISOString().slice(0, 10) : null

    if (!targetDate) {
      const { data: latest, error: latestError } = await supabase
        .from('InventoryDailyStatus')
        .select('businessDate')
        .order('businessDate', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestError) {
        return jsonError(latestError.message, 500)
      }

      targetDate = latest?.businessDate ?? null
    }

    if (!targetDate) return jsonData([])

    let query = supabase
      .from('InventoryDailyStatus')
      .select('businessDate,ingredientId,uomCode,closingOnHand,reorderPoint,reorderFlag,expiryFlag,suggestedActionRaw, ingredient:Ingredient(id,uomCode, category:IngredientCategory(name))')
      .eq('businessDate', targetDate)
      .order('ingredientId')

    if (ingredientId) {
      query = query.eq('ingredientId', ingredientId)
    }

    const { data: rows, error } = await query

    if (error) {
      return jsonError(error.message, 500)
    }

    const data = (rows ?? []).map((row) => {
      const ingredient = Array.isArray(row.ingredient) ? row.ingredient[0] : row.ingredient
      const category = Array.isArray((ingredient as any)?.category)
        ? (ingredient as any).category[0]
        : (ingredient as any)?.category

      return {
        date: typeof row.businessDate === 'string' ? row.businessDate : '',
        ingredientId: row.ingredientId,
        category: category?.name ?? '',
        uomCode: row.uomCode ?? (ingredient as any)?.uomCode ?? '',
        closingOnHand: toNumber(row.closingOnHand),
        reorderPoint: toNumber(row.reorderPoint),
        reorderFlag: Boolean(row.reorderFlag),
        expiryFlag: Boolean(row.expiryFlag),
        suggestedActionRaw: row.suggestedActionRaw ?? null,
      }
    })

    return jsonData(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch inventory status.'
    return jsonError(message, 500)
  }
}
