# Publicação da nova integração no staging

Data: 26/10/2026. Branch: `home-v2-contraste`.

## Preparação remota

- Staging de pagamentos: `pagamentos-staging.nadanormalclub.com.br`.
- Loja de staging: `nada-normal-storefront-staging.gabriel-salmeida7.workers.dev`.
- Compras desativadas nos dois Workers antes da troca; `/health` de pagamentos
  confirmou `paymentsEnabled=false`.
- Migration `20261025063723_checkout_pro_reconciliation.sql` aplicada pelo MCP
  ao projeto `bcemyxasbcwcrbinfguu`, registrada remotamente como
  `20261026111033_checkout_pro_reconciliation`. A diferença de timestamp é a
  identificação atribuída pelo MCP; não executar novamente via `db push`.
- As seis novas RPCs usam SECURITY INVOKER, search_path fixo e EXECUTE apenas
  para service_role. A tabela de reconciliação tem RLS, sem acesso para anon e
  authenticated. Fila vazia; sessões antigas não foram inscritas.
- `MP_ACCESS_TOKEN` de teste obtido pelo MCP da aplicação `4897243060269064`
  e salvo como secret do Worker de pagamentos. Nenhum valor está neste documento.
- Webhook configurado pelo MCP na nova aplicação: somente URL sandbox
  `https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago`,
  tópico `payment`. URL de produção não configurada.
- O MCP retorna somente os primeiros sete caracteres da assinatura secreta.
  A substituição de `MP_WEBHOOK_SECRET` pela assinatura completa exige salvá-la
  no painel da Cloudflare. A existência de um secret com esse nome não comprova
  que seu conteúdo corresponde à nova aplicação.

## Sequência de publicação

Usar os triggers existentes de Workers Builds e os guards do repositório.
O trigger automático da loja foi temporariamente pausado para publicar primeiro
o backend; deve ser restaurado para `home-v2-contraste` antes de publicar a loja.
Não simular variáveis WORKERS_CI nem contornar os guards com upload direto.

O primeiro build (`a39f141c-d2e5-422f-95c2-c49c6a9ce828`) passou todos os testes,
mas o upload foi bloqueado pelo `--strict` porque o Worker tinha sido atualizado
via API ao desativar compras. Foi adicionada uma opção explícita de substituição
da configuração revisada: `PAYMENTS_REVIEWED_STAGING_CONFIG_SHA256` deve coincidir
com o SHA-256 exato do arquivo, passar o guard de Workers Builds e manter compras
e reconciliação desativadas. Sem a opção, `--strict` continua obrigatório.
O override do comando de build é temporário e deve ser removido após o rollout.

Manter PAYMENTS_ENABLED, CHECKOUT_PRO_ENABLED, CHECKOUT_RECONCILIATION_ENABLED
e RESERVATION_PROCESSOR_ENABLED desativados. Não há cron configurado.
Produção, pedidos e estoque não devem ser alterados nesta etapa.

## Validação e limite

A entrega local passou 124 testes de aplicação, 227 de pagamentos e 60 da loja,
além de TypeScript, lint sem erros e builds. A publicação remota deve registrar
separadamente as versões efetivamente implantadas e suas verificações HTTP.
Não considerar webhook autenticado ou compra homologada enquanto a assinatura
completa e o fluxo com vendedor/comprador de teste não forem verificados.

O advisor de segurança prévio aponta avisos existentes em funções de cadastro,
visibilidade de schema GraphQL e proteção de senhas. As novas RPCs foram
verificadas diretamente quanto às permissões; não houve mudança nas políticas
de cadastro ou catálogo durante esta publicação.

O erro ocorrido na confirmação do cartão de teste e as próximas verificações
estão registrados no [incidente FL-71e5ebf2](MERCADO_PAGO_INCIDENTE_FL_71E5EBF2.md).
Atualização: a compra posterior pela loja gerou comprovante da operação
`185121492029`. A simulação assinada do painel principal foi validada pelo
Worker e consultou o pagamento oficial; o pedido foi gravado como paid em
26/10 às 10:50:02 (Brasília). Continua pendente resolver/verificar as entregas
automáticas que falharam em HMAC antes da simulação. O incidente registra
os checkpoints separados; não considerar a automação homologada ainda.

Referências: [frontend](NOVA_INTEGRACAO_MERCADO_PAGO_FRONTEND.md),
[reconciliação](NOVA_INTEGRACAO_MERCADO_PAGO_RECONCILIACAO.md).

## Resultado da publicação

Código enviado à branch `home-v2-contraste` nos commits `383594a` e `f2ade0e`.
O segundo contém o tratamento limitado do conflito de configurações revisadas.

