-- Application-scoped reconciliation. No legacy sessions are silently enrolled.
ALTER TABLE public.checkout_pro_sessions
  ADD COLUMN application_id TEXT,
  ADD COLUMN test_application_id TEXT,
  ADD CONSTRAINT checkout_pro_application_pair CHECK (
    (application_id IS NULL AND test_application_id IS NULL) OR
    (application_id IS NOT NULL AND test_application_id IS NOT NULL AND
      application_id ~ '^[1-9][0-9]{0,19}$' AND test_application_id ~ '^[1-9][0-9]{0,19}$'
      AND application_id <> test_application_id));

CREATE TABLE public.checkout_pro_reconciliation (
  attempt_id UUID PRIMARY KEY REFERENCES public.checkout_pro_sessions(attempt_id) ON DELETE RESTRICT,
  next_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '2 minutes',
  lease_id UUID,
  lease_until TIMESTAMPTZ,
  failures INTEGER NOT NULL DEFAULT 0 CHECK (failures >= 0),
  last_result TEXT CHECK (last_result IN ('paid','pending','review','terminal','error','released')),
  last_reason TEXT,
  terminal_fingerprint TEXT,
  terminal_since TIMESTAMPTZ,
  checked_at TIMESTAMPTZ,
  CHECK ((lease_id IS NULL) = (lease_until IS NULL))
);
CREATE INDEX checkout_pro_reconciliation_due ON public.checkout_pro_reconciliation(next_at, attempt_id);
ALTER TABLE public.checkout_pro_reconciliation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_pro_reconciliation FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.checkout_pro_reconciliation TO service_role;

