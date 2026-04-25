import { HTMLAttributes } from "react";

type Tone = "neutral" | "brand" | "success" | "danger" | "warning";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
};

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-100 text-brand-700",
  success: "bg-success-100 text-success-500",
  danger: "bg-danger-100 text-danger-500",
  warning: "bg-warning-100 text-warning-500",
};

export function Badge({
  tone = "neutral",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
