# Supabase – Nada Normal Movement

## Aplicar migrações

### Opção 1: Supabase Dashboard (novo projeto)

1. Crie um projeto em [app.supabase.com](https://app.supabase.com).
2. Em **Project Settings → API** copie a **URL** e a **anon public** key para o `.env` do app (veja `.env.example` na raiz).
3. No **SQL Editor**, execute os arquivos de migração **na ordem**:
   - `migrations/20250301120000_initial_schema.sql`
   - `migrations/20250301120001_rls.sql`
   - `migrations/20250301120002_storage.sql`

### Opção 2: Supabase CLI (projeto já linkado)

```bash
supabase link --project-ref seu-project-ref
supabase db push
```

O bucket `products` em Storage será criado pela migração `20250301120002_storage.sql`.  
URLs públicas das imagens: `https://<project>.supabase.co/storage/v1/object/public/products/<path>`.

## Tabelas criadas

| Tabela             | Uso |
|--------------------|-----|
| `profiles`         | Perfil do usuário (nome, CPF, telefone); preenchido ao registrar. |
| `products`         | Catálogo (nome, slug, preço, categoria, peso/dimensões para frete). |
| `product_images`   | Imagens do produto (path no bucket `products`). |
| `product_variants`| Tamanho, cor, estoque por variante. |
| `addresses`        | Endereços de entrega do usuário. |
| `orders`           | Pedidos (status, total, endereço em snapshot). |
| `order_items`      | Itens do pedido (produto, variante, quantidade, preço no momento). |

## RLS

- **profiles, addresses, orders, order_items:** usuário só acessa os próprios dados.
- **products, product_images, product_variants:** leitura pública; escrita apenas com **service_role** (backend/Dashboard).
- **Storage bucket `products`:** leitura pública; upload/update/delete para usuários autenticados (para painel admin futuro).
