import fs from 'fs'
import path from 'path'

export interface CsvRow {
  [key: string]: string
}

/**
 * Reads a CSV file from the workspace root (relative to project root).
 * Returns an array of objects keyed by header row.
 * Handles leading BOM, trims whitespace, skips blank rows.
 */
export function readCsv(filePath: string): CsvRow[] {
  const fullPath = path.resolve(process.cwd(), filePath)
  const content = fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/)

  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h, idx) => {
    const normalizedHeader = h.trim().replace(/^"|"$/g, '')
    return idx === 0 ? normalizedHeader.replace(/^\uFEFF\s*/, '') : normalizedHeader
  })
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = splitCsvLine(line)
    const row: CsvRow = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim().replace(/^"|"$/g, '')
    })
    rows.push(row)
  }

  return rows
}

/**
 * Simple CSV line splitter that handles quoted fields with commas.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}