# Etapa 1, parte 3 — publicação de pagamentos sem submissões

Publicado em 22/10/2026 na Cloudflare, sem ativar pagamentos, frontend, produção,
main, cron ou notificações no painel Mercado Pago. Nenhuma migration ou secret
foi criado/substituído/renovado. A assinatura do webhook real segue pendente.

## Publicação e controles

- Worker: `nada-normal-payments-staging`.
- Origem: https://pagamentos-staging.nadanormalclub.com.br.
- Branch: `home-v2-contraste`.
- Commit publicado: `6e5e87d6be459bcef8a0528c3b4c02ad6a758c0f`.
- Build: `0109807f-bc61-4376-912b-114e75648d5a` (push automático, sucesso).
- Versão inicial publicada: `3fd08eef-5a93-4bca-b9f8-59a80f259afa`, 100% do tráfego.
- CI GitHub desse commit: `39792283444`, aprovado.
- Trigger Workers Builds: `5897db35-19cc-4044-92eb-9a3199d9c1d0`.
- Build: `npm run worker:stage:prepare`; deploy: `npm run worker:stage:deploy`.
- Node 24, raiz `/`, branch home-v2-contraste, previews desativados.

Foi reutilizada a conexão Git e a referência ao token de build já usados pela
loja na mesma conta Cloudflare; nenhum valor de token foi recuperado ou copiado.
Pushes nessa branch passam a disparar também a pipeline do Worker de pagamentos.
O guard exige conta/Worker/domínio/origens e vendedor fixos, modo sandbox,
PAYMENTS_ENABLED=false, branch/commit Workers Builds corretos, manifesto atual,
fingerprint do bundle e presença dos três secrets por nome. A preparação executa
testes/typecheck/dry-run antes da publicação. Não há deploy a partir de PR/preview.

A primeira tentativa (`3305cc85-68ae-4486-84d3-e89e8b662e9e`, commit `3ec2066`)
foi corretamente bloqueada pelo `--strict`: o remoto ainda era o Hello World
editado pelo painel/API. Não houve upload nessa tentativa. A substituição inicial
foi permitida apenas após verificar os IDs imutáveis da versão ativa anterior
`ed97243c-3c59-4e23-bf7f-75b38a277513` e último upload diagnóstico
`26b0b315-ca7f-4144-b7b1-ed7ff0d45e14`, com staging/pagamentos desligados e contexto
de build válido. Essa exceção foi testada antes do uso.

Depois do sucesso, PAYMENTS_REPLACE_BOOTSTRAP foi removida das variáveis de build
e a exceção foi retirada dos scripts. O deploy normal volta a usar `--strict`
obrigatoriamente. O histórico Git mantém o procedimento auditável, não reutilizável
por um argumento/env nos scripts atuais.

Bindings conferidos remotamente: APP_ENV=staging, PAYMENTS_ENABLED=false,
CHECKOUT_PRO_MODE=sandbox, recebedor 3272217989, Supabase correto e origem exata
da loja Cloudflare para CORS/retorno. MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET e
SUPABASE_SECRET_KEY continuam como secret_text, sem leitura de seus valores.
workers.dev e previews do Worker de pagamentos estão desativados; o acesso é
pelo domínio de staging. Nenhum cron foi configurado.

## Smoke HTTP online

| Verificação | Resultado |
| --- | --- |
| GET /health | 200; serviço nada-normal-payments, versão 0.2.0, staging, paymentsEnabled=false |
| OPTIONS /v1/checkout/preferences com origem da loja | 204; allow-origin exato |
| Origem desconhecida | 403 CORS_DENIED, sem allow-origin |
| GET status sem sessão | 401 UNAUTHORIZED |
| POST preferência com submissões desligadas | 503 PAYMENTS_DISABLED |
| POST webhook sem assinatura | 401 WEBHOOK_SIGNATURE_INVALID |
| GET webhook | 405 METHOD_NOT_ALLOWED |
| Cache | no-store em todas as respostas acima |

O teste de assinatura ausente não valida a correspondência do secret com a
aplicação Mercado Pago nem substitui o recebimento de uma notificação real.

## Status autenticado — aprovado

Executado com nova conta QA sem papel admin, senha aleatória e sessão mantidas
somente na memória, endereço fictício e sem envio de e-mail (o cadastro do projeto
já tem confirmação automática habilitada). Não se usou a sessão do proprietário.

```sh
node --use-env-proxy scripts/checkout-staging-smoke.mjs --execute --with-payment-status
```

- Execução: `19b9b982-d45a-42dc-bd94-a4c88e16e8a4`.
- Usuário QA: `e2e03d36-9194-47d9-ae73-0ab5ea26b3e5`.
- Pedido: `ae979e6c-c158-481c-9cb2-ecf7e97b3916`.
- Tentativa local: `7a82e884-04ea-4bb1-aa47-788738dea027`.
- Produto R$99 + frete SP R$20 = R$119 autoritativos.
- Pedido criado com reserva de 1 unidade: estoque 50 → 49.
- GET status no Worker de pagamentos como dono: 200, pending/held.
- GET status do pedido QA anterior, pertencente a outro comprador: 404.
- Replay da criação: mesmo pedido, sem duplicidade nem nova reserva.
- Mesma chave com quantidade diferente: 409 IDEMPOTENCY_CONFLICT.
- Cancelamento e repetição: estoque 49 → 50, sem crédito duplicado.
- GET status como dono após cancelar: 200, cancelled/released.
- Conta QA fez logout; registros fictícios e pedido cancelado foram preservados.

Conferência independente via MCP Supabase: 22 pedidos no total (21 anteriores
preservados + 1 novo QA cancelado), 1 pedido/1 tentativa para a nova conta QA,
reserva liberada, total 11900 centavos e estoque 50. **Zero sessões Checkout Pro
no banco**, inclusive para o pedido novo. Não houve chamada ao Mercado Pago para
criar preferências/pagamentos; o script permite apenas origens loja/Supabase/Worker
de pagamentos e, neste último, consulta health/status.

## Próximo passo e rollback

Parte 3 concluída. Conferir o webhook de teste, aplicação/assinatura correspondentes
e preparar a ativação **somente sandbox**. O guard de release atual e o frontend
continuam exigindo pagamentos desligados; qualquer ativação requer ajuste explícito
e nova verificação. Produção permanece fora do escopo.

Rollback antes de submissões: selecionar uma versão Cloudflare anterior segura,
mantendo a indisponibilidade de novos pagamentos. Não restaurar Vercel, apagar
pedidos ou desfazer migrations. Após iniciar testes de pagamento, preservar
webhook/status para operações em andamento e revisar rollback financeiro antes
de retornar a versões sem esses handlers.
