import { NextRequest, NextResponse } from 'next/server'
import { CURRENT_SYSTEM_DATE, formatDate } from '@/lib/date'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, parseBooleanParam, toNumber } from '@/lib/api/route-helpers'

function parseMenuType(value: unknown): 'FOOD' | 'DRINK' | null {
  if (value !== 'FOOD' && value !== 'DRINK') return null
  return value
}

async function getNextMenuItemId(): Promise<string> {
  const { data, error } = await supabase
    .from('MenuItem')
    .select('id')
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Failed to generate next menu item id: ${error.message}`)
  }

  const items = data ?? []

  const maxId = items.reduce((max, item) => {
    const match = item.id.match(/^(?:M)?(\d+)$/i)
    if (!match) return max
    const value = Number(match[1])
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)

  return `M${String(maxId + 1).padStart(3, '0')}`
}

function parseMoney(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const typeParam = request.nextUrl.searchParams.get('type')
    const activeParam = request.nextUrl.searchParams.get('active')

    let menuTypeFilter: 'FOOD' | 'DRINK' | undefined
    if (typeParam) {
      if (typeParam !== 'FOOD' && typeParam !== 'DRINK') {
        return jsonError('Invalid type. Use FOOD or DRINK.', 400)
      }
      menuTypeFilter = typeParam
    }

    const parsedActive = parseBooleanParam(activeParam)
    if (activeParam != null && parsedActive == null) {
      return jsonError('Invalid active value. Use true or false.', 400)
    }

    let query = supabase
      .from('MenuItem')
      .select('*, section:MenuSection(*), storageLocation:StorageLocation(*), prepStation:PrepStation(*)')
      .order('name', { ascending: true })

    if (menuTypeFilter) {
      query = query.eq('menuType', menuTypeFilter)
    }

    if (parsedActive != null) {
      query = query.eq('isActive', parsedActive)
    }

    const { data: items, error } = await query
    if (error) return jsonError(error.message, 500)

    const data = (items ?? []).map((item) => ({
      ...item,
      salesPriceMmk: toNumber(item.salesPriceMmk),
      supplierCostMmk: toNumber(item.supplierCostMmk),
      targetCostPct: item.targetCostPct == null ? null : toNumber(item.targetCostPct),
    }))

    return jsonData(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch menu items.'
    return jsonError(message, 500)
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()

    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const menuType = parseMenuType(body?.menuType)
    const sectionName = typeof body?.section === 'string' ? body.section.trim() : ''
    const salesPriceMmk = parseMoney(body?.salesPriceMmk)
    const supplierCostMmk = parseMoney(body?.supplierCostMmk)

    if (!name) return jsonError('name is required.', 400)
    if (!menuType) return jsonError('menuType is required and must be FOOD or DRINK.', 400)
    if (!sectionName) return jsonError('section is required.', 400)
    if (salesPriceMmk == null) return jsonError('salesPriceMmk is required and must be a non-negative number.', 400)
    if (supplierCostMmk == null) return jsonError('supplierCostMmk is required and must be a non-negative number.', 400)

    const { data: section, error: sectionError } = await supabase
      .from('MenuSection')
      .upsert({ name: sectionName }, { onConflict: 'name' })
      .select('id')
      .single()

    if (sectionError) return jsonError(sectionError.message, 500)

    const storageLocationName = typeof body?.storageLocation === 'string' ? body.storageLocation.trim() : ''
    const prepStationName = typeof body?.prepStation === 'string' ? body.prepStation.trim() : ''

    let storageLocationId: number | null = typeof body?.storageLocationId === 'number' ? body.storageLocationId : null
    if (storageLocationName) {
      const { data: storageLocation, error: storageError } = await supabase
        .from('StorageLocation')
        .upsert({ name: storageLocationName }, { onConflict: 'name' })
        .select('id')
        .single()
      if (storageError) return jsonError(storageError.message, 500)
      storageLocationId = storageLocation.id
    }

    let prepStationId: number | null = typeof body?.prepStationId === 'number' ? body.prepStationId : null
    if (prepStationName) {
      const { data: prepStation, error: prepError } = await supabase
        .from('PrepStation')
        .upsert({ name: prepStationName }, { onConflict: 'name' })
        .select('id')
        .single()
      if (prepError) return jsonError(prepError.message, 500)
      prepStationId = prepStation.id
    }

    const id = await getNextMenuItemId()
    const menuCode = body?.menuCode && typeof body.menuCode === 'string' && body.menuCode.trim()
      ? body.menuCode.trim()
      : `AUTO-${formatDate(CURRENT_SYSTEM_DATE).replaceAll('-', '')}-${id}`

    const { data: created, error: createError } = await supabase
      .from('MenuItem')
      .insert({
        id,
        menuCode,
        name,
        menuType,
        sectionId: section.id,
        unitSold: typeof body?.unitSold === 'string' && body.unitSold.trim() ? body.unitSold.trim() : 'portion',
        portionSize: typeof body?.portionSize === 'string' && body.portionSize.trim() ? body.portionSize.trim() : null,
        salesPriceMmk,
        supplierCostMmk,
        targetCostPct: typeof body?.targetCostPct === 'number' ? body.targetCostPct : null,
        highValue: Boolean(body?.highValue),
        highTheftRisk: Boolean(body?.highTheftRisk),
        expiryTracking: Boolean(body?.expiryTracking),
        storageLocationId,
        prepStationId,
        leadTimeDays: typeof body?.leadTimeDays === 'number' ? body.leadTimeDays : null,
        notes: typeof body?.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
        sourceUrl: typeof body?.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null,
        isActive: typeof body?.isActive === 'boolean' ? body.isActive : true,
      })
      .select('*, section:MenuSection(*), storageLocation:StorageLocation(*), prepStation:PrepStation(*)')
      .single()

    if (createError) return jsonError(createError.message, 500)

    return jsonData({
      ...created,
      salesPriceMmk: toNumber(created.salesPriceMmk),
      supplierCostMmk: toNumber(created.supplierCostMmk),
      targetCostPct: created.targetCostPct == null ? null : toNumber(created.targetCostPct),
    }, 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create menu item.'
    return jsonError(message, 500)
  }
}
