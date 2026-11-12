import { Component, type ErrorInfo, type ReactNode } from "react";
import { ArrowLeft, Gamepad2, RefreshCw, ShieldAlert, WifiOff } from "lucide-react";
import logoImg from "@/assets/raw/logo.png";
import { navigate } from "@/lib/router";
import { Button } from "./ui/Button";

export type ErrorPageKind = "404" | "403" | "500" | "network";

const DETAILS: Record<ErrorPageKind, { code: string; title: string; message: string; icon: typeof Gamepad2 }> = {
  "404": {
    code: "404",
    title: "YOU'RE LOST IN THE GAME",
    message: "The page you're looking for doesn't exist or may have been moved.",
    icon: Gamepad2,
  },
  "403": {
    code: "403",
    title: "ACCESS DENIED",
    message: "You don't have permission to access this area.",
    icon: ShieldAlert,
  },
  "500": {
    code: "500",
    title: "SERVER ERROR",
    message: "Something went wrong on our side. Please try again.",
    icon: RefreshCw,
  },
  network: {
    code: "CONNECTION LOST",
    title: "CONNECTION LOST",
    message: "Unable to connect. Check your internet connection and try again.",
    icon: WifiOff,
  },
};

interface ErrorPageProps {
  kind: ErrorPageKind;
  onRetry?: () => void;
}

/** Shared branded error view for route, permission, render, and connection failures. */
export function ErrorPage({ kind, onRetry }: ErrorPageProps) {
  const detail = DETAILS[kind];
  const Icon = detail.icon;
  const retry = onRetry ?? (() => window.location.reload());
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-center text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood/15 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-blood/10 to-transparent" />

      <section className="relative w-full max-w-2xl animate-fade-up">
        <button type="button" onClick={() => navigate("/")} aria-label="Return to home" className="mx-auto inline-flex rounded-full">
          <img src={logoImg} alt="Atrocity Gaming Lounge" width={88} height={88} className="h-20 w-20 rounded-full ring-1 ring-blood/60 shadow-[0_0_38px_rgba(229,9,20,0.35)]" />
        </button>

        <div className="relative mx-auto mt-8 w-fit">
          <p
            className={
              kind === "network"
                ? "font-display text-3xl font-black leading-none tracking-tight text-blood text-glow sm:text-5xl"
                : "font-display text-[5.25rem] font-black leading-none tracking-tighter text-blood text-glow sm:text-[8rem]"
            }
            aria-label={detail.code}
          >
            {detail.code}
          </p>
          <span aria-hidden="true" className="absolute inset-x-2 top-1/2 h-px bg-white/50 shadow-[0_0_16px_rgba(255,255,255,0.8)]" />
        </div>

        <div className="mx-auto mt-7 grid h-12 w-12 place-items-center rounded-xl border border-blood/50 bg-blood/15 text-blood-300 shadow-[0_0_28px_rgba(229,9,20,0.3)]">
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
          {kind === "500" || kind === "403" ? `${detail.code} – ${detail.title}` : detail.title}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/65 sm:text-lg">{detail.message}</p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {(kind === "500" || kind === "network") && (
            <Button onClick={retry}>
              <RefreshCw /> {kind === "network" ? "Retry" : "Try Again"}
            </Button>
          )}
          {kind === "403" && (
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft /> Go Back
            </Button>
          )}
          {kind !== "network" && (
            <Button variant={kind === "404" ? "primary" : "outline"} onClick={() => navigate("/")}>
              <Gamepad2 /> Return to Home
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}

export function NetworkErrorPage({ onRetry }: { onRetry?: () => void }) {
  return <ErrorPage kind="network" onRetry={onRetry} />;
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

/** Shows the 500 view only for unexpected rendering failures, not API errors handled by features. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled application error", error, info);
  }

  render() {
    if (this.state.failed) {
      return <ErrorPage kind="500" onRetry={() => this.setState({ failed: false })} />;
    }
    return this.props.children;
  }
}
