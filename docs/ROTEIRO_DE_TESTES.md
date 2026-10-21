# Nada Normal — passo a passo de testes

Atualizado em 21/10/2026. Planejamento vigente: [roadmap](../roadmap.md).

Este roteiro valida a loja na **home-v2-contraste**. A main e o PR #9 aguardam
o projeto ficar pronto. Preparar o roteiro não publica o Worker nem habilita pagamentos.

## 1. O que fazer após a migração, antes do pagamento

O site foi publicado em staging no commit `28402b6` e verificado por HTTP em
21/10/2026: https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev.
O usuário concluiu os testes de quantidade persistida, totais, remoção, variantes
separadas e carrinho no celular. **Próximo: APIs da loja em staging e checkout até
a etapa de pagamento bloqueado.** A configuração preparada habilita somente as
APIs da loja, publicadas no commit `83e4316`; `/health` já confirmou
`apiEnabled=true`. Recusas sem sessão, sessão inválida e origem externa foram
verificadas remotamente. Isso
não valida as credenciais externas nem substitui o ensaio autenticado das RPCs.
O frontend mantém Checkout Pro desligado e ainda não cria pedidos pela tela;
não testar cobrança nem afirmar E2E de pedido concluído. Cadastro,
recuperação de senha e retornos Auth exigem conferir as URLs permitidas antes
do aceite. Não configurar Vercel nem usar seus deploys antigos para o aceite.

Próximo teste manual: entrar na conta de teste, abrir `/admin/usuarios` com conta
admin e confirmar listagem sem erro (e-mails disponíveis e CPF mascarado).
Como comprador, preencher identificação, entrega, revisão e chegar ao pagamento
bloqueado, sem cobrança. Isso valida Auth/fluxo visual e, na listagem, uma API
autenticada; não valida criação de pedido, orçamento remoto, idempotência ou
cancelamento. Essas operações exigem ensaio autenticado específico posterior.
Antes da seção 2, concluir a Etapa 0 do
[roadmap](../roadmap.md) e o [checklist de migração](MIGRACAO_CLOUDFLARE.md).

1. Abra a URL estável de staging **Cloudflare** informada pelo responsável técnico,
   correspondente à **home-v2-contraste** e ao commit validado. Não presumir que
   o domínio principal já tenha sido migrado. O nome do novo Worker da loja
   será informado após sua criação.
2. Guarde URL e commit. Se houver proteção do staging, use o acesso combinado;
   o webhook Mercado Pago precisa continuar acessível ao provedor com HMAC.
3. No celular e no computador, abra home, categorias e dois produtos.
   Confira imagens, tamanhos/cores, preços e seleção das variantes.
4. Adicione um item ao carrinho, altere a quantidade, atualize a página e remova
   um item. Confira se as quantidades e os valores acompanham as alterações.
5. Crie/entre em uma conta de teste da loja. Confira confirmação de cadastro e
   recuperação de senha quando necessárias. A conta da loja é diferente da
   conta de comprador de teste do Mercado Pago.
6. Preencha identificação e entrega. Teste um endereço salvo e um novo; confira
   a revisão do pedido e o frete. Anote diferenças de preço ou problemas de CEP.
7. Vá à etapa de pagamento. Se aparecer **Finalizar compra em breve**, registre
   esse resultado e pare o teste de cobrança: a ativação do preview ainda está pendente.

Esperado: navegação, login, carrinho e etapas do checkout funcionam, sem coletar
número de cartão na loja. Não é esperado pagar antes da preparação da seção 2.

## 2. Preparação técnica antes de testar compras

Esta parte é feita pelo responsável técnico/Codex com os acessos apropriados.
O usuário confere os painéis e aprova as regras comerciais; não precisa instalar
SDK nem colar código no editor online do Worker.

Pré-requisito: site e cinco APIs portados e publicados na Cloudflare. Confirmar
que `/api/checkout/order` e `/api/admin/users` são atendidos pelo Worker da loja,
sem proxy à Vercel. Refresh de rotas profundas deve abrir o SPA; `/api/inexistente`
deve retornar erro JSON/404, não HTML. Usuário comum não pode acessar a API admin.
Testar cadastro, confirmação e recuperação de senha com as novas URLs de Auth.

### 2.1 Conferir as configurações existentes

