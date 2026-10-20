/**
 * Regras de frete fixo.
 * Sul/Sudeste: R$ 20 | Demais: R$ 30
 * Frete grátis acima de R$ 300.
 */

import { getShippingCostCents } from "@/lib/shipping-rules";

/**
 * Retorna o valor do frete em reais com base no CEP (UF) e subtotal.
 * Frete grátis se subtotal >= R$ 300.
 */
export function getShippingCost(uf: string, subtotalReais: number): number {
  return getShippingCostCents(uf ?? "", Math.round(subtotalReais * 100)) / 100;
}

/**
 * Extrai UF do CEP via API ViaCEP (para quando o usuário só digitou o CEP).
 * Retorna string vazia se não conseguir.
 */
export async function getUfFromCep(cep: string): Promise<string> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return "";
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    return data?.uf ?? "";
  } catch {
    return "";
  }
}
