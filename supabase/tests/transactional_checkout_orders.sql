-- Execute em um banco local descartável após aplicar todas as migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -f supabase/tests/transactional_checkout_orders.sql

BEGIN;

DO $$
DECLARE
    attempt_count INTEGER;
    first_result JSONB;
    order_count INTEGER;
    repeated_result JSONB;
    stock INTEGER;
    test_address_id CONSTANT UUID := '91000000-0000-4000-8000-000000000001';
    test_product_id CONSTANT UUID := '92000000-0000-4000-8000-000000000001';
    test_user_id CONSTANT UUID := '93000000-0000-4000-8000-000000000001';
    test_variant_id CONSTANT UUID := '94000000-0000-4000-8000-000000000001';
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'product_variants'
          AND column_name = 'is_active'
          AND is_nullable = 'NO'
          AND column_default = 'true'
    ) THEN
        RAISE EXCEPTION 'product_variants.is_active não possui default/backfill seguro';
    END IF;

    IF has_function_privilege(
        'authenticated',
        'public.create_checkout_order(uuid,text,jsonb,uuid,public.payment_method)',
        'EXECUTE'
    ) THEN
        RAISE EXCEPTION 'authenticated pode executar create_checkout_order diretamente';
    END IF;

    INSERT INTO auth.users (id, email)
    VALUES (test_user_id, 'transactional-checkout@example.test');

    UPDATE public.profiles
    SET full_name = 'Cliente Teste', phone = '11999999999'
    WHERE id = test_user_id;

    INSERT INTO public.addresses (
        id,
        user_id,
        street,
        number,
        city,
        state,
        zip_code
    ) VALUES (
        test_address_id,
        test_user_id,
        'Rua Transacional',
        '42',
        'São Paulo',
        'SP',
        '01001000'
    );

    INSERT INTO public.products (
        id,
        name,
        slug,
        price_cents,
        category,
        is_active
    ) VALUES (
        test_product_id,
        'Produto Transacional',
        'produto-transacional-test',
        18990,
        'street',
        true
    );

    INSERT INTO public.product_variants (
        id,
        product_id,
        size,
        stock_quantity,
        is_active
    ) VALUES (
        test_variant_id,
        test_product_id,
        'M',
        5,
        true
    );

    -- Campos financeiros adulterados são ignorados: a função relê preço,
    -- endereço, frete e usuário das tabelas autoritativas.
    SELECT public.create_checkout_order(
        test_user_id,
        'test-idempotency-authoritative',
        jsonb_build_array(jsonb_build_object(
            'variantId', test_variant_id,
            'quantity', 2,
            'priceCents', 1,
            'totalCents', 2
        )),
        test_address_id,
        'pix'
    )
    INTO first_result;

    IF first_result ->> 'subtotalCents' <> '37980'
        OR first_result ->> 'shippingCents' <> '0'
        OR first_result ->> 'totalCents' <> '37980'
    THEN
        RAISE EXCEPTION 'Pedido aceitou valor adulterado: %', first_result;
    END IF;

    SELECT stock_quantity INTO stock
    FROM public.product_variants
    WHERE id = test_variant_id;
    IF stock <> 3 THEN
        RAISE EXCEPTION 'Reserva inicial incorreta: estoque %', stock;
    END IF;

    SELECT public.create_checkout_order(
        test_user_id,
        'test-idempotency-authoritative',
        jsonb_build_array(jsonb_build_object(
            'variantId', test_variant_id,
            'quantity', 2
        )),
        test_address_id,
        'pix'
    )
    INTO repeated_result;

    IF repeated_result IS DISTINCT FROM first_result THEN
        RAISE EXCEPTION 'Replay idempotente retornou resultado diferente';
    END IF;

    SELECT COUNT(*) INTO order_count
    FROM public.orders
    WHERE user_id = test_user_id;
    SELECT COUNT(*) INTO attempt_count
    FROM public.payment_attempts
    WHERE idempotency_key = 'test-idempotency-authoritative';
    SELECT stock_quantity INTO stock
    FROM public.product_variants
    WHERE id = test_variant_id;

    IF order_count <> 1 OR attempt_count <> 1 OR stock <> 3 THEN
        RAISE EXCEPTION
            'Replay duplicou efeito: pedidos %, tentativas %, estoque %',
            order_count,
            attempt_count,
            stock;
    END IF;

    BEGIN
        PERFORM public.create_checkout_order(
            test_user_id,
            'test-idempotency-authoritative',
            jsonb_build_array(jsonb_build_object(
                'variantId', test_variant_id,
                'quantity', 1
            )),
            test_address_id,
            'pix'
        );
        RAISE EXCEPTION 'Reuso conflitante da chave foi aceito';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'IDEMPOTENCY_CONFLICT' THEN
                RAISE;
            END IF;
    END;

    UPDATE public.product_variants
    SET is_active = false
    WHERE id = test_variant_id;

    BEGIN
        PERFORM public.create_checkout_order(
            test_user_id,
            'test-inactive-variant',
            jsonb_build_array(jsonb_build_object(
                'variantId', test_variant_id,
                'quantity', 1
            )),
            test_address_id,
            'pix'
        );
        RAISE EXCEPTION 'Variante inativa foi aceita';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'VARIANT_UNAVAILABLE' THEN
                RAISE;
            END IF;
    END;

    UPDATE public.product_variants
    SET is_active = true, stock_quantity = 0
    WHERE id = test_variant_id;

    BEGIN
        PERFORM public.create_checkout_order(
            test_user_id,
            'test-insufficient-stock',
            jsonb_build_array(jsonb_build_object(
                'variantId', test_variant_id,
                'quantity', 1
            )),
            test_address_id,
            'credit_card'
        );
        RAISE EXCEPTION 'Pedido sem estoque foi aceito';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            IF SQLERRM <> 'INSUFFICIENT_STOCK' THEN
                RAISE;
            END IF;
    END;

    SELECT COUNT(*) INTO order_count
    FROM public.orders
    WHERE user_id = test_user_id;
    IF order_count <> 1 THEN
        RAISE EXCEPTION 'Estoque insuficiente deixou pedido parcial';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.test_reject_payment_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.idempotency_key = 'test-forced-rollback' THEN
        RAISE EXCEPTION 'forced payment_attempt failure';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER test_reject_payment_attempt
    BEFORE INSERT ON public.payment_attempts
    FOR EACH ROW
    EXECUTE FUNCTION public.test_reject_payment_attempt();

