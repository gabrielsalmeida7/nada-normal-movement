# API de pagamentos — Checkout Pro sandbox

> Atualização local de 25/10/2026: o backend da nova aplicação usa o SDK oficial
> `mercadopago@3.6.1`. Configuração versionada aponta para a aplicação principal
> `4897243060269064` e aplicação de teste `5855568499515388`, com novas submissões
> desativadas. Não houve deploy nem troca dos secrets remotos. O histórico abaixo
> descreve a integração anterior. Estado e limites da nova entrega em
> [etapa 3 — backend SDK](../../docs/NOVA_INTEGRACAO_MERCADO_PAGO_ETAPA_3.md).
>
> O item de [reconciliação local](../../docs/NOVA_INTEGRACAO_MERCADO_PAGO_RECONCILIACAO.md)
> também está implementado, desativado e dependente da migration nova antes do deploy.

Estado consolidado em 22/10/2026. Plano vigente: [roadmap](../../roadmap.md).
Passo a passo para usuário e responsável técnico:
[roteiro de testes](../../docs/ROTEIRO_DE_TESTES.md).

## O que está implementado

Worker TypeScript ES Modules separado do Worker da loja (SPA e APIs).
Cria preferências Checkout Pro, consulta status autenticado e verifica webhook
assinado consultando a API Mercado Pago antes da transição financeira.
O cliente paga no ambiente hospedado do Mercado Pago; não há Payment Brick.

A criação de pedido ainda tem handler legado em `api/checkout/order.ts`, com a
RPC transacional do Supabase. O port para `/api/checkout/order` no Worker da
loja foi publicado e testado remotamente com criação, replay e cancelamento;
a Vercel não será usada. A preferência recebe
apenas `{orderId}` e JWT; dinheiro,
dono e reserva vêm do servidor. Rotas antigas quote/orders/payments do Worker
permanecem stubs e não fazem parte do caminho de submissão atual.

O webhook e o status continuam disponíveis com novas submissões desligadas,
desde que a configuração Checkout Pro esteja completa. A página de retorno
não considera a query string como confirmação de pagamento.

## Estado de entrega

- Código integrado à home-v2-contraste; ela é a branch oficial de desenvolvimento.
- Migrations remotas aplicadas e verificadas em 19/10/2026. Não reaplicar.
- Secrets e domínio confirmados; a consulta protegida na Cloudflare validou o
  token instalado como vendedor de teste 3272217989 (Brasil/MLB).
- Configuração pública de staging preenchida e publicada em 22/10: conta fixa,
  CORS/retorno exatos da loja, Supabase público, sandbox, webhook e vendedor.
- Worker 0.2.0; PAYMENTS_ENABLED=true autorizado exclusivamente em staging sandbox.
  Conferir health após o release; produção continua false. Health/CORS, status autenticado e
  recusa de webhook sem assinatura verificados online. O pedido QA foi cancelado
  com estoque restituído; nenhuma preferência criada. E2E de pagamento pendente.
- Frontend de staging ativado explicitamente no build protegido; produção fica desativada.
- Cobrança permitida somente em staging sandbox após configuração explícita.
  Produção continua bloqueada no parser, mesmo mudando a flag.

## Desenvolvimento e verificações locais

### Diagnóstico temporário do webhook em staging

O staging também suporta `MP_TEST_WEBHOOK_SECRET`, a assinatura da aplicação
filha do vendedor de teste. `MP_WEBHOOK_SECRET` continua sendo a assinatura da
aplicação principal. O release de staging exige as duas como secrets; o valor
adicional não pode estar em vars nem ser configurado fora do Checkout Pro de
staging. Produção não declara essa assinatura de teste.

As duas assinaturas são verificadas por HMAC com o mesmo manifesto e a mesma
janela temporal. Os logs registram apenas `signatureSource=application` ou
`test_application`, sem valores de chave. Após autenticar a notificação, o
backend continua consultando o pagamento e verificando vendedor, comprador,
referência, moeda e valor antes da persistência. Uma assinatura válida sozinha
não aprova um pedido. A correção das entregas automáticas deve ser comprovada
por entrega/reenvio de evento, distinguindo isso de uma simulação do painel.

