"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
  title?: string;
}

interface ToastContextValue {
  add: (item: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismissToast(id: string) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function addToast(item: Omit<ToastItem, "id">) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const full: ToastItem = { ...item, id };
  toasts = [full, ...toasts];
  emit();
  window.setTimeout(() => dismissToast(id), 4500);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = () => setList(toasts);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const add = useCallback((item: Omit<ToastItem, "id">) => {
    addToast(item);
  }, []);

  const dismiss = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  return (
    <ToastContext.Provider value={{ add, dismiss }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
        {list.map((item) => (
          <ToastView key={item.id} item={item} onClose={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  const { add, dismiss } = context;
  return {
    success: (message: string, title?: string) => add({ kind: "success", message, title }),
    error: (message: string, title?: string) => add({ kind: "error", message, title }),
    warning: (message: string, title?: string) => add({ kind: "warning", message, title }),
    info: (message: string, title?: string) => add({ kind: "info", message, title }),
    dismiss,
  };
}

const KIND_CLASSES: Record<ToastKind, string> = {
  success: "border-line bg-bg text-fg",
  error: "border-destructive/60 bg-bg text-fg",
  warning: "border-warning/60 bg-bg text-fg",
  info: "border-line bg-bg text-fg",
};

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={cn("pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm", KIND_CLASSES[item.kind])}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {item.title ? <p className="text-sm font-semibold text-fg">{item.title}</p> : null}
          <p className="text-sm text-fg-muted">{item.message}</p>
        </div>
        <button type="button" aria-label="Dismiss" onClick={onClose} className="shrink-0 rounded-md p-1 text-fg-muted hover:bg-muted hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
