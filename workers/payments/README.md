# API de pagamentos — Fase 0

Worker TypeScript ES Modules isolado do SPA e dos handlers Vercel. A única
funcionalidade ativa é health/CORS. Nenhuma rota cria pedido, cobra, autentica
usuário ou confirma webhook nesta fase. O frontend continua no fluxo existente.

Arquitetura e contratos: [ADR 001](../../docs/adr/001-payments-worker.md).

## Desenvolvimento local

Use Node.js 22.18+ ou 24+ (validado com 24.19.0). Na raiz do repositório:

```sh
npm ci
npm run worker:test
npm run worker:typecheck
npm run worker:build
npm run worker:dev
```

O build usa `wrangler deploy --dry-run`, sem upload. O servidor usa workerd
local, na porta 8787, sem credenciais ou serviços externos. O SPA pode rodar
separadamente com `npm run dev` na porta 8080. Para máquinas na nuvem com o
diretório de configuração do usuário somente para leitura, use
`XDG_CONFIG_HOME=/workspace/.config npm run worker:dev` e o mesmo prefixo no
build. O wrapper guarda logs locais em `.wrangler/logs` e desativa métricas do
Wrangler; não altera a localização de autenticação em máquinas comuns.

Readiness local:

```sh
curl --fail http://127.0.0.1:8787/health
curl -i -X OPTIONS http://127.0.0.1:8787/v1/checkout/orders \
  -H 'Origin: http://localhost:8080' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: authorization,content-type,idempotency-key'
curl -i -X POST http://127.0.0.1:8787/v1/checkout/payments
```

Esperado: health `200`, preflight `204`, pagamento `503 PAYMENTS_DISABLED`.
Origem não cadastrada: `403`, sem `Access-Control-Allow-Origin`. Health informa
versão, ambiente e configuração local válida; **não verifica disponibilidade
do Supabase nem do Mercado Pago**. Logs da aplicação contêm somente evento,
ID gerado e status HTTP. Observabilidade automática do Worker fica desativada
para não capturar URLs e dados de requisição.

`npm test` continua cobrindo frontend/server existentes. Execute também
`npm run worker:test`; a suíte do Worker usa Node e configuração separada.

## Ambientes e secrets

`wrangler.jsonc` deve permanecer JSON compatível, sem comentários, para a
checagem de deploy. Nenhum domínio ou ID de conta é presumido.

| Configuração | Local | Staging / production |
| --- | --- | --- |
| `APP_ENV` | `local` | corresponde ao ambiente selecionado |
| `PAYMENTS_ENABLED` | `"false"` | `"false"`; `true` é inválido na Fase 0 |
| `ALLOWED_ORIGINS` | loopback, portas exatas | lista HTTPS explícita separada por vírgulas |
| `SUPABASE_URL` | dispensável | origem HTTPS do projeto escolhido |
| `SUPABASE_PUBLISHABLE_KEY` | dispensável | chave pública do projeto escolhido |
| `SUPABASE_SECRET_KEY` | dispensável | secret remoto obrigatório |
| `MP_ACCESS_TOKEN` | dispensável | secret remoto obrigatório, de teste em staging |
| `MP_WEBHOOK_SECRET` | dispensável | secret remoto obrigatório, separado por ambiente |

Nunca colocar os três secrets em `vars`, `VITE_*`, Git, exemplos, logs ou chat.
`.dev.vars` e seus sufixos estão ignorados, mas não são necessários para health
local. A Public Key do Mercado Pago será configurada no SPA na fase do Brick;
não é usada pelo Worker da Fase 0. Não usar chaves de produção em staging.

## Preparação de staging (pendente de dados externos)

