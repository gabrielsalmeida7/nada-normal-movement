# Etapa 4 — cancelamento e expiração

Data: 28/10/2026. Branch: `home-v2-contraste`. Staging exclusivamente.

## Escopo

Verificar cancelamento antes de iniciar o checkout no provedor, devolução única
de estoque, expiração de reserva sem pagamento iniciado e proteção de pedidos
com tentativa externa em andamento. Não ativar cron, reconciliação, produção,
reembolso ou limpeza de pedidos antigos. A etapa 3 permanece bloqueada para Pix.

O MCP Mercado Pago confirmou os parâmetros de vigência de preferência: expires,
expiration_date_from e expiration_date_to. Essa vigência não é usada pela loja
como prova suficiente de ausência de pagamento para restituir estoque.

Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-settings/term-of-preference

## Cancelamento pela API real de staging

Usada a conta técnica de QA já existente, com sessão autenticada e sem privilégio
de admin. Um novo pedido foi criado pela API da loja e cancelado antes de chamar
o endpoint de preferências. Nenhuma preferência ou pagamento foi criado.

| Campo | Resultado |
| --- | --- |
| Pedido técnico | `3f12c795-11b7-4ca9-a675-0df1545134b9` |
| Tentativa | `bcbd4203-97ee-465e-9d71-17530206c1c0` |
| Variante | `4e040960-e674-489c-887b-18af3eb0a33d` |
| Quantidade | 2 |
| Estoque antes / reservado / depois | 37 / 35 / 37 |
| Cancelamentos concorrentes | três chamadas HTTP 200 |
| Devoluções | uma com 2 unidades; duas repetições com zero |
| Pedido / financeiro / reserva | cancelled / cancelled / released |
| paid_at / versão | nulo / 2 |
| Sessões do provedor | zero |

Auditoria pelo MCP confirmou um evento reserved=-2, um cancelled=+2 e dois
already_released=0. Não houve devolução duplicada, mesmo com concorrência.

Verificações negativas na API publicada:

- Cancelamento sem autenticação: 401.
- Pedido de outro cliente: 404, sem divulgar seu estado.
- Cancelamento do pedido técnico antigo que já tinha checkout iniciado: 409,
  ORDER_NOT_CANCELLABLE, preservando a reserva.
- Retomada de preferência desse pedido antigo já expirado: 409, sem gerar nova
  preferência. Isso não cancela nem libera automaticamente uma tentativa externa.

O teste foi técnico via API; não afirma existência de botão de cancelamento na
interface do cliente. O pedido técnico cancelado permanece para auditoria.
Relatório privado sem credenciais: .wrangler/stage4-cancel-report.json (ignorado).

## Expiração no PostgreSQL isolado

Banco PostgreSQL 17 descartável, sem portas publicadas e sem rede; bootstrap e
todas as migrations aplicadas. Passaram os testes existentes:

- supabase/tests/reservation_release.sql.
- supabase/tests/checkout_pro.sql.
- supabase/tests/checkout_pro_reconciliation.sql.
- supabase/tests/reservation_release_concurrency.sh.

Os testes incluem limite de prazo, autorização, liberação única, disputa de
cancelamento com expiração, pedidos pagos/em andamento e proteção contra
liberação prematura. O container exclusivo deste teste foi encerrado.

## Expiração nas funções instaladas em staging

Um bloco SQL criou produto, variante e pedidos temporários exclusivos do teste,
utilizando a conta técnica de QA. Foram chamadas as funções reais instaladas,
com asserções. Todas as alterações do cenário foram revertidas ao final por
rollback da subtransação; exceções de falha não eram ignoradas.

Resultados:

1. Oito unidades iniciais; reserva de duas deixou seis.
2. Liberação por expiração antes do prazo retornou not_due e não devolveu estoque.
3. Somente o prazo do pedido temporário foi colocado no passado, dentro do teste.
4. A expiração devolveu duas unidades e marcou cancelled/released, sem paid_at.
5. Repetir a expiração devolveu zero; estoque oito e um único evento expired.
6. Outro pedido temporário entrou em claimed pelo claim_checkout_pro_v2, sem
   fazer requisição ao Mercado Pago. Mesmo vencido, sua liberação foi recusada
   com ORDER_NOT_CANCELLABLE e o estoque permaneceu reservado.
7. Rollback removeu todos os produtos/pedidos temporários; contagens finais zero.

Isso valida a regra do banco e seus limites com um relógio controlado no
cenário temporário. Não é evidência de execução agendada após trinta minutos,
nem de expiração/cancelamento de pagamento real no Mercado Pago.

## Estado final e próxima etapa

Auditoria confirmou que os pedidos pagos ee5657bc, 80c0881f e d0d4c16f continuam
paid, versão 3, com seus paid_at e reservas preservados. Nenhum foi cancelado,
reembolsado ou teve estoque devolvido por estes testes.

O MCP Cloudflare confirmou nos dois Workers de staging:

- payments: PAYMENTS_ENABLED=true, CHECKOUT_RECONCILIATION_ENABLED=false.
- storefront: CHECKOUT_PRO_ENABLED=true, RESERVATION_PROCESSOR_ENABLED=false.
- Nenhum cron configurado em qualquer um dos Workers.

Conclusão: cancelamento antes do checkout e regras transacionais de expiração
passaram, incluindo concorrência e casos de recusa. A etapa 5 deve tratar a
ativação e homologação da execução automática. Pedidos com preferência externa
exigem a reconciliação conservadora já implementada; esta etapa não os liberou.
Não houve mudança em código de aplicação, schema, secrets ou configuração remota.
