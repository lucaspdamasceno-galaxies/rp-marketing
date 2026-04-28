"use client";

import { useMemo, useState } from "react";
import type {
  DadosMetaCampanha,
  DadosMetaRegiao,
  RelatorioTrafego,
} from "@/types/api";

type AggMeta = {
  valor_investido: number;
  alcance: number;
  impressoes: number;
  cliques_link: number;
  conversas: number;
  custo_conversa: number | null;
  ctr_link: number | null;
  cpc_medio: number | null;
};
type AggGoogle = {
  custo: number;
  impressoes: number;
  cliques: number;
  ctr: number | null;
  cpc_medio: number | null;
  cpm_medio: number | null;
};

type Bundle = {
  meta: AggMeta;
  google: AggGoogle;
  campanhasMeta: DadosMetaCampanha[];
  anunciosMeta: DadosMetaCampanha[];
  regioesMeta: DadosMetaRegiao[];
  campanhasGoogle: NonNullable<RelatorioTrafego["dados"]["google_ads"]>["campanhas"];
  pdfDestaque: { url: string; nome: string | null } | null;
  count: number;
  clienteNome: string | null;
};

const VAZIO_META: AggMeta = {
  valor_investido: 0,
  alcance: 0,
  impressoes: 0,
  cliques_link: 0,
  conversas: 0,
  custo_conversa: null,
  ctr_link: null,
  cpc_medio: null,
};
const VAZIO_GOOGLE: AggGoogle = {
  custo: 0,
  impressoes: 0,
  cliques: 0,
  ctr: null,
  cpc_medio: null,
  cpm_medio: null,
};

