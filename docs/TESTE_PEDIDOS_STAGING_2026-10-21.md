# Ensaio autenticado de pedidos — 21/10/2026

Resultado: aprovado nas APIs publicadas da Cloudflare, sem Mercado Pago.
Não é teste de pagamento, webhook, concorrência ou fluxo produtivo.

- Origem: https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev.
- Branch: `home-v2-contraste`; APIs habilitadas pelo commit `83e4316`.
- Execução: `f1ef8f90-1f62-40a7-8129-c3ab0d1021cd`.
- Pedido: `aba80f65-6ef2-42e4-993a-e22306cfc5b6`.
- Tentativa local: `f58b7cbf-8749-430e-b013-0b4862a09683`.
- Comprador QA sem privilégios: `98981b15-0496-4859-991f-d1a5a584ff4e`.
- Produto: Camisa Sem Tempo NN, Masculino P, Preta.

O cadastro público já possuía confirmação automática de e-mail habilitada.
Nenhuma configuração Auth foi alterada. Foi criada uma conta exclusiva com
endereço reservado `@example.com`, senha aleatória de alta entropia e dados
fictícios. Senha e sessão ficaram somente na memória do processo, sem arquivos,
logs ou Git; o refresh token da sessão QA foi revogado no encerramento.
O teste não acessou a conta, senha ou sessão do proprietário.

## Verificações online

| Operação | Resultado |
| --- | --- |
| Login/cadastro QA | Sessão real do Supabase, sem papel admin |
| Orçamento autenticado | 200; produto R$99,00 + frete SP R$20,00 = R$119,00 |
| Total adulterado de 1 centavo no payload | Ignorado; orçamento e pedido recompostos no servidor |
| Listagem admin como comprador | 403 |
| Criação do pedido | 200; reserva de 1 unidade, estoque 50 → 49 |
| Repetição exata com mesma chave | 200; mesmo resultado, 1 pedido/1 tentativa, estoque continua 49 |
| Mesma chave com quantidade diferente | 409 IDEMPOTENCY_CONFLICT; estoque continua 49 |
| Cancelamento pelo dono QA | 200; pedido/tentativa cancelados, reserva liberada, estoque 49 → 50 |
| Repetição do cancelamento | 200; released=false/stockUnits=0; estoque continua 50 |
| Consulta final via RLS da conta QA | Pedido cancelado, financeiro cancelado, reserva liberada |
| Cache das respostas de API | private, no-store |

Conferência independente pelo MCP Supabase: 21 pedidos no total, sendo 20
anteriores e 1 novo teste cancelado; 1 tentativa local cancelada; nenhuma sessão
Checkout Pro para o pedido. Eventos de estoque: reserved -1, cancelled +1,
already_released 0. Estoque final da variante: 50. Nenhum registro anterior foi
apagado, nenhuma migration executada, nenhum token Mercado Pago utilizado.

A conta QA, seu endereço fictício e o pedido cancelado foram preservados como
evidência e podem aparecer nas listagens administrativas. Não são compra ou
envio reais. O exemplo anterior do catálogo e seu estoque não foram apagados.

## Reprodução e limites

Script: [checkout-staging-smoke.mjs](../scripts/checkout-staging-smoke.mjs).
Exige `--execute`, valida o projeto/origem fixos, faz preflight de staging e de
Auth, usa somente chave publicável e sessão de comprador, tenta cancelar qualquer
reserva da conta QA ao encerrar e confere a restauração do estoque. URLs fora
das origens Supabase/loja são rejeitadas, inclusive pagamentos.

```sh
node --use-env-proxy scripts/checkout-staging-smoke.mjs --execute
```

Cada execução cria uma nova conta/endereço e um pedido cancelado no banco
compartilhado. Não faz parte do CI; não executar automaticamente nem como teste
unitário. Senhas aleatórias não são guardadas para reutilização da conta QA.
Se houver falha no cancelamento, consultar o pedido identificado no relatório
antes de repetir ou ajustar estoque; não compensar estoque manualmente.

Próxima etapa: conferir recebedor/aplicação e configurar/publicar o Worker de
pagamentos em sandbox, ainda sem produção. Continuam pendentes confirmação de
cadastro/recuperação de senha, expiração automatizada, concorrência online,
pagamento sandbox, webhook e reconciliação financeira. A tela de pagamento
permanece bloqueada porque a flag do Checkout Pro continua desligada.
