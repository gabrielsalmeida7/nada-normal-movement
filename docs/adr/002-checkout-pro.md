# ADR 002 — Checkout Pro em sandbox

Data: 19/10/2026. Substitui a decisão de Payment Brick do ADR 001.

Atualização de validação em 23/10/2026, autorizada pelo usuário: o pagamento de
teste aprovado pelo provedor foi bloqueado no campo `live_mode`. Em staging,
`live_mode` continua obrigatório e booleano. Quando true, a exceção exige o par
fixo vendedor 3272217989/comprador 3272217991, identidade do token em `/users/me`
e comprador em `/users/3272217991`, ambos MLB. Exigir marcador `test_user` em
`tags` ou `user_type` **somente no próprio vendedor autenticado**. Correção após
diagnóstico `buyer_test_marker`: para o comprador, a fonte da condição de teste
é o ID aprovado no painel Contas de teste apresentado pelo operador. O perfil
público verifica somente ID e país, sem exigir tags/user_type de terceiros.
Qualquer divergência dos IDs, país, prova do vendedor ou falha de consulta bloqueia
a persistência. Não usar prefixo APP_USR, nome/e-mail, payload do webhook ou
`live_mode` isoladamente como prova de teste. O caminho false e as validações de
assinatura, valor, moeda, referência, banco e idempotência permanecem. Produção
continua indisponível no parser; não há alteração de credenciais ou migrations.
O novo caminho requer validação online antes de considerar o pedido confirmado.

Atualização de inicialização em 23/10/2026, autorizada pelo usuário: o frontend
de staging passa a iniciar Checkout Pro pelo Wallet Brick oficial, com Public
Key de teste e preferenceId. Isso substitui a abertura manual do sandbox_init_point
descrita na entrega original abaixo. O backend, os limites do sandbox e o modelo
financeiro não mudam; não é Payment Brick nem coleta de cartão na loja. Ver
[relatório Wallet](../WALLET_CHECKOUT_PRO_2026-10-23.md).

Atualização de hospedagem em 20/10/2026: site e todas as APIs irão para a
Cloudflare, sem Vercel. O fluxo financeiro abaixo permanece; as referências à
Vercel descrevem o estado anterior ao port, não o destino aprovado. Ver
[plano de migração](../MIGRACAO_CLOUDFLARE.md).

Estado em 19/10/2026: código publicado no commit `9924e4a`; migrations de pedidos,
reservas/frete e Checkout Pro aplicadas ao projeto NadaNormal após autorização
do usuário para preservar dados e dispensar backup. Mapeamento das versões e
verificações em [supabase/README.md](../../supabase/README.md). Deploy do Worker
e testes online continuam pendentes; não repetir as migrations da preparação.

O usuário escolheu Checkout Pro. Na entrega original, o SPA permanecia na Vercel;
agora será migrado com as APIs para Cloudflare. Pedidos e reservas continuam
no Supabase e o Worker de pagamentos cria preferências e verifica webhooks.
Nenhum formulário coleta cartão e nenhuma rota envia tokens de cartão.

## Fluxo implementado

1. SPA autenticado cria/reobtém pedido por `/api/checkout/order`, com chave
   estável em sessionStorage. Não envia preços como autoridade. Endereço novo
   é salvo para poder ser validado pela RPC transacional existente.
2. Cliente confirma o total retornado pelo servidor, incluindo frete.
3. SPA chama `POST /v1/checkout/preferences` com `{orderId}` e JWT Supabase.
4. Worker verifica usuário em Auth e chama `claim_checkout_pro`. A RPC verifica
   dono, reserva e tentativa; trava o pedido antes de marcar tentativa submetida.
   Replays retornam a preferência salva. Uma claim sem resposta persiste como
   pendência, sem repetir um POST externo cujo resultado é desconhecido.
5. Worker verifica `/users/me` contra `MP_COLLECTOR_ID`, cria preferência com
   total autoritativo, BRL, external_reference da tentativa e vencimento da reserva,
   salva ID/URL e só então devolve `sandbox_init_point` validado.
