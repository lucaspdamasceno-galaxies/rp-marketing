# RP Marketing - Sistema de Gestao de Redes Sociais

> **Este documento e a fonte de verdade da arquitetura do projeto.**
> Agentes de backend e frontend devem consultar este arquivo antes de implementar qualquer etapa.

---

## 1. Visao Geral

Sistema web onde os **clientes da RP Marketing** acessam um painel para acompanhar o desempenho das suas redes sociais (Instagram) e campanhas de trafego pago.

---

## 2. Usuarios do Sistema

| Perfil        | Descricao                                                    |
| ------------- | ------------------------------------------------------------ |
| **Admin**     | Equipe RP Marketing - gerencia clientes, conecta contas, configura campanhas |
| **Cliente**   | Acessa o painel para visualizar metricas das suas postagens e campanhas     |

---

## 3. Funcionalidades Principais

### 3.1 Autenticacao
- Tela de login com email e senha
- Recuperacao de senha por email
- Sessao com token JWT

### 3.2 Dashboard (Tela Inicial)
- Resumo geral: total de seguidores, curtidas, comentarios, alcance
- Grafico de crescimento (ultimos 30 dias)
- Ultimas postagens com metricas rapidas

### 3.3 Postagens (Instagram)
- Lista de postagens do Instagram do cliente
- Para cada postagem:
  - Imagem/video
  - Curtidas
  - Comentarios
  - Visualizacoes (para videos/reels)
  - Alcance
  - Impressoes
  - Data de publicacao
- Filtros por periodo
- Ordenacao por engajamento

### 3.4 Trafego Pago (fase futura)
- Campanhas ativas do Meta Ads
- Metricas: investimento, cliques, CPC, CPM, conversoes
- Comparativo de desempenho entre campanhas

---

## 4. Arquitetura Proposta

### Diagrama

```
[Cliente/Browser]
       |
       v
  [Frontend - Next.js :3000]
       |  (chamadas HTTP REST)
       v
  [Backend API - Python/FastAPI :8000]
       |
       +--> [Banco de Dados - PostgreSQL :5432]
       |
       +--> [Instagram Graph API]
       |
       +--> [Meta Ads API] (fase futura)
```

### Estrutura do Repositorio (monorepo)

```
rp-marketing/
├── backend/              # Python (FastAPI)
│   ├── app/
│   │   ├── main.py           # Entrypoint FastAPI
│   │   ├── api/              # Rotas/endpoints
│   │   │   ├── auth.py
│   │   │   ├── clientes.py
│   │   │   ├── postagens.py
│   │   │   └── dashboard.py
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Logica de negocio + integracao Instagram
│   │   ├── core/             # Config, seguranca, JWT
│   │   └── db/               # Conexao e migrations (Alembic)
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env
├── frontend/             # Next.js
│   ├── src/
│   │   ├── app/              # App Router (pages)
│   │   ├── components/       # Componentes reutilizaveis
│   │   ├── lib/              # API client, utils
│   │   └── styles/           # Tailwind config
│   ├── package.json
│   └── .env.local
├── docs/
│   └── arquitetura-sistema.md  # Este arquivo
└── README.md
```

### Stack Tecnologica

| Camada       | Tecnologia         | Motivo                                                        |
| ------------ | ------------------ | ------------------------------------------------------------- |
| **Frontend** | Next.js            | SSR, roteamento, boa DX, ecossistema React                    |
| **Frontend** | Tailwind CSS       | Estilizacao rapida e consistente                              |
| **Backend**  | Python + FastAPI   | Alta performance async, tipagem com Pydantic, docs automatica |
| **ORM**      | SQLAlchemy         | ORM maduro e flexivel para Python                             |
| **Migrations** | Alembic          | Controle de versao do banco de dados                          |
| **Banco**    | PostgreSQL         | Robusto, gratuito, bom para dados relacionais                 |
| **Auth**     | JWT (python-jose)  | Tokens stateless, facil validacao no frontend                 |
| **API Instagram** | Instagram Graph API | API oficial do Meta para dados do Instagram             |

---

## 5. Comunicacao Frontend <-> Backend

- Frontend faz chamadas REST para `http://localhost:8000/api/v1/...`
- Autenticacao via header `Authorization: Bearer <token>`
- Backend retorna JSON padronizado:

```json
{
  "success": true,
  "data": { ... },
  "message": "opcional"
}
```

### Endpoints Principais (Backend)

| Metodo | Rota                          | Descricao                        |
| ------ | ----------------------------- | -------------------------------- |
| POST   | `/api/v1/auth/login`          | Login, retorna JWT               |
| POST   | `/api/v1/auth/recuperar-senha`| Envia email de recuperacao       |
| GET    | `/api/v1/dashboard`           | Metricas resumidas do cliente    |
| GET    | `/api/v1/postagens`           | Lista postagens com metricas     |
| GET    | `/api/v1/postagens/{id}`      | Detalhe de uma postagem          |
| GET    | `/api/v1/admin/clientes`      | Lista clientes (admin)           |
| POST   | `/api/v1/admin/clientes`      | Criar cliente (admin)            |
| PUT    | `/api/v1/admin/clientes/{id}` | Editar cliente (admin)           |
| DELETE | `/api/v1/admin/clientes/{id}` | Remover cliente (admin)          |
| POST   | `/api/v1/admin/instagram/conectar` | Conectar conta Instagram (admin) |

