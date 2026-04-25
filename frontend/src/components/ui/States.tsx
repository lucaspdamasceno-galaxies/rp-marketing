import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function LoadingState({ label = "Carregando…" }: { label?: string }) {
  return (
    <Card className="flex items-center justify-center py-16 text-sm text-ink-500">
      <span className="inline-flex items-center gap-2">
        <svg
          className="h-4 w-4 animate-spin text-accent-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {label}
      </span>
    </Card>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <p className="text-base font-semibold text-ink-950">
        Não conseguimos carregar os dados.
      </p>
      <p className="max-w-sm text-sm text-ink-500">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </Card>
  );
}
