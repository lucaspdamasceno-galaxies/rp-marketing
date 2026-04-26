# RP Marketing — Sistema

> Documento objetivo: **o que** é o sistema e **como** ele foi construído.
> Última atualização: 2026-04-26

---

## 1. O que é

Plataforma SaaS de gestão de redes sociais para **agências de marketing**. A RP Marketing usa o sistema para:

- Cadastrar seus clientes (empresas que ela atende)
- Conectar a conta Instagram Business de cada cliente via OAuth
- Sincronizar automaticamente postagens, métricas (curtidas, comentários, alcance, visualizações) e histórico de seguidores
- Apresentar tudo num **painel limpo** para o cliente acompanhar o desempenho do Instagram dele
- Gerir um fluxo interno de **aprovação de postagens** entre agência e cliente

Equivalente comercial: mLabs, Hootsuite, Sprout Social — porém white-label da RP Marketing.

## 2. Quem usa

| Perfil      | O que faz                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------- |
| **Admin**   | Equipe da RP Marketing. Cadastra clientes, conecta o Instagram, agenda sincronizações, cria aprovações, vê o painel de cada cliente |
| **Cliente** | Empresa atendida (ex.: Pizzaria do Zé). Vê só o próprio dashboard com métricas e postagens. Aprova/rejeita propostas de postagem    |

## 3. Funcionalidades atuais

| Bloco                       | Status        | Detalhe                                                                                |
| --------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| Login + recuperar senha     | ✅ pronto     | JWT, bcrypt, fluxo de reset por token                                                  |
| CRUD de clientes (admin)    | ✅ pronto     | Cria usuário + cliente em 1 chamada                                                    |
| Conectar Instagram          | ✅ pronto     | OAuth via Instagram Login (não requer Página do Facebook)                              |
| Sincronização manual        | ✅ pronto     | Botão "Sincronizar agora" por cliente                                                  |
| Sincronização agendada      | ✅ pronto     | Cron por cliente via Google Cloud Scheduler (presets + custom)                         |
| Dashboard cliente           | ✅ pronto     | KPIs, gráfico de crescimento, últimas postagens, filtro de período (7/30/90/custom)    |
| Histórico de seguidores     | ✅ pronto     | Snapshot a cada sync, gráfico real (não mock)                                          |
| Ver como cliente (admin)    | ✅ pronto     | Admin abre o painel exato que o cliente vê, com switcher entre clientes                |
| Aprovações de postagem      | ✅ pronto     | Admin propõe → cliente aprova/rejeita com comentário                                   |
| Embed do Instagram          | ✅ pronto     | Reels e carrosséis na página de detalhe usam o player oficial da Meta (interativo)     |
| Última sincronização        | ✅ pronto     | "Há X minutos" exibido no admin e no dashboard cliente                                 |
| Mobile responsivo           | ✅ pronto     | Hamburger menu lateral em telas <`lg`                                                  |
| Tráfego pago                | ⏸️ em breve   | Reservado no menu, sem dados ainda                                                     |

---

## 4. Detalhamento técnico

### 4.1 Stack

| Camada          | Tecnologia                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------- |
| Frontend        | Next.js 15 (App Router) · React · TypeScript · Tailwind CSS                                 |
| Backend         | Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2                                 |
| Banco           | PostgreSQL (Supabase) — pooler de transação                                                 |
| Auth            | JWT (HS256, python-jose) · bcrypt para hash de senha                                        |
| Integrações     | Instagram Graph API v22 (Instagram Login) · Google Cloud Scheduler · Google Secret Manager  |
| Infra           | Google Cloud Run (2 serviços) · Cloud Build · Artifact Registry                             |
| Região GCP      | `southamerica-east1`                                                                        |

### 4.2 Estrutura do repositório

Monorepo simples, dois diretórios principais:

```
rp-marketing/
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── api/              # routers HTTP (auth, clientes, dashboard, instagram, …)
│   │   ├── core/             # config (env), security (JWT, hash)
│   │   ├── db/               # session SQLAlchemy
│   │   ├── models/           # ORM (Cliente, Usuario, Postagem, FollowersSnapshot, Aprovacao)
│   │   ├── schemas/          # Pydantic (entrada/saída)
│   │   ├── services/         # lógica de negócio (sem HTTP)
│   │   └── main.py           # FastAPI app + middleware + handlers
│   ├── alembic/              # migrações (0001 → 0005)
│   ├── Dockerfile            # imagem para Cloud Run
│   ├── API_CONTRACT.md       # contrato vivo entre back e front
│   └── requirements.txt
├── frontend/                 # Next.js (App Router)
│   ├── src/
│   │   ├── app/              # rotas (login, dashboard, postagens, admin/*)
│   │   ├── components/       # ui (Button, Modal), dashboard (KpiCard, GrowthChart), layout (Shells, Sidebars, Topbar)
│   │   ├── hooks/            # useApi, useUser
│   │   ├── lib/              # api client, auth, format, mock
│   │   └── types/api.ts      # tipos espelhados do backend
│   └── Dockerfile            # multi-stage Next standalone
└── docs/                     # arquitetura + identidade visual + este doc
```

