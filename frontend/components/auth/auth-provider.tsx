"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, growthosApi } from "@/lib/api";
import { clearToken, getToken, setToken, UNAUTHORIZED_EVENT } from "@/lib/auth-token";
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  authError: boolean;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) {
      queueMicrotask(() => {
        if (!cancelled) setStatus("unauthenticated");
      });
      return;
    }
    growthosApi
      .me()
      .then((current) => {
        if (cancelled) return;
        setUser(current);
        setAuthError(false);
        setStatus("authenticated");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          clearToken();
          setUser(null);
          setStatus("unauthenticated");
          return;
        }
        setAuthError(true);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearToken();
      setUser(null);
      setAuthError(false);
      setStatus("unauthenticated");
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const finishAuth = useCallback((response: AuthResponse) => {
    setToken(response.token);
    setUser(response.user);
    setAuthError(false);
    setStatus("authenticated");
    return response;
  }, []);

  const login = useCallback(
    async (input: LoginInput) => finishAuth(await growthosApi.login(input)),
    [finishAuth]
  );

  const register = useCallback(
    async (input: RegisterInput) => finishAuth(await growthosApi.register(input)),
    [finishAuth]
  );

  const logout = useCallback(async () => {
    try {
      await growthosApi.logout();
    } catch {
      // Clear locally even if the backend is unavailable.
    } finally {
      clearToken();
      setUser(null);
      setAuthError(false);
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, authError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
