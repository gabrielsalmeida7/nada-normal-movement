-- Execute em um banco local descartável após aplicar todas as migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/reservation_release.sql

BEGIN;

DO $$
DECLARE
    ba_order JSONB;
    ba_stock INTEGER;
    cancel_order JSONB;
    cancel_repeat JSONB;
    cancel_stock INTEGER;
    expired_order JSONB;
    expired_repeat JSONB;
    expired_stock INTEGER;
    paid_stock INTEGER;
    process_repeat JSONB;
    process_result JSONB;
    release_events INTEGER;
    release_units INTEGER;
    sp_order JSONB;
    sp_stock INTEGER;
    submitted_stock INTEGER;
    test_address_ba CONSTANT UUID := '81100000-0000-4000-8000-000000000002';
    test_address_sp CONSTANT UUID := '81100000-0000-4000-8000-000000000001';
    test_address_xx CONSTANT UUID := '81100000-0000-4000-8000-000000000003';
    test_other_user CONSTANT UUID := '81000000-0000-4000-8000-000000000002';
    test_product_free CONSTANT UUID := '82100000-0000-4000-8000-000000000002';
    test_product_paid CONSTANT UUID := '82100000-0000-4000-8000-000000000001';
    test_user_id CONSTANT UUID := '81000000-0000-4000-8000-000000000001';
    test_variant_ba CONSTANT UUID := '83100000-0000-4000-8000-000000000002';
    test_variant_cancel CONSTANT UUID := '83100000-0000-4000-8000-000000000003';
    test_variant_paid CONSTANT UUID := '83100000-0000-4000-8000-000000000004';
    test_variant_sp CONSTANT UUID := '83100000-0000-4000-8000-000000000001';
    test_variant_submitted CONSTANT UUID := '83100000-0000-4000-8000-000000000005';
