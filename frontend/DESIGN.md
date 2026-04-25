# RP Marketing — Guia de Design & UX/UI

> Fonte de verdade visual do produto. Toda tela nova consulta este arquivo
> antes de definir cores, tipografia, espaçamentos e padrões de interação.
> O objetivo é entregar um painel **claro, premium e direto ao ponto** —
> o cliente abre, entende em 5 segundos como sua presença digital está performando
> e sente que está diante de uma agência séria.

---

## 1. Princípios de Produto

1. **Clareza acima de tudo.** O cliente não é analista de dados. Cada número precisa
   de contexto (variação, comparativo, benchmark) — número solto não conta história.
2. **Hierarquia agressiva.** Uma única coisa importa por tela. O resto sustenta.
   KPI principal grande, secundários médios, tabelas/listas em seguida.
3. **Conteúdo é o herói.** Postagens do Instagram são imagens — o layout precisa
   respirar imagem. Cards quadrados, thumbnails generosos, sem ruído.
4. **Premium, não corporativo.** Bordas suaves (rounded-2xl), sombras sutis,
   muito espaço em branco, tipografia cuidada. Nada de gradiente neon ou ícones de stock.
5. **Mobile real.** Cliente vai olhar no celular durante reunião. Sidebar colapsa,
   tabelas viram cards, KPIs empilham — sem scroll horizontal nunca.
6. **Estados completos.** Toda tela com dados precisa de loading, vazio e erro
   desenhados — o vazio é onboarding, não acidente.

---

## 2. Identidade Visual

### 2.1 Paleta

A marca não tem identidade definida ainda (item aberto da arquitetura, seção 12).
Proponho um sistema **neutro premium + accent vibrante** que comunica
"agência de marketing digital séria" sem copiar a paleta do Instagram.

| Token              | Hex       | Uso                                                    |
| ------------------ | --------- | ------------------------------------------------------ |
| `--brand-900`      | `#1a1033` | Sidebar, headings principais, CTAs em estado hover     |
| `--brand-700`      | `#3b1d6e` | Botões primários, links importantes                    |
| `--brand-500`      | `#6d3df5` | Accent — gráficos, badges, ícones ativos               |
| `--brand-100`      | `#ece4ff` | Backgrounds de destaque suave (chips, hover)           |
| `--ink-950`        | `#0b0a12` | Texto principal                                        |
| `--ink-700`        | `#3a3947` | Texto secundário                                       |
| `--ink-500`        | `#6b6a78` | Texto terciário, labels                                |
| `--ink-300`        | `#c9c8d2` | Bordas, divisores                                      |
| `--ink-100`        | `#f3f3f7` | Backgrounds de seção                                   |
| `--surface`        | `#ffffff` | Cartões                                                |
| `--canvas`         | `#fafaf9` | Fundo de página                                        |
| `--success-500`    | `#10b981` | Variação positiva, status ok                           |
| `--danger-500`     | `#ef4444` | Variação negativa, erro                                |
| `--warning-500`    | `#f59e0b` | Atenção, pendência                                     |

**Por que roxo?** É a cor mais associada a criatividade + tecnologia (Twitch, Figma,
Discord, Stripe) — e foge de azul corporativo bancário e do laranja/rosa do Instagram,
deixando o **conteúdo** do cliente brilhar sem competir.

### 2.2 Tipografia

- **Sans (interface):** `Geist Sans` — já vem no Next, neutra e moderna.
- **Display (números grandes de KPI):** mesma fonte, peso 600, letter-spacing -0.02em.
- **Mono (IDs, tokens, dados crus):** `Geist Mono`.

