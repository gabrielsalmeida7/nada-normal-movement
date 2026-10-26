# Nova integração Mercado Pago — etapa 3, backend local com SDK

Data: 25/10/2026. Branch: `home-v2-contraste`.

## Entrega

Implementação local do adaptador de pagamentos com o SDK oficial Node.js
`mercadopago@3.6.1`, fixado no package.json e lockfile. Não houve publicação,
troca de secrets remotos, configuração de webhook no provedor, migration,
criação de preferência real, pagamento ou exclusão de dados.

Na entrega inicial deste backend, o frontend ainda usava a aplicação anterior.
A [conexão local do frontend](NOVA_INTEGRACAO_MERCADO_PAGO_FRONTEND.md) foi
implementada depois. O checkout completo com o provedor ainda exige homologação.

## Fluxo e garantias

- `MercadoPagoConfig` recebe o token do binding secreto; cliente criado por
  operação, sem credencial/configuração mutável em estado global.
- `Preference.create` cria preferências, `Preference.get` verifica preferências
  persistidas e `Payment.get` consulta pagamentos recebidos por webhook.
- Consulta de identidade em `/users/me` e perfil público continuam por HTTP
  controlado: não foi adotado um endpoint fictício de usuários no SDK.
- Timeout explícito de oito segundos por operação; `maxRetries=0` desativa as
  três repetições automáticas padrão do SDK. A tentativa persistida fornece a
  chave estável. O sistema não presume garantia de idempotência da API de
  preferências apenas por enviar esse header.
- O SDK fixado encaminha opções adicionais para fetch. O adaptador mantém
  `redirect=manual`; testes verificam a recusa de redirecionamento. Essa
  característica deve ser revalidada ao atualizar a versão do SDK.
- Antes de persistir/devolver preferência, validar aplicativo de teste em
  `client_id`, vendedor, pedido nos metadados, referência da tentativa e URL/ID
  da preferência. Replays são consultados por GET antes de reabrir o checkout,
  para não misturar preferências das aplicações antiga e nova.
- Dinheiro e prazo vêm do snapshot do banco; adicionados descriptor
  `NADANORMAL` e ID da aplicação principal nos metadados, sem enviar secrets.
- Assinatura HMAC preservada, com parsing dos pares `ts`/`v1` independente de
  ordem e rejeição de campos duplicados. Mantida a janela temporal existente.
- IDs de teste deixam de ser constantes no módulo e passam a bindings públicos
  validados. A ativação continua limitada a staging/sandbox; produção bloqueada.
- Quando `live_mode=true` no fluxo de contas de teste, manter prova server-side
  do vendedor de teste e vínculo com o comprador aprovado no painel. O prefixo
  do token e a flag live_mode isoladamente não determinam o ambiente financeiro.
- ACK do webhook continua condicionado à consulta validada e persistência
  transacional pelas RPCs existentes. Erros de SDK são sanitizados; somente o
  status HTTP numérico pode entrar no diagnóstico existente.

## Configuração preparada

| Binding público | Valor |
| --- | --- |
| MP_APPLICATION_ID | 4897243060269064 |
| MP_TEST_APPLICATION_ID | 5855568499515388 |
| MP_COLLECTOR_ID | 3272217989 |
| MP_TEST_BUYER_ID | 3272217991 |
| PAYMENTS_ENABLED | false |

O guard de release verifica os IDs aprovados. `MP_ACCESS_TOKEN` e
`MP_WEBHOOK_SECRET` continuam sendo secrets exigidos, sem valor no repositório.
Os tipos de bindings foram regenerados por Wrangler. `nodejs_compat` explícito
assegura o empacotamento dos módulos Node utilizados pelo SDK.

Antes de qualquer ativação remota, substituir os secrets pelo par correto da
nova aplicação e conferir o segredo de assinatura. O token do vendedor antigo
pode ter o mesmo collector_id, mas produzir uma preferência de outro client_id;
essa situação é rejeitada pela validação nova.

## Verificação

Testes usam dados e tokens fictícios, sem operações no Mercado Pago ou no banco
compartilhado. Além de testes unitários, o teste `sdk-runtime.test.ts` gera o
bundle pelo Wrangler e o executa em Miniflare/workerd. A API do provedor e as
RPCs são simuladas no transporte, mantendo o SDK e o handler reais.

Cobertura inclui criação e retomada com um único POST, falha externa com claim
mantida, rejeição de preferência da aplicação antiga, assinaturas com pares em
ordem diferente, consulta e validação das identidades e falha de persistência
sem ACK. Não há mock da biblioteca SDK nos testes de runtime.

Resultados: 205 testes de pagamentos e 105 testes de aplicação aprovados;
TypeScript do Worker e SPA aprovado; bundle Wrangler/dry-run e build Vite
aprovados; guards de configuração/release aprovados; lint sem erros, com oito
avisos preexistentes de Fast Refresh. Nenhum dos comandos de release foi
executado em modo de publicação.

## Limites e próximos passos

- Atualização do item 1: a [reconciliação local](NOVA_INTEGRACAO_MERCADO_PAGO_RECONCILIACAO.md)
  foi implementada posteriormente com fila durável e política conservadora de
  estoque. Continua desativada e depende da nova migration antes de publicar.
  A mensagem 409 indica uma tentativa ainda pendente de reconciliação.
- O ledger e as RPCs de estoque/pagamento existentes foram preservados. Não foi
  aplicada nova modelagem de reservas ou limpeza de pedidos de teste.
- As chamadas internas do SDK usam seu próprio parser JSON; não herdam o limite
  de leitura do helper HTTP anterior. Endpoints, timeout, redirects e retries
  estão controlados, mas a consulta ao provedor não tem limite de bytes imposto
  por este adaptador.
- Public Key e guards foram atualizados na entrega local de frontend; o rollout
  remoto permanece pendente de configuração e aprovação.
- Antes de publicar, revisar a configuração completa e a transição das
  preferências antigas. Depois, configurar o novo webhook, conferir a
  assinatura com o provedor e executar homologação com credenciais de teste.
- Não marcar homologação ou produção como concluída com base nos testes locais.

## Documentação consultada pelo MCP

- Ambiente/SDK: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/configure-development-enviroment
- Preferências: https://www.mercadopago.com/developers/pt/docs/checkout-pro-preferences/create-payment-preference
- Webhooks: documentação retornada por `search_documentation` e parsing de
  `x-signature` conforme o padrão de pares chave/valor.
- A compatibilidade local do SDK foi verificada com o bundle do Wrangler,
  não inferida apenas do suporte declarado a Node.js.
