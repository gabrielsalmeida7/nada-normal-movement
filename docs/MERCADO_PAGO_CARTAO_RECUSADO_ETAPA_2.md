# Etapa 2 — cartão recusado no staging

Data: 26/10/2026. Branch: `home-v2-contraste`. Produção inalterada.

## Procedimento e evidências

Dados confirmados pelo MCP na documentação Checkout Pro por preferências:
Visa de teste terminado em 5682, titular OTHE, cenário de recusa por erro geral.
O usuário fez uma nova compra pelo fluxo da loja e enviou a tela do Mercado Pago:
“O banco emissor do cartão recusou seu pagamento”, transação `186225527026`.

Auditoria pelo MCP Supabase:

| Campo | Valor |
| --- | --- |
| Pedido | `6bd63abf-427b-4c50-8438-23c75007a4d0` |
| Tentativa | `bf779cb6-9380-41c5-bded-4df793da82ff` |
| Preferência | `3272217989-08a2721c-c978-4edc-b047-9e3febb18d94` |
| Pagamento | `186225527026` |
| Valor | R$ 119,00 |
| Status do provedor no ledger | `rejected` |
| Pedido / financeiro / tentativa | `pending` / `processing` / `pending` |
| paid_at / approved_payment_id | ambos nulos |
| Versão / pagamentos no ledger | 3 / 1 |
| Reserva | `held`, um evento `reserved`, stock_units=-1 |

O Webhook automático concluiu com HTTP 200 às 16:47:07,500 (Brasília),
assinatura `test_application` validada; requestId
`99de6692-1d64-4b8b-8df9-fde82c58a64b`. Query classificada como
data_id / payment / type. Não foi necessária simulação nem alteração manual do banco.

Manter processing após a recusa de uma operação é a regra atual: uma preferência
pode receber novas tentativas e um pagamento aprovado posteriormente. A reserva
não foi liberada por uma recusa isolada. Reconciliação e expiração continuam
desabilitadas e terão validação própria.

## Notificações adicionais

Na janela 16:47:05–16:47:07 (Brasília), os diagnósticos registraram também dez
recusas HTTP 401: seis com legacy_id/topic (payment ou merchant_order), por
query_id_missing, e quatro com data_id/type/merchant_order, por hmac_mismatch.
Essas classificações descrevem chamadas sem autenticação válida; não provam
origem, ID do recurso ou aplicação. O formato legacy_id/topic é compatível com
IPN documentado pelo MCP, que não pode ser autenticado pelo segredo de Webhooks.
Nenhuma dessas chamadas foi aceita para alterar o estado financeiro.

Não alterar notification_url, assinatura ou ACK com base apenas nesse formato.
O Webhook payment válido foi processado e persistiu a recusa apesar dessas chamadas.

## Limite da validação

Recusa no provedor, recebimento automático e ausência de falsa confirmação no
banco verificados. O usuário perdeu a aba; o retorno visual à loja e a retomada
não foram observados. A tela atual usa financialStatus e deve mostrar
“Aguardando confirmação do pagamento” para processing, sem confirmação de compra.
Consultar o pedido autenticado não requer outra compra nem outra tentativa.

Fonte consultada pelo MCP:
https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases

## Correção da retomada após perder a aba

O usuário informou que não conseguia retomar como cliente. A investigação
confirmou que CheckoutResult exigia o rascunho da aba original em sessionStorage
para mostrar a ação. O status do servidor não informava o prazo da reserva.
O pedido acima tem reserva até 26/10/2026 às 17:12:06 (Brasília).

A consulta autenticada agora devolve reservationExpiresAt a partir de uma
leitura de orders com filtros obrigatórios de ID e proprietário autenticado,
projeção mínima, limite de uma linha e validação desses dois IDs na resposta.
Não há migration, alteração de permissão, chave no navegador nem mutação de pedido.

A página de consulta permite retomar sem sessionStorage quando o servidor
informa pending/processing, reserva held e prazo vigente. A ação continua
consultando a preferência existente e verificando sua aplicação no backend,
sem criar outro pedido. Uma reserva expirada recebe explicação e nenhum botão
de retomada. Isso não ativa reconciliação nem libera estoque automaticamente.
Rascunhos continuam necessários para comparar o carrinho antes de limpá-lo
após confirmação; perder a aba não autoriza limpar um carrinho diferente.

Validação: 128 testes de aplicação, 245 de pagamentos (incluindo workerd),
60 de storefront; TypeScript e guard de release aprovados; lint sem erros,
oito avisos preexistentes. Chromium com autenticação/status simulados verificou
retomada sem rascunho e expiração em 1366x900 e 390x844, sem erros JavaScript
ou rolagem horizontal da página. O teste visual não fez chamadas de pagamento.
Publicação pelo CI de staging; confirmação visual do usuário após publicação
continua pendente.

Guia do SDK consultado novamente pelo MCP: manter Wallet com preferenceId
obtido do backend e a Public Key da aplicação de teste, sem redirecionamento
manual para um checkout alternativo.