**Escala:**
| Token  | Tamanho | Linha | Peso | Uso                       |
| ------ | ------- | ----- | ---- | ------------------------- |
| `xs`   | 12px    | 16px  | 500  | Labels, badges            |
| `sm`   | 14px    | 20px  | 400  | Texto secundário, tabela  |
| `base` | 15px    | 24px  | 400  | Corpo                     |
| `lg`   | 18px    | 28px  | 500  | Subtítulos                |
| `xl`   | 22px    | 30px  | 600  | Títulos de seção          |
| `2xl`  | 28px    | 36px  | 600  | Título de página          |
| `3xl`  | 36px    | 44px  | 600  | KPI grande do dashboard   |
| `4xl`  | 48px    | 56px  | 700  | Hero (login)              |

### 2.3 Espaçamento, raios e sombras

- **Espaçamento base** 4px. Use sempre múltiplos: 4, 8, 12, 16, 24, 32, 48, 64.
- **Raios:** `rounded-lg` (8px) para inputs/botões, `rounded-2xl` (16px) para cards,
  `rounded-full` para avatars/badges/chips.
- **Sombras:** prefira `shadow-sm` em cards no estado normal, `shadow-md` no hover.
  Nunca `shadow-2xl` — passa a ideia de "site de plugin", não de produto sério.
- **Bordas:** 1px sólido `--ink-300` quando precisar separar sem sombra.

---

## 3. Layout

### 3.1 Estrutura geral (área autenticada)

```
┌──────────────────────────────────────────────────────────┐
│  Sidebar (240px, fixa)  │  Topbar (64px, sticky)          │
│  - Logo                  ├─────────────────────────────────┤
│  - Dashboard             │                                 │
│  - Postagens             │   Conteúdo                      │
│  - Tráfego (em breve)    │   max-w-[1240px]                │
│  - ─────                 │   px-6 lg:px-10 py-8            │
│  - Configurações         │                                 │
│  - Sair                  │                                 │
└──────────────────────────────────────────────────────────┘
```

- **Sidebar fixa em desktop**, collapsa em drawer no mobile (<lg).
- **Topbar** mostra: nome do cliente atual (admin pode trocar), busca rápida (futuro),
  avatar com menu.
- **Conteúdo** centralizado com largura máxima — em telas ultra-wide (1920px+)
  evita linhas de leitura quilométricas.

### 3.2 Telas públicas

Login e recuperar senha usam um **split layout**:
- Esquerda (60%): formulário centralizado, max-w-sm, fundo branco.
- Direita (40%): fundo `--brand-900` com mensagem de marca + ilustração/padrão geométrico.
- Mobile: empilhado, banner vira topo de 160px.

### 3.3 Grid responsivo

| Breakpoint | Largura     | Comportamento                                         |
| ---------- | ----------- | ----------------------------------------------------- |
| `sm`       | ≥640px      | KPIs em 2 colunas                                     |
| `md`       | ≥768px      | KPIs em 2 colunas, cards de post em 2                 |
| `lg`       | ≥1024px     | Sidebar fixa visível, KPIs em 4, posts em 3           |
| `xl`       | ≥1280px     | Posts em 4 colunas                                    |

---

## 4. Componentes-chave

### 4.1 KPI Card

```
┌───────────────────────────────┐
│  Seguidores            ↗ 2.4% │  ← label + delta
│                                │
│  12.847                        │  ← número grande (3xl)
│                                │
│  +312 nos últimos 30 dias      │  ← contexto em ink-500 sm
└───────────────────────────────┘
```

- Sempre **3 informações:** label, valor, contexto.
- Delta colorido (`success-500` / `danger-500`) com seta. Nunca exibir só o número.
- Loading: skeleton com mesma altura para não causar layout shift.

### 4.2 Post Card

- Thumbnail quadrado (aspect-square, object-cover), bordas `rounded-2xl`.
- Overlay no hover com 4 ícones de métrica (curtidas, comentários, alcance, views).
- Badge no canto superior esquerdo indicando tipo: `IMAGEM`, `REEL`, `CARROSSEL`.
- Data em footer, formato `25 abr · 14h32` (relativo se ≤7 dias: "há 2 dias").

### 4.3 Botões

