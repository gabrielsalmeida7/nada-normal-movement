# API

Os endpoints antigos do Mercado Pago foram removidos.

A integração Appmax será implementada aqui somente após a liberação das
credenciais e a validação do contrato oficial da conta. Até lá, o checkout não
deve criar pedidos nem coletar dados de pagamento.

## Orçamento do checkout

`POST /api/checkout/quote` recebe uma sessão Supabase no header
`Authorization: Bearer <token>` e este corpo:

```json
{
  "items": [{ "variantId": "uuid", "quantity": 1 }],
  "shippingState": "SP"
}
```

O endpoint ignora campos adicionais, busca preço, nome, status e estoque no
Supabase e retorna itens, subtotal, frete e total autoritativos em centavos.
Ele não cria pedido, não reserva estoque e não chama gateway de pagamento.

Variáveis server-side: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e
`SUPABASE_SECRET_KEY`. As variáveis legadas `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` continuam aceitas como fallback.
