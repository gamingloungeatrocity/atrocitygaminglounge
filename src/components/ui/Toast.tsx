import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4500);
  }, []);

  const dismiss = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[220] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border bg-coal/95 p-4 text-sm shadow-2xl backdrop-blur-xl",
              item.kind === "success" && "border-emerald-500/40 text-emerald-100",
              item.kind === "error" && "border-blood/60 text-blood-200",
              item.kind === "info" && "border-white/15 text-white",
            )}
          >
            {item.kind === "success" && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
            {item.kind === "error" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />}
            {item.kind === "info" && <Info className="mt-0.5 h-4 w-4 shrink-0 text-white/70" />}
            <p className="flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="text-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
