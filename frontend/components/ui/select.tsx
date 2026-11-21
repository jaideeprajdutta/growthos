import { cn } from "@/lib/utils";

interface SelectProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function Select({ id, label, hint, error, options, value, onChange, className, disabled, placeholder }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? <label htmlFor={id} className="text-sm font-medium text-fg">{label}</label> : null}
      <select
        id={id}
        className={cn(
          "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line disabled:opacity-60",
          error && "border-destructive",
          className
        )}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder ?? "Select…"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