| Variante    | Uso                            | Estilo                                      |
| ----------- | ------------------------------ | ------------------------------------------- |
| `primary`   | Ação principal por tela        | Fundo `--brand-700`, texto branco           |
| `secondary` | Ações de apoio                 | Fundo `--ink-100`, texto `--ink-950`        |
| `ghost`     | Ações terciárias / dentro de cards | Sem fundo, hover `--ink-100`           |
| `danger`    | Excluir, desconectar           | Fundo `--danger-500`, texto branco          |

Altura padrão: 40px (h-10). Versão compacta 32px (h-8) para tabelas/filtros.

### 4.4 Inputs

- Altura 44px no formulário de login (toque em mobile), 36px em filtros.
- Label sempre **acima** do campo, nunca placeholder-only.
- Focus: ring 2px `--brand-500/30`, borda `--brand-500`.
- Erro: borda `--danger-500`, mensagem 12px abaixo.

### 4.5 Empty states

Toda lista vazia tem: ícone neutro (não emoji), título curto ("Sem postagens ainda"),
explicação 1 linha, CTA quando faz sentido. **Nunca uma lista cinza vazia.**

---

## 5. Padrões de interação

- **Feedback imediato:** toda ação que muda estado mostra spinner inline em <100ms.
- **Confirmação destrutiva:** modal com nome do recurso digitado para excluir cliente.
- **Atalhos:** `cmd+k` abre busca global (fase 2). Hoje, `esc` fecha drawer.
- **Toasts** no canto inferior direito, autodismiss 4s, ação de undo quando aplicável.
- **Tabelas vão a cards no mobile** (não scroll horizontal), com a chave principal em destaque.

---

## 6. Acessibilidade (não-negociável)

- Contraste mínimo AA: texto pequeno 4.5:1, grande 3:1. Validar com Stark/axe.
- Foco visível sempre (`focus-visible:ring-2`), nunca `outline: none` sem substituto.
- Labels em todo input, `aria-live` em toasts, `role="status"` em loading.
- Navegação por teclado completa: tab, enter, esc funcionam em todo lugar.
- `prefers-reduced-motion`: animações reduzidas a fade simples.

---

## 7. Decisões adiadas (para o usuário definir)

1. **Logo definitivo.** Hoje uso wordmark "RP" em caixa quadrada `--brand-700`.
2. **Modo escuro.** Estrutura preparada via tokens, mas v1 entrega só claro
   (energia melhor gasta em conteúdo). Habilitar quando o produto estabilizar.
3. **Idioma.** Toda interface em **pt-BR** (clientes da agência brasileira).
4. **Gráficos:** v1 usa SVG inline (sem dep). Quando passar de 1 tipo de gráfico,
   migrar para Recharts (já previsto na fase 2 da arquitetura).

---

## 8. Estrutura de pastas do frontend

```
frontend/src/
├── app/
│   ├── (auth)/                  # rotas públicas, layout split
│   │   ├── login/page.tsx
│   │   └── recuperar-senha/page.tsx
│   ├── (app)/                   # rotas autenticadas, sidebar + topbar
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── postagens/page.tsx
│   │   └── postagens/[id]/page.tsx
│   ├── layout.tsx               # html, fontes, providers
│   ├── globals.css              # tokens + tailwind
│   └── page.tsx                 # redirect → /dashboard ou /login
├── components/
│   ├── ui/                      # primitivos: Button, Input, Card, Badge
│   ├── layout/                  # Sidebar, Topbar, AuthShell
│   └── dashboard/               # KpiCard, GrowthChart, RecentPosts
├── lib/
│   ├── api.ts                   # client REST (placeholder até backend)
│   ├── mock.ts                  # dados mockados para construir a UI
│   └── format.ts                # formatadores: número, data, percentual
└── styles/                      # (vazio por ora — globals.css basta)
```

A separação por **route groups** (`(auth)` e `(app)`) permite layouts diferentes
sem poluir a URL — o usuário continua acessando `/login` e `/dashboard` direto.
