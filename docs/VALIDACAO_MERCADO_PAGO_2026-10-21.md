# Etapa 1, parte 1 — Mercado Pago

Verificação de 21/10/2026 concluída. Sem preferência, pagamento, redefinição de
secret ou alteração de webhook. Houve ativação temporária de versão diagnóstica
no Worker de staging, seguida da restauração imediata da versão anterior.

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
retornado pelo MCP. Essa pendência foi resolvida pela consulta no runtime de
destino descrita abaixo, mantendo submissões de pagamentos desligadas.

## Cloudflare

GET settings de `nada-normal-payments-staging` confirmou presença de:

- MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET como secret_text.
- SUPABASE_SECRET_KEY como secret_text.
- SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY como plain_text.

Antes do diagnóstico, não havia APP_ENV, PAYMENTS_ENABLED, MP_COLLECTOR_ID ou CHECKOUT_PRO_MODE entre
os bindings retornados. O novo código/configuração de pagamentos segue pendente
de publicação; não tratar presença de secrets como aceite de integração.
Nenhum secret remoto foi lido em texto claro, substituído ou rotacionado.

## Double check na Cloudflare — aprovado

Com autorização do usuário, foi preparada uma versão operacional temporária
usando o token já instalado no Worker, sem copiá-lo/baixá-lo ou substituí-lo.
Os cinco bindings originais foram herdados pela API de versões, com APP_ENV=staging
e PAYMENTS_ENABLED=false na versão temporária. Não é publicação da integração
Checkout Pro nem substitui o deploy protegido do código normal de pagamentos.

Controles: host fixo, rota POST única, sem CORS/navegação, desafio de 256 bits
com comparação de hash em tempo constante, validade de oito minutos (limite
máximo de dez), timeout de dez segundos, corpo upstream limitado a 64 KiB,
redirecionamentos recusados e ausência de logs da aplicação. Nenhuma chamada
ao Supabase, criação de preferência ou submissão de pagamento faz parte do código.
Só existe GET fixo `https://api.mercadopago.com/users/me` após autenticação.

Resultado observado:

```json
{
  "anonymousStatus": 401,
  "probeStatus": 200,
  "cache": "private, no-store",
  "result": {
    "verified": true,
    "collectorMatches": true,
    "countryMatches": true,
    "testUser": true,
    "upstreamStatus": 200,
    "paymentsEnabled": false
  }
}
```

Os booleanos verificam, respectivamente, usuário **3272217989**, site **MLB** e
tag/tipo **test_user** da resposta do provedor. Nome, e-mail, token e JSON
upstream não foram retornados ou gravados no repositório. Portanto o valor
`MP_COLLECTOR_ID=3272217989` está confirmado para a próxima configuração de staging.
A causa do 403 neste executor não foi estabelecida; não implica token inválido.

Trilha operacional:

- Versão anterior: `ed97243c-3c59-4e23-bf7f-75b38a277513` (Hello World).
- Versão diagnóstica: `26b0b315-ca7f-4144-b7b1-ed7ff0d45e14`.
- Deployment temporário: `4ddbd2fe-9703-4037-afe3-04718f847140`.
- Deployment de restauração: `9ee317ec-ae8e-4405-985a-a45e8a45cf70`.
- GET deployments confirmou versão anterior servindo 100% do tráfego.
- GET `/health` e POST `/__ops/verify-collector` retornaram novamente o Hello World
  anterior, sem handler de diagnóstico ativo. Isso é restauração do exemplo,
  não health funcional do Checkout Pro.

A versão temporária permanece no histórico, mas não está no tráfego e seu
desafio expira. GET settings pode refletir o upload mais recente em vez da versão
implantada: APP_ENV/PAYMENTS_ENABLED e data da versão temporária podem aparecer
ali. Conferir sempre o deployment ativo, não apenas settings/último upload.
Não reutilizar/implantar a versão diagnóstica como backend de pagamentos.

Código operacional isolado em
[collector-probe.mjs](../workers/payments/diagnostics/collector-probe.mjs), não
importado pelo entrypoint e não executado pelo CI. Dezesseis testes em workerd
cobrem autorização, bloqueio de produção/submissões, destino fixo, redirecionamentos,
respostas sanitizadas e recusa de recebedor/país/conta incorretos. Os outros 79
testes de pagamentos também passaram, além de typecheck e lint sem erros
(oito avisos preexistentes). Nenhum secret foi alterado ou recuperado em texto claro.

Parte 1 concluída. Próxima: preencher configuração do Worker de pagamentos e
publicar o código normal com PAYMENTS_ENABLED=false, preservando os secrets.
A assinatura de webhook será conferida/testada depois; não foi validada aqui.

## Referências

- [Contas de teste Checkout Pro](https://www.mercadopago.com/developers/pt/docs/checkout-pro-preferences/test-accounts).
- [Roadmap](../roadmap.md).
