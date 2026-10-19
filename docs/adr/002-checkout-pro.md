# ADR 002 — Checkout Pro em sandbox

Data: 19/10/2026. Substitui a decisão de Payment Brick do ADR 001.

O usuário escolheu Checkout Pro. O SPA continua na Vercel, pedidos e reservas
continuam no Supabase e o Worker passa a criar preferências e verificar webhooks.
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
- Não houve deploy, migration remota, gravação de credenciais nem transação no MP.
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

1. Revisar/publicar o código na branch, gerar backup e conferir migrations já
   aplicadas ao projeto compartilhado. Aplicar a migration nova só após backup.
2. Preencher SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no wrangler de staging,
   preservando os três secrets cadastrados remotamente. Valores vazios no arquivo
   bloqueiam deploy; não usar deploy direto para substituir o guard.
3. Confirmar origem estável de preview. Configurar no Worker:
   `CHECKOUT_PRO_MODE=sandbox`, `CHECKOUT_RETURN_ORIGIN` igual à origem permitida,
   `CHECKOUT_WEBHOOK_URL=https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago`,
   `MP_COLLECTOR_ID` igual ao ID retornado por `/users/me` com o token de teste.
   Não inferir o recebedor ou a aplicação pelos números contidos no token.
4. Publicar primeiro com `PAYMENTS_ENABLED=false`. Verificar health, CORS e
   consulta de status. Configurar notificações `payment` em Modo de teste apenas
   quando o endpoint implementado estiver publicado. Confirmar que o segredo
   pertence à aplicação/conta de teste correspondente ao token.
5. Em um preview Vercel, configurar `VITE_CHECKOUT_PRO_ENABLED=true` e
   `VITE_PAYMENTS_API_URL=https://pagamentos-staging.nadanormalclub.com.br`.
   `VITE_*` contém somente configuração pública; nunca os secrets MP/Supabase.
6. Após checagens, ativar `PAYMENTS_ENABLED=true` apenas no staging e testar cartão
   aprovado/recusado/pendente, Pix, webhook repetido e volta ao site sem webhook.

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
