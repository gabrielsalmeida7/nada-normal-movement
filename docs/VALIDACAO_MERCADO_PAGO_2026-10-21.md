# Etapa 1, parte 1 — Mercado Pago

Verificação de 21/10/2026. Somente leitura/diagnóstico: sem preferência,
pagamento, deploy, redefinição de secret ou alteração de webhook.

## Confirmado pelo MCP

- Conexão operacional: `application_list` retornou uma aplicação, TesteNN.
- Aplicação principal: `6344920694868580`.
- `get_credentials` para essa aplicação identificou as credenciais sandbox como
  geradas automaticamente para vendedor `3272217989`, aplicação de teste
  `760330644412079`.
- Portanto, esses IDs distintos possuem vínculo informado explicitamente pelo
  provedor. Não foi inferido vínculo a partir de um token.
- A documentação atual de Checkout Pro confirma vendedor de teste automático
  e credenciais de teste com prefixo APP_USR. Esse prefixo sozinho não comprova
  produção ou teste e não deve ser alterado por suposição.
- Credenciais de produção foram informadas como ainda não ativadas pelo MCP;
  não foram ativadas ou utilizadas nesta verificação.

## Consulta HTTP e limite da evidência

A credencial **sandbox** retornada pelo MCP foi passada somente em memória, por
entrada padrão de processo com eco desativado, para uma consulta autenticada
GET `https://api.mercadopago.com/users/me`. Não foi enviada como query string,
argumento de shell, gravada em arquivo, Git ou exibida no chat.

Resultado HTTP: **403**, sem corpo JSON ou identidade do recebedor. Uma tentativa
anterior não conseguiu interpretar o corpo como JSON. A causa do 403 não foi
estabelecida; controles sem autenticação também retornaram 403. O ambiente cloud
relatou conectividade ativa e política de rede unrestricted/enforced.
Não contornar proxy/políticas de rede nem concluir que o token está incorreto.

Além disso, secrets da Cloudflare não são recuperáveis em texto claro por essa
checagem. A presença de `MP_ACCESS_TOKEN` no Worker não prova igualdade ao token
retornado pelo MCP. É necessário validar a credencial efetivamente instalada a
partir do runtime de destino, mantendo submissões de pagamentos desligadas.

## Cloudflare

GET settings de `nada-normal-payments-staging` confirmou presença de:

- MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET como secret_text.
- SUPABASE_SECRET_KEY como secret_text.
- SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY como plain_text.

Não havia APP_ENV, PAYMENTS_ENABLED, MP_COLLECTOR_ID ou CHECKOUT_PRO_MODE entre
os bindings retornados. O novo código/configuração de pagamentos segue pendente
de publicação; não tratar presença de secrets como aceite de integração.
Nenhum secret remoto foi lido em texto claro, substituído ou rotacionado.

## Critério para concluir a parte 1

Confirmar por uma consulta autenticada efetiva o vendedor de teste esperado
`3272217989`, país Brasil/MLB e identificação de conta de teste, usando o token
instalado no Worker. Caso o retorno não corresponda, interromper antes de criar
preferências ou substituir qualquer credencial e revisar a aplicação no painel.

A preparação de verificação controlada no Worker é o próximo passo proposto,
não uma ação já executada. Não publicar endpoint público de diagnóstico com
tokens, dados pessoais ou capacidade de pagamento. A assinatura de webhook
será verificada na configuração/teste posteriores; não foi validada nesta parte.

## Referências

- [Contas de teste Checkout Pro](https://www.mercadopago.com/developers/pt/docs/checkout-pro-preferences/test-accounts).
- [Roadmap](../roadmap.md).
