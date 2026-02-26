import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { jsonData, jsonError } from '@/lib/api/route-helpers'

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const { data, error } = await supabase
      .from('DiningTable')
      .select('id,label,capacity,qrSlug,isActive')
      .eq('isActive', true)
      .order('label')

    if (error) return jsonError(error.message, 500)

    return jsonData(data ?? [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tables.'
    return jsonError(message, 500)
  }
}