6. Retornos `/checkout/sucesso`, `/pendente` e `/erro` consultam o mesmo status
   autenticado. Query strings do Mercado Pago não confirmam compra.
7. Webhook valida HMAC de `data.id`, request-id e timestamp (janela de 5 min),
   consulta `/v1/payments/:id` e verifica modo de teste, recebedor, BRL e valores.
   A RPC valida valor/vínculo, grava evento sanitizado e estado financeiro na
   mesma transação. Erro de persistência não retorna ACK de sucesso.

Um checkout hospedado admite recusas seguidas de novas tentativas de pagamento.
Por isso a recusa de um pagamento não libera o estoque nem fecha o pedido.
Estado pago não regride por eventos pendentes/atrasados. Estorno e contestação
não devolvem estoque automaticamente. As novas tabelas e RPCs são exclusivas
de service_role, com RLS e revogação de privilégios de anon/authenticated.

## Limites deliberados desta entrega

- Ativação permitida somente em `staging` com `CHECKOUT_PRO_MODE=sandbox`.
  Produção continua bloqueada no parser, mesmo mudando a flag.
- Não houve deploy, gravação de credenciais nem transação no MP. As migrations
  remotas foram aplicadas na etapa posterior registrada acima.
- Claims interrompidas exigem reconciliação operacional antes de liberar reserva.
  Não há cron de reconciliação automática nesta entrega. O processador legado
  não pode liberar tentativas submetidas/pendentes, mesmo depois do vencimento.
- Uma segunda aprovação de outro payment ID para o mesmo checkout exige revisão;
  não produz um segundo efeito de confirmação ou de estoque.
- Reservas confirmadas permanecem `held` no enum atual, protegidas pelo estado
  financeiro. A futura transição `committed` e a trilha correspondente são uma
  migration separada; o modelo legado de reservas não foi reescrito.
- O carrinho não é limpo automaticamente. Evita apagar alterações feitas em
  outra aba durante o pagamento. Limpeza seletiva e recuperação de compra
  repetida/expirada ficam para o acabamento antes de produção.
- Limitação de abuso, reconciliação de pagamentos sem webhook, expiração segura
  e testes reais do sandbox são pré-requisitos do rollout produtivo.

## Preparação para o primeiro teste online

O roteiro operacional vigente está em [ROTEIRO_DE_TESTES.md](../ROTEIRO_DE_TESTES.md),
seção 2. O código foi integrado à home-v2-contraste; as migrations já foram
aplicadas sem backup após dispensa e autorização explícitas do usuário. Não
reaplicar arquivos nem reconstruir o banco compartilhado como preparação de teste.

Antes, concluir a migração do site e das APIs (Etapa 0 do roadmap). Depois,
faltam completar a configuração pública do wrangler, confirmar recebedor/credenciais,
publicar primeiro com `PAYMENTS_ENABLED=false`, validar health/CORS e preparar
webhook e preview. Só depois ativar submissões no staging sandbox. A `main`
aguarda a conclusão do projeto; desenvolvimento segue na home-v2-contraste.

O botão atual continua desativado sem a flag explícita de frontend. Public Key
Mercado Pago não é necessária nesta variante, que usa redirecionamento direto.

## Validação local

`npm run worker:test`, `npm test`, `npm run worker:typecheck`, TypeScript do SPA,
lint e build. `npm run worker:build` faz apenas bundle/dry-run.

Para PostgreSQL descartável sem os schemas de plataforma Supabase, usar
`supabase/tests/local-bootstrap.sql`, depois todas as migrations em ordem e
`supabase/tests/checkout_pro.sql`. Nunca executar o bootstrap no banco da loja.
Os testes SQL usam rollback e cobrem acesso por role, dono, claim única, replay,
cancelamento após submissão, dinheiro adulterado, aprovação depois de recusa,
eventos atrasados, estorno e tentativa de reutilizar pagamento em outro pedido.
