# Passo 4 – Catálogo (desenho e implementação)

## Objetivo

Deixar de usar produtos hardcoded e passar a listar produtos a partir do **Supabase** (tabelas `products`, `product_images`, `product_variants` + bucket Storage `products`), com **TanStack Query** no frontend.

---

## 1. Dados no Supabase (já existem)

- **products:** id (UUID), name, slug, description, price_cents, category (running | street | social), material, tag, tag_color, peso/dimensões, timestamps.
- **product_images:** product_id, path (no bucket), sort_order.
- **product_variants:** product_id, size, color_name, color_hex, stock_quantity.

URL pública da imagem: `https://<project>.supabase.co/storage/v1/object/public/products/<path>`.

---

## 2. Seed (dados iniciais)

- **Migração SQL** insere:
  - **products:** 6 de Running + 6 de Street (mesmos dados que hoje estão nos componentes), com slug único (ex.: `camiseta-caos`, `jaqueta-obsessao`).
  - **product_images:** uma linha por produto com `path = slug + '.jpg'` (ex.: `camiseta-caos.jpg`). As fotos precisam ser enviadas ao bucket `products` com esses nomes (via Dashboard ou script).
  - **product_variants:** uma linha por combinação (product_id, size, color_name), com color_hex e stock_quantity.

- **Imagens:** Os assets atuais (`product-tshirt.jpg`, etc.) estão em `src/assets`. Para o Storage, é preciso fazer upload com os nomes que batem com o slug (ex.: `camiseta-caos.jpg`). Enquanto não houver upload, o frontend pode usar uma imagem placeholder quando a URL do Storage falhar.

---

## 3. Frontend – queries e mapeamento

- **Queries (TanStack Query):**
  - `useProductsByCategory(category)` – lista produtos da categoria (running | street).
  - `useFeaturedProducts()` – produtos em destaque na home (ex.: primeiros 4 por `created_at` ou por lista fixa de slugs).

- **Supabase:** uma única query por tela:
  - `from('products').select('*, product_images(*), product_variants(*)').eq('category', category).order('created_at')`.
  - Para destaque: `.limit(4)` ou `.in('slug', ['camiseta-caos', ...])`.

- **Mapeamento API → Product (ProductCard):**
  - `id` → string (UUID) para key no React.
  - `name`, `description`, `material`, `tag`, `tagColor` → direto.
  - `price` → `price_cents / 100`.
  - `image` → URL pública do Storage a partir do primeiro `product_images[0].path`; se não houver, placeholder.
  - `sizes` → lista única de `product_variants[].size`.
  - `colors` → lista única de `{ name: color_name, hex: color_hex }` a partir de `product_variants`.
  - `category` / `categoryColor` → derivados do slug da categoria (running → "Running", text-nn-orange; street → "Street", text-nn-lime).

- **Tipos:** tipo para a resposta do Supabase (com joins) e função `mapProductRowToProduct(row)` que devolve o `Product` usado pelo ProductCard.

---

## 4. Componentes que passam a usar os dados do Supabase

- **ProductsSection:** usa `useFeaturedProducts()` e renderiza os produtos retornados (já no formato Product).
- **CategoryRunning / CategoryStreet:** usam `useProductsByCategory('running')` e `useProductsByCategory('street')` e passam o array para `CategoryPage`.
- **ProductCard:** continua recebendo o tipo `Product`; o `id` pode ser string (UUID).

---

## 5. Placeholder quando não houver imagem no Storage

- Se não existir `product_images` ou a URL do Storage retornar 404, usar uma imagem placeholder (ex.: `public/placeholder.svg` ou um estado “sem imagem”) para não quebrar o layout.

---

## 6. Como aplicar o seed

1. Execute as migrações na ordem (incluindo a de seed):
   - `20250301120000_initial_schema.sql`
   - `20250301120001_rls.sql`
   - `20250301120002_storage.sql`
   - **`20250302120000_seed_products.sql`** (insere os 12 produtos + imagens + variantes).

2. **Imagens no Storage:** O seed insere em `product_images` o path `slug.jpg` (ex.: `camiseta-caos.jpg`). Para as fotos aparecerem:
   - Faça upload no bucket **products** (Storage) dos arquivos com esses nomes, **ou**
   - Enquanto não houver upload, o frontend usa o placeholder `/placeholder.svg` para não quebrar o layout.

3. **Produtos em destaque (home):** A query "featured" busca por slug os produtos: `camiseta-caos`, `meia-compressao-nn`, `jaqueta-obsessao`, `regata-performance`. Eles devem existir após o seed.

---

## 7. Próximo passo (após o 4)

- **Passo 5 – Carrinho:** estado (Zustand ou Context), ícone no Header com contador, página `/carrinho`.
