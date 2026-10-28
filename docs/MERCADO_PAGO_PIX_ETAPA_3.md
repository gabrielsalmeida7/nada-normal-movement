# Etapa 3 — Pix no staging

Data: 27/10/2026. Branch: `home-v2-contraste`. Produção e reconciliação inalteradas.

## Procedimento consultado

O MCP confirmou na documentação de Checkout Pro por preferências o teste com
meio offline (Pix/Boleto): iniciar pelo SDK na loja, usando comprador de teste,
gerar instruções e verificar o estado pendente enquanto não houver confirmação.
Resultados de busca sobre /v1/orders e aprovação via payer.first_name=APRO eram
de Checkout API Orders, outro produto; não foram aplicados a esta integração.

Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/integration-test/test-purchases

## Resultado informado e persistido

O usuário informou sucesso no fluxo Pix e a operação `186387901136`.
Auditoria pelo MCP Supabase e pelos logs Cloudflare:

| Campo | Valor |
| --- | --- |
| Pedido | `d0d4c16f-37eb-4c28-9241-452a2e56b7c6` |
| Tentativa | `2bf461b2-9989-48f6-8309-0cb00e9ee7ae` |
| Método escolhido no pedido | `pix` |
| Preferência | `3272217989-528634a5-7528-45fe-ba96-0cd306680ebc` |
| Operação / approved_payment_id | `186387901136` |
| Aplicação / aplicação de teste | `4897243060269064` / `5855568499515388` |
| Valor | R$ 119,00 |
| Status do provedor no ledger | `approved` |
| Pedido / financeiro / tentativa | `paid` / `paid` / `paid` |
| Confirmação no banco | 27/10/2026 às 16:18:52,965651 (Brasília) |
| Versão / pagamentos no ledger / eventos de reserva | 3 / 1 / 1 |
| Reserva / reembolsado | `held` / zero |

Webhook payment/data_id/type concluído com assinatura test_application validada
e HTTP 200 às 16:18:53,067 (Brasília), requestId
`057f9a48-e87d-40bc-93b9-0164c7f79ab1`. Persistência ocorreu antes da resposta.
Não houve simulação, criação de operação ou alteração manual de estado pelo agente.

## Limites da evidência

Há apenas um evento financeiro persistido para esta operação: approved.
O fluxo com confirmação automática está verificado, mas não foi observado um
estado pending intermediário nem seu comportamento visual.

O ledger guarda status, valor e referências; não armazena payment_method_id.
O método pix acima é o escolhido na tentativa do pedido, junto do relato do
usuário. Não afirmar que houve consulta adicional do método diretamente na API.

Na mesma janela, dez outras chamadas sem assinatura válida foram recusadas:
seis legacy_id/topic e quatro data_id/type/merchant_order. O formato e o horário
não comprovam origem ou recurso dessas chamadas; elas não alteraram pagamentos.
Não foi relaxada a autenticação nem alterado notification_url.

## Esclarecimento do redirecionamento

O usuário confirmou que a aprovação ocorreu automaticamente na conta de teste,
sem usar simulação, e forneceu a URL de retorno. Ela contém
payment_type=account_money. Esse parâmetro indica saldo da conta, não comprova
pagamento Pix e não é usado pelo frontend para autorizar a confirmação.
O estado paid continua apoiado na consulta de pagamento feita pelo backend.

Consulta adicional ao MCP encontrou uma restrição explícita do Checkout Pro
por preferências: “O meio de pagamento Dinheiro em conta não pode ser excluído”.
O filtro atual exclui cartões e outros tipos quando o pedido escolhe pix, mas
não obriga o pagamento final via Pix. Não acrescentar account_money às exclusões
como suposta correção nem misturar atributos da API Orders com Preferences.

Fonte: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-settings/payment-methods

Conclusão atual: confirmação automática de pagamento aprovada; cenário Pix
com QR Code e estado pendente ainda não homologado. Antes de repetir uma compra,
confirmar com o usuário se a tela do Mercado Pago ofereceu Pix/QR Code ou apenas
saldo da conta. A disponibilidade de Pix na conta do vendedor de teste ainda
não foi comprovada por este pagamento.

O usuário esclareceu que apenas saldo foi oferecido; não havia opção Pix nem
QR Code. Portanto, não classificar a ausência de pending como aprovação
automática de Pix. A seleção pix no pedido descreve a intenção inicial.

Revisão local: bank_transfer não está excluído na preferência pix; não há
purpose=wallet_purchase nem restrição adicional desse tipo na inicialização do
Wallet. Isso não comprova a disponibilidade de Pix para o vendedor no provedor.
O MCP também retorna documentação de Checkout Pro que exige uma chave Pix
cadastrada para exibir a opção (guias de configuração WooCommerce/PrestaShop).
Não foi encontrada evidência específica que confirme a disponibilidade ou
indisponibilidade geral de Pix para todas as contas de teste deste produto.
Próxima verificação: consultar visualmente a seção Pix/Chaves Pix do vendedor
de teste, sem cadastrar dados reais nem trocar para credenciais de produção.

## Bloqueio observado no painel do vendedor

O usuário abriu a seção Pix/Minhas chaves da conta de teste. A captura mostra
“Não foi possível mostrar suas chaves”; tentar cadastrar outra chave também
falhou, com “Tuvimos un problema. Por favor, vuelve en otro momento.” e referência
`PKF18-N33VQF2NB2MR`. Uma falha de carregamento não comprova ausência de chaves.

Isso comprova um bloqueio de consulta/cadastro no painel dessa conta; não prova
que toda conta de teste proíba Pix nem que o bloqueio seja permanente. A consulta
adicional ao MCP não encontrou uma regra específica para este cenário de
Checkout Pro por preferências. Não usar as instruções da API Orders como
substituto para homologar esta implementação.

Situação da etapa 3: BLOQUEADA na oferta de Pix/geração de QR Code pelo provedor
para essa conta. Confirmação automática com saldo está aprovada separadamente.
Não insistir em compras por saldo, cadastrar CPF/telefone reais no vendedor de
teste ou trocar credenciais para tentar contornar o teste.

### Consulta preparada para o suporte do Mercado Pago (não enviada)

Produto: Checkout Pro por preferências, Brasil, SDK oficial no backend e Wallet
no frontend. Aplicação principal 4897243060269064, aplicação do vendedor de teste
5855568499515388, vendedor 3272217989 e comprador 3272217991.

Na preferência 3272217989-528634a5-7528-45fe-ba96-0cd306680ebc, bank_transfer
não está excluído e purpose=wallet_purchase não foi configurado. O checkout
ofereceu apenas saldo. A operação 186387901136 foi aprovada e retornou
payment_type=account_money; não foi gerado QR Code Pix. Na seção Pix/Minhas
chaves do vendedor de teste, consulta e cadastro falham com as mensagens e
referência acima.

Pergunta: essa conta permite habilitar/testar Pix no Checkout Pro por preferências?
Qual é o procedimento oficial para disponibilizar Pix e testar seu estado
pendente sem dados bancários reais? Se houver restrição específica de sandbox,
como deve ser validado esse cenário para esta aplicação?

Este texto não contém credenciais, assinaturas, cookies ou dados de cartão.
Nenhuma mensagem foi enviada ao suporte pelo agente.
