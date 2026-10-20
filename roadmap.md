# Nada Normal — planejamento vigente

Atualizado em 20/10/2026. Branch oficial de desenvolvimento: `home-v2-contraste`.

Este documento descreve o estado entregue e as próximas etapas para abrir a loja.
O [roteiro de testes](docs/ROTEIRO_DE_TESTES.md) explica o que executar e observar.
O [plano anterior](docs/history/roadmap-ate-2026-10-19.md) fica preservado como
histórico; não orienta novas implementações de Payment Brick.

## 1. Decisões em vigor

- Desenvolver e validar na `home-v2-contraste`. Branches auxiliares e PRs novos
  devem partir dela e voltar para ela.
- O PR #8 foi integrado nessa branch. O PR #9 propõe `home-v2-contraste → main`;
  seu conflito foi resolvido, mas o merge aguarda a conclusão e o aceite da loja.
- A `main` só será atualizada quando o projeto estiver pronto. Não usar force push
  nem publicar o ambiente de produção como parte dos testes.
- Pagamentos: Mercado Pago **Checkout Pro via Preferences API**, com redirecionamento.
  Payment Brick e Appmax não fazem parte da implementação atual.
- Frontend React/Vite na Vercel; preferências, webhook e consulta de status no
  Cloudflare Worker; autenticação, catálogo, pedidos e estoque no Supabase.
- O Supabase atual é compartilhado com os testes por decisão do usuário.
  Identificar os pedidos criados em cada sessão e preservar os dados existentes.

## 2. Estado confirmado

| Área | Entregue | Ainda falta |
| --- | --- | --- |
| Loja | Catálogo, variantes, carrinho, login, perfil, endereços e checkout em etapas | Validação completa no preview, principalmente no celular |
| Pedidos | Cálculo autoritativo, criação transacional, idempotência e reserva | Recuperação de compras expiradas/repetidas e teste online de concorrência |
| Checkout Pro | Código de preferência persistida, redirecionamento sandbox e retorno autenticado | Publicar/configurar o Worker e testar com o Mercado Pago |
| Confirmação | Código de HMAC, consulta da API e gravação financeira deduplicada | Validar webhook real de teste e automatizar reconciliação |
| Supabase | Três migrations aplicadas em 19/10/2026, com RLS e acesso financeiro do backend | Revisão dos alertas anteriores e reconciliação do histórico antes de usar db push |
| GitHub | Código e documentação integrados na home-v2-contraste | Manter a main aguardando o aceite final |
| Produção | Cobrança desativada por padrão e bloqueada fora de staging no código atual | Implementar ambiente produtivo e validar compra real controlada |

Evidências registradas na entrega de 19/10: 86 testes do app e 78 do Worker,
TypeScript, builds e testes SQL passaram. Lint sem erros, com oito avisos
preexistentes. Isso não substitui um teste online ponta a ponta.

As migrations preservaram 20 pedidos, 21 itens e os estoques existentes. Esses
números são o retrato da verificação, não uma lista de registros a apagar.
Mapeamento dos arquivos e versões remotas em [supabase/README.md](supabase/README.md).
Não reaplicar migrations, seeds ou bootstrap no projeto compartilhado.

Último estado confirmado do ambiente remoto: secrets cadastrados e domínio do
Worker associado; publicação do código novo e compras de teste ainda não foram
validadas nesta entrega. A URL Vercel informada anteriormente pode apontar a um
deploy antigo: selecionar sempre o preview da branch oficial e do commit correto.

## 3. Fluxo implementado e responsabilidades

1. O comprador entra na loja e seleciona itens e endereço.
2. O frontend usa a Vercel Function de pedido; o Supabase recompõe valores e
   reserva estoque. O cliente confere o total retornado pelo servidor.
3. O Worker recebe somente o ID do pedido e a sessão autenticada. Confere dono
   e reserva, faz uma claim durável e cria a preferência no Mercado Pago.
4. O comprador paga no checkout hospedado do Mercado Pago e retorna à loja.
5. O webhook assinado leva o Worker a consultar o pagamento na API. O banco
   verifica vínculo/valor e atualiza o pedido na mesma transação do evento.
6. A página de retorno consulta o estado autenticado; parâmetros da URL não
   comprovam aprovação.

| Endpoint | Onde roda | Estado atual |
| --- | --- | --- |
| POST /api/checkout/quote | Vercel | Orçamento já implementado; não é a etapa de criação da preferência |
| POST /api/checkout/order | Vercel | Criação/replay transacional usada pelo frontend |
| POST /api/checkout/cancel | Vercel | Cancelamento de reserva ainda não submetida |
| GET /health | Worker | Verifica configuração local, sem testar credenciais externas |
| POST /v1/checkout/preferences | Worker | Implementado, depende de configuração e ativação do staging |
| GET /v1/checkout/orders/:id/status | Worker | Implementado, autenticado e restrito ao dono |
| POST /webhooks/mercadopago | Worker | Implementado para notificações de pagamento de teste |
| Quote/orders/payments antigos no Worker | Worker | Stubs; não usar no lugar das rotas acima |
| Reconciliação agendada | A definir/implementar | Pendente |

A Public Key Mercado Pago não é usada no redirecionamento direto atual.
Os três secrets ficam no Worker, nunca no frontend. Detalhes no
[ADR 002](docs/adr/002-checkout-pro.md).

## 4. Etapas para concluir a loja

### Etapa 1 — preparar e publicar o ambiente de testes

**Estado: etapa atual; publicação pendente.**

Responsável técnico/Codex:

- Confirmar o preview Vercel da home-v2-contraste e a origem exata para o CORS.
- Preencher as variáveis públicas vazias no wrangler de staging, conferir os
  secrets remotos e confirmar o recebedor do token de teste pela API.
