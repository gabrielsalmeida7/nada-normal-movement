# Mercado Pago — guia de implementação e diagnóstico para outro projeto

Data: 23/10/2026. Caso de referência: loja Nada Normal.
Código de referência: commit `5eada683c1b66c58a5a95a7b2217d82e9fbc4fea`.

Este arquivo é autocontido e pode ser entregue a outro agente sem o histórico
da conversa. Descreve o que implementamos, os problemas observados, as correções
e os limites do que efetivamente foi validado. Não contém credenciais, cookies,
senhas, dados de cartão de clientes ou dados pessoais dos compradores.

**Importante:** a solução usada foi **Checkout Pro via Preferences API**, com
**Wallet Brick oficial** para iniciar o checkout hospedado. Não é Payment Brick,
Checkout Transparente, implementação via Orders API nem formulário de cartão
dentro da loja. Confirme o produto escolhido antes de reaproveitar qualquer código.

## 1. Resultado alcançado e pendências

Foi comprovada a seguinte sequência:

```text
Loja → preferência → Wallet oficial → compra de teste aprovada no Mercado Pago
  → reenvio assinado pelo simulador → consulta do pagamento pela API
  → transação no banco → pedido pago no painel administrativo
```

Evidências em 23/10/2026:

- O comprador concluiu um pagamento de teste de R$119,00 com cartão de teste.
- Apresentou comprovante aprovado e o identificador da transação.
- O simulador de Webhooks, usando esse identificador real de teste, retornou 200.
- O log do backend registrou `signatureVerified=true`, `stage=completed`, HTTP 200.
- Consulta somente leitura ao banco confirmou `financial_status=paid`,
  `status=paid`, pagamento do provedor `approved` e valor de 11.900 centavos.
- O usuário atualizou o admin e confirmou visualmente o pedido como pago.
- Não houve atualização manual do pedido para forçar esse resultado.

**Ainda não concluído:** a entrega automática do webhook. Chamadas no horário
da compra foram recusadas com 401 na validação da assinatura; a causa específica
dessas recusas ainda não foi determinada. O reenvio pelo simulador funcionou,
mas não demonstra que a entrega automática está resolvida.

Também permanecem para aceite: repetição online sem efeitos duplicados, cenários
recusado/pendente, reconciliação, expiração segura, página “Meus pedidos” e limpeza
seletiva do carrinho. Produção permanece bloqueada. Não apresentar este caso
como uma integração produtiva integralmente homologada.

## 2. Arquitetura e responsabilidades

| Componente | Responsabilidade | Não deve fazer |
| --- | --- | --- |
| React/Vite | Carrinho, sessão, confirmação do total, Wallet e consulta de status | Confiar no preço local ou marcar pedido pago por callback/URL |
| API da loja, em Cloudflare Workers | Autenticar, criar/reobter pedido e reservar disponibilidade | Cobrar novamente porque o navegador sofreu timeout |
| Worker separado de pagamentos | Criar preferência, validar webhook, consultar Mercado Pago e aplicar resultado | Aceitar o corpo da notificação como verdade financeira |
| Supabase/Postgres | Totais autoritativos, tentativas, reservas, locks, deduplicação e transição financeira | Expor operações financeiras privilegiadas ao navegador |
| Mercado Pago | Checkout hospedado, processamento e informação autoritativa do pagamento | Substituir o controle de autorização e consistência da loja |

O uso de Workers e Supabase foi uma decisão deste projeto, não requisito do
Mercado Pago. Os mesmos limites de responsabilidade podem ser implementados
em outro backend/banco. Não é necessário migrar a stack do novo projeto.

## 3. Preparação do novo projeto

1. Confirmar Checkout Pro **via Preferences** e consultar a documentação atual
   desse produto, país e SDK. Não misturar exemplos de outros produtos.
2. Criar/selecionar a aplicação no painel Developers.
3. Identificar vendedor de teste e comprador de teste, do mesmo país, no painel
   **Contas de teste**. Registrar os IDs aprovados em configuração controlada.
