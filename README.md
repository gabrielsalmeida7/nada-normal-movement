# Nada Normal - Movement

> **Não corremos para caber em planilhas. Corremos porque o silêncio do asfalto é o único lugar que entende nossa loucura. Ser comum é uma escolha. Nós escolhemos o oposto.**

## Sobre o Projeto

**Nada Normal** é mais que uma marca, é um movimento. Uma plataforma digital que conecta corredores que não se encaixam no padrão, que buscam autenticidade acima da conformidade e que transformam o sofrimento em superação.

Este projeto representa a presença digital do ecossistema Nada Normal, criado para quem:
- É **doido pelo que faz** (A Obsessão)
- É **doido na vida** (A Autenticidade)
- Está **fora da curva** (A Performance)
- Vive o **caos coletivo** (A Resenha Anormal)

## Manifesto

Ser "Nada Normal" é transformar o sofrimento em piada interna e o esforço individual em uma celebração coletiva. É ter a coragem de ser estranho em um mundo de cópias bem vestidas.

## Tecnologias Utilizadas

Este projeto foi construído com as seguintes tecnologias:

- **Vite** - Build tool e dev server de alta performance
- **React** - Biblioteca JavaScript para construção de interfaces
- **TypeScript** - Superset do JavaScript com tipagem estática
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes de UI construídos com Radix UI
- **React Router** - Roteamento para aplicações React
- **Framer Motion** - Biblioteca de animações
- **Vitest** - Framework de testes

## Como Executar o Projeto

### Pré-requisitos

- Node.js 22.18+ ou 24+ (ambiente validado com 24.19.0) - [Instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- npm, usando o lockfile oficial `package-lock.json`

### Instalação

```sh
# Clone o repositório
git clone <URL_DO_REPOSITORIO>

# Navegue até o diretório do projeto
cd nada-normal-movement

# Instale as dependências
npm install
```

### Desenvolvimento

```sh
# Inicie o servidor de desenvolvimento
npm run dev
```

O projeto estará disponível em `http://localhost:8080` (ou outra porta indicada no terminal).

### Build para Produção

```sh
# Crie uma build otimizada para produção
npm run build

# Visualize a build localmente
npm run preview
```

### Testes

```sh
# Execute os testes
npm test

# Execute os testes em modo watch
npm run test:watch
```

### Linting

```sh
# Execute o linter
npm run lint
```

## Estrutura do Projeto

A branch oficial de desenvolvimento é `home-v2-contraste`; a `main` aguarda a
validação final da loja. O planejamento vigente está em [roadmap.md](roadmap.md).
O [passo a passo de testes](docs/ROTEIRO_DE_TESTES.md) separa o que pode ser
conferido após a migração do que depende do deploy do Checkout Pro em staging.
A hospedagem de destino é **Cloudflare para o site e todas as APIs**, sem Vercel.
O [plano de migração](docs/MIGRACAO_CLOUDFLARE.md) é a prioridade atual; o port
local está preparado, mas configuração e deploy ainda estão pendentes.
Comandos em [workers/storefront/README.md](workers/storefront/README.md).
Supabase e Mercado Pago permanecem na arquitetura.
Para configuração e comandos do Worker, consulte
[workers/payments/README.md](workers/payments/README.md). As migrations já foram
aplicadas ao Supabase; pagamentos reais permanecem bloqueados.

Para reaproveitar os aprendizados em outro projeto, consulte o
[guia de implementação do Mercado Pago para outro agente](docs/GUIA_IMPLEMENTACAO_MERCADO_PAGO_PARA_OUTRO_PROJETO.md),
com arquitetura, configuração, erros, correções e limites do que foi validado.

```
nada-normal-movement/
├── src/
│   ├── components/     # Componentes React reutilizáveis
│   ├── pages/         # Páginas da aplicação
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilitários e helpers
│   └── assets/        # Imagens e recursos estáticos
├── public/            # Arquivos públicos estáticos
└── package.json       # Dependências e scripts
```

## Contribuindo

Este é um projeto em desenvolvimento ativo. Contribuições são bem-vindas, especialmente de quem entende que ser "Nada Normal" não é um defeito, é uma escolha.

## Licença

Este projeto é propriedade da marca Nada Normal. Todos os direitos reservados.

---

**NADA NORMAL** - Mais que uma Marca, um Movimento.

*Pronto para ir além do normal?*
