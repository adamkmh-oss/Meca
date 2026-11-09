/** Remplace `next/navigation` dans la version page unique. */
import { useMemo } from "react";
import { NotFoundError, navigate, useLocation, type NavigateOptions } from "../router";

export function usePathname(): string {
  return useLocation().split("?")[0];
}

export function useSearchParams(): URLSearchParams {
  const loc = useLocation();
  return useMemo(() => new URLSearchParams(loc.split("?")[1] ?? ""), [loc]);
}

const router = {
  push: (href: string, o?: NavigateOptions) => navigate(href, { scroll: o?.scroll }),
  replace: (href: string, o?: NavigateOptions) => navigate(href, { replace: true, scroll: o?.scroll }),
  back: () => history.back(),
  forward: () => history.forward(),
  refresh: () => {},
  prefetch: () => {},
};

export function useRouter() {
  return router;
}

export function notFound(): never {
  throw new NotFoundError();
}
