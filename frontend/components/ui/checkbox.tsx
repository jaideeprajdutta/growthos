import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Checkbox({ label, checked, onChange, className, ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-fg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={`mt-0.5 h-4 w-4 rounded border-line accent-accent ${className ?? ""}`}
        {...props}
      />
      <span className="text-xs leading-5 text-fg-muted">{label}</span>
    </label>
  );
}
