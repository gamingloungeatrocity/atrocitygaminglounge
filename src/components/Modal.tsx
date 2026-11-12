import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import logoImg from "@/assets/raw/logo.png";
import { cn } from "@/utils/cn";
import { useManagedOverlay } from "@/context/backNavigation";
import { usePointerDownOutside } from "@/hooks/usePointerDownOutside";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: "md" | "lg";
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Accessible dialog: portal, focus trap, Escape to close, scroll lock, focus restore. Bottom-sheet on mobile. */
export function Modal({ open, onClose, title, subtitle, size = "md", children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const dismiss = useManagedOverlay(open, onClose);
  usePointerDownOutside(panelRef, open, dismiss);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]") ?? panelRef.current;
      target?.focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [dismiss, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 animate-fade-in bg-black/80 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92svh] w-full animate-sheet flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-coal shadow-[0_0_90px_-20px_rgba(229,9,20,0.55)] outline-none sm:animate-pop sm:rounded-2xl",
          size === "lg" ? "sm:max-w-4xl" : "sm:max-w-2xl",
        )}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blood to-transparent" />
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logoImg} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full ring-1 ring-blood/50" />
            <div className="min-w-0">
              <h2 id={titleId} className="truncate font-display text-base font-black uppercase tracking-wide sm:text-xl">
                {title}
              </h2>
              {subtitle && <p className="mt-0.5 text-xs text-white/55 sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss()}
            aria-label="Close dialog"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-white/70 transition-all duration-300 hover:rotate-90 hover:border-blood hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
