import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-xl text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumbs" className="mb-5">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
            {item.href ? (
              <Link href={item.href} className="text-fg-muted transition-colors hover:text-fg hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-fg">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