4. Obter credenciais correspondentes à aplicação/conta de teste correta.
5. Separar staging de produção, inclusive domínios, credenciais e flags.
6. Publicar URLs HTTPS acessíveis para retornos e webhook.
7. Configurar eventos de pagamentos no painel e o segredo de assinatura
   correspondente. URL no código não substitui configuração no painel.
8. Publicar inicialmente com novas submissões de pagamento desabilitadas.
9. Validar saúde, autenticação, autorização, CORS e recusa de webhook inválido.
10. Habilitar explicitamente somente o ambiente de teste, após essas verificações.

Nosso teste de cartão aprovado usou comprador de teste e cartão da seção
**Cartões de teste**, com titular `APRO`. Consulte números/validade/códigos atuais
no painel/documentação; não usar cartão ou conta pessoal em testes.

### Credenciais de teste e IDs de aplicações

Neste fluxo, o vendedor de teste foi criado automaticamente e suas credenciais
apareciam como credenciais de teste da aplicação principal. O Access Token tinha
prefixo `APP_USR`, e o identificador associado ao vendedor de teste diferia do ID
da aplicação principal acessível ao MCP.

Aprendizado: **prefixo APP_USR ou IDs diferentes não comprovam, isoladamente,
que as credenciais são produtivas ou estão erradas**. Conferir a associação no
painel e a identidade do próprio token por `/users/me`, sem imprimir o token.
Não trocar credenciais ou rotacionar segredo por dedução baseada nesses números.

## 4. Variáveis e segredos

Nomes abaixo refletem nosso código; adapte ao novo projeto.

| Nome | Onde fica | Finalidade |
| --- | --- | --- |
| `MP_ACCESS_TOKEN` | Segredo exclusivo do backend | Autenticar consultas e criação de preferências |
| `MP_WEBHOOK_SECRET` | Segredo exclusivo do backend | Validar assinatura das notificações |
| `SUPABASE_SECRET_KEY` | Segredo exclusivo do backend | Operações financeiras privilegiadas no banco |
| `MP_COLLECTOR_ID` | Configuração do backend | Recebedor esperado |
| `CHECKOUT_PRO_MODE` | Configuração do backend/build | Modo explicitamente permitido pela aplicação |
| `PAYMENTS_ENABLED` | Configuração do backend | Permitir ou bloquear novas submissões |
| `CHECKOUT_RETURN_ORIGIN` | Configuração do backend | Origem HTTPS dos retornos |
| `CHECKOUT_WEBHOOK_URL` | Configuração do backend | URL HTTPS da notificação |
| `ALLOWED_ORIGINS` | Configuração do backend | Origens exatas autorizadas para o navegador |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Configuração adequada ao cliente/servidor | Conexão pública, limitada pelas permissões do banco |
| `VITE_MERCADO_PAGO_PUBLIC_KEY` | Build público do frontend | Inicializar o SDK oficial |
| `VITE_PAYMENTS_API_URL` | Build público do frontend | Origem da API de pagamentos |
| `VITE_CHECKOUT_PRO_ENABLED`, `VITE_APP_ENV`, `VITE_CHECKOUT_PRO_MODE` | Build público do frontend | Bloqueios explícitos do checkout |

Tudo com prefixo `VITE_` é público no bundle. Nunca colocar Access Token,
segredo HMAC ou chave privilegiada do banco nessas variáveis.

Os nomes `sandbox` e `staging` são controles internos nossos, não prova de que
uma transação é de teste. Validar também as identidades e o ambiente do provedor.
Em Vite, mudar variável no painel sem reconstruir o bundle não muda o frontend.

## 5. Fluxo do pedido e da preferência

### 5.1 Criar/reobter pedido no servidor

O cliente envia variantes/quantidades, endereço e método escolhido. O servidor:

