# Crimson Palace WebOS — Technical Overview

**Audience**: Software developers, DevOps engineers, technical stakeholders

---

## 1. System Architecture

Crimson Palace WebOS is a monolithic full-stack web application built on **Next.js 14 App Router**. All frontend rendering, backend API logic, and database access live in a single deployable Next.js application.

```
┌─────────────────────────────────────────────────────────┐
│                    Browser / Client                      │
│   React (Server + Client Components) · Zustand · CSS    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────────────┐
│                  Next.js App Router                      │
│  ┌──────────────┐   ┌──────────────────────────────┐    │
│  │  Page Routes │   │     API Route Handlers        │    │
│  │  /dashboard  │   │  /api/dashboard/summary       │    │
│  │  /admin/menu │   │  /api/menu                    │    │
│  │  /order/[id] │   │  /api/orders                  │    │
│  │  /kitchen    │   │  /api/kitchen/tickets          │    │
│  │  /pos        │   │  /api/inventory/status        │    │
│  └──────────────┘   └──────────────────────────────┘    │
│                            │                             │
│                    ┌───────▼──────┐                      │
│                    │  Prisma ORM  │                      │
│                    └───────┬──────┘                      │
└────────────────────────────┼────────────────────────────┘
                             │ TCP/SSL
┌────────────────────────────▼────────────────────────────┐
│            PostgreSQL (Supabase / Neon)                  │
│  22 tables · FK-enforced · 3NF normalized                │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2 | App Router, SSR, API routes |
| React | 18.2 | UI rendering |
| TypeScript | 5.4 | Type safety (strict mode) |
| TailwindCSS | 3.4 | Utility-first styling |
| Shadcn/UI | latest | Accessible component library (Radix primitives) |
| Recharts | 2.x | Dashboard charts (LineChart, PieChart) |
| Zustand | 4.5 | Client-side state (cart, POS) |
| Lucide React | 0.363 | Icon set |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js Route Handlers | 14.2 | REST API layer |
| Prisma ORM | 5.10 | Query builder + migrations |
| PapaParse | 5.4 | CSV parsing in seed scripts |
| ts-node | 10.9 | Run TypeScript seed scripts directly |

### Infrastructure
| Technology | Notes |
|-----------|-------|
| PostgreSQL 15+ | Via Supabase or Neon (cloud-hosted) |
| Vercel (optional) | Recommended deployment target for Next.js |

---

## 3. Directory Structure

```
crimson_palace/
├── prisma/
│   └── schema.prisma            # Full 22-model database schema
├── scripts/
│   ├── seed_database.ts         # Main CSV → DB ingestion pipeline
│   └── validate_seed.ts         # Post-seed integrity checker
├── src/
│   ├── app/                     # Next.js App Router pages + API routes
│   │   ├── api/
│   │   │   ├── dashboard/       # summary, top-items, cost-breakdown, inventory-alerts
│   │   │   ├── menu/            # CRUD + toggle + import
│   │   │   ├── orders/          # create + status update
│   │   │   ├── kitchen/         # tickets + status
│   │   │   ├── tables/          # dining tables list
│   │   │   └── inventory/       # daily status
│   │   ├── dashboard/           # Manager Dashboard page
│   │   ├── admin/menu/          # Menu Management page
│   │   ├── order/[table_id]/    # QR Ordering page
│   │   ├── kitchen/             # KDS page
│   │   └── pos/                 # POS page
│   ├── components/
│   │   ├── ui/                  # Shadcn/UI base components
│   │   ├── layout/              # Sidebar, AppLayout
│   │   ├── dashboard/           # KpiCard, charts, tables
│   │   ├── menu/                # MenuAdminClient, form dialog
│   │   ├── order/               # Cart, menu grid, item cards
│   │   ├── kitchen/             # KanbanBoard, TicketCard
│   │   └── pos/                 # PosClient, panels
│   ├── lib/
│   │   ├── date.ts              # CURRENT_SYSTEM_DATE constant
│   │   ├── db.ts                # Prisma singleton
│   │   ├── utils.ts             # cn(), formatMMK(), formatPct()
│   │   ├── types/domain.ts      # Shared TypeScript interfaces
│   │   └── csv/                 # parseCsv, normalizers, headerContracts
│   └── store/
│       ├── orderCartStore.ts    # Zustand cart (QR ordering)
│       └── posStore.ts          # Zustand POS state
├── docs/                        # This documentation
├── .env.example                 # Environment variable template
├── package.json
├── prisma/schema.prisma
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Database Schema — Entity Summary

### Dimension / Lookup Tables
| Table | Rows | Purpose |
|-------|------|---------|
| `Uom` | ~5 | Units of measure (g, ml, count, pizza, portion) |
| `IngredientCategory` | ~8 | Ingredient groupings (Protein_Fresh, Dairy_Egg, etc.) |
| `MenuSection` | ~10 | Menu sections (Pizza Grande, Pub Snacks, etc.) |
| `StorageLocation` | ~4 | Chiller, Freezer, Ambient, Bar Shelf |
| `PrepStation` | ~2 | Kitchen, Bar |

### Master Data Tables
| Table | Rows | Source CSV |
|-------|------|-----------|
| `Ingredient` | 35 | inventory setting.csv |
| `MenuItem` | 50 | Menu (1).csv |
| `MenuItemRecipe` | ~220 | recipe assumptions.csv |
| `PayrollRole` | 9 | Payroll_Roster.csv |

