-- Execute após aplicar todas as migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -f supabase/tests/appmax_financial_foundation.sql

BEGIN;

DO $$
DECLARE
    table_name TEXT;
    required_tables TEXT[] := ARRAY[
        'payment_attempts',
        'webhook_events',
        'outbox_jobs'
    ];
    required_order_columns TEXT[] := ARRAY[
        'subtotal_cents',
        'discount_cents',
        'currency',
        'financial_status',
        'checkout_source',
        'appmax_order_id',
        'version',
        'paid_at',
        'cancelled_at',
        'refunded_at'
    ];
    required_order_column TEXT;
BEGIN
    FOREACH table_name IN ARRAY required_tables LOOP
        IF to_regclass(format('public.%I', table_name)) IS NULL THEN
            RAISE EXCEPTION 'Tabela financeira ausente: public.%', table_name;
        END IF;

        IF NOT (
            SELECT relrowsecurity
            FROM pg_class
            WHERE oid = to_regclass(format('public.%I', table_name))
        ) THEN
            RAISE EXCEPTION 'RLS não está habilitada em public.%', table_name;
        END IF;

        IF has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
            OR has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
            OR has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
            OR has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
            OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
            OR has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
            OR has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
            OR has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
        THEN
            RAISE EXCEPTION 'Papel de navegador possui privilégio financeiro em public.%', table_name;
        END IF;

        IF NOT has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
            OR NOT has_table_privilege('service_role', format('public.%I', table_name), 'INSERT')
            OR NOT has_table_privilege('service_role', format('public.%I', table_name), 'UPDATE')
            OR NOT has_table_privilege('service_role', format('public.%I', table_name), 'DELETE')
        THEN
            RAISE EXCEPTION 'service_role não possui DML completo em public.%', table_name;
        END IF;
    END LOOP;

    FOREACH required_order_column IN ARRAY required_order_columns LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns AS schema_columns
            WHERE schema_columns.table_schema = 'public'
              AND schema_columns.table_name = 'orders'
              AND schema_columns.column_name = required_order_column
        ) THEN
            RAISE EXCEPTION 'Coluna ausente em public.orders: %', required_order_column;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('orders', 'order_items')
          AND cmd = 'INSERT'
          AND (
              roles @> ARRAY['anon']::name[]
              OR roles @> ARRAY['authenticated']::name[]
              OR roles @> ARRAY['public']::name[]
          )
    ) THEN
        RAISE EXCEPTION 'Policy de INSERT pelo navegador ainda existe em orders/order_items';
    END IF;

    IF has_table_privilege('anon', 'public.orders', 'INSERT')
        OR has_table_privilege('authenticated', 'public.orders', 'INSERT')
        OR has_table_privilege('anon', 'public.order_items', 'INSERT')
        OR has_table_privilege('authenticated', 'public.order_items', 'INSERT')
    THEN
        RAISE EXCEPTION 'INSERT direto ainda está concedido em orders/order_items';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'orders'
          AND policyname = 'Users can view own orders'
          AND cmd = 'SELECT'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'order_items'
          AND policyname = 'Users can view order items of own orders'
          AND cmd = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Policies existentes de leitura própria de pedidos foram removidas';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'addresses'
          AND policyname = 'Users can insert own addresses'
          AND cmd = 'INSERT'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'profiles'
          AND policyname = 'Users can update own profile'
          AND cmd = 'UPDATE'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'products'
          AND policyname = 'Active products are publicly viewable'
          AND cmd = 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Fluxo existente fora de pagamentos perdeu uma policy necessária';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'orders'
          AND indexname = 'idx_orders_appmax_order_id'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'payment_attempts'
          AND indexname = 'idx_payment_attempts_reconciliation'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'webhook_events'
          AND indexname = 'idx_webhook_events_processing_queue'
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'outbox_jobs'
          AND indexname = 'idx_outbox_jobs_claim'
    ) THEN
        RAISE EXCEPTION 'Índice financeiro obrigatório ausente';
    END IF;
END;
$$;

DO $$
DECLARE
    order_id UUID;
BEGIN
    INSERT INTO public.orders (
        total_cents,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        shipping_street,
        shipping_number,
        shipping_city,
        shipping_state,
        shipping_zip_code
    ) VALUES (
        12000,
        10000,
        2000,
        0,
        'Rua de Teste',
        '1',
        'São Paulo',
        'SP',
        '01001000'
    )
    RETURNING id INTO order_id;

    INSERT INTO public.payment_attempts (
        order_id,
        attempt_number,
        idempotency_key,
        method,
        amount_cents
    ) VALUES (
        order_id,
        1,
        'schema-test-payment',
        'pix',
        12000
    );

    BEGIN
        INSERT INTO public.payment_attempts (
            order_id,
            attempt_number,
            idempotency_key,
            method,
            amount_cents
        ) VALUES (
            order_id,
            2,
            'schema-test-payment',
            'credit_card',
            12000
        );
        RAISE EXCEPTION 'Chave idempotente duplicada foi aceita';
    EXCEPTION
        WHEN unique_violation THEN
            NULL;
    END;

    BEGIN
        INSERT INTO public.orders (
            total_cents,
            subtotal_cents,
            shipping_cents,
            discount_cents,
            shipping_street,
            shipping_number,
            shipping_city,
            shipping_state,
            shipping_zip_code
        ) VALUES (
            10000,
            10000,
            2000,
            0,
            'Rua de Teste',
            '2',
            'São Paulo',
            'SP',
            '01001000'
        );
        RAISE EXCEPTION 'Composição de total inválida foi aceita';
    EXCEPTION
        WHEN check_violation THEN
            NULL;
    END;

    BEGIN
        INSERT INTO public.orders (
            financial_status,
            total_cents,
            subtotal_cents,
            shipping_cents,
            discount_cents,
            shipping_street,
            shipping_number,
            shipping_city,
            shipping_state,
            shipping_zip_code
        ) VALUES (
            'paid',
            12000,
            10000,
            2000,
            0,
            'Rua de Teste',
            '3',
            'São Paulo',
            'SP',
            '01001000'
        );
        RAISE EXCEPTION 'Pedido pago sem paid_at foi aceito';
    EXCEPTION
        WHEN check_violation THEN
            NULL;
    END;
END;
$$;

ROLLBACK;
