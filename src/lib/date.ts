// System date constant — all "today" logic must reference this, never new Date()
export const CURRENT_SYSTEM_DATE = new Date('2026-05-01')

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}