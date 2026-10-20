# Passo 5 – Carrinho: desenho da estrutura

Documento de design antes da implementação. Define tipos, store, fluxos e componentes.

---

## 1. Estrutura de um item no carrinho (`CartItem`)

Cada item representa **uma linha** no carrinho: produto + variante (tamanho/cor) + quantidade.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `productId` | `string` | sim | UUID do produto (Supabase `products.id`). |
| `productVariantId` | `string` | não | UUID da variante (Supabase `product_variants.id`). Obrigatório quando o produto tem variantes (tamanho/cor). |
| `quantity` | `number` | sim | Quantidade (≥ 1). |
| `name` | `string` | sim | Nome do produto (para exibição, evita query extra). |
| `price` | `number` | sim | Preço unitário em reais (ex.: 189.90). |
| `image` | `string` | sim | URL da imagem (Storage ou placeholder). |
| `slug` | `string` | não | Slug do produto (para link futuro `/produto/:slug`). |
| `size` | `string` | não | Tamanho escolhido (ex.: "M", "38-40", "Único"). |
| `colorName` | `string` | não | Nome da cor (ex.: "Preto Obsessão"). |
| `colorHex` | `string` | não | Hex da cor (ex.: "#0d0d0d") — útil para mostrar bolinha no carrinho. |

**Exemplo:**
```ts
{
  productId: "a1000001-0000-4000-8000-000000000001",
  productVariantId: "uuid-da-variante-m",
  quantity: 2,
  name: "Camiseta Caos",
  price: 189.90,
  image: "https://xxx.supabase.co/storage/v1/object/public/products/camiseta-caos.jpg",
  slug: "camiseta-caos",
  size: "M",
  colorName: "Preto Obsessão",
  colorHex: "#0d0d0d"
}
```

**Regra de “mesmo item”:** Dois itens são considerados iguais quando `productId` + `productVariantId` (ou `productId` + `size` + `colorName` se não houver variantId) coincidem. Ao adicionar um item “igual”, incrementamos `quantity` em vez de criar nova linha.

---

## 2. Store Zustand – estado e ações

### Estado

```ts
interface CartState {
  items: CartItem[];
}
```

### Ações

| Ação | Parâmetros | Comportamento |
|------|-----------|---------------|
| `addItem` | `(item: Omit<CartItem, 'quantity'> & { quantity?: number })` | Se já existe item com mesmo productId + productVariantId (ou size+color), soma em `quantity`. Senão, adiciona nova linha (quantity padrão 1). |
| `updateQuantity` | `(productId: string, productVariantId: string | null, quantity: number)` | Atualiza a quantidade do item. Se quantity ≤ 0, remove o item. |
| `removeItem` | `(productId: string, productVariantId?: string | null)` | Remove a linha do carrinho. |
| `clearCart` | `()` | Remove todos os itens. |

### Derivados (getters)

| Nome | Retorno | Uso |
|------|---------|-----|
| `totalItems` | `number` | Soma de `item.quantity` para todos os itens. Usado no contador do Header. |
| `subtotal` | `number` | Soma de `item.price * item.quantity` para todos os itens. |
| `itemCount` | `number` | `items.length` (número de linhas, não de unidades). |

### Persistência

- **localStorage** com key `nn-cart`.
- Zustand `persist` middleware: serializa `items` em JSON e restaura ao carregar a página.
- Não persistir dados sensíveis; apenas `items` (ids, nomes, preços, quantidades).

---

## 3. Fluxo “Adicionar ao carrinho”

### Onde o botão aparece

1. **ProductCard** (listagem e home): hoje tem ícone de sacola no hover. Esse ícone passa a chamar “Adicionar ao carrinho”.
2. **Página de produto** (futura): botão “Adicionar ao carrinho” após escolher tamanho e cor.

### Problema: ProductCard não tem seleção de tamanho/cor

- Na **listagem**, o card mostra tamanhos e cores, mas o usuário não “seleciona” antes de clicar.
- **Opção A:** Ao clicar em “Adicionar” no card, usar a **primeira variante disponível** (ex.: primeiro tamanho + primeira cor). Simples, mas pode não ser o que o usuário quer.
- **Opção B:** Ao clicar, abrir um **modal/drawer** “Escolha tamanho e cor” e só então adicionar. Melhor UX, mais trabalho.
- **Opção C:** Adicionar com **variante “padrão”** (ex.: primeiro tamanho, primeira cor) e permitir alterar na página do carrinho. Intermediário.

