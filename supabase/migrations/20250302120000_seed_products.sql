-- ============================================
-- Seed: produtos Running + Street (Passo 4 – Catálogo)
-- Produtos, product_images (path = slug.jpg) e product_variants
-- ============================================

-- Running (6 produtos)
INSERT INTO public.products (id, name, slug, description, price_cents, category, material, tag, tag_color) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'Camiseta Caos', 'camiseta-caos', 'Para quem acorda às 4h e chama isso de privilégio. Dry-fit leve com costuras seladas para máxima performance.', 18990, 'running', '92% Poliéster Dry-fit, 8% Elastano | Costuras seladas', 'Novo', 'bg-nn-lime'),
  ('a1000002-0000-4000-8000-000000000002', 'Regata Performance', 'regata-performance', 'Ultra leve, ventilação máxima. Para quem quer sentir o vento e deixar o suor falar.', 14990, 'running', '100% Poliéster Micro | Ventilação mesh lateral', 'Limitado', 'bg-nn-red'),
  ('a1000003-0000-4000-8000-000000000003', 'Meia Compressão NN', 'meia-compressao-nn', 'Compressão graduada, anti-bolhas. Cada passo é um manifesto contra a mediocridade.', 8990, 'running', '78% Poliamida, 22% Elastano | Compressão graduada', 'Bestseller', 'bg-nn-orange'),
  ('a1000004-0000-4000-8000-000000000004', 'Short Obsessão', 'short-obsessao', 'Bolso para celular, tecido stretch. Liberdade de movimento para quem não aceita limites.', 15990, 'running', '88% Poliéster, 12% Elastano | Bolso lateral com zíper', NULL, NULL),
  ('a1000005-0000-4000-8000-000000000005', 'Jaqueta Corta-Vento', 'jaqueta-corta-vento', 'Impermeável, refletiva. Corra na chuva, no frio, no escuro — nada te para.', 34990, 'running', '100% Nylon Ripstop | Impermeável, detalhes refletivos', 'Novo', 'bg-nn-lime'),
  ('a1000006-0000-4000-8000-000000000006', 'Boné UV Shield', 'bone-uv-shield', 'Proteção UV50+, tecido respirável. Blindagem solar para quem corre sob qualquer sol.', 7990, 'running', '100% Poliéster UV50+ | Tira de suor interna', NULL, NULL);

-- Street (6 produtos)
INSERT INTO public.products (id, name, slug, description, price_cents, category, material, tag, tag_color) VALUES
  ('a1000007-0000-4000-8000-000000000007', 'Jaqueta Obsessão', 'jaqueta-obsessao', 'Oversized com bolsos ocultos. Feita para quem transforma a rua em passarela do caos.', 44990, 'street', '100% Nylon Premium | Forro em mesh, bolsos ocultos internos', 'Bestseller', 'bg-nn-orange'),
  ('a1000008-0000-4000-8000-000000000008', 'Moletom Caos Urbano', 'moletom-caos-urbano', 'Algodão premium, capuz ajustável. Conforto que desafia o ordinário.', 28990, 'street', '80% Algodão, 20% Poliéster | 360g/m² premium fleece', 'Novo', 'bg-nn-lime'),
  ('a1000009-0000-4000-8000-000000000009', 'Calça Cargo NN', 'calca-cargo-nn', 'Bolsos utilitários, barra ajustável. Funcionalidade para quem vive em movimento.', 25990, 'street', '98% Algodão, 2% Elastano | 6 bolsos utilitários', NULL, NULL),
  ('a100000a-0000-4000-8000-00000000000a', 'Camiseta Oversized Manifesto', 'camiseta-oversized-manifesto', 'Estampa exclusiva, corte largo. Vista sua rebeldia com orgulho.', 16990, 'street', '100% Algodão 30.1 | Estampa silk screen', 'Limitado', 'bg-nn-red'),
  ('a100000b-0000-4000-8000-00000000000b', 'Bucket Hat Nada Normal', 'bucket-hat-nada-normal', 'Dupla face, bordado exclusivo. Dois lados da mesma loucura.', 9990, 'street', '100% Algodão Canvas | Dupla face, bordado NN', NULL, NULL),
  ('a100000c-0000-4000-8000-00000000000c', 'Pochete Tática NN', 'pochete-tatica-nn', 'Zíper refletivo, alça ajustável. Praticidade para quem carrega o caos.', 12990, 'street', 'Nylon Cordura 500D | Zíper YKK refletivo', 'Novo', 'bg-nn-lime');

-- product_images: uma imagem por produto (path = slug.jpg). Upload no Storage com esses nomes.
INSERT INTO public.product_images (product_id, path, sort_order)
SELECT id, slug || '.jpg', 0 FROM public.products;

