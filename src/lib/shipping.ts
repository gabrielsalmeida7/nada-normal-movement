/**
 * Regras de frete fixo.
 * Sul/Sudeste: R$ 20 | Demais: R$ 30
 * Frete grátis acima de R$ 300.
 */

const SUL_SUDESTE_UF = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
const FRETE_SUL_SUDESTE = 20;
const FRETE_DEMAIS = 30;
const SUBTOTAL_FRETE_GRATIS = 300;

/**
 * Retorna o valor do frete em reais com base no CEP (UF) e subtotal.
 * Frete grátis se subtotal >= R$ 300.
 */
export function getShippingCost(uf: string, subtotalReais: number): number {
  if (subtotalReais >= SUBTOTAL_FRETE_GRATIS) return 0;
  const ufUpper = uf?.toUpperCase().trim() ?? "";
  return SUL_SUDESTE_UF.includes(ufUpper) ? FRETE_SUL_SUDESTE : FRETE_DEMAIS;
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
