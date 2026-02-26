# Crimson Palace WebOS — User Guide

**For**: Restaurant managers, waitstaff, kitchen team, cashiers

---

## What Is This System?

Crimson Palace WebOS is your restaurant's digital operating system. It runs in a web browser — no app downloads needed. It helps your team:

- **Take orders faster** — customers scan a QR code and order from their phone
- **Run the kitchen smoothly** — kitchen staff see orders on a screen the moment they're placed
- **Manage the menu** — add, edit, or remove items any time
- **Track your business performance** — see daily sales, profit, and which dishes are selling best
- **Monitor ingredient stock** — get alerts before you run out of key items

---

## How to Open the System

Open any web browser (Chrome, Edge, or Safari) and go to:

```
http://localhost:3000
```

Or your live URL if the system is deployed online.

You will be taken to the Manager Dashboard automatically.

---

## The 5 Sections

The sidebar (left side of the screen) lets you navigate between sections:

| Section | Who Uses It | What It Does |
|---------|-------------|--------------|
| **Dashboard** | Manager | See sales, profit, and stock alerts at a glance |
| **Menu Admin** | Manager | Edit your menu items, prices, and availability |
| **POS** | Cashier / Waiter | Manually enter orders at the counter |
| **Kitchen** | Kitchen team | See and manage all open orders |
| **Order** (QR) | Customers | Browse menu and order from their phone |

---

## Dashboard — For Managers

**Go to**: Click **Dashboard** in the sidebar

The dashboard shows your restaurant's performance across the full historical period (February to April 2026).

### What You'll See

**Top Row — Key Numbers**
- **Total Revenue**: All money earned from food and drinks
- **Gross Profit**: Revenue minus the cost of ingredients
- **Operating Profit**: What's left after paying for everything (rent, staff, electricity, etc.)
- **Total Covers**: How many customers were served

**Charts**
- **Revenue Trend**: A line graph showing daily sales over time. Two lines — total revenue and operating profit — so you can see how profit tracks against sales.
- **Cost Breakdown**: A pie chart showing where your money goes — ingredients, rent, staff salaries, electricity, and so on.

**Bottom Row**
- **Top 5 Selling Items**: Your best-performing dishes/drinks by revenue. Useful for deciding what to promote or keep on the menu.
- **Inventory Alerts**: Items that need attention today — things that need reordering, items close to expiry, or stock that should be used quickly.

---

## Menu Admin — For Managers

**Go to**: Click **Menu Admin** in the sidebar

This is where you manage your full menu of 50 items.

### Viewing the Menu

- Use the **Food** and **Drink** tabs to switch between food items and beverages
- Use the **search bar** to find a specific item by name
- Each row shows: item code, name, section, selling price, cost, cost %, gross margin %, and whether it's currently active

### Turning Items On and Off

Each menu item has an **Active** toggle switch. If you run out of an ingredient or want to temporarily stop selling an item:
1. Find the item in the table
2. Click the toggle switch in the **Active** column
3. The item will no longer appear in the QR ordering menu or POS

Turn it back on the same way when you're ready to serve it again.

### Adding a New Item

1. Click the **Add Item** button (top right)
2. Fill in the form:
   - **Item Name** (required)
   - **Menu Type**: Food or Drink
   - **Section**: which part of the menu it belongs to (e.g., "Pizza Grande")
   - **Sales Price**: what customers pay (in Kyats)
   - **Supplier Cost**: what it costs you to make (in Kyats)
   - Other optional details: portion size, storage, notes
3. Click **Save**

The item will immediately appear in the menu.

### Editing an Item

1. Find the item in the table
2. Click the **Edit** (pencil) icon
3. Change any details
4. Click **Save**

### Removing an Item

Click the **Delete** (trash) icon. The item is hidden from the menu but not permanently deleted — you can restore it by contacting your system administrator.

---

## QR Ordering — For Customers

**Each table has a QR code.** Customers scan it with their phone camera. This opens the ordering page for their table automatically.

### How Customers Order

1. **Scan the QR code** on the table
2. Browse the menu — items are grouped by category (tabs at the top)
3. Tap an item to add it to the cart
4. Tap the cart button to review the order
5. Tap **Place Order** to send it to the kitchen

