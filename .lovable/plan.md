
# Plano: Redesign Visual do Hero e Pilares

## Resumo das Alteracoes

Sao 6 mudancas principais solicitadas:

1. **Fundo mais escuro** - trocar o fundo marrom/cinza por azul/roxo profundo para maior contraste
2. **Cores mais vibrantes e saturadas** nos elementos e logo
3. **Frase principal destacada** - "Nada aqui foi criado pra pessoas normais, e isso e exatamente o ponto."
4. **Splashes estaticos e mais coloridos** - remover laranja, adicionar verde vibrante, sem animacao de movimento
5. **Botao "NAO ENTRE!"** amarelo no header substituindo o "Entrar"
6. **Logo com movimento mais dinamico** no Hero
7. **4 Pilares renomeados** para: Resenha Total, Caos Organizado, Pertencimento, Descontrole

---

## 1. Fundo do Hero (HeroSection.tsx)

**Antes:** `bg-[hsl(260,15%,14%)]` (cinza-roxo acastanhado)
**Depois:** `bg-[hsl(250,40%,8%)]` (azul-roxo profundo e escuro)

Tambem ajustar os blobs de fundo para cores mais intensas (aumentar opacidade de /30 para /50).

## 2. Cores Mais Vibrantes (index.css)

Aumentar saturacao e luminosidade das variaveis CSS principais:

| Variavel | Antes | Depois |
|----------|-------|--------|
| --nn-purple-neon | 270 100% 60% | 270 100% 65% |
| --nn-pink | 330 100% 55% | 330 100% 60% |
| --nn-green-neon | 140 100% 50% | 140 100% 55% |
| --background | 260 15% 14% | 250 40% 8% |

## 3. Frase Principal Destacada (HeroSection.tsx)

Substituir o texto atual por:

> "Nada aqui foi criado pra pessoas normais, e isso e exatamente o ponto."

Com estilo mais impactante: fonte maior, cor neon, glow effect forte.

## 4. Splashes Estaticos (HeroSection.tsx)

- Remover todas as propriedades `animate` e `transition` dos 4 splashes
- Manter apenas posicao e tamanho (estaticos)
- Trocar o drop-shadow laranja por verde vibrante (`hsl(140,100%,55%)`)
- Aumentar saturacao dos outros drop-shadows

## 5. Botao "NAO ENTRE!" (Header.tsx)

Substituir o botao "Entrar" por:

```text
⚠️ NAO ENTRE!
```

- Fundo amarelo vibrante (`bg-nn-yellow`)
- Texto preto bold
- Icone de alerta (AlertTriangle do lucide)
- Efeito de pulse/glow para chamar atencao

## 6. Logo com Movimento Dinamico (HeroSection.tsx)

Ampliar a animacao da logo:
- Escala mais pronunciada: `[1, 1.08, 1]` (antes era 1.03)
- Rotacao mais ampla: `[-3, 3, -3]` (antes era -1 a 1)
- Adicionar efeito de "float" vertical: `y: [0, -15, 0]`
- Drop-shadow mais intenso com cores alternando entre roxo, rosa e verde

## 7. Pilares Renomeados (PillarsSection.tsx)

| Antes | Depois | Subtitulo | Descricao |
|-------|--------|-----------|-----------|
| Obsessao | Resenha Total | A zoeira nao para | Onde o treino vira festa e o sofrimento vira piada. A resenha e o combustivel. |
| Autenticidade | Caos Organizado | Metodo na loucura | Parece bagunca, mas cada passo e calculado. O caos e so a superficie. |
| Performance | Pertencimento | Sua tribo te espera | Aqui ninguem corre sozinho. A manada anormal e sua familia. |
| Caos Coletivo | Descontrole | Sem freio, sem limite | Quando voce solta o controle, descobre que nunca precisou dele. |

---

## Detalhes Tecnicos

### Arquivos a Modificar

| Arquivo | Alteracoes |
|---------|-----------|
| src/index.css | Cores mais vibrantes, fundo mais escuro |
| src/components/HeroSection.tsx | Fundo, frase, splashes estaticos, logo dinamica |
| src/components/Header.tsx | Botao "NAO ENTRE!" amarelo |
| src/components/PillarsSection.tsx | Renomear 4 pilares |

### Botao "NAO ENTRE!" - Detalhes

```tsx
<Button className="hidden md:flex bg-nn-yellow text-nn-black border-4 border-nn-black 
  hover:bg-nn-yellow/90 animate-pulse-glow font-display text-base tracking-wider
  rounded-[20px_5px_20px_5px]">
  <AlertTriangle size={18} />
  NAO ENTRE!
</Button>
```

### Logo Animacao Dinamica - Detalhes

```tsx
animate={{ 
  scale: [1, 1.08, 1],
  rotate: [-3, 3, -3],
  y: [0, -15, 0],
  filter: [
    "drop-shadow(0 0 40px hsl(270,100%,65%,0.7))",
    "drop-shadow(0 0 60px hsl(330,100%,60%,0.8))",
    "drop-shadow(0 0 40px hsl(140,100%,55%,0.7))"
  ]
}}
```

### Splashes Estaticos - Detalhes

Remover `animate` e `transition`, manter apenas:
```tsx
<img
  src={splash1}
  className="absolute -top-10 -left-16 w-28 sm:w-36 md:w-44 pointer-events-none"
  style={{ filter: "drop-shadow(0 0 30px hsl(270,100%,65%,0.6))" }}
/>
```

Trocar cores laranja por verde vibrante nos drop-shadows.

---

## Resultado Esperado

- Fundo azul/roxo profundo que destaca todos os elementos neon
- Cores mais vibrantes e saturadas em todo o site
- Frase de impacto destacada no Hero
- Splashes de tinta estaticos e coloridos (sem laranja, com verde)
- Botao provocativo "NAO ENTRE!" em amarelo chamativo
- Logo com movimento fluido e dinamico
- Pilares com nomes e descricoes atualizados
