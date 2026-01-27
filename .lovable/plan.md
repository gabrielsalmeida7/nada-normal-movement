
# Plano: Identidade Visual Impactante "Nada Normal"

## Objetivo
Tornar o site mais impactante e vibrante, adicionando cores neon (azul neon, roxo neon, verde neon), uma fonte mais forte e legível, e espalhando os elementos visuais da marca pelo site com logos maiores.

---

## 1. Configuracao de Cores Neon Vibrantes

### Arquivo: `src/index.css`
Adicionar novas variaveis de cor neon mais intensas:
- `--nn-blue-neon`: 210 100% 55% (azul neon vibrante)
- `--nn-purple-neon`: 270 100% 60% (roxo neon intenso)
- `--nn-green-neon`: 140 100% 50% (verde neon)

Atualizar o esquema de cores primarias para usar roxo neon como primary e azul neon como secondary.

### Arquivo: `tailwind.config.ts`
Adicionar as novas cores ao tema:
- `nn-blue-neon`
- `nn-purple-neon`
- `nn-green-neon`

Adicionar novos gradientes neon para efeitos de destaque.

---

## 2. Fonte Mais Impactante e Legivel

### Arquivo: `src/index.css`
Trocar a fonte "Anton" por "Bebas Neue" ou "Teko" - fontes que sao:
- Mais impactantes e modernas
- Melhor legibilidade em tamanhos variados
- Variedade de pesos (regular, bold)

Importar a nova fonte via Google Fonts:
```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&display=swap');
```

### Arquivo: `tailwind.config.ts`
Atualizar a familia de fontes display para usar a nova fonte.

---

## 3. Aumentar Logos no Header e Footer (50% maior)

### Arquivo: `src/components/Header.tsx`
- Alterar altura da logo de `h-[84px]` para `h-[126px]` (50% maior)
- Ajustar altura do header de `h-20` para `h-24` para acomodar

### Arquivo: `src/components/Footer.tsx`
- Alterar altura da logo de `h-[120px]` para `h-[180px]` (50% maior)

---

## 4. Adicionar Imagens da Marca Espalhadas pelo Site

### 4.1 Copiar as novas imagens para o projeto
Copiar todas as imagens enviadas para `public/lovable-uploads/`:
- `MaoNN.png` - Maos com sinal de rock e "NN"
- `NN.png` - Escudo com sapinho e "NN"
- `NN1.png` - Logo circular com sapinho
- `NNRaio.png` - Logo com raio amarelo e sapinho
- `Norm.png` - Grafitti com sapinho

### 4.2 Arquivo: `src/components/HeroSection.tsx`
Adicionar elementos de marca flutuantes/decorativos:
- Imagem `NNRaio.png` no canto direito com efeito de flutuacao
- Imagem `MaoNN.png` no lado esquerdo como elemento decorativo
- Aplicar animacoes de float e glow

### 4.3 Arquivo: `src/components/CategorySection.tsx`
- Adicionar `NN.png` (escudo) como elemento decorativo entre as categorias ou no header da secao
- Usar efeito de parallax leve

### 4.4 Arquivo: `src/components/PillarsSection.tsx`
- Adicionar `NN1.png` (logo circular) como watermark no background
- Ou como elemento visual entre os pilares

### 4.5 Arquivo: `src/components/ProductsSection.tsx`
- Adicionar `MaoNN.png` como elemento flutuante
- Usar como badge/selo de destaque

### 4.6 Arquivo: `src/components/CommunitySection.tsx`
- Adicionar `Norm.png` (grafitti) como elemento de arte urbana
- Integrar no grid de imagens ou como overlay

---

## 5. Atualizar Componentes com Cores Vibrantes

### Arquivo: `src/components/HeroSection.tsx`
- Trocar gradientes de background para usar roxo e azul neon
- Atualizar marquee para cores mais vibrantes
- Adicionar efeitos de glow neon nos textos principais

### Arquivo: `src/components/CategorySection.tsx`
- Atualizar cores de destaque para azul/roxo/verde neon
- Hover effects com brilho neon

### Arquivo: `src/components/PillarsSection.tsx`
- Atualizar paleta dos pilares para cores neon
- Adicionar efeitos de brilho nos icones

### Arquivo: `src/components/ProductsSection.tsx`
- Tags de produtos com cores neon mais vibrantes
- Hover effects com glow

### Arquivo: `src/components/CommunitySection.tsx`
- Gradientes de background com cores neon
- Bordas e destaques em cores vibrantes

### Arquivo: `src/components/Footer.tsx`
- Borda superior com gradiente neon
- Efeitos de hover nos links

### Arquivo: `src/components/ui/button.tsx`
- Atualizar variantes de botoes para usar cores neon
- Adicionar novos efeitos de glow com roxo/azul neon

---

## 6. Adicionar Efeitos Visuais Extras

### Arquivo: `src/index.css`
Adicionar novas classes utilitarias:
- `.shadow-neon-purple`: Box-shadow com roxo neon
- `.shadow-neon-blue`: Box-shadow com azul neon
- `.shadow-neon-green`: Box-shadow com verde neon
- `.bg-gradient-neon-purple`: Gradiente com roxo e azul neon
- `.glow-text`: Efeito de texto brilhante
- Animacoes de pulse mais intensas

---

## Resumo Visual das Mudancas

```text
+----------------------------------+
|           ANTES                  |
+----------------------------------+
| - Cores: Rosa, Ciano, Amarelo    |
| - Fonte: Anton                   |
| - Logo: 84px header, 120px footer|
| - Poucas imagens de marca        |
+----------------------------------+

+----------------------------------+
|           DEPOIS                 |
+----------------------------------+
| - Cores: Azul/Roxo/Verde NEON    |
| - Fonte: Bebas Neue (impactante) |
| - Logo: 126px header, 180px footer|
| - 5 imagens espalhadas pelo site |
| - Efeitos de glow e brilho       |
+----------------------------------+
```

---

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/index.css` | Nova fonte, novas cores neon, efeitos de glow |
| `tailwind.config.ts` | Adicionar cores neon e gradientes |
| `src/components/Header.tsx` | Logo 50% maior |
| `src/components/Footer.tsx` | Logo 50% maior |
| `src/components/HeroSection.tsx` | Cores neon, imagens de marca |
| `src/components/CategorySection.tsx` | Cores neon, imagem de marca |
| `src/components/PillarsSection.tsx` | Cores neon, imagem de marca |
| `src/components/ProductsSection.tsx` | Cores neon, imagem de marca |
| `src/components/CommunitySection.tsx` | Cores neon, imagem de marca |
| `src/components/ui/button.tsx` | Novas variantes com cores neon |

---

## Arquivos Novos

Copiar as 5 imagens para `public/lovable-uploads/`:
- `MaoNN.png`
- `NN.png`
- `NN1.png`
- `NNRaio.png`
- `Norm.png`