function fmtMoeda(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "R$ —";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR");
}
function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v.toFixed(2)}%`;
}
function fmtDataBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function deltaPct(
  atual: number | null | undefined,
  anterior: number | null | undefined,
): number | null {
  if (atual === null || atual === undefined) return null;
  if (anterior === null || anterior === undefined || anterior === 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

function dataParaIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function relatorioCobertoPor(
  r: RelatorioTrafego,
  ini: string,
  fim: string,
): boolean {
  return r.periodo_inicio <= fim && r.periodo_fim >= ini;
}

type LinhaTemporal<T> = {
  nome: string;
  atual: T;
  anterior: T | null;
  totalOcorrencias: number;
};

function agruparPorNome<T extends { nome: string }>(
  rels: RelatorioTrafego[],
  extrair: (r: RelatorioTrafego) => T[] | undefined,
): LinhaTemporal<T>[] {
  const ordenados = [...rels].sort((a, b) =>
    a.periodo_inicio.localeCompare(b.periodo_inicio),
  );
  const map = new Map<string, T[]>();
  for (const r of ordenados) {
    for (const item of extrair(r) ?? []) {
      const chave = (item.nome ?? "").trim();
      if (!chave) continue;
      const arr = map.get(chave) ?? [];
      arr.push(item);
      map.set(chave, arr);
    }
  }
  return Array.from(map.entries()).map(([nome, lista]) => ({
    nome,
    atual: lista[lista.length - 1],
    anterior: lista.length >= 2 ? lista[lista.length - 2] : null,
    totalOcorrencias: lista.length,
  }));
}

function agregar(rels: RelatorioTrafego[]): Bundle {
  const meta = { ...VAZIO_META };
  const google = { ...VAZIO_GOOGLE };
  const campanhasMeta: DadosMetaCampanha[] = [];
  const anunciosMeta: DadosMetaCampanha[] = [];
  const regioesMeta: DadosMetaRegiao[] = [];
  const campanhasGoogle: NonNullable<NonNullable<RelatorioTrafego["dados"]["google_ads"]>["campanhas"]> = [];
  let pdfDestaque: { url: string; nome: string | null } | null = null;
  let clienteNome: string | null = null;

  let custoConversaPond = 0;
  let conversasPond = 0;

  for (const r of rels) {
    const m = r.dados.meta_ads ?? {};
    const g = r.dados.google_ads ?? {};
    if (!clienteNome && r.cliente_nome_empresa) clienteNome = r.cliente_nome_empresa;

    meta.valor_investido += m.valor_investido ?? 0;
    meta.alcance += m.alcance ?? 0;
    meta.impressoes += m.impressoes ?? 0;
    meta.cliques_link += m.cliques_link ?? 0;
    meta.conversas += m.conversas ?? 0;
    if (m.custo_conversa && m.conversas) {
      custoConversaPond += m.custo_conversa * m.conversas;
      conversasPond += m.conversas;
    }
    google.custo += g.custo ?? 0;
    google.impressoes += g.impressoes ?? 0;
    google.cliques += g.cliques ?? 0;

    if (m.campanhas) campanhasMeta.push(...m.campanhas);
    if (m.anuncios) anunciosMeta.push(...m.anuncios);
    if (m.regioes) regioesMeta.push(...m.regioes);
    if (g.campanhas) campanhasGoogle.push(...g.campanhas);

    if (!pdfDestaque && r.pdf_url)
      pdfDestaque = { url: r.pdf_url, nome: r.pdf_nome_original };
  }

  meta.ctr_link =
    meta.impressoes > 0 ? (meta.cliques_link / meta.impressoes) * 100 : null;
  meta.cpc_medio =
    meta.cliques_link > 0 ? meta.valor_investido / meta.cliques_link : null;
  meta.custo_conversa =
    conversasPond > 0 ? custoConversaPond / conversasPond : null;

  google.ctr =
    google.impressoes > 0 ? (google.cliques / google.impressoes) * 100 : null;
  google.cpc_medio = google.cliques > 0 ? google.custo / google.cliques : null;
  google.cpm_medio =
    google.impressoes > 0 ? (google.custo / google.impressoes) * 1000 : null;

  return {
    meta,
    google,
    campanhasMeta,
    anunciosMeta,
    regioesMeta,
    campanhasGoogle,
    pdfDestaque,
    count: rels.length,
    clienteNome,
  };
}

const PRESETS: Array<{ key: string; label: string; days: number | null }> = [
  { key: "30", label: "Últimos 30 dias", days: 30 },
  { key: "90", label: "Últimos 90 dias", days: 90 },
  { key: "180", label: "Últimos 6 meses", days: 180 },
  { key: "365", label: "Último ano", days: 365 },
  { key: "all", label: "Todo o histórico", days: null },
];

type Props = {
  /** Lista cronológica (mais antigo → mais recente). */
  relatorios: RelatorioTrafego[];
  showHeader?: boolean;
  /** Quando definido, cada relatório carregado mostra botão de remover. */
  onRemoverRelatorio?: (id: string) => Promise<void>;
};

export function TrafegoDashboard({
  relatorios,
  showHeader = true,
  onRemoverRelatorio,
}: Props) {
  const minIso = relatorios[0]?.periodo_inicio ?? dataParaIso(new Date());
  const maxIso =
    relatorios[relatorios.length - 1]?.periodo_fim ?? dataParaIso(new Date());

  const [rangeIni, setRangeIni] = useState<string>(minIso);
  const [rangeFim, setRangeFim] = useState<string>(maxIso);
  const [presetAtivo, setPresetAtivo] = useState<string>("all");

  function aplicarPreset(p: (typeof PRESETS)[number]) {
    setPresetAtivo(p.key);
    if (p.days === null) {
      setRangeIni(minIso);
      setRangeFim(maxIso);
      return;
    }
    const fim = new Date();
    const ini = new Date();
    ini.setDate(fim.getDate() - p.days);
    setRangeIni(dataParaIso(ini));
    setRangeFim(dataParaIso(fim));
  }

  const noRange = useMemo(
    () => relatorios.filter((r) => relatorioCobertoPor(r, rangeIni, rangeFim)),
    [relatorios, rangeIni, rangeFim],
  );

  const atual = useMemo(() => agregar(noRange), [noRange]);

  // Linhas com evolução temporal: cada nome aparece uma vez, com a ocorrência
  // mais recente + a anterior (pra calcular delta).
  const linhas = useMemo(
    () => ({
      campanhasMeta: agruparPorNome<DadosMetaCampanha>(
        noRange,
        (r) => r.dados.meta_ads?.campanhas,
      ),
      anunciosMeta: agruparPorNome<DadosMetaCampanha>(
        noRange,
        (r) => r.dados.meta_ads?.anuncios,
      ),
      regioesMeta: agruparPorNome<DadosMetaRegiao>(
        noRange,
        (r) => r.dados.meta_ads?.regioes,
      ),
      campanhasGoogle: agruparPorNome(
        noRange,
        (r) => r.dados.google_ads?.campanhas,
      ),
    }),
    [noRange],
  );

  // Séries temporais — um ponto por relatório no range, ordenado.
  const series = useMemo(() => {
    const ordenados = [...noRange].sort((a, b) =>
      a.periodo_inicio.localeCompare(b.periodo_inicio),
    );
    const labelOf = (r: RelatorioTrafego) => fmtDataBr(r.periodo_inicio);
    const buildG = (
      ext: (r: RelatorioTrafego) => number | null | undefined,
    ): SeriePonto[] =>
      ordenados.map((r) => ({ label: labelOf(r), valor: ext(r) ?? null }));
    return {
      // Google
      gCusto: buildG((r) => r.dados.google_ads?.custo),
      gImpressoes: buildG((r) => r.dados.google_ads?.impressoes),
      gCliques: buildG((r) => r.dados.google_ads?.cliques),
      gCtr: buildG((r) => r.dados.google_ads?.ctr),
      gCpc: buildG((r) => r.dados.google_ads?.cpc_medio),
      gCpm: buildG((r) => r.dados.google_ads?.cpm_medio),
      // Meta
      mInvestido: buildG((r) => r.dados.meta_ads?.valor_investido),
      mConversas: buildG((r) => r.dados.meta_ads?.conversas),
      mCustoConv: buildG((r) => r.dados.meta_ads?.custo_conversa),
      mImpressoes: buildG((r) => r.dados.meta_ads?.impressoes),
      mAlcance: buildG((r) => r.dados.meta_ads?.alcance),
      mCliquesLink: buildG((r) => r.dados.meta_ads?.cliques_link),
      mCtrLink: buildG((r) => r.dados.meta_ads?.ctr_link),
      mCpc: buildG((r) => r.dados.meta_ads?.cpc_medio),
    };
  }, [noRange]);

  if (relatorios.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink-200 bg-surface py-16 text-center">
        <p className="text-base font-semibold text-ink-950">
          Sem relatórios ainda
        </p>
        <p className="max-w-sm text-sm text-ink-500">
          Quando o primeiro PDF for processado, o dashboard aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {showHeader && (
        <div className="flex flex-col gap-3">
          {/* Controles de período (preset + custom) */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => aplicarPreset(p)}
                className={`h-8 rounded-full px-3 text-xs font-medium transition ${
                  presetAtivo === p.key
                    ? "bg-brand-700 text-white"
                    : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <input
                type="date"
                value={rangeIni}
                onChange={(e) => {
                  setRangeIni(e.target.value);
                  setPresetAtivo("custom");
                }}
                className="h-8 rounded-lg border border-ink-300 bg-surface px-2 text-xs focus:border-accent-500 focus:outline-none"
              />
              <span className="text-xs text-ink-500">até</span>
              <input
                type="date"
                value={rangeFim}
                onChange={(e) => {
                  setRangeFim(e.target.value);
                  setPresetAtivo("custom");
                }}
                className="h-8 rounded-lg border border-ink-300 bg-surface px-2 text-xs focus:border-accent-500 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-ink-500">
            {atual.count} relatório(s) cobrindo {fmtDataBr(rangeIni)} a{" "}
            {fmtDataBr(rangeFim)}
          </p>
        </div>
      )}

      {/* Lista de relatórios carregados — sempre visível, no topo */}
      <RelatoriosCarregados
        relatorios={[...relatorios].sort((a, b) =>
          b.periodo_inicio.localeCompare(a.periodo_inicio),
        )}
        rangeIni={rangeIni}
        rangeFim={rangeFim}
        onRemover={onRemoverRelatorio}
      />

      {atual.count === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink-200 bg-surface py-12 text-center">
          <p className="text-base font-semibold text-ink-950">
            Sem dados nesse período
          </p>
          <p className="max-w-sm text-sm text-ink-500">
            Ajuste o intervalo ou escolha um preset acima.
          </p>
        </div>
      ) : (
        <>
          {/* Google Ads */}
          {(atual.google.custo > 0 ||
            (atual.campanhasGoogle && atual.campanhasGoogle.length > 0)) && (
            <PlatformSection
              accentClass="border-t-[#34A853]"
              logo={<GoogleAdsLogo />}
              titulo="Google Ads"
              cliente={atual.clienteNome}
            >
              <KpiGrid>
                <Kpi
                  label="Custo"
                  hint="Total investido em mídia no Google Ads."
                  valor={fmtMoeda(atual.google.custo)}
                  delta={null}
                  pontos={series.gCusto}
                  cor="#34A853"
                  formato={fmtMoeda}
                />
                <Kpi
                  label="Impressões"
                  hint="Quantas vezes seus anúncios apareceram."
                  valor={fmtNum(atual.google.impressoes)}
                  delta={null}
                  pontos={series.gImpressoes}
                  cor="#34A853"
                  formato={fmtNum}
                />
                <Kpi
                  label="Cliques"
                  hint="Total de cliques nos anúncios."
                  valor={fmtNum(atual.google.cliques)}
                  delta={null}
                  pontos={series.gCliques}
                  cor="#34A853"
                  formato={fmtNum}
                />
                <Kpi
                  label="CTR (Taxa de Cliques)"
                  hint="Cliques ÷ Impressões."
                  valor={fmtPct(atual.google.ctr)}
                  delta={null}
                  pontos={series.gCtr}
                  cor="#34A853"
                  formato={fmtPct}
                />
                <Kpi
                  label="CPC médio"
                  hint="Custo médio por clique."
                  valor={fmtMoeda(atual.google.cpc_medio)}
                  delta={null}
                  invert
                  pontos={series.gCpc}
                  cor="#34A853"
                  formato={fmtMoeda}
                />
                <Kpi
                  label="CPM médio"
                  hint="Custo por mil impressões."
                  valor={fmtMoeda(atual.google.cpm_medio)}
                  delta={null}
                  invert
                  pontos={series.gCpm}
                  cor="#34A853"
                  formato={fmtMoeda}
                />
              </KpiGrid>

              {linhas.campanhasGoogle.length > 0 && (
                <>
                  <SectionTitle>Todas as Campanhas</SectionTitle>
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>Campanhas</Th>
                        <Th>Custo</Th>
                        <Th>Impressões</Th>
                        <Th>Cliques</Th>
                        <Th>CTR (Taxa de Cliques)</Th>
                        <Th>CPC médio</Th>
                        <Th>Conversões</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.campanhasGoogle.map((row, i) => {
                        const a = row.atual;
                        const p = row.anterior;
                        return (
                          <tr key={i}>
                            <Td bold>{row.nome}</Td>
                            <TdDelta
                              valor={a.custo}
                              anterior={p?.custo}
                              formato={fmtMoeda}
                            />
                            <TdDelta
                              valor={a.impressoes}
                              anterior={p?.impressoes}
                              formato={fmtNum}
                            />
                            <TdDelta
                              valor={a.cliques}
                              anterior={p?.cliques}
                              formato={fmtNum}
                            />
                            <TdDelta
                              valor={a.ctr}
                              anterior={p?.ctr}
                              formato={fmtPct}
                            />
                            <TdDelta
                              valor={a.cpc_medio}
                              anterior={p?.cpc_medio}
                              formato={fmtMoeda}
                              invert
                            />
                            <TdDelta
                              valor={a.conversoes}
                              anterior={p?.conversoes}
                              formato={fmtNum}
                            />
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                </>
              )}
            </PlatformSection>
          )}

          {/* Meta Ads */}
          {(atual.meta.valor_investido > 0 ||
            atual.campanhasMeta.length > 0) && (
            <PlatformSection
              accentClass="border-t-[#1877F2]"
              logo={<MetaLogo />}
              titulo="Meta Ads"
              cliente={atual.clienteNome}
            >
              <KpiGrid>
                <Kpi
                  label="Valor investido"
                  hint="Total investido em mídia no Meta (Facebook/Instagram)."
                  valor={fmtMoeda(atual.meta.valor_investido)}
                  delta={null}
                  pontos={series.mInvestido}
                  cor="#1877F2"
                  formato={fmtMoeda}
                />
                <Kpi
                  label="Conversas iniciadas por mensagem"
                  hint="Quantas conversas no Direct/WhatsApp começaram via anúncio."
                  valor={fmtNum(atual.meta.conversas)}
                  delta={null}
                  highlight
                  pontos={series.mConversas}
                  formato={fmtNum}
                />
                <Kpi
                  label="Custo por conversa"
                  hint="Investido ÷ conversas iniciadas."
                  valor={fmtMoeda(atual.meta.custo_conversa)}
                  delta={null}
                  invert
                  pontos={series.mCustoConv}
                  cor="#1877F2"
                  formato={fmtMoeda}
                />
                <Kpi
                  label="Impressões totais"
                  hint="Total de visualizações dos anúncios."
                  valor={fmtNum(atual.meta.impressoes)}
                  delta={null}
                  pontos={series.mImpressoes}
                  cor="#1877F2"
                  formato={fmtNum}
                />
                <Kpi
                  label="Alcance total"
                  hint="Pessoas únicas atingidas."
                  valor={fmtNum(atual.meta.alcance)}
                  delta={null}
                  pontos={series.mAlcance}
                  cor="#1877F2"
                  formato={fmtNum}
                />
                <Kpi
                  label="Cliques no link"
                  hint="Cliques que levaram pra fora do Meta."
                  valor={fmtNum(atual.meta.cliques_link)}
                  delta={null}
                  pontos={series.mCliquesLink}
                  cor="#1877F2"
                  formato={fmtNum}
                />
                <Kpi
                  label="CTR (Taxa de cliques no link)"
                  hint="Cliques no link ÷ Impressões."
                  valor={fmtPct(atual.meta.ctr_link)}
                  delta={null}
                  pontos={series.mCtrLink}
                  cor="#1877F2"
                  formato={fmtPct}
                />
                <Kpi
                  label="CPC médio"
                  hint="Custo médio por clique no link."
                  valor={fmtMoeda(atual.meta.cpc_medio)}
                  delta={null}
                  invert
                  pontos={series.mCpc}
                  cor="#1877F2"
                  formato={fmtMoeda}
                />
              </KpiGrid>

              {linhas.campanhasMeta.length > 0 && (
                <>
                  <SectionTitle>Campanhas em destaque</SectionTitle>
                  <CampanhasTable rows={linhas.campanhasMeta} />
                </>
              )}

              {linhas.anunciosMeta.length > 0 && (
                <>
                  <SectionTitle>Anúncios em destaque</SectionTitle>
                  <CampanhasTable rows={linhas.anunciosMeta} />
                </>
              )}

              {linhas.regioesMeta.length > 0 && (
                <>
                  <SectionTitle>Regiões com maior alcance</SectionTitle>
                  <DataTable>
                    <thead>
                      <tr>
                        <Th>Regiões</Th>
                        <Th>Alcance</Th>
                        <Th>Impressões</Th>
                        <Th>Frequência</Th>
                        <Th>Valor investido</Th>
                        <Th>CPM</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.regioesMeta.map((row, i) => {
                        const a = row.atual;
                        const p = row.anterior;
                        return (
                          <tr key={i}>
                            <Td bold>{row.nome}</Td>
                            <TdDelta
                              valor={a.alcance}
                              anterior={p?.alcance}
                              formato={fmtNum}
                            />
                            <TdDelta
                              valor={a.impressoes}
                              anterior={p?.impressoes}
                              formato={fmtNum}
                            />
                            <TdDelta
                              valor={a.frequencia}
                              anterior={p?.frequencia}
                              formato={(v) =>
                                v !== null && v !== undefined
                                  ? v.toFixed(2)
                                  : "—"
                              }
                            />
                            <TdDelta
                              valor={a.valor_investido}
                              anterior={p?.valor_investido}
                              formato={fmtMoeda}
                            />
                            <TdDelta
                              valor={a.cpm}
                              anterior={p?.cpm}
                              formato={fmtMoeda}
                              invert
                            />
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                </>
              )}
            </PlatformSection>
          )}

        </>
      )}
    </div>
  );
}

// =====================================================================
// UI helpers
// =====================================================================

function PlatformSection({
  accentClass,
  logo,
  titulo,
  cliente,
  children,
}: {
  accentClass: string;
  logo: React.ReactNode;
  titulo: string;
  cliente: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-ink-200 bg-surface border-t-4 ${accentClass}`}
    >
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 sm:px-6">
        <div className="flex h-9 w-9 items-center justify-center">{logo}</div>
        <div>
          <h2 className="text-base font-semibold text-ink-950">{titulo}</h2>
          {cliente && <p className="text-xs text-ink-500">{cliente}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-6 p-4 sm:p-6">{children}</div>
    </section>
  );
}

function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  );
}

// SeriePonto: um ponto na evolução temporal de um KPI.
type SeriePonto = { label: string; valor: number | null };

function Kpi({
  label,
  hint,
  valor,
  delta,
  invert = false,
  highlight = false,
  pontos,
  cor,
  formato,
}: {
  label: string;
  hint?: string;
  valor: string;
  delta: number | null;
  invert?: boolean;
  highlight?: boolean;
  pontos?: SeriePonto[];
  cor?: string;
  formato?: (v: number) => string;
}) {
  const positive = delta !== null && (invert ? delta < 0 : delta > 0);
  const negative = delta !== null && (invert ? delta > 0 : delta < 0);
  const tone =
    delta === null
      ? "text-ink-500"
      : positive
        ? "text-success-500"
        : negative
          ? "text-danger-500"
          : "text-ink-500";

  const lineCor = cor ?? (highlight ? "#0E2A8E" : "#1E90FF");
  const validos = (pontos ?? []).filter((p) => p.valor !== null);
  const mostrarChart = (pontos?.length ?? 0) >= 2 && validos.length >= 2;

  return (
    <div
      className={`flex flex-col rounded-xl border p-4 transition ${
        highlight
          ? "border-brand-700/30 bg-brand-100/40"
          : "border-ink-200 bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-medium text-ink-500">{label}</p>
          {hint && (
            <span title={hint} className="cursor-help text-ink-400">
              <IconHelp />
            </span>
          )}
        </div>
        {delta !== null && (
          <span className={`text-[10px] font-semibold ${tone}`}>
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <p
        className={`mt-1.5 text-2xl font-semibold leading-tight ${
          highlight ? "text-brand-700" : "text-ink-950"
        }`}
      >
        {valor}
      </p>
      {mostrarChart && pontos && (
        <MetricLineChart
          pontos={pontos}
          cor={lineCor}
          formato={formato}
          altura={64}
        />
      )}
    </div>
  );
}

function MetricLineChart({
  pontos,
  cor,
  formato,
  altura = 60,
}: {
  pontos: SeriePonto[];
  cor: string;
  formato?: (v: number) => string;
  altura?: number;
}) {
  const W = 200;
  const padX = 6;
  const padY = 8;
  const validos = pontos.filter((p) => p.valor !== null);
  if (validos.length < 2) return null;

  const valores = validos.map((p) => p.valor!) as number[];
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const range = max - min || Math.abs(max) || 1;

  const x = (i: number) =>
    pontos.length === 1
      ? W / 2
      : padX + (i / (pontos.length - 1)) * (W - 2 * padX);
  const y = (v: number) =>
    padY + (1 - (v - min) / range) * (altura - 2 * padY);

  let pathData = "";
  let areaData = "";
  let firstX = 0;
  let lastX = 0;
  pontos.forEach((p, i) => {
    if (p.valor === null) return;
    const xi = x(i);
    const yi = y(p.valor);
    if (!pathData) {
      pathData = `M ${xi} ${yi}`;
      firstX = xi;
    } else {
      pathData += ` L ${xi} ${yi}`;
    }
    lastX = xi;
  });
  if (pathData) {
    areaData = `${pathData} L ${lastX} ${altura - padY} L ${firstX} ${altura - padY} Z`;
  }

  const ultimo = validos[validos.length - 1];
  const primeiro = validos[0];
  const labelInicio = pontos[0]?.label ?? "";
  const labelFim = pontos[pontos.length - 1]?.label ?? "";

  return (
    <div className="mt-3 flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${W} ${altura}`}
        className="w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Evolução: ${primeiro?.valor} → ${ultimo?.valor}`}
      >
        {areaData && (
          <path d={areaData} fill={cor} fillOpacity="0.1" />
        )}
        {pathData && (
          <path
            d={pathData}
            fill="none"
            stroke={cor}
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {pontos.map((p, i) =>
          p.valor === null ? null : (
            <circle
              key={i}
              cx={x(i)}
              cy={y(p.valor)}
              r="2.5"
              fill="white"
              stroke={cor}
              strokeWidth="1.5"
            >
              <title>
                {p.label}:{" "}
                {formato ? formato(p.valor) : p.valor.toLocaleString("pt-BR")}
              </title>
            </circle>
          ),
        )}
      </svg>
      <div className="flex items-center justify-between text-[10px] text-ink-400">
        <span>{labelInicio}</span>
        <span>{labelFim}</span>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-center text-sm font-medium text-ink-700">
      {children}
    </h3>
  );
}

function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">{children}</table>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-ink-100 bg-canvas px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-ink-500">
      {children}
    </th>
  );
}
function Td({
  children,
  bold = false,
}: {
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <td
      className={`border-b border-ink-100 px-4 py-3 text-sm ${
        bold ? "font-medium text-ink-950" : "text-ink-700"
      }`}
    >
      {children}
    </td>
  );
}

/** Célula numérica com indicador de delta vs ocorrência anterior. */
function TdDelta({
  valor,
  anterior,
  formato,
  invert = false,
}: {
  valor: number | null | undefined;
  anterior: number | null | undefined;
  formato: (v: number | null | undefined) => string;
  invert?: boolean;
}) {
  const tem = valor !== null && valor !== undefined;
  const temAnterior = anterior !== null && anterior !== undefined && anterior !== 0;
  const d = tem && temAnterior ? ((valor - (anterior as number)) / (anterior as number)) * 100 : null;
  const positive = d !== null && (invert ? d < 0 : d > 0);
  const negative = d !== null && (invert ? d > 0 : d < 0);
  const tone =
    d === null
      ? "text-ink-400"
      : positive
        ? "text-success-500"
        : negative
          ? "text-danger-500"
          : "text-ink-400";
  return (
    <td className="border-b border-ink-100 px-4 py-3 text-sm">
      <div className="flex flex-col leading-tight">
        <span className="text-ink-700">{formato(valor)}</span>
        {d !== null && (
          <span className={`text-[10px] font-medium ${tone}`}>
            {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
          </span>
        )}
      </div>
    </td>
  );
}

function CampanhasTable({
  rows,
}: {
  rows: LinhaTemporal<DadosMetaCampanha>[];
}) {
  return (
    <DataTable>
      <thead>
        <tr>
          <Th>Nome</Th>
          <Th>Resultados</Th>
          <Th>Valor investido</Th>
          <Th>Alcance</Th>
          <Th>Impressões</Th>
          <Th>CTR (Todos)</Th>
          <Th>CPC</Th>
          <Th>CPM</Th>
          <Th>Frequência</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const a = row.atual;
          const p = row.anterior;
          return (
            <tr key={i}>
              <Td bold>{row.nome}</Td>
              <Td>{a.resultados ?? "—"}</Td>
              <TdDelta
                valor={a.valor_investido}
                anterior={p?.valor_investido}
                formato={fmtMoeda}
              />
              <TdDelta
                valor={a.alcance}
                anterior={p?.alcance}
                formato={fmtNum}
              />
              <TdDelta
                valor={a.impressoes}
                anterior={p?.impressoes}
                formato={fmtNum}
              />
              <TdDelta valor={a.ctr} anterior={p?.ctr} formato={fmtPct} />
              <TdDelta
                valor={a.cpc}
                anterior={p?.cpc}
                formato={fmtMoeda}
                invert
              />
              <TdDelta
                valor={a.cpm}
                anterior={p?.cpm}
                formato={fmtMoeda}
                invert
              />
              <TdDelta
                valor={a.frequencia}
                anterior={p?.frequencia}
                formato={(v) =>
                  v !== null && v !== undefined ? v.toFixed(2) : "—"
                }
              />
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

// =====================================================================
// Ícones / Logos
// =====================================================================

function GoogleAdsLogo() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
      <path
        d="M14 5l-9 16a4 4 0 0 0 7 4l9-16a4 4 0 0 0-7-4z"
        fill="#FBBC05"
      />
      <path
        d="M22 9l9 16a4 4 0 0 1-7 4L15 13a4 4 0 0 1 7-4z"
        fill="#34A853"
      />
      <circle cx="9" cy="29" r="4" fill="#4285F4" />
    </svg>
  );
}
function MetaLogo() {
  return (
    <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
      <path
        d="M5 26c0-7 4-13 9-13 4 0 6 3 8 6l4 6c2 3 4 6 7 6 3 0 5-2 5-5s-2-5-5-5c-2 0-4 1-6 3l-3 4c-2 3-5 7-9 7s-7-3-9-7l-1-2z"
        fill="#1877F2"
      />
    </svg>
  );
}
function RelatoriosCarregados({
  relatorios,
  rangeIni,
  rangeFim,
  onRemover,
}: {
  relatorios: RelatorioTrafego[];
  rangeIni: string;
  rangeFim: string;
  onRemover?: (id: string) => Promise<void>;
}) {
  const [removendo, setRemovendo] = useState<string | null>(null);
  if (relatorios.length === 0) return null;

  async function remover(id: string) {
    if (!onRemover) return;
    if (!confirm("Remover este relatório?")) return;
    setRemovendo(id);
    try {
      await onRemover(id);
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-950">
          Relatórios carregados
        </h3>
        <span className="text-[11px] text-ink-500">
          {relatorios.length} ao todo
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {relatorios.map((r) => {
          const dentro =
            r.periodo_inicio <= rangeFim && r.periodo_fim >= rangeIni;
          return (
            <div
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                dentro
                  ? "border-ink-200 bg-canvas/40"
                  : "border-dashed border-ink-200 bg-canvas/20 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    dentro ? "bg-success-500" : "bg-ink-300"
                  }`}
                  title={dentro ? "no período" : "fora do período"}
                />
                <span className="font-medium text-ink-950">
                  {fmtDataBr(r.periodo_inicio)} → {fmtDataBr(r.periodo_fim)}
                </span>
                {r.pdf_nome_original && (
                  <span className="hidden text-[11px] text-ink-500 sm:inline">
                    · {r.pdf_nome_original}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {r.pdf_url && (
                  <a
                    href={r.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-700 hover:underline"
                  >
                    Abrir PDF
                  </a>
                )}
                {onRemover && (
                  <button
                    type="button"
                    onClick={() => remover(r.id)}
                    disabled={removendo === r.id}
                    className="text-xs font-medium text-danger-500 hover:underline disabled:opacity-50"
                  >
                    {removendo === r.id ? "Removendo…" : "Remover"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M9.5 9.5a2.5 2.5 0 1 1 4 2c-1 .8-1.5 1.3-1.5 2.5M12 17.5h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
