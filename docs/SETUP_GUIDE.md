# Crimson Palace WebOS — Setup & Testing Guide

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

You do **not** need PostgreSQL installed locally. This guide uses **Supabase** (free cloud PostgreSQL).

---

## Part 1 — Supabase Database Setup

### Step 1: Create a Supabase account

1. Go to [https://supabase.com](https://supabase.com)
2. Click **Start your project** → Sign up with GitHub or email
3. Verify your email if required

### Step 2: Create a new project

1. Click **New project**
2. Fill in:
   - **Name**: `crimson-palace`
   - **Database Password**: create a strong password and **save it** — you'll need it
   - **Region**: choose the closest to you (e.g., Southeast Asia → Singapore)
3. Click **Create new project**
4. Wait ~2 minutes for the project to provision

### Step 3: Get your database connection string

1. In the Supabase dashboard, go to **Settings** (gear icon, bottom left)
2. Click **Database** in the left sidebar
3. Scroll down to **Connection string**
4. Select the **URI** tab
5. Copy the connection string. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. Replace `[YOUR-PASSWORD]` with the password you set in Step 2

> **Important**: Supabase also offers a "connection pooler" URL. For Prisma migrations and seeding, use the **direct connection** (port 5432), not the pooler (port 6543).

### Step 4: Run the SQL schema in Supabase

You can either use Prisma migrations (recommended, Step 5 of Part 2) **or** run the SQL manually.

To run manually in Supabase:
1. Go to **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the entire SQL below and click **Run**

```sql
-- Enums
CREATE TYPE "MenuType" AS ENUM ('FOOD', 'DRINK');
CREATE TYPE "OpenStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "AlertAction" AS ENUM ('REORDER', 'SPOILAGE_WRITE_OFF', 'USE_FAST', 'DISCOUNT');
CREATE TYPE "OrderSource" AS ENUM ('QR', 'POS');
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'SENT_TO_KITCHEN', 'IN_PREP', 'READY', 'SERVED', 'CANCELLED', 'CLOSED');

-- Dimension tables
CREATE TABLE "Uom" (
  "code" VARCHAR(20) PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL
);

CREATE TABLE "IngredientCategory" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE "MenuSection" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE "StorageLocation" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE "PrepStation" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(60) NOT NULL UNIQUE
);

-- Master tables
CREATE TABLE "Ingredient" (
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
CREATE INDEX ON "Ingredient"("categoryId");
CREATE INDEX ON "Ingredient"("uomCode");

CREATE TABLE "MenuItem" (
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
CREATE INDEX ON "MenuItem"("menuType");
CREATE INDEX ON "MenuItem"("sectionId");

CREATE TABLE "MenuItemRecipe" (
  "menuItemId" VARCHAR(10) NOT NULL REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qtyPerUnit" DECIMAL(14,4) NOT NULL,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "recipeNote" TEXT,
  PRIMARY KEY ("menuItemId", "ingredientId")
);
CREATE INDEX ON "MenuItemRecipe"("ingredientId");

CREATE TABLE "PayrollRole" (
  "role" VARCHAR(80) PRIMARY KEY,
  "headcount" INTEGER NOT NULL,
  "monthlySalaryPerPersonMmk" DECIMAL(14,2) NOT NULL,
  "monthlyTotalMmk" DECIMAL(14,2) NOT NULL
);

-- Financial fact tables
CREATE TABLE "DailySummary" (
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
CREATE INDEX ON "DailySummary"("openStatus");

CREATE TABLE "DailyItemSale" (
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
CREATE INDEX ON "DailyItemSale"("businessDate");
CREATE INDEX ON "DailyItemSale"("menuItemId");

CREATE TABLE "DailyItemIngredientUsage" (
  "dailyItemSaleId" BIGINT NOT NULL REFERENCES "DailyItemSale"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qtyUsed" DECIMAL(14,4) NOT NULL,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY ("dailyItemSaleId", "ingredientId")
);
CREATE INDEX ON "DailyItemIngredientUsage"("ingredientId");

-- Inventory fact tables
CREATE TABLE "IngredientDailyUsage" (
  "businessDate" DATE NOT NULL,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "totalQty" DECIMAL(14,4) NOT NULL,
  PRIMARY KEY ("businessDate", "ingredientId")
);
CREATE INDEX ON "IngredientDailyUsage"("businessDate");

CREATE TABLE "InventoryDailyStatus" (
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
CREATE INDEX ON "InventoryDailyStatus"("businessDate");
CREATE INDEX ON "InventoryDailyStatus"("reorderFlag");
CREATE INDEX ON "InventoryDailyStatus"("expiryFlag");

CREATE TABLE "InventoryAlert" (
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
CREATE INDEX ON "InventoryAlert"("businessDate");
CREATE INDEX ON "InventoryAlert"("ingredientId");

CREATE TABLE "InventoryAlertAction" (
  "alertId" BIGINT NOT NULL REFERENCES "InventoryAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "action" "AlertAction" NOT NULL,
  PRIMARY KEY ("alertId", "action")
);

CREATE TABLE "PurchaseOrder" (
  "poId" VARCHAR(80) PRIMARY KEY,
  "orderedDate" DATE NOT NULL,
  "ingredientId" VARCHAR(80) NOT NULL REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "qty" DECIMAL(14,4) NOT NULL,
  "uomCode" VARCHAR(20) NOT NULL REFERENCES "Uom"("code") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eta" DATE,
  "reason" VARCHAR(80)
);
CREATE INDEX ON "PurchaseOrder"("orderedDate");
CREATE INDEX ON "PurchaseOrder"("ingredientId");

-- Operational tables
CREATE TABLE "DiningTable" (
  "id" VARCHAR(20) PRIMARY KEY,
  "label" VARCHAR(40) NOT NULL UNIQUE,
  "capacity" INTEGER NOT NULL,
  "qrSlug" VARCHAR(80) NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE "CustomerOrder" (
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
CREATE INDEX ON "CustomerOrder"("orderedAt");
CREATE INDEX ON "CustomerOrder"("status");
CREATE INDEX ON "CustomerOrder"("tableId");

CREATE TABLE "CustomerOrderItem" (
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
CREATE INDEX ON "CustomerOrderItem"("orderId");
CREATE INDEX ON "CustomerOrderItem"("menuItemId");
CREATE INDEX ON "CustomerOrderItem"("kitchenStatus");

-- Prisma migration tracking table (required)
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
```

---

## Part 2 — Local Project Setup

### Step 1: Open the project

Open a terminal and navigate to the project folder:

```bash
cd "C:\Users\dant3\OneDrive\Desktop\crimson_palace"
```

### Step 2: Install dependencies

```bash
npm install
```

This installs all packages defined in `package.json` including Next.js, Prisma, Tailwind, Shadcn/UI, Recharts, and Zustand.

Expected output: `added XXX packages` with no errors.

### Step 3: Create your environment file

```bash
copy .env.example .env
```

Open `.env` in a text editor and set your values:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Replace the `DATABASE_URL` with the connection string you copied from Supabase in Part 1, Step 3.

### Step 4: Generate Prisma client

```bash
npx prisma generate
```

This generates the TypeScript client code from `prisma/schema.prisma`. Required before running the app.

Expected output: `✔ Generated Prisma Client`

### Step 5: Run database migrations

**Option A — Use Prisma migrations (recommended)**

```bash
npx prisma migrate dev --name init
```

This creates all tables in your Supabase database automatically from the Prisma schema.

Expected output:
```
Applying migration `0001_init`...
✔ Your database is now in sync with your schema.
✔ Generated Prisma Client
```

**Option B — Manual SQL (if Option A fails)**

If you already ran the SQL from Part 1 Step 4, skip this. Otherwise, go to Supabase SQL Editor and run the SQL from Part 1 Step 4 manually.

Then run:
```bash
npx prisma generate
```

### Step 6: Seed the database with CSV data

```bash
npm run db:seed
```

This reads all 9 CSV files from the project root and inserts all historical data into the database.

Expected output:
```
[SEED] Starting Crimson Palace database seed...
[STEP 1] Seeding UOM dimension...
[STEP 2] Seeding IngredientCategory dimension...
...
✔ Tables inserted: 18
✔ Total records inserted: ~15,000+
✔ Date range detected: 2026-02-01 → 2026-04-29
[SEED] Complete.
```

> This step takes 1–3 minutes depending on your internet connection to Supabase.

### Step 7: Validate the seed

```bash
npm run db:validate
```

Expected output:
```
[VALIDATE] Checking table counts...
✔ Uom: 5 rows
✔ Ingredient: 35 rows
✔ MenuItem: 50 rows
✔ DailySummary: 88 rows (2026-02-01 → 2026-04-29)
✔ IngredientDailyUsage: ~3,080 rows
✔ InventoryDailyStatus: ~3,080 rows
✔ InventoryAlert: ~685 rows
✔ PurchaseOrder: ~594 rows
✔ DiningTable: 12 rows
[VALIDATE] All checks passed.
```

If any check fails, re-run the seed: `npm run db:seed`

### Step 8: Start the development server

```bash
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in XXXms
```

Open your browser to [http://localhost:3000](http://localhost:3000)

---

## Part 3 — Testing Each Module

### Dashboard — http://localhost:3000/dashboard

**What to verify:**
- [ ] 4 KPI cards load (Total Revenue, Gross Profit, Operating Profit, Total Covers)
- [ ] Revenue trend line chart renders (Feb–Apr 2026 data)
- [ ] Cost breakdown donut chart renders with labeled categories
- [ ] Top 5 items table shows items with revenue figures
- [ ] Inventory Alerts panel shows alerts from latest available date

**If cards show 0 or "Data unavailable":** the DB seed did not complete. Re-run `npm run db:seed`.

---

### Menu Admin — http://localhost:3000/admin/menu

**What to verify:**
- [ ] Table loads 50 menu items
- [ ] Food / Drink tabs filter correctly
- [ ] Search filters by item name
- [ ] Active toggle switches item on/off
- [ ] "Add Item" button opens form dialog
- [ ] Filling form and submitting creates a new item
- [ ] Edit button pre-fills the form with existing data

---

### QR Ordering — http://localhost:3000/order/T01

**What to verify (mobile view — use browser DevTools → Toggle device toolbar):**
- [ ] Menu items grid loads for table T01
- [ ] Category tabs filter items
- [ ] Tapping "Add" adds item to cart (counter shows on cart button)
- [ ] Cart opens as bottom sheet
- [ ] "Place Order" submits order
- [ ] Success message shows order number
- [ ] Cart clears after successful order

Test other tables: `/order/T02`, `/order/T03`, etc. (T01–T12 are seeded)

---

### Kitchen Display — http://localhost:3000/kitchen

**What to verify:**
- [ ] 3 Kanban columns render: WAITING, COOKING, READY
- [ ] After placing a QR order (step above), the ticket appears in WAITING column
- [ ] "Start Cooking" button moves ticket to COOKING
- [ ] "Mark Ready" moves to READY column
- [ ] Tickets refresh automatically every 5 seconds (watch for updates without manual refresh)
- [ ] If a ticket is more than 20 minutes old, it shows a red border and warning

---

### POS — http://localhost:3000/pos

**What to verify:**
- [ ] Left panel shows menu grid with category tabs
- [ ] Clicking items adds them to the right panel bill summary
- [ ] +/- buttons adjust quantities
- [ ] Table selector dropdown shows T01–T12
- [ ] "Place Order" creates an order and shows confirmation
- [ ] "New Order" button clears the cart

---

## Part 4 — API Testing (Optional)

You can test the API routes directly in a browser or using a tool like Postman or Insomnia.

| Test | URL |
|------|-----|
| Dashboard summary | `http://localhost:3000/api/dashboard/summary` |
| Top 5 items | `http://localhost:3000/api/dashboard/top-items?limit=5` |
| Cost breakdown | `http://localhost:3000/api/dashboard/cost-breakdown` |
| Inventory alerts | `http://localhost:3000/api/dashboard/inventory-alerts` |
| All food items | `http://localhost:3000/api/menu?type=FOOD` |
| All tables | `http://localhost:3000/api/tables` |
| Inventory status | `http://localhost:3000/api/inventory/status` |
| Kitchen tickets | `http://localhost:3000/api/kitchen/tickets` |

Each should return JSON in the format `{ "data": [...] }`.

---

## Part 5 — Common Issues & Fixes

### `DATABASE_URL` connection error
- Check the URL in `.env` has no spaces and the password is correctly substituted
- Ensure Supabase project is not paused (free tier pauses after 1 week of inactivity — click "Resume project" in Supabase dashboard)
- Use port **5432** (direct), not 6543 (pooler) for migrations

### `prisma generate` fails
- Delete `node_modules` and re-run `npm install`
- Then retry `npx prisma generate`

### Seed script fails with FK error
- The seed runs in dependency order. If it fails partway through, some tables may be partially populated
- Run `npx prisma migrate reset --force` to wipe and re-migrate, then re-seed

### `Module not found` errors
- Run `npm install` again
- Ensure you are in the correct directory: `cd "C:\Users\dant3\OneDrive\Desktop\crimson_palace"`

### Pages show blank / no data after seeding
- Ensure `NEXT_PUBLIC_APP_URL=http://localhost:3000` is set in `.env`
- Restart the dev server after changing `.env`

---

## Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ Yes | `postgresql://...` | Supabase PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | `http://localhost:3000` | Base URL for server-side API fetches |
