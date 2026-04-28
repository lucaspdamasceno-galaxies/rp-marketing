# RP Marketing — Sumário Executivo

> Documento objetivo: **o que** foi entregue, **com que recursos**, **em quanto tempo**.
> Período coberto: 2026-04-25 a 2026-04-26.

---

## 1. O que é

Plataforma SaaS white-label de **gestão de redes sociais** desenvolvida para a agência RP Marketing. O sistema:

- Permite à agência cadastrar e gerir seus clientes (empresas atendidas).
- Conecta a conta **Instagram Business** de cada cliente via OAuth oficial da Meta.
- Sincroniza automaticamente postagens, métricas (curtidas, comentários, alcance, visualizações) e histórico de seguidores.
- Apresenta o desempenho num **painel limpo e responsivo** que cada cliente acessa.
- Implementa um fluxo interno de **aprovação de postagens** entre agência e cliente.
- Integração equivalente a mLabs / Hootsuite / Sprout Social — porém com a marca da própria RP Marketing.

## 2. O que foi entregue

| Bloco                                 | Status        |
| ------------------------------------- | ------------- |
| Autenticação JWT + recuperação senha  | ✅ Produção   |
| CRUD de clientes (admin)              | ✅ Produção   |
| OAuth Instagram (Instagram Login API) | ✅ Produção   |
| Sincronização manual + agendada (cron por cliente via Cloud Scheduler) | ✅ Produção   |
| Dashboard cliente com filtro por período + KPIs + gráfico de crescimento real | ✅ Produção   |
| Histórico de seguidores (snapshots por sync) | ✅ Produção   |
| Fluxo de aprovações de postagem      | ✅ Produção   |
| "Ver como cliente" (admin abre painel de qualquer cliente) | ✅ Produção   |
| Embed nativo do Instagram (Reels e Carrosséis interativos) | ✅ Produção   |
| Layout responsivo + menu mobile (drawer) | ✅ Produção   |
| Deploy em **Google Cloud Run** com Secret Manager + IAM | ✅ Produção   |
| Documentação técnica e de arquitetura | ✅ Pronta     |

**Status atual**: rodando em produção em `https://rp-marketing-web-…run.app` com app Meta em modo Development (pronto para submissão de App Review).

## 3. Stack

| Camada       | Tecnologia                                                                          |
| ------------ | ----------------------------------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router) · React · TypeScript · Tailwind CSS                          |
| Backend      | Python 3.12 · FastAPI · SQLAlchemy 2 · Alembic · Pydantic v2                          |
| Banco        | PostgreSQL (Supabase, Transaction Pooler)                                           |
| Auth         | JWT (HS256) · bcrypt                                                                |
| Integrações  | Instagram Graph API v22 · Google Cloud Scheduler · Google Secret Manager            |
| Infra        | Google Cloud Run · Cloud Build · Artifact Registry · Cloud IAM                      |
| Região       | `southamerica-east1`                                                                |

---

## 4. Histórico do projeto

### 4.1 Linha do tempo

| #   | Hash       | Data/hora             | Marco                                                                |
| --- | ---------- | --------------------- | -------------------------------------------------------------------- |
| 1   | `3b386d8`  | 25/04 17:22           | Initial commit                                                       |
| 2   | `9030668`  | 25/04 19:09  (+1h47)  | Backend + frontend scaffold + identidade visual + arquitetura        |
| 3   | `66c9bd5`  | 25/04 20:13  (+1h04)  | Fluxo de aprovações + migração para Instagram Login OAuth            |
| 4   | `68aa9dd`  | 26/04 15:43  (+19h30) | Cloud Scheduler, followers history, dashboard com filtros, mobile menu, embed |

### 4.2 Métricas de código

| Métrica                                                | Valor                |
| ------------------------------------------------------ | -------------------- |
| Commits                                                | **4**                |
| Arquivos no repositório (código + docs)                | **103**              |
| Linhas de código atuais (excluindo `node_modules`/`venv`) | **9.814**            |
| ↳ Python (backend)                                     | 2.605 linhas (48 arquivos) |
| ↳ TypeScript / TSX (frontend)                          | 5.608 linhas (47 arquivos) |
| ↳ Markdown (docs)                                      | 1.601 linhas (8 arquivos)  |
| Linhas adicionadas no histórico (todos commits)        | **16.331**           |
| Migrações de banco de dados (Alembic)                  | 5 (`0001` → `0005`)  |
| Endpoints REST expostos                                | 22                   |
| Páginas de frontend                                    | 14                   |

### 4.3 Tempo investido

| Item                                        | Valor                  |
| ------------------------------------------- | ---------------------- |
| Período calendário (1º → último commit)     | **22 horas**           |
| Dias trabalhados                            | **2** (25/abr e 26/abr) |
| Tempo ativo estimado                        | **~8 horas efetivas**  |
| ↳ Sexta 25/abr (scaffold + OAuth + aprovações)   | ~3 h                   |
| ↳ Sábado 26/abr (scheduler, dashboards, embed, mobile, docs) | ~5 h    |

### 4.4 Equipe e ferramentas

