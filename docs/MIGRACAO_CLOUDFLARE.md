# Migração de hospedagem — Cloudflare

Decisão de 20/10/2026: site e APIs na Cloudflare, sem Vercel. Atualização de
21/10/2026: **port local e CI de verificação preparados; configuração/deploy e
aceite remoto pendentes**. Este documento complementa o [roadmap](../roadmap.md).
Desenvolvimento e aceite na `home-v2-contraste`; `main` aguarda a conclusão da loja.

## Arquitetura aprovada

| Componente | Destino |
| --- | --- |
| React/Vite, build `dist/`, rotas da loja e painel | Worker da loja + Workers Static Assets |
| APIs `/api/checkout/*` e `/api/admin/users` | Mesmo Worker da loja, mesma origem do site |
| Preferência, status e webhook Mercado Pago | Worker separado `workers/payments` |
| Banco, Auth e demais recursos Supabase existentes | Permanecem no projeto atual, sem mover dados |
| Checkout hospedado | Mercado Pago Checkout Pro |
| Expiração e futura reconciliação | Agendamentos Cloudflare, com persistência no banco |

Não é necessário reescrever o frontend em Next.js, adotar D1 ou unificar os dois
Workers. Não criar proxy nem fallback para a Vercel. Nomes do Worker da loja e
domínio de staging serão definidos e registrados antes da publicação; não são
recursos já criados. Preservar o domínio de pagamentos de staging existente.

O código do novo Worker está em [workers/storefront](../workers/storefront/README.md).
Nome proposto: `nada-normal-storefront-staging`. Itens marcados abaixo significam
implementação/verificação local, não comprovação no Supabase ou domínio remotos.

## Sequência de execução e aceite

### A. Inventário e port das APIs

- [x] Portar `api/checkout/quote.ts`, `order.ts`, `cancel.ts`,
  `expire-reservations.ts` e `api/admin/users.ts` para Request/Response e bindings.
- [x] Reutilizar os núcleos `server/` após revisar `Buffer`, `node:crypto`,
  `process.env` e dependências Node; preferir Web APIs e validar compatibilidade
  no workerd. Não importar handlers `@vercel/node` no Worker.
- [x] Manter métodos, contratos, erros, limites de corpo, timeouts e resposta JSON;
  preservar `/api/checkout/order` relativo usado pelo frontend.
- [x] Validar JWT, dono do pedido e autorização administrativa no servidor;
  padronizar bindings públicos/secretos, inclusive aliases legados do admin.
- [x] Preservar cálculo autoritativo, idempotência, transações e proteção contra
  cancelamento/liberação de estoque após submissão ao provedor.
- [x] Portar testes positivos/negativos para o runtime Workers, incluindo admin,
  expiração e a recusa de usuário comum ou sem sessão.

Aceite: cinco handlers funcionam em workerd sem Vercel; stubs antigos do Worker
de pagamentos não substituem o port. Não reaplicar migrations para mudar hosting.

### B. Site, roteamento e configuração

- [x] Criar configuração versionada do Worker da loja com Static Assets `dist/`.
- [x] Dar prioridade explícita a `/api/*`; rota de API desconhecida deve retornar
  erro JSON/404 e método inválido 405, nunca o `index.html` do SPA.
- [x] Validar acesso direto/refresh em produto, conta, admin e retornos de checkout.
- [x] Revisar cache: assets com hash podem ser duradouros; HTML deve permitir
  atualização; APIs autenticadas/financeiras não podem ficar em cache público.
- [ ] Revisar HTTPS, redirects, headers de segurança, imagens, favicon e robots.
- [ ] Separar staging/produção e variáveis públicas `VITE_*` no build de secrets
  de runtime. Nunca enviar chaves secretas ao bundle ou aos logs.
- [ ] Ajustar origens exatas de CORS e retorno no Worker de pagamentos e URLs
  autorizadas de Auth. Validar cadastro, confirmação, login e recuperação de senha.

O Supabase continua compartilhado conforme decisão anterior. A troca de origem
pode exigir novo login e não transfere localStorage/sessionStorage do navegador:
avisar sobre carrinho/sessão e reconciliar pedidos em andamento no servidor,
sem gerar cobranças novas por perda de chave local de idempotência.

### C. Automação e publicação de staging

- [ ] Definir uma única pipeline de deploy Cloudflare a partir do GitHub, com
  testes, typecheck e build antes de publicar. Registrar URL, branch e commit.
- [ ] Proteger secrets e deploys contra código de PRs não confiáveis; não liberar
  staging compartilhado a qualquer preview. Não usar wildcard no CORS.
- [ ] Manter pagamentos desligados e não ativar produção a partir de `main`.
- [ ] Definir um único agendamento de expiração, com autenticação caso se mantenha
  endpoint HTTP; desabilitar execução legada para evitar dois schedulers.
  Reconciliação financeira é outro trabalho, não o processador de expiração.
- [ ] Conferir plano, requests, CPU, builds, logs e limites de ambos os Workers;
  estimar consumo e configurar alertas disponíveis. Alertas não são teto de gasto.
- [ ] Publicar staging e testar site → API Cloudflare → Supabase → resposta.

Aceite: Network do navegador e configurações não dependem de `*.vercel.app`;
as cinco APIs, login e navegação passam no [roteiro](ROTEIRO_DE_TESTES.md).
Depois, seguir Etapas 1 e 2 do roadmap para habilitar apenas Checkout Pro sandbox.

### D. Corte definitivo e retirada do legado

Executar somente após aceite técnico/funcional e autorização do rollout:

- [ ] Registrar configuração anterior de DNS/domínios e versão Cloudflare estável;
  definir janela, responsável, verificações e rollback antes da troca.
- [ ] Apontar domínio principal à Cloudflare, validar TLS e forma canônica
  (`www`/raiz), URLs Supabase e retorno/webhook Mercado Pago por ambiente.
- [ ] Repetir smoke tests públicos e confirmar ausência de chamadas à Vercel.
- [ ] Remover `vercel.json`, `@vercel/node` e overrides associados quando nenhum
  código/teste depender deles. Atualizar lockfile, scripts e checks obrigatórios
  do GitHub para não aguardar deploy Vercel desativado.
- [ ] Desconectar deploys automáticos Vercel e desativar o legado. Exclusão de
  projetos, domínios ou secrets exige validar alvos e autorização específica;
  esta atualização documental não realiza essas operações.
- [ ] Remover origens/retornos Vercel das allowlists e referências operacionais;
  manter apenas referências explicitamente históricas nos documentos.

Rollback: reverter para versão estável na própria Cloudflare; se não houver uma
versão segura, manter checkout indisponível/loja em manutenção. Desligar novas
submissões sem interromper webhook/status para pagamentos em andamento. Não
restaurar Vercel, apagar pedidos ou desfazer migrations como recuperação.

## Limites desta decisão

Cloudflare paga é aceitável, mas não garante custo sempre inferior à Vercel.
O plano e a estimativa precisam ser revisados antes de contratar/ativar cobrança.
Não há alteração do banco, deploy, mudança de DNS, contratação ou exclusão de
recursos nesta entrega preparatória. `vercel.json` bloqueia novos deploys Git
desta branch; não desconecta projetos nem remove deploys anteriores.
Migrations aplicadas continuam preservadas.

## Referências

- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).
- [Rotas SPA e prioridade de APIs](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).
- [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).
- [Custos e limites de assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
- [Preços de Workers](https://developers.cloudflare.com/workers/platform/pricing/).
