# ADR 001 — Fronteira de pagamentos e contrato v1

Data: 16/10/2026. Estado: aceito para implementação da Fase 0; staging pendente.
Base: `home-v2-contraste`. Fonte do plano: [roadmap](../../roadmap.md).

## Contexto e decisão

A Appmax foi descartada. A fundação existente de preço em centavos, pedido
transacional, locks, idempotência e reservas no Supabase será preservada.
Vercel continua servindo o SPA. Um Cloudflare Worker separado receberá JWT
Supabase, IDs/quantidades e token opaco do Mercado Pago Payment Brick; nunca
PAN/CVV. Access Token, segredo de assinatura e secret Supabase ficam no Worker.
O banco continua a autoridade local; a confirmação externa virá da API Mercado
Pago após validação de vínculo, moeda e valor. Não haverá endpoint de preferência.

`workers/payments` é o limite de runtime: não importar handlers Vercel,
`node:crypto`, `Buffer` ou o ledger em memória do simulado diretamente para o
Worker. Portar núcleos com Web APIs e persistência durável nas próximas fases.
Não alterar migrations aplicadas nem conectar o frontend nesta fase.

## Fronteira desta entrega

Implementados: módulo ES, health, CORS, configuração, logs por allowlist,
ambientes local/staging/production, bloqueio de cobrança e guard de deploy.
As rotas de negócio abaixo são **contratos futuros**, com stubs `503` nesta
fase; autenticação, validação de payload, SQL, cobrança, webhook e cron não
estão implementados. Não retornar sucesso para eventos ainda não persistidos.

`PAYMENTS_ENABLED="false"` é obrigatório. Ausência, valor inválido ou `true`
torna o scaffold indisponível (`503 CONFIGURATION_INVALID`). Quando o adaptador
real existir, o kill switch bloqueará somente novas submissões: status,
webhook e reconciliação continuarão funcionando para pagamentos em trânsito.
Hoje não há pagamentos enviados pelo Worker, então nenhuma dessas rotas roda.

## Contrato HTTP

Respostas são JSON, `Cache-Control: no-store`, com `X-Request-Id` gerado pelo
servidor. Erro: `{ "error": { "code": "..." } }`; não devolver payload,
exception, secret, token, dados pessoais ou resposta bruta do provedor.
CORS aceita somente origens exatas por ambiente, sem wildcard/credenciais de
cookie. Preflight aceita `Authorization`, `Content-Type`, `Idempotency-Key`.
CORS não autentica ninguém; clientes sem `Origin` também precisarão de JWT nas
rotas protegidas quando forem implementadas. Não encaminhar JWT a Mercado Pago.

| Método / rota | Autorização futura | Entrada / saída futura |
| --- | --- | --- |
| `GET /health` | pública | `200 {status,service,version,environment,paymentsEnabled}`; configuração inválida: `503` |
| `POST /v1/checkout/quote` | JWT válido | `{items:[{variantId,quantity}],shippingState}` → `200 {currency,items,subtotalCents,shippingCents,totalCents}` |
| `POST /v1/checkout/orders` | JWT + `Idempotency-Key` | `{items:[{variantId,quantity}],shippingAddressId,paymentMethod}` → `201` novo / `200` replay com `{orderId,paymentAttemptId,status:"created",currency,subtotalCents,shippingCents,totalCents,reservationExpiresAt,shippingRuleVersion}` |
| `POST /v1/checkout/payments` | JWT + dono + `Idempotency-Key` estável da tentativa | `{orderId,paymentAttemptId,paymentMethodId,paymentToken?,installments?,issuerId?}` → `202 {orderId,paymentAttemptId,attemptStatus,financialStatus}` após persistir submissão/resultado; nunca declarar sucesso definitivo só pelo retorno síncrono |
| `GET /v1/checkout/orders/:id/status` | JWT + dono | `200 {orderId,paymentAttemptId,attemptStatus,financialStatus,reservationState,pix?}`; Pix sanitizado: `{qrCode,qrCodeBase64,expiresAt}`, somente para dono e sem token/PII |
| `POST /v1/checkout/orders/:id/cancel` | JWT + dono | sem valores financeiros no body → `200 {orderId,released,stockUnits,reservationState,financialStatus}`; port na Fase 1, ainda sem stub |
| `POST /webhooks/mercadopago` | assinatura `x-signature` | evento validado e deduplicado em inbox durável → `200`; **hoje `503`** |
| `scheduled()` | scheduler interno | inbox/outbox, expiração e reconciliação; sem rota HTTP pública, Fase 4 |