### Historical Fact Tables (Feb 1 – Apr 29, 2026)
| Table | Rows | Source CSV |
|-------|------|-----------|
| `DailySummary` | 88 | Daily_Summary.csv |
| `IngredientDailyUsage` | ~3,080 | daily ingredi usage.csv |
| `InventoryDailyStatus` | ~3,080 | inventory daily status.csv |
| `InventoryAlert` | ~685 | inventory alert.csv |
| `InventoryAlertAction` | ~900+ | parsed from alert CSV |
| `PurchaseOrder` | ~594 | purchase orders.csv |

### Operational Tables (runtime)
| Table | Notes |
|-------|-------|
| `DiningTable` | 12 tables (T01–T12), seeded as defaults |
| `CustomerOrder` | Created at runtime via QR/POS |
| `CustomerOrderItem` | Created at runtime, tracks kitchen status |

---

## 5. Time Simulation

The system simulates operation as of **May 1, 2026**. All "today" references use:

```ts
// src/lib/date.ts
export const CURRENT_SYSTEM_DATE = new Date('2026-05-01')
```

**Rules enforced:**
- `new Date()` is never called in UI or API logic
- All order `orderedAt` timestamps use `CURRENT_SYSTEM_DATE`
- Dashboard default range covers entire historical dataset (Feb–Apr 2026)
- Historical data = any `businessDate < 2026-05-01`

---

## 6. API Design

All API routes follow a consistent contract:

**Success response:**
```json
{ "data": <payload> }
```

**Error response:**
```json
{ "error": "Descriptive error message" }
```

HTTP status codes used:
- `200` — success (GET, PATCH)
- `201` — created (POST)
- `400` — validation error (missing fields, invalid input)
- `404` — resource not found
- `500` — internal server error

All analytical aggregation is performed **server-side** in Prisma queries — no client-side number crunching for business metrics.

---

## 7. Data Seeding Pipeline

The seed script (`scripts/seed_database.ts`) runs in strict dependency order:

```
Step 1:  UOM              ← collected from all CSVs
Step 2:  IngredientCategory ← from inventory_settings.Category
Step 3:  MenuSection       ← from menu.Section
Step 4:  StorageLocation   ← from menu.Storage
Step 5:  PrepStation       ← from menu.Prep Station
Step 6:  Ingredient        ← inventory_setting.csv
Step 7:  MenuItem          ← Menu (1).csv (skip 2 title rows)
Step 8:  MenuItemRecipe    ← recipe assumptions.csv
Step 9:  PayrollRole       ← Payroll_Roster.csv (skip TOTAL row)
Step 10: DailySummary      ← Daily_Summary.csv
Step 11: IngredientDailyUsage ← daily ingredi usage.csv
Step 12: InventoryDailyStatus ← inventory daily status.csv
Step 13: InventoryAlert + Actions ← inventory alert.csv
Step 14: PurchaseOrder     ← purchase orders.csv
Step 15: DiningTable       ← 12 hardcoded defaults
```

All steps run in a **single Prisma transaction**. Failure at any step rolls back everything.

**Key parsing decisions:**
- MMK monetary strings: strip commas → `"12,000"` → `12000`
- Percentage strings: strip `%`, divide by 100 → `"35.0%"` → `0.35`
- `Yes/No` booleans → `true/false`
- `Y/blank` reorder flag → `true/false`
- Multi-action strings: `"REORDER; SPOILAGE_WRITE_OFF"` → split by `;` → separate `InventoryAlertAction` rows
- Menu CSV row 1–2 are title rows; row 3 is the actual header

---

## 8. State Management

| Store | Technology | Persistence | Used By |
|-------|-----------|-------------|---------|
| `orderCartStore` | Zustand + persist | localStorage (`cp-cart`) | QR ordering |
| `posStore` | Zustand | Session only (no persist) | POS |

Cart persists across page refreshes so customers don't lose their order. POS is session-only as each transaction is discrete.

---

## 9. Real-time Behavior

The Kitchen Display System (KDS) at `/kitchen` polls the API every **5 seconds**:

```ts
useEffect(() => {
  const interval = setInterval(fetchTickets, 5000)
  return () => clearInterval(interval)
}, [])
```

No WebSocket or Server-Sent Events are used in the MVP — polling is sufficient for kitchen update latency requirements. This can be upgraded to Supabase Realtime subscriptions in a future iteration.

---

## 10. Order Status State Machine

```
OPEN → SENT_TO_KITCHEN → IN_PREP → READY → SERVED → CLOSED
                    ↓
                CANCELLED (from any state)
```

Both `CustomerOrder` (order-level) and `CustomerOrderItem` (item-level) carry independent `status`/`kitchenStatus` fields. The order-level status is automatically promoted based on item statuses:
- All items `READY` → order becomes `READY`
- Any item `IN_PREP` → order becomes `IN_PREP`

---

## 11. Key Invariants

- All monetary values stored and returned as plain `number` (Prisma `Decimal` → `Number()` cast at API boundary)
- No calculated fields stored redundantly — gross profit, margin %, cost variance are always derived on read
- `isActive` soft-delete pattern used for `MenuItem` — no hard deletes
- All FK constraints enforced at database level via Prisma `onDelete: Restrict`
- No Faker / synthetic data anywhere — all historical data originates from CSV files
