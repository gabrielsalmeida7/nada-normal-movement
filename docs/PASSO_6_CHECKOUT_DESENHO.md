# Passo 6 – Checkout + Frete fixo: checklist pré-implementação

Documento para validar decisões e requisitos antes de implementar.

---

## 1. Decisões de negócio

### 1.1 Login obrigatório no checkout?

| Opção | Prós | Contras |
|-------|------|---------|
| **Sim** | RLS atual já suporta; endereços salvos; histórico de pedidos | Usuário precisa criar conta antes |
| **Não (guest)** | Menos fricção na compra | RLS de `orders` exige `user_id`; precisaria policy para `user_id = null` |

**Recomendação:** Login obrigatório no checkout (MVP). Se o carrinho não estiver vazio e o usuário não estiver logado, redirecionar para `/login?redirect=/checkout`.

---

### 1.2 Regras de frete fixo

Definir **regiões** e **valores** (exemplos):

| Região | Estados | Valor sugerido |
|--------|---------|----------------|
| Sul/Sudeste | SP, RJ, MG, ES, PR, SC, RS | R$ 20 |
| Centro-Oeste/Norte/Nordeste | Demais | R$ 30 |
| Frete grátis | — | Acima de R$ X? (opcional) |

**Perguntas:**
- Quais valores reais usar?
- Há frete grátis acima de certo valor? Se sim, qual?
- O CEP é obrigatório para calcular a região? (Sim — pelo menos os 2 primeiros dígitos indicam o estado)

---

### 1.3 Telefone para entrega

A tabela `orders` tem `shipping_phone`. O `profiles` tem `phone`.

**Perguntas:**
- Usar telefone do perfil quando logado?
- Permitir sobrescrever no checkout?
- Para novo usuário sem telefone: campo obrigatório no checkout?

---

## 2. Schema e dados existentes

### 2.1 Tabelas relevantes (já existem)

| Tabela | Uso no checkout |
|--------|-----------------|
| `addresses` | Endereços salvos do usuário (user_id obrigatório) |
| `orders` | Pedido: total_cents, shipping_cents, snapshot do endereço |
| `order_items` | Itens: product_id, product_variant_id, quantity, price_cents_at_purchase |
| `profiles` | full_name, phone (para shipping_name, shipping_phone) |

### 2.2 Mapeamento cart → order_items

O carrinho tem: `productId`, `size`, `colorName`, `quantity`, `price`.

Para `order_items` precisamos de `product_variant_id`. O `Product` do catálogo não expõe o ID da variante.

**Opções:**
- **A)** Buscar `product_variants` por `product_id + size + color_name` no momento do checkout para obter `product_variant_id`
- **B)** Incluir `productVariantId` no carrinho ao adicionar (exigiria mudar o ProductCard para buscar variantes)

**Recomendação:** Opção A — lookup no checkout. O `product_variant_id` em `order_items` pode ser NULL (schema permite); para histórico e recibo, `product_id` + `size` + `color_name` já identificam.

---

## 3. Fluxo da página de checkout

### 3.1 Etapas sugeridas

1. **Guard:** Carrinho vazio → redirecionar para `/carrinho`
2. **Guard:** Usuário não logado → redirecionar para `/login?redirect=/checkout`
3. **Resumo:** Lista de itens (do store), subtotal
4. **Endereço:** CEP + formulário (rua, número, complemento, bairro, cidade, estado) ou seleção de endereço salvo
5. **Frete:** Cálculo fixo por região (baseado no CEP)
6. **Total:** subtotal + frete
7. **Telefone:** Nome e telefone para contato/entrega
8. **CTA:** "Ir para pagamento" (por enquanto só prepara o payload; o passo 7 fará a integração com Mercado Pago)

### 3.2 Endereço

- **Usuário logado:** Listar `addresses` do Supabase; opção "Usar este" ou "Novo endereço"
- **Novo endereço:** Formulário completo; opcional "Salvar para próximas compras" (INSERT em `addresses`)
- **CEP:** Campo com máscara; ao preencher, buscar ViaCEP (opcional) para autocompletar rua, bairro, cidade, estado

---

## 4. Componentes e arquivos a criar/alterar

| Item | Descrição |
|------|-----------|
| `src/types/address.ts` | Interface `Address` (Supabase) e `ShippingAddress` (form) |
| `src/lib/shipping.ts` | Regras de frete fixo: `getShippingByZipCode(cep: string): number` |
| `src/hooks/use-addresses.ts` | `useAddresses()` — lista endereços do usuário |
| `CheckoutAddressStep` | Formulário ou seleção de endereço |
| `CheckoutSummary` | Resumo de itens + subtotal + frete + total |
| `CheckoutPhoneStep` ou inline | Nome + telefone para entrega |
| `Checkout.tsx` | Orquestra etapas; guard de auth e carrinho |
| `CartSummary` | Já existe; botão leva para `/checkout` |

---

## 5. Persistência do pedido (Passo 7)

No Passo 6, o checkout **não** cria o pedido no Supabase ainda — isso será feito no Passo 7 junto com a integração do Mercado Pago.

No Passo 6, o fluxo termina em:
- Dados prontos (itens, endereço, frete, total)
- Botão "Ir para pagamento" desabilitado ou exibindo "Em breve" até o Passo 7

**Alternativa:** Já criar o pedido com `status: 'pending'` no Passo 6 e, no Passo 7, associar o `payment_id` ao pedido existente. Isso exige API ou chamada direta ao Supabase (INSERT em `orders` + `order_items`). O RLS permite INSERT em `orders` e `order_items` pelo usuário autenticado.

**Recomendação:** No Passo 6, já criar o pedido `pending` no Supabase. O frontend chama `supabase.from('orders').insert(...)` e `supabase.from('order_items').insert(...)`. No Passo 7, o backend (webhook) atualiza o pedido para `paid` quando o pagamento for confirmado.

---

## 6. Resumo do que definir antes de codar

1. **Login obrigatório?** (recomendado: sim)
2. **Valores de frete fixo** por região (ex.: Sul/Sudeste R$ 20, demais R$ 30)
3. **Frete grátis** acima de X? (sim/não e valor)
4. **Telefone:** usar do perfil ou sempre pedir no checkout?
5. **ViaCEP:** usar para autocompletar endereço pelo CEP? (recomendado: sim)
6. **Criar pedido no Passo 6?** (recomendado: sim, status `pending`)

Com essas respostas, a implementação pode seguir de forma direta.

---

## 7. Implementação concluída (Passo 6)

- **Login obrigatório:** Sim; redireciona para `/login?redirect=/checkout`
- **Frete fixo:** Sul/Sudeste R$ 20, demais R$ 30
- **Frete grátis:** Acima de R$ 300
- **Telefone:** Do perfil; se vazio, campo no checkout
- **ViaCEP:** Autocompletar endereço pelo CEP
- **Pedido:** Criado no Passo 6 com status `pending`
