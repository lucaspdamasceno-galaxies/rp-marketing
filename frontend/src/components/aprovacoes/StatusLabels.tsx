import { Badge } from "@/components/ui/Badge";
import type { Aprovacao, StatusAprovacao } from "@/types/api";

const STATUS_TEXTO: Record<StatusAprovacao, { label: string; tone: "warning" | "success" | "danger" }> = {
  pendente: { label: "Pendente aprovação do texto", tone: "warning" },
  aprovado: { label: "Texto aprovado", tone: "success" },
  rejeitado: { label: "Texto rejeitado", tone: "danger" },
};

const STATUS_ARTE: Record<StatusAprovacao, { label: string; tone: "warning" | "brand" | "danger" }> = {
  pendente: { label: "Pendente aprovação da arte", tone: "warning" },
  aprovado: { label: "Arte aprovada", tone: "brand" },
  rejeitado: { label: "Arte rejeitada", tone: "danger" },
};

export function StatusLabels({ aprovacao }: { aprovacao: Aprovacao }) {
  const t = STATUS_TEXTO[aprovacao.status_texto];
  const a = STATUS_ARTE[aprovacao.status_arte];
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={t.tone}>{t.label}</Badge>
      <Badge tone={a.tone}>{a.label}</Badge>
      {aprovacao.postado_em && <Badge tone="success">Postado</Badge>}
    </div>
  );
}
