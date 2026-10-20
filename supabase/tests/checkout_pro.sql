-- Disposable PostgreSQL only. Apply all migrations first. This test rolls back.
BEGIN;
DO $$
DECLARE
    u UUID := '91000000-0000-4000-8000-000000000001';
    addr UUID := '91100000-0000-4000-8000-000000000001';
    prod UUID := '91200000-0000-4000-8000-000000000001';
    variant UUID := '91300000-0000-4000-8000-000000000001';
    o JSONB;
    o2 JSONB;
    claim JSONB;
    a UUID;
    oid UUID;
    total INTEGER;
    result JSONB;
    stock_before INTEGER;
BEGIN
    IF has_function_privilege('anon', 'public.claim_checkout_pro(uuid,uuid)', 'EXECUTE') OR
       has_function_privilege('authenticated', 'public.apply_checkout_pro_payment(uuid,text,integer,text,integer,timestamptz)', 'EXECUTE') OR
       has_table_privilege('authenticated', 'public.checkout_pro_sessions', 'SELECT') THEN
        RAISE EXCEPTION 'financial access leaked';
    END IF;
    INSERT INTO auth.users(id,email) VALUES(u,'checkout-pro@example.test');
    INSERT INTO public.addresses(id,user_id,street,number,city,state,zip_code)
        VALUES(addr,u,'Rua Teste','1','São Paulo','SP','01001000');
    INSERT INTO public.products(id,name,slug,price_cents,category,is_active)
        VALUES(prod,'Camiseta Teste','checkout-pro-test',10000,'street',true);
    INSERT INTO public.product_variants(id,product_id,size,stock_quantity,is_active)
        VALUES(variant,prod,'M',20,true);
    o := public.create_checkout_order(u,'checkout-pro-test-order',jsonb_build_array(jsonb_build_object('variantId',variant,'quantity',1)),addr,'pix');
    oid := (o->>'orderId')::UUID;
    a := (o->>'paymentAttemptId')::UUID;
    total := (o->>'totalCents')::INTEGER;
    IF total <> 12000 THEN RAISE EXCEPTION 'authoritative amount wrong'; END IF;
    SET LOCAL ROLE service_role;
    IF (public.claim_checkout_pro(gen_random_uuid(),oid)->>'state') <> 'unavailable' THEN RAISE EXCEPTION 'owner leaked'; END IF;
    claim := public.claim_checkout_pro(u,oid);
    IF claim->>'state' <> 'claimed' OR (claim->'snapshot'->>'totalCents')::INTEGER <> total THEN RAISE EXCEPTION 'claim wrong'; END IF;
    IF public.claim_checkout_pro(u,oid)->>'state' <> 'busy' THEN RAISE EXCEPTION 'duplicate submission'; END IF;
    BEGIN
        PERFORM public.cancel_checkout_order(u,oid);
        RAISE EXCEPTION 'cancel unexpectedly succeeded';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'ORDER_NOT_CANCELLABLE' THEN RAISE; END IF;
    END;
    PERFORM public.finish_checkout_pro(a,'pref-test','https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-test');
    IF public.claim_checkout_pro(u,oid)->>'state' <> 'ready' THEN RAISE EXCEPTION 'preference replay missing'; END IF;
    BEGIN
        PERFORM public.apply_checkout_pro_payment(a,'1001',1,'approved',0,'2030-01-01T00:00:00Z');
        RAISE EXCEPTION 'tampered amount accepted';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'PAYMENT_MISMATCH' THEN RAISE; END IF;
    END;
    SELECT stock_quantity INTO stock_before FROM public.product_variants WHERE id = variant;
    PERFORM public.apply_checkout_pro_payment(a,'1000',total,'rejected',0,'2030-01-01T00:00:00Z');
    IF (SELECT financial_status FROM public.orders WHERE id=oid) <> 'processing' THEN RAISE EXCEPTION 'rejection closed hosted checkout'; END IF;
    PERFORM public.apply_checkout_pro_payment(a,'1001',total,'approved',0,'2030-01-01T00:01:00Z');
    IF (SELECT financial_status FROM public.orders WHERE id=oid) <> 'paid' THEN RAISE EXCEPTION 'approval missing'; END IF;
    result := public.apply_checkout_pro_payment(a,'1001',total,'approved',0,'2030-01-01T00:01:00Z');
    IF result->>'replayed' <> 'true' THEN RAISE EXCEPTION 'event not deduplicated'; END IF;
    PERFORM public.apply_checkout_pro_payment(a,'1001',total,'pending',0,'2030-01-01T00:00:30Z');
    PERFORM public.apply_checkout_pro_payment(a,'1002',total,'rejected',0,'2030-01-01T00:02:00Z');
    IF (SELECT financial_status FROM public.orders WHERE id=oid) <> 'paid' THEN RAISE EXCEPTION 'paid regressed'; END IF;
    IF (SELECT stock_quantity FROM public.product_variants WHERE id=variant) <> stock_before THEN RAISE EXCEPTION 'stock changed twice'; END IF;
    PERFORM public.apply_checkout_pro_payment(a,'1001',total,'approved',1000,'2030-01-01T00:03:00Z');
    IF (SELECT financial_status FROM public.orders WHERE id=oid) <> 'partially_refunded' THEN RAISE EXCEPTION 'partial refund missing'; END IF;
    PERFORM public.apply_checkout_pro_payment(a,'1001',total,'refunded',total,'2030-01-01T00:04:00Z');
    IF (SELECT financial_status FROM public.orders WHERE id=oid) <> 'refunded' THEN RAISE EXCEPTION 'refund missing'; END IF;
    o2 := public.create_checkout_order(u,'checkout-pro-test-order-2',jsonb_build_array(jsonb_build_object('variantId',variant,'quantity',1)),addr,'credit_card');
    PERFORM public.claim_checkout_pro(u,(o2->>'orderId')::UUID);
    BEGIN
        PERFORM public.apply_checkout_pro_payment((o2->>'paymentAttemptId')::UUID,'1001',total,'approved',0,'2030-01-01T00:05:00Z');
        RAISE EXCEPTION 'cross-order payment reused';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'PAYMENT_MISMATCH' THEN RAISE; END IF;
    END;
    IF public.checkout_pro_status(gen_random_uuid(),oid) IS NOT NULL THEN RAISE EXCEPTION 'status owner leaked'; END IF;
END;
$$;
ROLLBACK;
