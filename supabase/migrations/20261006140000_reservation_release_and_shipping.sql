-- Passo 4.1: prazo da reserva, liberação idempotente e frete versionado.
-- Não chama gateway, não captura pagamento e não altera pedidos já pagos.

CREATE TYPE public.inventory_reservation_state AS ENUM (
    'held',
    'released'
);

ALTER TABLE public.orders
    ADD COLUMN reservation_state public.inventory_reservation_state,
    ADD COLUMN reservation_expires_at TIMESTAMPTZ,
    ADD COLUMN reservation_released_at TIMESTAMPTZ,
    ADD COLUMN shipping_rule_version INTEGER;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_reservation_held_has_expiry
        CHECK (
            reservation_state IS DISTINCT FROM 'held'
            OR reservation_expires_at IS NOT NULL
        ),
    ADD CONSTRAINT orders_reservation_released_has_timestamp
        CHECK (
            reservation_state IS DISTINCT FROM 'released'
            OR reservation_released_at IS NOT NULL
        ),
    ADD CONSTRAINT orders_shipping_rule_version_positive
        CHECK (shipping_rule_version IS NULL OR shipping_rule_version > 0);

CREATE INDEX idx_orders_held_reservation_expiry
    ON public.orders(reservation_expires_at)
    WHERE reservation_state = 'held';

CREATE TABLE public.inventory_reservation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    from_state public.inventory_reservation_state,
    to_state public.inventory_reservation_state NOT NULL,
    reason TEXT NOT NULL,
    stock_units INTEGER NOT NULL,
    actor TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT inventory_reservation_events_reason_known
        CHECK (reason IN ('reserved', 'expired', 'cancelled', 'already_released')),
    CONSTRAINT inventory_reservation_events_actor_not_blank
        CHECK (btrim(actor) <> '' AND char_length(actor) <= 64),
    CONSTRAINT inventory_reservation_events_stock_units_range
        CHECK (stock_units BETWEEN -50 AND 50),
    CONSTRAINT inventory_reservation_events_transition_matches_reason
        CHECK (
            (
                reason = 'reserved'
                AND from_state IS NULL
                AND to_state = 'held'
                AND stock_units < 0
            )
            OR (
                reason IN ('expired', 'cancelled')
                AND from_state = 'held'
                AND to_state = 'released'
                AND stock_units > 0
            )
            OR (
                reason = 'already_released'
                AND from_state = 'released'
                AND to_state = 'released'
                AND stock_units = 0
            )
        )
);

CREATE UNIQUE INDEX idx_inventory_reservation_events_single_hold
    ON public.inventory_reservation_events(order_id)
    WHERE reason = 'reserved';

CREATE UNIQUE INDEX idx_inventory_reservation_events_single_release
    ON public.inventory_reservation_events(order_id)
    WHERE reason IN ('expired', 'cancelled');

CREATE INDEX idx_inventory_reservation_events_order_created
    ON public.inventory_reservation_events(order_id, created_at DESC);

ALTER TABLE public.inventory_reservation_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.inventory_reservation_events FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.inventory_reservation_events TO service_role;

CREATE FUNCTION public.checkout_reservation_ttl()
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT INTERVAL '30 minutes';
$$;

CREATE FUNCTION public.shipping_rule_version()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT 1;
$$;

