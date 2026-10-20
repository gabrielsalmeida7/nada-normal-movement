/**
 * Tipos para endereços (Supabase addresses e formulário de envio).
 */

/** Endereço do Supabase (tabela addresses) */
export interface Address {
  id: string;
  user_id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  zip_code: string;
  created_at: string;
  updated_at: string;
}

/** Endereço de entrega (formulário ou snapshot para pedido) */
export interface ShippingAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code: string;
}

/** Resposta da API ViaCEP */
export interface ViaCepResponse {
  cep: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}
