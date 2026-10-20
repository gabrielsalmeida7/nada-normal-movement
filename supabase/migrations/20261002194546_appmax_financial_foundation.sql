-- Fundação financeira Appmax-ready.
-- Esta migration cria apenas o modelo persistente e endurece o acesso direto.
-- Checkout, criação autoritativa de pedidos e integração Appmax ficam fora deste passo.

CREATE TYPE public.financial_order_status AS ENUM (
    'pending',
    'processing',
    'authorized',
    'paid',
    'failed',
    'cancelled',
    'refund_pending',
    'partially_refunded',
    'refunded',
    'chargeback'
);

CREATE TYPE public.payment_method AS ENUM (
    'pix',
    'credit_card',
    'boleto'
);

CREATE TYPE public.payment_attempt_status AS ENUM (
    'created',
    'submitted',
    'pending',
    'authorized',
    'paid',
    'failed',
    'cancelled',
    'unknown',
    'refund_pending',
    'partially_refunded',
    'refunded',
    'chargeback'
);

CREATE TYPE public.webhook_processing_status AS ENUM (
    'received',
    'processing',
    'processed',
    'failed',
    'ignored'
);

CREATE TYPE public.outbox_job_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'dead_letter'
);

-- O total legado deve incluir frete. Interromper em vez de inventar um
-- subtotal histórico caso existam dados inconsistentes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.orders
        WHERE total_cents < shipping_cents
    ) THEN
        RAISE EXCEPTION
            'orders contém total_cents menor que shipping_cents; corrija antes de aplicar a migration financeira';
    END IF;
END;
$$;

ALTER TABLE public.orders
    ADD COLUMN subtotal_cents INTEGER,
    ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN currency TEXT NOT NULL DEFAULT 'BRL',
    ADD COLUMN financial_status public.financial_order_status NOT NULL DEFAULT 'pending',
    ADD COLUMN checkout_source TEXT NOT NULL DEFAULT 'web',
    ADD COLUMN appmax_order_id TEXT,
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN paid_at TIMESTAMPTZ,
    ADD COLUMN cancelled_at TIMESTAMPTZ,
    ADD COLUMN refunded_at TIMESTAMPTZ;

UPDATE public.orders
SET
    subtotal_cents = total_cents - shipping_cents,
    financial_status = CASE
        WHEN status IN ('paid', 'processing', 'shipped', 'delivered')
            THEN 'paid'::public.financial_order_status
        WHEN status = 'cancelled'
            THEN 'cancelled'::public.financial_order_status
        ELSE 'pending'::public.financial_order_status
    END,
    paid_at = CASE
        WHEN status IN ('paid', 'processing', 'shipped', 'delivered')
            THEN COALESCE(paid_at, updated_at, created_at)
        ELSE paid_at
    END,
    cancelled_at = CASE
        WHEN status = 'cancelled'
            THEN COALESCE(cancelled_at, updated_at, created_at)
        ELSE cancelled_at
    END
WHERE subtotal_cents IS NULL;

ALTER TABLE public.orders
    ALTER COLUMN subtotal_cents SET NOT NULL,
    ADD CONSTRAINT orders_subtotal_cents_nonnegative
        CHECK (subtotal_cents >= 0),
    ADD CONSTRAINT orders_discount_cents_valid
        CHECK (discount_cents >= 0 AND discount_cents <= subtotal_cents),
    ADD CONSTRAINT orders_amount_breakdown_matches_total
        CHECK (total_cents = subtotal_cents - discount_cents + shipping_cents),
    ADD CONSTRAINT orders_currency_iso_4217
        CHECK (currency ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT orders_checkout_source_not_blank
        CHECK (btrim(checkout_source) <> ''),
    ADD CONSTRAINT orders_appmax_order_id_not_blank
        CHECK (appmax_order_id IS NULL OR btrim(appmax_order_id) <> ''),
    ADD CONSTRAINT orders_version_positive
        CHECK (version > 0),
    ADD CONSTRAINT orders_paid_at_matches_status
        CHECK (financial_status <> 'paid' OR paid_at IS NOT NULL),
    ADD CONSTRAINT orders_cancelled_at_matches_status
        CHECK (financial_status <> 'cancelled' OR cancelled_at IS NOT NULL),
    ADD CONSTRAINT orders_refunded_at_matches_status
        CHECK (
            financial_status NOT IN ('partially_refunded', 'refunded')
            OR refunded_at IS NOT NULL
        );

CREATE UNIQUE INDEX idx_orders_appmax_order_id
    ON public.orders(appmax_order_id)
    WHERE appmax_order_id IS NOT NULL;

CREATE INDEX idx_orders_financial_status_created_at
    ON public.orders(financial_status, created_at DESC);

CREATE TABLE public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    attempt_number INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL,
    method public.payment_method NOT NULL,
    status public.payment_attempt_status NOT NULL DEFAULT 'created',
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'BRL',
    appmax_order_id TEXT,
    appmax_payment_id TEXT,
    provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    failure_code TEXT,
    failure_message TEXT,
    submitted_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT payment_attempts_attempt_number_positive
        CHECK (attempt_number > 0),
    CONSTRAINT payment_attempts_idempotency_key_not_blank
        CHECK (btrim(idempotency_key) <> ''),
    CONSTRAINT payment_attempts_amount_positive
        CHECK (amount_cents > 0),
    CONSTRAINT payment_attempts_currency_iso_4217
        CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT payment_attempts_appmax_order_id_not_blank
        CHECK (appmax_order_id IS NULL OR btrim(appmax_order_id) <> ''),
    CONSTRAINT payment_attempts_appmax_payment_id_not_blank
        CHECK (appmax_payment_id IS NULL OR btrim(appmax_payment_id) <> ''),
    CONSTRAINT payment_attempts_provider_metadata_object
        CHECK (jsonb_typeof(provider_metadata) = 'object'),
    CONSTRAINT payment_attempts_order_attempt_unique
        UNIQUE (order_id, attempt_number),
    CONSTRAINT payment_attempts_idempotency_key_unique
        UNIQUE (idempotency_key)
);

