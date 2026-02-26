import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://gdyjuoygyxgiwvplkekj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeWp1b3lneXhnaXd2cGxrZWtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQxMzAxMCwiZXhwIjoyMDg2OTg5MDEwfQ.OQg-S0cdaHrzyZSin02F3qlXO0xg7B47Ruhj7zmpikA',
  { auth: { persistSession: false } }
)

type CheckResult = {
  name: string
  pass: boolean
  detail: string
}

function dateLabel(date: string | null | undefined): string {
  return date ? date.slice(0, 10) : 'N/A'
}

async function getExactCount(tableName: string): Promise<number> {
  const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
  if (error) {
    throw new Error(`[${tableName}] Count failed: ${error.message}`)
  }
  return count ?? 0
}

async function getDateRange(tableName: string, columnName: string): Promise<{ min: string | null; max: string | null }> {
  const [minResult, maxResult] = await Promise.all([
    supabase.from(tableName).select(columnName).order(columnName, { ascending: true }).limit(1).maybeSingle(),
    supabase.from(tableName).select(columnName).order(columnName, { ascending: false }).limit(1).maybeSingle(),
  ])

  if (minResult.error) throw new Error(`[${tableName}] Min ${columnName} range failed: ${minResult.error.message}`)
  if (maxResult.error) throw new Error(`[${tableName}] Max ${columnName} range failed: ${maxResult.error.message}`)

  const min = (minResult.data?.[columnName as keyof typeof minResult.data] as string | undefined) ?? null
  const max = (maxResult.data?.[columnName as keyof typeof maxResult.data] as string | undefined) ?? null

  return { min, max }
}

