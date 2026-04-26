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

export type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

export type Aprovacao = {
  id: string;
  cliente_id: string;
  cliente_nome_empresa: string | null;
  admin_id: string;
  admin_nome: string | null;
  tipo: TipoPostagem;
  url_midia: string;
  legenda: string | null;
  data_agendada: string | null;
  status: StatusAprovacao;
  comentario_revisao: string | null;
  decidido_em: string | null;
  created_at: string;
  updated_at: string;
};

export type AprovacaoCreate = {
  cliente_id: string;
  tipo: TipoPostagem;
  url_midia: string;
  legenda?: string | null;
  data_agendada?: string | null;
};

export type AprovacaoDecisao = {
  comentario?: string | null;
};

export type TipoPostagem = "IMAGE" | "VIDEO" | "CAROUSEL" | "REEL";

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

export type DashboardData = {
  resumo: DashboardResumo;
  crescimento: DashboardCrescimentoPonto[];
  ultimas_postagens: Postagem[];
  last_sync_at: string | null;
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