The order goes directly to the Kitchen Display — no need for a waiter to input it manually.

### If the Order Fails

If the app shows an error:
- The cart is **not cleared** — the items are still there
- Ask the customer to try again, or have a waiter use the POS to enter the order manually

---

## Kitchen Display (KDS) — For Kitchen Team

**Go to**: Click **Kitchen** in the sidebar (or open on a dedicated kitchen monitor/tablet)

The Kitchen Display shows all active orders in three columns:

| Column | Meaning |
|--------|---------|
| **WAITING** | Order just placed — hasn't been started yet |
| **COOKING** | Kitchen team is currently preparing this order |
| **READY** | Food is ready to be served |

### Each Order Card Shows

- **Order number** (e.g., ORD-20260501-3421)
- **Table number**
- **Time elapsed** since the order was placed (e.g., "8 min")
- **Items ordered** with quantities

### Managing Orders

**When you start cooking:**
1. Find the order in the **WAITING** column
2. Click **Start Cooking**
3. The card moves to **COOKING**

**When food is ready:**
1. Click **Mark Ready**
2. The card moves to **READY**
3. This signals the floor staff to collect and serve

**When served:**
1. Click **Served**
2. The card is removed from the board

### ⚠️ Overdue Orders

If an order has been waiting for **more than 20 minutes**, the card turns **red** and shows a warning. Prioritise these orders.

### Auto-Refresh

The kitchen screen updates automatically every 5 seconds. You do not need to manually refresh the page — new orders will appear on their own.

---

## POS (Point of Sale) — For Cashiers and Waiters

**Go to**: Click **POS** in the sidebar

Use the POS when a customer wants to order at the counter, or if you need to enter an order manually (e.g., if a customer's phone can't scan the QR code).

### Taking an Order

**Left side — Menu:**
1. Use the category tabs to browse food and drink sections
2. Click any item to add it to the order (right panel)
3. Use **+** and **−** buttons to adjust quantities

**Right side — Bill:**
1. Select the **table number** from the dropdown
2. Review the items and total
3. Click **Place Order** to send to kitchen and confirm the sale

### After the Order Is Placed

A confirmation screen shows:
- Order number
- Total amount owed

Click **New Order** to clear and start a fresh order.

### If an Order Fails

An error message will appear. The order is **not cleared** — you can try again or check with your manager. Do not re-enter the order until you confirm it was not sent.

---

## Inventory Alerts — What They Mean

You'll see inventory alerts on the Dashboard. Here's what each colour/type means:

| Alert Type | What It Means | Action |
|-----------|--------------|--------|
| 🔴 **REORDER** | Stock is below the reorder threshold | Contact supplier and place a new order |
| 🟠 **SPOILAGE WRITE-OFF** | Stock was wasted/discarded | Update records; investigate cause |
| 🟡 **USE FAST / DISCOUNT** | Stock is near expiry and needs to be sold quickly | Feature it as today's special or give a slight discount |

Alerts are shown for the most recent recorded date. If you do not see alerts, everything is at acceptable stock levels.

---

## Common Questions

**Q: Can multiple staff use the system at the same time?**
Yes. The POS, Kitchen Display, and Dashboard can all be open simultaneously on different devices.

**Q: What happens if the internet goes down?**
The QR ordering cart saves to the customer's phone so items are not lost. However, orders cannot be submitted without an internet connection. The kitchen display and POS also require internet. It is recommended to have a backup connection (mobile hotspot).

**Q: Can I change prices?**
Yes — go to Menu Admin, find the item, click Edit, and change the Sales Price.

**Q: How do I see yesterday's sales?**
The Dashboard shows the full historical period. Detailed day-by-day breakdowns are visible in the Revenue Trend chart. Hover over any point on the chart to see that day's figures.

**Q: The kitchen display is not showing new orders.**
The screen refreshes every 5 seconds. Wait a few seconds. If orders still don't appear, refresh the browser page. Check that the internet connection is active.

**Q: A menu item is showing on the QR menu but we've run out.**
Go to Menu Admin, find the item, and toggle it **off** (inactive). It will disappear from the ordering menu immediately.
