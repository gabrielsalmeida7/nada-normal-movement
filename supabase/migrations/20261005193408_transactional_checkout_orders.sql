-- Checkout local autoritativo. Não chama gateway nem captura pagamento.

ALTER TABLE public.product_variants
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

-- Colunas existentes representam variantes já publicadas. O backfill explícito
-- evita transformar registros históricos em indisponíveis durante o deploy.
UPDATE public.product_variants
SET is_active = true
WHERE is_active IS NULL;

ALTER TABLE public.product_variants
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN is_active SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_active_product
    ON public.product_variants(product_id)
    WHERE is_active;

DROP POLICY IF EXISTS "Active product variants are publicly viewable"
    ON public.product_variants;

CREATE POLICY "Active product variants are publicly viewable"
    ON public.product_variants FOR SELECT
    TO public
    USING (
        public.is_admin()
        OR (
            is_active
            AND EXISTS (
                SELECT 1
                FROM public.products
                WHERE products.id = product_variants.product_id
                  AND products.is_active
            )
        )
    );

ALTER TABLE public.payment_attempts
    ADD COLUMN IF NOT EXISTS request_fingerprint JSONB;

UPDATE public.payment_attempts
SET request_fingerprint = '{}'::jsonb
WHERE request_fingerprint IS NULL;

ALTER TABLE public.payment_attempts
    ALTER COLUMN request_fingerprint SET DEFAULT '{}'::jsonb,
    ALTER COLUMN request_fingerprint SET NOT NULL,
    ADD CONSTRAINT payment_attempts_request_fingerprint_object
        CHECK (jsonb_typeof(request_fingerprint) = 'object');

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

    -- Serializa replays concorrentes antes de consultar/criar a tentativa.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_idempotency_key, 0)
    );

    SELECT
        orders.user_id,
        payment_attempts.request_fingerprint,
        jsonb_build_object(
            'orderId', orders.id,
            'paymentAttemptId', payment_attempts.id,
            'status', payment_attempts.status,
            'currency', payment_attempts.currency,
            'subtotalCents', orders.subtotal_cents,
            'shippingCents', orders.shipping_cents,
            'totalCents', orders.total_cents
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

    -- Todas as transações travam variantes em ordem estável para evitar
    -- overselling e reduzir risco de deadlock em carrinhos multi-item.
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

    v_shipping_cents := CASE
        WHEN v_subtotal_cents >= 30000 THEN 0
        WHEN upper(btrim(v_address.state)) IN ('SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS')
            THEN 2000
        ELSE 3000
    END;
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
        shipping_phone
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
        v_profile.phone
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
        updated_at = now()
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

    RETURN jsonb_build_object(
        'orderId', v_order_id,
        'paymentAttemptId', v_attempt_id,
        'status', 'created',
        'currency', 'BRL',
        'subtotalCents', v_subtotal_cents,
        'shippingCents', v_shipping_cents,
        'totalCents', v_total_cents
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order(
    UUID,
    TEXT,
    JSONB,
    UUID,
    public.payment_method
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_checkout_order(
    UUID,
    TEXT,
    JSONB,
    UUID,
    public.payment_method
) TO service_role;

COMMENT ON COLUMN public.product_variants.is_active IS
    'Controla a disponibilidade comercial da variante sem apagar seu histórico.';
COMMENT ON COLUMN public.payment_attempts.request_fingerprint IS
    'Entrada canônica mínima usada para rejeitar reuso conflitante da chave idempotente.';
COMMENT ON FUNCTION public.create_checkout_order(
    UUID,
    TEXT,
    JSONB,
    UUID,
    public.payment_method
) IS
    'Cria pedido, itens, tentativa e reserva de estoque atomicamente; não chama gateway.';