-- product_variants: Running (por produto)
INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'PP', 'Preto Obsessão', '#0d0d0d', 10),
  ('a1000001-0000-4000-8000-000000000001', 'PP', 'Laranja Caos', '#ff6b1a', 10),
  ('a1000001-0000-4000-8000-000000000001', 'PP', 'Branco Ruído', '#f0f0f0', 10),
  ('a1000001-0000-4000-8000-000000000001', 'P', 'Preto Obsessão', '#0d0d0d', 10),
  ('a1000001-0000-4000-8000-000000000001', 'P', 'Laranja Caos', '#ff6b1a', 10),
  ('a1000001-0000-4000-8000-000000000001', 'P', 'Branco Ruído', '#f0f0f0', 10),
  ('a1000001-0000-4000-8000-000000000001', 'M', 'Preto Obsessão', '#0d0d0d', 10),
  ('a1000001-0000-4000-8000-000000000001', 'M', 'Laranja Caos', '#ff6b1a', 10),
  ('a1000001-0000-4000-8000-000000000001', 'M', 'Branco Ruído', '#f0f0f0', 10),
  ('a1000001-0000-4000-8000-000000000001', 'G', 'Preto Obsessão', '#0d0d0d', 10),
  ('a1000001-0000-4000-8000-000000000001', 'G', 'Laranja Caos', '#ff6b1a', 10),
  ('a1000001-0000-4000-8000-000000000001', 'G', 'Branco Ruído', '#f0f0f0', 10),
  ('a1000001-0000-4000-8000-000000000001', 'GG', 'Preto Obsessão', '#0d0d0d', 10),
  ('a1000001-0000-4000-8000-000000000001', 'GG', 'Laranja Caos', '#ff6b1a', 10),
  ('a1000001-0000-4000-8000-000000000001', 'GG', 'Branco Ruído', '#f0f0f0', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000002-0000-4000-8000-000000000002', 'PP', 'Preto Abissal', '#0d0d0d', 10),
  ('a1000002-0000-4000-8000-000000000002', 'PP', 'Verde Neon', '#39ff14', 10),
  ('a1000002-0000-4000-8000-000000000002', 'P', 'Preto Abissal', '#0d0d0d', 10),
  ('a1000002-0000-4000-8000-000000000002', 'P', 'Verde Neon', '#39ff14', 10),
  ('a1000002-0000-4000-8000-000000000002', 'M', 'Preto Abissal', '#0d0d0d', 10),
  ('a1000002-0000-4000-8000-000000000002', 'M', 'Verde Neon', '#39ff14', 10),
  ('a1000002-0000-4000-8000-000000000002', 'G', 'Preto Abissal', '#0d0d0d', 10),
  ('a1000002-0000-4000-8000-000000000002', 'G', 'Verde Neon', '#39ff14', 10),
  ('a1000002-0000-4000-8000-000000000002', 'GG', 'Preto Abissal', '#0d0d0d', 10),
  ('a1000002-0000-4000-8000-000000000002', 'GG', 'Verde Neon', '#39ff14', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000003-0000-4000-8000-000000000003', '35-37', 'Preto Total', '#0d0d0d', 10),
  ('a1000003-0000-4000-8000-000000000003', '35-37', 'Laranja Fogo', '#ff6b1a', 10),
  ('a1000003-0000-4000-8000-000000000003', '35-37', 'Roxo Neon', '#a855f7', 10),
  ('a1000003-0000-4000-8000-000000000003', '38-40', 'Preto Total', '#0d0d0d', 10),
  ('a1000003-0000-4000-8000-000000000003', '38-40', 'Laranja Fogo', '#ff6b1a', 10),
  ('a1000003-0000-4000-8000-000000000003', '38-40', 'Roxo Neon', '#a855f7', 10),
  ('a1000003-0000-4000-8000-000000000003', '41-43', 'Preto Total', '#0d0d0d', 10),
  ('a1000003-0000-4000-8000-000000000003', '41-43', 'Laranja Fogo', '#ff6b1a', 10),
  ('a1000003-0000-4000-8000-000000000003', '41-43', 'Roxo Neon', '#a855f7', 10),
  ('a1000003-0000-4000-8000-000000000003', '44-46', 'Preto Total', '#0d0d0d', 10),
  ('a1000003-0000-4000-8000-000000000003', '44-46', 'Laranja Fogo', '#ff6b1a', 10),
  ('a1000003-0000-4000-8000-000000000003', '44-46', 'Roxo Neon', '#a855f7', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000004-0000-4000-8000-000000000004', 'PP', 'Preto Noite', '#0d0d0d', 10),
  ('a1000004-0000-4000-8000-000000000004', 'PP', 'Cinza Asfalto', '#4a4a4a', 10),
  ('a1000004-0000-4000-8000-000000000004', 'P', 'Preto Noite', '#0d0d0d', 10),
  ('a1000004-0000-4000-8000-000000000004', 'P', 'Cinza Asfalto', '#4a4a4a', 10),
  ('a1000004-0000-4000-8000-000000000004', 'M', 'Preto Noite', '#0d0d0d', 10),
  ('a1000004-0000-4000-8000-000000000004', 'M', 'Cinza Asfalto', '#4a4a4a', 10),
  ('a1000004-0000-4000-8000-000000000004', 'G', 'Preto Noite', '#0d0d0d', 10),
  ('a1000004-0000-4000-8000-000000000004', 'G', 'Cinza Asfalto', '#4a4a4a', 10),
  ('a1000004-0000-4000-8000-000000000004', 'GG', 'Preto Noite', '#0d0d0d', 10),
  ('a1000004-0000-4000-8000-000000000004', 'GG', 'Cinza Asfalto', '#4a4a4a', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000005-0000-4000-8000-000000000005', 'PP', 'Preto Stealth', '#0d0d0d', 10),
  ('a1000005-0000-4000-8000-000000000005', 'PP', 'Laranja Alerta', '#ff6b1a', 10),
  ('a1000005-0000-4000-8000-000000000005', 'P', 'Preto Stealth', '#0d0d0d', 10),
  ('a1000005-0000-4000-8000-000000000005', 'P', 'Laranja Alerta', '#ff6b1a', 10),
  ('a1000005-0000-4000-8000-000000000005', 'M', 'Preto Stealth', '#0d0d0d', 10),
  ('a1000005-0000-4000-8000-000000000005', 'M', 'Laranja Alerta', '#ff6b1a', 10),
  ('a1000005-0000-4000-8000-000000000005', 'G', 'Preto Stealth', '#0d0d0d', 10),
  ('a1000005-0000-4000-8000-000000000005', 'G', 'Laranja Alerta', '#ff6b1a', 10),
  ('a1000005-0000-4000-8000-000000000005', 'GG', 'Preto Stealth', '#0d0d0d', 10),
  ('a1000005-0000-4000-8000-000000000005', 'GG', 'Laranja Alerta', '#ff6b1a', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000006-0000-4000-8000-000000000006', 'Único', 'Preto', '#0d0d0d', 10),
  ('a1000006-0000-4000-8000-000000000006', 'Único', 'Branco', '#f0f0f0', 10),
  ('a1000006-0000-4000-8000-000000000006', 'Único', 'Laranja', '#ff6b1a', 10);

-- Street variants
INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000007-0000-4000-8000-000000000007', 'PP', 'Preto Urbano', '#0d0d0d', 10),
  ('a1000007-0000-4000-8000-000000000007', 'PP', 'Verde Militar', '#4a5e3a', 10),
  ('a1000007-0000-4000-8000-000000000007', 'PP', 'Cinza Concreto', '#6b6b6b', 10),
  ('a1000007-0000-4000-8000-000000000007', 'P', 'Preto Urbano', '#0d0d0d', 10),
  ('a1000007-0000-4000-8000-000000000007', 'P', 'Verde Militar', '#4a5e3a', 10),
  ('a1000007-0000-4000-8000-000000000007', 'P', 'Cinza Concreto', '#6b6b6b', 10),
  ('a1000007-0000-4000-8000-000000000007', 'M', 'Preto Urbano', '#0d0d0d', 10),
  ('a1000007-0000-4000-8000-000000000007', 'M', 'Verde Militar', '#4a5e3a', 10),
  ('a1000007-0000-4000-8000-000000000007', 'M', 'Cinza Concreto', '#6b6b6b', 10),
  ('a1000007-0000-4000-8000-000000000007', 'G', 'Preto Urbano', '#0d0d0d', 10),
  ('a1000007-0000-4000-8000-000000000007', 'G', 'Verde Militar', '#4a5e3a', 10),
  ('a1000007-0000-4000-8000-000000000007', 'G', 'Cinza Concreto', '#6b6b6b', 10),
  ('a1000007-0000-4000-8000-000000000007', 'GG', 'Preto Urbano', '#0d0d0d', 10),
  ('a1000007-0000-4000-8000-000000000007', 'GG', 'Verde Militar', '#4a5e3a', 10),
  ('a1000007-0000-4000-8000-000000000007', 'GG', 'Cinza Concreto', '#6b6b6b', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000008-0000-4000-8000-000000000008', 'PP', 'Preto Manifesto', '#0d0d0d', 10),
  ('a1000008-0000-4000-8000-000000000008', 'PP', 'Cinza Tempestade', '#555555', 10),
  ('a1000008-0000-4000-8000-000000000008', 'PP', 'Lime Neon', '#a3e635', 10),
  ('a1000008-0000-4000-8000-000000000008', 'P', 'Preto Manifesto', '#0d0d0d', 10),
  ('a1000008-0000-4000-8000-000000000008', 'P', 'Cinza Tempestade', '#555555', 10),
  ('a1000008-0000-4000-8000-000000000008', 'P', 'Lime Neon', '#a3e635', 10),
  ('a1000008-0000-4000-8000-000000000008', 'M', 'Preto Manifesto', '#0d0d0d', 10),
  ('a1000008-0000-4000-8000-000000000008', 'M', 'Cinza Tempestade', '#555555', 10),
  ('a1000008-0000-4000-8000-000000000008', 'M', 'Lime Neon', '#a3e635', 10),
  ('a1000008-0000-4000-8000-000000000008', 'G', 'Preto Manifesto', '#0d0d0d', 10),
  ('a1000008-0000-4000-8000-000000000008', 'G', 'Cinza Tempestade', '#555555', 10),
  ('a1000008-0000-4000-8000-000000000008', 'G', 'Lime Neon', '#a3e635', 10),
  ('a1000008-0000-4000-8000-000000000008', 'GG', 'Preto Manifesto', '#0d0d0d', 10),
  ('a1000008-0000-4000-8000-000000000008', 'GG', 'Cinza Tempestade', '#555555', 10),
  ('a1000008-0000-4000-8000-000000000008', 'GG', 'Lime Neon', '#a3e635', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a1000009-0000-4000-8000-000000000009', '36', 'Preto Tático', '#0d0d0d', 10),
  ('a1000009-0000-4000-8000-000000000009', '36', 'Caqui Deserto', '#c2a978', 10),
  ('a1000009-0000-4000-8000-000000000009', '38', 'Preto Tático', '#0d0d0d', 10),
  ('a1000009-0000-4000-8000-000000000009', '38', 'Caqui Deserto', '#c2a978', 10),
  ('a1000009-0000-4000-8000-000000000009', '40', 'Preto Tático', '#0d0d0d', 10),
  ('a1000009-0000-4000-8000-000000000009', '40', 'Caqui Deserto', '#c2a978', 10),
  ('a1000009-0000-4000-8000-000000000009', '42', 'Preto Tático', '#0d0d0d', 10),
  ('a1000009-0000-4000-8000-000000000009', '42', 'Caqui Deserto', '#c2a978', 10),
  ('a1000009-0000-4000-8000-000000000009', '44', 'Preto Tático', '#0d0d0d', 10),
  ('a1000009-0000-4000-8000-000000000009', '44', 'Caqui Deserto', '#c2a978', 10),
  ('a1000009-0000-4000-8000-000000000009', '46', 'Preto Tático', '#0d0d0d', 10),
  ('a1000009-0000-4000-8000-000000000009', '46', 'Caqui Deserto', '#c2a978', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a100000a-0000-4000-8000-00000000000a', 'PP', 'Preto Absoluto', '#0d0d0d', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'PP', 'Off-White', '#f5f0e8', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'P', 'Preto Absoluto', '#0d0d0d', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'P', 'Off-White', '#f5f0e8', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'M', 'Preto Absoluto', '#0d0d0d', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'M', 'Off-White', '#f5f0e8', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'G', 'Preto Absoluto', '#0d0d0d', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'G', 'Off-White', '#f5f0e8', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'GG', 'Preto Absoluto', '#0d0d0d', 10),
  ('a100000a-0000-4000-8000-00000000000a', 'GG', 'Off-White', '#f5f0e8', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a100000b-0000-4000-8000-00000000000b', 'P/M', 'Preto/Lime', '#0d0d0d', 10),
  ('a100000b-0000-4000-8000-00000000000b', 'P/M', 'Bege/Preto', '#d4c5a9', 10),
  ('a100000b-0000-4000-8000-00000000000b', 'G/GG', 'Preto/Lime', '#0d0d0d', 10),
  ('a100000b-0000-4000-8000-00000000000b', 'G/GG', 'Bege/Preto', '#d4c5a9', 10);

INSERT INTO public.product_variants (product_id, size, color_name, color_hex, stock_quantity) VALUES
  ('a100000c-0000-4000-8000-00000000000c', 'Único', 'Preto Noturno', '#0d0d0d', 10),
  ('a100000c-0000-4000-8000-00000000000c', 'Único', 'Verde Tático', '#4a5e3a', 10);
