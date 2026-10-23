# Nada Normal — planejamento vigente

Atualizado em 23/10/2026. Branch oficial de desenvolvimento: `home-v2-contraste`.

Este documento descreve o estado entregue e as próximas etapas para abrir a loja.
O [roteiro de testes](docs/ROTEIRO_DE_TESTES.md) explica o que executar e observar.
O [plano anterior](docs/history/roadmap-ate-2026-10-19.md) fica preservado como
histórico; não orienta novas implementações de Payment Brick.

## 1. Decisões em vigor

- Desenvolver e validar na `home-v2-contraste`. Branches auxiliares e PRs novos
  devem partir dela e voltar para ela.
- O PR #8 foi integrado nessa branch. O PR #9 propõe `home-v2-contraste → main`;
  seu conflito foi resolvido, mas o merge aguarda a conclusão e o aceite da loja.
- A `main` só será atualizada quando o projeto estiver pronto. Não usar force push
  nem publicar o ambiente de produção como parte dos testes.
- Pagamentos: Mercado Pago **Checkout Pro via Preferences API**, iniciado pelo
  Wallet Brick oficial (Public Key de teste + preferenceId), com checkout hospedado.
  Payment Brick e Appmax não fazem parte da implementação atual.
- Hospedar o site React/Vite e todas as APIs na Cloudflare. A Vercel não faz
  parte da arquitetura de destino, dos testes nem do rollback planejado.
- Usar Workers Static Assets para o site e Workers para as APIs; preservar o
  Worker de pagamentos separado. Supabase continua com banco e autenticação;
  Mercado Pago continua com Checkout Pro. Não migrar o banco para D1.
- Priorizar a migração completa de hospedagem antes da validação online do
  pagamento. Cobrança da Cloudflare é aceitável, mas deve ser estimada e monitorada;
  não presumir custo fixo menor nem operação ilimitada gratuita.
- O Supabase atual é compartilhado com os testes por decisão do usuário.
  Identificar os pedidos criados em cada sessão e preservar os dados existentes.
- Operação planejada: dropshipping. As 50 unidades por variante da Camisa Sem
  Tempo NN são disponibilidade cadastrada para testes, não confirmação de estoque
  do fornecedor. Integração/sincronização com fornecedor ainda não existe.

## 2. Estado confirmado

| Área | Entregue | Ainda falta |
| --- | --- | --- |
| Hospedagem | Loja publicada em workers.dev, APIs habilitadas só no staging, secrets separados e deploy automático da home-v2-contraste confirmado | URLs Auth, custos/limites, aceite de expiração e retirada do legado; domínio principal só no rollout |
| Loja | Camisa Sem Tempo NN ativa com duas fotos e seis variantes; usuário validou carrinho no celular, persistência, totais, remoção, variantes, login, admin e checkout até pagamento bloqueado | Cadastro/recuperação de senha, catálogo completo, acessibilidade e operação dropshipping |
| Pedidos | Ensaio autenticado online de orçamento, criação, replay, conflito de chave e cancelamento idempotente aprovado; estoque restaurado | Recuperação de compras expiradas/repetidas e teste online de concorrência |
| Checkout Pro | Flags e Wallet oficial publicados; usuário apresentou compra aprovada de R$119 no provedor em 23/10 | Concluir confirmação financeira ponta a ponta na loja |
| Confirmação | Simulação com ID da compra passou HMAC; diagnóstico apontou bloqueio em live_mode; adequação restrita às contas de teste implementada | Validar a adequação online, investigar os 401 da entrega automática e automatizar reconciliação |
| Supabase | Três migrations aplicadas em 19/10/2026, com RLS e acesso financeiro do backend | Revisão dos alertas anteriores e reconciliação do histórico antes de usar db push |
| GitHub | Código e documentação integrados na home-v2-contraste | Manter a main aguardando o aceite final |
| Produção | Cobrança desativada por padrão e bloqueada fora de staging no código atual | Implementar ambiente produtivo e validar compra real controlada |

