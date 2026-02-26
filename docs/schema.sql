-- ============================================================
-- Crimson Palace WebOS — Database Schema
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- Enums
CREATE TYPE "MenuType" AS ENUM ('FOOD', 'DRINK');
CREATE TYPE "OpenStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "AlertAction" AS ENUM ('REORDER', 'SPOILAGE_WRITE_OFF', 'USE_FAST', 'DISCOUNT');
CREATE TYPE "OrderSource" AS ENUM ('QR', 'POS');
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELLED', 'CLOSED');

-- Dimension tables
CREATE TABLE IF NOT EXISTS "Uom" (
  "code" VARCHAR(20) PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS "IngredientCategory" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "MenuSection" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "StorageLocation" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "PrepStation" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(60) NOT NULL UNIQUE
);

-- Master tables
CREATE TABLE IF NOT EXISTS "Ingredient" (
  "id" VARCHAR(80) PRIMARY KEY,
  "categoryId" INTEGER NOT NULL REFERENCES "IngredientCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "avgDailyUsage" DECIMAL(14,4) NOT NULL,
  "leadTimeDays" INTEGER NOT NULL,
  "safetyStockDays" INTEGER NOT NULL,
  "reorderPoint" DECIMAL(14,4) NOT NULL,
  "targetStockDays" INTEGER NOT NULL,
  "targetStockQty" DECIMAL(14,4) NOT NULL,
  "shelfLifeDays" INTEGER NOT NULL,
  "expiryWarnDays" INTEGER NOT NULL,
  "supplierRiskNote" TEXT
);
CREATE INDEX IF NOT EXISTS "Ingredient_categoryId_idx" ON "Ingredient"("categoryId");
CREATE INDEX IF NOT EXISTS "Ingredient_uomCode_idx" ON "Ingredient"("uomCode");

