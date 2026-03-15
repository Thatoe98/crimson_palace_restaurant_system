# Crimson Palace WebOS

## Portfolio Case Study

### Project Summary

Crimson Palace WebOS is a full-stack restaurant operating system built to unify the day-to-day workflows of a dine-in restaurant into a single web platform. Instead of treating ordering, kitchen coordination, menu administration, table service, analytics, and inventory control as separate tools, this system brings them together in one operational layer.

The platform models a realistic restaurant environment using seeded financial, menu, recipe, payroll, ingredient, and inventory datasets covering February to April 2026, while also supporting live transactional activity such as QR orders, POS orders, kitchen ticket progression, and table service notifications.

At a product level, the system solves six practical problems:

- Customers can place orders directly from the table through QR-based ordering.
- Cashiers and floor staff can create manual orders through a POS interface.
- Kitchen staff can process incoming tickets in a dedicated kitchen display workflow.
- Managers can maintain menu availability and pricing without touching the database.
- Operators can monitor historical sales, cost, and profit performance from a dashboard.
- Inventory and reorder risk can be tracked using daily stock snapshots and alert logic.

### What The System Does

The application is structured around the actual operating surfaces of a restaurant:

#### 1. Manager Dashboard

The dashboard aggregates historical financial and operational performance into an executive view. It exposes total revenue, gross profit, operating profit, covers, cost breakdowns, top-selling menu items, revenue trends, and latest inventory alerts. This gives a manager a fast view of both commercial performance and operational risk.

#### 2. Menu Administration

The menu admin module allows staff to view, create, edit, deactivate, and import menu items. This is important in a restaurant context because menu changes are frequent and operationally sensitive. The implementation supports active/inactive state management so sold-out items disappear from customer ordering flows without needing to be deleted.

#### 3. QR Ordering

Each dining table is represented in the system and can be associated with a QR route. Customers can browse active menu items, add items to a persistent cart, place orders, call a waiter, and request the bill. The ordering experience is designed for mobile use and keeps the interaction close to the table rather than forcing staff-mediated order entry.

#### 4. Point of Sale

The POS module serves staff who need to manually create orders at the counter or on behalf of a customer. It reuses the menu catalog and table model while supporting walk-in handling when no specific table is selected.

#### 5. Kitchen Display System

The kitchen view converts submitted orders into active tickets. Staff can move orders through waiting, in-prep, ready, and served states. This creates a clear operational flow from order capture to fulfillment and keeps kitchen progress visible in real time through frequent polling.

#### 6. Table Service and Notification Flow

The system includes a table management screen that tracks active orders and customer service requests such as calling a waiter or asking for the bill. This is a strong operational touch because it extends beyond pure ordering into front-of-house coordination.

#### 7. Inventory and Reordering Visibility

The inventory module exposes daily stock status, reorder thresholds, expiry pressure, and critical alerts. This bridges restaurant operations with stock control rather than leaving inventory as an offline spreadsheet-only process.

### Business and Technical Use Cases

This system is suitable for several realistic scenarios:

- A dine-in restaurant that wants to replace paper ordering and verbal kitchen handoffs.
- A manager who wants to compare sales, cost of goods, payroll burden, and operating profit over time.
- A restaurant group prototyping a restaurant OS before introducing payments or multi-branch support.
- A digital transformation case where spreadsheet data needs to be converted into an operational web system.
- A portfolio project demonstrating product thinking, full-stack engineering, data modeling, and workflow design in one codebase.

### Tech Stack

The project is built as a modern TypeScript web application with a database-backed operational model.

#### Frontend

- Next.js 14 with the App Router for the web application shell, routing, server components, and route handlers.
- React 18 for UI composition.
- TypeScript for end-to-end typing.
- Tailwind CSS for styling.
- Shadcn UI with Radix primitives for accessible interface building blocks.
- Recharts for business dashboards and analytics visualization.
- Zustand for lightweight client state management in ordering and POS flows.
- Lucide React for iconography.

#### Backend

- Next.js route handlers for the API surface.
- Supabase JavaScript client for server-side access to PostgreSQL tables and RPCs.
- PostgreSQL stored procedures for critical order and kitchen workflows.
- Utility-layer request helpers for consistent JSON success and error contracts.

#### Data and Tooling

- PostgreSQL as the primary relational database.
- Prisma schema as the canonical database model and relationship definition.
- PapaParse and custom CSV parsing helpers for structured seed ingestion.
- ts-node for running TypeScript seed and validation scripts.

An important architectural detail is that the project combines schema-driven modeling with database-first operational behavior. Prisma defines the schema cleanly, while runtime application logic leans on Supabase queries and PostgreSQL RPC functions for order creation and kitchen state transitions.

### Architecture Overview

Crimson Palace is implemented as a monolithic full-stack application. This was a pragmatic choice because the product’s modules are tightly related and benefit from a single deployable surface.

