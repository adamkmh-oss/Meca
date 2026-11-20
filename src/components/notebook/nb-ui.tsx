"use client";
/** Petits composants d'interface du cahier (boutons d'outil, menus, pastilles). */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToolButton({
  active,
  label,
  onClick,
  children,
  disabled,
  className,
  badge,
}: {
  active?: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-foreground/80 transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-35 [&_svg]:size-[20px]",
        active && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        className,
      )}
    >
      {children}
      {badge}
    </button>
  );
}

export function Sep() {
  return <span className="mx-1 h-6 w-px shrink-0 bg-border" aria-hidden />;
}

export function ColorDot({ color, active, onClick, label }: { color: string; active?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label ?? color}
      aria-label={label ?? `Couleur ${color}`}
      aria-pressed={active}
      className={cn("inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full", active && "ring-2 ring-primary ring-offset-2 ring-offset-card")}
    >
      <span className="size-6 rounded-full border border-black/10" style={{ background: color }} />
    </button>
  );
}

export function SizeDot({ size, active, onClick, color = "currentColor", max = 12 }: { size: number; active?: boolean; onClick: () => void; color?: string; max?: number }) {
  const d = Math.max(3, Math.min(max * 2, size * 1.6));
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Épaisseur ${size}`}
      aria-label={`Épaisseur ${size}`}
      aria-pressed={active}
      className={cn("inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-muted", active && "bg-primary-soft ring-1 ring-primary")}
    >
      <span className="rounded-full" style={{ width: d, height: d, background: color === "#111827" ? "var(--foreground)" : color }} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = "md" }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex shrink-0 rounded-lg bg-muted p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 font-medium text-muted-foreground [&_svg]:size-4",
            size === "sm" ? "h-7 text-xs" : "h-8 text-[13px]",
            value === o.value && "bg-card text-foreground shadow-sm",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Menu déroulant ancré à un bouton ; se ferme au clic extérieur ou sur Échap. */
export function Popover({
  trigger,
  children,
  align = "start",
  className,
  open: openProp,
  onOpenChange,
}: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  className?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [inner, setInner] = useState(false);
  const open = openProp ?? inner;
  const setOpen = (o: boolean) => {
    setInner(o);
    onOpenChange?.(o);
  };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const close = () => setOpen(false);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen(!open) })}
      {open && (
        <div
          className={cn(
            "absolute top-full z-50 mt-1.5 max-h-[min(72vh,560px)] overflow-y-auto rounded-xl border border-border bg-card p-1.5 text-sm shadow-xl",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger, hint }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; hint?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] hover:bg-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        danger && "text-danger [&_svg]:text-danger",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

export function Modal({ title, children, onClose, wide, footer }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-4xl" : "sm:max-w-lg")}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  step = 0.1,
  min,
  max,
  unit,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  className?: string;
}) {
  const [text, setText] = useState(String(value).replace(".", ","));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(String(value).replace(".", ","));
    }
  }, [value]);
  return (
    <label className={cn("flex min-w-0 flex-col gap-0.5 text-[11.5px] font-medium text-muted-foreground", className)}>
      {label}
      <span className="flex items-center rounded-lg border border-input bg-background focus-within:ring-2 focus-within:ring-primary/40">
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const v = Number(e.target.value.replace(",", ".").replace(/\s/g, ""));
            if (Number.isFinite(v) && e.target.value.trim() !== "" && e.target.value.trim() !== "-") {
              const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
              last.current = c;
              onChange(c);
            }
          }}
          onBlur={() => setText(String(last.current).replace(".", ","))}
          step={step}
          className="h-8 w-full min-w-0 bg-transparent px-2 text-[13.5px] text-foreground outline-none"
        />
        {unit && <span className="pr-2 text-[11.5px] text-muted-foreground">{unit}</span>}
      </span>
    </label>
  );
}

/** Bascule clair / sombre (même réglage que le reste du site). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("structura:theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      title={theme === "dark" ? "Mode clair" : "Mode sombre"}
    >
      {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
    </button>
  );
}
