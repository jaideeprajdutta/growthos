"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";

const PUBLIC_ROUTES = new Set(["/login", "/register"]);

export function AppGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, user } = useAuth();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (isPublic && status === "authenticated") {
      router.replace("/");
      return;
    }
    if (!isPublic && status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPublic, pathname, router, status]);

  if (isPublic) return <>{children}</>;
  if (status === "error") return <>{children}</>;
  if (status !== "authenticated" || !user) return <AuthScreen />;

  return <AppShell>{children}</AppShell>;
}

function AuthScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden="true" />
        <p className="text-sm text-fg-muted">Loading GrowthOS…</p>
      </div>
    </div>
  );
}