### 4.3 Modelo de dados

```
usuarios          (id, nome, email, senha_hash, role, ativo, created_at, updated_at)
  └─ 1:1 ─→ clientes
clientes          (id, usuario_id, nome_empresa, instagram_account_id, access_token,
                   token_expires_at, sync_cron, sync_scheduler_job, last_sync_at, …)
  ├─ 1:N ─→ postagens          (id, cliente_id, instagram_media_id, tipo, url_midia,
  │                              permalink, legenda, curtidas, comentarios, visualizacoes,
  │                              alcance, data_publicacao, …)
  ├─ 1:N ─→ followers_snapshots(id, cliente_id, followers_count, coletado_em, …)
  └─ 1:N ─→ aprovacoes         (id, cliente_id, admin_id, tipo, url_midia, legenda,
                                 status, comentario_revisao, decidido_em, …)
```

Migrações aplicadas (Alembic):

| #     | O quê                                                                          |
| ----- | ------------------------------------------------------------------------------ |
| 0001  | tabelas iniciais: usuarios, clientes, postagens                                |
| 0002  | tabela `aprovacoes` + seeds de cliente                                         |
| 0003  | `postagens.url_midia` e `permalink` → `TEXT` (URLs assinadas do IG ultrapassam 1024 chars) |
| 0004  | `followers_snapshots` + drop `postagens.impressoes` (descontinuado pela Meta) + `clientes.sync_cron`/`sync_scheduler_job` |
| 0005  | `clientes.last_sync_at`                                                        |

### 4.4 Backend — convenções

- **Rotas** com prefixo `/api/v1`. Routers em `app/api/*.py`.
- **Envelope padrão de resposta**:
  ```json
  { "success": true, "data": {…}, "message": null }
  ```
- **Auth**: header `Authorization: Bearer <jwt>`. Dependências `AdminUser` / `ClienteUser` em `app/api/deps.py` enforçam role.
- **Lógica de negócio em `services/`**, nunca em routers. Routers só validam, chamam serviço, retornam envelope.
- **Pydantic v2**: schemas separam `*In` (request), `*Out` (response), `*Update`. Validações via `Field` e `field_validator`.
- **Erros**: `HTTPException` com `detail` string → handler global em `main.py` converte para envelope.

### 4.5 Frontend — convenções

- **App Router** + componentes server/client conforme necessidade. `"use client"` em páginas com state/hooks.
- **`lib/api.ts`** centraliza `fetch` (auth header, base URL, parse de envelope, `ApiError`).
- **`hooks/useApi`**: padrão `{data, error, loading, refetch}` com `AbortController` por mount.
- **Layout**: `AppShell` (cliente) e `AdminShell` (admin) — ambos com sidebar desktop fixa + drawer mobile (hamburger no Topbar).
- **Tailwind** com paleta `brand` (marinho `#0E2A8E`) + `accent` (azul elétrico `#1E90FF`) + `ink` (escala de cinza). Tokens em `tailwind.config`.
- **Modo demo** (`isDemo()`) com mocks em `lib/mock.ts` para desenvolvimento sem backend rodando.

### 4.6 Integração com Instagram

**Caminho escolhido:** Instagram API com Instagram Login (novo, recomendado pela Meta em 2025+).

Por que esse e não Graph API via Facebook Login:
- Cliente loga **direto com Instagram** (não precisa ter Página do Facebook)
- Permissões enxutas: `instagram_business_basic` + `instagram_business_manage_insights`
- App Review da Meta mais simples

**Fluxo de conexão (OAuth):**

```
1. Admin clica "Conectar Instagram" e seleciona cliente
2. Frontend → window.location = https://www.instagram.com/oauth/authorize
   ?client_id=<APP_ID>
   &redirect_uri=https://<frontend>/admin/conectar-instagram
   &response_type=code
   &scope=instagram_business_basic,instagram_business_manage_insights
   &state=<cliente_id>          ← carrega o cliente_id sem violar redirect_uri exato
   &enable_fb_login=0
3. Cliente autoriza no Instagram → redirect com ?code=…&state=<cliente_id>
4. Frontend → POST /api/v1/admin/instagram/conectar { cliente_id, code, redirect_uri }
5. Backend:
   a. POST api.instagram.com/oauth/access_token → short-lived token + user_id
   b. GET graph.instagram.com/access_token?grant_type=ig_exchange_token → long-lived (60d)
   c. Salva access_token, instagram_account_id (= user_id), token_expires_at
```