Origens de staging informadas pelo usuário e registradas na configuração:
`https://nada-normal-movement-2sr4ux7cw.vercel.app` e
`https://www.nadanormalclub.com.br`. A URL Vercel pode identificar um deploy
específico; se mudar, atualizar a allowlist explicitamente. Domínio proposto
do Worker: `pagamentos-staging.nadanormalclub.com.br`, ainda sujeito à
confirmação de associação no Cloudflare. O usuário autorizou usar o projeto
Supabase atual, pois a loja ainda não abriu. Testes futuros nesse banco devem
ter registros identificáveis e limpeza direcionada; migrations exigem backup
antes da aplicação. A Fase 0 não acessa o banco.

1. Confirmar a origem Vercel de staging, a de produção e se haverá Supabase
   separado. Não usar wildcard para previews nem incluir todas as origens
   Vercel. Cada origem precisa de autorização explícita.
2. Selecionar conta Cloudflare e um domínio dedicado de staging. Preencher
   `env.staging.vars` e acrescentar `env.staging.routes`, por exemplo uma
   entrada `{ "pattern": "<domínio real>", "custom_domain": true }`. Não
   adicionar rotas na raiz da configuração. `workers_dev` e `preview_urls`
   permanecem `false`.
3. Autenticar o Wrangler em uma sessão segura (`wrangler login` ou API token
   de escopo restrito em CI). Não salvar autenticação no repositório.
4. Cadastrar secrets pelo painel Cloudflare ou por prompts seguros, usando
   `npx wrangler secret put <NOME> --config workers/payments/wrangler.jsonc
   --env staging`. O primeiro cadastro pode criar o Worker placeholder;
   conferir nome, conta e ambiente antes de confirmar. Não passar valores na
   linha de comando. Fazer bootstrap do placeholder e bindings somente após
   selecionar a conta/domínio; não é parte dos testes locais.
5. Rodar `npm run worker:deploy -- staging --check`. Esta checagem é offline:
   valida domínio, origens, Supabase, flag e declarações; não prova que secrets
   remotos existem ou que suas credenciais funcionam.
6. Após autorização do deploy de staging, rodar `npm run worker:deploy --
   staging`. O wrapper bloqueia configuração incompleta; o Wrangler fixado no
   lockfile exige `secrets.required`; Cloudflare rejeita bindings ausentes. Ausência
   de binding impede o deploy. Nunca usar `--var` para injetar secrets ou
   contornar a checagem, nem executar deploy da configuração local.
7. Repetir os três requests acima no domínio de staging, com sua origem
   permitida, e testar origem recusada. Health deve responder
   `environment: staging`, `paymentsEnabled: false`; payment/webhook continuam
   indisponíveis. Isso conclui a validação remota da Fase 0.

Credenciais presentes não provam acesso funcional ao provedor: essa validação
pertence ao sandbox, antes de habilitar qualquer cobrança. Não cadastrar o
webhook deste scaffold como receptor ativo de pagamentos: ele retorna `503` e
não persiste/ACK eventos. A URL/assinatura será preparada no painel apenas no
momento adequado da fase de webhook.

Produção tem configuração e secrets próprios. O script aceita `production`,
mas sua publicação e ativação pertencem ao rollout da Fase 5 e exigem decisão
separada. Nenhum deploy remoto foi executado nesta entrega.

## Evidências locais de 16/10/2026

- 57 testes do Worker e 80 testes existentes passaram, em suítes separadas.
- TypeScript do Worker e do app, bundle do Worker e build do SPA passaram.
- Lint: zero erros, 8 avisos preexistentes; build do SPA avisa sobre chunk grande.
- Smoke no workerd real: health `200`, preflight permitido `204`, origem
  desconhecida `403`, payment e webhook `503`.
- `worker:deploy -- staging --check` recusou a configuração ainda vazia antes
  de qualquer chamada Cloudflare. Secrets remotos e staging não foram testados.
- O simulador não conseguiu baixar metadados opcionais `Request.cf` pelo proxy;
  usou o placeholder do Wrangler. Nenhuma rota desta fase depende desse objeto.
