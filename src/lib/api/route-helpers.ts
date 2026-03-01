import { NextResponse } from 'next/server'
import { formatDate } from '@/lib/date'

export function jsonError(error: string, status: number, debug?: unknown): NextResponse {
  const body = debug === undefined ? { error } : { error, debug }
  return NextResponse.json(body, { status })
}

export function jsonData<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return Number(value)
}

export function parseDateParam(value: string | null): Date | null {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export function parseBooleanParam(value: string | null): boolean | null {
  if (value == null) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return null
}

export function formatDateSafe(date: Date | null | undefined): string {
  if (!date) return ''
  return formatDate(date)
}