DO $$
DECLARE
    order_count_before INTEGER;
    order_count_after INTEGER;
    stock_after INTEGER;
    test_address_id CONSTANT UUID := '91000000-0000-4000-8000-000000000001';
    test_user_id CONSTANT UUID := '93000000-0000-4000-8000-000000000001';
    test_variant_id CONSTANT UUID := '94000000-0000-4000-8000-000000000001';
BEGIN
    UPDATE public.product_variants
    SET stock_quantity = 2
    WHERE id = test_variant_id;

    SELECT COUNT(*) INTO order_count_before
    FROM public.orders
    WHERE user_id = test_user_id;

    BEGIN
        PERFORM public.create_checkout_order(
            test_user_id,
            'test-forced-rollback',
            jsonb_build_array(jsonb_build_object(
                'variantId', test_variant_id,
                'quantity', 1
            )),
            test_address_id,
            'pix'
        );
        RAISE EXCEPTION 'Falha forçada não interrompeu a transação';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM <> 'forced payment_attempt failure' THEN
                RAISE;
            END IF;
    END;

    SELECT COUNT(*) INTO order_count_after
    FROM public.orders
    WHERE user_id = test_user_id;
    SELECT stock_quantity INTO stock_after
    FROM public.product_variants
    WHERE id = test_variant_id;

    IF order_count_after <> order_count_before OR stock_after <> 2 THEN
        RAISE EXCEPTION
            'Rollback deixou efeito parcial: pedidos antes/depois %/%, estoque %',
            order_count_before,
            order_count_after,
            stock_after;
    END IF;
END;
$$;

ROLLBACK;
