
# Redesign da Pagina Coming Soon

## Conceito

Baseado na imagem de referencia, a pagina sera completamente redesenhada com um layout mais cinematografico: o mascote subindo uma escada diagonal ao centro, com splashes de tinta nos cantos inferiores, titulo grande a esquerda, texto manifesto abaixo, e o contador de tempo no lugar do botao "NAO APERTE AQUI" no canto inferior direito.

## Layout Principal (tela unica, sem scroll)

```text
+----------------------------------------------------------+
|  "NADA NORMAL" (invertido, topo direito)    Logo (topo)   |
|                                                           |
|  LANCAMENTO                        [Mascote]              |
|  EM BREVE                       /  subindo                |
|                               /   escada                  |
|  Texto manifesto:           /                             |
|  "Ser normal nunca        /                               |
|   mudou nada..."        /                                 |
|                       /                                   |
|                                                           |
|  [Splash tinta]              [Splash tinta]               |
|  /1 O BAGUI           f t ig   [CONTADOR TEMPO]           |
|  AQUI E LOKO                   DD:HH:MM:SS               |
+----------------------------------------------------------+
```

## Alteracoes Detalhadas

### 1. Fundo e Estilo Visual
- Fundo escuro `bg-[hsl(250,40%,8%)]` (igual a pagina principal)
- Remover particulas flutuantes atuais
- Adicionar splashes de tinta (splash1.svg e splash2.svg) nos cantos inferiores, estaticos, com cores neon vibrantes (verde, roxo, rosa) - sem laranja
- Usar as mesmas fontes (Bebas Neue) e estilos de cor da pagina principal

### 2. Titulo "Lancamento em Breve"
- H1 grande alinhado a esquerda com font-display (Bebas Neue)
- Cor branca para maximo contraste
- Tamanho: `text-6xl md:text-8xl lg:text-9xl`

### 3. Texto Manifesto
- Abaixo do titulo, alinhado a esquerda
- Texto: "Ser normal nunca mudou nada. Aqui, o conforto acaba. A aprovacao nao importa. E o automatico nao entra. Nada aqui foi criado pra pessoas normais, e isso e exatamente o ponto. Nada Normal, em breve."
- Cor cinza claro, tamanho medio

### 4. Escada com Mascote
- Escada diagonal desenhada com CSS (degraus em perspectiva) partindo do centro-inferior para o canto superior-direito
- Mascote (Vector.png) posicionado no topo da escada com animacao de bounce/pulo
- Posicao do mascote calculada com base no progresso (quanto mais perto do lancamento, mais alto na escada)

### 5. Contador de Tempo (substitui o botao "NAO APERTE AQUI")
- Posicionado no canto inferior direito
- Estilo de botao dourado/amarelo com borda, similar ao "NAO APERTE AQUI" da imagem
- Mostra o countdown: DD:HH:MM:SS
- Texto "NAO APERTE AQUI" como label acima, com o contador dentro do botao
- Fundo amarelo com borda, font-display

### 6. Logo NN
- Logo SVG no canto superior direito
- Texto "NADA NORMAL" invertido (rotate 180) no topo direito como elemento decorativo

### 7. Rodape
- Links sociais (Instagram, TikTok, email) centralizados na base
- Texto "/1 O BAGUI AQUI E LOKO" no canto inferior esquerdo como elemento decorativo

### 8. Splashes de Tinta
- Reutilizar splash1.svg e splash2.svg da pagina principal
- Posicionar nos cantos inferiores (esquerda e direita)
- Cores neon vibrantes: verde, roxo, rosa (sem laranja)
- Estaticos (sem animacao)
- Tamanho grande para impacto visual

---

## Detalhes Tecnicos

### Arquivo a Modificar
- `src/pages/ComingSoon.tsx` - reescrita completa

### Escada CSS
A escada sera construida com divs empilhadas em perspectiva, cada degrau sendo um retangulo com gradiente cinza, posicionados diagonalmente usando transform/translate.

### Mascote na Escada
- Posicao baseada no `progress` (0-100%)
- Animacao de bounce vertical continua
- Glow verde neon no mascote

### Contador no Botao
```tsx
<div className="bg-nn-yellow text-nn-black border-4 border-nn-black font-display px-8 py-4">
  NAO APERTE AQUI
  <div className="text-2xl">{days}:{hours}:{minutes}:{seconds}</div>
</div>
```

### Imports Necessarios
- Reutilizar `splash1.svg` e `splash2.svg` de `@/assets/`
- Manter `nn-logo.svg` e `Vector.png` (mascote)
- Adicionar `framer-motion` para animacoes do mascote

### Responsividade
- Layout flexbox com `flex-col lg:flex-row` para titulo/escada
- Escada reduz tamanho em mobile
- Titulo ajusta de `text-9xl` para `text-5xl` em mobile