CREATE UNIQUE INDEX idx_payment_attempts_appmax_payment_id
    ON public.payment_attempts(appmax_payment_id)
    WHERE appmax_payment_id IS NOT NULL;

CREATE INDEX idx_payment_attempts_order_created_at
    ON public.payment_attempts(order_id, created_at DESC);

CREATE INDEX idx_payment_attempts_reconciliation
    ON public.payment_attempts(status, updated_at)
    WHERE status IN ('submitted', 'pending', 'authorized', 'unknown');

CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'appmax',
    dedupe_key TEXT NOT NULL,
    event_type TEXT NOT NULL,
    app_id TEXT,
    site_id TEXT,
    appmax_order_id TEXT,
    appmax_payment_id TEXT,
    payload JSONB NOT NULL,
    payload_sha256 TEXT,
    status public.webhook_processing_status NOT NULL DEFAULT 'received',
    processing_attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processing_started_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    CONSTRAINT webhook_events_provider_appmax
        CHECK (provider = 'appmax'),
    CONSTRAINT webhook_events_dedupe_key_not_blank
        CHECK (btrim(dedupe_key) <> ''),
    CONSTRAINT webhook_events_event_type_not_blank
        CHECK (btrim(event_type) <> ''),
    CONSTRAINT webhook_events_payload_object
        CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT webhook_events_payload_sha256_format
        CHECK (
            payload_sha256 IS NULL
            OR payload_sha256 ~ '^[0-9a-f]{64}$'
        ),
    CONSTRAINT webhook_events_processing_attempts_nonnegative
        CHECK (processing_attempts >= 0),
    CONSTRAINT webhook_events_dedupe_key_unique
        UNIQUE (dedupe_key)
);

CREATE INDEX idx_webhook_events_processing_queue
    ON public.webhook_events(status, next_retry_at, received_at)
    WHERE status IN ('received', 'failed');

CREATE INDEX idx_webhook_events_appmax_order_id
    ON public.webhook_events(appmax_order_id)
    WHERE appmax_order_id IS NOT NULL;

CREATE INDEX idx_webhook_events_received_at
    ON public.webhook_events(received_at DESC);

CREATE TABLE public.outbox_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    job_type TEXT NOT NULL,
    dedupe_key TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status public.outbox_job_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 10,
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    last_error TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT outbox_jobs_job_type_not_blank
        CHECK (btrim(job_type) <> ''),
    CONSTRAINT outbox_jobs_dedupe_key_not_blank
        CHECK (btrim(dedupe_key) <> ''),
    CONSTRAINT outbox_jobs_payload_object
        CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT outbox_jobs_attempts_nonnegative
        CHECK (attempts >= 0),
    CONSTRAINT outbox_jobs_max_attempts_positive
        CHECK (max_attempts > 0),
    CONSTRAINT outbox_jobs_attempts_within_limit
        CHECK (attempts <= max_attempts),
    CONSTRAINT outbox_jobs_lock_consistent
        CHECK (
            (locked_at IS NULL AND locked_by IS NULL)
            OR (
                locked_at IS NOT NULL
                AND locked_by IS NOT NULL
                AND btrim(locked_by) <> ''
            )
        ),
    CONSTRAINT outbox_jobs_dedupe_key_unique
        UNIQUE (dedupe_key)
);

CREATE INDEX idx_outbox_jobs_claim
    ON public.outbox_jobs(available_at, created_at)
    WHERE status IN ('pending', 'failed');

CREATE INDEX idx_outbox_jobs_order_created_at
    ON public.outbox_jobs(order_id, created_at DESC);

-- Tabelas financeiras são exclusivamente server-side. RLS protege a Data API
-- e os REVOKEs removem a operação antes mesmo da avaliação de policies.
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.outbox_jobs FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.payment_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON TABLE public.outbox_jobs TO service_role;

-- A criação autoritativa será adicionada em outro passo. Até lá, pedidos não
-- podem ser forjados pelo navegador com preço, total ou status arbitrários.
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert order items for own orders" ON public.order_items;

REVOKE INSERT, UPDATE, DELETE
    ON TABLE public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE
    ON TABLE public.order_items FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.orders.payment_id IS
    'Campo legado; novas integrações usam payment_attempts e IDs Appmax dedicados.';
COMMENT ON COLUMN public.orders.financial_status IS
    'Estado financeiro local; separado do status logístico legado do pedido.';
COMMENT ON TABLE public.payment_attempts IS
    'Tentativas de pagamento idempotentes. Nunca armazenar PAN, CVV ou tokens secretos.';
COMMENT ON COLUMN public.payment_attempts.provider_metadata IS
    'Metadados sanitizados do provedor; não armazenar payloads com dados de cartão.';
COMMENT ON TABLE public.webhook_events IS
    'Inbox durável e deduplicada de webhooks; acesso exclusivo do backend.';
COMMENT ON COLUMN public.webhook_events.payload IS
    'Payload recebido para auditoria/reprocessamento; aplicar minimização e retenção LGPD.';
COMMENT ON TABLE public.outbox_jobs IS
    'Efeitos assíncronos idempotentes derivados de transações financeiras.';
