-- ============================================
-- Storage: bucket "products" para fotos de produtos
-- Leitura pública; upload apenas via backend/service_role ou admin
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'products',
    'products',
    true,
    5242880,  -- 5MB por arquivo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas no storage.objects (RLS)
-- Leitura: qualquer um pode ver imagens (bucket público)
CREATE POLICY "Product images are publicly accessible"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'products');

-- Upload: apenas authenticated (ou restringir a service_role no backend)
-- Para upload via Dashboard ou backend com service_role, não é necessário policy para anon/authenticated.
-- Se quiser que apenas o backend faça upload, não crie policy de INSERT para authenticated.
-- Se quiser que um "admin" logado faça upload pelo app, crie policy para authenticated:
-- CREATE POLICY "Authenticated users can upload product images"
--     ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');
-- Por padrão: upload via backend (service_role) ou Dashboard; frontend só lê.
-- Criando policy de INSERT para authenticated permite upload pelo app (ex.: painel admin futuro):
CREATE POLICY "Authenticated users can upload to products bucket"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'products');

CREATE POLICY "Authenticated users can update product images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'products');

CREATE POLICY "Authenticated users can delete product images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'products');
