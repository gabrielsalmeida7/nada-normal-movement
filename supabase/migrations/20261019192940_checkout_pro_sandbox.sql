-- Checkout Pro sandbox: one durable preference claim per transactional attempt.
-- No credentials, raw provider payloads or browser-controlled money in this model.
CREATE TABLE public.checkout_pro_sessions (
    attempt_id UUID PRIMARY KEY REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE RESTRICT,
    preference_id TEXT UNIQUE,
    checkout_url TEXT,
    approved_payment_id TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT checkout_pro_ready_pair CHECK ((preference_id IS NULL) = (checkout_url IS NULL)),
    CONSTRAINT checkout_pro_sandbox_url CHECK (checkout_url IS NULL OR
        checkout_url LIKE 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?%')
);
ALTER TABLE public.checkout_pro_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_pro_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.checkout_pro_sessions TO service_role;

CREATE TABLE public.checkout_pro_payments (
    payment_id TEXT PRIMARY KEY,
    attempt_id UUID NOT NULL REFERENCES public.checkout_pro_sessions(attempt_id),
    provider_updated_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    refunded_cents INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX checkout_pro_payments_attempt ON public.checkout_pro_payments(attempt_id);
ALTER TABLE public.checkout_pro_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_pro_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.checkout_pro_payments TO service_role;

ALTER TABLE public.webhook_events DROP CONSTRAINT webhook_events_provider_appmax;
ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_provider_known
    CHECK (provider IN ('appmax', 'mercadopago'));

CREATE FUNCTION public.claim_checkout_pro(p_user_id UUID, p_order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    o public.orders%ROWTYPE;
    a public.payment_attempts%ROWTYPE;
    s public.checkout_pro_sessions%ROWTYPE;
BEGIN
    SELECT * INTO o FROM public.orders WHERE id = p_order_id AND user_id = p_user_id FOR UPDATE;
    IF NOT FOUND OR o.reservation_state IS DISTINCT FROM 'held' OR o.financial_status NOT IN ('pending', 'processing')
        OR o.reservation_expires_at <= now() THEN
        RETURN jsonb_build_object('state', 'unavailable');
    END IF;
    SELECT * INTO s FROM public.checkout_pro_sessions WHERE order_id = o.id;
    IF FOUND THEN
        IF s.preference_id IS NOT NULL THEN
            RETURN jsonb_build_object('state', 'ready', 'preferenceId', s.preference_id, 'checkoutUrl', s.checkout_url);
        END IF;
        RETURN jsonb_build_object('state', 'busy');
    END IF;
    SELECT * INTO a FROM public.payment_attempts WHERE order_id = o.id ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE;
    IF NOT FOUND OR a.status <> 'created' OR a.method NOT IN ('pix', 'credit_card') OR
        a.amount_cents <> o.total_cents OR a.currency <> 'BRL' THEN
        RETURN jsonb_build_object('state', 'unavailable');
    END IF;
    INSERT INTO public.checkout_pro_sessions(attempt_id, order_id) VALUES(a.id, o.id);
    -- Blocks the legacy cancellation/expiry processor before external I/O.
    UPDATE public.payment_attempts SET status = 'submitted', submitted_at = now(), updated_at = now() WHERE id = a.id;
    UPDATE public.orders SET financial_status = 'processing', version = version + 1, updated_at = now() WHERE id = o.id;
    RETURN jsonb_build_object('state', 'claimed', 'snapshot', jsonb_build_object(
        'orderId', o.id, 'attemptId', a.id, 'totalCents', o.total_cents, 'currency', o.currency,
        'method', a.method, 'expiresAt', o.reservation_expires_at));
END;
$$;

CREATE FUNCTION public.finish_checkout_pro(p_attempt_id UUID, p_preference_id TEXT, p_checkout_url TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE s public.checkout_pro_sessions%ROWTYPE;
BEGIN
    IF p_preference_id IS NULL OR length(p_preference_id) NOT BETWEEN 1 AND 200 OR p_checkout_url IS NULL OR
        p_checkout_url NOT LIKE 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?%' THEN
        RAISE EXCEPTION 'INVALID_PREFERENCE';
    END IF;
    -- Match the order -> attempt -> session lock order used by webhook processing.
    PERFORM orders.id FROM public.orders JOIN public.payment_attempts ON payment_attempts.order_id = orders.id
        WHERE payment_attempts.id = p_attempt_id FOR UPDATE OF orders;
    PERFORM id FROM public.payment_attempts WHERE id = p_attempt_id FOR UPDATE;
    SELECT * INTO s FROM public.checkout_pro_sessions WHERE attempt_id = p_attempt_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'CHECKOUT_NOT_CLAIMED'; END IF;
    IF s.preference_id IS NOT NULL AND (s.preference_id <> p_preference_id OR s.checkout_url <> p_checkout_url) THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT';
    END IF;
    UPDATE public.checkout_pro_sessions SET preference_id = p_preference_id, checkout_url = p_checkout_url
        WHERE attempt_id = p_attempt_id;
    UPDATE public.payment_attempts SET status = 'pending', updated_at = now()
        WHERE id = p_attempt_id AND status = 'submitted';
    RETURN jsonb_build_object('saved', true);
END;
$$;

CREATE FUNCTION public.checkout_pro_status(p_user_id UUID, p_order_id UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
    SELECT jsonb_build_object('orderId', id, 'financialStatus', financial_status, 'reservationState', reservation_state)
    FROM public.orders WHERE id = p_order_id AND user_id = p_user_id;
$$;

CREATE FUNCTION public.apply_checkout_pro_payment(
    p_attempt_id UUID, p_payment_id TEXT, p_amount_cents INTEGER, p_status TEXT,
    p_refunded_cents INTEGER, p_updated_at TIMESTAMPTZ
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
    o public.orders%ROWTYPE;
    a public.payment_attempts%ROWTYPE;
    s public.checkout_pro_sessions%ROWTYPE;
    prior public.checkout_pro_payments%ROWTYPE;
    event_key TEXT;
    next_state public.financial_order_status;
BEGIN
    IF p_payment_id IS NULL OR p_payment_id !~ '^[0-9]{1,24}$' OR p_updated_at IS NULL OR
       p_status IS NULL OR p_status NOT IN ('pending','in_process','authorized','approved','rejected','cancelled','refunded','charged_back') OR
       p_amount_cents IS NULL OR p_amount_cents <= 0 OR p_refunded_cents IS NULL OR
       p_refunded_cents < 0 OR p_refunded_cents > p_amount_cents THEN
        RAISE EXCEPTION 'INVALID_PAYMENT';
    END IF;
    -- Lock ordering matches cancellation: order first, then attempt/session.
    SELECT orders.* INTO o FROM public.orders
        JOIN public.payment_attempts ON payment_attempts.order_id = orders.id
        WHERE payment_attempts.id = p_attempt_id FOR UPDATE OF orders;
    IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
    SELECT * INTO a FROM public.payment_attempts WHERE id = p_attempt_id FOR UPDATE;
    SELECT * INTO s FROM public.checkout_pro_sessions WHERE attempt_id = p_attempt_id FOR UPDATE;
    IF NOT FOUND OR a.currency <> 'BRL' OR o.currency <> 'BRL' OR
        a.amount_cents <> p_amount_cents OR o.total_cents <> p_amount_cents OR
        o.reservation_state IS DISTINCT FROM 'held' THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
    event_key := 'mp:payment:' || p_payment_id || ':' || p_updated_at::TEXT || ':' || p_status || ':' || p_refunded_cents;
    IF EXISTS (SELECT 1 FROM public.webhook_events WHERE dedupe_key = event_key) THEN
        RETURN jsonb_build_object('replayed', true);
    END IF;
    SELECT * INTO prior FROM public.checkout_pro_payments WHERE payment_id = p_payment_id FOR UPDATE;
    IF FOUND AND prior.attempt_id <> p_attempt_id THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
    INSERT INTO public.webhook_events(provider, dedupe_key, event_type, payload, status, processed_at)
        VALUES('mercadopago', event_key, 'payment', jsonb_build_object('paymentId', p_payment_id,
        'status', p_status, 'amountCents', p_amount_cents, 'refundedCents', p_refunded_cents), 'processed', now());
    IF prior.provider_updated_at IS NOT NULL AND prior.provider_updated_at > p_updated_at THEN
        RETURN jsonb_build_object('ignored', true);
    END IF;
    INSERT INTO public.checkout_pro_payments(payment_id, attempt_id, provider_updated_at, status, refunded_cents)
        VALUES(p_payment_id, p_attempt_id, p_updated_at, p_status, p_refunded_cents)
        ON CONFLICT(payment_id) DO UPDATE SET provider_updated_at = EXCLUDED.provider_updated_at,
            status = EXCLUDED.status, refunded_cents = EXCLUDED.refunded_cents
        WHERE checkout_pro_payments.attempt_id = EXCLUDED.attempt_id
        RETURNING * INTO prior;
    IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_MISMATCH'; END IF;
    -- One preference can contain rejected attempts followed by an approval.
    -- A rejection must not release inventory while the hosted checkout can still be paid.
    IF s.approved_payment_id IS NOT NULL AND s.approved_payment_id <> p_payment_id THEN
        IF p_status = 'approved' THEN
            INSERT INTO public.outbox_jobs(order_id, job_type, dedupe_key, payload)
                VALUES(o.id, 'checkout_pro_review', 'mp:review:' || p_payment_id,
                    jsonb_build_object('paymentId', p_payment_id, 'reason', 'additional_approval'))
                ON CONFLICT(dedupe_key) DO NOTHING;
        END IF;
        RETURN jsonb_build_object('reviewRequired', true);
    END IF;
    next_state := CASE
        WHEN p_status = 'charged_back' THEN 'chargeback'
        WHEN p_status = 'refunded' OR p_refunded_cents = p_amount_cents THEN 'refunded'
        WHEN p_refunded_cents > 0 THEN 'partially_refunded'
        WHEN p_status = 'approved' THEN 'paid'
        WHEN p_status = 'authorized' THEN 'authorized'
        ELSE 'processing'
    END;
    -- Never regress a settled order because of late/other pending or failed attempts.
    IF o.financial_status IN ('refunded', 'chargeback') OR
       (o.financial_status = 'partially_refunded' AND next_state NOT IN ('refunded','chargeback','partially_refunded')) OR
       (o.financial_status = 'paid' AND next_state NOT IN ('paid','refunded','partially_refunded','chargeback')) THEN
        RETURN jsonb_build_object('ignored', true);
    END IF;
    IF next_state IN ('paid','refunded','partially_refunded','chargeback') THEN
        UPDATE public.checkout_pro_sessions SET approved_payment_id = p_payment_id WHERE attempt_id = a.id;
    END IF;
    UPDATE public.orders SET financial_status = next_state,
        status = CASE WHEN next_state = 'paid' AND status = 'pending' THEN 'paid'::public.order_status ELSE status END,
        paid_at = CASE WHEN next_state IN ('paid','refunded','partially_refunded','chargeback') THEN COALESCE(paid_at, now()) ELSE paid_at END,
        refunded_at = CASE WHEN next_state IN ('refunded','partially_refunded') THEN COALESCE(refunded_at, now()) ELSE refunded_at END,
        version = version + 1, updated_at = now() WHERE id = o.id;
    UPDATE public.payment_attempts SET status = CASE next_state
        WHEN 'processing' THEN 'pending'::public.payment_attempt_status
        ELSE next_state::TEXT::public.payment_attempt_status END,
        resolved_at = CASE WHEN next_state IN ('paid','refunded','partially_refunded','chargeback') THEN now() ELSE resolved_at END,
        updated_at = now() WHERE id = a.id;
    RETURN jsonb_build_object('applied', true);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_checkout_pro(UUID,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_checkout_pro(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.checkout_pro_status(UUID,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_checkout_pro_payment(UUID,TEXT,INTEGER,TEXT,INTEGER,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_checkout_pro(UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_checkout_pro(UUID,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.checkout_pro_status(UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_checkout_pro_payment(UUID,TEXT,INTEGER,TEXT,INTEGER,TIMESTAMPTZ) TO service_role;