O cancelamento complementa as rotas do roadmap para preservar o fluxo atual.
O contrato de quote/order mantém os campos e limites existentes; nunca aceitar
preço, frete, total, status, `user_id` ou referência externa do browser como
autoridade. Itens: até 20 linhas, 10 unidades por variante, 50 no total; IDs
UUID, BRL e inteiros em centavos. Limite JSON de 12 KiB nos endpoints do
checkout e 64 KiB no webhook, medido durante leitura limitada, sem depender
somente de `Content-Length`. Rejeitar campos desconhecidos no novo contrato.
Limites e schemas serão aplicados na implementação de cada rota.

`Idempotency-Key`: 8–128 caracteres `[A-Za-z0-9._:-]`, escopo dono + operação.
Mesmo payload canônico retorna o mesmo recurso; payload diferente: `409`.
Pedido e pagamento têm chaves separadas. Submissão usa UUID estável da tentativa
no `X-Idempotency-Key` Mercado Pago, claim condicional e persistência antes do
I/O. Timeout depois do envio vira `unknown`; retry cego é proibido. Campos de
cartão: token opaco transitório, nunca armazenado; Pix dispensa token. Dados
do pagador serão derivados/validados no servidor antes de chamar o provedor;
não repassar `formData` arbitrário.

Erros futuros: `400 INVALID_PAYLOAD`, `401 UNAUTHORIZED`, `404 ORDER_NOT_FOUND`
(também pedido alheio), `409 IDEMPOTENCY_CONFLICT` / `INSUFFICIENT_STOCK` /
`ORDER_NOT_CANCELLABLE`, `413 PAYLOAD_TOO_LARGE`, `429 RATE_LIMITED`,
`503 PAYMENTS_DISABLED` / `CHECKOUT_UNAVAILABLE`. Rate limit, JWT e schemas
não fazem parte do scaffold. Métodos incorretos já retornam `405` e `Allow`;
rotas desconhecidas, `404`. Origem recusada retorna `403 CORS_DENIED`.

## Matriz de estados alvo (não é migration da Fase 0)

| Evento confirmado | Tentativa | Financeiro do pedido | Reserva / efeito |
| --- | --- | --- | --- |
| pedido criado | `created` | `pending` | `active`, estoque reservado |
| claim + envio iniciado | `submitted` | `processing` | manter reserva |
| MP `pending` / `in_process` | `pending` | `pending` / `processing` | manter reserva; não mostrar sucesso |
| MP `authorized` | `authorized` | `authorized` | manter; autorização não é captura |
| timeout pós-envio / resposta ambígua | `unknown` | `processing` | manter e reconciliar; sem nova cobrança |
| MP `approved` validado | `paid` | `paid` | `committed`, um único efeito de confirmação |
| MP `rejected` definitivo | `failed` | `failed` | liberar apenas após política/estado seguro no banco |
| cancelamento/expiração seguros | `cancelled` | `cancelled` | `released` uma única vez |
| estorno confirmado | `partially_refunded` / `refunded` | correspondente | não repor estoque automaticamente |
| chargeback confirmado | `chargeback` | `chargeback` | não repor estoque automaticamente |

`committed` ainda exige migration aditiva na Fase 1. A enum financeira atual
já possui os demais estados indicados. Não rebaixar `paid` para `pending`,
`failed` ou `cancelled` por evento atrasado. Refund/chargeback são transições
financeiras específicas, não regressões. Pendência/unknown impedem liberação
por relógio: consultar/reconciliar antes de soltar estoque. A expiração Pix
precisa de política comercial confirmada. Claims e transições deverão ser
condicionais/transacionais no Postgres, incluindo ordenação de locks e dedupe
de inbox/outbox. O simulado incorporado não é ledger durável.

## Ambientes, rollout e aceitação

Local funciona sem secrets. Staging e production exigem origens HTTPS,
Supabase e os três bindings secretos declarados em `secrets.required`.
Wrangler declara os secrets obrigatórios e Cloudflare rejeita bindings ausentes;
o runtime valida
presença/configuração em cada request, sem expor nomes/valores em health.
Não confundir presença de secret com validade de credencial ou disponibilidade
externa. O guard offline exige domínio dedicado e impede upload acidental da
configuração local. Detalhes: [operação](../../workers/payments/README.md).

O roadmap dizia que o PR #6 ainda estava aberto: o HEAD `81ca0b7` da base já
contém esse merge e o PR #7 do próprio roadmap. Reaproveitar seletivamente o
contrato/testes incorporados; não ativar o adaptador em memória no checkout.
Os endpoints Vercel permanecem até smoke/E2E do port; remoção será separada.

Aceitação local: testes de health, CORS, secrets ausentes, flag inválida,
redaction, guard de deploy, typecheck e bundle; smoke em workerd real.
Aceitação remota pendente: conta/domínio/origens, Supabase staging, bindings,
deploy autorizado e smoke de staging. Fase 0 não habilita cobranças, não
publica produção nem cria migrations.
