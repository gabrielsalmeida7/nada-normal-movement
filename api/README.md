# API

Os endpoints antigos do Mercado Pago foram removidos.

A integração Appmax será implementada aqui somente após a liberação das
credenciais e a validação do contrato oficial da conta. Até lá, o checkout pode
criar o pedido local e a tentativa `created`, mas não coleta dados de pagamento,
chama gateway ou captura valores.

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
Variantes e produtos inativos são rejeitados.

## Criação transacional do pedido

`POST /api/checkout/order` exige a mesma sessão e o header
`Idempotency-Key`. O corpo aceita somente os dados necessários:

```json
{
  "items": [{ "variantId": "uuid", "quantity": 1 }],
  "shippingAddressId": "uuid",
  "paymentMethod": "pix"
}
```

O backend usa o usuário autenticado, relê endereço, variantes, produtos,
preços e estoque, e executa `create_checkout_order` no Postgres. A transação
trava as variantes em ordem estável, reserva o estoque e cria exatamente um
pedido, seus itens e um `payment_attempt` local. Repetir a mesma chave e o
mesmo payload devolve o resultado original; reutilizar a chave com outro
payload é rejeitado.

O endpoint nunca aceita preço, total, estado de pagamento ou `user_id` do
navegador. Ele não chama Appmax, não captura pagamento e não avança o fluxo de
pagamento.

## Passo 5 — consistência operacional antes da Appmax

O próximo passo técnico permanece separado da integração com a Appmax e trata
do ciclo de vida da reserva e da regra de frete:

- registrar prazo da reserva e liberá-la de forma idempotente quando expirar ou
  quando o pedido for cancelado antes da confirmação; o job de expiração deve
  usar a outbox e nunca incrementar estoque duas vezes;
- substituir a regra duplicada entre TypeScript e SQL por uma única função
  versionada no banco, usada tanto pelo orçamento quanto pela criação do
  pedido; o frontend continua exibindo apenas uma estimativa.

Credenciais, chamadas ao gateway, tokenização e captura de pagamento continuam
fora desse passo.

Variáveis server-side: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e
`SUPABASE_SECRET_KEY`. As variáveis legadas `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` continuam aceitas como fallback.
