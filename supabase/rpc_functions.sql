CREATE OR REPLACE FUNCTION create_customer_order(
  p_table_id text,
  p_source text,
  p_items jsonb,
  p_notes text
)
RETURNS TABLE(
  order_id text,
  order_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_ymd text := to_char(current_date, 'YYYYMMDD');
  v_next_seq integer;
  v_order_number text;
  v_order_id text := replace(gen_random_uuid()::text, '-', '');
  v_order_status text;
  v_item_status text;
  v_source "OrderSource";
  v_item jsonb;
  v_menu_item_id text;
  v_qty integer;
  v_unit_price numeric(14,2);
  v_line_total numeric(14,2);
  v_subtotal numeric(14,2) := 0;
  v_normalized_items jsonb := '[]'::jsonb;
BEGIN
  IF p_table_id IS NULL OR btrim(p_table_id) = '' THEN
    RAISE EXCEPTION 'tableId is required.';
  END IF;

  IF p_source IS NULL OR p_source NOT IN ('QR', 'POS') THEN
    RAISE EXCEPTION 'source must be QR or POS.';
  END IF;

  v_source := p_source::"OrderSource";

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items is required and must contain at least one item.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "DiningTable" dt
    WHERE dt."id" = p_table_id
      AND dt."isActive" = true
  ) THEN
    RAISE EXCEPTION 'DiningTable does not exist or is inactive.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'PENDING'
  ) THEN
    v_order_status := 'PENDING';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'OPEN'
  ) THEN
    v_order_status := 'OPEN';
  ELSE
    v_order_status := 'SENT_TO_KITCHEN';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'SENT_TO_KITCHEN'
  ) THEN
    v_item_status := 'SENT_TO_KITCHEN';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'PENDING'
  ) THEN
    v_item_status := 'PENDING';
  ELSE
    v_item_status := v_order_status;
  END IF;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := nullif(btrim(v_item ->> 'menu_item_id'), '');

    BEGIN
      v_qty := (v_item ->> 'qty')::integer;
    EXCEPTION WHEN others THEN
      v_qty := NULL;
    END;

    IF v_menu_item_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Each item must include menu_item_id and qty > 0.';
    END IF;

    SELECT mi."salesPriceMmk"
    INTO v_unit_price
    FROM "MenuItem" mi
    WHERE mi."id" = v_menu_item_id;

    IF v_unit_price IS NULL THEN
      RAISE EXCEPTION 'Invalid menu_item_id: %', v_menu_item_id;
    END IF;

    v_line_total := round(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;

    v_normalized_items := v_normalized_items || jsonb_build_object(
      'menu_item_id', v_menu_item_id,
      'qty', v_qty,
      'unit_price_mmk', v_unit_price,
      'line_total_mmk', v_line_total,
      'notes', nullif(btrim(v_item ->> 'notes'), '')
    );
  END LOOP;

  PERFORM pg_advisory_xact_lock(hashtext('create_customer_order_' || v_ymd));

  SELECT coalesce(max((regexp_match(co."orderNumber", '^ORD-' || v_ymd || '-([0-9]{3})$'))[1]::integer), 0) + 1
  INTO v_next_seq
  FROM "CustomerOrder" co
  WHERE co."orderNumber" LIKE ('ORD-' || v_ymd || '-%');

  v_order_number := 'ORD-' || v_ymd || '-' || lpad(v_next_seq::text, 3, '0');

  INSERT INTO "CustomerOrder" (
    "id",
    "orderNumber",
    "tableId",
    "source",
    "status",
    "orderedAt",
    "subtotalMmk",
    "totalMmk",
    "notes"
  )
  VALUES (
    v_order_id,
    v_order_number,
    p_table_id,
    v_source,
    v_order_status::"OrderStatus",
    v_now,
    v_subtotal,
    v_subtotal,
    nullif(btrim(p_notes), '')
  );

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(v_normalized_items)
  LOOP
    INSERT INTO "CustomerOrderItem" (
      "id",
      "orderId",
      "menuItemId",
      "qty",
      "unitPriceMmk",
      "lineTotalMmk",
      "kitchenStatus",
      "sentToKitchenAt",
      "notes"
    )
    VALUES (
      replace(gen_random_uuid()::text, '-', ''),
      v_order_id,
      v_item ->> 'menu_item_id',
      (v_item ->> 'qty')::numeric,
      (v_item ->> 'unit_price_mmk')::numeric,
      (v_item ->> 'line_total_mmk')::numeric,
      v_item_status::"OrderStatus",
      v_now,
      v_item ->> 'notes'
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;


CREATE OR REPLACE FUNCTION set_kitchen_ticket_status(
  p_order_id text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_order_status text;
  v_item_status text;
  v_done_status text;
  v_has_prep_started_at boolean;
  v_has_sent_to_kitchen_at boolean;
BEGIN
  IF p_order_id IS NULL OR btrim(p_order_id) = '' THEN
    RAISE EXCEPTION 'order id is required.';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('IN_PREP', 'READY', 'SERVED') THEN
    RAISE EXCEPTION 'status is required and must be IN_PREP, READY, or SERVED.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "CustomerOrder" co
    WHERE co."id" = p_order_id
  ) THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = p_status
  ) THEN
    v_order_status := p_status;
  ELSIF p_status = 'SERVED' AND EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'DONE'
  ) THEN
    v_order_status := 'DONE';
  ELSE
    v_order_status := 'SERVED';
  END IF;

  IF p_status = 'SERVED' AND EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'OrderStatus'
      AND e.enumlabel = 'DONE'
  ) THEN
    v_item_status := 'DONE';
    v_done_status := 'DONE';
  ELSE
    v_item_status := p_status;
    v_done_status := 'DONE';
  END IF;

  UPDATE "CustomerOrder"
  SET "status" = v_order_status::"OrderStatus"
  WHERE "id" = p_order_id;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CustomerOrderItem'
      AND column_name = 'prepStartedAt'
  ) INTO v_has_prep_started_at;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CustomerOrderItem'
      AND column_name = 'sentToKitchenAt'
  ) INTO v_has_sent_to_kitchen_at;

  IF p_status = 'IN_PREP' THEN
    IF v_has_prep_started_at THEN
      EXECUTE '
        UPDATE "CustomerOrderItem"
        SET "kitchenStatus" = $1::"OrderStatus", "prepStartedAt" = $2
        WHERE "orderId" = $3
          AND coalesce("kitchenStatus"::text, '''') <> $4
      '
      USING v_item_status, v_now, p_order_id, v_done_status;
    ELSIF v_has_sent_to_kitchen_at THEN
      EXECUTE '
        UPDATE "CustomerOrderItem"
        SET "kitchenStatus" = $1::"OrderStatus", "sentToKitchenAt" = $2
        WHERE "orderId" = $3
          AND coalesce("kitchenStatus"::text, '''') <> $4
      '
      USING v_item_status, v_now, p_order_id, v_done_status;
    ELSE
      EXECUTE '
        UPDATE "CustomerOrderItem"
        SET "kitchenStatus" = $1::"OrderStatus"
        WHERE "orderId" = $2
          AND coalesce("kitchenStatus"::text, '''') <> $3
      '
      USING v_item_status, p_order_id, v_done_status;
    END IF;
  ELSIF p_status = 'READY' THEN
    EXECUTE '
      UPDATE "CustomerOrderItem"
      SET "kitchenStatus" = $1::"OrderStatus", "readyAt" = $2
      WHERE "orderId" = $3
        AND coalesce("kitchenStatus"::text, '''') <> $4
    '
    USING v_item_status, v_now, p_order_id, v_done_status;
  ELSIF p_status = 'SERVED' THEN
    EXECUTE '
      UPDATE "CustomerOrderItem"
      SET "kitchenStatus" = $1::"OrderStatus", "servedAt" = $2
      WHERE "orderId" = $3
    '
    USING v_item_status, v_now, p_order_id;
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION dashboard_summary(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE(
  "totalRevenue" numeric,
  "totalCogs" numeric,
  "totalGrossProfit" numeric,
  "totalOperatingProfit" numeric,
  "totalCovers" bigint,
  "openDays" bigint,
  "avgDailyRevenue" numeric,
  "avgGrossMarginPct" numeric,
  "dateFrom" date,
  "dateTo" date,
  "totalPayrollMmk" numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT ds.*
    FROM "DailySummary" ds
    WHERE (p_from IS NULL OR ds."businessDate" >= p_from)
      AND (p_to IS NULL OR ds."businessDate" <= p_to)
  ),
  agg AS (
    SELECT
      coalesce(sum(f."netSalesMmk"), 0) AS total_revenue,
      coalesce(sum(f."cogsMmk"), 0) AS total_cogs,
      coalesce(sum(f."grossProfitMmk"), 0) AS total_gross_profit,
      coalesce(sum(f."operatingProfitMmk"), 0) AS total_operating_profit,
      coalesce(sum(f."covers"), 0) AS total_covers,
      count(*) FILTER (WHERE f."openStatus" = 'OPEN'::"OpenStatus") AS open_days,
      min(f."businessDate") AS date_from,
      max(f."businessDate") AS date_to
    FROM filtered f
  ),
  payroll AS (
    SELECT coalesce(sum(pr."monthlyTotalMmk"), 0) AS total_payroll
    FROM "PayrollRole" pr
  )
  SELECT
    a.total_revenue,
    a.total_cogs,
    a.total_gross_profit,
    a.total_operating_profit,
    a.total_covers::bigint,
    a.open_days::bigint,
    CASE WHEN a.open_days > 0 THEN round(a.total_revenue / a.open_days, 2) ELSE 0 END,
    CASE WHEN a.total_revenue > 0 THEN round((a.total_gross_profit / a.total_revenue) * 100, 2) ELSE 0 END,
    a.date_from,
    a.date_to,
    p.total_payroll
  FROM agg a
  CROSS JOIN payroll p;
END;
$$;


CREATE OR REPLACE FUNCTION cost_breakdown(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE(
  "cogsMmk" numeric,
  "rentMmk" numeric,
  "waitersSalariesMmk" numeric,
  "chefsSalariesMmk" numeric,
  "otherStaffSalariesMmk" numeric,
  "electricityGridMmk" numeric,
  "generatorFuelMmk" numeric,
  "marketingSocialMmk" numeric,
  "maintenanceSanitationMmk" numeric,
  "consumablesMmk" numeric,
  "fixedOpexTotalMmk" numeric,
  "cardFeesMmk" numeric,
  "bankChargesMmk" numeric,
  "totalOpexMmk" numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    coalesce(sum(ds."cogsMmk"), 0),
    coalesce(sum(ds."rentMmk"), 0),
    coalesce(sum(ds."waitersSalariesMmk"), 0),
    coalesce(sum(ds."chefsSalariesMmk"), 0),
    coalesce(sum(ds."otherStaffSalariesMmk"), 0),
    coalesce(sum(ds."electricityGridMmk"), 0),
    coalesce(sum(ds."generatorFuelMmk"), 0),
    coalesce(sum(ds."marketingSocialMmk"), 0),
    coalesce(sum(ds."maintenanceSanitationMmk"), 0),
    coalesce(sum(ds."consumablesMmk"), 0),
    coalesce(sum(ds."fixedOpexTotalMmk"), 0),
    coalesce(sum(ds."cardFeesMmk"), 0),
    coalesce(sum(ds."bankChargesMmk"), 0),
    coalesce(sum(ds."totalOpexMmk"), 0)
  FROM "DailySummary" ds
  WHERE (p_from IS NULL OR ds."businessDate" >= p_from)
    AND (p_to IS NULL OR ds."businessDate" <= p_to);
END;
$$;


CREATE OR REPLACE FUNCTION top_items(
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE(
  "menuItemId" text,
  "name" text,
  "section" text,
  "totalQty" numeric,
  "totalSalesMmk" numeric,
  "totalCogsMmk" numeric,
  "totalGrossProfit" numeric,
  "imageUrl" text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dis."menuItemId"::text,
    mi."name"::text,
    ms."name"::text,
    coalesce(sum(dis."qty"), 0) AS total_qty,
    coalesce(sum(dis."salesMmk"), 0) AS total_sales,
    coalesce(sum(dis."cogsMmk"), 0) AS total_cogs,
    coalesce(sum(dis."grossProfitMmk"), 0) AS total_gross_profit,
    NULL::text AS image_url
  FROM "DailyItemSale" dis
  JOIN "MenuItem" mi ON mi."id" = dis."menuItemId"
  JOIN "MenuSection" ms ON ms."id" = mi."sectionId"
  WHERE (p_from IS NULL OR dis."businessDate" >= p_from)
    AND (p_to IS NULL OR dis."businessDate" <= p_to)
  GROUP BY dis."menuItemId", mi."name", ms."name"
  ORDER BY coalesce(sum(dis."salesMmk"), 0) DESC
  LIMIT greatest(coalesce(p_limit, 10), 1);
END;
$$;


CREATE OR REPLACE FUNCTION toggle_menu_item_active(
  p_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_active boolean;
BEGIN
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RAISE EXCEPTION 'menu item id is required.';
  END IF;

  UPDATE "MenuItem"
  SET "isActive" = NOT "isActive"
  WHERE "id" = p_id
  RETURNING "isActive" INTO v_is_active;

  IF v_is_active IS NULL THEN
    RAISE EXCEPTION 'Menu item not found.';
  END IF;

  RETURN v_is_active;
END;
$$;


-- Grant execute to service role (already has it by default) and anon
GRANT EXECUTE ON FUNCTION create_customer_order(text, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_kitchen_ticket_status(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION dashboard_summary(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cost_breakdown(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION top_items(date, date, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION toggle_menu_item_active(text) TO anon, authenticated;
