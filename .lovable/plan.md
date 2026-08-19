# Tirar Coming Soon e marcar a loja como "EM BREVE!"

## 1. Coming Soon fora do ar

- A rota `/` passa a mostrar a Home (`Index`).
- A rota `/coming-soon` é removida das rotas, mas o arquivo `src/pages/ComingSoon.tsx` continua no código para reativação futura.
- Nenhum link do site aponta mais para a página.

## 2. Carimbo "EM BREVE!"

Novo componente `ComingSoonStamp`, feito em CSS puro (sem imagem): faixa diagonal com rotação de -20°, fundo em rosa da marca (#fe1089), texto "EM BREVE!" em Bowlby One SC/Permanent Marker branco, sombra e leve borda. Duas variações de tamanho (card grande e card de produto).

## 3. Onde a loja fica desativada

**Cards de categoria (Home)**
- Running e Street continuam com imagem, nome e descrição.
- Deixam de ser links; ganham o carimbo diagonal por cima, o "Explorar" some e o cursor deixa de indicar clique.

**Produtos em destaque e páginas de categoria**
- Cards de produto continuam visíveis com foto, nome, preço e detalhes.
- Botões de compra/adicionar ao carrinho e seleção de tamanho ficam desativados; carimbo aplicado sobre a imagem.
- Botão "Ver Todos" desativado.

**Header e Footer**
- Nomes das categorias (Running, Street, Acessórios, Suplementação) permanecem, mas sem navegação: viram texto com aparência de item desativado e uma pequena etiqueta "em breve".
- Ícone do carrinho sai do Header.

**Carrinho e checkout**
- Rotas `/carrinho`, `/checkout` e as de retorno de pagamento são removidas do roteador; qualquer acesso cai no redirecionamento para a Home.

As páginas `/running` e `/street` continuam acessíveis por URL direta, mas sem compra ativa — se preferir bloquear também, é só dizer.

## Detalhes técnicos

- `src/App.tsx`: `/` → `Index`; remover rotas de coming-soon, carrinho e checkout (arquivos mantidos no projeto).
- Novo `src/components/ComingSoonStamp.tsx` usando tokens do design system (`nn-pink`, `font-display`), com prop `size`.
- `src/components/CategorySection.tsx`: trocar `Link` por `div`, adicionar o carimbo.
- `src/components/ProductCard.tsx` e `src/components/ProductsSection.tsx`: carimbo + ações desabilitadas.
- `src/components/Header.tsx` / `src/components/Footer.tsx`: itens de loja como `span` desativado, remover ícone do carrinho.
- Nenhuma mudança de banco de dados; a lógica de carrinho/checkout permanece no código, apenas sem rota.
