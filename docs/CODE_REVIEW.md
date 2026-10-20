# Revisão de código – Nada Normal Movement (Passo 1 do plano e-commerce)

Revisão de `src/components` e `src/pages` antes de adicionar camadas de e-commerce, conforme plano em `.cursor/plans/e-commerce_nada_normal_movement_99d209b9.plan.md`.

---

## Resumo executivo

- **Objetivo:** Reduzir acoplamento e duplicação para facilitar migração para Supabase, catálogo dinâmico e carrinho/checkout.
- **Principais achados:** Dados de produtos em 4 lugares distintos; 3 páginas de categoria quase idênticas; interface `Product` só em um componente; uso de classes Tailwind dinâmicas (não suportadas pelo JIT).
- **Ações:** Tipos centralizados, componente único de categoria, `ProductsSection` usando `ProductCard`, correção de classes no `ProductCard`.

---

## 1. Estrutura atual

| Pasta / arquivo | Conteúdo relevante |
|-----------------|--------------------|
| `src/pages/` | Index (Home), ComingSoon, NotFound, **CategoryRunning**, **CategoryStreet**, **CategorySocial** |
| `src/components/` | Header, Footer, HeroSection, **ProductsSection**, **ProductCard**, CategorySection, PillarsSection, CommunitySection, RunningMascot, NavLink + `ui/` |
| `src/` | Sem pasta `types/`; TanStack Query já configurado no App. |

---

## 2. Achados detalhados

### 2.1 Duplicação de dados de produtos

- **ProductsSection.tsx**  
  - Array local `products` com estrutura **reduzida**: `id`, `name`, `category`, `price`, `image`, `tag`, `tagColor`, `categoryColor`.  
  - Não usa a interface `Product` de `ProductCard` nem o componente `ProductCard`.  
  - Grid de cards implementado **inline** (imagem, tag, hover com ícones, preço).

- **CategoryRunning.tsx, CategoryStreet.tsx, CategorySocial.tsx**  
  - Cada um declara seu próprio array `products: Product[]` com estrutura **completa** (description, material, sizes, colors).  
  - Dados diferentes por categoria (correto semanticamente), mas **repetição de estrutura e imports** (imagens, tipo `Product`).  
  - Quando os produtos forem para o Supabase, os três arquivos terão de ser alterados do mesmo jeito.

**Risco:** Manutenção triplicada; migração para API/Supabase mais trabalhosa e propensa a inconsistências.

---

### 2.2 Páginas de categoria quase idênticas

- As três páginas seguem o mesmo layout:
  - Header + Footer
  - Hero com imagem de fundo, gradiente, faixa colorida, “Voltar”, título (RUNNING / STREET / SOCIAL), subtítulo
  - Seção de grid de produtos com contagem e `ProductCard`
- **Únicas diferenças:** título, cor de destaque, imagem do hero, link “Voltar” e array `products`.

**Conclusão:** Vale extrair um único componente (ex.: `CategoryPage`) que recebe `category` (slug ou config) e renderiza hero + grid; os dados de produtos virão depois do Supabase por categoria.

---

### 2.3 Interface `Product` e tipos

- A interface `Product` está **apenas** em `ProductCard.tsx` (exportada).
- `ProductsSection` usa uma forma “enxuta” de produto (sem description, material, sizes, colors) e não usa `ProductCard`.
- Não existe pasta `src/types/` nem tipos compartilhados para categoria (slug, cores, etc.).

**Recomendação:** Criar `src/types/product.ts` (e, se fizer sentido, `category.ts`) com `Product` e tipos relacionados; importar em `ProductCard`, `ProductsSection` e nas páginas de categoria. Preparar para um tipo “ProductSummary” se a listagem continuar mais enxuta que a ficha de produto.

---

### 2.4 Classes Tailwind dinâmicas no `ProductCard`

