import type { AprovacaoMidia } from "@/types/api";

export function MidiaPreview({
  midia,
  className = "",
}: {
  midia: AprovacaoMidia;
  className?: string;
}) {
  const isVideo = midia.mime_type.startsWith("video/");
  if (isVideo) {
    return (
      <video
        src={midia.url}
        controls
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={midia.url}
      alt={midia.nome_original}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