O Checkout Pro com vendedor APP_USR de teste pode divergir da antiga exigência
`live_mode=false`. O parser exige booleano; quando true, somente o vendedor
3272217989 e comprador 3272217991 são admitidos, após confirmar via API as duas
identidades e país MLB. O vendedor autenticado deve ter marcador test_user em
`/users/me`; o comprador deve corresponder ao ID de teste confirmado no painel.
Não exigir marcador test_user de terceiros na API pública `/users/{buyer_id}`.
Não basta o prefixo da
credencial. Falha de identidade usa `PROVIDER_TEST_ACCOUNT_UNVERIFIED`, sem
dados pessoais nos logs. Esse caminho só é alcançável no staging sandbox.
Novos compradores de teste precisam de revisão explícita da lista permitida.
Se a verificação falhar, `rejectedTestAccountChecks` distingue pré-condições
(`configured_seller`, `payment_seller`, `payment_buyer`) e campos fixos de cada
perfil (`seller_` + `id`, `site_id`, `tags`, `user_type`, `test_marker` ou `profile`;
`buyer_` + `id`, `site_id` ou `profile`). Nunca contém o valor recebido, um ID de
conta ou mensagens Zod. O erro buyer_test_marker pertence ao critério anterior,
substituído após confirmar a limitação da consulta pública de terceiros.
Esse detalhamento não altera nenhum critério de aceitação.

O staging persiste logs de aplicação, com logs automáticos de invocação e traces
desligados e query strings ocultadas. O evento `webhook_diagnostic` registra
somente ID aleatório gerado pelo servidor, etapa fixa, `signatureVerified`,
status HTTP, código de erro permitido e status HTTP do upstream, quando houver.
Para investigar recusas automáticas 401, `signatureFailureReasons` contém somente
rótulos fixos: query_id_missing/duplicate/invalid, request_id_missing/invalid,
signature_missing/format_invalid, timestamp_outside_window ou hmac_mismatch.
Nenhum valor da query, header, timestamp ou assinatura entra no log. O parser,
janela de cinco minutos, HMAC e respostas HTTP permanecem iguais. Esse diagnóstico
não reconstrói os cabeçalhos das entregas anteriores: requer uma nova entrega do
evento original ou retry automático, não outra simulação fictícia como prova.

O diagnóstico `query` classifica apenas formatos com rótulos fixos: resourceKind
(`data_id`, `legacy_id`, `mixed`, `missing`), tópico conhecido ou other/missing/
ambiguous, tipo do parâmetro (`type`, `topic`, `both`, `none`) e origem declarada
(`webhooks`, `ipn`, `other`, `missing`, `ambiguous`). Não registra IDs nem valores
desconhecidos. Esses rótulos descrevem a chamada e não autenticam o remetente;
a validação HMAC e a consulta do pagamento continuam obrigatórias.
Em falhas do schema do pagamento, `rejectedPaymentFields` contém somente nomes
de campos conhecidos do schema, sem valores, tipos recebidos ou mensagens Zod.
As validações, o HTTP 503 e o bloqueio de persistência permanecem inalterados.
Não registra URL, query, corpo, headers, IDs de pagamento/usuário, credenciais,
mensagens de exceção ou respostas externas. Produção/local não emitem esse evento.

Consultar após uma nova simulação do painel Mercado Pago. Uma falha na etapa
`provider_lookup_and_validation` com `signatureVerified=true` e upstream 404
distingue assinatura aceita de recurso inexistente; não comprova uma compra.
Sem registro correspondente, não atribuir o 503 a essa hipótese. As simulações
anteriores não podem ser reconstruídas pelos novos logs.

Durante a investigação inicial, pagamentos/frontend ficaram bloqueados. A
assinatura foi posteriormente validada por notificações simuladas, com upstream
404 no ID fictício; o usuário autorizou ativação exclusivamente sandbox.
O backend já confirmou health true no build `9ceb8c91-e268-4fc8-ab4c-aea615553d1c`.
Isso não comprova compra ponta a ponta. Após resolver a
pendência, remover/reduzir esta coleta temporária e ajustar o guard de release
em conjunto. Logs persistidos podem consumir a franquia de observabilidade;
não manter coleta integral indefinidamente.

### Comandos

Use Node.js 22.18+ ou 24+; validado anteriormente com 24.19.0. Na raiz:

```sh
npm ci
npm run worker:test
npm run worker:typecheck
npm run worker:build
npm run worker:dev
```

O build usa `wrangler deploy --dry-run`, sem upload. O dev usa workerd local
na porta 8787; o SPA roda separadamente com `npm run dev` na porta 8080.
O modo local atende health/CORS, sem habilitar chamadas de pagamento.

Para configuração do usuário somente para leitura no ambiente cloud, usar
`XDG_CONFIG_HOME=/workspace/.config npm run worker:build` e o mesmo prefixo
no dev. Logs do wrapper ficam em .wrangler/logs; métricas Wrangler desativadas.

```sh
curl --fail http://127.0.0.1:8787/health
curl -i -X OPTIONS http://127.0.0.1:8787/v1/checkout/preferences \
  -H 'Origin: http://localhost:8080' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type,idempotency-key'
```

Esperado no modo local: health 200 com `paymentsEnabled: false`, preflight 204
para a origem cadastrada; origem desconhecida retorna 403. Health não testa
conectividade nem autorização do Supabase/Mercado Pago.

