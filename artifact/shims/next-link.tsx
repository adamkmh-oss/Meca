/** Remplace `next/link` dans la version page unique : navigation par le routeur à fragment. */
import type { AnchorHTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import { encodePath, navigate } from "../router";

type Href = string | { pathname?: string; query?: Record<string, string | number> };

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: Href;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
  children?: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

function toPath(href: Href): string {
  if (typeof href === "string") return href;
  const q = href.query ? "?" + new URLSearchParams(Object.entries(href.query).map(([k, v]) => [k, String(v)])).toString() : "";
  return (href.pathname ?? "/") + q;
}

export default function Link({ href, replace, scroll, prefetch: _prefetch, onClick, children, ...rest }: LinkProps) {
  const path = toPath(href);
  const internal = path.startsWith("/") && !path.startsWith("//");
  if (!internal) {
    return (
      <a href={path} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(path, { replace, scroll });
  };
  return (
    <a href={"#" + encodePath(path)} data-spa-link="" onClick={handle} {...rest}>
      {children}
    </a>
  );
}
