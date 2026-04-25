"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  soon?: boolean;
};

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M3 12 12 4l9 8M5 10v10h14V10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/postagens",
    label: "Postagens",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="7" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/trafego",
    label: "Tráfego pago",
    soon: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M4 19V9m6 10V5m6 14v-7m6 7V11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-ink-200 lg:bg-surface">
      <div className="flex h-16 items-center px-6">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 px-3 pt-4">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.soon ? "#" : item.href}
                  aria-disabled={item.soon}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : item.soon
                        ? "text-ink-400 hover:bg-ink-100/50"
                        : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={
                        active ? "text-accent-500" : "text-ink-500"
                      }
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </span>
                  {item.soon && (
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                      em breve
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-ink-200 p-4">
        <div className="rounded-xl bg-brand-950 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">
            Precisa de ajuda?
          </p>
          <p className="mt-1.5 text-sm leading-snug text-white/90">
            Fale com seu gerente de conta no WhatsApp.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex h-8 items-center rounded-lg bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
          >
            Abrir conversa
          </button>
        </div>
      </div>
    </aside>
  );
}
