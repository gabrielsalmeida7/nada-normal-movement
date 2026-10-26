-- Disposable PostgreSQL only. All fixture mutations roll back.
BEGIN;
INSERT INTO auth.users(id,email) VALUES('92000000-0000-4000-8000-000000000001','reconcile@example.test');
INSERT INTO public.addresses(id,user_id,street,number,city,state,zip_code) VALUES
 ('92100000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Teste','1','São Paulo','SP','01001000');
INSERT INTO public.products(id,name,slug,price_cents,category,is_active) VALUES
 ('92200000-0000-4000-8000-000000000001','Reconciliação','reconciliation-test',10000,'street',true);
INSERT INTO public.product_variants(id,product_id,size,stock_quantity,is_active) VALUES
 ('92300000-0000-4000-8000-000000000001','92200000-0000-4000-8000-000000000001','M',100,true);

CREATE FUNCTION pg_temp.new_checkout(k TEXT) RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE o JSONB;
BEGIN
 o:=public.create_checkout_order('92000000-0000-4000-8000-000000000001',k,
  '[{"variantId":"92300000-0000-4000-8000-000000000001","quantity":1}]'::JSONB,
  '92100000-0000-4000-8000-000000000001','pix');
 PERFORM public.claim_checkout_pro_v2('92000000-0000-4000-8000-000000000001',(o->>'orderId')::UUID,'4897243060269064','5855568499515388');
 RETURN o;
END;
$$;
CREATE FUNCTION pg_temp.lease_checkout(a UUID) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE j JSONB;
BEGIN
 UPDATE public.checkout_pro_reconciliation SET next_at=now()+INTERVAL '1 day';
 UPDATE public.checkout_pro_reconciliation SET next_at=now()-INTERVAL '1 second' WHERE attempt_id=a;
 j:=public.claim_checkout_reconciliation('4897243060269064','5855568499515388');
 IF j->>'attemptId' IS DISTINCT FROM a::TEXT THEN RAISE EXCEPTION 'wrong lease candidate'; END IF;
 RETURN (j->>'leaseId')::UUID;
END;
$$;
DO $$
DECLARE o JSONB; a UUID; oid UUID; lease UUID; old_lease UUID; result JSONB; stock INTEGER;
 deadline TIMESTAMPTZ:=now()-INTERVAL '25 hours';