CREATE FUNCTION public.claim_checkout_pro_v2(p_user_id UUID, p_order_id UUID,
  p_application_id TEXT, p_test_application_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result JSONB; s public.checkout_pro_sessions%ROWTYPE;
BEGIN
  IF p_application_id IS NULL OR p_application_id !~ '^[1-9][0-9]{0,19}$' OR
     p_test_application_id IS NULL OR p_test_application_id !~ '^[1-9][0-9]{0,19}$' OR
     p_application_id = p_test_application_id THEN RAISE EXCEPTION 'INVALID_APPLICATION'; END IF;
  result := public.claim_checkout_pro(p_user_id, p_order_id);
  IF result->>'state' = 'claimed' THEN
    UPDATE public.checkout_pro_sessions SET application_id = p_application_id,
      test_application_id = p_test_application_id WHERE order_id = p_order_id;
  END IF;
  IF result->>'state' IN ('claimed','busy','ready') THEN
    SELECT * INTO s FROM public.checkout_pro_sessions WHERE order_id = p_order_id;
    IF s.application_id IS DISTINCT FROM p_application_id OR
       s.test_application_id IS DISTINCT FROM p_test_application_id THEN
      RETURN jsonb_build_object('state','unavailable');
    END IF;
    INSERT INTO public.checkout_pro_reconciliation(attempt_id) VALUES(s.attempt_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN result;
END;
$$;

CREATE FUNCTION public.claim_checkout_reconciliation(p_application_id TEXT, p_test_application_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE candidate UUID; lease UUID := gen_random_uuid(); result JSONB;
BEGIN
  SELECT r.attempt_id INTO candidate FROM public.checkout_pro_reconciliation r
    JOIN public.checkout_pro_sessions s ON s.attempt_id = r.attempt_id
    WHERE s.application_id = p_application_id AND s.test_application_id = p_test_application_id
      AND r.next_at <= now() AND (r.lease_until IS NULL OR r.lease_until <= now())
    ORDER BY r.next_at, r.attempt_id LIMIT 1 FOR UPDATE OF r SKIP LOCKED;
  IF candidate IS NULL THEN RETURN NULL; END IF;
  UPDATE public.checkout_pro_reconciliation SET lease_id = lease, lease_until = now() + INTERVAL '5 minutes'
    WHERE attempt_id = candidate;
  SELECT jsonb_build_object('attemptId',s.attempt_id,'orderId',s.order_id,'leaseId',lease,
    'totalCents',o.total_cents,'expiresAt',o.reservation_expires_at,'preferenceId',s.preference_id,
    'knownPaymentIds',COALESCE((SELECT jsonb_agg(p.payment_id) FROM
      (SELECT payment_id FROM public.checkout_pro_payments WHERE attempt_id = candidate ORDER BY payment_id LIMIT 10) p),'[]'::JSONB))
    INTO result FROM public.checkout_pro_sessions s JOIN public.orders o ON o.id = s.order_id
    WHERE s.attempt_id = candidate;
  RETURN result;
END;
$$;

-- Common lock order: order -> attempt -> session -> reconciliation lease.
CREATE FUNCTION public.lock_checkout_reconciliation(p_attempt_id UUID, p_lease_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM o.id FROM public.orders o JOIN public.payment_attempts a ON a.order_id = o.id
    WHERE a.id = p_attempt_id FOR UPDATE OF o;
  PERFORM id FROM public.payment_attempts WHERE id = p_attempt_id FOR UPDATE;
  PERFORM attempt_id FROM public.checkout_pro_sessions WHERE attempt_id = p_attempt_id FOR UPDATE;
  PERFORM attempt_id FROM public.checkout_pro_reconciliation WHERE attempt_id = p_attempt_id
    AND lease_id = p_lease_id AND lease_until > clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'RECONCILIATION_LEASE_LOST'; END IF;
END;
$$;

CREATE FUNCTION public.save_reconciled_checkout_preference(p_attempt_id UUID, p_lease_id UUID,
  p_preference_id TEXT, p_checkout_url TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  PERFORM public.lock_checkout_reconciliation(p_attempt_id,p_lease_id);
  RETURN public.finish_checkout_pro(p_attempt_id,p_preference_id,p_checkout_url);
END;
$$;

CREATE FUNCTION public.apply_checkout_pro_payment_v2(p_application_id TEXT, p_test_application_id TEXT,
  p_attempt_id UUID, p_payment_id TEXT, p_amount_cents INTEGER, p_status TEXT,
  p_refunded_cents INTEGER, p_updated_at TIMESTAMPTZ, p_lease_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE o public.orders%ROWTYPE; s public.checkout_pro_sessions%ROWTYPE;
  prior public.checkout_pro_payments%ROWTYPE; saved TEXT;
BEGIN
  SELECT orders.* INTO o FROM public.orders JOIN public.payment_attempts a ON a.order_id = orders.id
    WHERE a.id = p_attempt_id FOR UPDATE OF orders;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  PERFORM id FROM public.payment_attempts WHERE id = p_attempt_id FOR UPDATE;
  SELECT * INTO s FROM public.checkout_pro_sessions WHERE attempt_id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR s.application_id IS DISTINCT FROM p_application_id OR
     s.test_application_id IS DISTINCT FROM p_test_application_id OR p_application_id IS NULL OR
     p_test_application_id IS NULL THEN RAISE EXCEPTION 'APPLICATION_MISMATCH'; END IF;
  IF p_lease_id IS NOT NULL THEN PERFORM public.lock_checkout_reconciliation(p_attempt_id,p_lease_id); END IF;
  IF o.reservation_state = 'held' THEN
    RETURN public.apply_checkout_pro_payment(p_attempt_id,p_payment_id,p_amount_cents,p_status,p_refunded_cents,p_updated_at);
  END IF;
  -- A late payment must be durably visible for review, never silently dropped
  -- and never cause stock already returned to be deducted a second time.
  IF o.reservation_state IS DISTINCT FROM 'released' OR p_amount_cents IS DISTINCT FROM o.total_cents OR
     p_payment_id IS NULL OR p_payment_id !~ '^[0-9]{1,24}$' OR p_updated_at IS NULL OR
     p_status IS NULL OR p_status NOT IN ('pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back') OR
     p_refunded_cents IS NULL OR p_refunded_cents < 0 OR p_refunded_cents > p_amount_cents THEN
    RAISE EXCEPTION 'PAYMENT_MISMATCH';
  END IF;
  SELECT * INTO prior FROM public.checkout_pro_payments WHERE payment_id = p_payment_id FOR UPDATE;
  IF FOUND AND prior.attempt_id <> p_attempt_id THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
  IF prior.provider_updated_at > p_updated_at THEN RETURN jsonb_build_object('ignored',true); END IF;
  INSERT INTO public.checkout_pro_payments(payment_id,attempt_id,provider_updated_at,status,refunded_cents)
    VALUES(p_payment_id,p_attempt_id,p_updated_at,p_status,p_refunded_cents)
    ON CONFLICT(payment_id) DO UPDATE SET provider_updated_at=EXCLUDED.provider_updated_at,
      status=EXCLUDED.status,refunded_cents=EXCLUDED.refunded_cents
      WHERE checkout_pro_payments.attempt_id=EXCLUDED.attempt_id RETURNING payment_id INTO saved;
  IF saved IS NULL THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
  IF p_status NOT IN ('cancelled','rejected') OR p_refunded_cents > 0 THEN
    INSERT INTO public.webhook_events(provider,dedupe_key,event_type,payload,status,processed_at)
      VALUES('mercadopago','mp:late:'||p_payment_id||':'||p_updated_at::TEXT||':'||p_status||':'||p_refunded_cents,
        'payment',jsonb_build_object('paymentId',p_payment_id,'status',p_status,
          'amountCents',p_amount_cents,'reviewRequired',true),'processed',now()) ON CONFLICT(dedupe_key) DO NOTHING;
    INSERT INTO public.outbox_jobs(order_id,job_type,dedupe_key,payload)
      VALUES(o.id,'checkout_pro_review','mp:late-review:'||p_payment_id,
        jsonb_build_object('paymentId',p_payment_id,'reason','payment_after_release')) ON CONFLICT(dedupe_key) DO NOTHING;
    RETURN jsonb_build_object('reviewRequired',true);
  END IF;
  RETURN jsonb_build_object('ignored',true);
END;
$$;

CREATE FUNCTION public.finish_checkout_reconciliation(p_attempt_id UUID,p_lease_id UUID,
  p_result TEXT,p_reason TEXT,p_payment_ids TEXT[],p_preference_expires_at TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE o public.orders%ROWTYPE; s public.checkout_pro_sessions%ROWTYPE;
  r public.checkout_pro_reconciliation%ROWTYPE; fingerprint TEXT; stored_ids TEXT[];
  result TEXT := p_result; reason TEXT := p_reason; units INTEGER; variants INTEGER; affected INTEGER;
BEGIN
  IF p_result IS NULL OR p_result NOT IN ('paid','pending','review','terminal','error') OR
     p_reason IS NULL OR p_reason NOT IN ('settled','awaiting_confirmation','preference_missing','preference_ambiguous',
       'payments_incomplete','payment_review','no_payment_after_expiry','terminal_verified','reconciliation_failed') THEN
    RAISE EXCEPTION 'INVALID_RECONCILIATION'; END IF;
  PERFORM public.lock_checkout_reconciliation(p_attempt_id,p_lease_id);
  SELECT * INTO s FROM public.checkout_pro_sessions WHERE attempt_id=p_attempt_id;
  SELECT * INTO o FROM public.orders WHERE id=s.order_id;
  SELECT * INTO r FROM public.checkout_pro_reconciliation WHERE attempt_id=p_attempt_id;
  IF result <> 'review' AND o.financial_status IN ('paid','partially_refunded','refunded','chargeback') THEN
    result := 'paid'; reason := 'settled';
  END IF;
  IF result = 'terminal' AND o.reservation_state = 'released' THEN result := 'released'; END IF;
  IF result = 'terminal' THEN
    SELECT array_agg(payment_id ORDER BY payment_id),string_agg(payment_id||':'||status||':'||provider_updated_at::TEXT,',' ORDER BY payment_id)
      INTO stored_ids,fingerprint FROM public.checkout_pro_payments WHERE attempt_id=p_attempt_id;
    IF s.preference_id IS NULL OR s.approved_payment_id IS NOT NULL OR p_preference_expires_at IS NULL OR
       p_preference_expires_at > now()-INTERVAL '24 hours' OR o.reservation_expires_at IS NULL OR
       abs(extract(epoch FROM p_preference_expires_at-o.reservation_expires_at)) > 1 OR
       o.reservation_state IS DISTINCT FROM 'held' OR o.financial_status NOT IN ('pending','processing') OR
       p_payment_ids IS NULL OR cardinality(p_payment_ids) NOT BETWEEN 1 AND 10 OR
       stored_ids IS DISTINCT FROM (SELECT array_agg(DISTINCT id ORDER BY id) FROM unnest(p_payment_ids) id) OR
       EXISTS(SELECT 1 FROM public.checkout_pro_payments WHERE attempt_id=p_attempt_id AND (status NOT IN ('rejected','cancelled') OR refunded_cents<>0)) OR
       EXISTS(SELECT 1 FROM public.payment_attempts WHERE order_id=o.id AND id<>p_attempt_id AND status NOT IN ('cancelled','failed')) THEN
      result := 'review'; reason := 'payment_review';
    ELSIF r.terminal_fingerprint IS DISTINCT FROM fingerprint OR r.terminal_since IS NULL THEN
      UPDATE public.checkout_pro_reconciliation SET terminal_fingerprint=fingerprint,terminal_since=now() WHERE attempt_id=p_attempt_id;
    ELSIF r.terminal_since <= now()-INTERVAL '5 minutes' THEN
      SELECT COALESCE(sum(quantity),0),count(DISTINCT product_variant_id) INTO units,variants
        FROM public.order_items WHERE order_id=o.id;
      IF units NOT BETWEEN 1 AND 50 OR variants<1 OR
         EXISTS(SELECT 1 FROM public.order_items WHERE order_id=o.id AND product_variant_id IS NULL) THEN
        RAISE EXCEPTION 'INVALID_RESERVATION'; END IF;
      PERFORM v.id FROM public.product_variants v WHERE v.id IN
        (SELECT product_variant_id FROM public.order_items WHERE order_id=o.id) ORDER BY v.id FOR UPDATE;
      UPDATE public.product_variants v SET stock_quantity=v.stock_quantity+items.quantity,updated_at=now()
        FROM (SELECT product_variant_id,sum(quantity)::INTEGER quantity FROM public.order_items WHERE order_id=o.id GROUP BY product_variant_id) items
        WHERE v.id=items.product_variant_id;
      GET DIAGNOSTICS affected=ROW_COUNT;
      IF affected<>variants THEN RAISE EXCEPTION 'INVALID_RESERVATION'; END IF;
      UPDATE public.orders SET reservation_state='released',reservation_released_at=now(),financial_status='cancelled',
        status='cancelled',cancelled_at=now(),version=version+1,updated_at=now() WHERE id=o.id;
      UPDATE public.payment_attempts SET status='cancelled',resolved_at=now(),updated_at=now() WHERE id=p_attempt_id;
      INSERT INTO public.inventory_reservation_events(order_id,from_state,to_state,reason,stock_units,actor)
        VALUES(o.id,'held','released','expired',units,'checkout_reconciler');
      result := 'released';
    END IF;
  END IF;
  IF result='review' THEN
    INSERT INTO public.outbox_jobs(order_id,job_type,dedupe_key,payload)
      VALUES(o.id,'checkout_pro_review','mp:reconcile-review:'||p_attempt_id||':'||reason,
        jsonb_build_object('attemptId',p_attempt_id,'reason',reason)) ON CONFLICT(dedupe_key) DO NOTHING;
  END IF;
  UPDATE public.checkout_pro_reconciliation SET lease_id=NULL,lease_until=NULL,checked_at=now(),last_result=result,last_reason=reason,
    failures=CASE WHEN result='error' THEN failures+1 ELSE 0 END,
    terminal_fingerprint=CASE WHEN result='terminal' THEN terminal_fingerprint ELSE NULL END,
    terminal_since=CASE WHEN result='terminal' THEN terminal_since ELSE NULL END,
    next_at=now()+CASE WHEN result IN ('paid','review','released') THEN INTERVAL '1 hour'
      WHEN result='error' THEN make_interval(secs=>LEAST(3600,300*(r.failures+1))) ELSE INTERVAL '5 minutes' END
    WHERE attempt_id=p_attempt_id;
  RETURN jsonb_build_object('outcome',result);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_checkout_pro_v2(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.claim_checkout_reconciliation(TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.lock_checkout_reconciliation(UUID,UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_reconciled_checkout_preference(UUID,UUID,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.apply_checkout_pro_payment_v2(TEXT,TEXT,UUID,TEXT,INTEGER,TEXT,INTEGER,TIMESTAMPTZ,UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finish_checkout_reconciliation(UUID,UUID,TEXT,TEXT,TEXT[],TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_pro_v2(UUID,UUID,TEXT,TEXT),
  public.claim_checkout_reconciliation(TEXT,TEXT),public.lock_checkout_reconciliation(UUID,UUID),
  public.save_reconciled_checkout_preference(UUID,UUID,TEXT,TEXT),
  public.apply_checkout_pro_payment_v2(TEXT,TEXT,UUID,TEXT,INTEGER,TEXT,INTEGER,TIMESTAMPTZ,UUID),
  public.finish_checkout_reconciliation(UUID,UUID,TEXT,TEXT,TEXT[],TIMESTAMPTZ) TO service_role;
