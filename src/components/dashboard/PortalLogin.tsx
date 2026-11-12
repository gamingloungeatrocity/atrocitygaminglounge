import { useState, type FormEvent } from "react";
import { ArrowLeft, Lock, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/auth";
import { ApiClientError } from "@/lib/api";
import { navigate } from "@/lib/router";
import { ErrorPage, NetworkErrorPage } from "@/components/ErrorPage";

export function PortalLogin({ portal }: { portal: "admin" | "staff" }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const [busy, setBusy] = useState(false);

  const attemptLogin = async () => {
    setError(null);
    setNetworkError(false);
    setBusy(true);
    try {
      await login(email, password, portal);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 0) {
        setNetworkError(true);
      } else if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Sign in failed. Please verify your credentials and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void attemptLogin();
  };

  if (networkError) return <NetworkErrorPage onRetry={attemptLogin} />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid mask-radial" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blood/15 blur-[140px]" />

      <div className="hud relative w-full max-w-md rounded-3xl border border-white/10 bg-coal/90 p-6 shadow-[0_30px_90px_-20px_rgba(229,9,20,0.45)] backdrop-blur-xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Logo size="lg" />
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-blood/40 bg-blood/10 px-3.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.22em] text-blood-300">
            {portal === "admin" ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
            {portal === "admin" ? "Administrator Portal" : "Staff Operations Portal"}
          </span>
          <h1 className="mt-4 font-display text-2xl font-black uppercase tracking-tight">
            {portal === "admin" ? "Admin Sign In" : "Staff Sign In"}
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {portal === "admin"
              ? "Sign in with an administrator account to manage the lounge."
              : "Sign in with your staff or administrator credentials."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border border-blood/60 bg-blood/15 p-3.5 text-sm text-blood-200">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="portal-email" className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              Email Address
            </label>
            <input
              id="portal-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@atrocitygaming.com"
              className="field mt-2"
            />
          </div>

          <div>
            <label htmlFor="portal-password" className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              Password
            </label>
            <input
              id="portal-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field mt-2"
            />
          </div>

          <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
            <Lock />
            {busy ? "Verifying..." : `Access ${portal === "admin" ? "Admin" : "Staff"} Dashboard`}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-white/[0.08] pt-5 text-xs text-white/50">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 font-tech text-xs font-bold uppercase tracking-wider hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Website
          </button>
          <button
            type="button"
            onClick={() => navigate(portal === "admin" ? "/staff" : "/admin")}
            className="font-tech text-xs font-bold uppercase tracking-wider text-blood-400 hover:text-blood-300"
          >
            {portal === "admin" ? "Staff Portal →" : "Admin Portal →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccessDeniedView() {
  return <ErrorPage kind="403" />;
}
