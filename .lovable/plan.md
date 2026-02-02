
# Plano: Formas Organicas "Nada Normal"

## Objetivo
Transformar todos os elementos retangulares e quadrados do site em formas organicas, fluidas e assimétricas - quebrando completamente com o padrão convencional de design. Elementos como cards de categorias, pilares, produtos e ícones da comunidade vão ter bordas irregulares, curvas inesperadas e formatos "estranhos" que refletem a identidade "Nada Normal".

---

## Estrategia de Implementacao

### Tecnica Principal: CSS clip-path + border-radius assimetrico

Usar combinacoes de `border-radius` com valores diferentes em cada canto e `clip-path` com formas organicas para criar contornos nao-convencionais.

---

## Novas Classes CSS (src/index.css)

Adicionar classes utilitarias para formas organicas:

```css
/* Formas organicas irregulares */
.shape-blob-1 {
  border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
}

.shape-blob-2 {
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
}

.shape-blob-3 {
  border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%;
}

.shape-blob-4 {
  border-radius: 70% 30% 50% 50% / 30% 60% 40% 70%;
}

/* Cards organicos */
.card-organic-1 {
  border-radius: 10px 40px 10px 40px;
}

.card-organic-2 {
  border-radius: 40px 10px 40px 10px;
}

.card-organic-3 {
  border-radius: 5px 30px 50px 15px;
}

.card-organic-4 {
  border-radius: 50px 15px 5px 35px;
}

/* Botoes organicos */
.btn-organic {
  border-radius: 20px 5px 20px 5px;
}
```

---

## Alteracoes por Componente

### 1. CategorySection.tsx

**Antes:** Cards retangulares com `border-4`
**Depois:** Cada categoria com forma organica diferente

| Categoria | Forma |
|-----------|-------|
| Running | `border-radius: 10px 60px 10px 60px` |
| Street | `border-radius: 60px 10px 60px 10px` |
| Social | `border-radius: 40px 15px 50px 10px` |

As imagens internas tambem terao `overflow: hidden` com a mesma mascara organica.

### 2. PillarsSection.tsx

**Antes:** Cards quadrados com bordas retas
**Depois:** Cada pilar com formato blob unico

| Pilar | Forma |
|-------|-------|
| Obsessao | `shape-blob-1` |
| Autenticidade | `shape-blob-2` |
| Performance | `shape-blob-3` |
| Caos Coletivo | `shape-blob-4` |

Os icones internos tambem terao formatos blob em vez de quadrados.

### 3. ProductsSection.tsx

**Antes:** Cards de produto quadrados
**Depois:** Formatos organicos alternados

| Produto | Forma |
|---------|-------|
| 1 | `card-organic-1` |
| 2 | `card-organic-2` |
| 3 | `card-organic-3` |
| 4 | `card-organic-4` |

Tags de produto tambem com bordas organicas (`border-radius: 15px 3px 15px 3px`).

Botoes de acao (carrinho, favorito, visualizar) com formatos blob.

### 4. CommunitySection.tsx

**Antes:** Icones quadrados de 12x12
**Depois:** Icones com formato blob

Cada feature icon com `shape-blob-X` diferente.

Imagens do grid tambem com bordas organicas alternadas.

### 5. Button.tsx

**Antes:** Bordas retas
**Depois:** Variantes organicas

Adicionar propriedade de `border-radius` assimetrico nas variantes existentes ou criar novas variantes organicas.

---

## Detalhes Tecnicos

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| src/index.css | Adicionar classes de formas organicas |
| src/components/CategorySection.tsx | Aplicar formas organicas nos cards |
| src/components/PillarsSection.tsx | Cards e icones com formato blob |
| src/components/ProductsSection.tsx | Cards de produto organicos |
| src/components/CommunitySection.tsx | Icones e imagens organicas |
| src/components/ui/button.tsx | Border-radius assimetrico |

### Exemplo de Implementacao (Card de Categoria)

```tsx
// Antes
className="border-4 border-border"

// Depois - com estilo inline para formas diferentes
style={{ borderRadius: '10px 60px 10px 60px' }}
className="border-4 border-border overflow-hidden"
```

### Exemplo de Implementacao (Icone de Pilar)

```tsx
// Antes
className="w-16 h-16 bg-nn-orange"

// Depois
className="w-16 h-16 bg-nn-orange shape-blob-1"
```

---

## Mapeamento Visual

Estrutura de formas organicas por secao:

```text
CATEGORIAS
+---------------------------+
|  /```\      ___           |
| (  R  )    /   \          |
|  \___/    ( St  )         |
|            \___/          |
|    _____                  |
|   /     ```\              |
|  (   So     )             |
|   \_______/               |
+---------------------------+

PILARES
+---------------------------+
|  (o)    /\    <->   {*}   |
|  blob   blob  blob  blob  |
+---------------------------+

PRODUTOS  
+---------------------------+
|  /--\   \--/   /-\   \-/  |
|  |  |   |  |   | |   | |  |
|  \--/   /--\   \-/   /-\  |
+---------------------------+
```

---

## Resultado Esperado

- Nenhum elemento com formato retangular ou quadrado perfeito
- Cada card/botao/icone com personalidade propria
- Visual que quebra completamente com padroes convencionais
- Identidade "Nada Normal" expressada atraves das formas
- Movimento visual atraves das curvas assimétricas
