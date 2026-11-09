import { useCallback, useEffect, useState } from "react";

export type AppRoute = "public" | "admin" | "staff";

export function matchRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/admin" || clean.startsWith("/admin/")) return "admin";
  if (clean === "/staff" || clean.startsWith("/staff/")) return "staff";
  return "public";
}

export function navigate(to: string) {
  if (window.location.pathname === to) return;
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}

export function useAppRoute(): { route: AppRoute; pathname: string; navigate: typeof navigate } {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((to: string) => navigate(to), []);
  return { route: matchRoute(pathname), pathname, navigate: go };
}
