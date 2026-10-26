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

## Publicação e configuração observada

O usuário informou que a seção IPN da conta do vendedor de teste não tem URL
nem eventos configurados. Isso exclui essa configuração global como fonte
conhecida, mas não as notificações disparadas por notification_url da preferência.
Foi solicitada a URL e os eventos dos Webhooks da aplicação filha para conferir
se é seguro depender apenas dessa configuração em futuras preferências.

Diagnóstico publicado no commit `2bee8c84f93ae37e5029f8a0ff44c4f83985f27a`.
Build payments `b11807ca-384c-4b7f-b7cb-87e92805e8db`, versão
`4ba6c5be-86ba-4c03-8fee-48755a01f42a`, ativo desde 26/10/2026 às
14:17:16 (Brasília). Build da loja `a95a1f89-8e94-4159-b1b2-828e10bd09f6`
também concluído. Health confirma staging com pagamentos habilitados.
Lint: zero erros, oito avisos preexistentes.

Checkpoint das 14:18 (Brasília): nenhuma nova notificação após a publicação.
O diagnóstico precisa observar uma nova entrega antes de classificar a causa
das falhas. A publicação por si só não comprova que um 401 era IPN.

O usuário confirmou que os Webhooks da aplicação filha têm a URL exata de
staging e apenas Pagamentos (legacy) selecionado. Esse é o tópico payment
correto para Checkout Pro; o rótulo legacy do produto Payments API não significa
que a seção Webhooks foi configurada como IPN.

Até 14:22 (Brasília), nenhuma nova entrega com os rótulos de diagnóstico tinha
chegado. Foi solicitado o corpo mínimo (type/topic e presença de data/resource)
de uma notificação recusada da operação 186197242024 para distinguir o formato
sem recuperar assinaturas, cabeçalhos ou informações pessoais.

O usuário enviou o evento payment.created da operação 186197242024 com
status 200, type=payment e data.id presente. Esse é o Webhook bem-sucedido
já auditado; não é um exemplo das chamadas 401. Foi solicitado verificar
explicitamente o filtro Falha na entrega do histórico dessa aplicação.

No checkpoint de 14:29 (Brasília), ainda não havia novo 401 após a publicação.
O único novo diagnóstico era status 405, stage=routing, sem query de recurso
ou tópico: método não permitido, antes de verificar assinatura. Não usá-lo
como evidência de IPN ou de um Webhook de pagamento com assinatura inválida.

Não houve mudança no notification_url ou na configuração do provedor apenas
com base no evento 200. A identificação da origem das recusas continua
dependente de nova entrega observável ou de um exemplo efetivamente falho.

## Resultado da revisão do histórico

O usuário confirmou que o painel do vendedor mostra duas notificações:

| Operação | Situação no histórico | Interpretação |
| --- | --- | --- |
| 185121492029 | Falha 401 na entrega original de 10:45:14 (Brasília) | Evento anterior à correção das assinaturas; o pagamento foi posteriormente consultado e persistido após notificação simulada válida. |
| 186197242024 | Entrega 200 às 13:47:32 (Brasília) | Compra posterior confirmada automaticamente, com assinatura test_application validada. |

Auditoria às 14:32 (Brasília): os dois pedidos estão paid e os dois pagamentos
approved no ledger. O novo pagamento não tem falha correspondente no histórico
informado pelo usuário. O erro visível da primeira operação não demonstra uma
regressão do Webhook atual; não exige outra alteração de secrets ou de ambiente.

Decisão: preservar a configuração funcional de Webhooks e notification_url.
Não há evidência suficiente para retirar o override da preferência ou alterar
os ACKs somente para silenciar falhas. Os rótulos de diagnóstico foram publicados
para identificar as próximas chamadas recusadas, mantendo a segurança atual.

Limite explícito: as outras chamadas 401 vistas nos logs anteriores não possuem
identificadores/tópicos registrados que permitam atribuí-las às duas operações
ou ao IPN. Até esse checkpoint não ocorreu novo 401 com o diagnóstico enriquecido.
Logo, não afirmar que todos os 401 eram históricos ou IPN. Essa classificação
residual poderá ser observada no próximo cenário de homologação, sem exigir
uma compra adicional apenas para gerar telemetria.