- valida sessão e dono dos recursos;
- consulta preços/disponibilidade e calcula frete;
- trabalha em centavos inteiros;
- grava pedido, tentativa e reserva na transação apropriada;
- usa chave idempotente estável para o mesmo conteúdo do checkout;
- rejeita a reutilização da chave com conteúdo diferente.

No navegador, usamos fingerprint do checkout e chave em `sessionStorage`,
associados ao usuário. Um bloqueio síncrono também evita duplo clique.
Isso complementa, mas não substitui, idempotência e locks no banco.

### 5.2 Criar preferência

Contrato do nosso endpoint:

```text
POST /v1/checkout/preferences
Authorization: Bearer <sessão da loja>
Content-Type: application/json

{ "orderId": "<UUID do pedido>" }
```

Não aceitar `price`, `total`, `currency` ou dono enviados como autoridade pelo
cliente. O backend faz uma claim durável, valida dono/reserva/tentativa e usa
o snapshot persistido para construir a preferência.

Campos utilizados no POST `https://api.mercadopago.com/checkout/preferences`:

```javascript
// Exemplo de estrutura, não implementação pronta para produção.
const preference = {
  items: [{
    id: order.id,
    title: `Pedido ${order.displayCode}`,
    currency_id: "BRL",
    quantity: 1,
    unit_price: order.totalCents / 100,
  }],
  external_reference: attempt.id,
  metadata: { order_id: order.id, payment_attempt_id: attempt.id },
  back_urls: {
    success: `${returnOrigin}/checkout/sucesso?order=${order.id}`,
    pending: `${returnOrigin}/checkout/pendente?order=${order.id}`,
    failure: `${returnOrigin}/checkout/erro?order=${order.id}`,
  },
  auto_return: "approved",
  notification_url: webhookUrl,
  expires: true,
  expiration_date_to: reservation.expiresAt,
};
```

Neste caso, um único item representa o total autoritativo, incluindo frete.
Não somar o frete novamente no provedor. Adaptar a representação de itens às
necessidades do novo projeto e às recomendações atuais do Mercado Pago.

Também enviamos restrições de métodos conforme a escolha inicial do checkout.
Essas exclusões são específicas da aplicação; não copiá-las sem revisão.
Não excluir cartão de crédito acidentalmente ao testar pagamento com cartão.

Antes do POST, conferimos a identidade do token em `/users/me`. Depois, salvamos
`preferenceId` e o vínculo com a tentativa antes de responder ao navegador.

**Timeout não significa “não criou”.** Não presumimos que a Preferences API
honre o mesmo mecanismo de idempotência da Payments API. Uma claim cujo resultado
é desconhecido fica para reconciliação; não repetimos o POST cegamente.

## 6. Inicialização pelo Wallet oficial

Versões usadas neste projeto em 23/10/2026, fixadas no lockfile:

- `@mercadopago/sdk-react`: `1.0.7`;
- `@mercadopago/sdk-js`: `0.0.3`.

São um registro histórico, não indicação para instalar versões antigas no futuro.
O próximo agente deve verificar as versões/documentação atuais e fixar as escolhidas.

Essência da integração React:

```tsx
import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";

// Executar no cliente, com Public Key da aplicação correta.
initMercadoPago(publicKey, { locale: "pt-BR" });

// Usar o ID devolvido pelo backend; não criar outra preferência ao renderizar.
<Wallet initialization={{ preferenceId, redirectMode: "self" }} />
```

Este trecho ilustra a API, não substitui o tratamento de ciclo de vida. Nossa
implementação completa também:

- carrega o SDK somente ao entrar na etapa de pagamento, em chunk separado;
- aguarda `loadMercadoPago()` e captura falha de script antes de montar o wrapper;
- mantém configuração/callbacks estáveis e limpa timers na desmontagem;
- trata carregamento, erro e timeout, sem imprimir erro bruto do SDK;
- permite remontar o mesmo Wallet sem criar outro pedido/preferência;
- desabilita/desmonta o Wallet ao vencer a reserva;
- não faz fallback silencioso para uma URL manual se o SDK falhar.

