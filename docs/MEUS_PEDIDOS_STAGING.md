# Meus pedidos — staging

Registro da extensão de interface em 27/10/2026. Publicação em staging pendente
da verificação final de CI; este registro não afirma deploy nem identifica build.

## Escopo e comportamento

A rota `/meus-pedidos` permite ao cliente acompanhar suas compras antes de
retomar os testes de pagamento. O acesso aparece no menu da conta autenticada
no desktop e no menu mobile. Sem sessão, a página oferece login com retorno
para a própria rota.

Cada pedido mostra identificação abreviada, data no fuso America/Sao_Paulo,
total, frete, itens, quantidade, variante e preço unitário da compra. Status do
pedido e status financeiro são apresentados separadamente. Pagamento em
processamento continua aguardando confirmação; reserva vencida com pagamento
pendente ou em processamento aparece como “Prazo de pagamento encerrado”.
Esses textos não alteram nem confirmam pagamentos no servidor.

O histórico exibe dez pedidos por página, do mais recente ao mais antigo, com
desempate por ID. A consulta busca um décimo primeiro registro apenas para
habilitar “Próxima”. Há atualização manual e consulta periódica a cada trinta
segundos, além de estados de carregamento, sessão ausente, vazio e erro. O erro
orienta a consultar a confirmação antes de iniciar outro pagamento. Itens cujo
produto saiu do catálogo permanecem legíveis com descrição substituta.

“Consultar pagamento” utiliza a rota autenticada existente
`/checkout/pendente?order=<id>`. A extensão preserva a identidade visual e os
componentes existentes; não estabelece novos tokens ou regras de design.

## Privacidade e autorização

A leitura usa o cliente Supabase existente com chave pública e sessão do
usuário. O filtro explícito `user_id` também limita administradores aos próprios
pedidos nesta tela. A sessão é conferida antes da consulta, a resposta é validada
contra o proprietário esperado e o RLS existente continua sendo a fronteira de
autorização. O filtro da interface não substitui o RLS.

A seleção é explícita e inclui apenas os campos necessários à exibição e à
validação. Endereço de entrega e telefone não são consultados. A chave de cache
inclui usuário e página; a paginação retorna ao início quando a conta muda.

Não há migrations, novas permissões, novo cliente ou segredo, mutações de
pagamento, criação de pedidos, ativação de produção ou ativação de reconciliação
neste escopo.

## Evidências de verificação

Resultados reportados na sessão de implementação:

- Suíte da aplicação: 138 testes aprovados; TypeScript da SPA aprovado; lint
  com zero erros e oito avisos preexistentes.
- Os testes de `customer-orders` cobrem filtro do proprietário, ordenação,
  paginação limitada e sentinela, cancelamento da consulta, mudança de sessão,
  rejeição de resposta de outro cliente, catálogo indisponível e distinção entre
  processamento, expiração e confirmação financeira.
- Navegador com aplicação compilada e fixtures: lista e navegação dos menus em
  1366×900, 390×844 e 807×806; estados vazio e erro em desktop e mobile; ausência
  de erros JavaScript e de overflow horizontal da página nos cenários verificados.
- Consulta real autenticada no Supabase de QA: visibilidade dos próprios pedidos,
  bloqueio por RLS de pedidos alheios e bloqueio de acesso anônimo aprovados.
- Revisão final independente: liberação no escopo restrito, sem problemas
  materiais, com sete capturas de tela conferidas.

Os testes visuais com fixtures não comprovam funcionamento de uma transação no
provedor. O recorte preexistente do formulário de newsletter no rodapé mobile
permanece fora desta extensão. O launcher do Impeccable estava indisponível;
nenhum detector do Impeccable foi executado.

## Publicação e retomada dos testes

Concluir a verificação final de CI antes da publicação em staging. Após publicar,
conferir a rota e a navegação com sessão real no ambiente publicado e verificar
que o histórico e “Consultar pagamento” correspondem à conta autenticada.
Registrar o identificador real da publicação quando disponível.

A aprovação desta tela não comprova pagamento aprovado, webhook entregue ou
reconciliação concluída. A retomada dos testes de pagamento segue os critérios
financeiros existentes; esta implementação não modifica estados de pedidos.

## Referências de implementação

- `src/pages/MyOrders.tsx`: página e estados da interface.
- `src/lib/customer-orders.ts`: consulta limitada e textos financeiros.
- `src/lib/customer-orders.test.ts`: testes de leitura e interpretação de status.
- `src/components/Header.tsx`: acesso desktop e mobile.
- `src/App.tsx`: registro da rota.
