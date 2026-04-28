# RP Marketing — API Contract (vivo)

> Última atualização: 2026-04-28 (release 0006: aprovações Trello v2, tráfego pago via PDF, métricas mensais manuais, contratos)
>
> Base URL: `http://localhost:8000/api/v1`
> Autenticação: header `Authorization: Bearer <jwt>`
> Envelope padrão: `{ "success": bool, "data": any, "message": string|null }`
> Erros: `{ "success": false, "data": null, "message": "..." }` com status 400/401/403/404/409/413/415/422/500.

---

## Status atual

| Bloco                                 | Status              |
| ------------------------------------- | ------------------- |
| Auth + clientes + dashboard           | ✅ pronto           |
| Postagens + sync Instagram            | ✅ pronto           |
| **Aprovações Trello v2**              | ✅ pronto           |
| **Tráfego pago via PDF (Reportei)**   | ✅ pronto           |
| **Métricas mensais manuais**          | ✅ pronto           |
| **Contratos (upload PDF assinado)**   | ✅ pronto           |
| **Uploads autenticados**              | ✅ pronto           |
| Migrations                            | ✅ até `0006`       |

### Credenciais de dev

- Admin: `admin@rpmarketing.com.br` / `admin12345`
- Cliente: `cliente1@teste.com` / `teste1234`

---

## Convenções

- Datas em ISO 8601 UTC. UUID v4.
- Métricas inteiras nunca são `null` — `0` quando ausente.
- Paginação: `?page=1&page_size=20`. Resposta: `data: { items, total, page, page_size }`.
- Validação Pydantic: 422 com `message` resumindo o erro.
- Upload de arquivos: `multipart/form-data`. Limite default **50 MB** (configurável via `MAX_UPLOAD_SIZE_MB`).
- Mídias permitidas: `image/jpeg|png|webp|gif`, `video/mp4|quicktime|webm`. PDFs: `application/pdf`.

---

# Endpoints

## Auth — `/api/v1/auth`

| Método | Rota                      | Auth   | Descrição |
| ------ | ------------------------- | ------ | --------- |
| POST   | `/auth/login`             | —      | Login. Retorna `access_token` + `usuario`. |
| POST   | `/auth/recuperar-senha`   | —      | Sempre 200 (não revela existência). |
| POST   | `/auth/redefinir-senha`   | —      | Recebe token + nova senha. |
| GET    | `/auth/me`                | bearer | Hidrata usuário logado. |

(Sem mudanças desde a release anterior.)

---

## Cliente (role: `cliente`)

| Método | Rota                                       | Descrição |
| ------ | ------------------------------------------ | --------- |
| GET    | `/dashboard`                               | Resumo + crescimento + últimas postagens. |
| GET    | `/postagens`                               | Lista paginada com filtros. |
| GET    | `/postagens/{id}`                          | Detalhe. |
| GET    | `/aprovacoes`                              | Lista cards do próprio cliente. |
| GET    | `/aprovacoes/{id}`                         | Detalhe (com comentários). |
| POST   | `/aprovacoes/{id}/aprovar-texto`           | Aprova trilho de texto. |
| POST   | `/aprovacoes/{id}/rejeitar-texto`          | Rejeita texto (comentário obrigatório). |
| POST   | `/aprovacoes/{id}/aprovar-arte`            | Aprova trilho de arte. |
| POST   | `/aprovacoes/{id}/rejeitar-arte`           | Rejeita arte (comentário obrigatório). |
| GET    | `/aprovacoes/{id}/comentarios`             | Lista o chat. |
| POST   | `/aprovacoes/{id}/comentarios`             | Comenta (JSON). |
| POST   | `/aprovacoes/{id}/comentarios/com-anexos`  | Comenta com mídias anexas (multipart). |
| GET    | `/relatorios-trafego`                      | Lista relatórios do cliente. |
| GET    | `/relatorios-trafego/serie`                | Série cronológica resumida (gráficos). |
| GET    | `/relatorios-trafego/{id}`                 | Detalhe (dados estruturados). |
| GET    | `/metricas-mensais?ordem=asc\|desc`        | Métricas mensais ordenadas. |
| GET    | `/contratos`                               | Lista contratos visíveis (não rascunho). |
| GET    | `/contratos/{id}`                          | Detalhe + URL do PDF. |
| GET    | `/uploads/{kind}/{owner_id}/{nome}`        | Serve mídia/PDF (autenticado). |