Na ativação das APIs, 215 testes passaram com TypeScript/builds e CI aprovados.
Na adequação de 23/10, a suíte permanente de pagamentos tem 166 testes aprovados,
incluindo verificação das contas de teste, diagnóstico, configuração e guard
Workers Builds; app/server tem 105 e storefront/guard 59. A exceção inicial de bootstrap teve sete testes adicionais
durante seu uso e foi removida após a substituição do Hello World.
Lint sem erros, com oito avisos preexistentes. O ensaio autenticado online de
pedidos também passou; [relatório](docs/TESTE_PEDIDOS_STAGING_2026-10-21.md).
Essas suítes não comprovam webhook, expiração ou concorrência online.
A compra de teste foi aprovada no Mercado Pago, mas o pedido 773d299b continua
processing/held na última consulta. A adequação de live_mode exige prova via API
do vendedor de teste, Buyer ID aprovado no painel e perfil com ID/país consistente;
não exige marcador de teste público de terceiros e não altera o pedido
manualmente nem exige nova compra. Detalhes no [ADR 002](docs/adr/002-checkout-pro.md).

As migrations preservaram 20 pedidos, 21 itens e os estoques existentes. Esses
números são o retrato da verificação, não uma lista de registros a apagar.
Mapeamento dos arquivos e versões remotas em [supabase/README.md](supabase/README.md).
Não reaplicar migrations, seeds ou bootstrap no projeto compartilhado.

Estado remoto: loja/APIs publicadas na Cloudflare; 20 pedidos anteriores
preservados e 2 pedidos QA adicionais cancelados, com tentativas locais canceladas
e estoque restituído. Nenhuma sessão Checkout Pro foi criada nesses testes.
Worker de pagamentos publicado; backend sandbox habilitado e health confirmou
`paymentsEnabled=true` no build `9ceb8c91-e268-4fc8-ab4c-aea615553d1c`, commit
`f3d874d`. Frontend preparado para release posterior ao backend. Health/CORS,
recusa de webhook sem assinatura e status autenticado foram verificados online.
Isso ainda não comprova preferência, pagamento ou webhook real do Mercado Pago.
Vercel é legado, não ambiente de aceite. Produção/main/DNS principal inalterados.

## 3. Fluxo de destino e responsabilidades

Destino aprovado, ainda não integralmente validado. O inventário abaixo separa
o que foi verificado remotamente do que existe apenas como código.

1. O comprador entra na loja e seleciona itens e endereço.
2. O frontend usa a API de pedido na Cloudflare, na mesma origem `/api/`;
   o Supabase recompõe valores e
   reserva estoque. O cliente confere o total retornado pelo servidor.
3. O Worker recebe somente o ID do pedido e a sessão autenticada. Confere dono
   e reserva, faz uma claim durável e cria a preferência no Mercado Pago.
4. O comprador paga no checkout hospedado do Mercado Pago e retorna à loja.
5. O webhook assinado leva o Worker a consultar o pagamento na API. O banco
   verifica vínculo/valor e atualiza o pedido na mesma transação do evento.
6. A página de retorno consulta o estado autenticado; parâmetros da URL não
   comprovam aprovação.

