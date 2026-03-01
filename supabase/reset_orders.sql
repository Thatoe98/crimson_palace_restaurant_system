-- ============================================================
-- Reset order tables and fix create_customer_order RPC
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Clear all order data (items first due to FK)
TRUNCATE TABLE "CustomerOrderItem" CASCADE;
TRUNCATE TABLE "CustomerOrder" CASCADE;

-- 2. Replace create_customer_order to always use SENT_TO_KITCHEN directly
CREATE OR REPLACE FUNCTION create_customer_order(
  p_table_id text,
  p_source text,
  p_items jsonb,
  p_notes text
)
RETURNS TABLE(order_id text, order_number text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_ymd text := to_char(current_date, 'YYYYMMDD');
  v_next_seq integer;
  v_order_number text;
  v_order_id text := replace(gen_random_uuid()::text, '-', '');
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
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items must be a non-empty array.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "DiningTable" WHERE "id" = p_table_id AND "isActive" = true) THEN
    RAISE EXCEPTION 'DiningTable does not exist or is inactive.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_menu_item_id := nullif(btrim(v_item ->> 'menu_item_id'), '');
    BEGIN v_qty := (v_item ->> 'qty')::integer; EXCEPTION WHEN others THEN v_qty := NULL; END;
    IF v_menu_item_id IS NULL OR v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Each item needs menu_item_id and qty > 0.';
    END IF;
    SELECT "salesPriceMmk" INTO v_unit_price FROM "MenuItem" WHERE "id" = v_menu_item_id;
    IF v_unit_price IS NULL THEN RAISE EXCEPTION 'Invalid menu_item_id: %', v_menu_item_id; END IF;
    v_line_total := round(v_unit_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_normalized_items := v_normalized_items || jsonb_build_object(
      'menu_item_id', v_menu_item_id, 'qty', v_qty,
      'unit_price_mmk', v_unit_price, 'line_total_mmk', v_line_total,
      'notes', nullif(btrim(v_item ->> 'notes'), '')
    );
  END LOOP;

  PERFORM pg_advisory_xact_lock(hashtext('order_seq_' || v_ymd));
  SELECT coalesce(max((regexp_match("orderNumber", '^ORD-' || v_ymd || '-([0-9]+)$'))[1]::integer), 0) + 1
    INTO v_next_seq FROM "CustomerOrder" WHERE "orderNumber" LIKE 'ORD-' || v_ymd || '-%';
  v_order_number := 'ORD-' || v_ymd || '-' || lpad(v_next_seq::text, 3, '0');

  INSERT INTO "CustomerOrder"
    ("id","orderNumber","tableId","source","status","orderedAt","subtotalMmk","totalMmk","notes")
  VALUES
    (v_order_id, v_order_number, p_table_id, p_source::"OrderSource",
     'SENT_TO_KITCHEN'::"OrderStatus", v_now, v_subtotal, v_subtotal, nullif(btrim(p_notes), ''));

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_normalized_items) LOOP
    INSERT INTO "CustomerOrderItem"
      ("id","orderId","menuItemId","qty","unitPriceMmk","lineTotalMmk","kitchenStatus","sentToKitchenAt","notes")
    VALUES (
      replace(gen_random_uuid()::text, '-', ''), v_order_id,
      v_item->>'menu_item_id', (v_item->>'qty')::numeric,
      (v_item->>'unit_price_mmk')::numeric, (v_item->>'line_total_mmk')::numeric,
      'SENT_TO_KITCHEN'::"OrderStatus", v_now, v_item->>'notes'
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION create_customer_order(text, text, jsonb, text) TO anon, authenticated;