O SDK escolhe a URL de abertura. Não reescrever domínios, não trocar manualmente
`init_point` por `sandbox_init_point` e não concluir “produção” só porque apareceu
`www.mercadopago.com.br` em vez de `sandbox.mercadopago.com.br`.

O backend ainda persiste/devolve `checkoutUrl` por compatibilidade histórica;
o frontend atual usa somente `preferenceId`. O validador antigo de URL sandbox
não é a regra usada pelo Wallet para abrir o checkout.

## 7. Webhook: autenticação não é confirmação financeira

Endpoint: `POST /webhooks/mercadopago`.

Sequência implementada:

1. Validar método, rota e configuração permitida do ambiente.
2. Validar assinatura com segredo do backend.
3. Validar formato/tipo do evento e a correspondência do ID no corpo/URL.
4. Consultar `GET https://api.mercadopago.com/v1/payments/{paymentId}`,
   autenticado com o token do vendedor.
5. Validar a resposta do provedor e as regras locais de identidade/ambiente.
6. Validar valor, moeda e referência contra o pedido/tentativa persistidos.
7. Aplicar a transição financeira e o evento deduplicado em transação no banco.
8. Retornar 200 somente após persistência bem-sucedida.

No nosso desenho síncrono, erro antes da persistência não recebe ACK de sucesso.
Outro projeto pode usar recepção durável e fila, mas deve definir claramente
quando a notificação foi armazenada com segurança e como será reprocessada.

### Assinatura

Usamos HMAC-SHA256 com Web Crypto. O manifesto deste caso de pagamentos é:

```text
id:<data.id da query>;request-id:<x-request-id>;ts:<ts de x-signature>;
```

O parser atual exige ID numérico único na query, `x-request-id` válido e
`x-signature` com `ts` e `v1`; compara o HMAC sem comparação textual ingênua.
Depois confere que o ID do corpo corresponde ao ID assinado.

Há uma janela local de cinco minutos para o timestamp. Essa janela e a rigidez
do parser são decisões do nosso código, não garantia universal do provedor.
**A compatibilidade delas com entregas/retries automáticos ainda precisa ser
validada.** Conferir documentação atual, formato real e política de reenvio.
Não desabilitar HMAC, aceitar qualquer timestamp ou assinar um ID diferente
apenas para fazer um teste retornar 200.

O corpo do simulador contém campos fictícios, inclusive data antiga, `user_id`
e `live_mode`. Esses campos não substituem os dados do pagamento consultado
pela API. Não marcar o pedido pago usando `action: payment.updated` ou
`live_mode: false` do JSON de exemplo.

### Resposta financeira

Verificamos: ID do pagamento, recebedor esperado, BRL, valor e estorno em
centavos válidos, status conhecido, referência da tentativa e data de atualização.
Não seguir uma URL de recurso arbitrária fornecida no webhook; construir a
consulta usando origem fixa e ID validado.

O banco confere valor e vínculo novamente. Respostas de retorno do navegador,
como `status=approved`, `payment_id` ou `collection_id`, são apenas pistas para
consulta, nunca prova de autorização financeira.

## 8. live_mode e contas de teste: a correção específica deste caso

Houve um erro nosso de modelagem: o schema exigia `live_mode: false` literalmente.
O pagamento aprovado do vendedor de teste entrou no caminho que exige tratamento
de `live_mode: true`, e foi bloqueado. Não resolvemos isso aceitando qualquer
pagamento produtivo no staging.

A política final local é:

```text
Exigir live_mode booleano, sem coerção de string/null/ausência.
Se false: preservar o caminho de sandbox já existente e as validações financeiras.
Se true: aceitar somente a exceção restrita abaixo, disponível no staging.

Exceção:
  recebedor do pagamento = vendedor de teste aprovado e configurado;
  payer.id do pagamento = comprador de teste aprovado no painel;
  /users/me = o mesmo vendedor, país esperado e marcador test_user;
  /users/{buyer_id} = o comprador esperado e país esperado;
  assinatura, moeda, valor, referência e transação no banco continuam obrigatórios.
```