BEGIN
 IF has_table_privilege('anon','public.checkout_pro_reconciliation','SELECT') OR
    has_function_privilege('authenticated','public.claim_checkout_reconciliation(text,text)','EXECUTE') OR
    has_function_privilege('anon','public.apply_checkout_pro_payment_v2(text,text,uuid,text,integer,text,integer,timestamptz,uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'reconciliation access leaked'; END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('claim_checkout_pro_v2','claim_checkout_reconciliation','lock_checkout_reconciliation',
     'save_reconciled_checkout_preference','apply_checkout_pro_payment_v2','finish_checkout_reconciliation')
     AND (p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""'])) THEN RAISE EXCEPTION 'unsafe functions'; END IF;
 SET LOCAL ROLE service_role;
 o:=pg_temp.new_checkout('reconciliation-lease-order'); a:=(o->>'paymentAttemptId')::UUID; oid:=(o->>'orderId')::UUID;
 lease:=pg_temp.lease_checkout(a);
 IF public.claim_checkout_reconciliation('4897243060269064','5855568499515388') IS NOT NULL THEN RAISE EXCEPTION 'double lease'; END IF;
 IF public.claim_checkout_reconciliation('6344920694868580','760330644412079') IS NOT NULL THEN RAISE EXCEPTION 'cross-application lease'; END IF;
 old_lease:=lease;
 UPDATE public.checkout_pro_reconciliation SET lease_until=now()-INTERVAL '1 second' WHERE attempt_id=a;
 lease:=pg_temp.lease_checkout(a);
 IF lease=old_lease THEN RAISE EXCEPTION 'lease was not fenced'; END IF;
 BEGIN
  PERFORM public.save_reconciled_checkout_preference(a,old_lease,'pref-lease','https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-lease');
  RAISE EXCEPTION 'stale worker wrote';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'RECONCILIATION_LEASE_LOST' THEN RAISE; END IF; END;
 PERFORM public.save_reconciled_checkout_preference(a,lease,'pref-lease','https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-lease');
 SELECT stock_quantity INTO stock FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001';
 BEGIN
  PERFORM public.apply_checkout_pro_payment_v2('6344920694868580','760330644412079',a,'2001',12000,'approved',0,now(),lease);
  RAISE EXCEPTION 'cross-application payment accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'APPLICATION_MISMATCH' THEN RAISE; END IF; END;
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2001',12000,'approved',0,now()-INTERVAL '1 minute',lease);
 result:=public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2001',12000,'approved',0,now()-INTERVAL '1 minute',lease);
 IF result->>'replayed'<>'true' THEN RAISE EXCEPTION 'duplicate approval'; END IF;
 PERFORM public.finish_checkout_reconciliation(a,lease,'paid','settled','{}',NULL);
 IF (SELECT financial_status FROM public.orders WHERE id=oid)<>'paid' THEN RAISE EXCEPTION 'missing webhook approval not recovered'; END IF;
 IF (SELECT stock_quantity FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001')<>stock THEN RAISE EXCEPTION 'approval changed stock twice'; END IF;
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2001',12000,'refunded',12000,now());
 IF (SELECT financial_status FROM public.orders WHERE id=oid)<>'refunded' THEN RAISE EXCEPTION 'refund not recovered'; END IF;
 IF (SELECT stock_quantity FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001')<>stock THEN RAISE EXCEPTION 'refund restocked automatically'; END IF;

 o:=pg_temp.new_checkout('reconciliation-release-order'); a:=(o->>'paymentAttemptId')::UUID; oid:=(o->>'orderId')::UUID;
 PERFORM public.finish_checkout_pro(a,'pref-release','https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-release');
 UPDATE public.orders SET reservation_expires_at=deadline WHERE id=oid;
 lease:=pg_temp.lease_checkout(a);
 -- No payments never justifies a release.
 PERFORM public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified','{}',deadline);
 IF (SELECT reservation_state FROM public.orders WHERE id=oid)<>'held' THEN RAISE EXCEPTION 'empty search released stock'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.outbox_jobs WHERE order_id=oid AND job_type='checkout_pro_review') THEN RAISE EXCEPTION 'review not durable'; END IF;
 lease:=pg_temp.lease_checkout(a);
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2002',12000,'cancelled',0,now()-INTERVAL '1 hour',lease);
 SELECT stock_quantity INTO stock FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001';
 result:=public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified',ARRAY['2002'],deadline);
 IF result->>'outcome'<>'terminal' OR (SELECT reservation_state FROM public.orders WHERE id=oid)<>'held' THEN RAISE EXCEPTION 'first scan released stock'; END IF;
 UPDATE public.checkout_pro_reconciliation SET terminal_since=now()-INTERVAL '6 minutes' WHERE attempt_id=a;
 lease:=pg_temp.lease_checkout(a);
 result:=public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified',ARRAY['2002'],deadline);
 IF result->>'outcome'<>'released' OR (SELECT stock_quantity FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001')<>stock+1 THEN
  RAISE EXCEPTION 'confirmed expiry did not release exactly once'; END IF;
 lease:=pg_temp.lease_checkout(a);
 PERFORM public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified',ARRAY['2002'],deadline);
 IF (SELECT stock_quantity FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001')<>stock+1 THEN RAISE EXCEPTION 'released twice'; END IF;
 -- A late approval after stock release is recorded durably for operational review.
 result:=public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2002',12000,'approved',0,now());
 IF result->>'reviewRequired'<>'true' THEN RAISE EXCEPTION 'late approval lost'; END IF;
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2002',12000,'approved',0,now());
 IF (SELECT count(*) FROM public.outbox_jobs WHERE dedupe_key='mp:late-review:2002')<>1 THEN RAISE EXCEPTION 'duplicate late review'; END IF;
 IF (SELECT stock_quantity FROM public.product_variants WHERE id='92300000-0000-4000-8000-000000000001')<>stock+1 THEN RAISE EXCEPTION 'late approval deducted stock'; END IF;

 o:=pg_temp.new_checkout('reconciliation-race-order'); a:=(o->>'paymentAttemptId')::UUID; oid:=(o->>'orderId')::UUID;
 PERFORM public.finish_checkout_pro(a,'pref-race','https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-race');
 UPDATE public.orders SET reservation_expires_at=deadline WHERE id=oid;
 lease:=pg_temp.lease_checkout(a);
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2003',12000,'rejected',0,now()-INTERVAL '1 hour',lease);
 PERFORM public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified',ARRAY['2003'],deadline);
 UPDATE public.checkout_pro_reconciliation SET terminal_since=now()-INTERVAL '6 minutes' WHERE attempt_id=a;
 lease:=pg_temp.lease_checkout(a);
 -- Webhook wins before the second scan finalizes. The stale decision cannot restock.
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2003',12000,'approved',0,now());
 result:=public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified',ARRAY['2003'],deadline);
 IF result->>'outcome'<>'paid' OR (SELECT reservation_state FROM public.orders WHERE id=oid)<>'held' THEN RAISE EXCEPTION 'webhook race released paid stock'; END IF;

 o:=pg_temp.new_checkout('reconciliation-pending-order'); a:=(o->>'paymentAttemptId')::UUID; oid:=(o->>'orderId')::UUID;
 PERFORM public.finish_checkout_pro(a,'pref-pending','https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-pending');
 UPDATE public.orders SET reservation_expires_at=deadline WHERE id=oid;
 lease:=pg_temp.lease_checkout(a);
 PERFORM public.apply_checkout_pro_payment_v2('4897243060269064','5855568499515388',a,'2004',12000,'pending',0,now(),lease);
 PERFORM public.finish_checkout_reconciliation(a,lease,'terminal','terminal_verified',ARRAY['2004'],deadline);
 IF (SELECT reservation_state FROM public.orders WHERE id=oid)<>'held' THEN RAISE EXCEPTION 'pending Pix released'; END IF;
 lease:=pg_temp.lease_checkout(a);
 PERFORM public.finish_checkout_reconciliation(a,lease,'error','reconciliation_failed','{}',NULL);
 IF (SELECT failures FROM public.checkout_pro_reconciliation WHERE attempt_id=a)<>1 THEN RAISE EXCEPTION 'retry not durable'; END IF;
END;
$$;
ROLLBACK;
