

# Redesign Completo da Tela Coming Soon

Recriar a pagina Coming Soon para ficar identica a imagem de referencia do Canva.

## O que vai mudar

### 1. Escada 3D Realista
A escada atual e feita de linhas finas. Sera substituida por uma escada com degraus solidos cinza/prata com perspectiva 3D, partindo do centro-inferior e curvando em direcao ao canto superior-direito, exatamente como na imagem.

### 2. Fogo Animado nos Cantos Inferiores
Os splashes SVG atuais serao removidos e substituidos por chamas estilizadas laranja/amarelo nos dois cantos inferiores. O fogo tera efeito de crepitar usando animacoes CSS com multiplas camadas:
- Formas organicas com border-radius irregulares
- Cores em gradiente de laranja escuro para amarelo claro
- Animacoes de flicker (opacidade), sway (balanco lateral) e scale (crescimento)
- 4-5 camadas por lado para profundidade

### 3. Titulo com Degradê Completo
"Lancamento em Breve" - ambas as linhas terao o gradiente neon completo (nao apenas "EM BREVE"). Fonte grande, alinhado a esquerda.

### 4. Mascote Subindo a Escada
O mascote (Vector.png) sobe a escada conforme o countdown avanca. Ao chegar no topo, ele se "joga" em direcao ao botao "NAO APERTE AQUI" com uma animacao de pulo.

### 5. Botao "NAO APERTE AQUI"
- Retangulo amarelo/dourado com borda preta
- Texto "NAO APERTE AQUI" como conteudo principal do botao
- Countdown DD:HH:MM:SS integrado abaixo do texto
- Posicionado no canto inferior direito

### 6. Icone de Ampulheta
Na imagem de referencia, ha um icone de ampulheta grande no canto superior direito, abaixo do texto "NADA NORMAL" invertido. Sera adicionado usando Lucide (Hourglass icon).

### 7. Links Sociais
Icones de Facebook, Twitter/X e Instagram centralizados na parte inferior, entre as chamas.

### 8. Remover
- Frase "O BAGUI AQUI E LOKO" (como solicitado)
- Splashes SVG antigos
- Logo NN SVG atual (substituido pela ampulheta)

## Detalhes Tecnicos

### Arquivo modificado
- `src/pages/ComingSoon.tsx` - reescrita completa do componente

### Fogo CSS Animado
```text
Estrutura por lado:
  - 4-5 divs posicionadas absolutamente
  - Cada uma com border-radius organico diferente
  - Background: gradiente de #ff6600 para #ffcc00
  - Keyframes: flicker (0.3-0.8s), sway (1-2s), grow (1.5-3s)
  - Filter: blur(8-15px) para suavidade
  - Mix-blend-mode: screen para brilho
```

### Escada 3D
```text
  - ~20 degraus com divs solidas
  - Face horizontal (tread): cinza claro (#999)
  - Face vertical (riser): cinza escuro (#666)
  - Perspectiva com CSS transform ou posicionamento absoluto diagonal
  - Curvatura sutil partindo do centro-inferior para canto superior-direito
```

### Animacao do Mascote
```text
  - Posicao baseada no progresso do countdown
  - Bounce animation enquanto sobe
  - Quando progress >= 100%: animacao de pulo em direcao ao botao
  - Drop shadow verde neon
```

### Responsividade
- Mobile: escada e fogo menores, titulo reduzido
- Desktop: layout completo como na referencia

