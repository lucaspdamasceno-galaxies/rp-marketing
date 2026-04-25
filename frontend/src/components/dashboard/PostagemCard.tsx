import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCompact, formatRelative } from "@/lib/format";
import type { Postagem, TipoPostagem } from "@/types/api";

const TIPO_LABEL: Record<TipoPostagem, string> = {
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  CAROUSEL: "Carrossel",
  REEL: "Reel",
};

type PostagemCardProps = {
  postagem: Postagem;
};

export function PostagemCard({ postagem }: PostagemCardProps) {
  return (
    <Link
      href={`/postagens/${postagem.id}`}
      className="group block overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={postagem.url_midia}
          alt={postagem.legenda ?? "Postagem"}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute left-3 top-3">
          <Badge tone="brand">{TIPO_LABEL[postagem.tipo]}</Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 py-3 text-white opacity-0 transition group-hover:opacity-100">
          <Metric icon="heart" value={postagem.curtidas} />
          <Metric icon="comment" value={postagem.comentarios} />
          <Metric icon="reach" value={postagem.alcance} />
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="line-clamp-2 text-sm text-ink-700">
          {postagem.legenda ?? "Sem legenda"}
        </p>
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>{formatRelative(postagem.data_publicacao)}</span>
          <span className="tabular-nums">
            {formatCompact(postagem.curtidas)} curtidas
          </span>
        </div>
      </div>
    </Link>
  );
}

function Metric({
  icon,
  value,
}: {
  icon: "heart" | "comment" | "reach";
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium tabular-nums">
      <Icon name={icon} />
      {formatCompact(value)}
    </span>
  );
}

function Icon({ name }: { name: "heart" | "comment" | "reach" }) {
  if (name === "heart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "comment") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M21 12a8 8 0 0 1-11.6 7.16L4 20l1.05-4.13A8 8 0 1 1 21 12z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M2.5 12C5 7 8.5 5 12 5s7 2 9.5 7c-2.5 5-6 7-9.5 7s-7-2-9.5-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
