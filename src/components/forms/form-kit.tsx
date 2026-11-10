"use client";
/**
 * Petits composants de formulaire pour les actions serveur (useActionState) :
 * champ + libellé + erreur accessible, message global, bouton d'envoi.
 */
import { createContext, startTransition, useActionState, useContext, useId, type ReactNode } from "react";
import { LoaderCircle, MailCheck } from "lucide-react";
import type { ActionResult } from "@/lib/auth/dal";
import { Button, Callout, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

const FieldErrors = createContext<Record<string, string>>({});
const Pending = createContext(false);

export function ActionForm({
  action,
  children,
  className,
  successTitle,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  /** Titre d'un écran de confirmation qui remplace le formulaire après succès. */
  successTitle?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  if (state?.ok && successTitle)
    return (
      <div className="space-y-3 text-center" role="status">
        <MailCheck className="mx-auto size-10 text-success" />
        <p className="font-semibold">{successTitle}</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  return (
    <FieldErrors.Provider value={state && !state.ok ? (state.fields ?? {}) : {}}>
      <Pending.Provider value={pending}>
      {/* action : envoi POST même avant le chargement du JavaScript (jamais de mot de passe dans l'URL).
          onSubmit : une fois la page active, envoi manuel pour garder la saisie si le serveur renvoie une erreur. */}
      <form
        action={formAction}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
        className={cn("space-y-4", className)}
        noValidate
        aria-busy={pending}
      >
        {state && !state.ok && (
          <div role="alert">
            <Callout tone="danger">{state.error}</Callout>
          </div>
        )}
        {state?.ok && state.message && (
          <div role="status">
            <Callout tone="success">{state.message}</Callout>
          </div>
        )}
        {children}
      </form>
      </Pending.Provider>
    </FieldErrors.Provider>
  );
}

export function Field({
  name,
  label,
  hint,
  className,
  ...props
}: { name: string; label: string; hint?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const error = useContext(FieldErrors)[name];
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        className={cn("h-10", error && "border-danger")}
        {...props}
      />
      {error ? (
        <p id={`${id}-err`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  ...props
}: { name: string; label: string; options: readonly { value: string; label: string }[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const error = useContext(FieldErrors)[name];
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm text-foreground">
        {label}
      </Label>
      <Select id={id} name={name} aria-invalid={error ? true : undefined} className={cn("h-10", error && "border-danger")} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function FieldError({ name }: { name: string }) {
  const error = useContext(FieldErrors)[name];
  return error ? <p className="text-xs text-danger">{error}</p> : null;
}

export function SubmitButton({ children, className, variant }: { children: ReactNode; className?: string; variant?: "default" | "danger" | "outline" }) {
  const pending = useContext(Pending);
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending && <LoaderCircle className="animate-spin" />}
      {children}
    </Button>
  );
}
