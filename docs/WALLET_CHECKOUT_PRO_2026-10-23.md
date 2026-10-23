# Checkout Pro — Wallet em staging

Solicitação aprovada em 23/10/2026. Branch: home-v2-contraste.

## Motivo e escopo

Preferências foram criadas e o checkout direto abriu, mas tentativas com cartão
de teste chegaram a `/fatal/`, inclusive com comprador 3272217991 e vendedor
3272217989. Resposta: service_error/unexpected_error, liveMode=false e operação
elegível. Isso não comprova a causa raiz nem pagamento efetivado. Simulações de
webhook validaram assinatura, mas com ID fictício retornaram upstream 404.

A inicialização passa a seguir o guia oficial: Public Key de teste + preferenceId
no Wallet Brick. Continua sendo Checkout Pro hospedado; não é Payment Brick nem
formulário de cartão dentro da loja. Não trocar manualmente init_point por
sandbox_init_point ou vice-versa.

## Implementação

- SDK React oficial 1.0.7 e loader oficial sdk-js 0.0.3, versões exatas no lockfile.
- Conferir total cria/reobtém o pedido autenticado; carregar o botão cria/reobtém
  a preferência; Wallet recebe somente preferenceId e redirectMode=self.
- O frontend ignora checkoutUrl, valida o prefixo do vendedor de teste e não faz
  fallback para redirecionamento direto se o SDK falhar.
- Guard exige staging, sandbox, origem fixa das APIs, APIs da loja habilitadas e
  Public Key de teste específica. Overrides herdados não alteram esses valores.
- SDK carregado em chunk separado apenas quando o Wallet é necessário. Erros de
  carregamento são tratados antes de montar o SDK React. Retry de renderização
  não chama o backend nem cria outra preferência.
- Reserva expirada remove o Wallet. O valor/prazo/autorização financeira continuam
  controlados pelo servidor; nenhum callback de UI aprova um pedido.
- Falhas/timeout têm mensagem segura; não imprimir erros brutos do SDK.
- Nenhuma migration, alteração remota de dados, rotação de secrets ou ativação
  de produção faz parte desta mudança. Não migrar/limpar pedidos antigos aqui.

## Verificação e limite de aceite

Verificações locais aprovadas: app/server 105 testes; pagamentos 129; storefront
59; TypeScript do app e Workers; geração de tipos; lint sem erros (oito avisos
preexistentes); dry-run do backend e build de staging. Chromium isolado verificou
carregando/pronto/erro/expirado em 1366px e 390px sem overflow horizontal, com SDK
simulado. Isso não confirma o carregamento do Wallet no serviço Mercado Pago.

Testar: configuração pública inválida, preferência de outro vendedor, API/JWT e
payload mínimos, ausência de navegação por URL, carregamento, script bloqueado,
callbacks, rerender, retry sem I/O, expiração e desmontagem com limpeza de timers.
Verificação visual em desktop/celular usa fixture local, SDK simulado e bloqueio
de tráfego externo: não é evidência de operação do provedor ou compra aprovada.

Após deploy, conferir HTML/assets/hash e saúde do backend. Usuário testa uma
compra nova com reserva válida em janela separada das contas pessoais e vendedora.
Parar após uma falha e registrar apenas código/IDs/status, sem cookies ou tokens.
Aceite financeiro exige pagamento de teste, webhook verificado, estado no banco
e retorno server-authoritative. Nenhum desses resultados é presumido pela mudança.

Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/web-integration/add-frontend-sdk