| Endpoint | Destino | Estado atual |
| --- | --- | --- |
| POST /api/checkout/quote | Worker da loja | Testado online autenticado: R$99 + R$20 de frete SP = R$119 |
| POST /api/checkout/order | Worker da loja | Testado online: criação, reserva, replay sem duplicidade e conflito de chave |
| POST /api/checkout/cancel | Worker da loja | Testado online: cancelamento e repetição sem crédito duplicado de estoque |
| POST /api/checkout/expire-reservations | Worker da loja / agendamento interno | Recusa sem secret testada online; processamento remoto pendente; nenhum cron ativo |
| GET /api/admin/users | Worker da loja | Usuário confirmou listagem como admin; comprador QA recusado com 403 |
| GET /health | Worker | Verifica configuração local, sem testar credenciais externas |
| POST /v1/checkout/preferences | Worker | Implementado, depende de configuração e ativação do staging |
| GET /v1/checkout/orders/:id/status | Worker pagamentos | Online: dono consultou pending/held e cancelled/released; outro comprador 404; sem sessão 401 |
| POST /webhooks/mercadopago | Worker pagamentos | Publicado; sem assinatura retorna 401; evento real assinado e vínculo ao aplicativo pendentes |
| Quote/orders/payments antigos no Worker | Worker | Stubs; não usar no lugar das rotas acima |
| Reconciliação agendada | Cloudflare Workers | Pendente; distinta da expiração de reservas |

O frontend de staging usa a Public Key de teste no Wallet Brick oficial; o SDK
abre o checkout com o preferenceId do backend. Não escolhe nem altera manualmente
init_point/sandbox_init_point. Valores/dono/reserva continuam server-side.
Os três secrets ficam no Worker, nunca no frontend. Detalhes no
[ADR 002](docs/adr/002-checkout-pro.md).

## 4. Etapas para concluir a loja

### Etapa 0 — migrar site e APIs para Cloudflare

**Estado: site/APIs publicados e fluxo de pedidos autenticado aprovado no staging;
aceite integral da migração ainda pendente nos itens abaixo.**

Passo 1: GitHub verificado; MCP Cloudflare reconectado e domínio confirmado ativo.
Passo 2: preparação em `workers/storefront`, CI verde no commit c9ead94.
Passo 3: builds habilitadas pelo usuário, variáveis Supabase e secret de reservas
conferidos. Primeira loja publicada em 21/10/2026 pelo Workers Builds, commit
`28402b6`, em https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev.
HTTP/health, rotas SPA, assets, cache e noindex conferidos. APIs de pedidos,
pagamentos e cron estavam desligados na primeira publicação. O usuário validou
persistência de quantidade, totais, remoção, variantes separadas e carrinho no
celular. APIs da loja publicadas exclusivamente em staging no commit `83e4316`,
build `7d821664-bb4d-468f-8b39-adbe620e07e2`, acionada automaticamente por push.
Health confirmou `apiEnabled=true`; sessão ausente/inválida retorna 401,
origem diferente retorna 403 e API desconhecida retorna JSON/404, sem cache.
215 testes e CI passaram. O usuário validou login, listagem admin e checkout até
o pagamento bloqueado. O ensaio autenticado online confirmou orçamento, criação,
replay sem duplicidade, rejeição de chave conflitante, cancelamento e reposição
idempotente do estoque. [Evidências](docs/TESTE_PEDIDOS_STAGING_2026-10-21.md).
Pagamentos e cron continuam desligados; não marcar a migração completa como
aceita: retornos Auth, expiração, concorrência e demais critérios seguem pendentes.
Comandos e limites em [Worker da loja](workers/storefront/README.md).

- Implementar o Worker da loja com Static Assets do build Vite e `/api/*` na
  mesma origem. Manter `workers/payments` separado e seu domínio de webhook.
- Portar os cinco handlers legados e seus testes para o runtime Workers;
  preservar contratos, autorização, centavos, RPCs, locks e idempotência.
- Configurar fallback do React Router sem devolver HTML em rotas de API;
  validar rotas profundas, assets, cabeçalhos de cache e respostas privadas.
- Separar staging/produção, variáveis de build e secrets de servidor. Rever
  redirects de autenticação, CORS e retorno do Checkout Pro para origens Cloudflare.
- Preparar CI/deploy da home-v2-contraste, URL estável de staging, verificações
  obrigatórias e rollback na própria Cloudflare. Não publicar main automaticamente.
- Medir uso/custos e documentar limites, alertas e plano escolhido antes do rollout.
- Remover dependências/configuração Vercel após comprovar o port; planejar
  desconexão dos deploys automáticos e desativação do legado sem apagar recursos agora.

