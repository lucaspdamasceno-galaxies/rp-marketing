import { InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className = "", ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const describedBy = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-900">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`h-11 rounded-lg border bg-surface px-3.5 text-[15px] text-ink-950 placeholder:text-ink-400 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-danger-500 focus:ring-danger-500/20"
            : "border-ink-300 focus:border-accent-500 focus:ring-accent-500/20"
        } ${className}`}
        {...props}
      />
      {error ? (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="text-xs font-medium text-danger-500"
        >
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-ink-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
