# Loja e APIs — Cloudflare Workers

Preparação do passo 2 em 21/10/2026, branch `home-v2-contraste`. Sem deploy,
DNS, migrações ou ativação de cobrança. Este Worker não substitui
[`workers/payments`](../payments/README.md): cada um tem bindings próprios.

## Implementado nesta etapa

- React/Vite `dist/` por Workers Static Assets, com fallback do React Router.
- Cinco APIs na mesma origem: orçamento, pedido, cancelamento, expiração e usuários admin.
- Request/Response, leitura de JSON limitada, timeout de upstream, erros sanitizados,
  `private, no-store` em todas as respostas de API e ID de requisição.
- Supabase SDK com clientes por requisição; JWT consultado no Auth, admin somente
  por `app_metadata.role`, dados financeiros recompostos por RPCs existentes.
- Agendamento com gate explícito; **nenhum Cron Trigger cadastrado**. Endpoint
  HTTP de expiração exige secret próprio; não aceita sessão de comprador.
- CI de testes sem secrets/deploy, staging e produção separados e desativados.

As rotas `/api` e `/api/*` sempre passam pelo Worker antes do fallback SPA,
inclusive numa navegação direta do navegador. API desconhecida retorna JSON/404.
O arquivo `public/_headers` controla cache de assets/HTML e headers de segurança;
APIs definem seus próprios headers. Arquivos estáticos podem não passar pelo
handler, logo nem todos terão `X-Request-Id` da aplicação.

## Comandos locais (na raiz)

```sh
npm ci
npm run build
npm run shop:types
npm run shop:typecheck
npm run shop:build
npm run shop:test
npm run shop:dev
```

Build é bundle/dry-run, sem upload; `shop:dev` usa workerd local na porta 8788.
`shop:test` usa Miniflare/workerd, o bundle e o `dist/` recém-gerados; upstream
Supabase é inteiramente simulado, sem consulta ao banco da loja. Executar build
antes dos testes para não testar bundle antigo. CI garante essa ordem.

A compatibility date é 19/10/2026, a mais recente aceita pelo binário workerd
instalado nesta preparação; não anunciar teste com data futura não suportada.

No ambiente cloud, usar `XDG_CONFIG_HOME=/workspace/.config` para Wrangler se
necessário. `.dev.vars`, `.wrangler/` e logs são ignorados pelo Git. Tipos são
gerados de `wrangler.jsonc`, não editar `src/env.d.ts` manualmente.

## Configuração pendente do passo 3

Worker `nada-normal-storefront-staging` criado pelo usuário, inicialmente Hello World.
URL: `https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev`.
Git conectado à home-v2-contraste, builds habilitadas pelo usuário. MCP reconectado e variáveis
Supabase conferidas. `RESERVATION_PROCESSOR_SECRET` foi gerado com Web Crypto e
cadastrado somente nesse Worker, sem exibir seu valor. Nenhum cron foi habilitado.

| Binding | Uso |
| --- | --- |
| APP_ENV | local / staging / production |
| SHOP_API_ENABLED | false inicialmente; true apenas após configurar staging |
| RESERVATION_PROCESSOR_ENABLED | false até definir scheduler único e ensaiar expiração |
| SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY | Dados públicos do projeto atual |
| SUPABASE_SECRET_KEY | Secret do backend, nunca VITE_* |
| RESERVATION_PROCESSOR_SECRET | Secret novo de pelo menos 16 caracteres para a rota de expiração |
| ASSETS | Gerado pela configuração de Static Assets |

O admin usa os mesmos bindings canônicos de Supabase das APIs de pedido, sem
exigir nomes legados diferentes. O secret de expiração não é `MP_WEBHOOK_SECRET`.
Não copiar token Mercado Pago para este Worker: só pagamentos precisa dele.

`shop:prepare` gera build com dados públicos do wrangler, Checkout Pro desligado,
robots/noindex de staging e manifesto fora dos assets. Não requer secrets.
`shop:deploy` exige Workers Builds, WORKERS_CI_BRANCH=home-v2-contraste e
WORKERS_CI_COMMIT_SHA igual ao HEAD. Confere configuração, manifesto/fingerprint
dos assets, presença dos dois secrets e testes antes de publicar com --env staging.
`--check` é somente validação offline; não publica nem verifica credenciais.
Não contornar o guard com deploy direto. Secrets existentes são preservados.
`SHOP_API_ENABLED=true` não habilita APIs em APP_ENV=production nesta entrega.

