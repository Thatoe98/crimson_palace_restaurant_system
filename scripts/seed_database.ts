import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  parseActions,
  parseBool,
  parseDate,
  parseDecimal,
  parseFlagBool,
  parseInt2,
  parseMMK,
  parsePct,
  normalizeAlertAction,
} from '../src/lib/csv/normalizers'
import { CSV_HEADERS, validateHeaders } from '../src/lib/csv/headerContracts'
import { readCsv, type CsvRow } from '../src/lib/csv/parseCsv'

const supabase = createClient(
  'https://gdyjuoygyxgiwvplkekj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeWp1b3lneXhnaXd2cGxrZWtqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQxMzAxMCwiZXhwIjoyMDg2OTg5MDEwfQ.OQg-S0cdaHrzyZSin02F3qlXO0xg7B47Ruhj7zmpikA',
  { auth: { persistSession: false } }
)

const CSV_DIR = path.resolve(process.cwd())

const MENUS_CSV = path.join(CSV_DIR, 'Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Menu (1).csv')
const DAILY_SUMMARY_CSV = path.join(CSV_DIR, 'Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Daily_Summary.csv')
const DAILY_ITEM_SALES_CSV = path.join(CSV_DIR, 'Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Daily_Item_Sales.csv')
const PAYROLL_CSV = path.join(CSV_DIR, 'Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Payroll_Roster.csv')
const INGREDIENT_USAGE_CSV = path.join(CSV_DIR, 'reordering.xlsx - daily ingredi usage.csv')
const INVENTORY_ALERT_CSV = path.join(CSV_DIR, 'reordering.xlsx - inventory alert.csv')
const INVENTORY_STATUS_CSV = path.join(CSV_DIR, 'reordering.xlsx - inventory daily status.csv')
const INVENTORY_SETTINGS_CSV = path.join(CSV_DIR, 'reordering.xlsx - inventory setting.csv')
const PURCHASE_ORDERS_CSV = path.join(CSV_DIR, 'reordering.xlsx - purchase orders.csv')
const RECIPE_CSV = path.join(CSV_DIR, 'reordering.xlsx - recipe assumptions.csv')

type TableCounts = Record<string, number>

const SEEDED_TABLES = [
  'Uom',
  'IngredientCategory',
  'MenuSection',
  'StorageLocation',
  'PrepStation',
  'Ingredient',
  'MenuItem',
  'MenuItemRecipe',
  'PayrollRole',
  'DailySummary',
  'DailyItemSale',
  'IngredientDailyUsage',
  'InventoryDailyStatus',
  'InventoryAlert',
  'InventoryAlertAction',
  'PurchaseOrder',
  'DiningTable',
] as const

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index++
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

function cleanCell(value: string | undefined): string {
  return (value ?? '').trim().replace(/^"|"$/g, '')
}

function normalizeUom(raw: string): string {
  return cleanCell(raw).toLowerCase()
}

function assertFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`)
  }
}

function readHeaderAtRow(filePath: string, zeroBasedHeaderRow: number): string[] {
  assertFileExists(filePath)
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/)
  if (lines.length <= zeroBasedHeaderRow) {
    throw new Error(`CSV has no header row index ${zeroBasedHeaderRow}: ${filePath}`)
  }
  return splitCsvLine(lines[zeroBasedHeaderRow]).map(cleanCell)
}

function parseMenuCsvRows(filePath: string): CsvRow[] {
  assertFileExists(filePath)
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')
  const lines = content.split(/\r?\n/)

  if (lines.length < 4) {
    throw new Error(`[menu] CSV too short: ${filePath}`)
  }

  const headers = splitCsvLine(lines[0]).map(cleanCell)
  validateHeaders(headers, CSV_HEADERS.menu, 'menu')

  const rows: CsvRow[] = []
  for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
    const line = lines[rowIndex].trim()
    if (!line) continue
    const values = splitCsvLine(line)
    const row: CsvRow = {}
    headers.forEach((header, i) => {
      row[header] = cleanCell(values[i])
    })
    rows.push(row)
  }

  return rows
}

function requireString(row: CsvRow, key: string, fileLabel: string, rowIndex: number): string {
  const value = cleanCell(row[key])
  if (!value) {
    throw new Error(`[${fileLabel}] Required field '${key}' is empty at data row ${rowIndex}`)
  }
  return value
}

function requireDateValue(raw: string, fileLabel: string, rowIndex: number, key: string): Date {
  const parsed = parseDate(raw)
  if (!parsed) {
    throw new Error(`[${fileLabel}] Invalid required date '${key}'='${raw}' at data row ${rowIndex}`)
  }
  return parsed
}

function parseOpenStatus(raw: string): string {
  const normalized = cleanCell(raw).toLowerCase()
  if (!normalized) return 'CLOSED'
  if (normalized === 'no' || normalized === 'closed' || normalized === 'n' || normalized === 'false' || normalized === '0') {
    return 'CLOSED'
  }
  return 'OPEN'
}

function toDateOnlyString(date: Date | string): string {
  if (typeof date === 'string') {
    return date.slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

async function getExactCount(tableName: string): Promise<number> {
  const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
  if (error) {
    throw new Error(`[${tableName}] Count failed: ${error.message}`)
  }
  return count ?? 0
}

async function getSeededTableCounts(): Promise<TableCounts> {
  const [
    uom,
    ingredientCategory,
    menuSection,
    storageLocation,
    prepStation,
    ingredient,
    menuItem,
    menuItemRecipe,
    payrollRole,
    dailySummary,
    dailyItemSale,
    ingredientDailyUsage,
    inventoryDailyStatus,
    inventoryAlert,
    inventoryAlertAction,
    purchaseOrder,
    diningTable,
  ] = await Promise.all([
    getExactCount('Uom'),
    getExactCount('IngredientCategory'),
    getExactCount('MenuSection'),
    getExactCount('StorageLocation'),
    getExactCount('PrepStation'),
    getExactCount('Ingredient'),
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
  ])

  return {
    Uom: uom,
    IngredientCategory: ingredientCategory,
    MenuSection: menuSection,
    StorageLocation: storageLocation,
    PrepStation: prepStation,
    Ingredient: ingredient,
    MenuItem: menuItem,
    MenuItemRecipe: menuItemRecipe,
    PayrollRole: payrollRole,
    DailySummary: dailySummary,
    DailyItemSale: dailyItemSale,
    IngredientDailyUsage: ingredientDailyUsage,
    InventoryDailyStatus: inventoryDailyStatus,
    InventoryAlert: inventoryAlert,
    InventoryAlertAction: inventoryAlertAction,
    PurchaseOrder: purchaseOrder,
    DiningTable: diningTable,
  }
}

async function main(): Promise<void> {
  console.log('Starting Crimson Palace database seed...')

  // --- Parse all CSVs upfront ---
  const menuRows = parseMenuCsvRows(MENUS_CSV)

  const inventorySettingsHeaders = readHeaderAtRow(INVENTORY_SETTINGS_CSV, 0)
  validateHeaders(inventorySettingsHeaders, CSV_HEADERS.inventorySettings, 'inventorySettings')
  const inventorySettingsRows = readCsv(INVENTORY_SETTINGS_CSV)

  const recipeHeaders = readHeaderAtRow(RECIPE_CSV, 0)
  validateHeaders(recipeHeaders, CSV_HEADERS.recipeAssumptions, 'recipeAssumptions')
  const recipeRows = readCsv(RECIPE_CSV)

  const payrollHeaders = readHeaderAtRow(PAYROLL_CSV, 0)
  validateHeaders(payrollHeaders, CSV_HEADERS.payrollRoster, 'payrollRoster')
  const payrollRows = readCsv(PAYROLL_CSV)

  const dailySummaryHeaders = readHeaderAtRow(DAILY_SUMMARY_CSV, 0)
  validateHeaders(dailySummaryHeaders, CSV_HEADERS.dailySummary, 'dailySummary')
  const dailySummaryRows = readCsv(DAILY_SUMMARY_CSV)

  const dailyItemSalesRows = readCsv(DAILY_ITEM_SALES_CSV)

  const ingredientUsageHeaders = readHeaderAtRow(INGREDIENT_USAGE_CSV, 0)
  validateHeaders(ingredientUsageHeaders, CSV_HEADERS.ingredientDailyUsage, 'ingredientDailyUsage')
  const ingredientUsageRows = readCsv(INGREDIENT_USAGE_CSV)

  const inventoryStatusHeaders = readHeaderAtRow(INVENTORY_STATUS_CSV, 0)
  validateHeaders(inventoryStatusHeaders, CSV_HEADERS.inventoryDailyStatus, 'inventoryDailyStatus')
  const inventoryStatusRows = readCsv(INVENTORY_STATUS_CSV)

  const inventoryAlertHeaders = readHeaderAtRow(INVENTORY_ALERT_CSV, 0)
  validateHeaders(inventoryAlertHeaders, CSV_HEADERS.inventoryAlert, 'inventoryAlert')
  const inventoryAlertRows = readCsv(INVENTORY_ALERT_CSV)

  const purchaseOrderHeaders = readHeaderAtRow(PURCHASE_ORDERS_CSV, 0)
  validateHeaders(purchaseOrderHeaders, CSV_HEADERS.purchaseOrders, 'purchaseOrders')
  const purchaseOrderRows = readCsv(PURCHASE_ORDERS_CSV)

  const preCounts = await getSeededTableCounts()
  let writeCount = 0

  // ─── STEP 1: UOM ───────────────────────────────────────────────────────────
  console.log('[1/16] Seeding UOM...')
  const uomSet = new Set<string>()
  for (const rows of [inventorySettingsRows, recipeRows, ingredientUsageRows, inventoryStatusRows, purchaseOrderRows]) {
    for (const row of rows) {
      const c = normalizeUom(row.UOM)
      if (c) uomSet.add(c)
    }
  }
  for (const row of menuRows) {
    const c = normalizeUom(row['Unit Sold'])
    if (c) uomSet.add(c)
  }
  const uomData = Array.from(uomSet).sort().map((code) => ({ code, name: code }))
  const { data: r1, error: r1Error } = await supabase.from('Uom').upsert(uomData, { onConflict: 'code' })
  if (r1Error) throw new Error(`[Uom] Insert failed: ${r1Error.message}`)
  writeCount += uomData.length

  // ─── STEP 2: IngredientCategory ────────────────────────────────────────────
  console.log('[2/16] Seeding IngredientCategory...')
  const ingredientCategorySet = new Set<string>()
  for (const row of inventorySettingsRows) {
    const c = cleanCell(row.Category)
    if (c) ingredientCategorySet.add(c)
  }
  const ingredientCategoryData = Array.from(ingredientCategorySet).sort().map((name) => ({ name }))
  const { data: r2, error: r2Error } = await supabase.from('IngredientCategory').upsert(ingredientCategoryData, { onConflict: 'name' })
  if (r2Error) throw new Error(`[IngredientCategory] Insert failed: ${r2Error.message}`)
  writeCount += ingredientCategoryData.length

  // ─── STEP 3–5: MenuSection, StorageLocation, PrepStation ───────────────────
  console.log('[3/16] Seeding MenuSection / StorageLocation / PrepStation...')
  const menuSectionSet = new Set<string>()
  const storageLocationSet = new Set<string>()
  const prepStationSet = new Set<string>()

  const validMenuRows = menuRows.filter((row) => {
    const itemId = cleanCell(row['Item ID'])
    return itemId && !itemId.toLowerCase().startsWith('virtual')
  })

  for (const row of validMenuRows) {
    const section = cleanCell(row['Section'])
    if (!section) throw new Error(`[menu] Required field 'Section' is empty for item ${cleanCell(row['Item ID'])}`)
    menuSectionSet.add(section)
    const storage = cleanCell(row['Storage'])
    if (storage) storageLocationSet.add(storage)
    const prep = cleanCell(row['Prep Station'])
    if (prep) prepStationSet.add(prep)
  }

  const menuSectionData = Array.from(menuSectionSet).sort().map((name) => ({ name }))
  const storageLocationData = Array.from(storageLocationSet).sort().map((name) => ({ name }))
  const prepStationData = Array.from(prepStationSet).sort().map((name) => ({ name }))

  const [r3, r4, r5] = await Promise.all([
    supabase.from('MenuSection').upsert(menuSectionData, { onConflict: 'name' }),
    supabase.from('StorageLocation').upsert(storageLocationData, { onConflict: 'name' }),
    supabase.from('PrepStation').upsert(prepStationData, { onConflict: 'name' }),
  ])
  if (r3.error) throw new Error(`[MenuSection] Insert failed: ${r3.error.message}`)
  if (r4.error) throw new Error(`[StorageLocation] Insert failed: ${r4.error.message}`)
  if (r5.error) throw new Error(`[PrepStation] Insert failed: ${r5.error.message}`)
  writeCount += menuSectionData.length + storageLocationData.length + prepStationData.length

  // ─── STEP 6: Ingredient ────────────────────────────────────────────────────
  console.log('[6/16] Seeding Ingredient...')
  const { data: categoryRows, error: categoryError } = await supabase.from('IngredientCategory').select('id, name')
  if (categoryError) throw new Error(`[IngredientCategory] Select failed: ${categoryError.message}`)
  const categoryMap = new Map((categoryRows ?? []).map((entry) => [entry.name as string, entry.id as number]))

  const ingredientData: Array<{
    id: string
    categoryId: number
    uomCode: string
    avgDailyUsage: number
    leadTimeDays: number
    safetyStockDays: number
    reorderPoint: number
    targetStockDays: number
    targetStockQty: number
    shelfLifeDays: number
    expiryWarnDays: number
    supplierRiskNote: string | null
  }> = []
  for (let i = 0; i < inventorySettingsRows.length; i++) {
    const row = inventorySettingsRows[i]
    const ingredientId = requireString(row, 'Ingredient', 'inventorySettings', i + 2)
    const categoryId = categoryMap.get(requireString(row, 'Category', 'inventorySettings', i + 2))
    if (!categoryId) throw new Error(`[inventorySettings] Category not found for '${ingredientId}'`)
    const uomCode = normalizeUom(requireString(row, 'UOM', 'inventorySettings', i + 2))
    ingredientData.push({
      id: ingredientId,
      categoryId,
      uomCode,
      avgDailyUsage: parseDecimal(row.Avg_Daily_Usage),
      leadTimeDays: parseInt2(row.Lead_Time_Days),
      safetyStockDays: parseInt2(row.Safety_Stock_Days),
      reorderPoint: parseDecimal(row.Reorder_Point),
      targetStockDays: parseInt2(row.Target_Stock_Days),
      targetStockQty: parseDecimal(row.Target_Stock_Qty),
      shelfLifeDays: parseInt2(row.Shelf_Life_Days),
      expiryWarnDays: parseInt2(row.Expiry_Warn_Days),
      supplierRiskNote: cleanCell(row.Local_Supplier_Risk_Note) || null,
    })
  }
  const { data: r6, error: r6Error } = await supabase.from('Ingredient').upsert(ingredientData, { onConflict: 'id' })
  if (r6Error) throw new Error(`[Ingredient] Insert failed: ${r6Error.message}`)
  writeCount += ingredientData.length

  // ─── STEP 7: MenuItem ──────────────────────────────────────────────────────
  console.log('[7/16] Seeding MenuItem...')
  const [sectionRowsResult, storageRowsResult, prepRowsResult] = await Promise.all([
    supabase.from('MenuSection').select('id, name'),
    supabase.from('StorageLocation').select('id, name'),
    supabase.from('PrepStation').select('id, name'),
  ])
  if (sectionRowsResult.error) throw new Error(`[MenuSection] Select failed: ${sectionRowsResult.error.message}`)
  if (storageRowsResult.error) throw new Error(`[StorageLocation] Select failed: ${storageRowsResult.error.message}`)
  if (prepRowsResult.error) throw new Error(`[PrepStation] Select failed: ${prepRowsResult.error.message}`)

  const sectionMap = new Map((sectionRowsResult.data ?? []).map((entry) => [entry.name as string, entry.id as number]))
  const storageMap = new Map((storageRowsResult.data ?? []).map((entry) => [entry.name as string, entry.id as number]))
  const prepStationMap = new Map((prepRowsResult.data ?? []).map((entry) => [entry.name as string, entry.id as number]))

  const menuItemData: Array<{
    id: string
    menuCode: string
    name: string
    menuType: 'FOOD' | 'DRINK'
    sectionId: number
    unitSold: string
    portionSize: string | null
    salesPriceMmk: number
    supplierCostMmk: number
    targetCostPct: number | null
    highValue: boolean
    highTheftRisk: boolean
    expiryTracking: boolean
    storageLocationId: number | null
    prepStationId: number | null
    leadTimeDays: number | null
    notes: string | null
    sourceUrl: string | null
    isActive: boolean
  }> = []
  for (let i = 0; i < validMenuRows.length; i++) {
    const row = validMenuRows[i]
    const itemId = requireString(row, 'Item ID', 'menu', i + 4)
    const sectionName = requireString(row, 'Section', 'menu', i + 4)
    const sectionId = sectionMap.get(sectionName)
    if (!sectionId) throw new Error(`[menu] Section '${sectionName}' not found for '${itemId}'`)
    const menuTypeRaw = requireString(row, 'Menu Type', 'menu', i + 4).toLowerCase()
    const menuType = menuTypeRaw === 'food' ? 'FOOD' : menuTypeRaw === 'drink' ? 'DRINK' : null
    if (!menuType) throw new Error(`[menu] Invalid Menu Type '${row['Menu Type']}' for '${itemId}'`)
    const storageName = cleanCell(row['Storage'])
    const prepName = cleanCell(row['Prep Station'])
    menuItemData.push({
      id: itemId,
      menuCode: requireString(row, 'Menu Code', 'menu', i + 4),
      name: requireString(row, 'Item Name', 'menu', i + 4),
      menuType,
      sectionId,
      unitSold: requireString(row, 'Unit Sold', 'menu', i + 4),
      portionSize: cleanCell(row['Portion / Size']) || null,
      salesPriceMmk: parseMMK(row['Sales Price (MMK)']),
      supplierCostMmk: parseMMK(row['Supplier Cost (MMK)']),
      targetCostPct: cleanCell(row['Target Cost %']) ? parsePct(row['Target Cost %']) : null,
      highValue: parseBool(row['High Value?'] ?? ''),
      highTheftRisk: parseBool(row['High Theft Risk?'] ?? ''),
      expiryTracking: parseBool(row['Expiry Tracking?'] ?? ''),
      storageLocationId: storageName ? storageMap.get(storageName) ?? null : null,
      prepStationId: prepName ? prepStationMap.get(prepName) ?? null : null,
      leadTimeDays: cleanCell(row['Lead Time (days)']) ? parseInt2(row['Lead Time (days)']) : null,
      notes: cleanCell(row['Notes']) || null,
      sourceUrl: cleanCell(row['Source URL']) || null,
      isActive: true,
    })
  }
  const { data: r7, error: r7Error } = await supabase.from('MenuItem').upsert(menuItemData, { onConflict: 'id' })
  if (r7Error) throw new Error(`[MenuItem] Insert failed: ${r7Error.message}`)
  writeCount += menuItemData.length

  // ─── STEP 8: MenuItemRecipe ────────────────────────────────────────────────
  console.log('[8/16] Seeding MenuItemRecipe...')
  const ingredientIds = new Set(ingredientData.map((item) => item.id))
  const menuItemIds = new Set(menuItemData.map((item) => item.id))

  const recipeData: Array<{
    menuItemId: string
    ingredientId: string
    qtyPerUnit: number
    uomCode: string
    recipeNote: string | null
  }> = []
  for (let i = 0; i < recipeRows.length; i++) {
    const row = recipeRows[i]
    const menuItemId = requireString(row, 'Item ID', 'recipeAssumptions', i + 2)
    const ingredientId = requireString(row, 'Ingredient', 'recipeAssumptions', i + 2)
    const uomCode = normalizeUom(requireString(row, 'UOM', 'recipeAssumptions', i + 2))
    if (!menuItemIds.has(menuItemId)) throw new Error(`[recipeAssumptions] MenuItem '${menuItemId}' not found.`)
    if (!ingredientIds.has(ingredientId)) throw new Error(`[recipeAssumptions] Ingredient '${ingredientId}' not found.`)
    recipeData.push({
      menuItemId,
      ingredientId,
      uomCode,
      qtyPerUnit: parseDecimal(row.Qty_per_Unit),
      recipeNote: cleanCell(row.Recipe_Note) || null,
    })
  }
  const { data: r8, error: r8Error } = await supabase.from('MenuItemRecipe').upsert(recipeData, { onConflict: 'menuItemId,ingredientId' })
  if (r8Error) throw new Error(`[MenuItemRecipe] Insert failed: ${r8Error.message}`)
  writeCount += recipeData.length

  // ─── STEP 9: PayrollRole ───────────────────────────────────────────────────
  console.log('[9/16] Seeding PayrollRole...')
  const payrollData: Array<{
    role: string
    headcount: number
    monthlySalaryPerPersonMmk: number
    monthlyTotalMmk: number
  }> = []
  for (let i = 0; i < payrollRows.length; i++) {
    const row = payrollRows[i]
    const role = cleanCell(row.Role)
    if (!role || role.toUpperCase() === 'TOTAL') continue
    payrollData.push({
      role,
      headcount: parseInt2(row.Headcount),
      monthlySalaryPerPersonMmk: parseMMK(row['Monthly Salary per Person (MMK)']),
      monthlyTotalMmk: parseMMK(row['Monthly Total (MMK)']),
    })
  }
  const { data: r9, error: r9Error } = await supabase.from('PayrollRole').upsert(payrollData, { onConflict: 'role' })
  if (r9Error) throw new Error(`[PayrollRole] Insert failed: ${r9Error.message}`)
  writeCount += payrollData.length

  // ─── STEP 10: DailySummary ─────────────────────────────────────────────────
  console.log('[10/16] Seeding DailySummary...')
  const dailySummaryData: Array<{
    businessDate: string
    dayName: string
    openStatus: string
    covers: number | null
    netSalesMmk: number
    cogsMmk: number
    grossProfitMmk: number
    rentMmk: number
    waitersSalariesMmk: number
    chefsSalariesMmk: number
    otherStaffSalariesMmk: number
    electricityGridMmk: number
    generatorFuelMmk: number
    marketingSocialMmk: number
    maintenanceSanitationMmk: number
    consumablesMmk: number
    fixedOpexTotalMmk: number
    cardFeesMmk: number
    bankChargesMmk: number
    totalOpexMmk: number
    operatingProfitMmk: number
    notes: string | null
  }> = []
  for (let i = 0; i < dailySummaryRows.length; i++) {
    const row = dailySummaryRows[i]
    if (!cleanCell(row['Date'])) continue
    const businessDate = requireDateValue(requireString(row, 'Date', 'dailySummary', i + 2), 'dailySummary', i + 2, 'Date')
    dailySummaryData.push({
      businessDate: toDateOnlyString(businessDate),
      dayName: requireString(row, 'Day', 'dailySummary', i + 2),
      openStatus: parseOpenStatus(row['Open?']),
      covers: cleanCell(row['Covers']) ? parseInt2(row['Covers']) : null,
      netSalesMmk: parseMMK(row['Net Sales (MMK)']),
      cogsMmk: parseMMK(row['COGS (MMK)']),
      grossProfitMmk: parseMMK(row['Gross Profit (MMK)']),
      rentMmk: parseMMK(row['Rent']),
      waitersSalariesMmk: parseMMK(row['Waiters Salaries (5p)']),
      chefsSalariesMmk: parseMMK(row['Chefs Salaries (2p)']),
      otherStaffSalariesMmk: parseMMK(row['Other Staff Salaries (7p)']),
      electricityGridMmk: parseMMK(row['Electricity (Grid)']),
      generatorFuelMmk: parseMMK(row['Generator Fuel (Diesel)']),
      marketingSocialMmk: parseMMK(row['Marketing & Social']),
      maintenanceSanitationMmk: parseMMK(row['Maintenance & Sanitation']),
      consumablesMmk: parseMMK(row['Consumables']),
      fixedOpexTotalMmk: parseMMK(row['Fixed Opex Total']),
      cardFeesMmk: parseMMK(row['Card Fees']),
      bankChargesMmk: parseMMK(row['Bank Charges']),
      totalOpexMmk: parseMMK(row['Total Opex']),
      operatingProfitMmk: parseMMK(row['Operating Profit']),
      notes: cleanCell(row['Notes']) || null,
    })
  }
  const { data: r10, error: r10Error } = await supabase.from('DailySummary').upsert(dailySummaryData, { onConflict: 'businessDate' })
  if (r10Error) throw new Error(`[DailySummary] Insert failed: ${r10Error.message}`)
  writeCount += dailySummaryData.length

  // ─── STEP 11: IngredientDailyUsage ────────────────────────────────────────
  console.log('[11/16] Seeding IngredientDailyUsage...')
  const ingredientUsageData: Array<{
    businessDate: string
    ingredientId: string
    uomCode: string
    totalQty: number
  }> = []
  for (let i = 0; i < ingredientUsageRows.length; i++) {
    const row = ingredientUsageRows[i]
    if (!cleanCell(row['Date'])) continue
    const ingredientId = requireString(row, 'Ingredient', 'ingredientDailyUsage', i + 2)
    if (!ingredientIds.has(ingredientId)) throw new Error(`[ingredientDailyUsage] Ingredient '${ingredientId}' not found.`)
    const uomCode = normalizeUom(requireString(row, 'UOM', 'ingredientDailyUsage', i + 2))
    ingredientUsageData.push({
      businessDate: toDateOnlyString(requireDateValue(requireString(row, 'Date', 'ingredientDailyUsage', i + 2), 'ingredientDailyUsage', i + 2, 'Date')),
      ingredientId,
      uomCode,
      totalQty: parseDecimal(row.Total_Qty),
    })
  }
  const { data: r11, error: r11Error } = await supabase.from('IngredientDailyUsage').upsert(ingredientUsageData, { onConflict: 'businessDate,ingredientId' })
  if (r11Error) throw new Error(`[IngredientDailyUsage] Insert failed: ${r11Error.message}`)
  writeCount += ingredientUsageData.length

  // ─── STEP 12: InventoryDailyStatus ────────────────────────────────────────
  console.log('[12/16] Seeding InventoryDailyStatus...')
  const inventoryStatusData: Array<{
    businessDate: string
    ingredientId: string
    uomCode: string
    usageToday: number
    wastageToday: number
    closingOnHand: number
    onOrderQty: number
    reorderPoint: number
    reorderFlag: boolean
    earliestExpiryDate: string | null
    qtyExpiringWithinWarn: number
    expiryWarnDays: number | null
    expiryFlag: boolean
    suggestedActionRaw: string | null
  }> = []
  for (let i = 0; i < inventoryStatusRows.length; i++) {
    const row = inventoryStatusRows[i]
    if (!cleanCell(row['Date'])) continue
    const ingredientId = requireString(row, 'Ingredient', 'inventoryDailyStatus', i + 2)
    if (!ingredientIds.has(ingredientId)) throw new Error(`[inventoryDailyStatus] Ingredient '${ingredientId}' not found.`)
    const uomCode = normalizeUom(requireString(row, 'UOM', 'inventoryDailyStatus', i + 2))
    const earliestExpiryDate = parseDate(row.Earliest_Expiry_Date)
    inventoryStatusData.push({
      businessDate: toDateOnlyString(requireDateValue(requireString(row, 'Date', 'inventoryDailyStatus', i + 2), 'inventoryDailyStatus', i + 2, 'Date')),
      ingredientId,
      uomCode,
      usageToday: parseDecimal(row.Usage_Today),
      wastageToday: parseDecimal(row.Wastage_Today),
      closingOnHand: parseDecimal(row.Closing_OnHand),
      onOrderQty: parseDecimal(row.On_Order_Qty),
      reorderPoint: parseDecimal(row.Reorder_Point),
      reorderFlag: parseFlagBool(row.Reorder_Flag ?? ''),
      earliestExpiryDate: earliestExpiryDate ? toDateOnlyString(earliestExpiryDate) : null,
      qtyExpiringWithinWarn: parseDecimal(row.Qty_Expiring_Within_Warn),
      expiryWarnDays: cleanCell(row.Expiry_Warn_Days) ? parseInt2(row.Expiry_Warn_Days) : null,
      expiryFlag: parseFlagBool(row.Expiry_Flag ?? ''),
      suggestedActionRaw: cleanCell(row.Suggested_Action) || null,
    })
  }
  const { data: r12, error: r12Error } = await supabase.from('InventoryDailyStatus').upsert(inventoryStatusData, { onConflict: 'businessDate,ingredientId' })
  if (r12Error) throw new Error(`[InventoryDailyStatus] Insert failed: ${r12Error.message}`)
  writeCount += inventoryStatusData.length

  // ─── STEP 13: InventoryAlert + InventoryAlertAction ───────────────────────
  // Batch alerts first, then fetch their generated IDs, then batch actions.
  console.log('[13/16] Seeding InventoryAlert + Actions...')

  const alertInsertData: Array<{
    businessDate: string
    ingredientId: string
    closingOnHand: number
    onOrderQty: number
    reorderPoint: number
    qtyExpiringSoon: number
    earliestExpiryDate: string | null
    suggestedActionRaw: string
  }> = []
  for (let i = 0; i < inventoryAlertRows.length; i++) {
    const row = inventoryAlertRows[i]
    if (!cleanCell(row['Date'])) continue
    const ingredientId = requireString(row, 'Ingredient', 'inventoryAlert', i + 2)
    if (!ingredientIds.has(ingredientId)) throw new Error(`[inventoryAlert] Ingredient '${ingredientId}' not found.`)
    const businessDate = requireDateValue(requireString(row, 'Date', 'inventoryAlert', i + 2), 'inventoryAlert', i + 2, 'Date')
    const suggestedActionRaw = requireString(row, 'Suggested_Action', 'inventoryAlert', i + 2)
    const earliestExpiryDate = parseDate(row.Earliest_Expiry_Date)
    alertInsertData.push({
      businessDate: toDateOnlyString(businessDate),
      ingredientId,
      closingOnHand: parseDecimal(row.Closing_OnHand),
      onOrderQty: parseDecimal(row.On_Order_Qty),
      reorderPoint: parseDecimal(row.Reorder_Point),
      qtyExpiringSoon: parseDecimal(row.Qty_Expiring_Soon),
      earliestExpiryDate: earliestExpiryDate ? toDateOnlyString(earliestExpiryDate) : null,
      suggestedActionRaw,
    })
  }
  const { data: r13a, error: r13aError } = await supabase.from('InventoryAlert').upsert(alertInsertData, {
    onConflict: 'businessDate,ingredientId,suggestedActionRaw',
  })
  if (r13aError) throw new Error(`[InventoryAlert] Insert failed: ${r13aError.message}`)
  writeCount += alertInsertData.length

  // Fetch all alerts to get generated IDs
  const { data: allAlerts, error: allAlertsError } = await supabase
    .from('InventoryAlert')
    .select('id, businessDate, ingredientId, suggestedActionRaw')
  if (allAlertsError) throw new Error(`[InventoryAlert] Select failed: ${allAlertsError.message}`)

  const alertIdMap = new Map(
    (allAlerts ?? []).map((alert) => [
      `${toDateOnlyString(alert.businessDate as string)}||${alert.ingredientId as string}||${alert.suggestedActionRaw as string}`,
      alert.id as string | number,
    ])
  )

  // Batch all alert actions
  const actionInsertData: Array<{ alertId: string | number; action: string }> = []
  for (let i = 0; i < inventoryAlertRows.length; i++) {
    const row = inventoryAlertRows[i]
    if (!cleanCell(row['Date'])) continue
    const businessDate = requireDateValue(requireString(row, 'Date', 'inventoryAlert', i + 2), 'inventoryAlert', i + 2, 'Date')
    const ingredientId = requireString(row, 'Ingredient', 'inventoryAlert', i + 2)
    const suggestedActionRaw = requireString(row, 'Suggested_Action', 'inventoryAlert', i + 2)
    const alertId = alertIdMap.get(`${toDateOnlyString(businessDate)}||${ingredientId}||${suggestedActionRaw}`)
    if (!alertId) continue

    const actions = parseActions(suggestedActionRaw)
    for (const actionToken of actions) {
      const normalized = normalizeAlertAction(actionToken)
      if (!normalized) throw new Error(`[inventoryAlert] Invalid Suggested_Action token '${actionToken}' at data row ${i + 2}`)
      actionInsertData.push({ alertId, action: normalized })
    }
  }
  if (actionInsertData.length > 0) {
    const { data: r13c, error: r13cError } = await supabase.from('InventoryAlertAction').upsert(actionInsertData, {
      onConflict: 'alertId,action',
    })
    if (r13cError) throw new Error(`[InventoryAlertAction] Insert failed: ${r13cError.message}`)
    writeCount += actionInsertData.length
  }

  // ─── STEP 14: PurchaseOrder ────────────────────────────────────────────────
  console.log('[14/16] Seeding PurchaseOrder...')
  const purchaseOrderData: Array<{
    poId: string
    ingredientId: string
    uomCode: string
    orderedDate: string
    qty: number
    eta: string | null
    reason: string | null
  }> = []
  for (let i = 0; i < purchaseOrderRows.length; i++) {
    const row = purchaseOrderRows[i]
    if (!cleanCell(row['PO_ID'])) continue
    const poId = requireString(row, 'PO_ID', 'purchaseOrders', i + 2)
    const ingredientId = requireString(row, 'Ingredient', 'purchaseOrders', i + 2)
    if (!ingredientIds.has(ingredientId)) throw new Error(`[purchaseOrders] Ingredient '${ingredientId}' not found.`)
    const uomCode = normalizeUom(requireString(row, 'UOM', 'purchaseOrders', i + 2))
    const eta = parseDate(row.ETA)
    purchaseOrderData.push({
      poId,
      ingredientId,
      uomCode,
      orderedDate: toDateOnlyString(requireDateValue(requireString(row, 'Ordered_Date', 'purchaseOrders', i + 2), 'purchaseOrders', i + 2, 'Ordered_Date')),
      qty: parseDecimal(row.Qty),
      eta: eta ? toDateOnlyString(eta) : null,
      reason: cleanCell(row.Reason) || null,
    })
  }
  const { data: r14, error: r14Error } = await supabase.from('PurchaseOrder').upsert(purchaseOrderData, { onConflict: 'poId' })
  if (r14Error) throw new Error(`[PurchaseOrder] Insert failed: ${r14Error.message}`)
  writeCount += purchaseOrderData.length

  // ─── STEP 15: DiningTable ─────────────────────────────────────────────────
  console.log('[15/16] Seeding DiningTable...')
  const diningTableData = Array.from({ length: 12 }, (_, i) => {
    const id = `T${String(i + 1).padStart(2, '0')}`
    return { id, label: id, capacity: 4, qrSlug: id, isActive: true }
  })
  const { data: r15, error: r15Error } = await supabase.from('DiningTable').upsert(diningTableData, { onConflict: 'id' })
  if (r15Error) throw new Error(`[DiningTable] Insert failed: ${r15Error.message}`)
  writeCount += diningTableData.length

  // ─── STEP 16: DailyItemSale ───────────────────────────────────────────────
  console.log('[16/16] Seeding DailyItemSale...')
  const dailyItemSaleData: Array<{
    businessDate: string
    menuItemId: string
    qty: number
    unitPriceMmk: number
    unitCostMmk: number
    unitGpMmk: number
    salesMmk: number
    cogsMmk: number
    grossProfitMmk: number
    unitCostPct: number | null
  }> = []
  for (let i = 0; i < dailyItemSalesRows.length; i++) {
    const row = dailyItemSalesRows[i]
    if (!cleanCell(row['Date'])) continue
    if (cleanCell(row['Open?']) !== 'Open') continue

    const menuItemId = requireString(row, 'Item ID', 'dailyItemSales', i + 2)
    if (!menuItemIds.has(menuItemId)) throw new Error(`[dailyItemSales] MenuItem '${menuItemId}' not found.`)

    const unitCostPctRaw = cleanCell(row['Unit Cost %'])
    const unitCostPct = unitCostPctRaw ? parseDecimal(unitCostPctRaw.replace('%', '')) : null

    dailyItemSaleData.push({
      businessDate: toDateOnlyString(requireDateValue(requireString(row, 'Date', 'dailyItemSales', i + 2), 'dailyItemSales', i + 2, 'Date')),
      menuItemId,
      qty: parseDecimal(row['Qty']),
      unitPriceMmk: parseMMK(row['Unit Price (MMK)']),
      unitCostMmk: parseMMK(row['Unit Cost (MMK)']),
      unitGpMmk: parseMMK(row['Unit GP (MMK)']),
      salesMmk: parseMMK(row['Sales (MMK)']),
      cogsMmk: parseMMK(row['COGS (MMK)']),
      grossProfitMmk: parseMMK(row['Gross Profit (MMK)']),
      unitCostPct,
    })
  }
  const { data: r16, error: r16Error } = await supabase.from('DailyItemSale').upsert(dailyItemSaleData, {
    onConflict: 'businessDate,menuItemId',
  })
  if (r16Error) throw new Error(`[DailyItemSale] Insert failed: ${r16Error.message}`)
  writeCount += dailyItemSaleData.length

  // ─── Post-seed reporting ───────────────────────────────────────────────────
  const postCounts = await getSeededTableCounts()

  console.log('\nTable counts after seed:')
  for (const table of SEEDED_TABLES) {
    console.log(`- ${table}: ${postCounts[table]}`)
  }

  const [
    dailySummaryMinResult,
    dailySummaryMaxResult,
    recipeRowsAllResult,
    usageRowsAllResult,
    menuItemIdRowsResult,
    ingredientIdRowsResult,
  ] = await Promise.all([
    supabase.from('DailySummary').select('businessDate').order('businessDate', { ascending: true }).limit(1).maybeSingle(),
    supabase.from('DailySummary').select('businessDate').order('businessDate', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('MenuItemRecipe').select('menuItemId, ingredientId'),
    supabase.from('IngredientDailyUsage').select('ingredientId'),
    supabase.from('MenuItem').select('id'),
    supabase.from('Ingredient').select('id'),
  ])

  if (dailySummaryMinResult.error) throw new Error(`[DailySummary] Range min failed: ${dailySummaryMinResult.error.message}`)
  if (dailySummaryMaxResult.error) throw new Error(`[DailySummary] Range max failed: ${dailySummaryMaxResult.error.message}`)
  if (recipeRowsAllResult.error) throw new Error(`[MenuItemRecipe] Select failed: ${recipeRowsAllResult.error.message}`)
  if (usageRowsAllResult.error) throw new Error(`[IngredientDailyUsage] Select failed: ${usageRowsAllResult.error.message}`)
  if (menuItemIdRowsResult.error) throw new Error(`[MenuItem] Select failed: ${menuItemIdRowsResult.error.message}`)
  if (ingredientIdRowsResult.error) throw new Error(`[Ingredient] Select failed: ${ingredientIdRowsResult.error.message}`)

  const recipeRowsAll = recipeRowsAllResult.data ?? []
  const usageRowsAll = usageRowsAllResult.data ?? []
  const menuItemIdRows = menuItemIdRowsResult.data ?? []
  const ingredientIdRows = ingredientIdRowsResult.data ?? []

  const menuItemIdSet = new Set(menuItemIdRows.map((item) => item.id as string))
  const ingredientIdSet = new Set(ingredientIdRows.map((item) => item.id as string))
  const anomalies: string[] = []

  const recipeOrphanCount = recipeRowsAll.filter(
    (entry) => !menuItemIdSet.has(entry.menuItemId as string) || !ingredientIdSet.has(entry.ingredientId as string)
  ).length
  if (recipeOrphanCount > 0) anomalies.push(`Orphan MenuItemRecipe rows: ${recipeOrphanCount}`)

  const usageOrphanCount = usageRowsAll.filter((entry) => !ingredientIdSet.has(entry.ingredientId as string)).length
  if (usageOrphanCount > 0) anomalies.push(`Orphan IngredientDailyUsage rows: ${usageOrphanCount}`)

  if (anomalies.length > 0) {
    console.log('\nAnomalies detected:')
    anomalies.forEach((anomaly) => console.log(`- ${anomaly}`))
  } else {
    console.log('\nAnomalies detected: none')
  }

  const dateMin = dailySummaryMinResult.data?.businessDate ? toDateOnlyString(dailySummaryMinResult.data.businessDate as string) : 'N/A'
  const dateMax = dailySummaryMaxResult.data?.businessDate ? toDateOnlyString(dailySummaryMaxResult.data.businessDate as string) : 'N/A'

  const totalInserted = SEEDED_TABLES.reduce((sum, table) => {
    return sum + Math.max(0, (postCounts[table] ?? 0) - (preCounts[table] ?? 0))
  }, 0)
  const tablesInserted = SEEDED_TABLES.filter(
    (table) => (postCounts[table] ?? 0) > (preCounts[table] ?? 0)
  ).length

  console.log('\nSeed completed successfully.')
  console.log(`✔ Tables inserted: ${tablesInserted}`)
  console.log(`✔ Total records inserted: ${totalInserted}`)
  console.log(`✔ Date range detected: ${dateMin} → ${dateMax}`)
  console.log(`ℹ Write operations executed: ${writeCount}`)
}

main().catch((error) => {
  console.error('Seed failed with error:')
  console.error(error)
  process.exitCode = 1
})
