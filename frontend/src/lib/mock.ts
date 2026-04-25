import type {
  DashboardData,
  DashboardCrescimentoPonto,
  Postagem,
  Cliente,
  Aprovacao,
} from "@/types/api";

const HOJE = new Date("2026-04-25T18:00:00-03:00");

function diasAtras(dias: number): string {
  const d = new Date(HOJE);
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

const seguidoresBase = 12000;
const crescimento: DashboardCrescimentoPonto[] = Array.from(
  { length: 30 },
  (_, i) => {
    const dia = 29 - i;
    const ruido = Math.sin(i / 3) * 80 + Math.cos(i / 5) * 50;
    return {
      data: diasAtras(dia),
      followers: Math.round(seguidoresBase + i * 28 + ruido),
    };
  },
);

function makePost(over: Partial<Postagem>): Postagem {
  const data = over.data_publicacao ?? diasAtras(0);
  return {
    id: "p",
    cliente_id: "c1",
    instagram_media_id: "ig",
    tipo: "IMAGE",
    url_midia: "",
    permalink: null,
    legenda: null,
    curtidas: 0,
    comentarios: 0,
    visualizacoes: 0,
    alcance: 0,
    impressoes: 0,
    data_publicacao: data,
    created_at: data,
    updated_at: data,
    ...over,
  };
}

const POSTAGENS: Postagem[] = [
  makePost({
    id: "p1",
    instagram_media_id: "ig_1",
    tipo: "REEL",
    url_midia:
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80",
    legenda:
      "Como o nosso cliente aumentou em 3x o engajamento usando carrosséis educativos. Salve esse post para depois 👇",
    curtidas: 1842,
    comentarios: 132,
    visualizacoes: 24310,
    alcance: 18420,
    impressoes: 22115,
    data_publicacao: diasAtras(2),
  }),
  makePost({
    id: "p2",
    instagram_media_id: "ig_2",
    tipo: "CAROUSEL",
    url_midia:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
    legenda:
      "5 erros que estão sabotando seu Instagram (e como resolver hoje).",
    curtidas: 921,
    comentarios: 78,
    visualizacoes: 0,
    alcance: 8420,
    impressoes: 10231,
    data_publicacao: diasAtras(4),
  }),
  makePost({
    id: "p3",
    instagram_media_id: "ig_3",
    tipo: "IMAGE",
    url_midia:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
    legenda: "Bastidores do nosso último ensaio com a equipe ✨",
    curtidas: 612,
    comentarios: 41,
    visualizacoes: 0,
    alcance: 5210,
    impressoes: 6112,
    data_publicacao: diasAtras(6),
  }),
  makePost({
    id: "p4",
    instagram_media_id: "ig_4",
    tipo: "REEL",
    url_midia:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    legenda: "Tendência do mês: vídeos curtos com legenda dinâmica 📲",
    curtidas: 2310,
    comentarios: 198,
    visualizacoes: 31200,
    alcance: 22410,
    impressoes: 27800,
    data_publicacao: diasAtras(9),
  }),
  makePost({
    id: "p5",
    instagram_media_id: "ig_5",
    tipo: "IMAGE",
    url_midia:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    legenda: "Resultados do mês de março no marketing digital.",
    curtidas: 488,
    comentarios: 22,
    visualizacoes: 0,
    alcance: 4120,
    impressoes: 4890,
    data_publicacao: diasAtras(12),
  }),
  makePost({
    id: "p6",
    instagram_media_id: "ig_6",
    tipo: "CAROUSEL",
    url_midia:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
    legenda: "Checklist gratuito: como auditar a presença digital da sua marca.",
    curtidas: 1102,
    comentarios: 89,
    visualizacoes: 0,
    alcance: 9810,
    impressoes: 11420,
    data_publicacao: diasAtras(15),
  }),
  makePost({
    id: "p7",
    instagram_media_id: "ig_7",
    tipo: "REEL",
    url_midia:
      "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&q=80",
    legenda: "Trend que dominou as marcas brasileiras em abril.",
    curtidas: 1980,
    comentarios: 154,
    visualizacoes: 28910,
    alcance: 19440,
    impressoes: 23410,
    data_publicacao: diasAtras(18),
  }),
  makePost({
    id: "p8",
    instagram_media_id: "ig_8",
    tipo: "IMAGE",
    url_midia:
      "https://images.unsplash.com/photo-1528747045269-390fe33c19f2?w=800&q=80",
    legenda: "Cliente em destaque no mês: Studio Aurora.",
    curtidas: 712,
    comentarios: 38,
    visualizacoes: 0,
    alcance: 6010,
    impressoes: 7220,
    data_publicacao: diasAtras(22),
  }),
];

export const mockDashboard: DashboardData = {
  resumo: {
    followers: 12847,
    total_curtidas: POSTAGENS.reduce((acc, p) => acc + p.curtidas, 0),
    total_comentarios: POSTAGENS.reduce((acc, p) => acc + p.comentarios, 0),
    total_alcance: POSTAGENS.reduce((acc, p) => acc + p.alcance, 0),
    total_postagens: POSTAGENS.length,
  },
  crescimento,
  ultimas_postagens: POSTAGENS.slice(0, 4),
};

export const mockPostagens: Postagem[] = POSTAGENS;

export function findPostagem(id: string): Postagem | undefined {
  return POSTAGENS.find((p) => p.id === id);
}

export const mockUsuario = {
  nome: "Lucas Damasceno",
  email: "lucas@studioaurora.com",
  empresa: "Studio Aurora",
  iniciais: "LD",
};

export const mockClientes: Cliente[] = [
  {
    id: "c0",
    usuario_id: "u0",
    nome: "RP Marketing",
    email: "contato@rpmarketing.com.br",
    ativo: true,
    nome_empresa: "RP Marketing",
    instagram_account_id: "17841400000000001",
    instagram_conectado: true,
    token_expires_at: diasAtras(-58),
    created_at: diasAtras(180),
    updated_at: diasAtras(1),
  },
  {
    id: "c1",
    usuario_id: "u1",
    nome: "Lucas Damasceno",
    email: "lucas@studioaurora.com",
    ativo: true,
    nome_empresa: "Studio Aurora",
    instagram_account_id: "1789200012345",
    instagram_conectado: true,
    token_expires_at: diasAtras(-50),
    created_at: diasAtras(120),
    updated_at: diasAtras(2),
  },
  {
    id: "c2",
    usuario_id: "u2",
    nome: "Marina Lopes",
    email: "marina@casalumen.com.br",
    ativo: true,
    nome_empresa: "Casa Lumen",
    instagram_account_id: null,
    instagram_conectado: false,
    token_expires_at: null,
    created_at: diasAtras(40),
    updated_at: diasAtras(40),
  },
  {
    id: "c3",
    usuario_id: "u3",
    nome: "Pedro Ferraz",
    email: "pedro@verdevida.com.br",
    ativo: true,
    nome_empresa: "Verde Vida Cosméticos",
    instagram_account_id: "1789200054321",
    instagram_conectado: true,
    token_expires_at: diasAtras(-30),
    created_at: diasAtras(75),
    updated_at: diasAtras(7),
  },
];

export function findCliente(id: string): Cliente | undefined {
  return mockClientes.find((c) => c.id === id);
}

export const mockAprovacoes: Aprovacao[] = [
  {
    id: "a1",
    cliente_id: "c1",
    cliente_nome_empresa: "Studio Aurora",
    admin_id: "u-admin",
    admin_nome: "Equipe RP",
    tipo: "IMAGE",
    url_midia:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80",
    legenda:
      "Bastidores do nosso último ensaio com a equipe ✨\n\nPropostas: 3 hashtags + CTA pra agendamento.",
    data_agendada: diasAtras(-3),
    status: "pendente",
    comentario_revisao: null,
    decidido_em: null,
    created_at: diasAtras(1),
    updated_at: diasAtras(1),
  },
  {
    id: "a2",
    cliente_id: "c1",
    cliente_nome_empresa: "Studio Aurora",
    admin_id: "u-admin",
    admin_nome: "Equipe RP",
    tipo: "REEL",
    url_midia:
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=80",
    legenda:
      "Reel sobre tendências do mês. Áudio em alta + 3 cortes rápidos.",
    data_agendada: diasAtras(-1),
    status: "aprovado",
    comentario_revisao: "Ficou ótimo, podem subir!",
    decidido_em: diasAtras(2),
    created_at: diasAtras(5),
    updated_at: diasAtras(2),
  },
  {
    id: "a3",
    cliente_id: "c0",
    cliente_nome_empresa: "RP Marketing",
    admin_id: "u-admin",
    admin_nome: "Equipe RP",
    tipo: "CAROUSEL",
    url_midia:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
    legenda: "Cases de cliente — versão 2 com 5 slides.",
    data_agendada: null,
    status: "rejeitado",
    comentario_revisao:
      "Trocar a foto do slide 3 — está muito escura. Ajustar copy do CTA também.",
    decidido_em: diasAtras(3),
    created_at: diasAtras(7),
    updated_at: diasAtras(3),
  },
];

export function findAprovacao(id: string): Aprovacao | undefined {
  return mockAprovacoes.find((a) => a.id === id);
}

const FACTOR_BY_CLIENTE: Record<string, number> = {
  c0: 1.6,
  c1: 1.0,
  c2: 0.4,
  c3: 0.75,
};

export function mockDashboardFor(clienteId: string): DashboardData {
  const f = FACTOR_BY_CLIENTE[clienteId] ?? 1.0;
  const scale = (v: number) => Math.round(v * f);
  return {
    resumo: {
      followers: scale(mockDashboard.resumo.followers),
      total_curtidas: scale(mockDashboard.resumo.total_curtidas),
      total_comentarios: scale(mockDashboard.resumo.total_comentarios),
      total_alcance: scale(mockDashboard.resumo.total_alcance),
      total_postagens: mockDashboard.resumo.total_postagens,
    },
    crescimento: mockDashboard.crescimento.map((p) => ({
      data: p.data,
      followers: scale(p.followers),
    })),
    ultimas_postagens: mockDashboard.ultimas_postagens.map((p) => ({
      ...p,
      cliente_id: clienteId,
      curtidas: scale(p.curtidas),
      comentarios: scale(p.comentarios),
      alcance: scale(p.alcance),
      impressoes: scale(p.impressoes),
      visualizacoes: scale(p.visualizacoes),
    })),
  };
}