Em Compilações: build `npm run shop:prepare`, deploy `npm run shop:deploy`,
raiz `/`, sem previews. A primeira versão mantém SHOP_API_ENABLED=false e
RESERVATION_PROCESSOR_ENABLED=false. Depois do primeiro deploy, validar assets,
health, cache e noindex antes de ativar APIs e testar URLs de Auth. Site/health
abrindo não significa checkout online validado. Comandos/branch foram confirmados
pelo MCP e pelo usuário; previews permanecem desativados.

Dependências: usar somente npm e `package-lock.json`. A primeira build remota
falhou antes da compilação porque o antigo `bun.lockb` fazia a Cloudflare escolher
`bun install --frozen-lockfile`. O lockfile Bun legado foi removido (recuperável
no Git); não recriar um segundo lockfile. A nova tentativa com npm concluiu.

Primeiro deploy da loja: commit `28402b6`, build
`ccbf8ac1-49fa-4ffc-b847-964ba9805259`, concluída em 21/10/2026. Site e rotas SPA
retornaram HTML 200, health informou staging/configured=true/apiEnabled=false,
API inexistente retornou JSON/404 e criação de pedido SHOP_API_DISABLED.
Robots/noindex e cache de HTML/assets conferidos; o bundle referencia o Supabase
correto, sem padrão de chave secreta identificado na inspeção. Isso não substitui
auditoria de segurança nem teste visual/autenticado. Banco, DNS principal e
Worker de pagamentos não foram alterados nesta publicação. Builds manuais pelo
MCP funcionaram; disparo automático em push ainda deve ser comprovado.

## Cuidados e limites

### Ativação controlada das APIs — 21/10/2026

Após o usuário validar persistência, totais, remoção, variantes separadas e carrinho
no celular, a configuração versionada passa a `SHOP_API_ENABLED=true` somente no
staging. O guard aceita exclusivamente as strings `true`/`false`; continua
rejeitando produção, domínio principal, cron e secrets em vars. O build mantém
Checkout Pro desligado. Não confundir APIs habilitadas com compra validada:
`prepareCheckout` ainda depende da flag de pagamento e não é acionado pela tela.
Testar autenticação e autorização remotamente; criação/idempotência/cancelamento
com sessão de teste continuam pendentes até ensaio autenticado específico.
Expiração automática e Worker de pagamentos permanecem inalterados/desligados.
Rollback: versionar `SHOP_API_ENABLED=false` e republicar pela mesma pipeline;
não apagar pedidos, produtos ou migrations.

Publicado no commit `83e4316`, build automática por push
`7d821664-bb4d-468f-8b39-adbe620e07e2` concluída com sucesso. CI GitHub
`39642258864` aprovado. 215 testes passaram: 86 app/server, 79 pagamentos e
50 storefront/guard. Verificação remota: health staging/configured=true/
apiEnabled=true, APIs sem sessão e sessão inválida 401, origem externa 403,
API desconhecida JSON/404; respostas `private, no-store`. Consulta somente
leitura confirmou RPCs e permissões do backend no Supabase. Nenhum pedido ou
cobrança criado neste ensaio. Criação de pedido autenticada ainda não validada.

Verificação desta preparação: 29 testes da loja em workerd, 86 do app/server e
79 de pagamentos passaram (194 no total), além de typechecks, builds/dry-runs
e lint sem erros (oito avisos preexistentes). Smoke local via Wrangler confirmou
health com APIs desligadas, API desconhecida em JSON/404, retorno do checkout
em HTML com revalidação e assets com cache imutável. Não houve teste online
de compra, migração SQL nem acesso de teste ao banco compartilhado.

Os handlers Vercel legados continuam em `api/` somente para comparação/regressão;
nenhum é importado pelo Worker ou usado como proxy. Sua remoção junto de
`@vercel/node`, `vercel.json` e a desconexão remota ocorre após aceite do port.
O CI novo não desconecta a integração GitHub/Vercel preexistente. O `vercel.json`
legado passa a declarar `git.deploymentEnabled=false` nesta branch para impedir
novos deploys Git dela. Deploys antigos não são apagados; a desconexão remota e
a verificação dos checks do GitHub continuam pendentes antes do corte definitivo.

Locks, idempotência e autorização de dono no banco continuam nas RPCs já
aplicadas; testes simulados verificam o transporte/contratos, não provam o E2E
remoto. Não reaplicar migrations, seeds ou bootstrap. Reconciliação financeira,
proteções de abuso, observabilidade com redaction e rollout produtivo ainda
estão no [roadmap](../../roadmap.md).
