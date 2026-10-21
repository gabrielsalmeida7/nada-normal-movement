# API

Esta pasta contém os cinco handlers HTTP **legados da Vercel**. O port local foi
preparado em `workers/storefront`, mas ainda falta o aceite remoto antes de
remover estes arquivos. A hospedagem de destino é exclusivamente Cloudflare: não criar novos
deploys Vercel. Núcleos, testes e utilitários ficam em `server/`.
O port, seus critérios de aceite e a retirada do legado estão no
[plano de migração](../docs/MIGRACAO_CLOUDFLARE.md).

Os endpoints antigos do Mercado Pago foram removidos.

A integração Appmax foi descartada. A nova fronteira Mercado Pago será o
Cloudflare Worker em `workers/payments`, conforme [roadmap](../roadmap.md) e
[ADR 002](../docs/adr/002-checkout-pro.md). Pedidos, orçamento, cancelamento,
expiração e usuários admin serão portados para o Worker da loja, separado de
pagamentos. Estes arquivos permanecem apenas enquanto o aceite do port está pendente.
Até a integração validada, o checkout pode
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

## Gateway simulado

O contrato `PaymentGateway`, os tipos de pedido, pagamento e resultado, e o
adaptador determinístico ficam em `server/payments`. São utilitários de teste,
não uma API produtiva nem persistência durável para o Worker.

O adaptador não abre conexão de rede. Para uma tentativa explícita, ele devolve
um destes resultados:

- aprovação: tentativa `paid`
- autorização em análise: tentativa `authorized` e `paid: false`
- recusa: tentativa `failed`
- timeout: tentativa `unknown`, sem identificador externo e sem retry cego

A mesma chave de idempotência com o mesmo payload devolve o resultado já
gravado na memória do processo. Repetir um timeout não transforma a tentativa
em aprovação. Outro payload com a mesma chave é rejeitado. Uma chave nova pode
representar outra tentativa.

O adaptador não chama a Appmax, não carrega Appmax JS, não liga o botão de
checkout, não captura pagamento e não grava pedido nem tentativa no banco.
Token opaco de cartão entra somente na validação da tentativa e não volta no
resultado. PAN e CVV são rejeitados.

Variáveis server-side: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e
`SUPABASE_SECRET_KEY`. As variáveis legadas `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` continuam aceitas como fallback.
