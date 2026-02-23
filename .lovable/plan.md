

# Criar Paginas de Categoria: Running, Street e Social

## Resumo
Criar 3 novas paginas dedicadas para as categorias de roupas (Running, Street e Social), cada uma com um catalogo de produtos detalhado seguindo o estilo visual da pagina Home. As paginas terao mais informacoes sobre cada produto (tamanhos, descricao, materiais) comparado a secao "Produtos em Destaque".

## Estrutura das Paginas

Cada pagina de categoria tera:
1. **Header** - reutilizando o componente existente
2. **Banner da categoria** - imagem hero com titulo e descricao da categoria
3. **Grid de produtos** - cards detalhados com informacoes completas
4. **Footer** - reutilizando o componente existente

## Produtos por Categoria

### Running
- Camiseta Caos (R$ 189,90) - Dry-fit, leve, costuras seladas
- Regata Performance (R$ 149,90) - Ultra leve, ventilacao maxima
- Meia Compressao NN (R$ 89,90) - Compressao graduada, anti-bolhas
- Short Obsessao (R$ 159,90) - Bolso para celular, tecido stretch
- Jaqueta Corta-Vento (R$ 349,90) - Impermeavel, refletiva
- Bone UV Shield (R$ 79,90) - Protecao UV50+, tecido respiravel

### Street
- Jaqueta Obsessao (R$ 449,90) - Oversized, bolsos ocultos
- Moletom Caos Urbano (R$ 289,90) - Algodao premium, capuz ajustavel
- Calca Cargo NN (R$ 259,90) - Bolsos utilitarios, barra ajustavel
- Camiseta Oversized Manifesto (R$ 169,90) - Estampa exclusiva, corte largo
- Bucket Hat Nada Normal (R$ 99,90) - Dupla face, bordado
- Pochete Tatica NN (R$ 129,90) - Ziper refletivo, alca ajustavel

### Social
- Polo Premium NN (R$ 199,90) - Pique algodao, bordado discreto
- Camiseta Social Caos (R$ 159,90) - Corte slim, tecido macio
- Bermuda Resenha (R$ 179,90) - Tecido confortavel, bolsos laterais
- Chinelo Slide NN (R$ 119,90) - Solado ergonomico, logo em relevo
- Ecobag Nada Normal (R$ 49,90) - 100% algodao organico
- Bone Dad Hat NN (R$ 89,90) - Aba curva, fecho regulavel

## Detalhes Tecnicos

### Arquivos a criar
1. **`src/pages/CategoryRunning.tsx`** - Pagina da categoria Running
2. **`src/pages/CategoryStreet.tsx`** - Pagina da categoria Street
3. **`src/pages/CategorySocial.tsx`** - Pagina da categoria Social
4. **`src/components/ProductCard.tsx`** - Componente reutilizavel de card de produto com detalhes expandidos

### Alteracoes em arquivos existentes
1. **`src/App.tsx`** - Adicionar rotas `/running`, `/street`, `/social`
2. **`src/components/Header.tsx`** - Atualizar links de navegacao para apontar para as novas rotas
3. **`src/components/CategorySection.tsx`** - Atualizar links dos cards para navegar para as paginas
4. **`src/components/Footer.tsx`** - Atualizar links da loja para as novas rotas

### Componente ProductCard
Cada card de produto tera:
- Imagem com borda organica (estilo blob assimetrico)
- Tag de destaque (Novo, Bestseller, Limitado) quando aplicavel
- Nome do produto
- Preco
- Descricao curta do material/beneficio
- Tamanhos disponiveis (PP, P, M, G, GG)
- Botoes de acao no hover (Comprar, Favoritar, Ver Detalhes)
- Cores disponiveis (circulos coloridos)

### Estilo Visual
- Seguira o design system existente (cores neon, formas organicas, fonte Permanent Marker/Bebas Neue)
- Banner hero de cada categoria com a cor tematica: Running = laranja, Street = lime, Social = amarelo
- Animacoes com framer-motion (fade-in, hover scale, floating elements)
- Cards com `border-4`, sombras neon e formas organicas assimetricas
- Imagens de produto reutilizarao os assets existentes (`product-tshirt.jpg`, `product-socks.jpg`, `product-jacket.jpg`, `product-tank.jpg`) e placeholder para os novos

