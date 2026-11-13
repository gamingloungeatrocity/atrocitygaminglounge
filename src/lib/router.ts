import { useCallback, useEffect, useState } from "react";
import { SPY_IDS } from "@/data/site";

export type AppRoute = "public" | "admin" | "staff" | "terms" | "privacy" | "refund" | "not-found";

export function matchRoute(pathname: string, hash = ""): AppRoute {
  const clean = pathname.replace(/\/+$/, "") || "/";
  // The portals are single entry-point applications.  Treating every
  // `/admin/*` or `/staff/*` URL as a portal route meant misspelled deep
  // links rendered a login screen instead of the site's 404 page.
  if (clean === "/admin") return "admin";
  if (clean === "/staff") return "staff";
  if (clean === "/terms-and-conditions") return "terms";
  if (clean === "/privacy-policy") return "privacy";
  if (clean === "/refund-policy") return "refund";
  if (clean === "/") {
    const fragment = hash.replace(/^#/, "");
    // The public page deliberately supports its registered section anchors.
    // A fragment with an extra path segment (for example `#pricing/od`) is
    // not an application route or an anchor, so it must not silently show
    // the home page.
    if (!fragment || (SPY_IDS as readonly string[]).includes(fragment)) return "public";
  }
  return "not-found";
}

export function navigate(to: string) {
  if (window.location.pathname === to && !window.location.hash) return;
  window.history.pushState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0 });
}

export function useAppRoute(): { route: AppRoute; pathname: string; navigate: typeof navigate } {
  const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, hash: window.location.hash }));

  useEffect(() => {
    const onLocationChange = () => setLocation({ pathname: window.location.pathname, hash: window.location.hash });
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    return () => {
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
    };
  }, []);

  const go = useCallback((to: string) => navigate(to), []);
  return { route: matchRoute(location.pathname, location.hash), pathname: location.pathname, navigate: go };
}
