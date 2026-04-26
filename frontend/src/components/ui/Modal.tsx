"use client";

import { ReactNode, useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
          <h2 className="text-base font-semibold text-ink-950">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-950"
            aria-label="Fechar"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="m6 6 12 12M6 18 18 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-ink-200 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