async function main(): Promise<void> {
  console.log('Running seed validation...')

  const [
    uomCount,
    ingredientCategoryCount,
    ingredientCount,
    menuSectionCount,
    storageLocationCount,
    prepStationCount,
    menuItemCount,
    menuItemRecipeCount,
    payrollRoleCount,
    dailySummaryCount,
    dailyItemSaleCount,
    ingredientDailyUsageCount,
    inventoryDailyStatusCount,
    inventoryAlertCount,
    inventoryAlertActionCount,
    purchaseOrderCount,
    diningTableCount,
    customerOrderCount,
    customerOrderItemCount,
  ] = await Promise.all([
    getExactCount('Uom'),
    getExactCount('IngredientCategory'),
    getExactCount('Ingredient'),
    getExactCount('MenuSection'),
    getExactCount('StorageLocation'),
    getExactCount('PrepStation'),
    getExactCount('MenuItem'),
    getExactCount('MenuItemRecipe'),
    getExactCount('PayrollRole'),
    getExactCount('DailySummary'),
    getExactCount('DailyItemSale'),
    getExactCount('IngredientDailyUsage'),
    getExactCount('InventoryDailyStatus'),
    getExactCount('InventoryAlert'),
    getExactCount('InventoryAlertAction'),
    getExactCount('PurchaseOrder'),
    getExactCount('DiningTable'),
    getExactCount('CustomerOrder'),
    getExactCount('CustomerOrderItem'),
  ])

  console.log('\nTable counts:')
  console.log(`- Uom: ${uomCount}`)
  console.log(`- IngredientCategory: ${ingredientCategoryCount}`)
  console.log(`- Ingredient: ${ingredientCount}`)
  console.log(`- MenuSection: ${menuSectionCount}`)
  console.log(`- StorageLocation: ${storageLocationCount}`)
  console.log(`- PrepStation: ${prepStationCount}`)
  console.log(`- MenuItem: ${menuItemCount}`)
  console.log(`- MenuItemRecipe: ${menuItemRecipeCount}`)
  console.log(`- PayrollRole: ${payrollRoleCount}`)
  console.log(`- DailySummary: ${dailySummaryCount}`)
  console.log(`- DailyItemSale: ${dailyItemSaleCount}`)
  console.log(`- IngredientDailyUsage: ${ingredientDailyUsageCount}`)
  console.log(`- InventoryDailyStatus: ${inventoryDailyStatusCount}`)
  console.log(`- InventoryAlert: ${inventoryAlertCount}`)
  console.log(`- InventoryAlertAction: ${inventoryAlertActionCount}`)
  console.log(`- PurchaseOrder: ${purchaseOrderCount}`)
  console.log(`- DiningTable: ${diningTableCount}`)
  console.log(`- CustomerOrder: ${customerOrderCount}`)
  console.log(`- CustomerOrderItem: ${customerOrderItemCount}`)

  const [dailySummaryRange, usageRange, statusRange, poRange] = await Promise.all([
    getDateRange('DailySummary', 'businessDate'),
    getDateRange('IngredientDailyUsage', 'businessDate'),
    getDateRange('InventoryDailyStatus', 'businessDate'),
    getDateRange('PurchaseOrder', 'orderedDate'),
  ])

  console.log('\nDate ranges:')
  console.log(`- DailySummary.businessDate: ${dateLabel(dailySummaryRange.min)} → ${dateLabel(dailySummaryRange.max)}`)
  console.log(`- IngredientDailyUsage.businessDate: ${dateLabel(usageRange.min)} → ${dateLabel(usageRange.max)}`)
  console.log(`- InventoryDailyStatus.businessDate: ${dateLabel(statusRange.min)} → ${dateLabel(statusRange.max)}`)
  console.log(`- PurchaseOrder.orderedDate: ${dateLabel(poRange.min)} → ${dateLabel(poRange.max)}`)

  const checks: CheckResult[] = []

  const { count: menuItemsWithNullSection, error: menuNullSectionError } = await supabase
    .from('MenuItem')
    .select('*', { count: 'exact', head: true })
    .is('sectionId', null)
  if (menuNullSectionError) throw new Error(`[MenuItem] Null section check failed: ${menuNullSectionError.message}`)

  checks.push({
    name: 'No MenuItem has null sectionId',
    pass: (menuItemsWithNullSection ?? 0) === 0,
    detail: (menuItemsWithNullSection ?? 0) === 0 ? 'OK' : `Found ${menuItemsWithNullSection}`,
  })

  const [usageIngredientIdsResult, ingredientIdsResult] = await Promise.all([
    supabase.from('IngredientDailyUsage').select('ingredientId'),
    supabase.from('Ingredient').select('id'),
  ])

  if (usageIngredientIdsResult.error) throw new Error(`[IngredientDailyUsage] Select failed: ${usageIngredientIdsResult.error.message}`)
  if (ingredientIdsResult.error) throw new Error(`[Ingredient] Select failed: ${ingredientIdsResult.error.message}`)

  const usageIngredientIds = usageIngredientIdsResult.data ?? []
  const ingredientIds = ingredientIdsResult.data ?? []

  const ingredientIdSet = new Set(ingredientIds.map((item) => item.id as string))
  const missingUsageIngredientIds = Array.from(
    new Set(usageIngredientIds.map((item) => item.ingredientId as string).filter((ingredientId) => !ingredientIdSet.has(ingredientId)))
  )

  checks.push({
    name: 'All IngredientDailyUsage.ingredientId values exist in Ingredient',
    pass: missingUsageIngredientIds.length === 0,
    detail:
      missingUsageIngredientIds.length === 0
        ? 'OK'
        : `Missing: ${missingUsageIngredientIds.slice(0, 10).join(', ')}${missingUsageIngredientIds.length > 10 ? ' ...' : ''}`,
  })

  console.log('\nChecks:')
  for (const check of checks) {
    const status = check.pass ? 'PASS' : 'FAIL'
    console.log(`- [${status}] ${check.name} — ${check.detail}`)
  }

  const failedChecks = checks.filter((check) => !check.pass)
  if (failedChecks.length === 0) {
    console.log('\nValidation complete: PASS')
  } else {
    console.log(`\nValidation complete: FAIL (${failedChecks.length} failed check${failedChecks.length === 1 ? '' : 's'})`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Validation script failed:')
  console.error(error)
  process.exitCode = 1
})
