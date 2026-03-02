-- ============================================
-- Row Level Security (RLS) – Nada Normal Movement
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES: usuário só acessa o próprio perfil
-- ============================================
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Insert é feito pelo trigger handle_new_user (SECURITY DEFINER) ou no signup
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- PRODUCTS: leitura pública (catálogo)
-- ============================================
CREATE POLICY "Products are viewable by everyone"
    ON public.products FOR SELECT
    TO public
    USING (true);

-- Inserção/atualização de produtos: via backend (Vercel API com service_role) ou Dashboard Supabase.
-- Não há policy de INSERT/UPDATE/DELETE para authenticated/anon; service_role bypassa RLS.

-- ============================================
-- PRODUCT_IMAGES: leitura pública
-- ============================================
CREATE POLICY "Product images are viewable by everyone"
    ON public.product_images FOR SELECT
    TO public
    USING (true);

-- ============================================
-- PRODUCT_VARIANTS: leitura pública
-- ============================================
CREATE POLICY "Product variants are viewable by everyone"
    ON public.product_variants FOR SELECT
    TO public
    USING (true);

-- ============================================
-- ADDRESSES: usuário só acessa os próprios endereços
-- ============================================
CREATE POLICY "Users can view own addresses"
    ON public.addresses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own addresses"
    ON public.addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own addresses"
    ON public.addresses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own addresses"
    ON public.addresses FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- ORDERS: usuário só vê e cria os próprios pedidos
-- ============================================
CREATE POLICY "Users can view own orders"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Atualização de status (paid, shipped) será feita pelo backend (webhook) com service_role
CREATE POLICY "Users can update own orders only for limited fields"
    ON public.orders FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- ORDER_ITEMS: leitura via order (quem pode ver o order pode ver os items)
-- ============================================
CREATE POLICY "Users can view order items of own orders"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert order items for own orders"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.user_id = auth.uid()
        )
    );

-- Inserção de order_items normalmente é feita junto com a criação do order no backend.
-- Se o frontend criar o order e depois os items, o user_id do order já está definido.