No Cloudflare: **Workers & Pages → nada-normal-payments-staging → Settings →
Variables and Secrets**. Nomes são sensíveis a maiúsculas/minúsculas.

| Nome | Tipo | Conferência |
| --- | --- | --- |
| SUPABASE_URL | Text | https://bcemyxasbcwcrbinfguu.supabase.co |
| SUPABASE_PUBLISHABLE_KEY | Text | Chave pública do mesmo projeto Supabase |
| SUPABASE_SECRET_KEY | Secret | Já cadastrada; não copiar para código/chat |
| MP_ACCESS_TOKEN | Secret | Token de teste da aplicação/conta correta |
| MP_WEBHOOK_SECRET | Secret | Assinatura da configuração correspondente ao token |

Esses cadastros já foram confirmados na sessão anterior. Conferir presença e
ambiente, sem recriar ou redefinir secrets apenas para seguir este roteiro.

A aplicação **TesteNN**, ID **6344920694868580**, foi listada pelo MCP. O número
760330644412079 apareceu nas credenciais informadas anteriormente. Ainda é
necessário validar a associação e o recebedor com uma chamada autenticada;
os números contidos no token não são prova suficiente de correspondência.

### 2.2 Completar a configuração de staging no código

O responsável técnico preenche `env.staging` em
[wrangler.jsonc](../workers/payments/wrangler.jsonc), preservando os secrets remotos.
Variáveis de texto do painel não preenchem o arquivo automaticamente; um deploy
pode substituir valores do painel pelos valores definidos no arquivo.

| Nome | Valor/critério |
| --- | --- |
| APP_ENV | staging |
| PAYMENTS_ENABLED | false na primeira publicação |
| ALLOWED_ORIGINS | Origens HTTPS exatas aprovadas, incluindo o preview escolhido; sem caminho ou barra final |
| SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY | Dados públicos corretos; atualmente há campos vazios no arquivo |
| CHECKOUT_PRO_MODE | sandbox |
| CHECKOUT_RETURN_ORIGIN | Mesma origem exata do preview, também presente no CORS |
| CHECKOUT_WEBHOOK_URL | https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago |
| MP_COLLECTOR_ID | ID retornado por /users/me usando o token de teste em uma sessão segura; não é o ID da aplicação |

Preferir um alias estável do preview da branch. Se ele mudar, atualizar a origem
explicitamente; não liberar todos os previews com wildcard.

As três migrations já estão aplicadas. **Não executar novamente SQL, seeds,
bootstrap ou db push no banco compartilhado.** O histórico e o mapeamento de
versões estão em [supabase/README.md](../supabase/README.md).

### 2.3 Publicar e conferir o Worker com submissões desativadas

O responsável técnico executa os checks e publica o código da branch oficial
com `PAYMENTS_ENABLED=false`. Não substituir o projeto pelo exemplo Hello World.

Abra no navegador:

