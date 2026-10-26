# Nova integração Checkout Pro — frontend local

Data: 26/10/2026. Branch: `home-v2-contraste`.

## Entrega

Frontend preparado para NadaNormalCheckoutPro (`4897243060269064`) e sua
aplicação de teste (`5855568499515388`). Public Key do painel conferida novamente
pelo MCP e atualizada nos guards do SPA e do build de staging. Access Token e
segredo de assinatura continuam exclusivos do backend.

Não houve deploy, alteração de credenciais remotas, aplicação de migration,
preferência real ou pagamento. Novas compras ficam desativadas na configuração
versionada do frontend e do backend. Produção será uma etapa posterior.

## Integração e retomada

- Manter SDKs oficiais React/JS e Wallet Brick com preferenceId e redirectMode=self,
  conforme documentação consultada pelo MCP. Não há fallback por checkoutUrl.
- O browser exige a aplicação principal, aplicação de teste e pedido esperados
  na resposta do backend, além do ID de preferência. O backend acrescenta esses
  campos depois de verificar a preferência. Resposta da integração antiga não
  é aceita com a chave nova.
- Rascunhos em sessionStorage são separados por aplicação/usuário, sem tokens
  ou cartão. Guardam chave estável, assinatura dos itens e pedido sanitizado.
- Resposta perdida reutiliza a chave. Pedido salvo é consultado antes do replay;
  valores vêm novamente do servidor. Pedido expirado em processamento permanece
  bloqueado, com ação para consulta. Para o mesmo carrinho, uma chave nova só é
  gerada automaticamente após cancelamento/falha com reserva liberada no servidor.
- A página do pedido permite retomar explicitamente o mesmo pagamento quando
  há rascunho válido, prazo vigente e estado confirmado pendente/em processamento.
  A ação pede a preferência do pedido existente, sem criar outro pedido.
- Sem rascunho, o status continua disponível, mas não se monta Wallet somente
  a partir da URL. O backend verifica dono, prazo e estado financeiro.
- Erros de rede, falhas do SDK e expiração preservam o carrinho. O pedido
  conhecido tem link de consulta. Mudanças nas entradas invalidam o estado local
  do pagamento e respostas assíncronas antigas não devem montar o Wallet.
- Sessão autenticada é conferida antes de enviar pedido/preferência. JWT só é
  enviado para a origem fixa da API; dados do SDK não são impressos em erros.

## Confirmação e carrinho

Status pode ser consultado com novas compras desativadas. A resposta deve conter
o mesmo orderId. Query strings e callbacks do SDK não confirmam pagamento.

Somente o status autenticado paid consome o rascunho do usuário/pedido. O carrinho
é limpo se ainda corresponder exatamente aos itens originais. Se mudou, todos
os itens atuais são preservados. O rascunho é consumido uma vez, evitando limpar
uma compra posterior. Dados de outra conta/pedido/aplicação não autorizam limpeza.

## Verificação

- 124 testes de aplicação, 227 de pagamentos e 60 da loja aprovados.
- TypeScript do SPA e Workers aprovado; lint sem erros e oito avisos preexistentes.
- Build preparado de staging e bundle dry-run da loja aprovados, sem deploy.
- Chromium verificou confirmação e erro de consulta no build real em 1366x900
  e 390x844. Nenhum erro de JavaScript nesses cenários; controles do conteúdo
  de retorno acessíveis nas duas larguras.
- Autenticação/status simulados no browser, com restante do tráfego externo
  bloqueado. O Wallet real e a compra no provedor ainda exigem homologação remota.

Testes cobrem resposta perdida, replay estável, pedido expirado, cancelamento com
liberação, troca de autenticação, armazenamento indisponível, resposta de outra
aplicação/pedido, retomada e preservação/limpeza segura do carrinho.

## Próximo passo

Publicar o backend antes do frontend: este contrato exige o backend novo.
Antes disso, aplicar a migration de reconciliação e configurar os secrets da
nova aplicação. Manter novas compras desativadas até verificar as duas pontas.
Cron e compras só serão ativados no passo explícito de homologação aprovado.

Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/web-integration/add-frontend-sdk