---

## 6. Telas do Sistema (Frontend)

### 6.1 Telas Publicas
- `/login` - Login com email e senha
- `/recuperar-senha` - Recuperacao de senha

### 6.2 Telas do Cliente
- `/dashboard` - Visao geral com metricas resumidas
- `/postagens` - Lista de postagens com metricas detalhadas
- `/postagens/[id]` - Detalhe de uma postagem especifica
- `/trafego` - Metricas de trafego pago (fase futura)

### 6.3 Telas do Admin
- `/admin/clientes` - Gerenciar clientes
- `/admin/clientes/[id]` - Detalhe/edicao de um cliente
- `/admin/conectar-instagram` - Conectar conta Instagram do cliente

---

## 7. Integracao com Instagram

### Como funciona:
1. **Admin** conecta a conta Instagram do cliente via OAuth do Facebook/Meta
2. O sistema recebe um **access token** de longa duracao
3. Um **job agendado** (Celery ou APScheduler) busca os dados periodicamente
4. Os dados sao salvos no banco para consulta rapida

### Dados que vamos buscar:
- Lista de midias (posts, reels, stories)
- Metricas por midia: likes, comments, reach, impressions, video_views
- Metricas da conta: followers_count, media_count

### Requisitos do Instagram Graph API:
- Conta Instagram **Business** ou **Creator**
- App registrado no Meta for Developers
- Pagina do Facebook conectada a conta Instagram

---

## 8. Modelo de Dados (simplificado)

```
Usuarios
  - id (UUID)
  - nome
  - email (unique)
  - senha_hash
  - role (admin | cliente)
  - ativo (boolean)
  - created_at
  - updated_at

Clientes
  - id (UUID)
  - usuario_id (FK -> Usuarios)
  - nome_empresa
  - instagram_account_id
  - access_token (criptografado)
  - token_expires_at
  - created_at
  - updated_at

Postagens
  - id (UUID)
  - cliente_id (FK -> Clientes)
  - instagram_media_id (unique)
  - tipo (IMAGE | VIDEO | CAROUSEL | REEL)
  - url_midia
  - legenda
  - curtidas
  - comentarios
  - visualizacoes
  - alcance
  - impressoes
  - data_publicacao
  - created_at
  - updated_at
```

---

## 9. Ambiente de Desenvolvimento Local

### Requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Como rodar

**Backend (porta 8000):**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend (porta 3000):**
```bash
cd frontend
npm install
npm run dev
```

### Variaveis de Ambiente

**backend/.env**
```
DATABASE_URL=postgresql://user:password@localhost:5432/rp_marketing
SECRET_KEY=sua-chave-secreta
INSTAGRAM_APP_ID=...
INSTAGRAM_APP_SECRET=...
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 10. Fases de Desenvolvimento

### Fase 1 - MVP
- [x] Definir arquitetura
- [ ] Setup do projeto (backend FastAPI + frontend Next.js)
- [ ] Modelagem do banco + migrations com Alembic
- [ ] Autenticacao (login/logout/recuperar senha)
- [ ] Painel admin: CRUD de clientes
- [ ] Integracao Instagram Graph API
- [ ] Tela de postagens com metricas
- [ ] Dashboard com resumo

### Fase 2 - Melhorias
- [ ] Graficos de evolucao (Recharts)
- [ ] Exportar relatorios em PDF
- [ ] Notificacoes por email

### Fase 3 - Trafego Pago
- [ ] Integracao Meta Ads API
- [ ] Tela de campanhas
- [ ] Metricas de trafego pago

---

## 11. Guia para Agentes

> Quando um agente for chamado para implementar uma etapa, ele deve:
>
> 1. **Ler este documento** para entender a arquitetura completa
> 2. **Respeitar a estrutura de pastas** definida na secao 4
> 3. **Seguir os padroes de API** definidos na secao 5
> 4. **Backend**: usar FastAPI + SQLAlchemy + Alembic + Pydantic
> 5. **Frontend**: usar Next.js App Router + Tailwind CSS
> 6. **Nao mudar a stack** sem aprovacao explicita do usuario
> 7. **Testar localmente** antes de marcar a etapa como concluida

### Agente Backend - Responsabilidades
- Endpoints REST conforme tabela da secao 5
- Models SQLAlchemy conforme secao 8
- Schemas Pydantic para validacao de entrada/saida
- Services para logica de negocio e integracao com APIs externas
- Migrations com Alembic

### Agente Frontend - Responsabilidades
- Telas conforme secao 6
- Consumir API do backend via fetch/axios
- Gerenciar estado de autenticacao (JWT no cookie/localStorage)
- Componentes reutilizaveis com Tailwind
- Responsividade mobile

---

## 12. Decisoes em Aberto (para discutir)

1. **Hospedagem**: A definir depois (rodando local por enquanto)
2. **Dominio**: Vai usar subdominio tipo `app.rpmarketing.com.br`?
3. **Design**: Tem identidade visual definida (cores, logo)?
4. **Clientes**: Quantos clientes inicialmente? (impacta limites da API)
5. **Frequencia de atualizacao**: De quanto em quanto tempo buscar dados do Instagram?
