"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Beaker,
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  Lightbulb,
  Menu,
  PlugZap,
  PlayCircle,
  Plus,
  ScanSearch,
  Settings,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ToastProvider } from "@/components/ui/toast";
import { growthosApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Company } from "@/types";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/bi", label: "Business Intelligence", icon: ScanSearch },
  { href: "/diagnosis", label: "Growth Diagnosis", icon: Stethoscope },
  { href: "/opportunities", label: "Opportunities", icon: Lightbulb },
  { href: "/experiments", label: "Experiments", icon: Beaker },
  { href: "/execution", label: "Execution", icon: PlayCircle },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/integrations", label: "Integrations", icon: PlugZap },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(() =>
    typeof window === "undefined" ? false : window.localStorage.getItem("growthos:sidebar") === "1"
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    growthosApi
      .listCompanies()
      .then((loaded) => {
        if (!cancelled) setCompanies(loaded);
      })
      .catch(() => {
        if (!cancelled)
          setBackendError("The backend is not reachable. Start it with `npm run start` in the `backend/` directory.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("growthos:sidebar", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  const activeCompany = useMemo(
    () => companies?.find((company) => company.isActive) ?? companies?.[0] ?? null,
    [companies]
  );

  const selectCompany = useCallback(
    (id: string) => {
      if (id) router.push(`/companies/${id}`);
    },
    [router]
  );

  return (
    <ToastProvider>
      <div className="flex min-h-full bg-bg text-fg">
        <Suspense fallback={null}>
          <MobileMenu open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        </Suspense>

        <aside
          className={cn(
            "hidden border-r border-line bg-bg transition-all duration-200 md:block",
            collapsed ? "w-14" : "w-64"
          )}
          aria-label="Main navigation"
        >
          <div className="flex h-16 items-center border-b border-line px-4">
            <span className="font-semibold text-fg">GrowthOS</span>
            <button
              type="button"
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed((prev) => !prev)}
              className="ml-auto hidden text-fg-muted hover:text-fg md:block"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <Suspense fallback={null}>
            <SidebarNav collapsed={collapsed} />
          </Suspense>
          <div className="border-t border-line p-3">
            <select
              aria-label="Select company"
              value={activeCompany?.id ?? ""}
              onChange={(event) => selectCompany(event.target.value)}
              className="w-full rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-fg"
            >
              <option value="">
                {companies === null
                  ? "Loading…"
                  : companies.length === 0
                    ? "No companies"
                    : "Select a company"}
              </option>
              {companies?.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {companies && companies.length === 0 && !backendError ? (
              <Link
                href="/companies/onboarding"
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2 text-xs text-fg-muted hover:text-fg"
              >
                <Plus className="h-3.5 w-3.5" /> Add a company
              </Link>
            ) : null}
          </div>
        </aside>

        <div className="flex min-h-full flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
                className="text-fg-muted hover:text-fg md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <span className="text-sm font-semibold text-fg">GrowthOS</span>
            </div>
            <div className="flex items-center gap-3">
              <select
                aria-label="Select company"
                value={activeCompany?.id ?? ""}
                onChange={(event) => selectCompany(event.target.value)}
                className="rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-fg"
              >
                <option value="">
                  {companies === null
                    ? "Loading…"
                    : companies.length === 0
                      ? "No companies"
                      : "Select a company"}
                </option>
                {companies?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {activeCompany ? <span className="text-xs text-fg-muted">{activeCompany.name}</span> : null}
              <Link href="/settings" aria-label="Settings" className="rounded-lg p-2 text-fg-muted hover:bg-muted hover:text-fg">
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1280px] px-6 py-8">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <Dialog open={open} onClose={onClose} title="Navigation" className="max-w-sm">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
              isActiveRoute(pathname, item.href) ? "bg-muted text-fg" : "text-fg-muted hover:bg-muted hover:text-fg"
            )}
            onClick={() => onClose()}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </Dialog>
  );
}

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActiveRoute(pathname, item.href)
              ? "bg-muted text-fg"
              : "text-fg-muted hover:bg-muted hover:text-fg",
            collapsed && "justify-center px-0"
          )}
        >
          <item.icon className="h-5 w-5" />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      ))}
    </nav>
  );
}