CREATE TABLE IF NOT EXISTS "MenuItem" (
  "id" VARCHAR(10) PRIMARY KEY,
  "menuCode" VARCHAR(20) NOT NULL UNIQUE,
  "name" VARCHAR(255) NOT NULL,
  "menuType" "MenuType" NOT NULL,
  "sectionId" INTEGER NOT NULL REFERENCES "MenuSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "unitSold" VARCHAR(40) NOT NULL,
  "portionSize" VARCHAR(80),
  "salesPriceMmk" DECIMAL(14,2) NOT NULL,
  "supplierCostMmk" DECIMAL(14,2) NOT NULL,
  "targetCostPct" DECIMAL(6,3),
  "highValue" BOOLEAN NOT NULL DEFAULT false,
  "highTheftRisk" BOOLEAN NOT NULL DEFAULT false,
  "expiryTracking" BOOLEAN NOT NULL DEFAULT false,
  "storageLocationId" INTEGER REFERENCES "StorageLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "prepStationId" INTEGER REFERENCES "PrepStation"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "leadTimeDays" INTEGER,
  "notes" TEXT,
  "sourceUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "MenuItem_menuType_idx" ON "MenuItem"("menuType");
CREATE INDEX IF NOT EXISTS "MenuItem_sectionId_idx" ON "MenuItem"("sectionId");

CREATE TABLE IF NOT EXISTS "MenuItemRecipe" (
  "menuItemId" VARCHAR(10) NOT NULL REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qtyPerUnit" DECIMAL(14,4) NOT NULL,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "recipeNote" TEXT,
  PRIMARY KEY ("menuItemId", "ingredientId")
);
CREATE INDEX IF NOT EXISTS "MenuItemRecipe_ingredientId_idx" ON "MenuItemRecipe"("ingredientId");

CREATE TABLE IF NOT EXISTS "PayrollRole" (
  "role" VARCHAR(80) PRIMARY KEY,
  "headcount" INTEGER NOT NULL,
  "monthlySalaryPerPersonMmk" DECIMAL(14,2) NOT NULL,
  "monthlyTotalMmk" DECIMAL(14,2) NOT NULL
);

-- Financial tables
CREATE TABLE IF NOT EXISTS "DailySummary" (
  "businessDate" DATE PRIMARY KEY,
  "dayName" VARCHAR(20) NOT NULL,
  "openStatus" "OpenStatus" NOT NULL,
  "covers" INTEGER,
  "netSalesMmk" DECIMAL(14,2) NOT NULL,
  "cogsMmk" DECIMAL(14,2) NOT NULL,
  "grossProfitMmk" DECIMAL(14,2) NOT NULL,
  "rentMmk" DECIMAL(14,2) NOT NULL,
  "waitersSalariesMmk" DECIMAL(14,2) NOT NULL,
  "chefsSalariesMmk" DECIMAL(14,2) NOT NULL,
  "otherStaffSalariesMmk" DECIMAL(14,2) NOT NULL,
  "electricityGridMmk" DECIMAL(14,2) NOT NULL,
  "generatorFuelMmk" DECIMAL(14,2) NOT NULL,
  "marketingSocialMmk" DECIMAL(14,2) NOT NULL,
  "maintenanceSanitationMmk" DECIMAL(14,2) NOT NULL,
  "consumablesMmk" DECIMAL(14,2) NOT NULL,
  "fixedOpexTotalMmk" DECIMAL(14,2) NOT NULL,
  "cardFeesMmk" DECIMAL(14,2) NOT NULL,
  "bankChargesMmk" DECIMAL(14,2) NOT NULL,
  "totalOpexMmk" DECIMAL(14,2) NOT NULL,
  "operatingProfitMmk" DECIMAL(14,2) NOT NULL,
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "DailySummary_openStatus_idx" ON "DailySummary"("openStatus");

CREATE TABLE IF NOT EXISTS "DailyItemSale" (
  "id" BIGSERIAL PRIMARY KEY,
  "businessDate" DATE NOT NULL REFERENCES "DailySummary"("businessDate") ON DELETE CASCADE ON UPDATE CASCADE,
  "menuItemId" VARCHAR(10) NOT NULL REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qty" DECIMAL(14,4) NOT NULL,
  "unitPriceMmk" DECIMAL(14,2) NOT NULL,
  "unitCostMmk" DECIMAL(14,2) NOT NULL,
  "unitGpMmk" DECIMAL(14,2) NOT NULL,
  "salesMmk" DECIMAL(14,2) NOT NULL,
  "cogsMmk" DECIMAL(14,2) NOT NULL,
  "grossProfitMmk" DECIMAL(14,2) NOT NULL,
  "unitCostPct" DECIMAL(8,4),
  UNIQUE ("businessDate", "menuItemId")
);
CREATE INDEX IF NOT EXISTS "DailyItemSale_businessDate_idx" ON "DailyItemSale"("businessDate");
CREATE INDEX IF NOT EXISTS "DailyItemSale_menuItemId_idx" ON "DailyItemSale"("menuItemId");

CREATE TABLE IF NOT EXISTS "DailyItemIngredientUsage" (
  "dailyItemSaleId" BIGINT NOT NULL REFERENCES "DailyItemSale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qtyUsed" DECIMAL(14,4) NOT NULL,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("dailyItemSaleId", "ingredientId")
);
CREATE INDEX IF NOT EXISTS "DailyItemIngredientUsage_ingredientId_idx" ON "DailyItemIngredientUsage"("ingredientId");

-- Inventory tables
CREATE TABLE IF NOT EXISTS "IngredientDailyUsage" (
  "businessDate" DATE NOT NULL,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "totalQty" DECIMAL(14,4) NOT NULL,
  PRIMARY KEY ("businessDate", "ingredientId")
);
CREATE INDEX IF NOT EXISTS "IngredientDailyUsage_businessDate_idx" ON "IngredientDailyUsage"("businessDate");

CREATE TABLE IF NOT EXISTS "InventoryDailyStatus" (
  "businessDate" DATE NOT NULL,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "usageToday" DECIMAL(14,4) NOT NULL,
  "wastageToday" DECIMAL(14,4) NOT NULL,
  "closingOnHand" DECIMAL(14,4) NOT NULL,
  "onOrderQty" DECIMAL(14,4) NOT NULL,
  "reorderPoint" DECIMAL(14,4) NOT NULL,
  "reorderFlag" BOOLEAN NOT NULL DEFAULT false,
  "earliestExpiryDate" DATE,
  "qtyExpiringWithinWarn" DECIMAL(14,4) NOT NULL,
  "expiryWarnDays" INTEGER,
  "expiryFlag" BOOLEAN NOT NULL DEFAULT false,
  "suggestedActionRaw" VARCHAR(120),
  PRIMARY KEY ("businessDate", "ingredientId")
);
CREATE INDEX IF NOT EXISTS "InventoryDailyStatus_businessDate_idx" ON "InventoryDailyStatus"("businessDate");
CREATE INDEX IF NOT EXISTS "InventoryDailyStatus_reorderFlag_idx" ON "InventoryDailyStatus"("reorderFlag");
CREATE INDEX IF NOT EXISTS "InventoryDailyStatus_expiryFlag_idx" ON "InventoryDailyStatus"("expiryFlag");

CREATE TABLE IF NOT EXISTS "InventoryAlert" (
  "id" BIGSERIAL PRIMARY KEY,
  "businessDate" DATE NOT NULL,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "closingOnHand" DECIMAL(14,4) NOT NULL,
  "onOrderQty" DECIMAL(14,4) NOT NULL,
  "reorderPoint" DECIMAL(14,4) NOT NULL,
  "qtyExpiringSoon" DECIMAL(14,4) NOT NULL,
  "earliestExpiryDate" DATE,
  "suggestedActionRaw" VARCHAR(180) NOT NULL,
  UNIQUE ("businessDate", "ingredientId", "suggestedActionRaw")
);
CREATE INDEX IF NOT EXISTS "InventoryAlert_businessDate_idx" ON "InventoryAlert"("businessDate");
CREATE INDEX IF NOT EXISTS "InventoryAlert_ingredientId_idx" ON "InventoryAlert"("ingredientId");

CREATE TABLE IF NOT EXISTS "InventoryAlertAction" (
  "alertId" BIGINT NOT NULL REFERENCES "InventoryAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "action" "AlertAction" NOT NULL,
  PRIMARY KEY ("alertId", "action")
);

CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "poId" VARCHAR(80) PRIMARY KEY,
  "orderedDate" DATE NOT NULL,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qty" DECIMAL(14,4) NOT NULL,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eta" DATE,
  "reason" VARCHAR(80)
);
CREATE INDEX IF NOT EXISTS "PurchaseOrder_orderedDate_idx" ON "PurchaseOrder"("orderedDate");
CREATE INDEX IF NOT EXISTS "PurchaseOrder_ingredientId_idx" ON "PurchaseOrder"("ingredientId");

-- Operational tables
CREATE TABLE IF NOT EXISTS "DiningTable" (
  "id" VARCHAR(20) PRIMARY KEY,
  "label" VARCHAR(40) NOT NULL UNIQUE,
  "capacity" INTEGER NOT NULL,
  "qrSlug" VARCHAR(80) NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "CustomerOrder" (
  "id" TEXT PRIMARY KEY,
  "orderNumber" VARCHAR(40) NOT NULL UNIQUE,
  "tableId" VARCHAR(20) NOT NULL REFERENCES "DiningTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "source" "OrderSource" NOT NULL,
  "status" "OrderStatus" NOT NULL,
  "orderedAt" TIMESTAMPTZ NOT NULL,
  "subtotalMmk" DECIMAL(14,2) NOT NULL,
  "serviceChargeMmk" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxMmk" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalMmk" DECIMAL(14,2) NOT NULL,
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "CustomerOrder_orderedAt_idx" ON "CustomerOrder"("orderedAt");
CREATE INDEX IF NOT EXISTS "CustomerOrder_status_idx" ON "CustomerOrder"("status");
CREATE INDEX IF NOT EXISTS "CustomerOrder_tableId_idx" ON "CustomerOrder"("tableId");

CREATE TABLE IF NOT EXISTS "CustomerOrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "menuItemId" VARCHAR(10) NOT NULL REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qty" DECIMAL(14,4) NOT NULL,
  "unitPriceMmk" DECIMAL(14,2) NOT NULL,
  "lineTotalMmk" DECIMAL(14,2) NOT NULL,
  "kitchenStatus" "OrderStatus" NOT NULL DEFAULT 'SENT_TO_KITCHEN',
  "sentToKitchenAt" TIMESTAMPTZ,
  "readyAt" TIMESTAMPTZ,
  "servedAt" TIMESTAMPTZ,
  "notes" TEXT
);
CREATE INDEX IF NOT EXISTS "CustomerOrderItem_orderId_idx" ON "CustomerOrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "CustomerOrderItem_menuItemId_idx" ON "CustomerOrderItem"("menuItemId");
CREATE INDEX IF NOT EXISTS "CustomerOrderItem_kitchenStatus_idx" ON "CustomerOrderItem"("kitchenStatus");

-- Prisma migration tracking (required for prisma to know schema is applied)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
