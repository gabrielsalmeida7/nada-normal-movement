# Passo 7 – Backend de pagamentos (Mercado Pago): desenho

Documento de design antes da implementação. Integração com Mercado Pago Checkout Pro via Vercel Serverless Functions.

---

## 1. Fluxo geral

```
[Checkout] → cria pedido (Supabase) → chama API → cria preferência MP → redireciona para MP
                                                          ↓
[Usuário paga no MP] → MP envia webhook → API atualiza pedido (paid)
                                                          ↓
[MP redireciona] → /checkout/sucesso ou /checkout/erro
```

---

## 2. O que já existe

- **Pedido:** Criado no frontend (Step 6) com `status: 'pending'`, `payment_id: null`
- **Tabela orders:** Tem `payment_id` (TEXT) para guardar ID da preferência ou do pagamento MP
- **Checkout:** Cria pedido, redireciona para `/checkout/sucesso?order=...`

---

## 3. O que implementar

### 3.1 API: criar preferência Mercado Pago

**Endpoint:** `POST /api/mercadopago/preference`

**Request (JSON):**
```json
{
  "orderId": "uuid-do-pedido"
}
```

**Comportamento:**
1. Validar `orderId` (obrigatório)
2. Buscar pedido no Supabase (com `order_items` e dados de envio)
3. Verificar que o pedido pertence ao usuário (via header `Authorization: Bearer <jwt>` ou session)
4. Verificar que `status === 'pending'` e `payment_id` é null
5. Montar itens para MP: cada `order_item` vira um item (title, quantity, unit_price em centavos)
6. Adicionar item "Frete" se `shipping_cents > 0`
7. Criar preferência no MP com:
   - `items`
   - `external_reference`: `orderId` (para o webhook identificar o pedido)
   - `back_urls`: success, failure, pending
   - `auto_return`: "approved"
   - `notification_url`: URL do webhook (ex.: `https://seu-dominio.vercel.app/api/mercadopago/webhook`)
8. Atualizar pedido: `payment_id = preference.id` (ou `preference_id`)
9. Retornar `{ init_point: "https://..." }`

**Response:**
```json
{
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
}
```

### 3.2 API: webhook Mercado Pago

**Endpoint:** `POST /api/mercadopago/webhook`

**Comportamento:**
1. MP envia `application/json` ou `x-www-form-urlencoded` com `type` e `data.id`
2. Tipos comuns: `payment` (pagamento criado/atualizado)
3. Ao receber `type=payment`, buscar o pagamento na API do MP: `GET /v1/payments/{id}`
4. Do pagamento: `status` (approved, pending, rejected), `external_reference` (orderId)
5. Se `status === 'approved'`: atualizar pedido no Supabase (`status = 'paid'`, opcionalmente `payment_id` com o ID do pagamento)
6. Retornar 200 OK (MP espera resposta rápida)

**Segurança:** Validar que a requisição vem do MP (verificar headers ou assinatura, se disponível).

### 3.3 Frontend: alterar fluxo do checkout

**Antes (Step 6):**
- Cria pedido → limpa carrinho → redireciona para `/checkout/sucesso`

**Depois (Step 7):**
- Cria pedido → chama `POST /api/mercadopago/preference` com `orderId` → redireciona para `init_point` (MP)
- **Não** limpar o carrinho antes do pagamento (ou limpar só quando webhook confirmar — opcional: manter carrinho até sucesso para UX de retry)

**Decisão:** Limpar carrinho ao criar o pedido (como hoje). Se o usuário abandonar no MP, o pedido fica `pending`; pode haver job futuro para cancelar pedidos pendentes antigos.

---

## 4. URLs de retorno (back_urls)

| Tipo   | URL sugerida                    |
|--------|----------------------------------|
| success| `https://.../checkout/sucesso?order={orderId}` |
| failure| `https://.../checkout/erro?order={orderId}`    |
| pending| `https://.../checkout/pendente?order={orderId}` |

O MP permite `{orderId}` como placeholder? Não — as `back_urls` são fixas por preferência. Podemos passar o orderId na query da `notification_url` ou usar apenas `/checkout/sucesso` e identificar o pedido pelo `preference_id` (que está em `payment_id` do pedido). Ou: usar URLs genéricas e o MP adiciona query params (`payment_id`, `status`, etc.).

**Documentação MP:** As `back_urls` recebem query params do MP, ex.: `?collection_id=...&collection_status=approved&payment_id=...&status=approved&external_reference=...`

