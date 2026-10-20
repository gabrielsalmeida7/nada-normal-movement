#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL para um Postgres local descartável.}"

USER_ID="84000000-0000-4000-8000-000000000001"
ADDRESS_ID="84100000-0000-4000-8000-000000000001"
PRODUCT_ID="84200000-0000-4000-8000-000000000001"
VARIANT_ID="84300000-0000-4000-8000-000000000001"
LOG_DIR="$(mktemp -d)"

cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
DROP TRIGGER IF EXISTS test_hold_reservation_release ON public.inventory_reservation_events;
DROP FUNCTION IF EXISTS public.test_hold_reservation_release();
DELETE FROM public.inventory_reservation_events
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.outbox_jobs
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.payment_attempts
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.orders WHERE user_id = '$USER_ID';
DELETE FROM public.products WHERE id = '$PRODUCT_ID';
DELETE FROM public.addresses WHERE id = '$ADDRESS_ID';
DELETE FROM auth.users WHERE id = '$USER_ID';
SQL
  rm -rf "$LOG_DIR"
}

cleanup
mkdir -p "$LOG_DIR"
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
INSERT INTO auth.users (id, email)
VALUES ('$USER_ID', 'reservation-concurrency@example.test');

UPDATE public.profiles
SET full_name = 'Cliente Reserva Concorrente', phone = '11988887777'
WHERE id = '$USER_ID';

INSERT INTO public.addresses (
    id, user_id, street, number, city, state, zip_code
) VALUES (
    '$ADDRESS_ID', '$USER_ID', 'Rua Paralela', '9', 'São Paulo', 'SP', '01001000'
);

INSERT INTO public.products (
    id, name, slug, price_cents, category, is_active
) VALUES (
    '$PRODUCT_ID', 'Produto Reserva', 'produto-reserva-concorrente', 10000, 'street', true
);

INSERT INTO public.product_variants (
    id, product_id, size, stock_quantity, is_active
) VALUES (
    '$VARIANT_ID', '$PRODUCT_ID', 'Único', 10, true
);

CREATE FUNCTION public.test_hold_reservation_release()
RETURNS TRIGGER
LANGUAGE plpgsql
AS \$\$
BEGIN
    IF NEW.reason IN ('expired', 'cancelled') THEN
        PERFORM pg_catalog.pg_sleep(0.4);
    END IF;
    RETURN NEW;
END;
\$\$;

CREATE TRIGGER test_hold_reservation_release
    BEFORE INSERT ON public.inventory_reservation_events
    FOR EACH ROW
    EXECUTE FUNCTION public.test_hold_reservation_release();
SQL

create_order() {
  local idempotency_key="$1"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A <<SQL
SELECT public.create_checkout_order(
    '$USER_ID',
    '$idempotency_key',
    '[{"variantId":"$VARIANT_ID","quantity":3}]'::jsonb,
    '$ADDRESS_ID',
    'pix'
);
SQL
}

assert_single_release() {
  local label="$1"
  read -r stock release_events release_units < <(
    psql "$DATABASE_URL" -At -F ' ' -v ON_ERROR_STOP=1 <<SQL
SELECT
    (SELECT stock_quantity FROM public.product_variants WHERE id = '$VARIANT_ID'),
    (
        SELECT COUNT(*)
        FROM public.inventory_reservation_events
        WHERE reason IN ('expired', 'cancelled')
          AND order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID')
    ),
    (
        SELECT COALESCE(SUM(stock_units), 0)
        FROM public.inventory_reservation_events
        WHERE reason IN ('expired', 'cancelled')
          AND order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID')
    );
SQL
  )

  if [[ "$stock" != "10" || "$release_events" != "1" || "$release_units" != "3" ]]; then
    printf '%s devolveu estoque mais de uma vez: estoque=%s eventos=%s unidades=%s\n' \
      "$label" "$stock" "$release_events" "$release_units" >&2
    exit 1
  fi
}

ORDER_JSON="$(create_order "reservation-cancel-vs-expire")"
ORDER_ID="$(printf '%s' "$ORDER_JSON" | sed -n 's/.*"orderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
if [[ -z "$ORDER_ID" ]]; then
  printf 'Não foi possível ler o pedido concorrente.\n' >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
UPDATE public.orders
SET reservation_expires_at = pg_catalog.now() - INTERVAL '1 minute'
WHERE id = '$ORDER_ID';
UPDATE public.outbox_jobs
SET available_at = pg_catalog.now() - INTERVAL '1 minute'
WHERE order_id = '$ORDER_ID';
SQL

set +e
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A >"$LOG_DIR/cancel.log" 2>&1 <<SQL &
SELECT public.cancel_checkout_order('$USER_ID', '$ORDER_ID');
SQL
cancel_pid=$!
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A >"$LOG_DIR/expire.log" 2>&1 <<SQL &
SELECT public.process_expired_reservations('worker-concurrency', 5);
SQL
expire_pid=$!
wait "$cancel_pid"
cancel_status=$?
wait "$expire_pid"
expire_status=$?
set -e

if [[ "$cancel_status" -ne 0 || "$expire_status" -ne 0 ]]; then
  printf 'Corrida entre cancelamento e expiração falhou.\n' >&2
  cat "$LOG_DIR/cancel.log" "$LOG_DIR/expire.log" >&2
  exit 1
fi

assert_single_release "Cancelamento contra expiração"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
DELETE FROM public.inventory_reservation_events
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.outbox_jobs
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.payment_attempts
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.orders WHERE user_id = '$USER_ID';
UPDATE public.product_variants SET stock_quantity = 10 WHERE id = '$VARIANT_ID';
SQL

ORDER_JSON="$(create_order "reservation-double-cancel")"
ORDER_ID="$(printf '%s' "$ORDER_JSON" | sed -n 's/.*"orderId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

set +e
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A >"$LOG_DIR/cancel-one.log" 2>&1 <<SQL &
SELECT public.cancel_checkout_order('$USER_ID', '$ORDER_ID');
SQL
first_pid=$!
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -t -A >"$LOG_DIR/cancel-two.log" 2>&1 <<SQL &
SELECT public.cancel_checkout_order('$USER_ID', '$ORDER_ID');
SQL
second_pid=$!
wait "$first_pid"
first_status=$?
wait "$second_pid"
second_status=$?
set -e

if [[ "$first_status" -ne 0 || "$second_status" -ne 0 ]]; then
  printf 'Cancelamentos concorrentes falharam.\n' >&2
  cat "$LOG_DIR/cancel-one.log" "$LOG_DIR/cancel-two.log" >&2
  exit 1
fi

assert_single_release "Cancelamento concorrente"
printf 'Concorrência validada para expiração e cancelamento da reserva.\n'