O marcador de teste do vendedor autenticado é confirmado em `tags` ou
`user_type`. **Não exigir esse marcador no perfil público do comprador**:
a consulta autenticada como vendedor não confirmou a condição de teste de
outro usuário, embora o comprador estivesse listado como teste no painel.

A origem da condição de teste do comprador é o painel Contas de teste, conferido
pelo operador. No código de referência, o par aprovado está fixo e restrito;
outros compradores não passam por essa exceção sem revisão explícita.
O perfil público serve para conferir ID/país, não para provar “é teste”.

Esta é uma **política operacional limitada ao nosso staging**, não uma regra
genérica de que `live_mode=true` significa teste. Não copiar os IDs deste projeto,
não generalizar a exceção e não aplicá-la ao ambiente de produção.
O rollout produtivo precisa de configuração e política próprias, autorizadas.

## 9. Persistência, repetição e estados

Entidades relevantes do nosso banco:

- `orders`: total, dono, estado financeiro e estado da reserva;
- `payment_attempts`: tentativa vinculada ao pedido, método e valor;
- `checkout_pro_sessions`: claim/preferência e pagamento aprovado associado;
- `checkout_pro_payments`: última informação financeira por pagamento;
- `webhook_events`: registro sanitizado e chave de deduplicação;
- `outbox_jobs`: revisão operacional, como aprovação adicional para o checkout.

Regras implementadas na RPC financeira:

- locks com ordem consistente para evitar concorrência com cancelamento;
- pagamento não pode ser reaproveitado em outra tentativa/pedido;
- mesmo evento não deve produzir outro efeito financeiro;
- evento antigo não deve sobrescrever uma atualização mais recente;
- pedido pago não deve regredir por um evento pendente ou uma recusa tardia;
- segunda aprovação de outro pagamento exige revisão, não outra confirmação;
- recusas não liberam estoque imediatamente: o checkout ainda pode ser pago
  numa tentativa posterior;
- estorno/contestação não devolvem estoque automaticamente.

No modelo atual, um pedido pago ainda pode ter `reservation_state=held`.
O estado financeiro protege essa reserva. Não tratar isso, isoladamente, como
falha do pagamento ou motivo para liberar estoque. Uma transição definitiva
de reserva exige mudança própria do modelo, ainda pendente.

As operações financeiras do banco são exclusivas do backend, com RLS e
privilégios restritos. Não expor uma RPC privilegiada a anon/authenticated para
facilitar o frontend. Não usar `user_metadata` editável para autorização.

## 10. Problemas observados, diagnóstico e tratamento

