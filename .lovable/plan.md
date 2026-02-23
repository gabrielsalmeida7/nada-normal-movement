
# Redesign Mobile da Pagina Coming Soon

## Objetivo
Redesenhar o layout mobile da pagina Coming Soon para ficar igual a imagem de referencia, mantendo o layout desktop inalterado. Tambem resolver inconsistencias de layout entre dispositivos Android e iPhone.

## O que muda (somente mobile, telas menores que 768px)

### Layout Atual (mobile)
- Conteudo espalhado nos cantos (titulo top-left, logo top-right, botao bottom-right)
- Video de fundo cobrindo tudo
- Texto do manifesto abaixo do titulo

### Novo Layout Mobile (baseado na referencia)
- Todo o conteudo centralizado verticalmente em coluna
- Logo badge pequena no canto superior direito
- Titulo "EM BREVE..." centralizado, grande
- Subtitulo "Nao e pra todo mundo." centralizado, em negrito
- Texto secundario "Se voce precisa de aprovacao, pode sair agora." centralizado
- Botao CTA "Quero acesso antecipado" com icone de raio, fundo gradiente rosa/magenta, centralizado
- Label "Lancamento em:" centralizado
- Contador regressivo em caixa com borda, centralizado (DD : HH : MM : SS)
- Mascote correndo (mascot-running.png) centralizado
- Efeito de escada/degraus escuros atras do mascote
- Efeito de fogo pixel art na parte inferior da tela
- Video de fundo escondido no mobile (fundo escuro solido) ou redimensionado para nao cortar

### Desktop (sem alteracoes)
- Mantem o layout atual com video de fundo, titulo no canto superior esquerdo, logo rotacionando no canto superior direito, botao do contador no canto inferior direito

## Detalhes Tecnicos

### Arquivo editado: `src/pages/ComingSoon.tsx`

1. **Video**: No mobile, o video fica escondido (`hidden md:block`) e o fundo escuro aparece. No desktop, continua como esta.

2. **Layout mobile centralizado**: Usar classes condicionais `md:` para separar mobile do desktop:
   - Mobile: `flex flex-col items-center justify-center text-center`
   - Desktop: manter o layout atual com `justify-between`

3. **Novos elementos mobile**:
   - Subtitulo "Nao e pra todo mundo." (visivel so no mobile)
   - Texto "Se voce precisa de aprovacao, pode sair agora." (visivel so no mobile)
   - Botao "Quero acesso antecipado" com link para WhatsApp (visivel so no mobile)
   - Label "Lancamento em:" acima do contador (visivel so no mobile)
   - Imagem do mascote (`mascot-running.png`) centralizada (visivel so no mobile)
   - Efeito de escada (CSS class `coming-soon-stairs` ja existe)
   - Efeito de fogo (CSS class `coming-soon-fire` ja existe)

4. **Contador no mobile**: Exibido em caixa com borda branca, centralizado, formato `DD : HH : MM : SS`

5. **Responsividade cross-device**: Usar unidades relativas (`vh`, `dvh`, porcentagens) e `min-h-[100dvh]` para garantir consistencia entre Android e iPhone (dynamic viewport height resolve a barra de navegacao do Safari/Chrome mobile)

### Arquivo editado: `src/index.css`
- Nenhuma alteracao necessaria - as classes `coming-soon-fire` e `coming-soon-stairs` ja existem

### Estrutura do layout mobile (de cima para baixo)
```text
+---------------------------+
|                    [logo] |
|                           |
|       EM BREVE...         |
|  Nao e pra todo mundo.    |
|  Se voce precisa de       |
|  aprovacao, pode sair...  |
|                           |
| [Quero acesso antecipado] |
|                           |
|     Lancamento em:        |
|    [ 37 : 19 : 02 ]      |
|                           |
|      [mascote]            |
|    ///escada///            |
|  ~~~~fogo~~~~             |
+---------------------------+
```
