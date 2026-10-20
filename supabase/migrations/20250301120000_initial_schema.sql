-- ============================================
-- Nada Normal Movement – Schema inicial (Passo 2)
-- Tabelas: profiles, products, product_images, product_variants, addresses, orders, order_items
-- ============================================

-- Extensão para UUID (já existe por padrão no Supabase)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extensão de auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    cpf TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);

COMMENT ON TABLE public.profiles IS 'Perfil estendido do usuário (auth.users): nome, CPF, telefone';

-- Trigger para criar profile ao registrar usuário (opcional; pode ser feito no frontend)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    category TEXT NOT NULL CHECK (category IN ('running', 'street', 'social')),
    material TEXT,
    tag TEXT,
    tag_color TEXT,
    weight_grams INTEGER CHECK (weight_grams IS NULL OR weight_grams > 0),
    width_cm NUMERIC(6,2) CHECK (width_cm IS NULL OR width_cm > 0),
    height_cm NUMERIC(6,2) CHECK (height_cm IS NULL OR height_cm > 0),
    length_cm NUMERIC(6,2) CHECK (length_cm IS NULL OR length_cm > 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

COMMENT ON TABLE public.products IS 'Catálogo de produtos; peso e dimensões para cálculo de frete';
COMMENT ON COLUMN public.products.price_cents IS 'Preço em centavos (evitar float)';
COMMENT ON COLUMN public.products.tag_color IS 'Classe Tailwind para tag (ex: bg-nn-lime)';

-- ============================================
-- 3. PRODUCT_IMAGES (referência ao Storage)
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

COMMENT ON TABLE public.product_images IS 'Imagens do produto; path = caminho no bucket Storage products';

-- ============================================
-- 4. PRODUCT_VARIANTS (tamanho, cor, estoque)
-- ============================================
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color_name TEXT,
    color_hex TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE NULLS NOT DISTINCT (product_id, size, color_name)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

COMMENT ON TABLE public.product_variants IS 'Variantes por tamanho/cor com estoque';

-- ============================================
-- 5. ADDRESSES (endereços de entrega do usuário)
-- ============================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

COMMENT ON TABLE public.addresses IS 'Endereços de entrega do usuário para checkout e ordem à fábrica';

-- ============================================
-- 6. ORDERS
-- ============================================
CREATE TYPE public.order_status AS ENUM (
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status public.order_status NOT NULL DEFAULT 'pending',
    payment_id TEXT,
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
    -- Snapshot do endereço de entrega (para histórico e ordem à fábrica)
    shipping_name TEXT,
    shipping_street TEXT NOT NULL,
    shipping_number TEXT NOT NULL,
    shipping_complement TEXT,
    shipping_neighborhood TEXT,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT NOT NULL,
    shipping_zip_code TEXT NOT NULL,
    shipping_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

COMMENT ON TABLE public.orders IS 'Pedidos; endereço de entrega em snapshot para recibo e ordem à fábrica';

-- ============================================
-- 7. ORDER_ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_cents_at_purchase INTEGER NOT NULL CHECK (price_cents_at_purchase >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

COMMENT ON TABLE public.order_items IS 'Itens do pedido; preço no momento da compra';
