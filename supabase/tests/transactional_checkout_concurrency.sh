#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Defina DATABASE_URL para um Postgres local descartável.}"

USER_ID="95000000-0000-4000-8000-000000000001"
ADDRESS_ID="96000000-0000-4000-8000-000000000001"
PRODUCT_ID="97000000-0000-4000-8000-000000000001"
VARIANT_ID="98000000-0000-4000-8000-000000000001"
LOG_DIR="$(mktemp -d)"

cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
DROP TRIGGER IF EXISTS test_hold_concurrent_order ON public.orders;
DROP FUNCTION IF EXISTS public.test_hold_concurrent_order();
DELETE FROM public.payment_attempts
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.orders WHERE user_id = '$USER_ID';
DELETE FROM public.products WHERE id = '$PRODUCT_ID';
DELETE FROM auth.users WHERE id = '$USER_ID';
SQL
  rm -rf "$LOG_DIR"
}

cleanup
mkdir -p "$LOG_DIR"
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
INSERT INTO auth.users (id, email)
VALUES ('$USER_ID', 'transactional-concurrency@example.test');

UPDATE public.profiles
SET full_name = 'Cliente Concorrente'
WHERE id = '$USER_ID';

INSERT INTO public.addresses (
    id, user_id, street, number, city, state, zip_code
) VALUES (
    '$ADDRESS_ID', '$USER_ID', 'Rua Concorrente', '1', 'São Paulo', 'SP', '01001000'
);

INSERT INTO public.products (
    id, name, slug, price_cents, category, is_active
) VALUES (
    '$PRODUCT_ID', 'Produto Concorrente', 'produto-concorrente-test', 10000, 'street', true
);

INSERT INTO public.product_variants (
    id, product_id, size, stock_quantity, is_active
) VALUES (
    '$VARIANT_ID', '$PRODUCT_ID', 'Único', 1, true
);

CREATE FUNCTION public.test_hold_concurrent_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS \$\$
BEGIN
    IF NEW.user_id = '$USER_ID' THEN
        PERFORM pg_sleep(1);
    END IF;
    RETURN NEW;
END;
\$\$;

CREATE TRIGGER test_hold_concurrent_order
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.test_hold_concurrent_order();
SQL

run_checkout() {
  local idempotency_key="$1"
  local log_file="$2"

  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >"$log_file" 2>&1 <<SQL
SELECT public.create_checkout_order(
    '$USER_ID',
    '$idempotency_key',
    '[{"variantId":"$VARIANT_ID","quantity":1}]'::jsonb,
    '$ADDRESS_ID',
    'pix'
);
SQL
}

set +e
run_checkout "concurrent-checkout-one" "$LOG_DIR/one.log" &
first_pid=$!
sleep 0.1
run_checkout "concurrent-checkout-two" "$LOG_DIR/two.log" &
second_pid=$!
wait "$first_pid"
first_status=$?
wait "$second_pid"
second_status=$?
set -e

if [[ "$first_status" -eq "$second_status" ]]; then
  printf 'Esperava exatamente um sucesso; status: %s e %s\n' \
    "$first_status" "$second_status" >&2
  exit 1
fi

if ! rg --quiet "INSUFFICIENT_STOCK" "$LOG_DIR/one.log" "$LOG_DIR/two.log"; then
  printf 'A chamada concorrente perdedora não falhou por estoque insuficiente.\n' >&2
  exit 1
fi

read -r stock order_count attempt_count < <(
  psql "$DATABASE_URL" -At -F ' ' -v ON_ERROR_STOP=1 <<SQL
SELECT
    (SELECT stock_quantity FROM public.product_variants WHERE id = '$VARIANT_ID'),
    (SELECT COUNT(*) FROM public.orders WHERE user_id = '$USER_ID'),
    (
        SELECT COUNT(*)
        FROM public.payment_attempts
        WHERE idempotency_key IN ('concurrent-checkout-one', 'concurrent-checkout-two')
    );
SQL
)

if [[ "$stock" != "0" || "$order_count" != "1" || "$attempt_count" != "1" ]]; then
  printf 'Reserva concorrente inválida: estoque=%s pedidos=%s tentativas=%s\n' \
    "$stock" "$order_count" "$attempt_count" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
DELETE FROM public.payment_attempts
WHERE order_id IN (SELECT id FROM public.orders WHERE user_id = '$USER_ID');
DELETE FROM public.orders WHERE user_id = '$USER_ID';
UPDATE public.product_variants
SET stock_quantity = 1
WHERE id = '$VARIANT_ID';
SQL

set +e
run_checkout "concurrent-idempotent-replay" "$LOG_DIR/replay-one.log" &
first_pid=$!
sleep 0.1
run_checkout "concurrent-idempotent-replay" "$LOG_DIR/replay-two.log" &
second_pid=$!
wait "$first_pid"
first_status=$?
wait "$second_pid"
second_status=$?
set -e

if [[ "$first_status" -ne 0 || "$second_status" -ne 0 ]]; then
  printf 'Replay concorrente falhou; status: %s e %s\n' \
    "$first_status" "$second_status" >&2
  exit 1
fi

if ! cmp -s "$LOG_DIR/replay-one.log" "$LOG_DIR/replay-two.log"; then
  printf 'Replay concorrente retornou resultados diferentes.\n' >&2
  exit 1
fi

read -r stock order_count attempt_count < <(
  psql "$DATABASE_URL" -At -F ' ' -v ON_ERROR_STOP=1 <<SQL
SELECT
    (SELECT stock_quantity FROM public.product_variants WHERE id = '$VARIANT_ID'),
    (SELECT COUNT(*) FROM public.orders WHERE user_id = '$USER_ID'),
    (
        SELECT COUNT(*)
        FROM public.payment_attempts
        WHERE idempotency_key = 'concurrent-idempotent-replay'
    );
SQL
)

if [[ "$stock" != "0" || "$order_count" != "1" || "$attempt_count" != "1" ]]; then
  printf 'Replay duplicou efeito: estoque=%s pedidos=%s tentativas=%s\n' \
    "$stock" "$order_count" "$attempt_count" >&2
  exit 1
fi

printf 'Concorrência validada para estoque e replay idempotente.\n'