-- Versão 1: Sul/Sudeste R$ 20, demais UFs R$ 30, grátis a partir de R$ 300.
CREATE FUNCTION public.compute_shipping_cents(
    p_state TEXT,
    p_subtotal_cents BIGINT
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT CASE
        WHEN p_subtotal_cents IS NULL
            OR p_subtotal_cents < 0
            OR p_subtotal_cents > 2147483647
            THEN NULL
        WHEN p_subtotal_cents >= 30000 THEN 0
        WHEN upper(btrim(p_state)) IN ('SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS')
            THEN 2000
        WHEN upper(btrim(p_state)) IN (
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'GO', 'MA', 'MT', 'MS',
            'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO'
        ) THEN 3000
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.create_checkout_order(
    p_user_id UUID,
    p_idempotency_key TEXT,
    p_items JSONB,
    p_shipping_address_id UUID,
    p_payment_method public.payment_method
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_address public.addresses%ROWTYPE;
    v_attempt_id UUID;
    v_existing_fingerprint JSONB;
    v_existing_result JSONB;
    v_existing_user_id UUID;
    v_fingerprint JSONB;
    v_items JSONB;
    v_locked_count INTEGER;
    v_order_id UUID;
    v_profile public.profiles%ROWTYPE;
    v_reservation_expires_at TIMESTAMPTZ;
    v_shipping_cents BIGINT;
    v_subtotal_cents BIGINT;
    v_total_cents BIGINT;
    v_updated_count INTEGER;
BEGIN
    IF p_user_id IS NULL
        OR p_shipping_address_id IS NULL
        OR p_payment_method IS NULL
        OR p_idempotency_key IS NULL
        OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$'
        OR p_items IS NULL
        OR jsonb_typeof(p_items) <> 'array'
        OR jsonb_array_length(p_items) < 1
        OR jsonb_array_length(p_items) > 20
    THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_items) AS item(value)
        WHERE jsonb_typeof(item.value) <> 'object'
           OR jsonb_typeof(item.value -> 'variantId') IS DISTINCT FROM 'string'
           OR (item.value ->> 'variantId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           OR jsonb_typeof(item.value -> 'quantity') IS DISTINCT FROM 'number'
           OR (item.value ->> 'quantity') !~ '^[0-9]{1,2}$'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_items) AS item(value)
        WHERE (item.value ->> 'quantity')::INTEGER NOT BETWEEN 1 AND 10
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'variant_id', requested.variant_id,
            'quantity', requested.quantity
        )
        ORDER BY requested.variant_id
    )
    INTO v_items
    FROM (
        SELECT
            (item.value ->> 'variantId')::UUID AS variant_id,
            SUM((item.value ->> 'quantity')::INTEGER)::INTEGER AS quantity
        FROM jsonb_array_elements(p_items) AS item(value)
        GROUP BY (item.value ->> 'variantId')::UUID
    ) AS requested;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(v_items) AS item(variant_id UUID, quantity INTEGER)
        WHERE item.quantity > 10
    ) OR (
        SELECT SUM(item.quantity)
        FROM jsonb_to_recordset(v_items) AS item(variant_id UUID, quantity INTEGER)
    ) > 50 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    v_fingerprint := jsonb_build_object(
        'items', v_items,
        'paymentMethod', p_payment_method,
        'shippingAddressId', p_shipping_address_id
    );

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_idempotency_key, 0)
    );

    SELECT
        orders.user_id,
        payment_attempts.request_fingerprint,
        jsonb_build_object(
            'orderId', orders.id,
            'paymentAttemptId', payment_attempts.id,
            'status', 'created',
            'currency', payment_attempts.currency,
            'subtotalCents', orders.subtotal_cents,
            'shippingCents', orders.shipping_cents,
            'totalCents', orders.total_cents,
            'reservationExpiresAt', orders.reservation_expires_at,
            'shippingRuleVersion', orders.shipping_rule_version
        )
    INTO
        v_existing_user_id,
        v_existing_fingerprint,
        v_existing_result
    FROM public.payment_attempts
    INNER JOIN public.orders
        ON orders.id = payment_attempts.order_id
    WHERE payment_attempts.idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF v_existing_user_id IS DISTINCT FROM p_user_id
            OR v_existing_fingerprint IS DISTINCT FROM v_fingerprint
        THEN
            RAISE EXCEPTION USING
                ERRCODE = 'P0001',
                MESSAGE = 'IDEMPOTENCY_CONFLICT';
        END IF;

        RETURN v_existing_result;
    END IF;

    SELECT addresses.*
    INTO v_address
    FROM public.addresses
    WHERE addresses.id = p_shipping_address_id
      AND addresses.user_id = p_user_id
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'SHIPPING_ADDRESS_UNAVAILABLE';
    END IF;

    SELECT profiles.*
    INTO v_profile
    FROM public.profiles
    WHERE profiles.id = p_user_id
    FOR SHARE;

    PERFORM product_variants.id
    FROM public.product_variants
    WHERE product_variants.id IN (
        SELECT item.variant_id
        FROM jsonb_to_recordset(v_items)
            AS item(variant_id UUID, quantity INTEGER)
    )
    ORDER BY product_variants.id
    FOR UPDATE;

    SELECT COUNT(*)
    INTO v_locked_count
    FROM public.product_variants
    WHERE product_variants.id IN (
        SELECT item.variant_id
        FROM jsonb_to_recordset(v_items)
            AS item(variant_id UUID, quantity INTEGER)
    );

    IF v_locked_count <> jsonb_array_length(v_items) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'VARIANT_UNAVAILABLE';
    END IF;

    PERFORM products.id
    FROM public.products
    WHERE products.id IN (
        SELECT product_variants.product_id
        FROM public.product_variants
        WHERE product_variants.id IN (
            SELECT item.variant_id
            FROM jsonb_to_recordset(v_items)
                AS item(variant_id UUID, quantity INTEGER)
        )
    )
    ORDER BY products.id
    FOR SHARE;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(v_items)
            AS item(variant_id UUID, quantity INTEGER)
        INNER JOIN public.product_variants
            ON product_variants.id = item.variant_id
        INNER JOIN public.products
            ON products.id = product_variants.product_id
        WHERE NOT product_variants.is_active
           OR NOT products.is_active
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'VARIANT_UNAVAILABLE';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(v_items)
            AS item(variant_id UUID, quantity INTEGER)
        INNER JOIN public.product_variants
            ON product_variants.id = item.variant_id
        WHERE product_variants.stock_quantity < item.quantity
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INSUFFICIENT_STOCK';
    END IF;

    SELECT SUM(products.price_cents::BIGINT * item.quantity)
    INTO v_subtotal_cents
    FROM jsonb_to_recordset(v_items)
        AS item(variant_id UUID, quantity INTEGER)
    INNER JOIN public.product_variants
        ON product_variants.id = item.variant_id
    INNER JOIN public.products
        ON products.id = product_variants.product_id;

    v_shipping_cents := public.compute_shipping_cents(
        v_address.state,
        v_subtotal_cents
    );
    IF v_shipping_cents IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'CHECKOUT_AMOUNT_INVALID';
    END IF;
    v_total_cents := v_subtotal_cents + v_shipping_cents;

    IF v_subtotal_cents IS NULL
        OR v_subtotal_cents <= 0
        OR v_subtotal_cents > 2147483647
        OR v_total_cents > 2147483647
    THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'CHECKOUT_AMOUNT_INVALID';
    END IF;

    v_reservation_expires_at := pg_catalog.now() + public.checkout_reservation_ttl();

    INSERT INTO public.orders (
        user_id,
        status,
        total_cents,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        currency,
        financial_status,
        checkout_source,
        shipping_name,
        shipping_street,
        shipping_number,
        shipping_complement,
        shipping_neighborhood,
        shipping_city,
        shipping_state,
        shipping_zip_code,
        shipping_phone,
        reservation_state,
        reservation_expires_at,
        shipping_rule_version
    ) VALUES (
        p_user_id,
        'pending',
        v_total_cents::INTEGER,
        v_subtotal_cents::INTEGER,
        v_shipping_cents::INTEGER,
        0,
        'BRL',
        'pending',
        'web',
        v_profile.full_name,
        v_address.street,
        v_address.number,
        v_address.complement,
        v_address.neighborhood,
        v_address.city,
        upper(btrim(v_address.state)),
        v_address.zip_code,
        v_profile.phone,
        'held',
        v_reservation_expires_at,
        public.shipping_rule_version()
    )
    RETURNING id INTO v_order_id;

    INSERT INTO public.order_items (
        order_id,
        product_id,
        product_variant_id,
        quantity,
        price_cents_at_purchase
    )
    SELECT
        v_order_id,
        product_variants.product_id,
        product_variants.id,
        item.quantity,
        products.price_cents
    FROM jsonb_to_recordset(v_items)
        AS item(variant_id UUID, quantity INTEGER)
    INNER JOIN public.product_variants
        ON product_variants.id = item.variant_id
    INNER JOIN public.products
        ON products.id = product_variants.product_id;

    UPDATE public.product_variants
    SET
        stock_quantity = product_variants.stock_quantity - item.quantity,
        updated_at = pg_catalog.now()
    FROM jsonb_to_recordset(v_items)
        AS item(variant_id UUID, quantity INTEGER)
    WHERE product_variants.id = item.variant_id
      AND product_variants.stock_quantity >= item.quantity;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> jsonb_array_length(v_items) THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INSUFFICIENT_STOCK';
    END IF;

    INSERT INTO public.payment_attempts (
        order_id,
        attempt_number,
        idempotency_key,
        method,
        status,
        amount_cents,
        currency,
        request_fingerprint
    ) VALUES (
        v_order_id,
        1,
        p_idempotency_key,
        p_payment_method,
        'created',
        v_total_cents::INTEGER,
        'BRL',
        v_fingerprint
    )
    RETURNING id INTO v_attempt_id;

    INSERT INTO public.inventory_reservation_events (
        order_id,
        from_state,
        to_state,
        reason,
        stock_units,
        actor
    )
    SELECT
        v_order_id,
        NULL,
        'held',
        'reserved',
        -SUM(item.quantity)::INTEGER,
        'checkout'
    FROM jsonb_to_recordset(v_items) AS item(variant_id UUID, quantity INTEGER);

    INSERT INTO public.outbox_jobs (
        order_id,
        job_type,
        dedupe_key,
        payload,
        available_at
    ) VALUES (
        v_order_id,
        'release_expired_reservation',
        'release_expired_reservation:' || v_order_id::TEXT,
        jsonb_build_object('orderId', v_order_id),
        v_reservation_expires_at
    );

    RETURN jsonb_build_object(
        'orderId', v_order_id,
        'paymentAttemptId', v_attempt_id,
        'status', 'created',
        'currency', 'BRL',
        'subtotalCents', v_subtotal_cents,
        'shippingCents', v_shipping_cents,
        'totalCents', v_total_cents,
        'reservationExpiresAt', v_reservation_expires_at,
        'shippingRuleVersion', public.shipping_rule_version()
    );
