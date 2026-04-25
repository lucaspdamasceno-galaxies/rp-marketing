# RP Marketing — API Contract (vivo)

> Documento mantido pelo agente de **backend** para o agente de **frontend**.
> Última atualização: 2026-04-25 (migrado para Instagram API com Instagram Login)
>
> Base URL: `http://localhost:8000/api/v1`
> Autenticação: header `Authorization: Bearer <jwt>`
> Envelope padrão de resposta: `{ "success": bool, "data": any, "message": string|null }`
> Erros: `{ "success": false, "data": null, "message": "..." }` com HTTP status apropriado (400/401/403/404/409/422/500).

---

## Status atual da implementação

| Bloco                          | Status              |
| ------------------------------ | ------------------- |
| Estrutura + dependências       | ✅ pronto           |
| Core (config, JWT, DB session) | ✅ pronto           |
| Models / Schemas               | ✅ pronto           |
| Migrations (Alembic)           | ✅ aplicadas no Supabase (revision `0001`) |
| Auth (login, recuperar-senha)  | ✅ pronto + testado |
| Admin Clientes (CRUD)          | ✅ pronto + testado |
| Postagens                      | ✅ pronto           |
| Dashboard                      | ✅ pronto + testado (followers zerado até integração real com IG) |
| Conectar Instagram             | ✅ código pronto via **Instagram API com Instagram Login** (precisa `INSTAGRAM_APP_ID/SECRET` no `.env`) |
| CORS + main.py + handlers      | ✅ pronto           |
| Servidor rodando               | ✅ `http://localhost:8000` |

> **Banco**: Supabase Postgres conectado via Transaction Pooler. Tabelas `usuarios`, `clientes`, `postagens` criadas.

### Credenciais de desenvolvimento

Já existe um admin seed no banco:
- **email**: `admin@rpmarketing.com.br`
- **senha**: `admin12345`

E um cliente de teste:
- **email**: `cliente1@teste.com`
- **senha**: `teste1234`

> Use esses para validar telas de login enquanto não houver fluxo de auto-cadastro.

---

## Como rodar localmente

```bash
cd backend
cp .env.example .env   # ajustar DATABASE_URL com a string do Supabase
source venv/bin/activate
alembic upgrade head    # cria tabelas no Supabase
uvicorn app.main:app --reload --port 8000
```

Docs interativas: `http://localhost:8000/docs` (Swagger) e `/redoc`.

---

## Convenções

- Datas em ISO 8601 UTC (ex.: `2026-04-25T18:30:00Z`).
- IDs são UUID v4 em string.
- Métricas podem vir `0` quando o Instagram não retornou dado (campo nunca é `null`). Em particular, `impressoes` ficará sempre `0` — a métrica foi descontinuada pela Meta em abr/2024 para insights de mídia. Use `alcance` (reach) e `visualizacoes` (views) para análise.
- Paginação: query `?page=1&page_size=20`. Resposta vem em `data: { items, total, page, page_size }`.
- Validação Pydantic: status 422 com `message` resumindo o primeiro erro de campo.

---

## Endpoints (todos implementados)

### Auth — `/api/v1/auth`
| Método | Rota                      | Auth | Descrição |
| ------ | ------------------------- | ---- | --------- |
| POST   | `/auth/login`             | —    | Login com email+senha. |
| POST   | `/auth/recuperar-senha`   | —    | Sempre 200, não revela existência de email. |
| POST   | `/auth/redefinir-senha`   | —    | Recebe token enviado por email + nova senha. |
| GET    | `/auth/me`                | bearer | Hidrata usuário logado. |

