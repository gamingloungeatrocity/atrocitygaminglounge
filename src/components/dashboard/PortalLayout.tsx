import { useState, type ComponentType, type ReactNode } from "react";
import { ArrowLeft, ExternalLink, LogOut, Menu, Shield, UserCheck, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/auth";
import { navigate } from "@/lib/router";
import { cn } from "@/utils/cn";

export interface SidebarNavItem<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
}

interface PortalLayoutProps<T extends string> {
  portal: "admin" | "staff";
  title: string;
  navItems: SidebarNavItem<T>[];
  activeTab: T;
  onSelectTab: (id: T) => void;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function PortalLayout<T extends string>({
  portal,
  title,
  navItems,
  activeTab,
  onSelectTab,
  headerActions,
  children,
}: PortalLayoutProps<T>) {
  const { profile, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (id: T) => {
    onSelectTab(id);
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const SidebarContent = (
    <div className="flex h-full flex-col bg-coal-900">
      <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4 sm:h-20">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("/");
          }}
          className="rounded-lg"
        >
          <Logo />
        </a>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close sidebar"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-white/70 lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-white/[0.06] px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-tech text-xs font-bold uppercase tracking-[0.2em]",
            portal === "admin"
              ? "border-blood/50 bg-blood/15 text-blood-300"
              : "border-sky-500/40 bg-sky-500/10 text-sky-300",
          )}
        >
          {portal === "admin" ? <Shield className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          {portal === "admin" ? "Admin Console" : "Staff Operations"}
        </span>
      </div>

      <nav aria-label={`${portal} navigation`} className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ id, label, icon: Icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left font-tech text-sm font-bold uppercase tracking-[0.12em] transition-all",
                active
                  ? "bg-blood text-white shadow-[0_0_24px_-6px_rgba(229,9,20,0.9)]"
                  : "text-white/65 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </span>
              {typeof badge === "number" && badge > 0 && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] leading-none",
                    active ? "bg-black/30 text-white" : "bg-blood/20 text-blood-300",
                  )}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/[0.08] p-3">
        {profile?.role === "admin" && (
          <button
            type="button"
            onClick={() => navigate(portal === "admin" ? "/staff" : "/admin")}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 font-tech text-xs font-bold uppercase tracking-[0.14em] text-white/80 transition-colors hover:border-blood/50 hover:text-white"
          >
            <span>Switch to {portal === "admin" ? "Staff" : "Admin"} View</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2 font-tech text-xs font-bold uppercase tracking-[0.14em] text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Public Website
        </button>

        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/40 p-2.5">
          <div className="min-w-0">
            <p className="truncate font-tech text-sm font-bold text-white">{profile?.full_name}</p>
            <p className="truncate text-[11px] text-white/45">{profile?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-white/70 transition-colors hover:border-blood hover:bg-blood/15 hover:text-blood-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white lg:grid lg:grid-cols-[270px_minmax(0,1fr)]">
      {/* Desktop fixed sidebar */}
      <aside className="hidden border-r border-white/[0.08] lg:sticky lg:top-0 lg:block lg:h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile slide-over sidebar */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[120] flex lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] border-r border-white/10 shadow-2xl">{SidebarContent}</aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-black/85 px-4 backdrop-blur-xl sm:h-20 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.04] text-white hover:border-blood lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="font-tech text-[11px] font-bold uppercase tracking-[0.26em] text-blood-400">
                {portal === "admin" ? "Admin Dashboard" : "Staff Dashboard"}
              </p>
              <h1 className="truncate font-display text-base font-black uppercase tracking-wide sm:text-xl">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">{headerActions}</div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