The architecture can be summarized in four layers:

1. Presentation Layer
   Next.js pages and client components render the dashboard, menu admin, POS, kitchen, QR ordering, inventory, and tables views.

2. Application/API Layer
   Route handlers under the App Router expose REST-style endpoints for menu, dashboard, inventory, orders, kitchen tickets, POS orders, tables, and notifications.

3. Domain/Data Access Layer
   Shared helpers normalize dates, numbers, API responses, and server-side DB access. Zustand stores manage local order and POS state on the client.

4. Persistence Layer
   PostgreSQL stores normalized master data, historical operational facts, and live transaction records. Some business actions are executed through database RPC functions for transactional consistency.

This design keeps deployment simple while still supporting clear separation between UI, API, and persistence responsibilities.

### Database Design

The schema is one of the strongest parts of the system. It models both historical analytics and live restaurant operations in a normalized relational structure.

#### Core Design Approach

The database follows a mostly normalized design with explicit lookup tables, master data tables, time-series fact tables, and runtime operational entities. This is a good fit for restaurant operations because it supports both transactional integrity and historical analysis.

#### Major Entity Groups

##### 1. Lookup and Classification Tables

- Uom
- IngredientCategory
- MenuSection
- StorageLocation
- PrepStation

These tables reduce duplication and provide controlled vocabularies across inventory, recipes, and menu data.

##### 2. Master Data

- Ingredient stores stock planning values such as average daily usage, lead time, safety stock, reorder point, target stock, shelf life, and expiry warning thresholds.
- MenuItem stores menu definitions, pricing, cost, type, storage, prep station, and activation state.
- MenuItemRecipe links menu items to ingredients with per-unit usage quantities.
- PayrollRole stores staffing and payroll structure.

##### 3. Historical Fact Tables

- DailySummary captures daily commercial performance.
- DailyItemSale stores per-item sales performance by day.
- DailyItemIngredientUsage connects sold items to ingredient usage.
- IngredientDailyUsage tracks total ingredient consumption per day.
- InventoryDailyStatus records daily stock state, reorder signals, and expiry risk.
- InventoryAlert and InventoryAlertAction model actionable stock alerts.
- PurchaseOrder stores supplier ordering activity.

##### 4. Live Operational Tables

- DiningTable models the dining room.
- CustomerOrder represents the main order header.
- CustomerOrderItem captures line items and kitchen progression.
- TableNotification captures front-of-house customer requests such as waiter calls and bill requests.

#### Why The Schema Works Well

- It separates reference data from transactional data cleanly.
- It supports both analytics and live restaurant workflows in one model.
- It preserves foreign key integrity across recipes, items, orders, and inventory.
- It allows operational states such as order status and kitchen status to be modeled explicitly.
- It gives enough historical granularity to build real KPI dashboards rather than simplistic totals.

### Database Procedures and SQL Logic

One of the more mature parts of the project is the use of PostgreSQL functions to centralize sensitive workflow logic.

#### create_customer_order

This stored procedure is responsible for generating a new order atomically. It validates the table, validates order items, derives prices from the menu, calculates totals, generates a daily-sequenced order number, inserts the order header, inserts order items, and returns the created identifiers.

This is a strong design choice because it moves the critical order-creation logic closer to the database, where transactional guarantees are strongest.

#### set_kitchen_ticket_status

This stored procedure updates the overall ticket and item-level kitchen state transitions. It centralizes the operational rules around moving an order into prep, ready, and served states and stamps timestamps accordingly.

#### Table Notification SQL

The table notification SQL adds a dedicated enum and table for service requests, plus indexes optimized for polling-based retrieval. This extends the platform from a pure ordering application into a more complete restaurant service workflow.

### Engineering Procedures and Development Workflow

This project demonstrates good engineering discipline in how data is introduced and validated.

#### 1. Structured Seed Pipeline

The seed script ingests menu, summary, payroll, ingredient usage, inventory status, alerts, purchase orders, and recipe assumptions from CSV sources. It normalizes booleans, dates, percentages, units, and monetary values before inserting them.

The import sequence is dependency-aware. Lookup entities are created first, then master data, then historical facts, then runtime defaults such as dining tables. This reduces referential breakage during import.

#### 2. Validation Pass After Seeding

The validation script checks table counts, verifies key date ranges, and confirms important integrity assumptions such as valid ingredient references and non-null required relationships. This is the kind of procedure that turns a seed process into a repeatable data-loading workflow rather than a one-off script.

#### 3. Consistent API Contracts

The API layer is designed around predictable success and error payloads. This matters because the project has several operational clients consuming backend endpoints, including dashboards, kitchen polling, QR ordering, POS submission, and notification acknowledgment.

#### 4. State Management Decisions

