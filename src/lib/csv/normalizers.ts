/**
 * Parse MMK monetary string like "12,000" or "12000" to number
 */
export function parseMMK(value: string): number {
  if (!value || value.trim() === '') return 0
  return parseFloat(value.replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0
}

/**
 * Parse percentage string like "35.0%" or "0.35" to decimal fraction (0-1)
 */
export function parsePct(value: string): number {
  if (!value || value.trim() === '') return 0
  const cleaned = value.replace(/%/g, '').trim()
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  // If value > 1, assume it's "35.0" meaning 35% => 0.35
  return num > 1 ? num / 100 : num
}

/**
 * Parse Yes/No boolean
 */
export function parseBool(value: string): boolean {
  return value.trim().toLowerCase() === 'yes'
}

/**
 * Parse Y/blank reorder flag
 */
export function parseFlagBool(value: string): boolean {
  return value.trim().toUpperCase() === 'Y'
}

/**
 * Parse date string YYYY-MM-DD or blank to Date | null
 */
export function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null
  const d = new Date(value.trim())
  return isNaN(d.getTime()) ? null : d
}

/**
 * Parse integer, return 0 if empty/invalid
 */
export function parseInt2(value: string): number {
  const n = parseInt(value.replace(/,/g, ''), 10)
  return isNaN(n) ? 0 : n
}

/**
 * Parse decimal quantity
 */
export function parseDecimal(value: string): number {
  if (!value || value.trim() === '') return 0
  return parseFloat(value.replace(/,/g, '')) || 0
}

/**
 * Split semicolon-delimited action string into array of trimmed tokens
 */
export function parseActions(value: string): string[] {
  if (!value || value.trim() === '') return []
  return value.split(';').map(a => a.trim()).filter(Boolean)
}

/**
 * Normalize action token to AlertAction enum value
 */
export function normalizeAlertAction(token: string): string | null {
  const map: Record<string, string> = {
    'REORDER': 'REORDER',
    'SPOILAGE_WRITE_OFF': 'SPOILAGE_WRITE_OFF',
    'USE_FAST/DISCOUNT': 'USE_FAST',
    'USE_FAST': 'USE_FAST',
    'DISCOUNT': 'DISCOUNT',
  }
  return map[token.toUpperCase()] ?? null
}