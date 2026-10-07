// Estimativa visual da regra SQL `compute_shipping_cents` versão 1.
// Quote e criação de pedido não usam este módulo; a cobrança vem só do Postgres.
const SUL_SUDESTE_UF = new Set(["SP", "RJ", "MG", "ES", "PR", "SC", "RS"]);

export const SHIPPING_SOUTH_SOUTHEAST_CENTS = 2_000;
export const SHIPPING_OTHER_STATES_CENTS = 3_000;
export const FREE_SHIPPING_SUBTOTAL_CENTS = 30_000;

export function getShippingCostCents(state: string, subtotalCents: number): number {
  if (subtotalCents >= FREE_SHIPPING_SUBTOTAL_CENTS) return 0;

  const normalizedState = state.trim().toUpperCase();
  return SUL_SUDESTE_UF.has(normalizedState)
    ? SHIPPING_SOUTH_SOUTHEAST_CENTS
    : SHIPPING_OTHER_STATES_CENTS;
}
