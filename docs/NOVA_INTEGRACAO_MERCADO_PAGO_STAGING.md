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

Referências: [frontend](NOVA_INTEGRACAO_MERCADO_PAGO_FRONTEND.md),
[reconciliação](NOVA_INTEGRACAO_MERCADO_PAGO_RECONCILIACAO.md).
