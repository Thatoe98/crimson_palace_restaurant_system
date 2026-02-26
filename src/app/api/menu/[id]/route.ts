import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError, toNumber } from '@/lib/api/route-helpers'

interface RouteContext {
  params: {
    id: string
  }
}

function parseMenuType(value: unknown): 'FOOD' | 'DRINK' | null {
  if (value === 'FOOD' || value === 'DRINK') return value
  return null
}

function parseMoney(value: unknown): number | null {
  if (typeof value !== 'number') return null
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { data: item, error } = await supabase
      .from('MenuItem')
      .select('*, section:MenuSection(*), storageLocation:StorageLocation(*), prepStation:PrepStation(*)')
      .eq('id', params.id)
      .maybeSingle()

    if (error) return jsonError(error.message, 500)

    if (!item) return jsonError('Menu item not found.', 404)

    return jsonData({
      ...item,
      salesPriceMmk: toNumber(item.salesPriceMmk),
      supplierCostMmk: toNumber(item.supplierCostMmk),
      targetCostPct: item.targetCostPct == null ? null : toNumber(item.targetCostPct),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch menu item.'
    return jsonError(message, 500)
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('MenuItem')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (existingError) return jsonError(existingError.message, 500)
    if (!existing) return jsonError('Menu item not found.', 404)

    const body = await request.json()
    const data: Record<string, unknown> = {}

    if (body?.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return jsonError('name must be a non-empty string.', 400)
      }
      data.name = body.name.trim()
    }

    if (body?.menuType !== undefined) {
      const menuType = parseMenuType(body.menuType)
      if (!menuType) return jsonError('menuType must be FOOD or DRINK.', 400)
      data.menuType = menuType
    }

    if (body?.section !== undefined) {
      if (typeof body.section !== 'string' || !body.section.trim()) {
        return jsonError('section must be a non-empty string.', 400)
      }
      const { data: section, error: sectionError } = await supabase
        .from('MenuSection')
        .upsert({ name: body.section.trim() }, { onConflict: 'name' })
        .select('id')
        .single()
      if (sectionError) return jsonError(sectionError.message, 500)
      data.sectionId = section.id
    }

    if (body?.salesPriceMmk !== undefined) {
      const value = parseMoney(body.salesPriceMmk)
      if (value == null) return jsonError('salesPriceMmk must be a non-negative number.', 400)
      data.salesPriceMmk = value
    }

    if (body?.supplierCostMmk !== undefined) {
      const value = parseMoney(body.supplierCostMmk)
      if (value == null) return jsonError('supplierCostMmk must be a non-negative number.', 400)
      data.supplierCostMmk = value
    }

    if (body?.unitSold !== undefined) {
      if (typeof body.unitSold !== 'string' || !body.unitSold.trim()) {
        return jsonError('unitSold must be a non-empty string.', 400)
      }
      data.unitSold = body.unitSold.trim()
    }

    if (body?.portionSize !== undefined) {
      data.portionSize = typeof body.portionSize === 'string' && body.portionSize.trim() ? body.portionSize.trim() : null
    }

    if (body?.targetCostPct !== undefined) {
      data.targetCostPct = typeof body.targetCostPct === 'number' ? body.targetCostPct : null
    }

    if (body?.highValue !== undefined) data.highValue = Boolean(body.highValue)
    if (body?.highTheftRisk !== undefined) data.highTheftRisk = Boolean(body.highTheftRisk)
    if (body?.expiryTracking !== undefined) data.expiryTracking = Boolean(body.expiryTracking)
    if (body?.storageLocationId !== undefined) data.storageLocationId = typeof body.storageLocationId === 'number' ? body.storageLocationId : null
    if (body?.prepStationId !== undefined) data.prepStationId = typeof body.prepStationId === 'number' ? body.prepStationId : null
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive)

    if (body?.storageLocation !== undefined) {
      const storageLocationName = typeof body.storageLocation === 'string' ? body.storageLocation.trim() : ''
      if (storageLocationName) {
        const { data: storageLocation, error: storageError } = await supabase
          .from('StorageLocation')
          .upsert({ name: storageLocationName }, { onConflict: 'name' })
          .select('id')
          .single()
        if (storageError) return jsonError(storageError.message, 500)
        data.storageLocationId = storageLocation.id
      } else {
        data.storageLocationId = null
      }
    }

    if (body?.prepStation !== undefined) {
      const prepStationName = typeof body.prepStation === 'string' ? body.prepStation.trim() : ''
      if (prepStationName) {
        const { data: prepStation, error: prepError } = await supabase
          .from('PrepStation')
          .upsert({ name: prepStationName }, { onConflict: 'name' })
          .select('id')
          .single()
        if (prepError) return jsonError(prepError.message, 500)
        data.prepStationId = prepStation.id
      } else {
        data.prepStationId = null
      }
    }

    if (body?.leadTimeDays !== undefined) data.leadTimeDays = typeof body.leadTimeDays === 'number' ? body.leadTimeDays : null
    if (body?.notes !== undefined) data.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
    if (body?.sourceUrl !== undefined) data.sourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null
    if (body?.menuCode !== undefined) data.menuCode = typeof body.menuCode === 'string' && body.menuCode.trim() ? body.menuCode.trim() : existing.menuCode

    if (Object.keys(data).length === 0) {
      return jsonError('No valid fields provided for update.', 400)
    }

    const { data: updated, error: updateError } = await supabase
      .from('MenuItem')
      .update(data)
      .eq('id', params.id)
      .select('*, section:MenuSection(*), storageLocation:StorageLocation(*), prepStation:PrepStation(*)')
      .single()

    if (updateError) return jsonError(updateError.message, 500)

    return jsonData({
      ...updated,
      salesPriceMmk: toNumber(updated.salesPriceMmk),
      supplierCostMmk: toNumber(updated.supplierCostMmk),
      targetCostPct: updated.targetCostPct == null ? null : toNumber(updated.targetCostPct),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update menu item.'
    return jsonError(message, 500)
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('MenuItem')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (existingError) return jsonError(existingError.message, 500)
    if (!existing) return jsonError('Menu item not found.', 404)

    const { data: updated, error: updateError } = await supabase
      .from('MenuItem')
      .update({ isActive: false })
      .eq('id', params.id)
      .select('*, section:MenuSection(*), storageLocation:StorageLocation(*), prepStation:PrepStation(*)')
      .single()

    if (updateError) return jsonError(updateError.message, 500)

    return jsonData({
      ...updated,
      salesPriceMmk: toNumber(updated.salesPriceMmk),
      supplierCostMmk: toNumber(updated.supplierCostMmk),
      targetCostPct: updated.targetCostPct == null ? null : toNumber(updated.targetCostPct),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete menu item.'
    return jsonError(message, 500)
  }
}
