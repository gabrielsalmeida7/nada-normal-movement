# Supabase – Nada Normal Movement

## Estado remoto confirmado — 19/10/2026

No projeto `NadaNormal` (`bcemyxasbcwcrbinfguu`), estas três migrations foram
aplicadas pelo MCP, em ordem e sem backup, por autorização explícita do usuário:

| Arquivo do repositório | Versão registrada pelo MCP |
| --- | --- |
| `20261005193408_transactional_checkout_orders.sql` | `20261019195917` |
| `20261006140000_reservation_release_and_shipping.sql` | `20261019195930` |
| `20261019192940_checkout_pro_sandbox.sql` | `20261019195942` |

O MCP gerou novas versões para os arquivos existentes. O histórico remoto estava
vazio, embora o schema inicial e a fundação financeira já estivessem presentes.
Não reaplicar esses arquivos nem executar `supabase db push` neste projeto sem
antes reconciliar o baseline e o mapeamento das versões. Não foi alterado nem
inventado histórico das migrations antigas.

Verificação antes/depois: 20 pedidos, 21 itens, 12 produtos, 118 variantes e zero
tentativas de pagamento. Hashes dos dados legados dos pedidos, itens e estoques
permaneceram idênticos. As novas tabelas têm RLS e acesso financeiro exclusivo
de `service_role`; as RPCs usam SECURITY INVOKER e search_path fixo. A consulta
de frete e a consulta de status sem dono válido também foram verificadas.

Os avisos de segurança anteriores do projeto permanecem para revisão separada;
as novas tabelas financeiras sem policies públicas são intencionalmente restritas
ao backend. Nenhum Worker foi publicado nem pagamento habilitado nesta aplicação.

## Aplicar migrações

### Opção 1: Supabase Dashboard (novo projeto)

1. Crie um projeto em [app.supabase.com](https://app.supabase.com).
2. Em **Project Settings → API** copie a **URL** e a **anon public** key para o `.env` do app (veja `.env.example` na raiz).
3. No **SQL Editor**, execute os arquivos de migração **na ordem**:
   - `migrations/20250301120000_initial_schema.sql`
   - `migrations/20250301120001_rls.sql`
   - `migrations/20250301120002_storage.sql`
   - `migrations/20250302120000_seed_products.sql` (seed do catálogo: 12 produtos + imagens + variantes)
   - `migrations/20260904195453_admin_panel_security.sql`
   - `migrations/20261002194546_appmax_financial_foundation.sql`
   - `migrations/20261005193408_transactional_checkout_orders.sql`
   - `migrations/20261006140000_reservation_release_and_shipping.sql`
   - `migrations/20261019192940_checkout_pro_sandbox.sql`

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
| `payment_attempts` | Tentativas de pagamento idempotentes e seus estados locais. |
| `webhook_events`   | Inbox deduplicada para persistência e reprocessamento de webhooks. |
| `outbox_jobs`      | Efeitos assíncronos idempotentes vinculados ao pedido. |
| `inventory_reservation_events` | Trilha das reservas de estoque e da liberação única. |

## RLS

- **profiles e addresses:** usuário mantém os fluxos existentes sobre os próprios dados.
- **orders e order_items:** usuário pode ler os próprios dados, mas não pode inserir, atualizar ou excluir diretamente; a criação autoritativa será server-side em um passo posterior.
- **payment_attempts, webhook_events, outbox_jobs e inventory_reservation_events:** sem acesso para `anon`/`authenticated`; DML exclusivo de `service_role`.
- **products, product_images e product_variants:** catálogo ativo é público; escrita exige administrador.
- **Storage bucket `products`:** leitura pública; escrita exige administrador.

## Migration financeira Appmax-ready

`20261002194546_appmax_financial_foundation.sql` adiciona a separação entre estado financeiro e logístico do pedido, composição monetária em centavos, IDs externos, controle de versão, tentativas de pagamento, inbox de webhook e outbox. A migration não cria pedidos, não calcula valores, não chama a Appmax e não processa checkout.

Antes do deploy, confirme que pedidos legados respeitam `total_cents >= shipping_cents`; a migration falha explicitamente se encontrar uma linha incompatível, evitando inventar um subtotal histórico.

Após aplicar as migrations em um banco de teste, execute a verificação transacional (ela termina com `ROLLBACK`):

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/appmax_financial_foundation.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/transactional_checkout_orders.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f supabase/tests/reservation_release.sql
bash supabase/tests/transactional_checkout_concurrency.sh
bash supabase/tests/reservation_release_concurrency.sh
```
