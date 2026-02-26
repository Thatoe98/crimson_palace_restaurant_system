# Crimson Palace WebOS

A production-grade Restaurant Operating System for Virtual Yankin House (vYKH).

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, Shadcn/UI, Recharts, Zustand
- **Backend**: Next.js Route Handlers, Prisma ORM
- **Database**: PostgreSQL (Supabase or Neon recommended)

## System Date

All "today" logic references:
```ts
CURRENT_SYSTEM_DATE = new Date('2026-05-01')
```
Historical data covers: **Feb 1, 2026 — Apr 29, 2026**

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env and set DATABASE_URL
```

### 3. Run database migration
```bash
npx prisma migrate dev --name init
```

### 4. Seed the database
```bash
npm run db:seed
```

### 5. Validate seed integrity
```bash
npm run db:validate
```

### 6. Start development server
```bash
npm run dev
```

## Modules

| Route | Module | Description |
|-------|--------|-------------|
| `/dashboard` | Manager Dashboard | KPIs, revenue trends, inventory alerts |
| `/admin/menu` | Menu Management | CRUD menu items, CSV import |
| `/order/[table_id]` | QR Ordering | Mobile customer ordering |
| `/kitchen` | Kitchen Display (KDS) | Real-time Kanban for kitchen |
| `/pos` | Point of Sale | Desktop manual order entry |

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/dashboard/summary` | Revenue/profit KPIs |
| GET | `/api/dashboard/top-items` | Top selling items |
| GET | `/api/dashboard/cost-breakdown` | Cost category breakdown |
| GET | `/api/dashboard/inventory-alerts` | Latest inventory alerts |
| GET/POST | `/api/menu` | List / create menu items |
| GET/PUT/DELETE | `/api/menu/[id]` | Single item operations |
| PATCH | `/api/menu/[id]/toggle` | Toggle active status |
| GET/POST | `/api/orders` | List / create orders |
| GET | `/api/kitchen/tickets` | Active kitchen tickets |
| PATCH | `/api/kitchen/tickets/[id]/status` | Update ticket status |
| GET | `/api/tables` | List dining tables |
| GET | `/api/inventory/status` | Daily inventory status |

## Database Schema

Key tables:
- `MenuItem` — 50 menu items (food + drinks)
- `Ingredient` — 35 ingredients with reorder settings
- `MenuItemRecipe` — ingredient quantities per menu item
- `DailySummary` — daily financial summaries (Feb–Apr 2026)
- `IngredientDailyUsage` — daily ingredient consumption
- `InventoryDailyStatus` — daily inventory snapshots
- `InventoryAlert` — stock alerts by date
- `PurchaseOrder` — supplier purchase orders
- `CustomerOrder` + `CustomerOrderItem` — live orders
- `DiningTable` — 12 tables (T01–T12)
- `PayrollRole` — 9 staff roles, 8.54M MMK/month total

## CSV Sources

All data derived from:
```
Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Menu (1).csv
Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Daily_Summary.csv
Menu, FakeSales, ingredients_Feb-Mar-Apr_2026_DailyItemDetail_AuditReady.xlsx - Payroll_Roster.csv
reordering.xlsx - daily ingredi usage.csv
reordering.xlsx - inventory alert.csv
reordering.xlsx - inventory daily status.csv
reordering.xlsx - inventory setting.csv
reordering.xlsx - purchase orders.csv
reordering.xlsx - recipe assumptions.csv
```

## Quality Standards

- No mock data — all metrics derived from CSV/DB
- No `new Date()` in UI — use `CURRENT_SYSTEM_DATE`
- All analytics server-side
- Structured API error responses
- FK integrity enforced at DB level