Aceite: staging Cloudflare serve o site e as cinco APIs com evidência de testes,
sem chamadas ou proxy para a Vercel; autenticação e permissões preservadas,
pagamentos desligados. Checklist em [migração Cloudflare](docs/MIGRACAO_CLOUDFLARE.md).

### Etapa 1 — preparar e publicar o ambiente de testes

**Estado: partes 1, 2 e 3 concluídas; assinatura de notificações simuladas validada.
Parte 4: ativação exclusivamente sandbox autorizada e versionada. Confirmar flags
remotas e primeira compra de teste; produção continua bloqueada.**

#### Parte 1 — identificar aplicação, credenciais e recebedor

- [x] MCP Mercado Pago conectado e listagem da aplicação funcionando.
- [x] Aplicação principal: `TesteNN`, ID `6344920694868580`.
- [x] MCP de credenciais identificou aplicação vendedora sandbox automática
  `760330644412079`, com usuário vendedor `3272217989`. A diferença entre os
  dois IDs é explicada pela relação principal → vendedor de teste; não é,
  por si só, prova de configuração errada.
- [x] Cloudflare confirmou presença de `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET`
  como secrets no Worker de pagamentos. Valores não foram lidos/comparados,
  substituídos, renovados ou expostos.
- [x] Confirmar identidade efetiva via `GET /users/me` com o token instalado no
  Worker. Na Cloudflare, a API retornou 200, vendedor esperado `3272217989`,
  país MLB e conta de teste. O diagnóstico expôs somente booleanos.
- [x] Verificação temporária protegida por desafio aleatório, hash SHA-256 e
  prazo máximo de dez minutos, sem preferências/cobranças. Acesso sem desafio
  recebeu 401; a consulta protegida retornou verified=true/paymentsEnabled=false.
- [x] Restaurar a versão anterior `ed97243c-3c59-4e23-bf7f-75b38a277513` com
  100% do tráfego. HTTP confirmou o Hello World anterior e diagnóstico inativo.
  Nenhum secret foi substituído ou renovado.

`MP_COLLECTOR_ID=3272217989` está confirmado para a configuração da próxima parte;
não foi inferido de números do token. O 403 da consulta direta fica registrado
como histórico: a validação no runtime de destino resolveu a pendência sem
comprovar a causa daquele 403.
Nenhuma preferência/cobrança, nova aplicação ou novo usuário Mercado Pago foi
criado; webhook e credenciais existentes não foram alterados.
Detalhes: [verificação Mercado Pago](docs/VALIDACAO_MERCADO_PAGO_2026-10-21.md).

#### Parte 2 — configuração sandbox preparada em 22/10/2026

- [x] Fixar a conta Cloudflare do projeto no wrangler de pagamentos.
- [x] Configurar somente a origem exata da loja em workers.dev para CORS e retorno,
  sem wildcard, domínio principal, localhost ou origem Vercel.
- [x] Usar URL/chave publicável do mesmo Supabase do Worker da loja.
- [x] Definir CHECKOUT_PRO_MODE=sandbox, MP_COLLECTOR_ID=3272217989 e URL
  `https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago`.
- [x] Manter PAYMENTS_ENABLED=false e o frontend Checkout Pro desligado.
- [x] Validar guard offline, regenerar tipos e executar build dry-run de staging.
  Novos testes usam a configuração real versionada com secrets fictícios;
  verificam CORS/health, bloqueio de criação e status sem sessão, sem upstream.
- [x] Adicionar ao CI o guard de pagamentos e a conferência dos tipos gerados.

Isso prepara a configuração local/versionada, não aplica variáveis remotas nem
publica o backend de pagamentos. Nenhum secret, webhook do painel, dado do banco
ou ambiente de produção foi alterado nesta parte. A assinatura de webhook e sua
associação à aplicação ainda exigem conferência/teste na etapa própria.