**Sincronização de postagens** (`services/instagram_service.py`):

```
1. GET /v22.0/{user_id}?fields=followers_count
   → grava FollowersSnapshot
2. GET /v22.0/{user_id}/media?fields=id,caption,media_type,media_product_type,
                                     media_url,permalink,timestamp,thumbnail_url,
                                     like_count,comments_count
   → 1 chamada (até 25 mídias)
3. Para cada mídia: GET /v22.0/{media_id}/insights?metric=reach[,views]
   → métricas variam por tipo (REEL/VIDEO inclui views, IMAGE só reach)
   → erros são tolerados (best-effort, não quebra o sync)
4. Upsert por instagram_media_id (atualiza se existe, cria se novo)
5. Atualiza cliente.last_sync_at
```

Por tipo, a `url_midia` salva é:
- **IMAGE / CAROUSEL**: `media_url` (imagem servida pela CDN)
- **VIDEO / REEL**: `thumbnail_url` (frame estático — `media_url` é arquivo de vídeo que não renderiza em `<img>`)

URLs do CDN da Meta **expiram em ~24h**. Por isso o agendamento de sync existe: cada execução refresca as URLs.

Para a página de detalhe da postagem, usamos **Instagram embed.js** (`<blockquote class="instagram-media">`) — a Meta serve o conteúdo fresh, suporta Reels/Carrosséis, e o cliente pode interagir (curtir/comentar) direto se estiver logado no IG no navegador.

### 4.7 Sincronização agendada (Cloud Scheduler)

**Por que Cloud Scheduler e não cron interno:** Cloud Run é stateless e não roda processos contínuos. Cron interno via APScheduler exigiria sempre 1 instância ativa (custo) e não escala bem. Cloud Scheduler é managed, escala bem, e **dispara HTTP** — exatamente o que precisamos.

**Topologia:**

```
Cloud Scheduler                Cloud Run (rp-marketing-api)
  │                                  │
  │  cron "0 */6 * * *"              │
  │  ─────────────────────────────►  │  POST /api/v1/internal/instagram/sync/{cliente_id}
  │  Header: X-Internal-Token: …     │  (valida token de Secret Manager)
  │                                  │  → executa instagram_service.sincronizar_postagens
                                     │
                                     ▼
                              Postgres (Supabase)
```

**Por cliente, 1 job nomeado** `sync-cliente-<cliente_id>`. Criado/atualizado/removido via `services/scheduler_service.py` (SDK `google-cloud-scheduler`).

**Auth do callback:** o backend exige header `X-Internal-Token: <segredo>` no endpoint `/internal/*`. O segredo está no Secret Manager (`rp-internal-sync-token`) e é injetado nas duas pontas (Cloud Scheduler header + backend env via Secret Manager). Token diferente do JWT por dois motivos: (a) JWTs expiram em 24h e não podem ser usados em cron de longo prazo, (b) endpoints `/internal/*` não devem ser acessíveis com credenciais de usuário admin.

### 4.8 Endpoints (resumo)

```
PÚBLICOS / AUTH
  POST   /auth/login                                  email + senha → JWT
  POST   /auth/recuperar-senha                        envia token por email
  POST   /auth/redefinir-senha                        nova senha + token
  GET    /auth/me                                     hidrata sessão

CLIENTE (role: cliente)
  GET    /dashboard                                   ?periodo_inicio=…&periodo_fim=…
  GET    /postagens                                   listagem paginada + filtros
  GET    /postagens/{id}
  GET    /aprovacoes                                  fila do cliente
  POST   /aprovacoes/{id}/aprovar
  POST   /aprovacoes/{id}/rejeitar

ADMIN (role: admin)
  GET    /admin/clientes
  POST   /admin/clientes                              cria usuário+cliente
  GET    /admin/clientes/{id}
  PUT    /admin/clientes/{id}
  DELETE /admin/clientes/{id}
  GET    /admin/clientes/{id}/dashboard               para "Ver como cliente"
  POST   /admin/instagram/conectar                    OAuth code → token
  POST   /admin/instagram/sync/{cliente_id}           sync manual
  POST   /admin/instagram/schedule/{cliente_id}       cria/atualiza job
  DELETE /admin/instagram/schedule/{cliente_id}       remove job
  GET    /admin/aprovacoes
  POST   /admin/aprovacoes                            propõe postagem

INTERNO (token X-Internal-Token)
  POST   /internal/instagram/sync/{cliente_id}        chamado pelo Cloud Scheduler
```