[Health de staging](https://pagamentos-staging.nadanormalclub.com.br/health).

Esperado: HTTP 200 e JSON com `status: ok`, `version: 0.2.0`,
`environment: staging` e `paymentsEnabled: false` para a versão atual do código.
Hello World significa que ainda está publicado o exemplo, não a integração.
Health não comprova que as credenciais externas funcionam.

O responsável técnico também verifica CORS, acesso ao status com sessão válida
e recusa de usuário sem permissão. Abrir o endereço do webhook pelo navegador
faz GET e pode retornar 405: isso não testa o POST assinado do Mercado Pago.

### 2.4 Preparar notificações e o preview

Após confirmar o endpoint publicado, no Mercado Pago Developers:

1. Abra **Suas integrações → aplicação correta → Webhooks**.
2. Selecione **Modo de teste** e configure como URL de teste:
   `https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago`.
3. Selecione o evento **Pagamentos** (`payment`) para a integração atual.
4. Confira se a assinatura corresponde ao secret cadastrado antes de salvar.
   Não use Redefinir sem também atualizar o secret correto no Worker.

O botão Simular notificação verifica apenas uma parte da entrega: um ID fictício
pode ser rejeitado na consulta à API ou por não pertencer a um pedido local.
Não considerar uma simulação isolada como compra confirmada.

No build de staging Cloudflare da home-v2-contraste, o responsável técnico configura:

- `VITE_CHECKOUT_PRO_ENABLED=true`.
- `VITE_PAYMENTS_API_URL=https://pagamentos-staging.nadanormalclub.com.br`.

Conferir também os dados públicos Supabase do frontend e os bindings server-side
do Worker da loja que atende as APIs de pedido/admin. Secrets do Worker de
pagamentos não são herdados automaticamente por outro Worker. Nunca colocar
a chave secreta em VITE_*.
O redirecionamento direto não usa Public Key Mercado Pago no frontend.

As variáveis do Vite entram no build: gerar novo deployment do preview após
alterá-las. Não habilitar a flag globalmente em produção nem em previews não confiáveis.

Somente depois dessas conferências, o responsável técnico ativa
`PAYMENTS_ENABLED=true` **no staging** e confirma `paymentsEnabled: true` no health.
Ativar a flag sozinha não configura o ambiente. Produção permanece bloqueada.

## 3. Fazer a primeira compra de teste

Começar apenas após a conclusão e confirmação da seção 2.

1. Abra o preview confirmado; use uma janela separada da conta vendedora Mercado Pago.
2. Entre com a conta de teste da loja e adicione uma variante com estoque conhecido.
   Anote a quantidade disponível antes do teste, com ajuda do painel administrativo.
3. Preencha identificação, endereço e revisão. Escolha Pix ou cartão conforme o cenário.
4. Clique em **Conferir total do pedido**. O servidor cria/reobtém o pedido e
   reserva o estoque. Confira o total confirmado; registre o ID com ajuda do técnico.
5. Clique em **Continuar no Mercado Pago**. Esperado: abrir o checkout de sandbox
   e mostrar o mesmo total, incluindo frete. Não inserir cartão real nem fazer Pix real.
6. Use o comprador e os cartões/cenários de teste da documentação oficial vigente.
   Comprador e vendedor devem ser contas de teste distintas conforme o cenário.
7. Volte à loja pelo retorno do checkout. Só deve aparecer **Pagamento confirmado!**
   quando o backend tiver confirmado o pedido; pendência não é aprovação.
8. No painel da loja, confira o pedido e o valor. Peça ao responsável técnico para
   conferir `financial_status`, tentativa, `checkout_pro_sessions`, evento de
   webhook e estoque. O painel atual não mostra toda essa trilha financeira.

Se o retorno continuar aguardando, registre o pedido e pare de criar novas
compras. Investigar entrega/assinatura do webhook, API e banco. A recuperação
automática de webhook perdido ainda é uma pendência, não uma garantia atual.

## 4. Cenários que precisamos registrar

Executar o básico da loja após o staging Cloudflare estar pronto; pagamentos só
após a seção 2. Casos avançados
devem ter acompanhamento técnico, especialmente porque o banco é compartilhado.

| Cenário | Resultado esperado | Quando |
| --- | --- | --- |
| Rotas e APIs migradas | Refresh abre a página; API inválida retorna JSON/404; nenhuma chamada à Vercel | Staging Cloudflare publicado |
| Catálogo e carrinho | Variante, quantidade e preços coerentes após refresh | Staging Cloudflare publicado |
| Login e endereço | Acesso válido, redirects Auth corretos e entrega correta na revisão | Staging Cloudflare publicado |
| Admin e processador | Usuário comum/sem sessão recusado; expiração protegida e sem execução duplicada | Técnico, após port |
| Cartão aprovado de teste | Um pedido confirmado após verificação do backend | Sandbox publicado |
| Cartão recusado | Sem confirmação indevida; o checkout hospedado pode permitir nova tentativa | Sandbox publicado |
| Cartão pendente | Página aguarda; sem marcar como pago | Sandbox publicado |
| Pix de teste | Valor correto e confirmação somente quando suportada pelo sandbox e validada pela API | Sandbox publicado |
| Duplo clique/refresh | Mesmo pedido/preferência para a mesma operação, sem segunda reserva | Sandbox acompanhado |
| URL com status=approved | Sem sucesso falso se o pedido não estiver pago no backend | Sandbox acompanhado |
| Usuário diferente | Não consegue consultar o pedido alheio | Técnico |
| Webhook duplicado/fora de ordem | Sem efeito duplicado nem regressão de pedido pago | Técnico |
| Última unidade, duas compras | Não vende mais unidades que o estoque | Técnico |
| Timeout/evento perdido/expiração | Pendente até implementar e validar recuperação segura na Etapa 3 | Ainda bloqueia produção |

Se o sandbox não permitir completar um cenário Pix, registrar **não executado /
limitação do ambiente**. Não trocar para credenciais ou transferência reais para contornar isso.

## 5. Se algo não funcionar

| Sintoma | Conferir primeiro / próxima ação |
| --- | --- |
| URL Cloudflare ainda não publicada | Migração pendente; aguardar deploy e commit confirmados, sem recorrer à Vercel |
| API responde HTML / página perde rota no refresh | Conferir prioridade de `/api/*` e fallback SPA no Worker da loja |
| URL mostra Hello World | Falta publicar o bundle do Worker |
| CONFIGURATION_INVALID | Variáveis vazias, nomes, origem/URL, secrets ou ambiente; pedir revisão técnica |
| Botão Finalizar compra em breve | Flag do frontend ou build/deploy errado; conferir a branch e refazer o build após configurar |
| PAYMENTS_DISABLED | Submissões do Worker estão desligadas; confirmar a etapa antes de habilitar |
| Erro de CORS | Origem exata do preview difere da allowlist ou do retorno configurado |
| Sessão inválida / UNAUTHORIZED | Entrar novamente na loja e conferir o projeto Supabase do preview |
| Pedido não é criado | Conferir endereço, variante, estoque e bindings/rota do Worker da loja |
| Falha na preferência | Conferir recebedor, token de teste, resposta do provedor e gravação da claim; não repetir POST manualmente |
| CHECKOUT_RECONCILIATION_REQUIRED | Há claim pendente; interromper novas tentativas e pedir reconciliação técnica |
| Reserva expirada | Registrar o pedido e solicitar recuperação; a experiência de compra expirada ainda está em acabamento |
| Pagamento ficou aguardando | Conferir webhook/API e financeiro; não forçar status paid no banco |
| Carrinho não foi limpo | Comportamento atual conhecido; limpeza seletiva está no planejamento |

Não limpar sessionStorage, redefinir chaves ou apagar pedidos para tentar
desbloquear uma compra cujo pagamento possa estar em andamento.

## 6. Como me informar o resultado

Copie este modelo para cada cenário; use somente os identificadores necessários:

```text
Data/hora e fuso:
URL do preview e commit:
Celular/computador e navegador:
Cenário testado:
Passos até o problema:
Resultado esperado:
Resultado que apareceu e mensagem exata:
ID do pedido e X-Request-Id, se disponíveis:
Resultado: passou / falhou / bloqueado / não executado
```

Não enviar Access Token, Secret Key, assinatura, senha, sessão/JWT ou exportação
integral da aba Network. Ocultar dados pessoais ao compartilhar imagens.
Os 20 pedidos antigos não devem ser tratados como lixo; manter uma lista dos IDs
criados nesta sessão e fazer limpeza direcionada somente quando autorizada.

## 7. Comandos e referências do responsável técnico

Na raiz do repositório e com as dependências instaladas:

```sh
npm test
npm run worker:test
npm run worker:typecheck
npm run lint
npm run build
npm run worker:build
npm run shop:typecheck
npm run shop:build
npm run shop:test
```

Os comandos abaixo cobrem apenas o Worker de pagamentos, **não** a publicação
do site e das cinco APIs. Comandos locais e configurações do Worker da loja
estão em [workers/storefront/README.md](../workers/storefront/README.md).
`shop:build` é dry-run. Build de publicação: `npm run shop:prepare`; deploy:
`npm run shop:deploy`, somente em Workers Builds na home-v2-contraste.
`npm run shop:deploy -- --check` valida offline, sem publicar. Primeiro publicar
com APIs/pagamentos desligados; conferir health antes de ativar as APIs.

Após a Etapa 0, completar a configuração e ter autorização para o deploy de staging:

```sh
npm run worker:deploy -- staging --check
npm run worker:deploy -- staging
```

A primeira checagem é offline: não autentica serviços nem publica. O segundo
comando publica e exige autenticação segura da Cloudflare. Não executá-lo com
os valores vazios atuais nem contornar o guard com deploy direto.

Referências verificadas para a preparação:

- [Mercado Pago — compras de teste Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases).
- [Mercado Pago — notificações e assinatura](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks).
- [Cloudflare — cadastro de secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
- [Worker: configuração local e staging](../workers/payments/README.md).