- Uso de strings construídas em tempo de execução, por exemplo:
  - `group-hover:border-${accentColor}` (ex.: `accentColor = "nn-orange"`)
  - `group-hover:${shadowClass}`
  - `text-${accentColor}`
- O compilador Tailwind (JIT) só inclui classes que aparecem **literalmente** no código. Classes como `border-nn-orange` ou `text-nn-orange` só entram no CSS se existirem como string completa em algum lugar.

**Efeito:** Em produção, hover e cor de texto podem não funcionar para as categorias (nn-orange, nn-lime, nn-yellow).

**Solução:** Usar um mapa `accentColor → { border, shadow, text }` com **classes completas** (ex.: `border-nn-orange`, `shadow-neon-orange`, `text-nn-orange`) e aplicar essas strings no JSX.

---

### 2.5 Outros pontos

- **CategorySection.tsx:** Array `categories` hardcoded (título, cor, imagem, href). Coerente com o atual; quando houver backend, substituir por dados do Supabase ou config.
- **Header:** Carrinho com contador fixo “0”; botão “NÃO ENTRE!” / “Entrar no Movimento” não fazem auth real. Sem mudança nesta etapa; apenas anotado para o passo de Auth.
- **Imagens:** Uso de `@/assets/` e `/lovable-uploads/`. Na migração para Supabase Storage, as URLs virão do banco; a revisão não altera isso.
- **Duplicação de estilos “organic” e “blob”:** `organicCardStyles` e `blobClasses` repetidos em `ProductsSection` e `ProductCard`. Podem ser extraídos para um módulo compartilhado (ex.: `constants/cardStyles.ts`) se quiser reduzir duplicação; opcional nesta etapa.

---

## 3. Plano de refatoração (implementado neste passo)

1. **Tipos compartilhados**  
   - Criar `src/types/product.ts` com a interface `Product` (e, se necessário, `ProductSummary`).  
   - `ProductCard` e demais componentes passam a importar de `@/types/product`.

2. **ProductCard**  
   - Manter interface em `product.ts` e importar.  
   - Substituir classes dinâmicas por um mapa por “accent” (nn-orange, nn-lime, nn-yellow, nn-pink) com classes completas para border, shadow e text.

3. **Páginas de categoria**  
   - Criar componente `CategoryPage` (ou `CategoryLayout`) que recebe: slug/category, título, cor de destaque, imagem do hero, subtítulo.  
   - Manter por enquanto os arrays `products` locais, mas passados como prop (ou, depois, substituídos por hook/query por categoria).  
   - `CategoryRunning`, `CategoryStreet` e `CategorySocial` viram wrappers finos que passam config + produtos para `CategoryPage`.

4. **ProductsSection**  
   - Alinhar estrutura dos itens à interface `Product` (ou a um `ProductSummary` com campos opcionais para description, material, sizes, colors).  
   - Usar o componente `ProductCard` em vez do grid inline.  
   - Fonte dos dados: por enquanto array local; depois será substituída por query ao Supabase.

5. **Constantes compartilhadas (opcional)**  
   - Extrair `organicCardStyles` e `blobClasses` para um único módulo se ambos forem usados em mais de um componente.

---

## 4. O que não foi alterado (por decisão)

- Auth e carrinho (próximos passos do plano).
- Conteúdo dos arrays de produtos (apenas organização e tipo).
- CategorySection (mantido como está até integração com backend).
- Header/Footer (apenas anotado para futura integração de auth e carrinho).

---

## 5. Próximos passos (plano e-commerce)

Após esta revisão e refatoração:

- **Passo 2:** Supabase – projeto, tabelas (products, product_images, product_variants, orders, order_items, profiles, addresses), Storage, RLS.  
- **Passo 3:** Auth – Supabase Auth, telas de login/registro, Header.  
- **Passo 4:** Catálogo – migrar produtos para o banco, imagens para Storage, substituir arrays locais por TanStack Query.

Esta revisão deixa a base de componentes e tipos pronta para esses passos.