## Admin (role: `admin`)

| Método | Rota                                                         | Descrição |
| ------ | ------------------------------------------------------------ | --------- |
| GET    | `/admin/clientes`                                            | Lista paginada. |
| POST   | `/admin/clientes`                                            | Cria cliente. |
| GET/PUT/DELETE | `/admin/clientes/{id}`                               | CRUD. |
| POST   | `/admin/instagram/conectar`                                  | Troca código OAuth. |
| POST   | `/admin/instagram/sync/{cliente_id}`                         | Sync de postagens. |
| GET    | `/admin/aprovacoes`                                          | Board: filtra por `cliente_id`, `status_texto`, `status_arte`, `postado`. |
| POST   | `/admin/aprovacoes`                                          | Cria card (JSON, sem mídias). |
| GET/PUT/DELETE | `/admin/aprovacoes/{id}`                             | Detalhe / editar / remover. |
| POST   | `/admin/aprovacoes/{id}/midias`                              | **Upload** de mídias (multipart, campo `arquivos[]`). |
| DELETE | `/admin/aprovacoes/{id}/midias/{midia_id}`                   | Remove uma mídia. |
| POST   | `/admin/aprovacoes/{id}/postado`                             | Marca como postado (exige texto+arte aprovados). |
| GET    | `/admin/relatorios-trafego`                                  | Lista (filtra por `cliente_id`). |
| POST   | `/admin/relatorios-trafego`                                  | **Upload PDF** (multipart). Parseia automaticamente. |
| GET/PUT/DELETE | `/admin/relatorios-trafego/{id}`                     | Detalhe / editar dados/observações / remover. |
| GET    | `/admin/relatorios-trafego/{atual}/comparar/{anterior}`      | Diff entre 2 períodos. |
| GET    | `/admin/metricas-mensais/cliente/{cliente_id}`               | Lista métricas mensais. |
| POST   | `/admin/metricas-mensais`                                    | Cria registro mensal. |
| PUT/DELETE | `/admin/metricas-mensais/{id}`                           | Editar / remover. |
| GET    | `/admin/contratos`                                           | Lista (filtros: `cliente_id`, `status`). |
| POST   | `/admin/contratos`                                           | Cria contrato (rascunho). |
| GET/PUT/DELETE | `/admin/contratos/{id}`                              | Detalhe / editar / remover (só rascunho). |
| POST   | `/admin/contratos/{id}/pdf`                                  | Anexa o PDF assinado (multipart, campo `arquivo`). |
| POST   | `/admin/contratos/{id}/ativar`                               | Ativa o contrato (exige PDF anexado). |
| POST   | `/admin/contratos/{id}/cancelar`                             | Cancela (motivo opcional). |

---

# Aprovações (Trello v2)

Cada card tem **dois trilhos paralelos** (texto e arte). Cliente decide cada trilho separadamente. Quando ambos aprovados, admin marca como **postado**.

## Modelo `Aprovacao`

```json
{
  "id": "uuid",
  "cliente_id": "uuid",
  "cliente_nome_empresa": "string",
  "admin_id": "uuid",
  "admin_nome": "string",
  "titulo": "string",
  "tipo": "IMAGE|VIDEO|CAROUSEL|REEL",
  "legenda": "string|null",
  "data_agendada": "iso8601|null",
  "status_texto": "pendente|aprovado|rejeitado",
  "status_arte": "pendente|aprovado|rejeitado",
  "decidido_texto_em": "iso8601|null",
  "decidido_arte_em": "iso8601|null",
  "postado_em": "iso8601|null",
  "midias": [
    {
      "id": "uuid",
      "ordem": 0,
      "url": "http://.../api/v1/uploads/aprovacoes/<id>/<nome>.jpg",
      "mime_type": "image/jpeg",
      "tamanho_bytes": 12345,
      "nome_original": "arte.jpg",
      "created_at": "iso8601"
    }
  ],
  "total_comentarios": 5,
  "created_at": "iso8601",
  "updated_at": "iso8601"
}
```

`AprovacaoDetail` adiciona `comentarios: AprovacaoComentarioOut[]` em ordem cronológica.

## Modelo `AprovacaoComentarioOut`

```json
{
  "id": "uuid",
  "aprovacao_id": "uuid",
  "autor_id": "uuid",
  "autor_nome": "string|null",
  "autor_role": "admin|cliente",
  "mensagem": "string",
  "anexos_urls": ["http://.../api/v1/uploads/aprovacoes/<id>/<nome>.jpg"],
  "created_at": "iso8601"
}
```