| Serviço | Build bem-sucedido | Versão ativa |
| --- | --- | --- |
| Pagamentos | `3189c124-6893-42e5-bb7b-c7ecacddc3b1` | `781bdd54-fb3a-4991-9998-05368d701607` |
| Loja | `75c13773-6db1-48ab-ae41-fc247a4ce571` | `d0b4fa8b-19dd-4bcf-96b2-7138290ea356` |

Backend publicado antes da loja, ambos com 100% do tráfego do staging.
O build da loja executou 124 testes de aplicação, 228 de pagamentos e 60 da
loja, todos aprovados. O teste adicional cobre o override limitado de release.
Os dois triggers foram restaurados à branch e comandos originais; a opção
temporária de substituição foi removida do comando de publicação.

Verificações HTTP no backend publicado:

- `/health`: 200, staging e `paymentsEnabled=false`.
- POST de preferência sem autenticação: 503 `PAYMENTS_DISABLED`, antes de
  qualquer criação no provedor.
- Consulta de status sem autenticação: 401 `UNAUTHORIZED`.
- Preflight da origem exata de staging: 204; origem desconhecida: 403.
- Webhook sem assinatura: 401 `WEBHOOK_SIGNATURE_INVALID`.
- Respostas do backend com `Cache-Control: no-store`.

Loja: `/health` confirma staging, API habilitada e configuração presente.
Página de retorno responde 200 com `noindex, nofollow`. Bundle remoto contém
os IDs da nova aplicação e seu namespace de recuperação, mantém a API de status
e não contém a Public Key antiga. Binding público foi atualizado para a nova
chave. Os dois Workers foram consultados e não possuem cron.

O smoke de browser remoto ficou limitado pelo trust store do Chromium deste
ambiente (CA do proxy); não foi desativada a verificação TLS. As verificações
HTTP e dos assets usaram curl com TLS validado. A validação visual local
anterior continua registrada no documento do frontend.

**Atualização após configuração pelo usuário:** o usuário informou que salvou
a assinatura completa em `MP_WEBHOOK_SECRET`. O MCP da Cloudflare confirma o
binding como secret no Worker correto, com os IDs da nova aplicação, compras
e reconciliação desativadas. Os health checks dos dois serviços retornam 200.
O valor não foi lido nem exposto. O MCP do Mercado Pago ainda não encontra
notificações para a aplicação nova; a correspondência criptográfica da
assinatura aguarda uma notificação assinada do provedor na homologação.
Não houve pagamento, criação de preferência, exclusão de pedidos ou ativação
de tarefas automáticas.

### Correção na preparação da homologação

Na comparação entre os Workers, a alteração de 26/10 às 09:28 (Brasília)
apareceu no `nada-normal-storefront-staging`: um secret `MP_WEBHOOK_SECRET`
foi acrescentado à loja. O backend `nada-normal-payments-staging` continuava
com a data de modificação da publicação anterior e com o secret já existente.
Assim, a verificação anterior da presença do binding não demonstrava que
a assinatura nova tinha sido salva no backend. Foi solicitado ao usuário
salvar a assinatura no Worker de pagamentos.

Ativação de compras aprovada pelo usuário para homologação, mas bloqueada
remotamente até resolver essa configuração. Flags e verificações de ativação
foram preparadas apenas localmente; não houve push ou publicação da ativação.
Nenhum pedido ou pagamento de homologação foi criado. O secret na loja não
é lido pelo código do frontend nem inserido no bundle público.

### Retomada autorizada

O usuário informou a correção no payments. O MCP confirmou atualização desse
Worker em 26/10 às 09:42:59 (Brasília), com os três secrets tipados corretamente.
O build `0388b717-3f3d-4f22-949f-2ebae5dceae6` republicou a configuração
desativada com sucesso e preservou os secrets. Não foi necessário substituir
valores nem desativar o modo strict nessa publicação.

A ativação seguinte altera somente PAYMENTS_ENABLED e CHECKOUT_PRO_ENABLED
no staging para true. Produção e os processadores de reservas/reconciliação
permanecem desativados. A homologação ainda não deve ser considerada concluída
até registrar preferência, pagamento e validação de notificação assinada.

### Staging ativado para homologação

Commit publicado: `a8621128358e7dd0e5a5a6eb428aecb0794ef1aa`.
Backend habilitado antes da loja, sem cron e sem ativação de produção.

| Serviço | Build | Versão ativa |
| --- | --- | --- |
| Pagamentos | `72c4b0a8-d32e-4ebd-b7b8-e7cbb3221a35` | `cdb2f944-b721-4f2c-82ef-6c3faedfbdbc` |
| Loja | `c6866112-fa1e-44fa-a6ae-860d30c0f7b4` | `4ac0e462-fa89-4983-983d-f8ea48173fce` |

