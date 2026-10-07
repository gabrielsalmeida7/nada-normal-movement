# API

Somente os handlers HTTP ficam nesta pasta. Cada arquivo aqui vira uma
Serverless Function no deploy, e o plano Hobby aceita no máximo 12. Núcleos,
testes e utilitários ficam em `server/`.

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

## Reserva e frete

`public.compute_shipping_cents` é a única regra usada pelo orçamento e pela
criação do pedido. O frontend continua exibindo apenas uma estimativa.

Cada pedido novo reserva estoque por 30 minutos e grava uma trilha em
`inventory_reservation_events`, junto de um job `release_expired_reservation`
na outbox. A liberação acontece uma única vez, seja pela expiração ou pelo
cancelamento anterior ao pagamento.

`POST /api/checkout/cancel` exige a sessão do dono e cancela somente pedido
pendente cuja tentativa ainda está `created`. Repetir o cancelamento devolve o
mesmo estado sem somar estoque outra vez.

`POST /api/checkout/expire-reservations` processa a outbox vencida. Exige o
header `x-reservation-processor-secret`, comparado com
`RESERVATION_PROCESSOR_SECRET`. O worker usa `SKIP LOCKED` e não devolve
estoque de reserva já liberada nem de pedido pago ou com pagamento submetido.

Credenciais, chamadas ao gateway, tokenização e captura de pagamento continuam
fora deste passo.

Variáveis server-side: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e
`SUPABASE_SECRET_KEY`. As variáveis legadas `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` continuam aceitas como fallback.