| Problema | Evidência / causa conhecida | Tratamento / limite |
| --- | --- | --- |
| `/fatal/` após cadastrar/confirmar cartão no checkout direto | `service_error`, `unexpected_error`, código FL-4421acf4; causa única não comprovada | Migramos a inicialização para Wallet oficial + preferenceId; nesse fluxo a compra foi aprovada. Não afirmar que trocar domínio sozinho corrige o erro |
| Primeiro teste usando a conta vendedora | O usuário tinha confundido as credenciais do vendedor com login do comprador | Orientamos Buyer Test User em sessão separada. Depois ainda houve fatal com buyer correto, portanto não era a única hipótese |
| Cartões salvos confundiam o teste | A conta possuía cartões previamente cadastrados | Usamos cartão da seção oficial Cartões de teste e cenário APRO; não inferir a origem dos cartões salvos |
| Aplicação principal e ID associado à credencial diferiam | Credenciais de teste ligadas ao vendedor de teste automático | Conferir painel e `/users/me`; não trocar token por causa do prefixo/numeração |
| Simulação `application.authorized` | Evento mp-connect, não confirmação de pagamento | Selecionar Pagamentos/payment para testar esse handler |
| Simulação com Data ID `123456` retornava 503 | Logs comprovaram HMAC válido e upstream 404 para recurso fictício | Usar ID de um pagamento de teste existente; erro 503 não provava host fora do ar |
| Pagamento aprovado no provedor, loja pendente | A confirmação ainda não havia sido aplicada no banco | Correlacionar por paymentId, preferência e pedido; não cobrar novamente nem marcar pago manualmente |
| Reenvio com ID correto retornava 503 | Diagnóstico apontou schema em live_mode | Corrigir a regra de ambiente com exceção restrita e verificação de contas, não aceitar true indiscriminadamente |
| `PROVIDER_TEST_ACCOUNT_UNVERIFIED` | Diagnóstico posterior apontou somente buyer_test_marker | Remover exigência de marcador público do comprador; usar ID aprovado no painel, manter prova do vendedor e conferências ID/país |
| Entregas no horário da compra retornaram 401 | Assinatura rejeitada; subcausa ainda não determinada | Investigação automática pendente; não atribuir a segredo errado, ausência de query ou timestamp sem evidência |
| Network do navegador mostrava GET 200 / OPTIONS 204 | Consulta de status e CORS funcionando, mas status continuava processing | Separar disponibilidade da API de confirmação financeira; webhook entre servidores não aparece nessa aba |
| A API do painel de testes respondia HTTP 200, mas mostrava 503 no resultado | O 200 era da chamada ao painel; o 503 era o resultado relatado da entrega ao webhook | Examinar o resultado da entrega e os logs do receptor, não apenas o status externo do painel |
| Item continuou no carrinho após pagar | Limpeza automática ainda não implementada | Não usar o carrinho como prova de falha; implementar limpeza seletiva e proteger mudanças de outras abas |
| Cliente não tinha Meus pedidos/comprovante no site | Interface ainda incompleta | Consultar banco/admin; comprovante e número da transação no Mercado Pago da conta compradora |
| Falha ao carregar o SDK, tratada na verificação local | Promise do loader pode rejeitar antes do wrapper React tratar | Capturar falha em loadMercadoPago, mostrar estado seguro, não criar nova preferência num retry de renderização |

As correções de validação são independentes do erro `/fatal/`. Não misturar
“checkout abriu”, “provedor aprovou”, “webhook autenticou” e “banco confirmou”.

## 11. Observabilidade segura que ajudou a resolver

Começamos com erro genérico, depois acrescentamos diagnósticos progressivos
para evitar adivinhações. O evento de staging `webhook_diagnostic` contém:

- requestId aleatório gerado pelo nosso servidor;
- etapa fixa: configuration, routing, signature, payload,
  provider_lookup_and_validation, database_apply ou completed;
- `signatureVerified`, status HTTP e código de erro de uma lista permitida;
- motivos fixos de rejeição da assinatura: query/ID/header ausente ou inválido,
  timestamp fora da janela ou HMAC divergente, sem registrar os valores;
- status HTTP externo quando disponível;
- nomes de campos rejeitados do pagamento, filtrados pelo schema conhecido;
- rótulos fixos de checagens de identidade que falharam, sem valores recebidos.

Não registrar corpo completo, respostas externas, perfil, tokens, cookies,
headers, assinatura, URLs com query, mensagens Zod ou exceções brutas.
Mesmo erros de validação podem conter valores sensíveis.

No Cloudflare staging, usamos logs de aplicação persistidos, query redigida,
logs automáticos de invocação desabilitados e traces desabilitados. A ausência
de query nos logs redigidos **não comprova** que a requisição chegou sem query.
Reduzir/remover a coleta temporária e revisar custo/retenção após o diagnóstico.

O histórico de notificações do MCP retornou “No Notifications Found” mesmo com
simulações observadas nos logs. Não usar essa resposta isolada como prova de
que nada foi enviado. O MCP também não oferecia consulta direta de pagamento
por ID nessa sessão; o backend fez a consulta financeira com seu segredo.

