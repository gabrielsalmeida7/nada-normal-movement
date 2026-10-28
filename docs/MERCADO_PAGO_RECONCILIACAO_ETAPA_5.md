# Etapa 5 — ativação da reconciliação em staging

Data: 28/10/2026. Branch: `home-v2-contraste`.

## Motivo e escopo

O código de reconciliação já estava implementado e testado, porém desativado
durante a homologação dos pagamentos e da liberação de estoque. Webhooks
automáticos continuavam funcionando. O usuário autorizou a ativação da etapa 5.

Esta entrega habilita CHECKOUT_RECONCILIATION_ENABLED e o cron exato
`*/5 * * * *` somente no Worker nada-normal-payments-staging. Não cria endpoint
HTTP para disparar a rotina, não cria pagamentos nem repete POST de preferência.
O guard de release continua exigindo staging, a branch e aplicações corretas,
os secrets existentes e o cron aprovado. Produção permanece desabilitada.

O processador legado de reservas do storefront continua desativado. Ele é
independente da fila de reconciliação e não será ativado implicitamente nem
usado para liberar pedidos que já iniciaram checkout externo.

## Auditoria antes da ativação

O MCP Supabase identificou cinco entradas vencidas na fila de reconciliação,
todas vinculadas à aplicação principal 4897243060269064 e à aplicação de teste
5855568499515388. Nenhuma sessão de outra aplicação foi incluída por inferência.

| Pedido | Estado financeiro antes da ativação |
| --- | --- |
| 6ecea996 | processing, preferência antiga de teste sem pagamento conhecido |
| ee5657bc | paid, operação 185121492029 |
| 80c0881f | paid, operação 186197242024 |
| 6bd63abf | processing, operação recusada 186225527026 |
| d0d4c16f | paid, operação 186387901136 com retorno indicando account_money |

A fila legada do storefront tinha quinze trabalhos pending e nenhum pedido
elegível com reserva held, financeiro pending e todas as tentativas created.
Essa fila não foi limpa ou processada por esta ativação.

## Regras preservadas

- Uma entrada por execução, concessão exclusiva por cinco minutos, consultas
  GET por SDK oficial e validação de vendedor/aplicações/pedido/valor/moeda.
- Pagamento consultado e validado é persistido antes de concluir o trabalho.
- Busca vazia, falha de API ou pagamento pendente não devolvem estoque.
- Devolução de pedido externo exige preferência vencida há 24 horas, consultas
  completas com apenas pagamentos finais recusados/cancelados e duas observações
  idênticas separadas por cinco minutos, além das verificações transacionais.
- Casos ambíguos geram revisão; o registro de revisão não significa resolução
  manual nem liberação automática.
- Não são cancelados/reembolsados pagamentos no provedor por esta rotina.

## Verificação da entrega

Tipos do Wrangler regenerados e conferidos sem mudança nas interfaces.
Guard e testes de release ajustados para a ativação explícita, preservando os
testes que recusam cron incorreto e configuração de produção. A publicação usa
o fluxo normal de Workers Builds. A validação remota deve conferir flag, cron,
versão ativa, log checkout_reconciliation e checked_at/last_result no banco.
Uma configuração publicada sozinha não comprova execução do agendamento.

Na fila existente, a validação remota observa consultas reais e idempotência
sobre operações já conhecidas. Não será forjado um pagamento nem regredido um
pedido pago para simular perda de webhook. A recuperação desse cenário já é
coberta pelos testes isolados do SDK e das funções transacionais.

## Referências consultadas

- MCP Mercado Pago: busca de pagamentos por external_reference, GET de pagamento
  por ID e paginação da Payments API, mantendo o contrato por preferências.
- https://www.mercadopago.com/developers/pt/docs/subscriptions/additional-content/payment-management
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
- https://developers.cloudflare.com/workers/best-practices/workers-best-practices/

A etapa 3 continua bloqueada na oferta de Pix pela conta do vendedor de teste.
