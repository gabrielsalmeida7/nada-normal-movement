# Incidente de homologação Checkout Pro

Data: 26/10/2026. Branch: `home-v2-contraste`. Somente staging.

## Evidências confirmadas

O checkout redirecionou para uma página fatal ao confirmar o cartão de teste,
em dois navegadores. A tokenização retornou HTTP 201; a confirmação XHR
retornou HTTP 200 contendo um estado de erro, sem aprovação financeira.

Dados da resposta de erro fornecida pelo usuário:

- Código completo: `FL-71e5ebf2-6337-4d2c-b6d9-da7647e1cc74`.
- Tipo: `service_error`. Causa: `unexpected_error`. Serviço: `N/A`.
- `recoverable=false`, `service_error_detail=0`.
- Fluxo: `20d8af73-7223-4500-a4d7-21cfb0de852e`.
- Momento informado pelo checkout: `2026-10-26T09:06:07-0400`
  (10:06:07 no horário de Brasília).
- Preferência: `3272217989-20a96ae4-7873-4816-ae33-3be636de04e8`.
- Referência externa: `d6c9f40d-aac2-45c4-bdfa-0a389b8d72f0`.
- Aplicação principal: `4897243060269064`.
- `client_id` no checkout: `5855568499515388`, a aplicação filha de teste correta.
- Vendedor: `3272217989`. Comprador: `3272217991`.
- Moeda BRL, valor 119, quantidade de itens 1.
- A resposta apresenta `liveMode=false`.
- `is_operation_valid=true`, `is_eligible=true`, `is_logged=true`.
- `has_combination=false`, `is_available=false`, `payment_method_id` vazio.

O campo de tracking `productive=true` não tem significado financeiro documentado
nas fontes consultadas. Não utilizá-lo isoladamente para classificar a cobrança
como real nem alterar credenciais com base nele. Os flags de erro/composição
também não identificam uma causa específica ou uma recusa do emissor.

Não foram copiados identificadores de sessão, tokens, cookies ou dados de cartão
para este documento.

## Verificações realizadas

- SDK oficial no backend criou e recuperou a preferência com aplicação, vendedor,
  pedido e referência validados. Repetição retornou a mesma preferência.
- Consulta autenticada da loja e auditoria SQL mostram processing/held e nenhum
  pagamento registrado. Isso não prova ausência de uma tentativa no provedor.
- MCP do Mercado Pago sem notificações da aplicação principal nos checkpoints
  consultados. Logs do Worker sem webhook_diagnostic na janela examinada.
- Consulta direta da API pelo ambiente de execução retornou 403. O histórico da
  aplicação filha não é acessível pelo MCP devido à validação de ownership.
- O código FL específico não foi localizado por search_documentation no MCP.
- Os parâmetros enviados incluem back_urls, auto_return, notification_url,
  expiração, valor autoritativo e exclusão de meios incompatíveis com cartão.
- Não foram alterados secrets, excluídos pedidos ou liberadas reservas em função
  desse erro. Não foi atribuída uma causa interna sem evidência.

## Próximo teste

O teste anterior abriu diretamente sandbox_init_point. O fluxo oficial da loja
inicializa Wallet com a Public Key de teste e preferenceId; o SDK escolhe o
redirecionamento. Testar pela loja, com uma conta da loja e o comprador de teste
no Mercado Pago, permite distinguir os caminhos de abertura sem trocar hosts
manualmente. A preferência anterior vence às 10:20:39 (Brasília); não prolongar
sua reserva nem recriar silenciosamente uma tentativa incerta.

O browser automatizado conseguiu abrir o staging com TLS validado após configurar
a CA do ambiente na mesma execução, mas as chamadas externas do Wallet tiveram
falhas de rede/CORS no ambiente de execução. Portanto ele não confirmou o destino
do botão nem completou a experiência do provedor. Não interpretar essa limitação
como reprodução do service_error no navegador do usuário.

Fonte consultada pelo MCP: [SDK frontend e Wallet](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/web-integration/add-frontend-sdk).

## Rascunho para suporte, caso o fluxo oficial também falhe

Em uma integração própria Checkout Pro brasileira, com vendedor e comprador de
teste, a tokenização do cartão é bem-sucedida e a confirmação retorna
`currentStep=fatal`, `unexpected_error/service_error`, código
`FL-71e5ebf2-6337-4d2c-b6d9-da7647e1cc74`, serviço N/A. A operação é reportada
como válida/elegível, mas a combinação de pagamento fica indisponível. A falha
foi repetida em dois navegadores. Os identificadores e horário acima permitem
correlacionar o erro. Solicitamos identificar a causa interna e confirmar se
houve criação de algum pagamento associado à preferência/referência externa.

Este texto não foi enviado a terceiros. Não anexar credenciais ou sessões ao
chamado. Acrescentar o resultado do teste pelo Wallet antes do envio.

## Atualização: compra pelo fluxo da loja concluída