#### Parte 3 — publicada e verificada em 22/10/2026

Workers Builds conectado ao Worker de pagamentos, somente home-v2-contraste e
sem previews, com testes/guard/manifesto antes de publicar. Build
`0109807f-bc61-4376-912b-114e75648d5a`, commit `6e5e87d`, versão
`3fd08eef-5a93-4bca-b9f8-59a80f259afa`; pagamentos continuam false.
Health 0.2.0, preflight exato, origem inválida 403, preferência 503,
status sem sessão 401 e webhook sem assinatura 401 verificados online.
Novo pedido QA consultado pelo dono antes/depois do cancelamento; outro dono 404.
Estoque voltou a 50; nenhuma sessão Checkout Pro criada. Exceção controlada da
substituição inicial foi retirada, com retorno do --strict obrigatório.
[Evidências e IDs](docs/PUBLICACAO_PAGAMENTOS_STAGING_2026-10-22.md).

#### Parte 4 — assinatura validada; ativação exclusivamente sandbox

- [x] MCP `save_webhook` confirmou a aplicação `6344920694868580` com URL sandbox
  `https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago`.
  A resposta informa URL de produção não configurada. Nenhuma redefinição de
  assinatura foi solicitada; nenhum valor de secret foi lido ou substituído.
- [x] Build normal `c51ec9de-8dcf-4719-a218-5689fc905696`, commit `8e821a6`,
  concluído com sucesso após retirada da exceção inicial. Health remoto confirmou
  versão 0.2.0, staging e `paymentsEnabled=false`.
- [ ] Conferir os eventos no painel: apesar da solicitação de `payment`, o MCP
  também listou `shipping`, `topic_claims_integration_wh` e
  `topic_merchant_order_wh`. O receptor atual trata somente `payment`.
- [x] Enviar **Simular notificação** no painel e verificar assinatura/resultado.
  O MCP não oferece ferramenta de simulação nem acesso ao valor completo da
  assinatura; histórico vazio não prova ausência ou correção da configuração.
  Não redefinir o secret nem interpretar uma simulação com ID fictício como
  pagamento aprovado.
- Diagnóstico em andamento: duas simulações do usuário retornaram 503, incluindo
  uma com tópico `payment` e ID fictício `123456`. O painel omite o corpo da
  resposta do Worker; a consulta de logs históricos não retornou registros.
  Foi autorizado diagnóstico seguro: evento `webhook_diagnostic` somente
  em staging, sem payloads/credenciais, com etapa, assinatura verificada ou não,
  código fixo e status de upstream. Após publicar o commit `46899b2`, quatro
  consultas registraram `signatureVerified=true`, etapa de consulta/validação
  do provedor, `UPSTREAM_UNAVAILABLE` e upstream HTTP 404. Isso comprova assinatura
  aceita e recurso não encontrado nessas tentativas, compatível com ID fictício.
  Outra tentativa teve assinatura aceita, mas falhou na leitura do payload;
  não atribuí-la automaticamente à mesma causa. Nenhuma dessas simulações
  comprova pagamento ou atualização financeira de um pedido.
- [x] Usuário autorizou habilitar exclusivamente sandbox/backend e frontend.
  Backend primeiro, frontend depois; guards continuam exigindo conta, branch,
  domínio, sandbox e vendedor fixos. Manifestos passam a conferir a flag
  autorizada em vez de forçar false. Rollback para false continua permitido.
- [ ] Confirmar publicação remota das duas flags e executar preferência,
  redirecionamento e compra sandbox vinculada a pedido da loja (Etapa 2).
  Produção/main/DNS principal inalterados; nenhuma compra real autorizada.

Backend da parte 4 publicado e verificado: health staging com pagamentos true;
criação sem sessão retorna 401, sem criar pedido ou preferência. Não é ainda
evidência de preferência autenticada, redirecionamento ou compra concluída.

