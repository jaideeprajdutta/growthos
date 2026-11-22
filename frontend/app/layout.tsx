import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppGate } from "@/components/auth/app-gate";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GrowthOS",
  description: "Growth operating system for digital-first businesses",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-bg px-6">
                  <p className="text-sm text-fg-muted">Loading GrowthOS…</p>
                </div>
              }
            >
              <AppGate>{children}</AppGate>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
