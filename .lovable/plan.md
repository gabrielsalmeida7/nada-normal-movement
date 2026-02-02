
# Plano: Mascote Interativo Correndo Atras do Cursor

## Objetivo
Adicionar o mascote "Nada Normal" como um elemento interativo que segue o cursor do mouse pela pagina inteira, criando uma experiencia divertida e unica que reforça a identidade da marca.

---

## Comportamento do Mascote

O mascote tera os seguintes comportamentos:

1. **Segue o cursor** - O mascote se move suavemente em direcao a posicao do mouse
2. **Efeito de "corrida"** - Pequena oscilacao/bounce enquanto se move
3. **Espelhamento** - Quando o cursor esta a esquerda do mascote, ele vira para a esquerda (e vice-versa)
4. **Delay intencional** - Movimento com easing para parecer que esta "perseguindo" o cursor
5. **Z-index alto** - Sempre visivel acima de outros elementos
6. **Pointer-events none** - Nao interfere com cliques e interacoes

---

## Novo Componente: RunningMascot.tsx

Criar um novo componente em `src/components/RunningMascot.tsx`:

```tsx
// Funcionalidades principais:
- useState para posicao X e Y do mascote
- useEffect para listener de mousemove no window
- framer-motion animate para movimento suave com spring
- Logica de flip horizontal baseada na direcao do movimento
- Animacao de "bounce" constante para simular corrida
```

### Estrutura do Componente

```text
+--------------------------------------------------+
|  RunningMascot Component                          |
|                                                   |
|  State:                                           |
|  - mousePosition: { x, y }                        |
|  - mascotPosition: { x, y }                       |
|  - isFlipped: boolean (direcao)                   |
|                                                   |
|  Logic:                                           |
|  - Listener global de mousemove                   |
|  - Calculo de direcao para flip                   |
|  - Animacao spring para movimento suave           |
|                                                   |
|  Render:                                          |
|  - motion.img com position fixed                  |
|  - transform: scaleX(-1) quando flipped           |
|  - animate: y oscillation para efeito corrida     |
+--------------------------------------------------+
```

---

## Implementacao Tecnica

### 1. Copiar Imagem do Mascote

Copiar a imagem enviada para o projeto:
```
user-uploads://Vector_1.png -> src/assets/mascot-running.png
```

### 2. Criar Componente RunningMascot

**Arquivo:** `src/components/RunningMascot.tsx`

```tsx
import { useState, useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import mascotImage from "@/assets/mascot-running.png";

export const RunningMascot = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Springs para movimento suave
  const springConfig = { damping: 25, stiffness: 120 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Atualiza posicao do mouse
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Determina direcao do flip
      if (e.clientX > x.get() + 50) setIsFlipped(false);
      if (e.clientX < x.get() - 50) setIsFlipped(true);
      
      // Atualiza posicao alvo com offset
      x.set(e.clientX - 60);
      y.set(e.clientY - 60);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);
  
  return (
    <motion.img
      src={mascotImage}
      alt="Mascote Nada Normal"
      className="fixed pointer-events-none z-50 w-24 h-auto"
      style={{ 
        x, 
        y,
        scaleX: isFlipped ? -1 : 1
      }}
      animate={{
        y: [0, -8, 0], // Bounce de corrida
        rotate: isFlipped ? [-3, 3, -3] : [3, -3, 3]
      }}
      transition={{
        y: { duration: 0.3, repeat: Infinity },
        rotate: { duration: 0.3, repeat: Infinity }
      }}
    />
  );
};
```

### 3. Adicionar ao Index.tsx

```tsx
import { RunningMascot } from "@/components/RunningMascot";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <RunningMascot />
      <Header />
      {/* ... resto do conteudo */}
    </div>
  );
};
```

---

## Detalhes de Animacao

| Propriedade | Valor | Proposito |
|-------------|-------|-----------|
| `damping` | 25 | Controla a "resistencia" do movimento |
| `stiffness` | 120 | Velocidade de resposta ao cursor |
| Bounce Y | -8px | Simula o movimento de corrida |
| Rotate | ±3° | Balanco natural do corpo |
| Duration | 0.3s | Ciclo rapido para parecer correndo |

### Comportamento Visual

```text
Cursor se move para a direita:
     CURSOR -->
              
        🏃 (mascote corre atras)
        
Cursor se move para a esquerda:
<-- CURSOR
              
    (mascote vira) 🏃
```

---

## Arquivos a Modificar/Criar

| Arquivo | Acao |
|---------|------|
| src/assets/mascot-running.png | Criar (copiar imagem) |
| src/components/RunningMascot.tsx | Criar novo componente |
| src/pages/Index.tsx | Adicionar componente |

---

## Consideracoes de UX

1. **Performance**: Usar `useSpring` do framer-motion para animacoes GPU-accelerated
2. **Acessibilidade**: `pointer-events: none` garante que nao interfira com navegacao
3. **Mobile**: Em dispositivos touch, mascote pode ficar estatico ou ter comportamento alternativo (toque para mover)
4. **Tamanho**: 96px (w-24) e suficiente para ser visivel sem atrapalhar

---

## Opcao Extra: Mascote Aparece Ocasionalmente

Se preferir algo menos constante, podemos fazer o mascote:
- Aparecer de um lado da tela e correr ate o outro
- Surgir em intervalos aleatorios
- Correr apenas quando o usuario rola a pagina

---

## Resultado Esperado

Um mascote animado e divertido que:
- Segue o cursor do mouse com movimento suave
- Vira para a direcao correta do movimento
- Tem animacao de corrida constante (bounce + rotate)
- Nao interfere com a navegacao do site
- Reforça a identidade "Nada Normal" de forma interativa e memorável
