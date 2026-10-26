# Etapa 1 — identificar notificações recusadas no staging

Data: 26/10/2026. Branch: `home-v2-contraste`.

## Situação inicial

O cenário de cartão aprovado com confirmação automática passou. A operação
`186197242024` foi gravada como approved e o pedido `80c0881f` como paid.
Na mesma janela existem chamadas recusadas por query_id_missing e hmac_mismatch.
Os logs anteriores não registram o tópico nem formato da query, portanto não
permitem identificar retroativamente se cada chamada é Webhook, IPN ou outra
configuração. Não atribuir essas falhas a uma aplicação antiga sem evidência.

## Documentação consultada pelo MCP

A documentação de IPN informa explicitamente que, mesmo recebendo x-Signature,
IPN não pode ser autenticado com a chave secreta de Webhooks. Também informa que
IPN pode ser configurado por conta (afetando suas aplicações) ou por preferência
com notification_url. Isso é uma hipótese relevante para investigar os 401,
mas não identifica as chamadas concretas sem observar seu formato.

Foi encontrado apenas o parâmetro documentado source_news=ipn para forçar IPN.
Não foi encontrado suporte documentado para o inverso source_news=webhooks nas
respostas do MCP consultadas; não acrescentar esse parâmetro por suposição.

Fontes:
- [IPN](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/ipn)
- [Webhooks do Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications)

## Diagnóstico preparado

Adicionar, somente nos logs de staging, rótulos fixos para presença de data.id
ou id, tópico type/topic e origem declarada source_news. Não registrar valores
de IDs, query completa, headers, assinaturas, corpo, dados pessoais ou campos
desconhecidos. Não mudar autenticação, ACK, consulta à API ou estado financeiro.
Uma classificação de tópico ou IPN não torna a chamada confiável.

Testes locais: 242 testes de pagamentos aprovados, incluindo runtime workerd,
formas modernas/legadas, ambiguidades e ausência de valores privados nos logs.
TypeScript e guard de release aprovados. Os logs novos só classificam entregas
recebidas após a publicação; não reconstruirão as antigas.

Também foi solicitado ao usuário consultar a seção IPN da conta de vendedor
de teste, sem alterar configurações, pois o MCP conectado ao proprietário da
aplicação principal não permite consultar essa conta filha.
