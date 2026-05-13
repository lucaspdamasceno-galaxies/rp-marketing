export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string | null;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type Role = "admin" | "cliente";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type UsuarioMe = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  cliente_id: string | null;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  usuario: Pick<Usuario, "id" | "nome" | "email" | "role">;
};

export type Cliente = {
  id: string;
  usuario_id: string;
  nome: string;
  email: string;
  ativo: boolean;
  nome_empresa: string;
  instagram_account_id: string | null;
  instagram_conectado: boolean;
  token_expires_at: string | null;
  sync_cron: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConectarInstagramResponse = {
  cliente_id: string;
  instagram_account_id: string;
  token_expires_at: string;
};

export type SyncInstagramResponse = {
  postagens_novas: number;
  followers: number;
};

export type SyncScheduleResponse = {
  cliente_id: string;
  cron: string | null;
  scheduler_job: string | null;
};

export type TipoPostagem = "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL";

// ----- Aprovações (Trello v2) -----

export type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

export type AprovacaoMidia = {
  id: string;
  ordem: number;
  url: string;
  mime_type: string;
  tamanho_bytes: number;
  nome_original: string;
  created_at: string;
};

export type AprovacaoComentario = {
  id: string;
  aprovacao_id: string;
  autor_id: string;
  autor_nome: string | null;
  autor_role: Role | null;
  mensagem: string;
  anexos_urls: string[];
  created_at: string;
};

export type Aprovacao = {
  id: string;
  cliente_id: string;
  cliente_nome_empresa: string | null;
  admin_id: string;
  admin_nome: string | null;
  titulo: string;
  tipo: TipoPostagem;
  legenda: string | null;
  data_agendada: string | null;
  status_texto: StatusAprovacao;
  status_arte: StatusAprovacao;
  decidido_texto_em: string | null;
  decidido_arte_em: string | null;
  postado_em: string | null;
  midias: AprovacaoMidia[];
  total_comentarios: number;
  created_at: string;
  updated_at: string;
};

export type AprovacaoDetail = Aprovacao & {
  comentarios: AprovacaoComentario[];
};

export type AprovacaoCreate = {
  cliente_id: string;
  titulo: string;
  tipo: TipoPostagem;
  legenda?: string | null;
  data_agendada?: string | null;
};

export type AprovacaoUpdate = Partial<Omit<AprovacaoCreate, "cliente_id">>;

export type AprovacaoDecisao = {
  comentario?: string | null;
};

// ----- Postagens / Dashboard -----

export type Postagem = {
  id: string;
  cliente_id: string;
  instagram_media_id: string;
  tipo: TipoPostagem;
  url_midia: string;
  permalink: string | null;
  legenda: string | null;
  curtidas: number;
  comentarios: number;
  visualizacoes: number;
  alcance: number;
  data_publicacao: string;
  created_at: string;
  updated_at: string;
};

export type DashboardResumo = {
  followers: number;
  total_curtidas: number;
  total_comentarios: number;
  total_alcance: number;
  total_postagens: number;
};

export type DashboardCrescimentoPonto = {
  data: string;
  followers: number;
};

export type DeltaMetrica = {
  absoluto: number;
  percentual: number;
};

export type CampoCustomizado = {
  chave: string;
  label: string;
  valor: number;
  sufixo?: string | null;
};

export type DashboardData = {
  resumo: DashboardResumo;
  deltas: Record<
    "followers" | "curtidas" | "comentarios" | "alcance" | "postagens",
    DeltaMetrica
  >;
  crescimento: DashboardCrescimentoPonto[];
  ultimas_postagens: Postagem[];
  last_sync_at: string | null;
  campos_customizados: CampoCustomizado[];
  fonte: "auto" | "manual";
};

export type OrdenarPostagensPor = "engajamento" | "data";

export type ListarPostagensParams = {
  periodo_inicio?: string;
  periodo_fim?: string;
  ordenar_por?: OrdenarPostagensPor;
  page?: number;
  page_size?: number;
};

export type DashboardParams = {
  periodo_inicio?: string;
  periodo_fim?: string;
};

// ----- Tráfego pago -----

export type DadosGoogleAds = {
  custo?: number | null;
  impressoes?: number | null;
  cliques?: number | null;
  ctr?: number | null;
  cpc_medio?: number | null;
  cpm_medio?: number | null;
  campanhas?: Array<{
    nome: string;
    custo?: number | null;
    impressoes?: number | null;
    cliques?: number | null;
    ctr?: number | null;
    cpc_medio?: number | null;
    conversoes?: number | null;
  }>;
};

export type DadosMetaCampanha = {
  nome: string;
  resultados?: string | null;
  custo_resultado?: string | null;
  valor_investido?: number | null;
  alcance?: number | null;
  impressoes?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  cpm?: number | null;
  frequencia?: number | null;
};

export type DadosMetaRegiao = {
  nome: string;
  alcance?: number | null;
  impressoes?: number | null;
  frequencia?: number | null;
  valor_investido?: number | null;
  cpm?: number | null;
};

export type DadosMetaAds = {
  valor_investido?: number | null;
  conversas?: number | null;
  custo_conversa?: number | null;
  impressoes?: number | null;
  alcance?: number | null;
  cliques_link?: number | null;
  ctr_link?: number | null;
  cpc_medio?: number | null;
  campanhas?: DadosMetaCampanha[];
  anuncios?: DadosMetaCampanha[];
  regioes?: DadosMetaRegiao[];
};

export type DadosRelatorio = {
  periodo?: { inicio: string; fim: string };
  google_ads?: DadosGoogleAds;
  meta_ads?: DadosMetaAds;
};

export type RelatorioTrafego = {
  id: string;
  cliente_id: string;
  cliente_nome_empresa: string | null;
  admin_id: string;
  admin_nome: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  pdf_url: string | null;
  pdf_nome_original: string | null;
  dados: DadosRelatorio;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type RelatorioTrafegoSerieItem = {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  google_custo: number | null;
  google_impressoes: number | null;
  google_cliques: number | null;
  google_ctr: number | null;
  google_cpc: number | null;
  meta_investido: number | null;
  meta_alcance: number | null;
  meta_impressoes: number | null;
  meta_cliques_link: number | null;
  meta_ctr_link: number | null;
  meta_cpc: number | null;
  meta_conversas: number | null;
};

export type RelatorioTrafegoDiff = {
  anterior: RelatorioTrafegoSerieItem;
  atual: RelatorioTrafegoSerieItem;
  deltas: Record<string, number | null>;
};

// ----- Métricas mensais -----

export type MetricasMensais = {
  id: string;
  cliente_id: string;
  cliente_nome_empresa: string | null;
  admin_id: string;
  data_inicio: string;
  data_fim: string;
  seguidores: number;
  seguidores_ganhos: number;
  seguidores_perdidos: number;
  alcance: number;
  impressoes: number;
  visualizacoes: number;
  curtidas: number;
  comentarios: number;
  compartilhamentos: number;
  salvamentos: number;
  visitas_perfil: number;
  cliques_site: number;
  total_postagens: number;
  total_stories: number;
  total_reels: number;
  observacoes: string | null;
  campos_customizados: CampoCustomizado[];
  created_at: string;
  updated_at: string;
};

export type MetricasMensaisInput = Omit<
  MetricasMensais,
  | "id"
  | "cliente_nome_empresa"
  | "admin_id"
  | "created_at"
  | "updated_at"
>;

// ----- Contratos -----

export type StatusContrato = "rascunho" | "ativo" | "encerrado" | "cancelado";

export type ItemEscopoContrato =
  | "trafego_pago"
  | "gestao_redes_sociais"
  | "producao_conteudo"
  | "branding"
  | "site"
  | "consultoria";

export type Contrato = {
  id: string;
  cliente_id: string;
  cliente_nome_empresa: string | null;
  admin_id: string;
  admin_nome: string | null;
  titulo: string;
  escopo: string[];
  descricao: string | null;
  valor_mensal: string | null;
  duracao_meses: number;
  data_inicio: string;
  data_fim: string;
  status: StatusContrato;
  pdf_url: string | null;
  pdf_nome_original: string | null;
  assinado_em_externo: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
  updated_at: string;
};

export type ContratoCreate = {
  cliente_id: string;
  titulo: string;
  escopo: string[];
  descricao?: string | null;
  valor_mensal?: number | string | null;
  duracao_meses: number;
  data_inicio: string;
};

export type ContratoUpdate = Partial<Omit<ContratoCreate, "cliente_id">>;
