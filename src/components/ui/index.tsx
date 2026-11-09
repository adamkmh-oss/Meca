/**
 * Composants d'interface de base (style shadcn/ui : Tailwind + variantes).
 */
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* -------------------------------- Bouton -------------------------------- */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        secondary: "bg-primary-soft text-primary hover:bg-primary-soft/70",
        outline: "border border-border bg-card hover:bg-muted",
        ghost: "hover:bg-muted",
        success: "bg-success text-white hover:bg-success/90",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

/* --------------------------------- Carte -------------------------------- */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(11,21,48,0.04)]", className)}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold leading-tight tracking-tight", className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

/* --------------------------------- Badge -------------------------------- */
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-primary-soft text-primary",
      outline: "border border-border text-muted-foreground",
      success: "bg-success-soft text-success",
      warning: "bg-warning-soft text-warning",
      danger: "bg-danger-soft text-danger",
      muted: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});
export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* ------------------------------- Progression ----------------------------- */
export function Progress({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "success" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", tone === "success" ? "bg-success" : "bg-primary")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/* ------------------------------ Formulaires ------------------------------ */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-medium text-muted-foreground", className)} {...props} />;
}

/* --------------------------------- Onglets ------------------------------- */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = "default",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div className={cn("inline-flex flex-wrap rounded-lg border border-border bg-muted p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition-colors cursor-pointer",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------- Encadrés -------------------------------- */
export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "success" | "danger";
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-primary/30 bg-primary-soft/60",
    warning: "border-warning/40 bg-warning-soft",
    success: "border-success/40 bg-success-soft",
    danger: "border-danger/40 bg-danger-soft",
  }[tone];
  const titleColor = { info: "text-primary", warning: "text-warning", success: "text-success", danger: "text-danger" }[tone];
  return (
    <div className={cn("rounded-xl border px-4 py-3", styles, className)}>
      {title && <div className={cn("mb-1 text-sm font-semibold", titleColor)}>{title}</div>}
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.75em]">{children}</kbd>;
}
