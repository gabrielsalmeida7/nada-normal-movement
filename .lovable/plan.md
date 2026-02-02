
# Plano: Nova Pagina Home com Alto Contraste Visual

## Objetivo
Criar uma versao alternativa da pagina /home com um design radicalmente diferente, usando cores vibrantes de alto contraste (laranja, verde, amarelo) para representar a identidade "Nada Normal" - algo que quebra totalmente com o habitual.

---

## Sobre GitHub Branches

Como voce ja ativou o suporte a branches nas configuracoes da conta, poderemos trabalhar assim:

1. Apos aprovar este plano, crie uma nova branch no GitHub (ex: `home-v2-contraste`)
2. No Lovable, troque para essa branch usando o seletor no menu de configuracoes
3. Ai sim faremos as alteracoes nessa branch, mantendo a versao atual intacta na branch principal

---

## Nova Paleta de Cores - Alto Contraste

Novas cores a serem adicionadas ao sistema:

| Cor | HSL | Uso |
|-----|-----|-----|
| Laranja Neon | 25 100% 55% | Cor primaria impactante |
| Amarelo Neon | 54 100% 55% | Cor de destaque |
| Lima Neon | 80 100% 50% | Cor de acento alternativa |
| Vermelho Neon | 0 100% 55% | Cor de energia |

Essas cores serao combinadas de forma agressiva e nao-convencional.

---

## Alteracoes Principais

### 1. CSS Global (src/index.css)

Adicionar novas variaveis de cor e gradientes:

```css
--nn-orange: 25 100% 55%;
--nn-lime: 80 100% 50%;
--nn-red: 0 100% 55%;

--gradient-chaos-v2: linear-gradient(135deg, hsl(var(--nn-orange)), hsl(var(--nn-yellow)), hsl(var(--nn-green-neon)));
--gradient-fire-v2: linear-gradient(45deg, hsl(var(--nn-red)), hsl(var(--nn-orange)));
--gradient-tropical: linear-gradient(90deg, hsl(var(--nn-lime)), hsl(var(--nn-yellow)), hsl(var(--nn-orange)));
```

Criar novos estilos de glow e sombra para as cores quentes.

### 2. HeroSection (src/components/HeroSection.tsx)

Transformacao radical do Hero:

- **Fundo**: Trocar o gradiente escuro por blocos geometricos com cores vibrantes (laranja/amarelo/verde)
- **Logo no lugar do H1**: Substituir o texto "NADA NORMAL" pela imagem da logo do header
- **Layout Assimetrico**: Elementos posicionados de forma "caótica" mas intencional
- **Marquee**: Cores invertidas - fundo preto com texto em cores neon

Estrutura visual proposta:
```text
+------------------------------------------+
|  [HEADER]                                |
+------------------------------------------+
|                                          |
|   [Logo Grande Centralizada]             |
|   ========================               |
|                                          |
|   "Manifesto text..."                    |
|                                          |
|   [BTN Laranja]  [BTN Verde]             |
|                                          |
+------------------------------------------+
```

### 3. Secoes Secundarias

Aplicar o mesmo principio de alto contraste:

- **CategorySection**: Cards com bordas coloridas alternando laranja/amarelo/verde
- **PillarsSection**: Fundo com gradiente tropical, icones em cores contrastantes
- **ProductsSection**: Tags de produto em laranja/lima
- **CommunitySection**: Gradiente de cores quentes no fundo

### 4. Button Variants (src/components/ui/button.tsx)

Adicionar novas variantes de botao:

```typescript
heroV2: "bg-gradient-to-r from-nn-orange to-nn-yellow text-nn-black shadow-brutal ..."
chaosV2: "bg-nn-lime text-nn-black shadow-brutal ..."
fireV2: "bg-nn-red text-nn-white shadow-brutal ..."
```

---

## Detalhes Tecnicos

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/index.css | Adicionar novas variaveis CSS e classes |
| tailwind.config.ts | Registrar novas cores no tema |
| src/components/HeroSection.tsx | Redesign completo com logo |
| src/components/ui/button.tsx | Novas variantes |
| src/components/CategorySection.tsx | Aplicar novo esquema de cores |
| src/components/PillarsSection.tsx | Fundo e cores atualizados |
| src/components/ProductsSection.tsx | Tags e acentos atualizados |
| src/components/CommunitySection.tsx | Gradiente de cores quentes |
| src/components/Header.tsx | Adaptar bordas e hover states |
| src/components/Footer.tsx | Bordas e acentos em cores quentes |

### Logo do Header para Hero

A imagem atual do header e: `/lovable-uploads/954aa667-c5fd-44ca-b757-b6ae62dbdb1e.png`

Esta sera usada no Hero com tamanho grande e efeitos de glow em cores quentes.

---

## Efeitos Visuais Diferenciados

1. **Glow Laranja**: `text-shadow` e `box-shadow` em tons de laranja
2. **Glow Amarelo**: Para elementos de destaque secundario
3. **Bordas Animadas**: Alternando entre laranja/amarelo/verde
4. **Elementos Geometricos**: Formas abstratas flutuantes como decoracao

---

## Proximos Passos

1. **Voce cria a branch no GitHub** (ex: `home-v2-contraste`)
2. **Troca para a branch no Lovable** (Settings > GitHub > Branch Switching)
3. **Me avisa quando estiver pronto** e eu implemento todas as alteracoes
4. **Testamos e ajustamos** ate ficar do seu agrado
5. **Merge opcional** quando a versao estiver aprovada

---

## Resultado Esperado

Uma pagina que:
- Quebra completamente com padroes convencionais de design
- Usa cores vibrantes e contrastantes de forma intencional
- Transmite a essencia "Nada Normal" de forma visual agressiva
- Mantem a logo como elemento central de identidade
- E totalmente diferente da versao atual, preservada em outra branch