Responsável técnico/Codex:

- Confirmar o staging Cloudflare da home-v2-contraste e a origem exata para o CORS.
- Preencher as variáveis públicas vazias no wrangler de staging, conferir os
  secrets remotos e confirmar o recebedor do token de teste pela API.
- Configurar Checkout Pro sandbox, retorno e webhook da aplicação correta.
- Publicar primeiro com PAYMENTS_ENABLED=false; validar health, preflight,
  recusa de origem desconhecida e acesso autenticado ao status.
- Preparar variáveis do frontend apenas no build Cloudflare de staging.

Usuário:

- Confirmar a aplicação e as credenciais de teste nos painéis, sem colar secrets.
- Abrir o preview informado e seguir o roteiro de catálogo, login e checkout.

Aceite: código correto publicado, health/CORS válidos, credenciais e ambiente
identificados; pagamentos reais continuam bloqueados.

### Etapa 2 — validar a compra de teste ponta a ponta

**Estado: código pronto para iniciar a validação após a Etapa 1.**

Atualização em 23/10: o redirecionamento direto abriu o checkout, mas os testes
com cartão terminaram em `/fatal/`, inclusive com comprador de teste correto.
A resposta informou `service_error`/`unexpected_error`; não há confirmação de
causa raiz. Usuário autorizou mudar a inicialização para Wallet Brick oficial,
mantendo valor, restrições, retorno, webhook e vendedor de teste. A hipótese de
que `init_point` resolveria não foi comprovada e não motivou troca manual de URL.
Public Key fixada no build de staging; produção segue bloqueada. O backend e o
banco não mudam; o frontend usa apenas preferenceId, não checkoutUrl.
Validar uma tentativa pelo Wallet após confirmar o deployment, com reserva ainda
válida e contas separadas. Não reutilizar links expirados nem declarar o erro
resolvido antes de confirmar pagamento + webhook + banco + retorno.
Detalhes e verificações: [Wallet em staging](docs/WALLET_CHECKOUT_PRO_2026-10-23.md).

- Ativar apenas o sandbox; testar cartão aprovado, recusado e pendente, além
  de Pix quando o ambiente de teste suportar a simulação.
- Conferir valor total, pedido, evento de webhook, tentativa e estoque.
- Exercitar duplo clique, refresh e retorno à loja sem confirmação.
- Validar identidade do dono e comportamento do painel administrativo.
- Registrar falhas e corrigir; não marcar cenários não executados como aprovados.

Aceite: um fluxo verificável preview → pedido → preferência → Mercado Pago →
webhook → Supabase → retorno. Recusa/pendência não podem aparecer como pagamento
confirmado nem gerar liberação indevida de estoque.

### Etapa 3 — completar recuperação e automatismos

**Estado: implementação pendente antes de produção.**

- Automatizar a consulta de pagamentos quando houver webhook perdido/atrasado.
- Tratar claims interrompidas, preferências com resultado desconhecido e expiração
  sem repetir cegamente a criação do checkout.
- Implementar confirmação definitiva da reserva e liberação segura de reservas
  vencidas/submetidas; hoje as confirmadas continuam held, protegidas pelo financeiro.
- Completar limpeza seletiva do carrinho, compra repetida/expirada e mensagens.
- Tratar revisão de segunda aprovação, outbox, retentativas e alertas operacionais.
- Aplicar controles de abuso e testar última unidade com compras concorrentes.

Aceite: interrupções recuperáveis, sem cobrança duplicada, overselling ou estoque
preso sem identificação/encaminhamento. Reprocessamento e rollback ensaiados.

### Etapa 4 — revisar loja e operação

**Estado: validação e possíveis ajustes pendentes.**

