-- Add ACCEPTED to the OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';

-- Replace the status-update function with a clean, simple version
CREATE OR REPLACE FUNCTION update_kitchen_order_status(
  p_order_id text,
  p_status text  -- 'ACCEPTED', 'SERVED', 'CANCELLED'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_status NOT IN ('ACCEPTED', 'SERVED', 'CANCELLED') THEN
    RAISE EXCEPTION 'status must be ACCEPTED, SERVED, or CANCELLED';
  END IF;

  UPDATE "CustomerOrder"
    SET "status" = p_status::"OrderStatus"
    WHERE "id" = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF p_status = 'SERVED' THEN
    UPDATE "CustomerOrderItem"
      SET "kitchenStatus" = 'SERVED'::"OrderStatus", "servedAt" = v_now
      WHERE "orderId" = p_order_id
        AND "kitchenStatus" <> 'CANCELLED'::"OrderStatus";
  ELSIF p_status = 'CANCELLED' THEN
    UPDATE "CustomerOrderItem"
      SET "kitchenStatus" = 'CANCELLED'::"OrderStatus"
      WHERE "orderId" = p_order_id;
  ELSIF p_status = 'ACCEPTED' THEN
    UPDATE "CustomerOrderItem"
      SET "kitchenStatus" = 'ACCEPTED'::"OrderStatus", "sentToKitchenAt" = v_now
      WHERE "orderId" = p_order_id
        AND "kitchenStatus" <> 'CANCELLED'::"OrderStatus";
  END IF;
END;
$$;

-- Cancel a single item
CREATE OR REPLACE FUNCTION cancel_kitchen_item(
  p_order_id text,
  p_item_id  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_remaining integer;
BEGIN
  UPDATE "CustomerOrderItem"
    SET "kitchenStatus" = 'CANCELLED'::"OrderStatus"
    WHERE "id" = p_item_id
      AND "orderId" = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  SELECT count(*) INTO v_remaining
    FROM "CustomerOrderItem"
    WHERE "orderId" = p_order_id
      AND "kitchenStatus" <> 'CANCELLED'::"OrderStatus";

  IF v_remaining = 0 THEN
    UPDATE "CustomerOrder"
      SET "status" = 'CANCELLED'::"OrderStatus"
      WHERE "id" = p_order_id;
    RETURN jsonb_build_object('orderCancelled', true);
  END IF;

  RETURN jsonb_build_object('orderCancelled', false);
END;
$$;

GRANT EXECUTE ON FUNCTION update_kitchen_order_status(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cancel_kitchen_item(text, text) TO anon, authenticated;