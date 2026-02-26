import Papa from 'papaparse'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseMoney(value: unknown): number | null {
  const raw = asString(value).replace(/,/g, '')
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function parseIntOrNull(value: unknown): number | null {
  const raw = asString(value)
  if (!raw) return null
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

function parseBool(value: unknown): boolean {
  const raw = asString(value).toLowerCase()
  return ['true', 'yes', 'y', '1'].includes(raw)
}

function parseMenuType(value: unknown): 'FOOD' | 'DRINK' | null {
  const raw = asString(value).toUpperCase()
  if (raw === 'FOOD' || raw === 'DRINK') return raw
  if (raw.includes('DRINK')) return 'DRINK'
  if (raw.includes('FOOD')) return 'FOOD'
  return null
}

function getField(row: Record<string, unknown>, keys: string[]): string {
  const entries = Object.entries(row)
  for (const [key, value] of entries) {
    const normalized = normalizeHeader(key)
    if (keys.some((pattern) => normalized.includes(pattern))) {
      return asString(value)
    }
  }
  return ''
}

function computeNextMenuItemId(existingIds: string[]): () => string {
  const maxId = existingIds.reduce((max, id) => {
    const match = id.match(/^(?:M)?(\d+)$/i)
    if (!match) return max
    const value = Number(match[1])
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)

  let current = maxId
  return () => {
    current += 1
    return `M${String(current).padStart(3, '0')}`
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const errors: string[] = []
  let imported = 0

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required.' }, { status: 400 })
    }

    const csvText = await file.text()
    const parsed = Papa.parse<Record<string, unknown>>(csvText, {
      header: true,
      skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
      parsed.errors.forEach((error) => {
        errors.push(`CSV parse error (row ${error.row ?? 'unknown'}): ${error.message}`)
      })
    }

    const sectionNames = Array.from(
      new Set(
        parsed.data
          .map((row) => getField(row, ['section']))
          .filter((name) => Boolean(name)),
      ),
    )

    const storageNames = Array.from(
      new Set(
        parsed.data
          .map((row) => getField(row, ['storagelocation', 'storage']))
          .filter((name) => Boolean(name)),
      ),
    )

    const prepStationNames = Array.from(
      new Set(
        parsed.data
          .map((row) => getField(row, ['prepstation']))
          .filter((name) => Boolean(name)),
      ),
    )

    if (sectionNames.length > 0) {
      const { error } = await supabase
        .from('MenuSection')
        .upsert(sectionNames.map((name) => ({ name })), { onConflict: 'name' })
      if (error) {
        return NextResponse.json({ imported, errors: [...errors, error.message] }, { status: 500 })
      }
    }

    if (storageNames.length > 0) {
      const { error } = await supabase
        .from('StorageLocation')
        .upsert(storageNames.map((name) => ({ name })), { onConflict: 'name' })
      if (error) {
        return NextResponse.json({ imported, errors: [...errors, error.message] }, { status: 500 })
      }
    }

    if (prepStationNames.length > 0) {
      const { error } = await supabase
        .from('PrepStation')
        .upsert(prepStationNames.map((name) => ({ name })), { onConflict: 'name' })
      if (error) {
        return NextResponse.json({ imported, errors: [...errors, error.message] }, { status: 500 })
      }
    }

    const sectionByName = new Map<string, number>()
    if (sectionNames.length > 0) {
      const { data, error } = await supabase
        .from('MenuSection')
        .select('id,name')
        .in('name', sectionNames)
      if (error) {
        return NextResponse.json({ imported, errors: [...errors, error.message] }, { status: 500 })
      }
      ;(data ?? []).forEach((section) => {
        sectionByName.set(section.name, section.id)
      })
    }

    const storageByName = new Map<string, number>()
    if (storageNames.length > 0) {
      const { data, error } = await supabase
        .from('StorageLocation')
        .select('id,name')
        .in('name', storageNames)
      if (error) {
        return NextResponse.json({ imported, errors: [...errors, error.message] }, { status: 500 })
      }
      ;(data ?? []).forEach((location) => {
        storageByName.set(location.name, location.id)
      })
    }

    const prepStationByName = new Map<string, number>()
    if (prepStationNames.length > 0) {
      const { data, error } = await supabase
        .from('PrepStation')
        .select('id,name')
        .in('name', prepStationNames)
      if (error) {
        return NextResponse.json({ imported, errors: [...errors, error.message] }, { status: 500 })
      }
      ;(data ?? []).forEach((station) => {
        prepStationByName.set(station.name, station.id)
      })
    }

    const { data: existingItems, error: existingItemsError } = await supabase
      .from('MenuItem')
      .select('id,menuCode')

    if (existingItemsError) {
      return NextResponse.json({ imported, errors: [...errors, existingItemsError.message] }, { status: 500 })
    }

    const existingByMenuCode = new Map<string, string>()
    const existingIds = (existingItems ?? []).map((item) => item.id)
    ;(existingItems ?? []).forEach((item) => {
      if (typeof item.menuCode === 'string' && item.menuCode) {
        existingByMenuCode.set(item.menuCode, item.id)
      }
    })

    const nextId = computeNextMenuItemId(existingIds)

    for (let index = 0; index < parsed.data.length; index++) {
      const row = parsed.data[index]
      const rowNo = index + 2

      const name = getField(row, ['itemname', 'name'])
      const sectionName = getField(row, ['section'])
      const menuType = parseMenuType(getField(row, ['menutype', 'type']))
      const salesPrice = parseMoney(getField(row, ['salesprice', 'price']))
      const supplierCost = parseMoney(getField(row, ['suppliercost', 'cost']))

      if (!name || !sectionName || !menuType || salesPrice == null || supplierCost == null) {
        errors.push(`Row ${rowNo}: missing required fields (name, section, menuType, salesPriceMmk, supplierCostMmk).`)
        continue
      }

      try {
        let menuCode = getField(row, ['menucode', 'itemid'])
        const targetCostRaw = parseMoney(getField(row, ['targetcostpct', 'targetcost']))
        const unitSold = getField(row, ['unitsold', 'unit']) || 'portion'
        const portionSize = getField(row, ['portionsize']) || null
        const leadTimeDays = parseIntOrNull(getField(row, ['leadtimedays', 'leadtime']))
        const notes = getField(row, ['notes']) || null
        const isActive = getField(row, ['isactive']) ? parseBool(getField(row, ['isactive'])) : true

        const storageLocationName = getField(row, ['storagelocation', 'storage'])
        const prepStationName = getField(row, ['prepstation'])

        const sectionId = sectionByName.get(sectionName)
        if (!sectionId) {
          errors.push(`Row ${rowNo}: could not resolve section id for "${sectionName}".`)
          continue
        }

        let generatedId: string | null = null
        if (!menuCode) {
          generatedId = nextId()
          menuCode = `AUTO-${generatedId}`
        }

        const existingId = existingByMenuCode.get(menuCode)
        const id = existingId ?? generatedId ?? nextId()

        const { error: upsertError } = await supabase
          .from('MenuItem')
          .upsert(
            {
              id,
              menuCode,
              name,
              menuType,
              sectionId,
              unitSold,
              portionSize,
              salesPriceMmk: salesPrice,
              supplierCostMmk: supplierCost,
              targetCostPct: targetCostRaw,
              storageLocationId: storageLocationName ? (storageByName.get(storageLocationName) ?? null) : null,
              prepStationId: prepStationName ? (prepStationByName.get(prepStationName) ?? null) : null,
              leadTimeDays,
              notes,
              highValue: parseBool(getField(row, ['highvalue'])),
              highTheftRisk: parseBool(getField(row, ['hightheftrisk', 'theftrisk'])),
              expiryTracking: parseBool(getField(row, ['expirytracking', 'expiry'])),
              isActive,
            },
            { onConflict: 'menuCode' },
          )

        if (upsertError) {
          throw new Error(upsertError.message)
        }

        existingByMenuCode.set(menuCode, id)

        imported += 1
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected import error.'
        errors.push(`Row ${rowNo}: ${message}`)
      }
    }

    return NextResponse.json({ imported, errors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to import CSV.'
    return NextResponse.json({ imported, errors: [...errors, message] }, { status: 500 })
  }
}