- Validar celular, acessibilidade, cadastro, recuperação de senha e endereço.
- Aprovar catálogo, preços, variantes, fotos e estoque inicial.
- Confirmar regra comercial de frete, prazo de reserva, parcelamento e meios de pagamento.
- Validar painel de pedidos, separação/envio, suporte, troca, devolução e estorno.
- Definir e verificar comunicação de pedido; não prometer e-mails automáticos
  sem comprovar que o envio correspondente está implementado.
- Revisar os alertas preexistentes de segurança e as permissões antes da abertura.

Aceite: usuário consegue comprar e operar um pedido; regras comerciais e textos
aprovados, defeitos bloqueadores resolvidos e riscos restantes registrados.

### Etapa 5 — preparar produção e lançar

**Estado: ainda não autorizada para execução.**

- Implementar configuração/validação de produção: o parser atual bloqueia a ativação.
- Usar credenciais e webhook de produção separados, com cobrança inicialmente desligada.
- Configurar monitoramento, alertas, procedimentos de estorno e rollback.
- Vincular domínio principal e HTTPS à Cloudflare após aceite do staging;
  conferir redirects, Auth, cache e URLs do Mercado Pago. Remover origens Vercel
  e encerrar o legado conforme o plano de migração, sem usá-lo como fallback.
- Com aprovação específica, fazer compra real controlada e verificar o estorno.
- Após aceite, integrar a branch oficial à main e fazer o rollout planejado.
  Se necessário, atualizar o PR #9 ou abrir um substituto com o estado final.

Aceite: fluxo real e recuperação comprovados, atendimento definido, observabilidade
ativa e decisão explícita de abertura. Teste sandbox ou build verde não basta.

## 5. Pendências conhecidas que não devem ser confundidas com falhas novas

- Botão indisponível sem flag explícita do frontend é o comportamento esperado.
- Staging de pagamentos está publicado com submissões desligadas;
  produção permanece incompleta/bloqueada. Cadastrar dados no painel não preenche
  o arquivo automaticamente nem garante que uma nova versão já esteja em tráfego.
- Health 200 não verifica autorização funcional do Supabase/Mercado Pago.
- O carrinho ainda permanece após o pagamento; limpeza seletiva é backlog.
- Recusa de um pagamento no checkout hospedado não encerra automaticamente o pedido.
- Não há reconciliação automática nem liberação por tempo de tentativas já submetidas.
- A tela administrativa atual exibe principalmente o status do pedido; detalhe
  financeiro e trilha de webhook devem ser conferidos pelo responsável técnico.
- Alertas antigos do Supabase não foram corrigidos como efeito das migrations.

## 6. Regra de pronto e próxima ação

Uma etapa só fica concluída quando há evidência do resultado, ambiente, commit,
ID do pedido quando aplicável e avaliação do usuário. Registrar os testes no
[roteiro](docs/ROTEIRO_DE_TESTES.md), sem credenciais ou dados pessoais completos.

**Próxima ação técnica:** conferir release do frontend Wallet e acompanhar uma
compra de teste ponta a ponta. Não tratar os testes simulados como confirmação
financeira nem atribuir o `/fatal/` a uma causa ainda não comprovada. Preservar
credenciais, métodos, valores e webhook; não reexecutar migrations.

**Próxima ação do usuário:** após confirmar o deployment, usar o Wallet com
reserva válida e comprador de teste distinto do vendedor, em janela isolada.
Parar após uma falha e fornecer apenas erro/IDs/status sem credenciais. Não
reutilizar links expirados. Tudo segue na home-v2-contraste; main e produção
aguardam aceite.

Consultar também:

- [Roteiro de testes e diagnóstico](docs/ROTEIRO_DE_TESTES.md).
- [Plano de migração para Cloudflare](docs/MIGRACAO_CLOUDFLARE.md).
- [Configuração e comandos do Worker](workers/payments/README.md).
- [Estado e histórico do Supabase](supabase/README.md).
- [Decisão técnica Checkout Pro](docs/adr/002-checkout-pro.md).
- [Histórico de planejamento](docs/history/roadmap-ate-2026-10-19.md).