BEGIN
    IF NOT (
        public.compute_shipping_cents('SP', 29999) = 2000
        AND public.compute_shipping_cents(' sp ', 29999) = 2000
        AND public.compute_shipping_cents('BA', 29999) = 3000
        AND public.compute_shipping_cents('SP', 30000) = 0
        AND public.compute_shipping_cents('BA', 30000) = 0
        AND public.compute_shipping_cents('RJ', 30001) = 0
        AND public.compute_shipping_cents('XX', 1000) IS NULL
        AND public.shipping_rule_version() = 1
    ) THEN
        RAISE EXCEPTION 'Regra de frete divergiu no limiar ou na UF';
    END IF;

    IF has_function_privilege(
        'authenticated',
        'public.compute_shipping_cents(text,bigint)',
        'EXECUTE'
    ) OR has_function_privilege(
        'authenticated',
        'public.cancel_checkout_order(uuid,uuid)',
        'EXECUTE'
    ) OR has_function_privilege(
        'authenticated',
        'public.process_expired_reservations(text,integer)',
        'EXECUTE'
    ) OR has_function_privilege(
        'anon',
        'public.release_checkout_reservation(uuid,text,text,uuid)',
        'EXECUTE'
    ) OR has_table_privilege(
        'anon',
        'public.inventory_reservation_events',
        'SELECT'
    ) THEN
        RAISE EXCEPTION 'Reserva ou frete ficou executável por anon/authenticated';
    END IF;

    INSERT INTO auth.users (id, email)
    VALUES
        (test_user_id, 'reservation-release@example.test'),
        (test_other_user, 'reservation-other@example.test');

    UPDATE public.profiles
    SET full_name = 'Cliente Reserva', phone = '11999999999'
    WHERE id = test_user_id;

    INSERT INTO public.addresses (
        id, user_id, street, number, city, state, zip_code
    ) VALUES
        (test_address_sp, test_user_id, 'Rua Sul', '1', 'São Paulo', 'SP', '01001000'),
        (test_address_ba, test_user_id, 'Rua Norte', '2', 'Salvador', 'BA', '40000000'),
        (test_address_xx, test_user_id, 'Rua Inválida', '3', 'Cidade', 'XX', '00000000');

    INSERT INTO public.products (
        id, name, slug, price_cents, category, is_active
    ) VALUES
        (test_product_paid, 'Produto Limiar', 'produto-limiar-reserva', 29999, 'street', true),
        (test_product_free, 'Produto Frete Grátis', 'produto-frete-gratis-reserva', 30000, 'street', true);

    INSERT INTO public.product_variants (
        id, product_id, size, stock_quantity, is_active
    ) VALUES
        (test_variant_sp, test_product_paid, 'P', 8, true),
        (test_variant_ba, test_product_free, 'M', 8, true),
        (test_variant_cancel, test_product_paid, 'G', 8, true),
        (test_variant_paid, test_product_paid, 'GG', 8, true),
        (test_variant_submitted, test_product_paid, 'U', 8, true);

    SELECT public.create_checkout_order(
        test_user_id,
        'reservation-sp-threshold',
        jsonb_build_array(jsonb_build_object('variantId', test_variant_sp, 'quantity', 1)),
        test_address_sp,
        'pix'
    )
    INTO sp_order;

    IF sp_order ->> 'shippingCents' <> '2000'
        OR sp_order ->> 'subtotalCents' <> '29999'
        OR sp_order ->> 'totalCents' <> '31999'
        OR sp_order ->> 'shippingRuleVersion' <> '1'
        OR (sp_order ->> 'shippingCents')::INTEGER IS DISTINCT FROM public.compute_shipping_cents('SP', 29999)
    THEN
        RAISE EXCEPTION 'Pedido SP divergiu do frete autoritativo: %', sp_order;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.orders
        WHERE id = (sp_order ->> 'orderId')::UUID
          AND shipping_cents = public.compute_shipping_cents(shipping_state, subtotal_cents)
          AND shipping_rule_version = public.shipping_rule_version()
          AND reservation_state = 'held'
          AND reservation_expires_at BETWEEN pg_catalog.now() + INTERVAL '29 minutes'
              AND pg_catalog.now() + INTERVAL '31 minutes'
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.outbox_jobs
        INNER JOIN public.orders ON orders.id = outbox_jobs.order_id
        WHERE outbox_jobs.order_id = (sp_order ->> 'orderId')::UUID
          AND outbox_jobs.job_type = 'release_expired_reservation'
          AND outbox_jobs.status = 'pending'
          AND outbox_jobs.available_at = orders.reservation_expires_at
          AND outbox_jobs.dedupe_key = 'release_expired_reservation:' || orders.id::TEXT
    ) OR NOT EXISTS (
        SELECT 1
        FROM public.inventory_reservation_events
        WHERE order_id = (sp_order ->> 'orderId')::UUID
          AND reason = 'reserved'
          AND stock_units = -1
    ) THEN
        RAISE EXCEPTION 'Reserva inicial não registrou prazo, outbox ou trilha';
    END IF;

    SELECT public.create_checkout_order(
        test_user_id,
        'reservation-ba-free-shipping',
        jsonb_build_array(jsonb_build_object('variantId', test_variant_ba, 'quantity', 1)),
        test_address_ba,
        'pix'
    )
    INTO ba_order;

    IF ba_order ->> 'shippingCents' <> '0'
        OR (ba_order ->> 'shippingCents')::INTEGER IS DISTINCT FROM public.compute_shipping_cents('BA', 30000)
    THEN
        RAISE EXCEPTION 'Pedido no limiar de frete grátis divergiu: %', ba_order;
    END IF;

    BEGIN
        PERFORM public.create_checkout_order(
            test_user_id,
            'reservation-invalid-state',
            jsonb_build_array(jsonb_build_object('variantId', test_variant_cancel, 'quantity', 1)),
            test_address_xx,
            'pix'
        );
        RAISE EXCEPTION 'UF inválida foi aceita no frete';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'CHECKOUT_AMOUNT_INVALID' THEN
                RAISE;
            END IF;
    END;

    UPDATE public.orders
    SET reservation_expires_at = pg_catalog.now() - INTERVAL '1 minute'
    WHERE id = (sp_order ->> 'orderId')::UUID;

    UPDATE public.outbox_jobs
    SET available_at = pg_catalog.now() - INTERVAL '1 minute'
    WHERE order_id = (sp_order ->> 'orderId')::UUID;

    SELECT public.process_expired_reservations('worker-a', 10)
    INTO process_result;

    SELECT stock_quantity INTO expired_stock
    FROM public.product_variants
    WHERE id = test_variant_sp;
    SELECT stock_quantity INTO ba_stock
    FROM public.product_variants
    WHERE id = test_variant_ba;

    IF process_result ->> 'released' <> '1'
        OR process_result ->> 'failed' <> '0'
        OR expired_stock <> 8
        OR ba_stock <> 7
    THEN
        RAISE EXCEPTION
            'Expiração alterou o estoque errado: resultado %, SP %, BA %',
            process_result,
            expired_stock,
            ba_stock;
    END IF;

    SELECT public.process_expired_reservations('worker-b', 10)
    INTO process_repeat;
    SELECT stock_quantity INTO sp_stock
    FROM public.product_variants
    WHERE id = test_variant_sp;

    IF process_repeat ->> 'processed' <> '0' OR sp_stock <> 8 THEN
        RAISE EXCEPTION 'Reprocessar a outbox devolveu estoque de novo: % estoque %', process_repeat, sp_stock;
    END IF;

    SELECT public.cancel_checkout_order(test_user_id, (sp_order ->> 'orderId')::UUID)
    INTO expired_repeat;
    SELECT stock_quantity INTO sp_stock
    FROM public.product_variants
    WHERE id = test_variant_sp;
    SELECT COUNT(*), COALESCE(SUM(stock_units), 0)
    INTO release_events, release_units
    FROM public.inventory_reservation_events
    WHERE order_id = (sp_order ->> 'orderId')::UUID
      AND reason IN ('expired', 'cancelled');

    IF expired_repeat ->> 'released' <> 'false'
        OR expired_repeat ->> 'stockUnits' <> '0'
        OR sp_stock <> 8
        OR release_events <> 1
        OR release_units <> 1
    THEN
        RAISE EXCEPTION 'Cancelar reserva já expirada devolveu estoque outra vez';
    END IF;

    SELECT public.create_checkout_order(
        test_user_id,
        'reservation-repeated-cancel',
        jsonb_build_array(jsonb_build_object('variantId', test_variant_cancel, 'quantity', 2)),
        test_address_sp,
        'credit_card'
    )
    INTO cancel_order;

    SELECT public.cancel_checkout_order(test_user_id, (cancel_order ->> 'orderId')::UUID)
    INTO cancel_repeat;
    IF cancel_repeat ->> 'released' <> 'true' OR cancel_repeat ->> 'stockUnits' <> '2' THEN
        RAISE EXCEPTION 'Primeiro cancelamento não liberou a reserva: %', cancel_repeat;
    END IF;

    SELECT public.cancel_checkout_order(test_user_id, (cancel_order ->> 'orderId')::UUID)
    INTO cancel_repeat;
    SELECT stock_quantity INTO cancel_stock
    FROM public.product_variants
    WHERE id = test_variant_cancel;
    SELECT COUNT(*) INTO release_events
    FROM public.inventory_reservation_events
    WHERE order_id = (cancel_order ->> 'orderId')::UUID
      AND reason = 'cancelled';

    IF cancel_repeat ->> 'released' <> 'false'
        OR cancel_repeat ->> 'stockUnits' <> '0'
        OR cancel_stock <> 8
        OR release_events <> 1
    THEN
        RAISE EXCEPTION 'Cancelamento repetido devolveu estoque outra vez';
    END IF;

    BEGIN
        PERFORM public.cancel_checkout_order(test_other_user, (cancel_order ->> 'orderId')::UUID);
        RAISE EXCEPTION 'Outro usuário cancelou o pedido';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'ORDER_NOT_FOUND' THEN
                RAISE;
            END IF;
    END;

    SELECT public.create_checkout_order(
        test_user_id,
        'reservation-paid-not-cancellable',
        jsonb_build_array(jsonb_build_object('variantId', test_variant_paid, 'quantity', 1)),
        test_address_sp,
        'pix'
    )
    INTO cancel_order;

    UPDATE public.orders
    SET
        status = 'paid',
        financial_status = 'paid',
        paid_at = pg_catalog.now()
    WHERE id = (cancel_order ->> 'orderId')::UUID;

    BEGIN
        PERFORM public.cancel_checkout_order(test_user_id, (cancel_order ->> 'orderId')::UUID);
        RAISE EXCEPTION 'Pedido pago foi cancelado';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'ORDER_NOT_CANCELLABLE' THEN
                RAISE;
            END IF;
    END;

    UPDATE public.outbox_jobs
    SET available_at = pg_catalog.now() - INTERVAL '1 minute'
    WHERE order_id = (cancel_order ->> 'orderId')::UUID;

    SELECT public.process_expired_reservations('worker-paid', 10)
    INTO process_result;
    SELECT stock_quantity INTO paid_stock
    FROM public.product_variants
    WHERE id = test_variant_paid;

    IF process_result ->> 'released' <> '0'
        OR process_result ->> 'failed' <> '1'
        OR paid_stock <> 7
        OR EXISTS (
            SELECT 1
            FROM public.inventory_reservation_events
            WHERE order_id = (cancel_order ->> 'orderId')::UUID
              AND reason IN ('expired', 'cancelled')
        )
    THEN
        RAISE EXCEPTION 'Expiração devolveu estoque de pedido pago: % estoque %', process_result, paid_stock;
    END IF;

    SELECT public.create_checkout_order(
        test_user_id,
        'reservation-submitted-not-cancellable',
        jsonb_build_array(jsonb_build_object('variantId', test_variant_submitted, 'quantity', 1)),
        test_address_sp,
        'pix'
    )
    INTO cancel_order;

    UPDATE public.payment_attempts
    SET status = 'submitted', submitted_at = pg_catalog.now()
    WHERE id = (cancel_order ->> 'paymentAttemptId')::UUID;

    BEGIN
        PERFORM public.cancel_checkout_order(test_user_id, (cancel_order ->> 'orderId')::UUID);
        RAISE EXCEPTION 'Pedido com pagamento submetido foi cancelado';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'ORDER_NOT_CANCELLABLE' THEN
                RAISE;
            END IF;
    END;

    SELECT stock_quantity INTO submitted_stock
    FROM public.product_variants
    WHERE id = test_variant_submitted;
    IF submitted_stock <> 7 THEN
        RAISE EXCEPTION 'Pedido não cancelável alterou estoque: %', submitted_stock;
    END IF;
END;
$$;

ROLLBACK;
