

# Adaptar Tela Coming Soon ao Layout de Referencia

## O que muda

A tela atual tem o conteudo espalhado (titulo no topo-esquerda, logo no topo-direita, botao no canto inferior-direito). O layout de referencia centraliza tudo verticalmente no meio da tela, numa coluna unica.

## Novo Layout

O conteudo sera reorganizado numa coluna centralizada vertical e horizontalmente:

1. **Logo** - canto superior direito (manter como esta)
2. **"EM BREVE..."** - titulo centralizado, fonte Bowlby One SC
3. **"Nao e pra todo mundo."** - subtitulo em negrito, centralizado
4. **Manifesto** - texto menor centralizado abaixo
5. **Botao "NAO APERTE AQUI"** - o botao existente com contador, centralizado (substitui o "Quero acesso antecipado" da referencia)
6. **"Lancamento em:"** - label acima do contador
7. **Contador** - DD : HH : MM : SS centralizado
8. **Mascote** - imagem do mascote (`mascot-running.png`) na parte inferior
9. **Video de fundo** - manter

## Compatibilidade Mobile

Para resolver os problemas entre Android e iPhone:
- Usar `min-h-[100dvh]` em vez de `h-screen` (dynamic viewport height resolve a diferenca de barra de navegacao entre Android e iOS)
- Usar `safe-area-inset` padding para lidar com notch do iPhone
- Ajustar tamanhos de fonte com clamp() ou classes responsivas adequadas
- Garantir que o scroll funcione caso o conteudo ultrapasse a tela em dispositivos menores
- Testar com viewport 390x844 (iPhone) e 360x800 (Android)

## Detalhes Tecnicos

### Arquivo editado: `src/pages/ComingSoon.tsx`

**Mudancas principais:**
- Trocar o container de `h-screen` para `min-h-[100dvh]` para compatibilidade cross-device
- Reorganizar o layout de `justify-between` (espalhado) para uma coluna centralizada com `items-center justify-center`
- Manter a logo rotativa no canto superior direito (posicao absoluta)
- Centralizar titulo, subtitulo, manifesto e botao em coluna
- Adicionar label "Lancamento em:" acima do contador
- Importar e exibir o mascote (`mascot-running.png`) na parte inferior da tela
- Adicionar padding com `env(safe-area-inset-*)` para iPhones com notch
- Ajustar tamanhos de fonte mobile (texto menor em telas < 375px)

### Arquivo editado: `src/index.css`

- Adicionar suporte a `100dvh` como fallback para navegadores que nao suportam