#### `POST /auth/login`
Request:
```json
{ "email": "user@x.com", "senha": "secreta" }
```
Response 200:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "usuario": { "id": "uuid", "nome": "Lucas", "email": "user@x.com", "role": "cliente" }
  },
  "message": null
}
```
Erros: 401 `email ou senha inválidos`.

#### `POST /auth/recuperar-senha`
Request: `{ "email": "user@x.com" }` → Response 200 `{ success: true, data: null, message: "se o email existir, instruções foram enviadas" }`.

#### `POST /auth/redefinir-senha`
Request: `{ "token": "<token-jwt-recebido-no-email>", "nova_senha": "novaSenha123" }` → 200 ou 400 `token inválido ou expirado`.

#### `GET /auth/me`
Response 200 `data`:
```json
{ "id": "uuid", "nome": "Lucas", "email": "user@x.com", "role": "cliente", "cliente_id": "uuid|null" }
```
Erro 401 quando token ausente/inválido.

---

### Cliente (role: `cliente`)

#### `GET /api/v1/dashboard`
Response 200 `data`:
```json
{
  "resumo": {
    "followers": 0,
    "total_curtidas": 1234,
    "total_comentarios": 89,
    "total_alcance": 45000,
    "total_postagens": 42
  },
  "crescimento": [
    { "data": "2026-03-26", "followers": 0 },
    { "data": "2026-03-27", "followers": 0 }
  ],
  "ultimas_postagens": [ /* PostagemOut */ ]
}
```
> `followers` e `crescimento` ficam zerados até a integração com Instagram preencher. O frontend pode renderizar normalmente — a forma é estável.

#### `GET /api/v1/postagens`
Query params:
- `periodo_inicio` ISO datetime (opcional)
- `periodo_fim` ISO datetime (opcional)
- `ordenar_por`: `data` (default) ou `engajamento`
- `page` (default 1), `page_size` (default 20, max 100)

Response 200 `data`:
```json
{
  "items": [ /* PostagemOut */ ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

#### `GET /api/v1/postagens/{id}`
Response 200 `data`: PostagemOut. Erro 404.

---

### Admin (role: `admin`)

#### `GET /api/v1/admin/clientes`
Query: `q` (busca em nome/email/empresa), `page`, `page_size`.
Response 200 `data`: `{ items: ClienteOut[], total, page, page_size }`.

#### `POST /api/v1/admin/clientes`
Request:
```json
{ "nome": "Cliente X", "email": "cli@x.com", "senha": "senha123!", "nome_empresa": "Empresa X" }
```
Response 201 `data`: ClienteOut. Erro 409 `email já cadastrado`.

#### `GET /api/v1/admin/clientes/{id}`
Response 200 `data`: ClienteOut. Erro 404.

#### `PUT /api/v1/admin/clientes/{id}`
Request (todos campos opcionais):
```json
{ "nome": "...", "email": "...", "senha": "...", "nome_empresa": "...", "ativo": true }
```
Response 200 `data`: ClienteOut. Erros: 404, 409.

#### `DELETE /api/v1/admin/clientes/{id}`
Response 200 `{ success: true, data: null, message: "cliente removido" }`. Cascata: remove usuário e postagens.

#### `POST /api/v1/admin/instagram/conectar`
Request:
```json
{ "cliente_id": "uuid", "code": "<oauth-code-do-instagram>", "redirect_uri": "opcional" }
```
Response 200 `data`:
```json
{ "cliente_id": "uuid", "instagram_account_id": "17841412345", "token_expires_at": "2026-06-25T..." }
```
Backend: troca `code` por short-lived token → long-lived (60 dias). O `user_id` retornado pelo OAuth **é** o ID da conta Instagram Business — não passa por Página do Facebook. Erro 400 se OAuth falhar.

#### `POST /api/v1/admin/instagram/sync/{cliente_id}`
Response 200 `data`: `{ "postagens_novas": 7 }`. Busca últimas 25 mídias e atualiza no banco.

---

## Modelos de resposta

### UsuarioOut
```json
{ "id": "uuid", "nome": "string", "email": "string", "role": "admin|cliente" }
```

### ClienteOut
```json
{
  "id": "uuid",
  "usuario_id": "uuid",
  "nome": "string",
  "email": "string",
  "ativo": true,
  "nome_empresa": "string",
  "instagram_account_id": "string|null",
  "instagram_conectado": true,
  "token_expires_at": "iso8601|null",
  "created_at": "iso8601",
  "updated_at": "iso8601"
}
```

### PostagemOut
```json
{
  "id": "uuid",
  "cliente_id": "uuid",
  "instagram_media_id": "string",
  "tipo": "IMAGE|VIDEO|CAROUSEL|REEL",
  "url_midia": "string",
  "permalink": "string|null",
  "legenda": "string|null",
  "curtidas": 0,
  "comentarios": 0,
  "visualizacoes": 0,
  "alcance": 0,
  "impressoes": 0,
  "data_publicacao": "iso8601",
  "created_at": "iso8601",
  "updated_at": "iso8601"
}
```

---

## Fluxos esperados no frontend

1. **Login**: `POST /auth/login` → guardar `access_token` (localStorage). Redirecionar baseado em `usuario.role`:
   - `admin` → `/admin/clientes`
   - `cliente` → `/dashboard`
2. **Hidratar sessão** após reload: `GET /auth/me` (manda Bearer). Se 401, derruba sessão.
3. **Recuperar senha**: form → `POST /auth/recuperar-senha`. Tela de novo password recebe `?token=` da URL → `POST /auth/redefinir-senha`.
4. **Dashboard cliente**: `GET /dashboard` no mount. Renderizar resumo + gráfico de crescimento + lista de últimas postagens (clicar abre `/postagens/[id]`).
5. **Lista postagens**: `GET /postagens?periodo_inicio=&periodo_fim=&ordenar_por=`. Filtros aplicam re-fetch.
6. **Admin / Conectar Instagram**: o botão abre OAuth do **Instagram** (não do Facebook). URL gerada no frontend:
   ```
   https://www.instagram.com/oauth/authorize
     ?client_id={NEXT_PUBLIC_INSTAGRAM_APP_ID}
     &redirect_uri={origin}/admin/conectar-instagram
     &response_type=code
     &scope=instagram_business_basic,instagram_business_manage_insights
     &state={cliente_id}
     &enable_fb_login=0
     &force_authentication=1
   ```
   - **Use `state` para passar o `cliente_id`**, não query string no `redirect_uri`. O Instagram exige match exato do `redirect_uri` registrado, então acoplar `?cliente=...` na URL é frágil/quebra.
   - Callback chega em `?code=...&state={cliente_id}` → frontend lê `state`, chama `POST /admin/instagram/conectar` com `cliente_id` + `code` + `redirect_uri` (sem query string).
   - Pré-requisito do cliente: conta Instagram **Business** ou **Creator**. Não precisa mais de Página do Facebook vinculada.

---

## Notas técnicas

- JWT no header `Authorization: Bearer <token>`. Backend é stateless, sem refresh token nessa fase. Token dura 24h por padrão (configurável via `ACCESS_TOKEN_EXPIRE_MINUTES`).
- CORS habilitado para `http://localhost:3000` por padrão (`CORS_ORIGINS` no `.env` aceita lista separada por vírgula).
- Cliente só consegue ver os dados *do próprio cliente* (`Postagem.cliente_id == cliente_do_usuario.id`). Endpoints `/admin/*` exigem role `admin`.
- Senha mínima: 8 caracteres. Hashing com bcrypt.
