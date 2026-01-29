
# Plano: Pagina "Em Breve" com Countdown Visual

## Conceito
Criar uma pagina de lancamento com uma pista de corrida onde o mascote do Nada Normal percorre o caminho ate a linha de chegada (30/03/2026). O progresso do mascote sera calculado automaticamente baseado no tempo restante.

---

## Estrutura Visual da Pagina

```text
+------------------------------------------+
|            LOGO NADA NORMAL              |
|                                          |
|         EM BREVE - 30/03/2026            |
|                                          |
|   [===PISTA DE CORRIDA==================]|
|   START                    [MASCOTE]  END|
|   ▼                                    ▼ |
|   Hoje                           30/03/26|
|                                          |
|   DIAS: XX  HORAS: XX  MIN: XX  SEG: XX  |
|                                          |
|   "ONDE A SUA LOUCURA FAZ SENTIDO"       |
|                                          |
|   [ Instagram ]  [ TikTok ]  [ Email ]   |
+------------------------------------------+
```

---

## Arquivos a Criar/Modificar

### 1. Copiar Imagem do Mascote
- Copiar `user-uploads://NadaNormalPet.jpeg` para `public/lovable-uploads/NadaNormalPet.jpeg`

### 2. Criar Pagina ComingSoon.tsx
**Arquivo:** `src/pages/ComingSoon.tsx`

Componentes principais:
- **Header simplificado** com logo grande e centralizada
- **Titulo "EM BREVE"** com efeitos neon e glitch
- **Pista de corrida visual** representada como uma "track" horizontal
- **Mascote animado** que se move baseado no progresso do countdown
- **Linha de chegada** com a data 30/03/2026
- **Countdown digital** mostrando dias, horas, minutos, segundos
- **Frase do manifesto** "Onde a sua loucura faz sentido"
- **Links sociais** para manter contato antes do lancamento

### 3. Logica do Countdown e Progresso
```text
Data de Lancamento: 30 de Marco de 2026
Data de Inicio (referencia): Hoje (data atual)

Progresso = (Tempo Passado / Tempo Total) * 100%

O mascote tera sua posicao CSS calculada:
- left: 0% no inicio
- left: 100% no dia do lancamento
```

### 4. Atualizar Rotas
**Arquivo:** `src/App.tsx`
- Adicionar rota `/coming-soon` para a pagina de "Em Breve"
- Temporariamente redirecionar `/` para `/coming-soon` (opcional - voce decide)

---

## Detalhes Tecnicos

### Componente da Pista de Corrida
- Background escuro com linhas neon representando a pista
- Marcacoes ao longo da pista (km markers ou checkpoints)
- Efeitos de glow nas bordas (roxo/azul neon)
- Linha de chegada com padrao xadrez ou banner neon

### Animacao do Mascote
- Posicao horizontal calculada pelo countdown
- Leve animacao de "bounce" para parecer que esta correndo
- Sombra neon abaixo do mascote
- Efeito de "rastro" ou particulas atras

### Countdown Timer
- UseEffect com setInterval para atualizar a cada segundo
- Exibicao em formato brutalista com bordas neon
- Numeros grandes usando fonte Bebas Neue
- Efeito pulse nos segundos

### Elementos Visuais Extras
- Particulas flutuantes no background (estrelas/pontos neon)
- Imagens da marca espalhadas (MaoNN, NNRaio) como decoracao
- Gradientes animados no fundo

---

## Estrutura de Arquivos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `public/lovable-uploads/NadaNormalPet.jpeg` | Criar | Copiar mascote |
| `src/pages/ComingSoon.tsx` | Criar | Pagina principal do countdown |
| `src/App.tsx` | Editar | Adicionar rota da pagina |

---

## Responsividade

- **Mobile:** Pista vertical ou horizontal compactada, countdown empilhado
- **Tablet:** Layout intermediario
- **Desktop:** Pista horizontal completa com todos os elementos

---

## Codigo Exemplo da Logica de Progresso

```typescript
// Data de lancamento
const launchDate = new Date('2026-03-30T00:00:00');

// Data de inicio do countdown (ex: 60 dias antes)
const startDate = new Date('2026-01-29T00:00:00');

// Calcular progresso
const totalDuration = launchDate.getTime() - startDate.getTime();
const elapsed = Date.now() - startDate.getTime();
const progress = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);

// Posicao do mascote
const mascotPosition = `${progress}%`;
```

---

## Resultado Esperado

Uma pagina visualmente impactante que:
1. Mostra o mascote "correndo" em direcao ao lancamento
2. Atualiza em tempo real (a cada segundo)
3. Mantem a identidade visual neon da marca
4. Cria expectativa e engajamento para o lancamento
5. Permite que visitantes conhecam a marca antes do lancamento oficial
