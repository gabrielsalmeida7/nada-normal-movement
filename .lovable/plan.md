

# Redesign da Pagina Coming Soon

## Objetivo
Recriar a pagina Coming Soon para ficar fiel a imagem de referencia, com as seguintes mudancas principais:

## Mudancas Visuais

### 1. Titulo "Lancamento em Breve"
- Todo o titulo (ambas as linhas) tera gradiente neon (degradê completo), nao apenas "EM BREVE"
- Fonte Permanent Marker, tamanho grande, alinhado a esquerda
- Remover a separacao de cor entre as duas linhas

### 2. Escada Redesenhada
- Escada mais centralizada, partindo do centro-inferior em direcao ao canto superior-direito
- Visual 3D com degraus cinza/prata solidos (como na imagem), nao apenas linhas finas
- Cada degrau tera largura e altura visiveis, criando efeito de perspectiva
- Cores neutras (cinza claro/escuro) para os degraus

### 3. Mascote no Topo da Escada
- Mascote (Vector.png) posicionado no topo da escada, baseado no progresso do countdown
- Animacao de bounce/pulo
- Glow verde neon ao redor

### 4. Fogo Animado (NOVO)
- Chamas estilizadas nos cantos inferiores esquerdo e direito
- Cores laranja/amarelo como na imagem de referencia
- Efeito animado de fogo usando CSS keyframes (ondulacao, flicker, scale)
- Substituira os splashes SVG atuais
- Multiplas camadas de "chama" com opacidades e velocidades diferentes para efeito realista

### 5. Botao "NAO APERTE AQUI"
- Manter no canto inferior direito
- Estilo dourado/amarelo com borda preta grossa
- Exibe o countdown DD:HH:MM:SS dentro
- Remover o emoji e label separado - texto "NAO APERTE AQUI" dentro do proprio botao

### 6. Remover
- Frase "/1 O BAGUI AQUI E LOKO" - removida completamente
- Splashes SVG antigos substituidos pelo fogo animado

### 7. Layout Geral
- Logo NN no canto superior direito (manter)
- "NADA NORMAL" invertido no canto superior direito (manter)
- Links sociais centralizados na base (manter, mas simplificar icones)
- Texto manifesto abaixo do titulo (manter)

---

## Detalhes Tecnicos

### Arquivo a Modificar
- `src/pages/ComingSoon.tsx` - reescrita completa do componente

### Fogo Animado CSS
Sera criado com divs posicionados absolutamente nos cantos inferiores, usando:
- Multiplos elementos "chama" com border-radius organicos
- Cores em gradiente laranja para amarelo
- Keyframes de animacao: flicker (opacidade), sway (movimento lateral), grow (escala)
- Blur para suavizar as bordas das chamas
- 3-4 camadas por lado para profundidade visual

### Escada 3D
- Degraus como divs com background cinza e bordas
- Posicionamento diagonal com CSS absolute positioning
- Cada degrau com face horizontal (tread) e face vertical (riser) visiveis
- Aproximadamente 15-20 degraus visiveis

### Botao Countdown
- Background amarelo dourado, borda preta 2-3px
- Texto "NAO APERTE AQUI" como conteudo principal
- Countdown abaixo ou integrado
- Hover effect com translacao

### Responsividade
- Mobile: escada menor, titulo reduzido, fogo reduzido
- Tablet: layout intermediario
- Desktop: layout completo como na referencia

