# Reconciliação local do Checkout Pro

Data: 25/10/2026. Branch: `home-v2-contraste`.

## Entrega e ativação

Implementado o item 1: recuperação de preferências com resposta perdida,
pagamentos/estornos sem webhook e tratamento conservador de reservas vencidas.
Código e migration estão locais. Não houve aplicação de schema no Supabase
remoto, deploy, configuração de cron remoto, troca de secrets ou limpeza de pedidos.

A rotina está desativada em `CHECKOUT_RECONCILIATION_ENABLED=false`. A futura
ativação de staging exige essa flag true e o cron exato `*/5 * * * *`, verificados
pelo guard de release. A rotina continua funcionando quando novas submissões
estiverem desativadas. Produção permanece bloqueada pelo parser.

## Fluxo

1. A criação de uma sessão pela RPC `claim_checkout_pro_v2` vincula as aplicações
   principal e de teste e cria uma entrada durável de reconciliação.
2. Cada evento agendado obtém uma única entrada vencida, com concessão exclusiva
   por cinco minutos. `FOR UPDATE SKIP LOCKED` evita workers concorrentes no
   mesmo trabalho. As gravações posteriores exigem o UUID da concessão vigente.
3. Sem preferência salva, buscar pelo external_reference da tentativa usando
   `Preference.search`. Uma única preferência precisa passar pelas validações
   de aplicação, vendedor, pedido e tentativa antes de ser recuperada.
4. Usar `Payment.search` pela mesma referência e `Payment.get` para validar os
   recursos completos, incluindo valores, moeda, identidades de teste e estado.
   Pagamentos já conhecidos pelo banco são consultados mesmo se omitidos pela
   busca; isso permite recuperar atualizações como estornos.
5. Aplicar o estado financeiro pelas RPCs transacionais. O fluxo compartilhado
   por webhook e reconciliação valida o vínculo das aplicações e mantém a
   deduplicação existente. Não existe POST de criação de preferência/pagamento
   no caminho de reconciliação.
6. Persistir o próximo agendamento, resultado e motivo seguro. Pendências voltam
   em cinco minutos; estados liquidados, liberados e revisões voltam em uma hora.
   Falhas têm atraso progressivo limitado a uma hora. Uma execução interrompida
   pode ser retomada depois de vencer a concessão.

Uma falha HTTP na consulta de preferência não impede recuperar um pagamento
independentemente verificável. Inconsistência de aplicação/pedido continua
interrompendo o processamento. A API do provedor é consultada apenas com GET;
as gravações são no banco local da loja via backend privilegiado.

## Política de estoque

Uma busca vazia, uma consulta incompleta ou uma falha de comunicação nunca
autoriza devolver estoque. Pagamentos pendentes/autorizados mantêm a reserva,
mesmo depois de vencer a preferência. Estornos e contestações não repõem estoque
automaticamente.

A liberação automática exige, em conjunto:

- Preferência verificada, com expiração habilitada e prazo compatível com o
  snapshot do pedido, vencida há pelo menos 24 horas.
- Busca completa e não vazia de pagamentos, com todos os recursos lidos
  individualmente e somente estados finais `cancelled`/`rejected`, sem estorno.
- Duas observações idênticas, separadas por pelo menos cinco minutos. Mudanças
  no status ou timestamp do provedor reiniciam essa confirmação.
- Nenhuma aprovação ou transição financeira liquidada no banco, nenhum outro
  pagamento conhecido omitido e nenhuma outra tentativa ativa do pedido.
- Locks e verificação transacional final no banco, antes de registrar a
  liberação e devolver cada unidade uma única vez.

Essa janela de 24 horas é uma política conservadora desta implementação, não
uma garantia publicada pelo Mercado Pago sobre consistência das buscas.
Por isso existe também o tratamento durável de pagamentos tardios abaixo.

## Revisões e casos tardios

Preferência ambígua, ausência de pagamento após expiração, busca incompleta e
pagamentos adicionais geram trabalho `checkout_pro_review` na outbox. A rotina
continua observando esses pedidos; o registro de revisão não significa que um
operador já resolveu o caso. A resolução comercial/manual não é automática.

Se chegar um pagamento depois de a reserva ter sido liberada, a RPC registra o
estado e um evento sanitizado, cria uma revisão deduplicada e mantém o estoque
inalterado. O pedido não volta automaticamente ao fluxo de atendimento. Isso
exige decisão operacional, por exemplo sobre reembolso ou disponibilidade.
O webhook só confirma o recebimento depois de persistir essa revisão.

As sessões antigas não são vinculadas à aplicação nova por inferência. A
migration não faz backfill nem limpa dados. Qualquer reaproveitamento de sessão
antiga exige comprovação explícita da aplicação correspondente.

## Banco e publicação futura

Migration criada pelo CLI: `20261025063723_checkout_pro_reconciliation.sql`.
Ela adiciona o vínculo de aplicações nas sessões, uma fila com RLS e funções
SECURITY INVOKER com search_path fixo e EXECUTE exclusivo do backend. Não altera
os arquivos de migrations já aplicadas.

O backend passa a usar as RPCs v2. A migration precisa ser aplicada antes de
publicar esse backend. O histórico remoto anterior continua com o baseline
parcial documentado em `supabase/README.md`; não usar db push indiscriminado.
O cron e as credenciais só serão configurados na etapa de publicação aprovada.

## Validação

- 227 testes de pagamentos, incluindo evento agendado no bundle real do
  Wrangler em Miniflare/workerd, e 105 testes da aplicação aprovados.
- TypeScript aprovado e lint sem erros, com oito avisos preexistentes.
- Todas as migrations, o teste SQL anterior e o novo teste de reconciliação
  executados em PostgreSQL 17 descartável, sem rede ou portas publicadas.
- Testes SQL cobrem permissões, concessão vencida, recuperação de aprovação e
  estorno, ausência de pagamento, liberação única, pagamento tardio e aprovação
  entre as duas verificações de expiração.
- Duas conexões PostgreSQL simultâneas confirmaram que o segundo worker não
  obtém uma entrada travada pelo primeiro e que rollback torna o trabalho
  disponível novamente.
- Nos testes do SDK/runtime, Mercado Pago e Supabase são simulados no transporte;
  não foi executada compra real nem homologação financeira no provedor.

Testes de banco: `supabase/tests/checkout_pro_reconciliation.sql`, sempre em
banco descartável após bootstrap e migrations, com ROLLBACK ao final.

## Fontes

Consultadas pelo MCP Mercado Pago: busca de pagamentos por external_reference,
paginação e vigência da preferência. Tipos e implementação de `Preference.search`
e `Payment.search` conferidos no SDK oficial fixado em 3.6.1.

- https://www.mercadopago.com/developers/pt/docs/subscriptions/additional-content/payment-management
- https://www.mercadopago.com/developers/pt/docs/checkout-pro-preferences/additional-settings/term-of-preference
- https://supabase.com/docs/guides/database/functions