## Fluxos esperados no frontend

### Admin — board (colunas por cliente, estilo Trello "Multi Planejamento")

1. `GET /admin/aprovacoes?page=1&page_size=100` (sem filtro de cliente).
2. Agrupar `data.items` por `cliente_id` no client-side.
3. Cada coluna é um cliente (header = `cliente_nome_empresa`); cada card mostra `titulo`, primeira mídia (se houver), labels coloridos para `status_texto` (laranja=pendente / verde=aprovado / vermelho=rejeitado), `status_arte` (azul=aprovado), e flag `Postado` quando `postado_em != null`.
4. Botão "+ Adicionar um card" → modal cria via `POST /admin/aprovacoes` (cliente_id, titulo, tipo, legenda) e em seguida chama `POST /admin/aprovacoes/{id}/midias` com os arquivos selecionados.
5. Clicar no card abre modal de detalhe: `GET /admin/aprovacoes/{id}` (com comentários). Admin pode adicionar/remover mídias, marcar como postado (quando texto+arte aprovados), comentar (incluindo anexos via `/comentarios/com-anexos`).

### Cliente — listagem + revisão

1. `GET /aprovacoes` (com filtros opcionais).
2. Card mostra título, primeira mídia, status atual.
3. Ao abrir: 2 botões por trilho — "Aprovar texto" / "Rejeitar texto" e "Aprovar arte" / "Rejeitar arte". Rejeitar exige comentário (422 sem ele).
4. Chat na lateral (igual ao print do Trello detail): `GET /aprovacoes/{id}/comentarios` + form de envio.

---

# Tráfego Pago

## Fluxo

1. Admin baixa o PDF do **Reportei** (template Google Ads + Meta Ads).
2. `POST /admin/relatorios-trafego` (multipart):
   - `cliente_id` (Form, UUID)
   - `arquivo` (File, application/pdf)
   - `periodo_inicio`, `periodo_fim` (Form, opcional — só se o parser não conseguir identificar)
3. Backend salva o PDF em `uploads/relatorios/<id>/`, parseia o texto com `pdfplumber` e extrai métricas + tabelas.
4. Resposta inclui `data.dados` com a estrutura abaixo.

## Modelo `dados` (JSONB)

```json
{
  "periodo": { "inicio": "2026-04-01", "fim": "2026-04-23" },
  "google_ads": {
    "custo": 2032.19,
    "impressoes": 228444,
    "cliques": 4609,
    "ctr": 2.02,
    "cpc_medio": 0.44,
    "cpm_medio": 8.90,
    "campanhas": [
      { "nome": "PMAX BRANDING", "custo": 2032.19, "impressoes": 228444,
        "cliques": 4609, "ctr": 2.02, "cpc_medio": 0.44, "conversoes": 0 }
    ]
  },
  "meta_ads": {
    "valor_investido": 2268.81,
    "conversas": 121,
    "custo_conversa": 18.75,
    "impressoes": 204819,
    "alcance": 94620,
    "cliques_link": 2422,
    "ctr_link": 1.18,
    "cpc_medio": 0.94,
    "campanhas": [{ "nome": "SEGUIDORES", "valor_investido": 230.52, ... }],
    "anuncios":  [{ "nome": "AD - 12.JAN", "valor_investido": 224.94, ... }],
    "regioes":   [{ "nome": "Ceará", "alcance": 94620, "impressoes": 204819,
                    "frequencia": 2.16, "valor_investido": 2268.82, "cpm": 11.08 }]
  }
}
```

Campos não encontrados ficam ausentes do dict (admin pode editar via PUT).

## Comparação cronológica

`GET /relatorios-trafego/serie` retorna lista ordenada por `periodo_inicio` com KPIs achatados (`google_custo`, `meta_alcance`, etc.) — perfeito pra alimentar gráficos no dashboard cliente.

`GET /admin/relatorios-trafego/{atual}/comparar/{anterior}` retorna `{anterior, atual, deltas}` com diferenças campo a campo.

---

# Métricas Mensais (manuais)

Inserção manual pelo admin enquanto não há integração 100% automatizada. Granularidade: 1 registro por (cliente, ano-mês).