END;
$$;

CREATE FUNCTION public.release_checkout_reservation(
    p_order_id UUID,
    p_reason TEXT,
    p_actor TEXT,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_attempt_count INTEGER;
    v_order public.orders%ROWTYPE;
    v_outcome TEXT;
    v_released BOOLEAN := false;
    v_stock_units INTEGER := 0;
    v_updated_count INTEGER;
    v_variant_count INTEGER;
BEGIN
    IF p_order_id IS NULL
        OR p_reason NOT IN ('expired', 'cancelled')
        OR p_actor IS NULL
        OR btrim(p_actor) = ''
        OR char_length(p_actor) > 64
        OR (p_reason = 'cancelled' AND p_user_id IS NULL)
        OR (p_reason = 'expired' AND p_user_id IS NOT NULL)
    THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    SELECT orders.*
    INTO v_order
    FROM public.orders
    WHERE orders.id = p_order_id
      AND (p_user_id IS NULL OR orders.user_id = p_user_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORDER_NOT_FOUND';
    END IF;

    IF v_order.reservation_state = 'released' THEN
        INSERT INTO public.inventory_reservation_events (
            order_id,
            from_state,
            to_state,
            reason,
            stock_units,
            actor
        ) VALUES (
            v_order.id,
            'released',
            'released',
            'already_released',
            0,
            p_actor
        );

        RETURN jsonb_build_object(
            'orderId', v_order.id,
            'released', false,
            'outcome', 'already_released',
            'stockUnits', 0,
            'reservationState', 'released',
            'financialStatus', v_order.financial_status
        );
    END IF;

    IF v_order.reservation_state IS DISTINCT FROM 'held'
        OR v_order.financial_status IS DISTINCT FROM 'pending'
        OR v_order.status IS DISTINCT FROM 'pending'
        OR EXISTS (
            SELECT 1
            FROM public.payment_attempts
            WHERE payment_attempts.order_id = v_order.id
              AND payment_attempts.status IS DISTINCT FROM 'created'
        )
        OR EXISTS (
            SELECT 1
            FROM public.order_items
            WHERE order_items.order_id = v_order.id
              AND order_items.product_variant_id IS NULL
        )
        OR NOT EXISTS (
            SELECT 1
            FROM public.payment_attempts
            WHERE payment_attempts.order_id = v_order.id
              AND payment_attempts.status = 'created'
        )
    THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORDER_NOT_CANCELLABLE';
    END IF;

    IF p_reason = 'expired' AND v_order.reservation_expires_at > pg_catalog.now() THEN
        RETURN jsonb_build_object(
            'orderId', v_order.id,
            'released', false,
            'outcome', 'not_due',
            'stockUnits', 0,
            'reservationState', 'held',
            'financialStatus', 'pending',
            'reservationExpiresAt', v_order.reservation_expires_at
        );
    END IF;

    SELECT COALESCE(SUM(order_items.quantity), 0)
    INTO v_stock_units
    FROM public.order_items
    WHERE order_items.order_id = v_order.id;

    SELECT COUNT(DISTINCT order_items.product_variant_id)
    INTO v_variant_count
    FROM public.order_items
    WHERE order_items.order_id = v_order.id;

    IF v_stock_units < 1
        OR v_stock_units > 50
        OR v_variant_count < 1
    THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORDER_NOT_CANCELLABLE';
    END IF;

    UPDATE public.orders
    SET
        reservation_state = 'released',
        reservation_released_at = pg_catalog.now(),
        status = 'cancelled',
        financial_status = 'cancelled',
        cancelled_at = pg_catalog.now(),
        version = orders.version + 1,
        updated_at = pg_catalog.now()
    WHERE orders.id = v_order.id
      AND orders.reservation_state = 'held';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> 1 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORDER_NOT_CANCELLABLE';
    END IF;

    PERFORM product_variants.id
    FROM public.product_variants
    WHERE product_variants.id IN (
        SELECT order_items.product_variant_id
        FROM public.order_items
        WHERE order_items.order_id = v_order.id
    )
    ORDER BY product_variants.id
    FOR UPDATE;

    UPDATE public.product_variants
    SET
        stock_quantity = product_variants.stock_quantity + reserved.quantity,
        updated_at = pg_catalog.now()
    FROM (
        SELECT
            order_items.product_variant_id,
            SUM(order_items.quantity)::INTEGER AS quantity
        FROM public.order_items
        WHERE order_items.order_id = v_order.id
        GROUP BY order_items.product_variant_id
    ) AS reserved
    WHERE product_variants.id = reserved.product_variant_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count <> v_variant_count THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORDER_NOT_CANCELLABLE';
    END IF;

    UPDATE public.payment_attempts
    SET
        status = 'cancelled',
        resolved_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    WHERE payment_attempts.order_id = v_order.id
      AND payment_attempts.status = 'created';

    GET DIAGNOSTICS v_attempt_count = ROW_COUNT;
    IF v_attempt_count < 1 THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'ORDER_NOT_CANCELLABLE';
    END IF;

    v_released := true;
    v_outcome := p_reason;

    INSERT INTO public.inventory_reservation_events (
        order_id,
        from_state,
        to_state,
        reason,
        stock_units,
        actor
    ) VALUES (
        v_order.id,
        'held',
        'released',
        p_reason,
        v_stock_units,
        p_actor
    );

    RETURN jsonb_build_object(
        'orderId', v_order.id,
        'released', v_released,
        'outcome', v_outcome,
        'stockUnits', v_stock_units,
        'reservationState', 'released',
        'financialStatus', 'cancelled'
    );
END;
$$;

CREATE FUNCTION public.cancel_checkout_order(
    p_user_id UUID,
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF p_user_id IS NULL OR p_order_id IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    RETURN public.release_checkout_reservation(
        p_order_id,
        'cancelled',
        'customer',
        p_user_id
    );
END;
$$;

CREATE FUNCTION public.process_expired_reservations(
    p_worker_id TEXT,
    p_limit INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_already_released INTEGER := 0;
    v_failed INTEGER := 0;
    v_index INTEGER;
    v_job RECORD;
    v_processed INTEGER := 0;
    v_released INTEGER := 0;
    v_rescheduled INTEGER := 0;
    v_result JSONB;
BEGIN
    IF p_worker_id IS NULL
        OR p_worker_id !~ '^[A-Za-z0-9._:-]{1,64}$'
        OR p_limit IS NULL
        OR p_limit < 1
        OR p_limit > 50
    THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'INVALID_CHECKOUT_PAYLOAD';
    END IF;

    UPDATE public.outbox_jobs
    SET
        status = CASE
            WHEN outbox_jobs.attempts >= outbox_jobs.max_attempts
                THEN 'dead_letter'::public.outbox_job_status
            ELSE 'failed'::public.outbox_job_status
        END,
        available_at = pg_catalog.now(),
        locked_at = NULL,
        locked_by = NULL,
        last_error = 'PROCESSING_LOCK_EXPIRED',
        updated_at = pg_catalog.now()
    WHERE outbox_jobs.job_type = 'release_expired_reservation'
      AND outbox_jobs.status = 'processing'
      AND outbox_jobs.locked_at < pg_catalog.now() - INTERVAL '5 minutes';

    FOR v_index IN 1..p_limit LOOP
        UPDATE public.outbox_jobs AS jobs
        SET
            status = 'processing',
            locked_at = pg_catalog.now(),
            locked_by = p_worker_id,
            attempts = jobs.attempts + 1,
            updated_at = pg_catalog.now()
        WHERE jobs.id = (
            SELECT candidate.id
            FROM public.outbox_jobs AS candidate
            WHERE candidate.job_type = 'release_expired_reservation'
              AND candidate.status IN ('pending', 'failed')
              AND candidate.available_at <= pg_catalog.now()
              AND candidate.attempts < candidate.max_attempts
            ORDER BY candidate.available_at, candidate.created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING jobs.id, jobs.order_id, jobs.attempts, jobs.max_attempts
        INTO v_job;

        EXIT WHEN NOT FOUND;

        v_processed := v_processed + 1;

        BEGIN
            v_result := public.release_checkout_reservation(
                v_job.order_id,
                'expired',
                'expiration_processor',
                NULL
            );

            IF v_result ->> 'outcome' = 'not_due' THEN
                UPDATE public.outbox_jobs
                SET
                    status = 'pending',
                    attempts = GREATEST(outbox_jobs.attempts - 1, 0),
                    available_at = COALESCE(
                        (v_result ->> 'reservationExpiresAt')::TIMESTAMPTZ,
                        pg_catalog.now() + public.checkout_reservation_ttl()
                    ),
                    locked_at = NULL,
                    locked_by = NULL,
                    updated_at = pg_catalog.now()
                WHERE outbox_jobs.id = v_job.id;
                v_rescheduled := v_rescheduled + 1;
            ELSE
                UPDATE public.outbox_jobs
                SET
                    status = 'completed',
                    completed_at = pg_catalog.now(),
                    locked_at = NULL,
                    locked_by = NULL,
                    last_error = NULL,
                    updated_at = pg_catalog.now()
                WHERE outbox_jobs.id = v_job.id;

                IF COALESCE((v_result ->> 'released')::BOOLEAN, false) THEN
                    v_released := v_released + 1;
                ELSE
                    v_already_released := v_already_released + 1;
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                UPDATE public.outbox_jobs
                SET
                    status = CASE
                        WHEN v_job.attempts >= v_job.max_attempts
                            THEN 'dead_letter'::public.outbox_job_status
                        ELSE 'failed'::public.outbox_job_status
                    END,
                    available_at = pg_catalog.now() + INTERVAL '5 minutes',
                    locked_at = NULL,
                    locked_by = NULL,
                    last_error = left(SQLERRM, 200),
                    updated_at = pg_catalog.now()
                WHERE outbox_jobs.id = v_job.id;
                v_failed := v_failed + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'processed', v_processed,
        'released', v_released,
        'alreadyReleased', v_already_released,
        'rescheduled', v_rescheduled,
        'failed', v_failed
    );
END;
$$;

REVOKE ALL ON FUNCTION public.checkout_reservation_ttl() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shipping_rule_version() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.compute_shipping_cents(TEXT, BIGINT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_checkout_reservation(UUID, TEXT, TEXT, UUID)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_checkout_order(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_expired_reservations(TEXT, INTEGER)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.checkout_reservation_ttl() TO service_role;
GRANT EXECUTE ON FUNCTION public.shipping_rule_version() TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_shipping_cents(TEXT, BIGINT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_checkout_reservation(UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_checkout_order(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_expired_reservations(TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION public.compute_shipping_cents(TEXT, BIGINT) IS
    'Fonte única da regra de frete versão 1, em centavos. Quote e pedido devem usar somente esta função.';
COMMENT ON FUNCTION public.release_checkout_reservation(UUID, TEXT, TEXT, UUID) IS
    'Libera uma reserva held uma única vez. Chamadas concorrentes não devolvem estoque duas vezes.';
COMMENT ON FUNCTION public.cancel_checkout_order(UUID, UUID) IS
    'Cancela pedido próprio ainda não submetido ao pagamento e libera a reserva de forma idempotente.';
COMMENT ON FUNCTION public.process_expired_reservations(TEXT, INTEGER) IS
    'Processa a outbox de reservas vencidas com SKIP LOCKED, sem devolver estoque de pedido já liberado.';
COMMENT ON TABLE public.inventory_reservation_events IS
    'Trilha append-only das transições de reserva. A liberação com estoque é única por pedido.';
COMMENT ON COLUMN public.orders.reservation_expires_at IS
    'Prazo da reserva de estoque criada no checkout, antes da confirmação de pagamento.';
