
# Plano: Remover Scroll Vertical da Pagina Em Breve

## Problema Atual
A pagina atual usa `min-h-screen` que permite que o conteudo ultrapasse a altura da tela, causando scroll vertical.

## Solucao

Alterar o layout para que todo o conteudo fique fixo dentro da viewport (100vh), sem possibilidade de scroll.

---

## Alteracoes no Arquivo

**Arquivo:** `src/pages/ComingSoon.tsx`

### 1. Container Principal (linha 56)
Trocar `min-h-screen` por `h-screen` e adicionar `overflow-hidden`:
```
De: <div className="min-h-screen bg-background overflow-hidden relative">
Para: <div className="h-screen bg-background overflow-hidden relative">
```

### 2. Container do Conteudo (linha 101)
Trocar `min-h-screen` por `h-full` para ocupar toda a altura disponivel:
```
De: <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
Para: <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 py-4">
```

### 3. Reducao de Espacamentos para Caber na Tela
Ajustar margens e tamanhos para garantir que tudo caiba em telas menores:

| Elemento | Antes | Depois |
|----------|-------|--------|
| Logo | `mb-6` | `mb-3 md:mb-6` |
| Titulo | `mb-2` | `mb-1` |
| Data | `mb-8` | `mb-4 md:mb-6` |
| Pista | `mb-8` | `mb-4 md:mb-6` |
| Countdown | `mb-8` | `mb-4 md:mb-6` |
| Countdown boxes | `w-16 h-16 md:w-24 md:h-24` | `w-14 h-14 md:w-20 md:h-20` |
| Manifesto | `mb-8` | `mb-3 md:mb-6` |

---

## Resultado Esperado

Uma pagina totalmente estatica que:
- Ocupa exatamente 100% da altura da viewport
- Nao permite scroll vertical
- Ajusta espacamentos responsivamente para caber em diferentes tamanhos de tela
- Mantem todos os elementos visiveis sem cortes