### 4.9 Infraestrutura GCP

**Projeto**: `gen-lang-client-0105811291` · **Região**: `southamerica-east1`

**Cloud Run**

| Serviço            | Imagem                                                                            | URL                                                              |
| ------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `rp-marketing-api` | `…/cloud-run-source-deploy/rp-marketing-api`                                      | `https://rp-marketing-api-1016523621665.southamerica-east1.run.app` |
| `rp-marketing-web` | `…/cloud-run-source-deploy/rp-marketing-web`                                      | `https://rp-marketing-web-1016523621665.southamerica-east1.run.app` |

**Secret Manager**

| Secret                 | Conteúdo                                                  |
| ---------------------- | --------------------------------------------------------- |
| `rp-database-url`      | Connection string Supabase (Transaction Pooler)           |
| `rp-jwt-secret`        | `SECRET_KEY` para assinar JWTs                            |
| `rp-instagram-secret`  | App Secret do Instagram (do app `RP Marketing-IG` no Meta) |
| `rp-internal-sync-token` | Token para autenticar callbacks do Cloud Scheduler      |

**IAM (service account `…-compute@developer.gserviceaccount.com`)**
- `roles/secretmanager.secretAccessor` — ler os secrets acima
- `roles/cloudscheduler.admin` — criar/atualizar/remover jobs por cliente

**Cloud Scheduler**: jobs nomeados `sync-cliente-<uuid>`, fuso `America/Sao_Paulo`.

### 4.10 Variáveis de ambiente

**Backend** (Cloud Run env + Secret Manager):

```
DATABASE_URL                  # secret
SECRET_KEY                    # secret (JWT)
ACCESS_TOKEN_EXPIRE_MINUTES   # 1440
ALGORITHM                     # HS256

INSTAGRAM_APP_ID              # 1598380077897915 (RP Marketing-IG)
INSTAGRAM_APP_SECRET          # secret
INSTAGRAM_REDIRECT_URI        # https://<web>/admin/conectar-instagram

CORS_ORIGINS                  # https://<web>
ENVIRONMENT                   # production

GCP_PROJECT_ID                # gen-lang-client-0105811291
GCP_LOCATION                  # southamerica-east1
SCHEDULER_TIMEZONE            # America/Sao_Paulo
SCHEDULER_TARGET_BASE_URL     # https://<api>
INTERNAL_SYNC_TOKEN           # secret
```

**Frontend** (build args do Dockerfile, **embutidos no bundle**):

```
NEXT_PUBLIC_API_URL              # https://<api>/api/v1
NEXT_PUBLIC_INSTAGRAM_APP_ID     # 1598380077897915
```

### 4.11 Build & Deploy

Sem CI/CD ainda — deploy manual via `gcloud run deploy --source .` em cada diretório:

```bash
# Backend
cd backend && gcloud run deploy rp-marketing-api \
  --source . --region=southamerica-east1

# Frontend (rebuilda imagem + redeploya)
cd frontend && gcloud run deploy rp-marketing-web \
  --source . --region=southamerica-east1
```

Cloud Build detecta o `Dockerfile`, builda, push pra Artifact Registry, deploya nova revisão Cloud Run com 100% do tráfego.

> ⚠️ Como `NEXT_PUBLIC_*` é embutido no build, **mudar essas vars exige rebuildar a imagem do frontend** — não basta atualizar env vars do Cloud Run.

### 4.12 Observações operacionais

- **App da Meta em modo Development**: só contas IG cadastradas como **Instagram Tester** podem conectar. Para liberar para clientes reais, submeter ao **App Review** da Meta (3-14 dias).
- **Token long-lived expira em 60 dias**. Quando próximo do vencimento, dá pra renovar via `graph.instagram.com/refresh_access_token` (não implementado ainda).
- **Métrica `impressions`** foi **descontinuada** pela Meta em abr/2024 para insights de mídia. Usamos `reach` + `views` (este último só para VIDEO/REEL).
- **Engajamento**: `(curtidas + comentários) / alcance × 100`. Faltam `saves` e `shares` para a fórmula completa moderna.
- **Histórico de followers**: cresce 1 snapshot por sync. Não há retenção configurada — manter assim por enquanto (volume baixo).
