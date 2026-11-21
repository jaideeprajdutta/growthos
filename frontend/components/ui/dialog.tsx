"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function Dialog({ open, onClose, title, description, children, className, "aria-label": ariaLabel }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={ariaLabel ?? title ?? "Dialog"}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={cn("relative w-full max-w-md rounded-xl border border-line bg-bg shadow-2xl", className)}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            {title ? <h2 className="text-lg font-semibold text-fg">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="text-fg-muted hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
