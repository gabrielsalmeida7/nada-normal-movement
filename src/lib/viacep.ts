import type { ViaCepResponse } from "@/types/address";

/**
 * Busca endereço pelo CEP na API ViaCEP.
 * Retorna null se CEP inválido ou não encontrado.
 */
export async function fetchAddressByCep(cep: string): Promise<ViaCepResponse | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data: ViaCepResponse = await res.json();
    if (data?.erro) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Máscara para CEP: 00000-000
 */
export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
