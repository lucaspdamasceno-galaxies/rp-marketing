"use client";

import { ReactNode, useState } from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { Topbar } from "@/components/layout/Topbar";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1240px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
