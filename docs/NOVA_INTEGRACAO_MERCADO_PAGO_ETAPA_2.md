# Nova integração Checkout Pro — etapa 2

Data: 25/10/2026. Branch: `home-v2-contraste`.

## Escopo e status

O usuário aprovou criar uma aplicação nova de Checkout Pro para o NadaNormal e preparar testes. O desenvolvimento acontece no staging; o site de referência é `https://nadanormalclub.com.br`. Produção será uma etapa posterior. Os pedidos existentes são dados de teste e poderão ser apagados depois, conforme orientação do usuário; nenhuma limpeza foi executada nesta etapa.

**Status atualizado: aplicação criada e vínculo das credenciais de teste confirmado pelo MCP após a verificação do painel pelo usuário. Etapa 2 concluída quanto ao cadastro e identificação do ambiente; a integração nova ainda não foi implementada nem homologada.**

## Aplicação criada pelo MCP

| Campo | Valor confirmado |
| --- | --- |
| Nome | NadaNormalCheckoutPro |
| ID | 4897243060269064 |
| Solução | online_payments |
| Produto | checkout_pro |
| Plataforma | self_developed |
| País retornado pela conta OAuth | MLB — Brasil |
| Website enviado | https://nadanormalclub.com.br |

Painel: https://www.mercadopago.com.br/developers/panel/app/4897243060269064

Uma consulta posterior de `application_list` confirmou a nova aplicação e a antiga TesteNN (`6344920694868580`). A aplicação antiga foi preservada.

## Falha inicial na automação de testes — resolvida

O resultado de `create_application` confirmou a criação da aplicação principal, mas retornou:

```text
Test User Automation Failed
Code: MP_API_DOWN
Message: Failure while creating seller app.
```

A própria resposta informou que o fallback não é funcional para testes sandbox reais. A consulta posterior de `get_credentials`, direcionada explicitamente à nova aplicação, retornou credenciais de teste com prefixo TEST, sem confirmar vendedor/aplicação de teste recuperados. Não foram instaladas, exibidas ou gravadas em arquivo. Não deduzir prontidão, país, recebedor ou ambiente pelo prefixo do token; o bloqueio decorre do erro explícito da automação e da ausência de vínculo confirmado.

As credenciais produtivas foram informadas como não ativadas. Elas não foram ativadas nem utilizadas.

Não foi repetida a criação da aplicação. Depois que o usuário apresentou o painel com as credenciais ativadas, uma nova consulta `get_credentials` para a aplicação principal confirmou expressamente:

| Identificador | Valor confirmado pelo MCP e pelo painel |
| --- | --- |
| Aplicação principal | 4897243060269064 |
| Aplicação do vendedor de teste | 5855568499515388 |
| Vendedor de teste | 3272217989 |

A Public Key retornada pelo MCP corresponde à exibida no painel. A resposta identifica as credenciais como fornecidas pelo vendedor de teste automático. Não foi necessário gravar ou exibir o Access Token para conferir esse vínculo. Os números distintos das aplicações principal e de teste são esperados nesse modelo. A existência de credenciais não comprova pagamento, entrega de webhook ou configuração do Worker.

## Comprador de teste

A operação `create_test_user`, com profile buyer, MLB e descrição de staging, devolveu **Test User Already Exists**:

| Campo | Valor confirmado |
| --- | --- |
| ID | 3272217991 |
| País | MLB |
| Perfil | buyer |
| Estado | active |

O MCP recuperou a conta existente; não foi criada uma conta nova. Não houve carregamento adicional de saldo nem transação de pagamento. Dados de login devem ser consultados no painel, não adicionados ao código ou à documentação.

## Correção da base do diagnóstico anterior

O workspace da etapa 1 estava na branch `work`, commit `e37cc7c`, correspondente a uma versão anterior. Após o usuário indicar a branch correta, foi feito fetch e checkout de `home-v2-contraste`, commit `adf740d0a0eb913f8918cb04b10c6d6fdcf3223d`.

Essa branch contém o Worker storefront, a integração com Wallet Brick e as validações de contas de teste observadas no bundle remoto. Portanto, o diagnóstico anterior de ausência desses arquivos/correções se refere à branch antiga, e não demonstra perda de fonte na branch correta. A igualdade completa entre o deployment ativo e essa branch ainda não foi verificada nesta etapa.

Não se deve tratar os 164 testes executados anteriormente como validação desta branch. Nenhuma mudança de implementação foi feita nesta etapa.

## Acoplamentos existentes a substituir depois

- `src/lib/checkout-pro.ts`: Public Key antiga fixa e validação de preferência com prefixo do vendedor antigo.
- `workers/storefront/scripts/staging.mjs`: guard da Public Key antiga.
- `workers/storefront/wrangler.jsonc`: configuração pública da aplicação antiga.
- `workers/payments/src/checkout-pro.ts`: IDs fixos do vendedor/comprador aprovados anteriormente.
- Credenciais e segredo de webhook do Worker ativo: preservar até a troca planejada.

Wallet Brick é uma forma de inicializar o Checkout Pro hospedado, não um formulário de cartão da loja. A escolha entre manter Wallet ou usar redirecionamento documentado será fechada na implementação, com consulta ao MCP e teste de integração.

## SDKs e pergunta do painel

Na branch `home-v2-contraste`, package.json e lockfile incluem `@mercadopago/sdk-react` 1.0.7 e `@mercadopago/sdk-js` 0.0.3. O componente `CheckoutWallet` usa o loader, `initMercadoPago` e `Wallet`. Essas dependências pertencem à implementação anterior; sua existência não conecta automaticamente a aplicação nova.

Na verificação da etapa 2, o backend ainda não tinha o pacote Node `mercadopago`: chamava a API de preferências por fetch no Worker. O botão do painel descreve especificamente instalar/inicializar o SDK de backend, não os SDKs de frontend. Depois da aprovação do usuário, o SDK oficial foi instalado e conectado ao backend local na [etapa 3](NOVA_INTEGRACAO_MERCADO_PAGO_ETAPA_3.md). O staging publicado ainda não recebeu essa alteração.

## Próximo passo

Apresentar para aprovação a etapa 3 de implementação do backend novo de staging, usando os vínculos confirmados. A atualização das credenciais remotas e do webhook será feita somente no passo de configuração/publicação combinado, depois de código e testes revisáveis. A etapa 2 não trocou os secrets da integração anterior.

Na próxima etapa de implementação, manter aplicações/ambientes explícitos, remover o acoplamento às contas antigas e definir a transição dos dados de teste. A irrelevância dos pedidos antigos não autoriza liberar estoque ou apagar registros antes da etapa de limpeza combinada.

## Fontes e verificações

- MCP Mercado Pago: `search_documentation`, `application_list`, `create_application`, `get_credentials`, `create_test_user`.
- Contas de teste: https://www.mercadopago.com/developers/pt/docs/checkout-pro-preferences/test-accounts
- A documentação retornada confirma vendedor de teste automático para Checkout Pro e explica que credenciais de teste podem ter prefixo APP_USR.
- Referências da branch: `docs/WALLET_CHECKOUT_PRO_2026-10-23.md` e `docs/VALIDACAO_MERCADO_PAGO_2026-10-21.md`.
- Não houve deploy, migration, alteração de secrets remotos, mudança em webhook ou limpeza de pedidos.