The QR cart persists to local storage so customer carts survive refreshes. POS state is kept session-local because those transactions are short-lived and staff-driven. This is a good example of applying persistence selectively based on workflow behavior.

#### 5. Time Simulation Strategy

The project uses a fixed system date constant for business logic around historical data interpretation. That gives the product a controlled simulated operating environment and makes seeded analytics reproducible.

### User Flows and Operational Procedures

#### Customer Ordering Procedure

1. A customer scans a table QR code.
2. The table-specific ordering route loads active menu items.
3. The customer adds items to a persistent cart.
4. The order is submitted through the orders API.
5. The database function creates the order and line items.
6. The order appears in the kitchen display.

#### Kitchen Fulfillment Procedure

1. Kitchen staff poll the ticket board.
2. Incoming tickets are grouped as active work.
3. Staff move tickets through prep, ready, and served states.
4. The status transition updates both order and item records.

#### Table Service Procedure

1. A customer taps Call Waiter or Ask for Bill.
2. A notification record is created with spam protection.
3. The table management screen polls for new notifications.
4. Staff acknowledge the request once handled.

#### Inventory Oversight Procedure

1. Historical inventory status data is loaded from structured files.
2. Reorder and expiry conditions are stored per ingredient per day.
3. Latest alerts are aggregated into critical items and action summaries.
4. Managers use the inventory page and dashboard panel to triage stock risk.

### Why This Is A Strong Portfolio Project

This project is portfolio-worthy because it demonstrates more than UI implementation.

- It solves a real business domain with multiple user types.
- It combines analytics, operations, and workflow automation.
- It shows relational database design beyond trivial CRUD apps.
- It includes SQL procedures, seed pipelines, validation logic, and historical datasets.
- It balances server-rendered pages, client state, route handlers, and database-backed workflows.
- It demonstrates product thinking by connecting customer, kitchen, cashier, and manager experiences.

In other words, this is not just a frontend dashboard or a toy POS. It is a mini operating system for a restaurant.

### Design Tradeoffs and Decisions

Several engineering choices stand out:

#### Monolith Instead of Distributed Services

Keeping the application inside a single Next.js codebase reduces deployment and integration overhead. For an MVP or operational prototype, this is a better tradeoff than prematurely splitting services.

#### Polling Instead of WebSockets

Kitchen tickets and table notifications are refreshed through polling. This is simpler to ship and debug than introducing real-time infrastructure early. It is a valid tradeoff for a first production-style version.

#### Historical Analytics Plus Live Transactions

The system models both seeded historical performance and current operational activity. That gives the project a richer scope than many restaurant demos, which usually focus on one side only.

#### Database-Centered Order Logic

Placing order creation and status transitions in SQL procedures helps preserve transactional safety for the most important workflow in the product.

### Potential Future Improvements

There is a strong base here, and the next stage could move the system closer to production readiness.

#### Product Improvements

- Add authentication and role-based access control for managers, kitchen staff, cashiers, and service staff.
- Introduce payment workflows, settlement, and receipt generation.
- Add modifier groups, combo meals, and item customization.
- Add reservation management and floor planning.
- Add multi-branch support with branch-specific menus and inventory.

#### Technical Improvements

- Replace polling with Supabase Realtime, WebSockets, or SSE for kitchen and table notifications.
- Move all sensitive credentials fully into environment variables and deployment secrets.
- Add automated integration and end-to-end tests for order creation, kitchen progression, and notification flows.
- Add audit logs for menu changes, price changes, and order state transitions.
- Introduce stricter domain validation and shared schema validation with a library such as Zod.
- Add observability for failed API requests, slow queries, and order processing errors.

#### Data and Operations Improvements

- Add rolling forecasts for ingredient demand based on item sales.
- Connect inventory consumption directly to live orders instead of seeded-only historical analysis.
- Add waste analytics and variance reporting.
- Add supplier performance reporting based on lead time and stockout frequency.

### Recommended Talking Points For Interviews or Presentations

If presenting this project in a portfolio, the strongest points to emphasize are:

- You designed a system around operational workflows, not isolated pages.
- You modeled both historical analytics and live transaction processing.
- You used relational schema design to support restaurant-specific business logic.
- You built a data ingestion process from messy spreadsheet exports into a normalized database.
- You used SQL procedures for transactional correctness where it mattered most.
- You created interfaces for distinct users: customers, kitchen staff, cashiers, and managers.

### Conclusion

Crimson Palace WebOS is a credible full-stack operations platform for a restaurant environment. It demonstrates product architecture, domain modeling, workflow design, database thinking, and implementation discipline across frontend, backend, and data layers.

As a portfolio piece, it stands out because it is not merely aesthetic or theoretical. It addresses real restaurant workflows, uses realistic data, and shows how software can connect commercial reporting, service execution, and kitchen operations in one cohesive system.