Então podemos usar:
- success: `/checkout/sucesso` — o MP adiciona `?external_reference=orderId&status=approved`
- failure: `/checkout/erro`
- pending: `/checkout/pendente`

---

## 5. Variáveis de ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `MP_ACCESS_TOKEN` | Vercel (API) | Access Token do Mercado Pago (produção ou teste) |
| `SUPABASE_URL` | Vercel (API) | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (API) | Service role key (para atualizar pedidos via API, bypass RLS) |

O frontend já usa `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O backend precisa da **service role** para atualizar `orders` (o webhook não tem contexto de usuário).

---

## 6. Estrutura de arquivos (Vercel)

```
api/
  mercadopago/
    preference.ts   # POST - cria preferência, retorna init_point
    webhook.ts      # POST - recebe notificação, atualiza pedido
```

Ou, se a Vercel usar convenção por arquivo:
```
api/
  mercadopago-preference.ts
  mercadopago-webhook.ts
```

**Vercel:** Cada arquivo em `api/` vira um serverless function. `api/mercadopago/preference.ts` → rota `/api/mercadopago/preference`.

---

## 7. Autenticação da API

O `POST /api/mercadopago/preference` precisa garantir que o usuário está logado e que o pedido é dele.

**Opção A:** Enviar o JWT do Supabase no header `Authorization: Bearer <token>`. A API valida o token e extrai `user_id`, depois confere se `order.user_id === user_id`.

**Opção B:** Enviar `orderId` e confiar que só quem tem o link pode pagar. Menos seguro — qualquer um com o orderId poderia criar a preferência. O MP não exige login; o pagamento é anônimo. O risco: alguém gera preferência para o pedido de outro e paga — o pedido seria marcado como pago e a entrega iria para o endereço do dono do pedido. Então o pagador estaria pagando pelo pedido de outro. Para evitar isso, **validar que o usuário logado é o dono do pedido**.

**Implementação:** Frontend envia `Authorization: Bearer <supabase_session.access_token>`. A API usa o Supabase para verificar o token e obter `user_id`.

---

## 8. Resumo do que implementar

1. **Criar `api/mercadopago/preference.ts`** — recebe orderId + JWT, cria preferência MP, retorna init_point
2. **Criar `api/mercadopago/webhook.ts`** — recebe notificação do MP, busca pagamento, atualiza pedido para `paid`
3. **Alterar Checkout.tsx** — após criar pedido, chamar API, redirecionar para init_point em vez de sucesso
4. **Criar/ajustar páginas** — `/checkout/sucesso` (já existe), `/checkout/erro`, `/checkout/pendente` (opcional)
5. **Configurar variáveis** — `MP_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` na Vercel
6. **Configurar rewrites** — garantir que `/api/*` não seja engolido pelo rewrite para `index.html`

---

## 9. Verificações no vercel.json

O `vercel.json` atual tem:
```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

Isso pode enviar `/api/mercadopago/preference` para o SPA. A Vercel normalmente prioriza as Serverless Functions em `api/` sobre os rewrites. Se não funcionar, adicionar um rewrite explícito para excluir `/api` ou colocar a API antes do catch-all.

---

## 10. SDK Mercado Pago

- **Backend (Node):** `mercadopago` (SDK oficial)
- **Frontend:** Não é obrigatório para Checkout Pro — o backend retorna `init_point` e o frontend faz `window.location.href = init_point`. O Checkout Pro abre em nova aba ou redirect.

Instalação: `npm install mercadopago`

---

## 11. Implementação concluída (Passo 7)

- **api/mercadopago/preference.ts** — POST, cria preferência MP, retorna init_point
- **api/mercadopago/webhook.ts** — POST, recebe notificação, atualiza pedido para paid
- **Checkout.tsx** — Após criar pedido, chama API e redireciona para init_point
- **Páginas** — /checkout/sucesso, /checkout/erro, /checkout/pendente

### Variáveis de ambiente (Vercel)

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `MP_ACCESS_TOKEN` | Sim | Access Token do Mercado Pago (teste ou produção) |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key (webhook atualiza pedidos) |
| `SUPABASE_ANON_KEY` ou `VITE_SUPABASE_ANON_KEY` | Sim (preference) | Anon key (validação de JWT) |

### Webhook no Mercado Pago

Configurar em: Suas integrações → Webhooks → URL: `https://seu-dominio.vercel.app/api/mercadopago/webhook`
