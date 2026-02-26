import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMMK(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num.toLocaleString('en-US')} Ks`
}

export function formatPct(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${(num * 100).toFixed(1)}%`
}