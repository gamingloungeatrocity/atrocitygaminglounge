import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, type ReactNode } from "react";

type Overlay = {
  id: string;
  close: () => void;
};

type BackNavigationContextValue = {
  registerOverlay: (id: string, close: () => void) => () => void;
  dismissOverlay: (id: string, close: () => void, afterDismiss?: () => void) => void;
};

const BackNavigationContext = createContext<BackNavigationContextValue | null>(null);

const OVERLAY_STATE_KEY = "__atrocityOverlay";
const HOME_BASE_STATE_KEY = "__atrocityHomeBase";
const HOME_GUARD_STATE_KEY = "__atrocityHomeGuard";

function stateWith(key: string, value: string | boolean) {
  const state = window.history.state;
  return {
    ...(state && typeof state === "object" ? state : {}),
    [key]: value,
  };
}

/**
 * Gives transient overlays one same-URL history entry. A browser Back action
 * reaches that entry first, closes the top-most overlay, and leaves normal
 * route history untouched once no overlay is active.
 */
export function BackNavigationProvider({ children }: { children: ReactNode }) {
  const overlaysRef = useRef<Overlay[]>([]);
  const dismissingRef = useRef<{ id: string; close: () => void; afterDismiss?: () => void } | null>(null);
  const homeGuardConsumedRef = useRef(false);

  useEffect(() => {
    const isDirectMobileHome =
      window.location.pathname === "/" &&
      window.matchMedia("(pointer: coarse)").matches &&
      (!document.referrer || new URL(document.referrer).origin !== window.location.origin);

    if (!isDirectMobileHome || window.history.state?.[HOME_GUARD_STATE_KEY]) return;

    window.history.replaceState(stateWith(HOME_BASE_STATE_KEY, true), "", window.location.href);
    window.history.pushState(stateWith(HOME_GUARD_STATE_KEY, true), "", window.location.href);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const dismissing = dismissingRef.current;
      if (dismissing) {
        dismissingRef.current = null;
        dismissing.close();
        dismissing.afterDismiss?.();
        return;
      }

      const overlay = overlaysRef.current.pop();
      if (overlay) {
        overlay.close();
        return;
      }

      // A direct mobile visit to Home gets one protected Back press. The
      // next press skips the guard's base entry, so this never becomes a trap.
      if (window.history.state?.[HOME_BASE_STATE_KEY]) {
        if (!homeGuardConsumedRef.current) {
          homeGuardConsumedRef.current = true;
          window.history.forward();
        } else {
          window.history.go(-1);
        }
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const registerOverlay = useCallback((id: string, close: () => void) => {
    let registered = false;
    let cancelled = false;

    const addOverlay = () => {
      if (cancelled) return;
      registered = true;
      overlaysRef.current = [...overlaysRef.current.filter((overlay) => overlay.id !== id), { id, close }];
      window.history.pushState(stateWith(OVERLAY_STATE_KEY, id), "", window.location.href);
    };

    // A replacement overlay (Availability -> Booking, for example) waits for
    // the prior marker to be removed before adding its own marker.
    const pendingDismissal = dismissingRef.current;
    if (pendingDismissal) {
      const afterDismiss = pendingDismissal.afterDismiss;
      pendingDismissal.afterDismiss = () => {
        afterDismiss?.();
        addOverlay();
      };
    } else {
      addOverlay();
    }

    return () => {
      cancelled = true;
      overlaysRef.current = overlaysRef.current.filter((overlay) => overlay.id !== id);

      // Covers existing close paths that call their parent callback directly
      // (for example, a successful booking submission).
      if (registered && window.history.state?.[OVERLAY_STATE_KEY] === id && dismissingRef.current?.id !== id) {
        dismissingRef.current = { id, close: () => undefined };
        window.history.back();
      }
    };
  }, []);

  const dismissOverlay = useCallback((id: string, close: () => void, afterDismiss?: () => void) => {
    overlaysRef.current = overlaysRef.current.filter((overlay) => overlay.id !== id);

    if (window.history.state?.[OVERLAY_STATE_KEY] === id) {
      dismissingRef.current = { id, close, afterDismiss };
      window.history.back();
      return;
    }

    close();
    afterDismiss?.();
  }, []);

  const value = useMemo(() => ({ registerOverlay, dismissOverlay }), [dismissOverlay, registerOverlay]);

  return <BackNavigationContext.Provider value={value}>{children}</BackNavigationContext.Provider>;
}

/** Registers an overlay with the centralized browser-back stack. */
export function useManagedOverlay(open: boolean, onClose: () => void) {
  const context = useContext(BackNavigationContext);
  const id = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || !context) return;
    return context.registerOverlay(id, () => onCloseRef.current());
  }, [context, id, open]);

  return useCallback((afterDismiss?: () => void) => {
    if (context) {
      context.dismissOverlay(id, () => onCloseRef.current(), afterDismiss);
    } else {
      onCloseRef.current();
      afterDismiss?.();
    }
  }, [context, id]);
}
