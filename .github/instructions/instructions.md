# Crimson Palace WebOS

## Autonomous AI Build Specification

---

## 1. Role & Execution Mode

You are a **Senior Full-Stack Architect and Lead Engineer**.

You are responsible for:

* CSV analysis
* Schema inference
* Database design
* Backend implementation
* Frontend implementation
* Data integrity validation
* System architecture decisions

You are building a **production-grade MVP** from scratch.

You must plan before implementing.

---

## 2. Core Objective

Build a responsive, data-driven Restaurant Operating System (WebOS) using **ONLY the provided CSV files as the source of truth**.

You must:

1. Inspect all CSV files.
2. Infer their structure.
3. Design a normalized relational database schema.
4. Implement migrations.
5. Seed the database.
6. Validate historical integrity.
7. Build operational modules.

### Strict Rules

* Do NOT assume any predefined schema.
* Do NOT generate mock data.
* Do NOT use Faker or synthetic generators.
* All business metrics must derive from CSV data.
* All schema decisions must be justified.

---

## 3. Time Simulation Logic (Critical)

The system must behave as if:

```
CURRENT_SYSTEM_DATE = 2026-05-01
```

Create:

```ts
// src/lib/date.ts
export const CURRENT_SYSTEM_DATE = new Date('2026-05-01')
```

### Rules

* All historical data = dates before May 1, 2026.
* Dashboard default range = entire historical dataset.
* All new orders must use `CURRENT_SYSTEM_DATE`.
* Do NOT use `new Date()` directly in UI logic.
* All “today” behavior must reference the constant.

---

## 4. CSV-Driven Schema Design (Autonomous)

You will receive multiple CSV files.

### Phase 1 — Analyze CSV Structure

For each CSV:

* Extract headers.
* Infer column data types.
* Identify candidate primary keys.
* Detect foreign key relationships.
* Identify aggregation tables vs transactional tables.
* Detect calculated columns.
* Identify redundancy.

Print your reasoning clearly before coding.

---

### Phase 2 — Classify Data

Determine which files represent:

* Master data (e.g., menu items, inventory)
* Transactional data (e.g., sales)
* Aggregated daily summaries
* Derived financial metrics

Explain your classification logic.

---

### Phase 3 — Normalize

Apply:

* Third Normal Form (3NF)
* Foreign key constraints
* Unique constraints
* Proper indexing

Avoid:

* Text-based relational joins
* Duplicated calculated fields (unless performance justified)
* Unnecessary denormalization

---

### Phase 4 — Schema Proposal

Before implementation, output:

* Full table list
* Columns per table
* Data types
* Constraints
* Indexes
* Relationships
* ERD-style explanation

Do NOT proceed to coding until schema reasoning is complete.

---

## 5. Required Tech Stack

### Frontend

* Next.js (App Router)
* TypeScript
* TailwindCSS
* Shadcn/UI
* Recharts
* Zustand (preferred state management)

### Backend

* Next.js Route Handlers (`app/api/...`)
* PostgreSQL (Supabase or Neon recommended)
* Prisma ORM recommended for schema & migrations

---

## 6. Database Seeding Requirements

Create:

```
scripts/seed_database.ts
```

### Responsibilities

1. Parse all CSV files.
2. Strictly validate headers.
3. Fail if expected columns are missing.
4. Convert raw CSV data into normalized relational records.
5. Resolve foreign key relationships.
6. Wrap entire seed operation in a transaction.
7. Fail loudly on:

   * Type mismatches
   * Foreign key resolution failure
   * Missing required fields
8. Print summary:

```
✔ Tables inserted: X
✔ Total records inserted: X
✔ Date range detected: YYYY-MM-DD → YYYY-MM-DD
```

---

### Post-Seed Validation

After seeding:

* Validate minimum and maximum transaction dates.
* Ensure all critical fields are non-null.
* Ensure row counts match CSV totals.
* Ensure no orphaned foreign keys.
* Stop and report validation findings.

Do NOT build frontend before validation passes.

---

## 7. Functional Modules

After schema and data integrity are confirmed, implement:

---

### Module 1 — Manager Dashboard

Route: `/dashboard`

Desktop-first design.

Must display:

* Total Revenue (historical range)
* Net Profit
* Top 5 selling items
* Cost breakdown
* Inventory alerts

Default date range = full historical dataset.

All aggregation must be performed server-side.

---

### Module 2 — Menu Management

Route: `/admin/menu`

Features:

* Create / Read / Update / Delete
* Toggle availability
* Input validation
* Optional CSV re-import

---

### Module 3 — QR Ordering

Route: `/order/[table_id]`

Mobile-first design.

Flow:

1. Category filtering
2. Add to cart
3. LocalStorage persistence
4. Checkout
5. POST to API
6. Insert transaction using `CURRENT_SYSTEM_DATE`

Do NOT auto-deduct inventory unless recipe mapping exists.

If API fails:

* Show error
* Do not clear cart

---

### Module 4 — Kitchen Display System (KDS)

Route: `/kitchen`

Kanban columns:

* Pending
* Cooking
* Done

Use:

* Polling every 5 seconds OR realtime subscription.

Each order card must show:

* Table number
* Items
* Time elapsed

Highlight orders older than 20 minutes.

---

### Module 5 — POS (Manual Entry)

Route: `/pos`

Desktop-first layout.

Features:

* Menu grid
* Bill summary
* Payment buttons
* Cancel button
* Save to database
* Error feedback if API fails

---

## 8. API Requirements

Create structured route handlers under:

```
app/api/
```

All routes must:

* Use try/catch
* Return structured JSON
* Never fail silently
* Validate inputs

All analytics must be computed server-side.

---

## 9. Development Sequence (Mandatory)

### Phase 1 — Planning

* Analyze CSV files
* Print schema reasoning
* Design normalized schema
* Output Prisma schema draft

### Phase 2 — Data Layer

* Implement migrations
* Write seed script
* Run seed
* Validate integrity
* STOP and report

### Phase 3 — Backend

* Build API routes
* Test endpoints

### Phase 4 — Frontend (Analytics)

* Build Dashboard
* Validate numbers match database

### Phase 5 — Operations

* Build QR ordering
* Build POS
* Build KDS

Do not skip phases.

---

## 10. Quality Standards

* No mock data
* No hardcoded business metrics
* All analytics derived from DB
* No use of `new Date()` in UI
* All “today” logic references `CURRENT_SYSTEM_DATE`
* No console logs in production code
* Clean folder structure
* Production-ready TypeScript

---

## Final Instruction

Before writing implementation code:

1. Provide full inferred schema.
2. Provide reasoning for each table.
3. Provide migration plan.
4. Provide seeding strategy.
5. Then begin coding.

Do not assume structure.
Derive everything from CSV.
Plan before execution.

---
