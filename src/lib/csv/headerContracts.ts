/**
 * Expected header sets for each CSV file.
 * Used for strict validation before seeding.
 */
export const CSV_HEADERS: Record<string, string[]> = {
  menu: [
    'Item ID', 'Menu Code', 'Item Name', 'Menu Type', 'Section',
    'Unit Sold', 'Portion / Size', 'Sales Price (MMK)', 'Supplier Cost (MMK)',
    'Cost % (Calc)', 'Target Cost %', 'Cost Var vs Target', 'Gross Profit (MMK)',
    'Gross Margin % (Calc)', 'High Value?', 'High Theft Risk?', 'Expiry Tracking?',
    'Storage', 'Prep Station', 'Lead Time (days)', 'Notes', 'Source URL',
  ],
  inventorySettings: [
    'Ingredient', 'Category', 'UOM', 'Avg_Daily_Usage', 'Lead_Time_Days',
    'Safety_Stock_Days', 'Reorder_Point', 'Target_Stock_Days', 'Target_Stock_Qty',
    'Shelf_Life_Days', 'Expiry_Warn_Days', 'Local_Supplier_Risk_Note',
  ],
  ingredientDailyUsage: ['Date', 'Ingredient', 'UOM', 'Total_Qty'],
  inventoryDailyStatus: [
    'Date', 'Ingredient', 'UOM', 'Usage_Today', 'Wastage_Today',
    'Closing_OnHand', 'On_Order_Qty', 'Reorder_Point', 'Reorder_Flag',
    'Earliest_Expiry_Date', 'Qty_Expiring_Within_Warn', 'Expiry_Warn_Days',
    'Expiry_Flag', 'Suggested_Action',
  ],
  inventoryAlert: [
    'Date', 'Ingredient', 'Closing_OnHand', 'On_Order_Qty', 'Reorder_Point',
    'Qty_Expiring_Soon', 'Earliest_Expiry_Date', 'Suggested_Action',
  ],
  purchaseOrders: ['PO_ID', 'Ordered_Date', 'Ingredient', 'Qty', 'UOM', 'ETA', 'Reason'],
  recipeAssumptions: [
    'Item ID', 'Item Name', 'Section', 'Ingredient', 'Qty_per_Unit', 'UOM', 'Recipe_Note',
  ],
  payrollRoster: [
    'Role', 'Headcount', 'Monthly Salary per Person (MMK)', 'Monthly Total (MMK)',
  ],
  dailySummary: [
    'Date', 'Day', 'Open?', 'Open Hours', 'Customers/hr', 'Hours Open', 'Covers',
    'Net Sales (MMK)', 'COGS (MMK)', 'Gross Profit (MMK)',
    'Rent', 'Waiters Salaries (5p)', 'Chefs Salaries (2p)', 'Other Staff Salaries (7p)',
    'Electricity (Grid)', 'Generator Fuel (Diesel)', 'Marketing & Social',
    'Maintenance & Sanitation', 'Consumables', 'Fixed Opex Total',
    'Card Fees', 'Bank Charges', 'Total Opex', 'Operating Profit', 'Notes',
  ],
}

/**
 * Validate that a CSV row has all expected headers.
 * Throws with details if validation fails.
 */
export function validateHeaders(
  actual: string[],
  expected: string[],
  fileLabel: string
): void {
  const missing = expected.filter(h => !actual.includes(h))
  if (missing.length > 0) {
    throw new Error(
      `[${fileLabel}] Missing expected headers: ${missing.join(', ')}`
    )
  }
}