Flags remotas confirmadas: PAYMENTS_ENABLED=true, CHECKOUT_PRO_ENABLED=true,
CHECKOUT_RECONCILIATION_ENABLED=false, RESERVATION_PROCESSOR_ENABLED=false.
O trigger da loja foi restaurado à branch/comandos originais após o backend.
O bundle remoto `/assets/index-BP9PmMwE.js` contém a nova Public Key, os IDs,
a retomada de pagamento e a API de status; não contém a chave antiga.

Teste técnico executado usando somente os endpoints da loja e pagamentos:

- Autenticação de um novo usuário QA da loja, com dados fictícios.
- Cotação autoritativa, reserva e criação de um único pedido de R$ 119,00.
- Repetição da mesma criação retornou exatamente o mesmo pedido.
- Preferência criada pelo SDK no backend e persistida com os IDs novos.
- Repetição da solicitação retornou a mesma preferência, com resposta 200.
- Consulta autenticada do status confirmou o mesmo pedido.
- Auditoria no banco confirmou uma sessão, uma entrada de reconciliação e
  nenhum pagamento registrado nesse checkpoint. A reserva permanece held.

Pedido: `6ecea996-7319-45d7-acde-68dec5e2de23`.
Tentativa: `d6c9f40d-aac2-45c4-bdfa-0a389b8d72f0`.
Preferência: `3272217989-20a96ae4-7873-4816-ae33-3be636de04e8`.
Expiração: 26/10/2026 às 10:20:39, horário de Brasília.

O pagamento ainda exige login do comprador de teste no Mercado Pago. A senha
desse comprador não foi fornecida. Foi enviado ao usuário o link da preferência
e os dados públicos de cartão de teste retornados pelo MCP: Visa, titular APRO,
validade 11/30, CPF de teste. Não solicitar senha ou cartão real no chat.
O histórico de notificações da aplicação nova continuava vazio nesse checkpoint.
Não considerar o webhook ou o pagamento aprovados até verificar o evento e a
persistência financeira. Não cancelar nem devolver estoque desta tentativa
automaticamente enquanto o resultado do pagamento estiver indeterminado.

Fonte de teste consultada via MCP: [Realizar compras de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases).

### Incidente na confirmação do cartão de teste

O usuário concluiu login do comprador e preenchimento do cartão; após confirmar
o pagamento, o Mercado Pago redirecionou para `/checkout/v1/redirect/.../fatal/`.
Identificador de navegação informado: `b9bfc4d0-21e5-4d5a-bfc7-57cb7db6190f`.
Isso não fornece, por si só, o motivo da falha nem comprova uma recusa financeira.

Revalidação posterior no Worker retornou a mesma preferência da aplicação nova,
sem nova criação de pedido ou preferência. O status da loja permanece processing,
com reserva held. Não há pagamento persistido no ledger. O MCP não encontrou
notificações da aplicação principal e os logs da Cloudflare não mostraram eventos
webhook_diagnostic na janela de 30 minutos consultada às 10:02 (Brasília).

A consulta direta à API Mercado Pago a partir deste ambiente retornou 403,
portanto não foi possível afirmar que a busca de pagamentos no provedor está
vazia. A consulta autenticada da preferência pelo Worker publicado funcionou.
O MCP também não permite consultar o histórico da aplicação filha de teste
por validação de ownership; não confundir essas limitações com erro do checkout.

Próximo teste controlado: reabrir a mesma preferência pelo link inicial em outro
navegador/janela anônima, com o mesmo comprador de teste e antes da expiração.
Nenhuma correção de código foi publicada com base apenas na página fatal.

O segundo navegador também terminou em fatal, com identificador de navegação
`20d8af73-7223-4500-a4d7-21cfb0de852e`. O print do Network mostra tokenização
com HTTP 201 e a chave pública da aplicação nova; uma requisição XHR com esse
identificador respondeu HTTP 200 antes da navegação fatal. Esses status HTTP
não demonstram aprovação financeira nem identificam a causa do erro.
Foi solicitado somente o conteúdo dos campos de erro da resposta dessa XHR,
sem tokens/cookies/dados de cartão. Auditoria às 10:08 (Brasília): pedido
processing/held, sem pagamento persistido e sem webhook_diagnostic nos logs
dos últimos 20 minutos. A causa continua pendente da resposta da confirmação.

Avisos anteriores do Supabase, fora das novas RPCs: documentação de
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[visibilidade GraphQL](https://supabase.com/docs/guides/database/database-linter?lint=0026_pg_graphql_anon_table_exposed),
[funções públicas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
e [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
O advisor posterior não acrescentou novos avisos de segurança nessas categorias;
o novo INFO de RLS sem política é intencional para a fila exclusiva do backend.
