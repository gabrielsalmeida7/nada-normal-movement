# Nada Normal — roadmap e fonte de verdade

> Última consolidação: 16 de outubro de 2026  
> Branch de referência: `home-v2-contraste`  
> Estado: **Fase 0 autorizada e em implementação; validação de staging pendente**.

Este documento é a fonte de verdade legível para o estado, as decisões e a
sequência de entrega do e-commerce Nada Normal. Em caso de conflito com planos
anteriores, este roadmap prevalece. Código, migrations e contratos executáveis
continuam sendo a autoridade sobre o comportamento já implementado.

## 1. Produto e estado atual

Nada Normal é uma marca e movimento para corredores que valorizam
autenticidade, comunidade e performance fora do padrão. O repositório contém a
presença digital da marca e a fundação de uma loja própria.

Hoje a aplicação oferece:

- frontend React 18 + TypeScript + Vite, publicado pela Vercel;
- catálogo, produtos, variantes e estoque no Supabase;
- autenticação, perfil, endereços e painel administrativo;
- carrinho persistido no navegador;
- checkout autenticado em quatro etapas;
- orçamento autoritativo no backend;
- criação transacional e idempotente de pedido;
- reserva de estoque com expiração e liberação sem dupla devolução;
- modelo financeiro com tentativas, inbox de webhook e outbox.

Hoje a aplicação **não** oferece:

- cobrança real;
- Payment Brick conectado ao checkout;
- adaptador Mercado Pago em produção;
- Cloudflare Worker publicado processando pagamentos (há scaffold local da Fase 0);
- webhook Mercado Pago;
- reconciliação financeira em execução.

A etapa de pagamento continua sendo um placeholder com a ação final
desabilitada. Portanto, a loja demonstra catálogo, carrinho e checkout, mas não
conclui compras.

### Baseline verificada