`POST /admin/metricas-mensais`:
```json
{
  "cliente_id": "uuid",
  "ano_mes": "2026-04",
  "seguidores": 12450,
  "seguidores_ganhos": 320,
  "seguidores_perdidos": 45,
  "alcance": 87000,
  "impressoes": 152000,
  "visualizacoes": 95000,
  "curtidas": 3400,
  "comentarios": 230,
  "compartilhamentos": 180,
  "salvamentos": 95,
  "visitas_perfil": 1200,
  "cliques_site": 380,
  "total_postagens": 22,
  "total_stories": 45,
  "total_reels": 8,
  "observacoes": "campanha X performou bem"
}
```

Constraint única `(cliente_id, ano_mes)` — repetir o POST para o mesmo mês retorna 409. Use PUT.

`GET /metricas-mensais?ordem=asc` (cliente) é o que alimenta o gráfico de crescimento mês a mês.

---

# Contratos

Cliente assina o contrato **externamente** (papel ou outra ferramenta). Plataforma só armazena os dados estruturados + PDF assinado.

## Estados

`rascunho → ativo → encerrado | cancelado`

- **rascunho**: admin criou, sem PDF. Cliente NÃO vê.
- **ativo**: PDF anexado + admin clicou em "Ativar". Cliente vê na sua aba.
- **encerrado**: `data_fim` passou (transição automática quando o admin/cliente lê o registro via `encerrar_se_vencido` — futura tarefa de cron).
- **cancelado**: admin cancelou.

## Modelo `Contrato`

```json
{
  "id": "uuid",
  "cliente_id": "uuid",
  "cliente_nome_empresa": "string",
  "admin_id": "uuid",
  "admin_nome": "string",
  "titulo": "Contrato de prestação de serviços — Sidney Executive Colchões",
  "escopo": ["trafego_pago", "gestao_redes_sociais", "producao_conteudo"],
  "descricao": "Cláusulas livres...",
  "valor_mensal": "1500.00",
  "duracao_meses": 6,
  "data_inicio": "2026-05-01",
  "data_fim": "2026-11-01",
  "status": "ativo",
  "pdf_url": "http://.../api/v1/uploads/contratos/<id>/contrato-sidney.pdf",
  "pdf_nome_original": "Contrato Sidney Executive Colchões.pdf",
  "assinado_em_externo": "2026-04-25",
  "cancelado_em": null,
  "motivo_cancelamento": null,
  "created_at": "iso8601",
  "updated_at": "iso8601"
}
```

`escopo` é livre — usar valores do enum `ItemEscopoContrato` (`trafego_pago`, `gestao_redes_sociais`, `producao_conteudo`, `branding`, `site`, `consultoria`) ou strings customizadas.

## Fluxo admin

1. `POST /admin/contratos` (rascunho).
2. `POST /admin/contratos/{id}/pdf` (multipart, campo `arquivo` — PDF já assinado).
3. `POST /admin/contratos/{id}/ativar` com body `{ "assinado_em_externo": "2026-04-25" }` (ou null pra usar hoje).

Se precisar editar antes de ativar: `PUT /admin/contratos/{id}` (rascunho aceita; ativo bloqueia algumas mudanças via 409).

Cancelar: `POST /admin/contratos/{id}/cancelar` com `{ "motivo": "..." }`.

## Fluxo cliente

`GET /contratos` retorna apenas contratos `ativo|encerrado|cancelado`. Cliente baixa o PDF via `pdf_url` (autenticado por bearer token).

---

# Uploads

Todos os arquivos servidos por `GET /api/v1/uploads/{kind}/{owner_id}/{nome}` exigem auth bearer. Não há ACL granular por papel — qualquer usuário autenticado consegue baixar se conhecer o path. Como os nomes têm token aleatório, vazamento exige enumeração ativa. Substituir por Supabase Storage é uma troca local de `app/services/storage_service.py`.

`kind` ∈ `aprovacoes | relatorios | contratos`.

---

## Notas finais

- JWT no header `Authorization: Bearer <token>` (24h por padrão, configurável via `ACCESS_TOKEN_EXPIRE_MINUTES`).
- CORS: `http://localhost:3000` (ajustável via `CORS_ORIGINS`).
- Frontend lê `pdf_url` / `midias[].url` direto — já vêm absolutas (a partir de `PUBLIC_BASE_URL`).
- Migração `0006` reescreveu `aprovacoes_postagens`: dropou `url_midia`, `status`, `comentario_revisao`, `decidido_em`. **Dados antigos foram perdidos** — só rodou em dev.
