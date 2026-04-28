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
    href: "/aprovacoes",
    label: "Aprovações",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/trafego",
    label: "Tráfego pago",
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
  {
    href: "/contratos",
    label: "Contratos",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 3v5h5M9 13h6M9 17h4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.soon ? "#" : item.href}
              onClick={item.soon ? (e) => e.preventDefault() : onNavigate}
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
                  className={active ? "text-accent-500" : "text-ink-500"}
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
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex h-16 items-center px-6">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 px-3 pt-4">
        <NavList onNavigate={onNavigate} />
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
    </>
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-ink-200 lg:bg-surface">
        <SidebarBody />
      </aside>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className={`absolute inset-0 bg-ink-950/40 backdrop-blur-sm transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onMobileClose}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 flex-col border-r border-ink-200 bg-surface shadow-xl transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-label="Menu"
        >
          <SidebarBody onNavigate={onMobileClose} />
        </aside>
      </div>
    </>
  );
}