- Configurar Checkout Pro sandbox, retorno e webhook da aplicação correta.
- Publicar primeiro com PAYMENTS_ENABLED=false; validar health, preflight,
  recusa de origem desconhecida e acesso autenticado ao status.
- Preparar variáveis do frontend apenas no preview da branch oficial.

Usuário:

- Confirmar a aplicação e as credenciais de teste nos painéis, sem colar secrets.
- Abrir o preview informado e seguir o roteiro de catálogo, login e checkout.

Aceite: código correto publicado, health/CORS válidos, credenciais e ambiente
identificados; pagamentos reais continuam bloqueados.

### Etapa 2 — validar a compra de teste ponta a ponta

**Estado: código pronto para iniciar a validação após a Etapa 1.**

- Ativar apenas o sandbox; testar cartão aprovado, recusado e pendente, além
  de Pix quando o ambiente de teste suportar a simulação.
- Conferir valor total, pedido, evento de webhook, tentativa e estoque.
- Exercitar duplo clique, refresh e retorno à loja sem confirmação.
- Validar identidade do dono e comportamento do painel administrativo.
- Registrar falhas e corrigir; não marcar cenários não executados como aprovados.

Aceite: um fluxo verificável preview → pedido → preferência → Mercado Pago →
webhook → Supabase → retorno. Recusa/pendência não podem aparecer como pagamento
confirmado nem gerar liberação indevida de estoque.

### Etapa 3 — completar recuperação e automatismos

**Estado: implementação pendente antes de produção.**

- Automatizar a consulta de pagamentos quando houver webhook perdido/atrasado.
- Tratar claims interrompidas, preferências com resultado desconhecido e expiração
  sem repetir cegamente a criação do checkout.
- Implementar confirmação definitiva da reserva e liberação segura de reservas
  vencidas/submetidas; hoje as confirmadas continuam held, protegidas pelo financeiro.
- Completar limpeza seletiva do carrinho, compra repetida/expirada e mensagens.
- Tratar revisão de segunda aprovação, outbox, retentativas e alertas operacionais.
- Aplicar controles de abuso e testar última unidade com compras concorrentes.

Aceite: interrupções recuperáveis, sem cobrança duplicada, overselling ou estoque
preso sem identificação/encaminhamento. Reprocessamento e rollback ensaiados.

### Etapa 4 — revisar loja e operação

**Estado: validação e possíveis ajustes pendentes.**

- Validar celular, acessibilidade, cadastro, recuperação de senha e endereço.
- Aprovar catálogo, preços, variantes, fotos e estoque inicial.
- Confirmar regra comercial de frete, prazo de reserva, parcelamento e meios de pagamento.
- Validar painel de pedidos, separação/envio, suporte, troca, devolução e estorno.
- Definir e verificar comunicação de pedido; não prometer e-mails automáticos
  sem comprovar que o envio correspondente está implementado.
- Revisar os alertas preexistentes de segurança e as permissões antes da abertura.

Aceite: usuário consegue comprar e operar um pedido; regras comerciais e textos
aprovados, defeitos bloqueadores resolvidos e riscos restantes registrados.

### Etapa 5 — preparar produção e lançar

**Estado: ainda não autorizada para execução.**

- Implementar configuração/validação de produção: o parser atual bloqueia a ativação.
- Usar credenciais e webhook de produção separados, com cobrança inicialmente desligada.
- Configurar monitoramento, alertas, procedimentos de estorno e rollback.
- Com aprovação específica, fazer compra real controlada e verificar o estorno.
- Após aceite, integrar a branch oficial à main e fazer o rollout planejado.
  Se necessário, atualizar o PR #9 ou abrir um substituto com o estado final.

Aceite: fluxo real e recuperação comprovados, atendimento definido, observabilidade
ativa e decisão explícita de abertura. Teste sandbox ou build verde não basta.

## 5. Pendências conhecidas que não devem ser confundidas com falhas novas

- Botão indisponível sem flag explícita do frontend é o comportamento esperado.
- Valores vazios no arquivo de configuração ainda bloqueiam o deploy; cadastrar
  dados no painel não preenche o arquivo automaticamente.
- Health 200 não verifica autorização funcional do Supabase/Mercado Pago.
- O carrinho ainda permanece após o pagamento; limpeza seletiva é backlog.
- Recusa de um pagamento no checkout hospedado não encerra automaticamente o pedido.
- Não há reconciliação automática nem liberação por tempo de tentativas já submetidas.
- A tela administrativa atual exibe principalmente o status do pedido; detalhe
  financeiro e trilha de webhook devem ser conferidos pelo responsável técnico.
- Alertas antigos do Supabase não foram corrigidos como efeito das migrations.

## 6. Regra de pronto e próxima ação

Uma etapa só fica concluída quando há evidência do resultado, ambiente, commit,
ID do pedido quando aplicável e avaliação do usuário. Registrar os testes no
[roteiro](docs/ROTEIRO_DE_TESTES.md), sem credenciais ou dados pessoais completos.

**Próxima ação técnica:** concluir a configuração e publicar o Worker de staging,
inicialmente sem submissões. **Próxima ação do usuário:** selecionar o preview da
home-v2-contraste e executar os testes de loja que não dependem de pagamento.

Consultar também:

- [Roteiro de testes e diagnóstico](docs/ROTEIRO_DE_TESTES.md).
- [Configuração e comandos do Worker](workers/payments/README.md).
- [Estado e histórico do Supabase](supabase/README.md).
- [Decisão técnica Checkout Pro](docs/adr/002-checkout-pro.md).
- [Histórico de planejamento](docs/history/roadmap-ate-2026-10-19.md).
