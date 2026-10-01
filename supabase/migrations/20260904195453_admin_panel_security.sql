-- Painel administrativo: autorização, catálogo e políticas de acesso.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT COALESCE(
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
        false
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_is_active
    ON public.products(is_active);

-- Remove políticas públicas amplas e a atualização insegura de pedidos.
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Product variants are viewable by everyone" ON public.product_variants;
DROP POLICY IF EXISTS "Users can update own orders only for limited fields" ON public.orders;

-- Catálogo público: somente produtos ativos e seus relacionamentos.
CREATE POLICY "Active products are publicly viewable"
    ON public.products FOR SELECT
    TO public
    USING (is_active OR public.is_admin());

CREATE POLICY "Active product images are publicly viewable"
    ON public.product_images FOR SELECT
    TO public
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.products
            WHERE products.id = product_images.product_id
              AND products.is_active
        )
    );

CREATE POLICY "Active product variants are publicly viewable"
    ON public.product_variants FOR SELECT
    TO public
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.products
            WHERE products.id = product_variants.product_id
              AND products.is_active
        )
    );

-- Escrita de catálogo: somente JWT com app_metadata.role = admin.
CREATE POLICY "Admins can insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
    ON public.products FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert product images"
    ON public.product_images FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update product images"
    ON public.product_images FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete product images"
    ON public.product_images FOR DELETE
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can insert product variants"
    ON public.product_variants FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update product variants"
    ON public.product_variants FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete product variants"
    ON public.product_variants FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Visões administrativas somente leitura.
CREATE POLICY "Admins can view profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can view orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can view order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Storage: leitura continua pública, mas toda escrita exige admin.
DROP POLICY IF EXISTS "Authenticated users can upload to products bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Admins can upload product files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'products'
        AND public.is_admin()
    );

CREATE POLICY "Admins can update product files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'products'
        AND public.is_admin()
    )
    WITH CHECK (
        bucket_id = 'products'
        AND public.is_admin()
    );

CREATE POLICY "Admins can delete product files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'products'
        AND public.is_admin()
    );