`npm test` cobre o app/server. A suíte Worker é separada em `npm run worker:test`.
Testes SQL no PostgreSQL descartável estão documentados no
[ADR 002](../../docs/adr/002-checkout-pro.md).

## Configuração e publicação de staging

Primeiro concluir a Etapa 0 do [roadmap](../../roadmap.md): site e cinco APIs na
Cloudflare. Estes comandos publicam somente pagamentos, não a loja completa.
Confira o [plano de migração](../../docs/MIGRACAO_CLOUDFLARE.md).

Seguir a seção 2 do [roteiro](../../docs/ROTEIRO_DE_TESTES.md). Staging foi publicado
com submissões desligadas; produção continua incompleta/bloqueada. O wrangler permanece
JSON compatível porque o guard usa JSON.parse.
Secrets nunca entram em vars, VITE_*, Git, logs ou exemplos com valores reais.

Secrets obrigatórios no Worker: `SUPABASE_SECRET_KEY`, `MP_ACCESS_TOKEN` de
teste e `MP_WEBHOOK_SECRET` correspondente. Variáveis públicas incluem Supabase,
origens, modo sandbox, URL de retorno/webhook e o recebedor validado pela API.
A Public Key de teste é usada pelo Wallet Brick no frontend protegido de staging;
o backend continua recebendo somente orderId/JWT e devolvendo preferenceId.
Nenhum secret é compartilhado com o SDK. O checkoutUrl persistido é mantido por
compatibilidade, mas o frontend novo não o abre nem altera seu domínio.

A configuração do código é fonte de verdade para o deploy; variáveis de texto
cadastradas no painel não preenchem automaticamente o arquivo e podem ser
substituídas por ele. Preservar os secrets remotos já cadastrados.

A parte 2 não salva notificações no painel Mercado Pago, não redefine assinatura
nem ativa o frontend. A URL de webhook no código é o destino planejado; presença
de secret não comprova que o painel aponta para a aplicação correta ou que HMAC
foi testado. Conferir isso após publicar o endpoint na parte seguinte.

Verificação: suíte permanente de pagamentos com 116 testes, guard, tipos,
build dry-run e testes online documentados em
[publicação de staging](../../docs/PUBLICACAO_PAGAMENTOS_STAGING_2026-10-22.md).
Secrets reais não são usados nos testes unitários; o smoke online usa conta QA.

Publicação remota configurada pelo Workers Builds, com a conexão Git da loja e
referência ao token de build existente, sem obter seu valor. Pushes na
home-v2-contraste acionam também o Worker de pagamentos; previews ficam desligados.
Build `npm run worker:stage:prepare`, deploy `npm run worker:stage:deploy`, raiz `/`,
Node 24. O release exige branch/commit da Cloudflare, configuração exata de
staging/sandbox, flag explícita true ou false conferida no manifesto/fingerprint
atual e secrets presentes por nome.
Não executar o deploy de release fora do Workers Builds ou contornar seus gates.

```sh
npm run worker:stage:check    # offline, sem publicação
npm run worker:stage:prepare  # testes e dry-run; não publica
```

A substituição inicial do Hello World exigiu exceção pontual validada por IDs
imutáveis conhecidos. A exceção e sua variável de build foram removidas após
o sucesso. Os scripts atuais voltaram a exigir --strict no deploy normal.

```sh
npm run worker:deploy -- staging --check
npm run worker:deploy -- staging
```

A checagem é offline; não verifica os valores dos secrets ou acesso ao provedor.
O deploy exige autenticação segura, domínio e configuração completos. Publicar
primeiro com PAYMENTS_ENABLED=false e comprovar health/CORS/autorização. Só então
preparar o preview e ativar submissões de sandbox para os testes autorizados.
Não contornar o guard com deploy direto ou secrets via --var.

Depois de alterar os bindings de staging, regenerar tipos pelo Wrangler:

```sh
npx wrangler types workers/payments/src/env.d.ts --config workers/payments/wrangler.jsonc --env staging --env-interface WorkerBindings --strict-vars=false --include-runtime=false
```

## Limites antes de produção

A reconciliação automática, recuperação de claims/timeout, expiração segura das
reservas já submetidas, estado definitivo da reserva, limpeza seletiva do carrinho,
controles de abuso e operação produtiva continuam no planejamento. Não liberar
estoque ou repetir um POST desconhecido apenas porque o cliente viu timeout.

Logs da aplicação usam allowlist de evento, ID gerado e status. Observabilidade
automática está desativada no scaffold para evitar captura indevida; monitoramento
com redaction e alertas deve ser definido antes da produção.

Referências: [contrato atual](../../docs/adr/002-checkout-pro.md),
[histórico ADR 001](../../docs/adr/001-payments-worker.md),
[estado remoto e versões das migrations](../../supabase/README.md).