O usuário realizou uma nova compra pelo fluxo da loja e anexou comprovante:
operação `185121492029`, R$ 119,00, em 26/10/2026 às 10:45:15 (Brasília).
Pedido: `ee5657bc-4243-4d91-b180-4e4c162828ff`.
Tentativa: `ac7849f8-23c9-493b-abc3-2bbf2591751c`.
Preferência: `3272217989-46633c44-d1f7-4d7b-87f3-afa6bd0235d3`.

Isso confirma a conclusão no checkout para essa nova compra, mas não isola a
causa do erro fatal da preferência anterior: mudaram a preferência e o caminho
de entrada. O domínio escolhido pelo SDK não foi informado neste checkpoint.

Foi encontrada uma pendência distinta: a auditoria do banco às 10:46 ainda
mostrava o novo pedido processing/held, paid_at nulo e sem pagamento no ledger.
Logs do Worker mostraram notificações 401, com rótulos query_id_missing e
hmac_mismatch. A query é removida dos logs por configuração; não é possível
atribuir cada evento individual a um payment_id a partir desses logs.

O parser HMAC foi comparado ao formato documentado pelo MCP:
`id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. Nenhuma validação foi removida
ou contornada. A simulação do painel da aplicação principal com Data ID do
pagamento existente foi solicitada ao usuário para distinguir a assinatura
desse painel das entregas automáticas. Não exige criar outro pagamento.

O histórico da aplicação principal via MCP continua vazio. A avaliação oficial
de qualidade, chamada com a aplicação filha de teste e o payment_id correto,
foi bloqueada por ownership OAuth; não houve avaliação concluída. Essa é uma
limitação de acesso da ferramenta, não uma nota de reprovação da integração.

Não marcar a homologação de ponta a ponta como concluída até verificar a
consulta do pagamento pelo backend e sua persistência transacional.

## Simulação assinada com o pagamento existente: confirmação persistida

O usuário enviou uma simulação pelo painel da aplicação principal usando Data ID
`185121492029` e recebeu HTTP 200. O Worker confirmou, nos logs, requestId
`e3c2e98c-db97-47aa-9576-b8263a035a96`, signatureVerified=true, stage=completed,
status=200. O handler consultou o pagamento na API antes de aplicar a RPC; não
utiliza o status do corpo simulado como confirmação financeira.

Auditoria posterior confirmou:

- Pedido `ee5657bc-4243-4d91-b180-4e4c162828ff`: status=paid,
  financial_status=paid, total_cents=11900.
- paid_at: 26/10/2026 às 10:50:02 (Brasília).
- Tentativa `ac7849f8-23c9-493b-abc3-2bbf2591751c`: paid.
- approved_payment_id e ledger: `185121492029`, status=approved, estorno zero.
- Uma linha no ledger para esse pagamento, vinculada a uma tentativa.
- Reserva permanece held; não houve devolução indevida de estoque.

Assim, assinatura do painel principal, leitura oficial do pagamento e
persistência funcionaram. A simulação assinada não comprova que o problema das
entregas automáticas foi resolvido: elas falharam em HMAC antes dessa simulação.

Foi solicitado acesso de leitura ao painel de Webhooks da aplicação filha
`5855568499515388`, autenticado como vendedor de teste, para conferir sua
configuração. É uma hipótese de escopo de assinatura a verificar, não uma causa
já demonstrada. O MCP atual bloqueia acesso à aplicação filha por ownership.
Não alterar o secret principal, que foi validado, sem determinar essa diferença.

## Ajuste local para as assinaturas das duas aplicações

O usuário confirmou acesso ao painel da aplicação filha. Foi solicitado salvar
sua assinatura separadamente como `MP_TEST_WEBHOOK_SECRET` no Worker payments.
O secret principal não será substituído.

Preparado localmente: verificação limitada às duas chaves configuradas pelo
operador no staging, com os mesmos dados assinados e janela temporal. Os logs
mostram apenas a origem fixa da chave que validou. As validações da API, conta,
pedido e persistência permanecem obrigatórias. O guard exige o novo binding
como secret antes da publicação; ele é proibido em vars e fora do staging.

Validação: 236 testes de pagamentos aprovados, incluindo runtime workerd/SDK,
ambas as fontes de assinatura, rejeição de chaves desconhecidas/IDs alterados,
rejeição de vendedor incorreto e ausência de ACK quando a persistência falha.
TypeScript e guard offline aprovados. Não houve publicação desse ajuste ainda.
O último checkpoint da Cloudflare ainda não continha MP_TEST_WEBHOOK_SECRET;
a publicação depende de o usuário salvar essa configuração e da confirmação
posterior de uma entrega assinada pela aplicação de teste.

O usuário esclareceu que salvou MP_TEST_WEBHOOK_SECRET e preservou
MP_WEBHOOK_SECRET. Às 13:30 (Brasília), o MCP da Cloudflare confirmou os quatro
secrets no Worker payments correto, com os IDs das aplicações e staging ativos.
Valores não foram lidos. A publicação do ajuste e a verificação de uma nova
entrega/reenvio continuam sendo passos distintos.