Ao solicitar dados ao operador, pedir somente ID do pagamento, código/status e
horário. Evitar cURL completo, HAR e dumps de headers; podem conter sessões.
Não executar requisições copiadas com cookies/token de cartão do navegador.
Se houver exposição de credenciais/sessões, tratar a revogação separadamente.

## 12. Roteiro de testes para o próximo agente

### Antes do primeiro pagamento

- Confirmar o produto Preferences, país, aplicação, conta vendedora e Buyer IDs.
- Conferir origins/URLs HTTPS, autenticação e configuração de assinatura.
- Verificar backend com submissões desligadas; health não comprova acesso ao MP.
- Testar origem inválida, sessão ausente e acesso a pedido de outro usuário.
- Testar adulteração de preço/valor, duplo clique, replay da criação e conflito de chave.
- Testar reserva expirada, erro/timeout do SDK e retry sem POST de preferência duplicado.
- Garantir que um POST externo de resultado desconhecido não é repetido cegamente.

### Um pagamento de teste controlado

1. Usar sessão separada de contas pessoais e da conta vendedora.
2. Criar um único checkout com reserva válida e total conhecido.
3. Abrir pelo Wallet oficial e usar comprador/cartão de teste.
4. Anotar o número do pagamento no comprovante do Mercado Pago, não só o orderId.
5. Se houver erro, parar; não repetir pagamentos ou usar um link expirado.
6. Conferir entrega automática nos logs e status financeiro no banco.
7. Se necessário, simular notificação com esse paymentId para isolar o handler.
8. Confirmar assinatura, consulta ao provedor, persistência e visualização na loja.

**Simular notificação de um pagamento existente não cria outra cobrança.**
Um 200 do simulador, sozinho, não substitui a consulta do estado persistido.

### Antes do aceite integral

- Validar entrega automática sem clicar no simulador.
- Reenviar evento e verificar ausência de efeitos duplicados.
- Testar aprovado/recusado/pendente e eventos fora de ordem.
- Testar estorno, contestação e aprovação adicional com revisão, conforme escopo.
- Validar reconciliação quando uma notificação falha ou não chega.
- Validar expiração/cancelamento sem liberar uma compra já paga ou ainda conciliável.
- Confirmar retorno/status com sessão válida e sem confiar nos parâmetros da URL.
- Validar UX do cliente e do admin; não confundir falta de interface com falta de dados.
- Reduzir logs temporários e planejar alertas/limites antes de produção.

## 13. Publicação e verificação no projeto de referência

Usamos branch de desenvolvimento própria e Workers Builds. Configuração versionada,
branch/commit, ambiente, fingerprint do artefato e presença dos secrets por nome
são verificados antes do deploy. Node 24 foi usado nos builds.

As variáveis não secretas do dashboard não substituem necessariamente a
configuração versionada do Wrangler; um deploy pode sobrescrevê-las. Preservar
os secrets remotos e não contornar guards de publicação.

Comandos existentes, para quem tiver acesso ao repositório:

```sh
npm test
npm run worker:test
npm run worker:typecheck
npm run shop:test
npm run lint
npm run worker:stage:check
npm run worker:stage:prepare
```

`worker:stage:prepare` executa testes e dry-run; não é o deploy. A publicação
normal ocorre pelo pipeline protegido. Não copiar esses comandos para outro
repositório sem verificar se os scripts existem e o que fazem.

Última adequação: 166 testes de pagamentos aprovados; preparação executou também
105 testes app/server. Lint sem erros, com oito avisos preexistentes. CI e deploy
do backend foram confirmados. Esses testes não substituem os aceites online.

Nunca reaplicar migrations, bootstrap, seeds ou limpar pedidos num banco existente
como preparação automática. Rever o schema e usar banco descartável para testes
de concorrência/transação quando apropriado.

## 14. Mapa do código e histórico útil