- **1 pessoa**: Senior Solutions AI Architect.
- **1 ferramenta de IA**: Claude Code (assinatura **Claude Max — R$ 500/mês**).
- **Stakeholder único**: a própria agência (RP Marketing).
- **Sem PM, sem QA dedicado, sem designer adicional, sem DevOps separado.**

---

## 5. Comparativo: com vs sem Claude Code

### 5.1 Cenário "tradicional" (sem assistência de IA)

Para entregar o **mesmo escopo**, com o mesmo nível de qualidade (auth, OAuth, dashboard, scheduling, infra cloud, mobile, docs), uma equipe convencional típica seria:

| Perfil                              | Dedicação | Custo mensal CLT/PJ (BR, 2026) |
| ----------------------------------- | --------- | ------------------------------ |
| 1 Senior Backend Engineer (Python)  | Full-time | R$ 30.000                      |
| 1 Senior Frontend Engineer (React/Next) | Full-time | R$ 30.000                  |
| 1 DevOps / Cloud Engineer (GCP)     | Part-time (30%) | R$ 7.500 (de R$ 25.000)  |
| 1 Tech Lead (revisões + arquitetura) | Part-time (20%) | R$ 7.000 (de R$ 35.000)  |
| **Total time mensal**               |           | **R$ 74.500**                  |
| **Total com encargos/markup (×1,5)** |           | **R$ 111.750**                 |

**Tempo estimado para entrega:** 4 a 6 semanas (MVP completo, em produção, com a maturidade entregue aqui).

**Custo total estimado (4 semanas):** **R$ 110.000 a R$ 130.000**.
**Custo total estimado (6 semanas):** **R$ 165.000 a R$ 195.000**.

### 5.2 Cenário realizado (com Claude Code)

| Item                                         | Valor                                                |
| -------------------------------------------- | ---------------------------------------------------- |
| Pessoas                                      | 1 (Senior Solutions AI Architect)                    |
| Custo de pessoal (proporcional 2 dias úteis) | ~R$ 4.000 – 6.000                                    |
| Custo da ferramenta (Claude Max)             | R$ 500/mês                                           |
| **Total realizado (mês 1, fração usada)**    | **~R$ 4.500 – 6.500**                                |

### 5.3 Aceleração observada

| Dimensão              | Sem Claude Code   | Com Claude Code | Multiplicador        |
| --------------------- | ----------------- | --------------- | -------------------- |
| **Tempo até produção** | 4–6 semanas (~28–42 dias) | 2 dias        | **14× a 21× mais rápido**  |
| **Headcount necessário** | 4 perfis          | 1 perfil        | **75 % de redução**         |
| **Custo total**       | R$ 110k – 195k    | R$ 5k – 6,5k    | **~18× a 30× mais barato** |
| **Risco de comunicação** | Alto (4 pessoas, hand-offs) | Mínimo (single contributor) | Eliminação prática   |

### 5.4 O que viabilizou esse delta

- **Geração de código de qualidade de produção em alta velocidade**: backend (FastAPI + SQLAlchemy + Pydantic) e frontend (Next.js + Tailwind) escritos de forma consistente sem precisar alternar entre stacks ou contextos mentais.
- **Conhecimento embutido**: integrações complexas (Meta Graph API, Cloud Scheduler, Secret Manager) foram resolvidas em uma única conversa, sem dias de leitura de documentação.
- **Iteração imediata**: problemas reais (ex.: URLs do Instagram > 1024 chars quebrando a coluna `varchar`) foram identificados via leitura de logs e corrigidos em **minutos**, com migração + redeploy.
- **Decisões arquiteturais defendidas**: a escolha por **Instagram API com Instagram Login** (em vez do caminho legado via Facebook Login) foi proposta, justificada e implementada sem retrabalho.
- **Documentação produzida em paralelo**: arquitetura, contrato de API e este sumário foram escritos enquanto o código era entregue, sem fase separada de "documentação".

### 5.5 Limitações honestas

- Sem Claude Code, **a mesma pessoa solo** (Senior Solutions AI Architect) também conseguiria entregar — mas levaria estimadas **6 a 10 semanas de trabalho dedicado**, comparado às 2 dias realizadas.
- O custo de R$ 500/mês da assinatura cobre **muito mais do que este projeto** — pode ser amortizado em vários iniciativas paralelas.
- Os números não incluem trabalho futuro (App Review da Meta, CI/CD automatizado, observabilidade, testes automatizados em alta cobertura). Esses são caminhos naturais e foram **mapeados** no documento técnico.

---

## 6. Conclusão

Em **2 dias e ~8 horas de trabalho efetivo**, com **1 profissional** e **R$ 500 de assinatura de IA**, foi entregue uma plataforma SaaS multi-cliente, em produção no Google Cloud Run, com integração OAuth real à Meta, sincronização agendada por cliente e UI responsiva — escopo equivalente ao que uma equipe tradicional de **4 perfis** entregaria em **4 a 6 semanas** por **R$ 110.000 a R$ 195.000**.

**Aceleração média observada: ~17× em tempo, ~24× em custo.**