**Recomendação para MVP:** **Opção C** — adicionar com primeira variante; na página do carrinho o usuário pode editar quantidade e, no futuro, trocar tamanho/cor (ou remover e adicionar de novo na página do produto).

### Dados necessários para `addItem` a partir do ProductCard

O `ProductCard` recebe um `Product` (do Supabase). Para montar o `CartItem`:

- `productId` → `product.id` (string)
- `productVariantId` → da primeira variante (precisamos buscar ou derivar). O `Product` atual tem `sizes` e `colors` agregados, mas não os IDs das variantes.
- `name`, `price`, `image`, `slug` → vêm do `Product`
- `size`, `colorName`, `colorHex` → da “primeira” opção: `sizes[0]`, `colors[0]`

**Problema:** O `Product` mapeado do Supabase não inclui `product_variants[].id`. Para `updateQuantity` e `removeItem` precisamos de um identificador estável da linha.

**Solução:** Usar uma **chave composta** `productId + size + colorName` como identificador da linha no carrinho, em vez de `productVariantId`. Assim não precisamos do ID da variante no ProductCard. O store usa essa chave para:
- Identificar “mesmo item” ao adicionar
- Atualizar quantidade
- Remover item

Então o `CartItem` pode ter `productVariantId` opcional; a chave de unicidade será `productId + size + colorName` (ou `productId` quando não houver variantes, ex.: `size: "Único"`, `colorName: null`).

---

## 4. Estrutura da página `/carrinho`

### Layout geral

```
[Header]
[Main]
  - Título: "Carrinho" ou "Seu carrinho"
  - Se vazio: mensagem + link para catálogo
  - Se com itens:
      - Lista de itens (cards ou tabela)
      - Cada item: imagem | nome + variante | preço unit. | qtd (input ou +/-) | subtotal | remover
      - Subtotal geral
      - Botão "Continuar para o checkout"
[Footer]
```

### Componentes sugeridos

| Componente | Responsabilidade |
|------------|------------------|
| `CartPage` | Página principal; lê o store; decide vazio vs. com itens; orquestra layout. |
| `CartItemRow` | Uma linha do carrinho: exibe dados do item, input de quantidade, botão remover. |
| `CartSummary` | Bloco com subtotal e botão "Continuar para o checkout". |
| `CartEmpty` | Estado vazio: ilustração ou ícone + texto + link para categorias. |

### Comportamento do input de quantidade

- Input numérico com mínimo 1.
- Ao mudar para 0 (ou menos), remover o item.
- Botões +/- opcionais para melhorar UX em mobile.

---

## 5. Header – contador do carrinho

- O ícone da sacola já existe.
- O contador (badge) exibe `totalItems` do store (soma das quantidades).
- O ícone é um **Link** para `/carrinho`.
- O Header precisa **subscrever** o store (Zustand) para reagir a mudanças. Ex.: `const totalItems = useCartStore(state => state.totalItems)`.

---

## 6. Resumo da estrutura de arquivos (a implementar)

```
src/
  stores/
    cart-store.ts          # Zustand store + persist
  types/
    cart.ts                # CartItem, AddToCartPayload
  components/
    CartItemRow.tsx        # Linha do carrinho
    CartSummary.tsx        # Subtotal + CTA
    CartEmpty.tsx          # Estado vazio
  pages/
    Cart.tsx               # Página /carrinho
  components/
    Header.tsx             # Atualizar: contador + link
    ProductCard.tsx        # Atualizar: botão adicionar chama store
  App.tsx                  # Rota /carrinho
```

---

## 7. Considerações para o futuro

- **Página de produto:** Ao ter `/produto/:slug`, o “Adicionar” usará tamanho e cor escolhidos; aí sim `productVariantId` pode ser usado quando disponível.
- **Checkout:** O checkout lerá `items` do store e enviará para a API (productId, variantId, quantity, price) para criar o pedido.
- **Merge com Supabase:** Se no futuro houver tabela `cart_items`, no login faz-se merge: itens locais + itens do backend, com deduplicação por produto+variante.

---

## 8. Decisões fechadas

| Decisão | Escolha |
|---------|---------|
| Onde guardar | Zustand + localStorage |
| Chave de unicidade do item | `productId` + `size` + `colorName` (ou só `productId` se sem variantes) |
| Adicionar no ProductCard | Usar primeira variante (primeiro size, primeira cor) |
| Contador no Header | Soma de `quantity` de todos os itens |
| Rota | `/carrinho` |

Com esse desenho, a implementação pode seguir de forma direta.
