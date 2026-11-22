"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use a password of at least 8 characters.");
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, displayName: displayName.trim() });
        toast.success("Your workspace is ready.");
      } else {
        await login({ email: email.trim(), password });
        toast.success("Signed in successfully.");
      }
      router.replace("/");
    } catch (caught) {
      const message = caught instanceof ApiError ? caught.message.replace(/^\d+:\s*/, "") : "Something went wrong.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-xl font-semibold tracking-tight text-fg">GrowthOS</Link>
          <p className="mt-2 text-sm text-fg-muted">
            {isRegister ? "Create a private workspace for your growth data." : "Welcome back. Sign in to your workspace."}
          </p>
        </div>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <h1 className="text-lg font-semibold text-fg">{isRegister ? "Create your account" : "Sign in"}</h1>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {isRegister ? (
                <Input
                  label="Display name"
                  name="displayName"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              ) : null}
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                hint={isRegister ? "At least 8 characters." : undefined}
              />
              {isRegister ? (
                <Input
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              ) : null}
              {error ? (
                <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                {submitting ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-fg-muted">
              {isRegister ? (
                <>
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-fg underline underline-offset-4">Sign in</Link>
                </>
              ) : (
                <>
                  New to GrowthOS?{" "}
                  <Link href="/register" className="font-medium text-fg underline underline-offset-4">Create an account</Link>
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-fg-muted">
          Your workspace and data stay private to your account.
        </p>
      </div>
    </div>
  );
}
