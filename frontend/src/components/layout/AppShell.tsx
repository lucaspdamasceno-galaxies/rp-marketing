import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  topBanner?: ReactNode;
  userOverride?: { nome?: string | null; email?: string | null };
};

export function AppShell({
  title,
  subtitle,
  children,
  topBanner,
  userOverride,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {topBanner}
        <Topbar title={title} subtitle={subtitle} userOverride={userOverride} />
        <main className="flex-1 px-6 py-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