A base deste documento é `home-v2-contraste` no merge commit
[`29b122c`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/29b122c01c6f09c56c700e85d5c130cad56b28a4).
Nesse ponto, os Passos 1, 2, 3, 4 e 4.1 estão mesclados. Posteriormente, o gateway simulado do
Passo 5 foi incorporado pelo PR
[#6](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/6),
no commit `81ca0b7`. O PR #7 incorporou este roadmap no commit `a19eea0`.
Esses merges não conectam o gateway ao checkout nem habilitam cobrança real.

## 2. Histórico do que foi entregue

### Passo 1 — baseline e segurança

- PR [#1 — concluir baseline e segurança](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/1),
  mesclado em `home-v2-contraste` pelo commit
  [`c314cd6`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/c314cd61a3357a9f7cfaa032e4fee335d699d9ef).
- Atualizou dependências vulneráveis sem alterar o fluxo de checkout.
- Eliminou vulnerabilidades críticas e altas então conhecidas.
- Validações registradas: instalação limpa, 20 testes, build, TypeScript e lint
  sem erros; avisos preexistentes permaneceram documentados.

### Passo 2 — fundação financeira

- PR [#2 — fundação financeira Appmax-ready](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/2),
  mesclado na branch do Passo 1 pelo commit
  [`83f4d91`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/83f4d9109d51dc9dac6e0c45959b1912d9a172bc)
  e incorporado a `home-v2-contraste` pelo PR #1.
- Separou estado financeiro do estado logístico.
- Criou `payment_attempts`, `webhook_events` e `outbox_jobs`.
- Restringiu escrita financeira a código server-side.
- Validações registradas: migrations do zero em PostgreSQL local, teste SQL
  transacional com rollback, 20 testes e build.

### Passo 3 — orçamento autoritativo

- PR [#3 — orçamento autoritativo do checkout](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/3),
  mesclado pelo commit
  [`886e17b`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/886e17b4f4dfb4a39574210a601f0410e90f4622).
- Criou `POST /api/checkout/quote` com autenticação e limites de payload.
- Reconsulta catálogo, preço e estoque no Supabase e ignora valores enviados
  pelo navegador.
- Centralizou o cálculo monetário em centavos.
- Validações registradas: 36 testes em 9 arquivos, TypeScript, lint e build.

### Passo 4 — pedido transacional e idempotente

- PR [#4 — criação transacional e idempotente de pedidos](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/4),
  mesclado pelo commit
  [`021c20b`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/021c20b9da3d6f30cd825c65d86047f1c6e91a25).
- Criou RPC transacional que relê catálogo e endereço, trava variantes, calcula
  valores, reserva estoque e grava pedido, itens e tentativa.
- Criou `POST /api/checkout/order` autenticado com `Idempotency-Key`.
- Impediu overselling por locks ordenados e atualizações condicionais.
- Preservou replay da mesma chave sem repetir efeitos.
- Validações registradas: 55 testes em 11 arquivos, migrations e testes SQL,
  concorrência real, rollback, TypeScript, lint e build.

### Passo 4.1 — reserva, liberação e frete

- PR [#5 — reservas e frete](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/5),
  mesclado pelo commit
  [`29b122c`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/29b122c01c6f09c56c700e85d5c130cad56b28a4).
- Adicionou reserva de 30 minutos, trilha append-only e job de outbox.
- Implementou cancelamento autenticado e expiração com liberação idempotente.
- Unificou no banco a regra de frete usada pelo orçamento e pelo pedido.
- Moveu núcleos e testes para fora de `api/`, mantendo cinco Vercel Functions e
  respeitando o limite observado do plano.
- Validações registradas: testes afetados, SQL com rollback, concorrência de
  checkout/liberação, TypeScript e deploys Vercel posteriormente verdes.

### Passo 5 — gateway simulado incorporado, sem cobrança

- PR [#6 — gateway de pagamento simulado](https://github.com/gabrielsalmeida7/nada-normal-movement/pull/6),
  commit principal de documentação
  [`a9ab19e`](https://github.com/gabrielsalmeida7/nada-normal-movement/commit/a9ab19e77e371fe2ca166180869c974f660a6e36).
- Estado: **mesclado em `home-v2-contraste` pelo commit `81ca0b7`**.
- Define contrato `PaymentGateway` e adaptador determinístico para aprovação,
  autorização em análise, recusa, timeout desconhecido e replay idempotente.
- Não chama provedor, não persiste resultados, não liga o checkout e não
  substitui idempotência durável no banco.
- Validações registradas no PR: 80 testes em 15 arquivos, TypeScript estrito,
  lint, build e cinco handlers em `api/`.
- Decisão: reaproveitar seletivamente contrato, invariantes e testes; o
  adaptador em memória não é a implementação final do gateway.

Todos os PRs #1–#6 possuem checks de deploy Vercel aprovados no estado
consultado. As contagens acima são os resultados registrados em cada PR, e não
uma validação atual de produção. Na base `81ca0b7`, os 80 testes em 15 arquivos,
TypeScript e build passaram; lint teve zero erros e 8 avisos existentes.

## 3. Histórico Appmax e decisão encerrada

A Appmax foi analisada como primeiro provedor. O trabalho incluiu:

- diagnóstico do frontend, checkout, Supabase, RLS e modelo de pedidos;
- distinção entre integração direta por loja e fluxo Appstore;
- estudo de OAuth, Appmax JS, tokenização, sandbox, estados, webhooks, limites
  de requisição e reconciliação;
- desenho de uma arquitetura Vercel Functions + Supabase;
- criação dos Passos 1–4.1 de fundação independente de provedor;
- proposta de gateway simulado no PR #6.

Apesar de tecnicamente possível, a integração foi descartada antes de qualquer
cobrança real. O custo operacional e a burocracia para habilitação, acesso,
credenciais e dependências comerciais não são aceitáveis para o MVP. Também
pesaram o contrato de webhook sem assinatura HMAC documentada e a necessidade
de confirmação server-to-server para eventos financeiros.

### Decisão explícita

**A Nada Normal abandona a integração Appmax.**

Consequências:

- não serão solicitadas nem mantidas novas credenciais Appmax;
- não será implementado OAuth, Appmax JS, API transacional ou webhook Appmax;
- nomes Appmax já presentes no schema serão neutralizados por migrations
  aditivas, sem reescrever migrations já aplicadas;
- documentos e commits Appmax permanecem somente como histórico;
- a fundação agnóstica de provedor já entregue será preservada;
- o PR #6 só será usado como fonte seletiva de contrato e testes.

Reabrir a Appmax exigiria uma nova decisão explícita e um novo plano. Ela não é
fallback da arquitetura atual.

## 4. Arquitetura aprovada

```text
Vercel — React/Vite
  ├─ Supabase Auth, catálogo e dados permitidos por RLS
  ├─ Mercado Pago Payment Brick com Public Key
  └─ JWT + IDs/quantidades + token opaco
                         │
                         ▼
Cloudflare Workers — API de pagamentos
  ├─ CORS por allowlist e validação de payload
  ├─ autenticação Supabase e autorização por dono
  ├─ quote, pedido, pagamento e status
  ├─ Payments API do Mercado Pago
  ├─ webhook com validação x-signature
  └─ cron de inbox, outbox, expiração e reconciliação
                         │
                         ▼
Supabase Postgres — autoridade local
  ├─ catálogo, preço, frete e estoque
  ├─ pedido, itens e tentativa
  ├─ reserva e trilha financeira
  └─ inbox de webhook e outbox idempotente
```

### Divisão de responsabilidades

- **Vercel:** entrega o SPA. Não recebe segredo de provedor nem processa dados
  brutos de cartão.
- **Payment Brick:** coleta e tokeniza cartão/Pix no navegador. PAN e CVV nunca
  devem passar pelo código Nada Normal.
- **Cloudflare Worker:** é a fronteira server-side de checkout e pagamentos.
  Valida identidade, recompõe valores pelo banco e chama o Mercado Pago.
- **Supabase:** é a fonte de verdade local para catálogo, preço, frete, estoque,
  pedido e estado financeiro.
- **Mercado Pago:** processa pagamentos e fornece confirmação externa; não é o
  único registro do pedido.

O SPA continuará na Vercel. Não haverá migração de hospedagem do frontend nesta
etapa. O Worker terá domínio separado e rollout reversível.

### Rotas planejadas

| Método e rota | Proteção | Responsabilidade |
| --- | --- | --- |
| `GET /health` | pública e mínima | versão, ambiente e disponibilidade |
| `POST /v1/checkout/quote` | JWT Supabase | portar orçamento atual |
| `POST /v1/checkout/orders` | JWT + idempotência | criar pedido transacional |
| `POST /v1/checkout/payments` | JWT + tentativa | enviar pagamento |
| `GET /v1/checkout/orders/:id/status` | JWT + dono | status e Pix sanitizados |
| `POST /webhooks/mercadopago` | `x-signature` | persistir e deduplicar evento |
| `scheduled()` | cron | inbox, outbox, expiração e reconciliação |

Não haverá endpoint de preferência no MVP.

## 5. Reaproveitar, portar e descartar

### Reaproveitar

- autenticação Supabase, catálogo, variantes, estoque, perfis e endereços;
- carrinho e checkout visual, após conexão à API autoritativa;
- `financial_status`, `payment_attempts`, `webhook_events` e `outbox_jobs`;
- orçamento autoritativo, cálculo em centavos e regra central de frete;
- RPC transacional, locks, idempotência de pedido e reserva de estoque;
- cancelamento e liberação sem dupla devolução;
- contrato, invariantes e cenários determinísticos úteis do PR #6;
- Vercel para o frontend e Supabase como banco autoritativo.

### Portar ou adaptar

- endpoints `quote` e `order` das Vercel Functions para o Worker;
- cancelamento, expiração e processamento de outbox para o runtime Worker;
- componente e tema do Payment Brick legado, reescritos contra a nova API;
- nomes e constraints financeiros Appmax para campos neutros/Mercado Pago por
  migration aditiva;
- reserva para incluir estado `committed` e tentativas
  `submitted`, `pending` e `unknown`;
- estados do contrato simulado para o mapeamento real do Mercado Pago, sem
  presumir equivalência literal.

### Não reutilizar ou ativar

- integração Appmax, OAuth, Appmax JS, webhooks ou credenciais;
- `src/lib/orders.ts` como caminho de escrita: aceita dados do navegador e não
  oferece a transação necessária;
- handlers antigos de Mercado Pago sem validação de assinatura, dedupe e
  reconciliação;
- chave de idempotência aleatória a cada tentativa;
- resposta síncrona do provedor como confirmação definitiva;
- memória do gateway simulado como ledger;
- preço, total, usuário, status ou referência externa enviados pelo browser;
- queries de retorno como prova de pagamento.

Os endpoints Vercel existentes permanecem como fallback até o Worker passar por
smoke e E2E. A remoção será feita em PR separado. Migrations aplicadas não serão
apagadas ou reescritas.

## 6. Fase atual e próximo passo

**Fase atual: Fase 0 autorizada pelo usuário em 16/10/2026 e em implementação.**

O scaffold local, contratos e testes ficam em `workers/payments` e
[ADR 001](docs/adr/001-payments-worker.md). A cobrança permanece desabilitada.
Não há port de checkout, migration ou chamada de provedor nesta entrega.

**Próximo passo: confirmar conta/domínio/origens e Supabase de staging, cadastrar
bindings por canais seguros e validar deploy/health de staging.** Recursos e
deploy de produção continuam fora do escopo; não confundir testes locais com
validação remota ou integração real do Mercado Pago.

## 7. Roadmap completo

### Fase 0 — contrato, ambientes e kill switch

Status: **autorizada; scaffold e contratos implementados, staging pendente**.

Entregas de código:

- ADR com arquitetura, contratos HTTP e matriz de estados;
- scaffold TypeScript ES Modules do Worker;
- `GET /health`, CORS por ambiente e validação de configuração;
- ambientes local, staging e production;
- `PAYMENTS_ENABLED=false` por padrão;
- testes de health, CORS, redaction e secrets obrigatórios.

Evidência local da entrega: 57 testes novos do Worker e 80 testes existentes
passaram; TypeScript do app/Worker e ambos os builds passaram. Lint sem erros,
com 8 avisos existentes. Smoke em workerd confirmou health `200`, preflight
`204`, origem recusada `403` e pagamento/webhook bloqueados (`503`). O guard
recusou o staging não configurado. Deploy e smoke remotos permanecem pendentes.

Responsabilidades do usuário:

- início autorizado em 16/10/2026;
- criar ou selecionar a aplicação Mercado Pago;
- disponibilizar Public Key e Access Token de teste pelos secret managers;
- criar/configurar conta, Worker e domínio de staging na Cloudflare;
- confirmar origens Vercel de staging e produção;
- configurar webhook de staging e guardar seu segredo de assinatura;
- confirmar se o Supabase atual é de teste ou fornecer staging separado.

Critérios de aceite:

- health de staging responde sem revelar configuração sensível;
- preflight aceita somente origens autorizadas;
- deploy incompleto falha quando falta secret obrigatório;
- cobrança permanece desabilitada;
- nenhum secret aparece no Git, bundle, logs ou respostas.

### Fase 1 — banco neutro e fundação no Worker

Entregas de código:

- migration aditiva para provedor neutro/Mercado Pago;
- IDs e estados externos, índices e reserva `committed`;
- RPCs de claim, submissão e transição monotônica;
- port de quote, order, cancel e expiration para o Worker;
- autorização por dono e testes SQL/de concorrência.

Responsabilidades do usuário:

- revisar/aplicar migration em staging;
- validar regra comercial de frete e prazo de reserva;
- confirmar retenção de dados pessoais e dados Pix.

Critérios de aceite:

- valor adulterado no browser é ignorado;
- duas compras não vendem a última unidade;
- replay devolve o mesmo pedido;
- usuário não acessa pedido alheio;
- pedido pago nunca tem estoque liberado pela expiração;
- rollback não deixa pedido, item, tentativa ou reserva órfã.

### Fase 2 — UI com gateway simulado

Entregas de código:

- portar seletivamente contrato e testes do PR #6;
- integrar Payment Brick e seu tema sem ativar provedor real;
- ligar quote → order → pagamento simulado;
- implementar estados de sucesso, pendência e erro pela API local;
- manter placeholder como fallback do kill switch.

Responsabilidades do usuário:

- aprovar copy e experiência de Pix/cartão;
- definir parcelamento máximo exibido;
- validar UX móvel, acessibilidade e comportamento do carrinho.

Critérios de aceite:

- clique duplo e refresh não criam outra tentativa;
- carrinho só limpa após `paid`;
- `pending` ou `unknown` nunca aparece como sucesso;
- token não é persistido ou devolvido;
- PAN/CVV não aparece em request do Worker, banco, logs ou analytics.

### Fase 3 — Mercado Pago sandbox

Entregas de código:

- adaptador da Payments API com chave estável por tentativa;
- envio de token opaco e contexto autoritativo;
- resposta sanitizada e dados Pix mínimos;
- endpoint de status autenticado;
- tratamento de `4xx`, `429`, `5xx`, timeout e resposta inválida.

Responsabilidades do usuário:

- cadastrar Public Key de teste na Vercel;
- cadastrar Access Token de teste no Worker;
- executar cenários oficiais atuais de cartão e Pix;
- validar parcelamento e textos financeiros.

Critérios de aceite:

- cenários aprovado, pendente, recusado e Pix exercitam estados corretos;
- valores Mercado Pago e Supabase coincidem em BRL;
- replay da tentativa não cria segundo pagamento;
- timeout após envio vira `unknown`, sem retry cego;
- PAN/CVV continuam ausentes do backend, banco e telemetria.

### Fase 4 — webhook e reconciliação

Entregas de código:

- parser e validação completa de `x-signature`;
- comparação HMAC em tempo constante;
- inbox deduplicada com ACK rápido;
- consulta server-to-server antes de transição financeira;
- cron de reconciliação, reservas e outbox;
- backoff, dead-letter e observabilidade.

Responsabilidades do usuário:

- disparar o teste de webhook no painel;
- confirmar URL, segredo, tópico e ambiente;
- definir a janela operacional de reserva Pix;
- revisar alertas e procedimento de reprocessamento.

Critérios de aceite:

- assinatura inválida não altera dados;
- duplicatas causam uma transição e um efeito;
- evento atrasado não regride estado;
- pagamento aprovado muda reserva para `committed`;
- reconciliação corrige evento perdido ou divergência;
- job falho permanece observável e reprocessável.

### Fase 5 — produção gradual

Entregas de código:

- CI com lint, testes, typecheck, build e deploy de staging;
- smoke de preview/staging;
- Worker de produção inicialmente com cobrança desabilitada;
- dashboards, alertas e runbooks;
- rollout gradual e rollback ensaiado;
- remoção posterior e separada dos endpoints legados.

Responsabilidades do usuário:

- ativar credenciais Mercado Pago de produção;
- cadastrar Public Key, Access Token e assinatura no ambiente correto;
- configurar webhook de produção;
- aprovar compra real controlada de baixo valor;
- definir operação de estorno, chargeback e suporte;
- autorizar a ativação do kill switch e cada avanço de tráfego.

Critérios de aceite:

- E2E confirma browser → Worker → Mercado Pago → webhook → Supabase;
- alertas cobrem 5xx, assinaturas inválidas em volume, backlog,
  `unknown` antigo e divergência financeira;
- rollback foi executado em ensaio;
- kill switch bloqueia novas cobranças sem interromper status, webhook ou
  reconciliação;
- compra real controlada e estorno previsto são auditáveis.

## 8. Ações imediatas

1. Concluir validação local da Fase 0 e revisar ADR/contratos.
2. Confirmar aplicação Mercado Pago, ambientes e domínios de staging.
3. Definir se haverá Supabase separado para staging.
4. Fechar regra de reserva Pix, parcelamento e retenção de dados.
5. Cadastrar bindings com segurança, publicar staging autorizado e executar smoke.
6. Após aceite da Fase 0, iniciar Fase 1 e portar seletivamente contrato/testes do gateway simulado.

Não há ação de produção nem ativação de pagamentos nesta fase. O cadastro de
secrets de teste depende da confirmação dos ambientes; nunca enviar valores no chat.

## 9. Segurança e invariantes

### Secrets

- Public Key do Mercado Pago pode estar no bundle Vite.
- Access Token, segredo de webhook e chave secreta Supabase ficam somente no
  Worker/secret manager.
- Nenhum secret entra em `VITE_*`, `wrangler.jsonc`, Git, PR, log ou analytics.
- `.dev.vars` local deve ser ignorado pelo Git.
- Staging e produção usam valores separados e rotação documentada.

### Cartão e dados pessoais

- Payment Brick coleta PAN/CVV e produz token opaco.
- Worker e Supabase nunca recebem ou persistem PAN/CVV.
- Token de cartão é transitório, não entra em log nem banco.
- CPF, endereço e payload bruto não entram em telemetria.
- Metadados guardam apenas IDs e campos sanitizados necessários.

### Autorização

- JWT Supabase é validado no Worker.
- `user_id` do body nunca é confiável.
- Toda leitura de status filtra pelo dono no banco.
- CORS é allowlist por ambiente, nunca autorização.
- `*` não é permitido com `Authorization`.

### Webhook

- aceitar somente `POST` com tamanho e schema limitados;
- validar `x-signature` conforme contrato oficial vigente;
- comparar assinatura em tempo constante;
- persistir/deduplicar antes do ACK;
- responder rapidamente, sem esperar e-mail ou fulfillment;
- consultar o pagamento na API antes de aplicar efeito financeiro;
- conferir referência, valor, moeda e vínculo local;
- manter inbox e cron; `waitUntil()` não substitui durabilidade.

### Idempotência

- pedido usa fingerprint canônico e chave estável;
- tentativa usa UUID estável e o mesmo `X-Idempotency-Key` no Mercado Pago;
- claim condicional impede submissões concorrentes;
- timeout pós-envio vira `unknown`;
- não existe retry cego de cobrança;
- webhook deduplica por provedor, ação/tópico e ID externo;
- efeitos usam chaves próprias de outbox.

### Estados

Transições são monotônicas e condicionais. Um evento antigo não regride
`paid`. `pending`, `in_process` e `unknown` mantêm a reserva até decisão segura.
`approved` confirma pagamento e muda a reserva para `committed`. Estorno e
chargeback não repõem estoque automaticamente.

## 10. Sandbox e validação

O sandbox deve usar apenas credenciais de teste e a documentação oficial atual
do Mercado Pago. Números de cartão não devem ser copiados para fixtures,
documentos ou código; os cenários devem ser consultados na tabela oficial na
hora do teste.

Cobertura mínima:

- cartão aprovado, pendente e recusado;
- Pix criado, exibido, confirmado e expirado;
- duplo clique, refresh e queda de rede;
- timeout antes e depois do envio;
- webhook inválido, duplicado, atrasado e fora de ordem;
- webhook perdido seguido de reconciliação;
- última unidade sob concorrência;
- JWT inválido, expirado e acesso a pedido alheio;
- busca automatizada por secrets, PAN, CVV e tokens em bundle/log/banco.

Sandbox verde é necessário, mas não suficiente para produção.

## 11. Riscos e mitigação

| Risco | Mitigação obrigatória |
| --- | --- |
| cobrança duplicada | chave estável, claim, replay e reconciliação |
| valor adulterado | recompor preço, frete e total no Supabase |
| overselling | locks ordenados, reserva transacional e testes concorrentes |
| falso positivo de pagamento | webhook assinado + consulta server-to-server |
| evento duplicado/fora de ordem | inbox única e transições monotônicas |
| timeout ambíguo | estado `unknown`, sem retry cego |
| vazamento de cartão/secret | Brick, redaction e scanning |
| Worker indisponível | kill switch, fallback visual e rollback |
| webhook indisponível | ACK durável, retries do provedor e reconciliação |
| migration incompatível | mudanças aditivas, staging e correção forward |
| divergência de ambientes | credenciais, domínios e allowlists separados |
| dependência do provedor | adaptador, ledger local e reconciliação |
| gateway simulado confundido com produção | manter desconectado e portar seletivamente contrato/testes |

## 12. Rollback

Ordem de resposta:

1. definir `PAYMENTS_ENABLED=false`;
2. manter webhook, status e reconciliação ativos para pagamentos em trânsito;
3. reverter o frontend Vercel ao placeholder;
4. usar rollback do Worker para a versão estável;
5. corrigir banco para frente; não reverter migration destrutivamente;
6. reconciliar tentativas `submitted`, `pending` e `unknown`;
7. só remover legado após janela sem tráfego e backlog zerado.

O rollback deve ser ensaiado antes do go-live. Desligar cobrança não pode apagar
ou abandonar pagamentos já enviados.

## 13. Definição de pronto

Uma compra está pronta quando:

- parte de itens reprecificados no Supabase;
- cria exatamente um pedido e uma tentativa;
- reserva estoque sem oversell;
- envia ao Mercado Pago com chave idempotente estável;
- nunca expõe PAN, CVV ou secrets;
- confirma valor, moeda e vínculo por resposta autenticada,
  webhook/reconciliação;
- aplica uma única transição e um único efeito;
- mantém trilha, métricas e alertas sem dados sensíveis;
- suporta indisponibilidade e evento fora de ordem;
- permite desligar novas cobranças sem perder confirmações em trânsito;
- passou testes unitários, integração, concorrência, sandbox e E2E controlado;
- tem operação, segurança e negócio aprovados.

Build verde isoladamente não satisfaz a definição de pronto.

## 14. Referências públicas

- [PRs do projeto](https://github.com/gabrielsalmeida7/nada-normal-movement/pulls)
- [Mercado Pago — Checkout Bricks](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/introduction)
- [Mercado Pago — envio de pagamentos](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission)
- [Mercado Pago — webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [Mercado Pago — pagamentos de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/integration-test/test-payment-flow)
- [Cloudflare Workers — secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers — cron triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [Cloudflare Workers — rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/)
