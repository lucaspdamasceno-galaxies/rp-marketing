"use client";

import { Button } from "@/components/ui/Button";

type Props = {
  url: string;
  filename?: string | null;
  title?: string;
  /** Altura em px ou classe Tailwind. Default 600px. */
  height?: number | string;
};

export function PdfViewer({ url, filename, title, height = 600 }: Props) {
  const heightStyle =
    typeof height === "number" ? { height: `${height}px` } : undefined;
  const heightClass = typeof height === "string" ? height : "";

  async function baixar() {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "documento.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank", "noopener");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
          {title ?? "Documento PDF"}
          {filename && <span className="ml-1 text-ink-400">· {filename}</span>}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={baixar}>
            Baixar PDF
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-brand-700 hover:underline"
          >
            Abrir em nova aba
          </a>
        </div>
      </div>
      <div
        className={`overflow-hidden rounded-xl border border-ink-200 bg-ink-100 ${heightClass}`}
        style={heightStyle}
      >
        <object
          data={url}
          type="application/pdf"
          className="h-full w-full"
          aria-label={title ?? "Documento PDF"}
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-ink-700">
              Seu navegador não consegue exibir o PDF inline.
            </p>
            <Button size="sm" onClick={baixar}>
              Baixar PDF
            </Button>
          </div>
        </object>
      </div>
    </div>
  );
}