Caminhos relativos ao repositório Nada Normal; não são arquivos embutidos neste guia:

| Arquivo | O que consultar |
| --- | --- |
| `src/components/CheckoutWallet.tsx` | Loader oficial, Wallet, expiração e retry de renderização |
| `src/lib/checkout-pro.ts` | Guards do frontend, criação idempotente e contratos das APIs |
| `src/pages/Checkout.tsx` | Etapas, estado e bloqueio de duplo clique |
| `src/components/CheckoutResult.tsx` | Consulta autenticada do resultado, sem confiar na URL |
| `workers/payments/src/checkout-pro.ts` | Payload da preferência, HMAC, schema e política de contas |
| `workers/payments/src/checkout-pro-handler.ts` | Autenticação, claim, consulta financeira e RPC |
| `workers/payments/src/config.ts` | Bloqueio de produção e configuração fail-closed |
| `workers/payments/src/http.ts` | Limites de leitura, timeout e erros sanitizados |
| `workers/payments/src/webhook-diagnostic.ts` e `src/index.ts` no mesmo Worker | Diagnóstico restrito ao staging |
| `workers/payments/tests/checkout-pro.test.ts` | Casos positivos, negativos, privacidade e contas de teste |
| `supabase/migrations/20261019192940_checkout_pro_sandbox.sql` | Claim, sessão, aplicação transacional e deduplicação |
| `supabase/tests/checkout_pro.sql` | Testes de autorização/transação em banco de teste |
| `workers/payments/scripts/staging-release.mjs` | Guard de release e manifesto |

Commits importantes para investigar o histórico, não para copiar cegamente:

- `b14720f`: Wallet oficial substituindo abertura manual da URL.
- `75918a1`: diagnóstico sanitizado dos campos rejeitados no pagamento.
- `89ed30b`: exceção restrita para contas de teste no caminho live_mode=true.
- `46eb7d5`: detalhamento sanitizado da checagem que falhou.
- `5eada68`: correção final da exigência indevida de marcador público do comprador.

Os commits intermediários contêm hipóteses/regras que foram corrigidas depois.
Consultar o estado final e este guia; não usar um commit intermediário como solução final.

## 15. Referências e instrução pronta para outro agente

Documentação muda. Conferir as páginas e a variante atual do produto antes de
implementar; respostas de assistentes são pistas, não especificações normativas.

- Inicialização web oficial: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/web-integration/add-frontend-sdk
- Compras de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases
- Contas de teste: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/test-accounts
- Contas de teste, documentação geral: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/accounts
- Webhooks: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-content/notifications/webhooks
- Consulta financeira: `GET https://api.mercadopago.com/v1/payments/{id}`.
- MCP: https://www.mercadopago.com.br/developers/pt/docs/mcp-server/overview

Texto sugerido para abrir o trabalho no outro projeto:

> Implemente Mercado Pago Checkout Pro via Preferences com inicialização oficial
> por SDK/Wallet, se esse for o produto adequado à stack. Use este guia como relato
> de experiência, não como autorização de produção ou cópia de credenciais/IDs.
> Inspecione o projeto e a documentação atual. Defina ambientes, credenciais,
> totais autoritativos, idempotência, reservas, HMAC, consulta financeira, vínculo
> transacional e reconciliação. Não confirme pagamento por callback/URL e não
> repita cobrança após timeout. Não exija marcador test_user do perfil público
> de outro usuário. Não aceite live_mode=true sem uma política explícita e prova
> apropriada do ambiente/contas; a exceção deste guia é exclusiva do staging de
> referência. Entregue testes, documentação e evidências separando compra aprovada,
> reenvio manual do webhook e entrega automática. Não ative produção sem autorização.

Não reutilizar tokens, Public Keys, secrets, pares de contas, IDs de aplicação,
domínios, project refs, migrations ou dados de clientes da Nada Normal no novo
projeto. Reaproveitar os padrões e as lições, adaptando a implementação.
