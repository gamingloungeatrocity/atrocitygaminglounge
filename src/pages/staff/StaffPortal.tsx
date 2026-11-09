import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CalendarCheck,
  Clock,
  Footprints,
  Gamepad2,
  LayoutDashboard,
  PlusCircle,
  RefreshCw,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { BookingsManager } from "@/components/dashboard/BookingsManager";
import { ConsolesManager } from "@/components/dashboard/ConsolesManager";
import { GroupBookingsManager } from "@/components/dashboard/GroupBookingsManager";
import { PortalLayout, type SidebarNavItem } from "@/components/dashboard/PortalLayout";
import { PortalLogin } from "@/components/dashboard/PortalLogin";
import { PanelLoader, StatusBadge } from "@/components/dashboard/StatusBadge";
import { TournamentsManager } from "@/components/dashboard/TournamentsManager";
import { ActiveSessionsList, WalkinBookingModal } from "@/components/dashboard/WalkinManager";
import { Button } from "@/components/ui/Button";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type PricingRecord, type StaffDashboardData, type WalkinRecord } from "@/lib/api";

type StaffTab =
  | "dashboard"
  | "bookings"
  | "group"
  | "walkins"
  | "active"
  | "consoles"
  | "tournaments";

function StaffContent() {
  const toast = useToast();
  const [tab, setTab] = useState<StaffTab>("dashboard");
  const [overview, setOverview] = useState<StaffDashboardData | null>(null);
  const [pricing, setPricing] = useState<PricingRecord[]>([]);
  const [walkins, setWalkins] = useState<WalkinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [walkinOpen, setWalkinOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const [dash, priceList, walkinList] = await Promise.all([
        api.staff.getDashboard(),
        api.public.getPricing(),
        api.staff.getWalkins(),
      ]);
      setOverview(dash);
      setPricing(priceList);
      setWalkins(walkinList);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load Staff Dashboard.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Staff sidebar — strictly excludes admin-only items (Pricing, Staff Management, Payments, Analytics, Settings)
  const navItems: SidebarNavItem<StaffTab>[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: Calendar },
    {
      id: "group",
      label: "Whole Lounge Bookings",
      icon: Users,
      badge: overview?.kpis.pendingGroupRequestsCount,
    },
    { id: "walkins", label: "Walk-ins", icon: Footprints },
    {
      id: "active",
      label: "Active Sessions",
      icon: Timer,
      badge: overview?.kpis.activeSessionsCount,
    },
    { id: "consoles", label: "Consoles", icon: Gamepad2 },
    { id: "tournaments", label: "Tournaments", icon: Trophy },
  ];

  const currentTitle = navItems.find((n) => n.id === tab)?.label || "Dashboard";

  const kpiCards = overview
    ? [
        { label: "Today's Bookings", value: overview.kpis.todaysBookingsCount, icon: CalendarCheck },
        { label: "Active Sessions", value: overview.kpis.activeSessionsCount, icon: Timer, highlight: true },
        { label: "Available Consoles", value: overview.kpis.availableConsolesCount, icon: Gamepad2 },
        { label: "Occupied Consoles", value: overview.kpis.occupiedConsolesCount, icon: Gamepad2 },
        { label: "Upcoming Bookings", value: overview.kpis.upcomingBookingsCount, icon: Clock },
        { label: "Today's Walk-ins", value: overview.kpis.todaysWalkinsCount, icon: Footprints },
        { label: "Pending Lounge Req", value: overview.kpis.pendingGroupRequestsCount, icon: Users },
      ]
    : [];

  return (
    <PortalLayout
      portal="staff"
      title={currentTitle}
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      headerActions={
        <>
          <Button size="sm" onClick={() => setWalkinOpen(true)}>
            <PlusCircle /> Walk-in Booking
          </Button>
          <Button size="sm" variant="outline" onClick={loadOverview}>
            <RefreshCw />
          </Button>
        </>
      }
    >
      {loading && !overview ? (
        <PanelLoader label="Loading lounge operations..." />
      ) : (
        <>
          {tab === "dashboard" && overview && (
            <div className="space-y-8">
              {/* Prominent Walk-in CTA Banner */}
              <div className="hud flex flex-col items-start justify-between gap-4 rounded-2xl border border-blood/40 bg-linear-to-r from-blood/20 via-coal to-coal p-5 sm:flex-row sm:items-center sm:p-6">
                <div>
                  <p className="font-tech text-xs font-bold uppercase tracking-[0.26em] text-blood-400">Quick Operations</p>
                  <h2 className="mt-1 font-display text-xl font-black uppercase">Register a Walk-in Customer</h2>
                  <p className="mt-1 text-sm text-white/65">
                    Select an available console, collect Cash or UPI payment, and launch the timer.
                  </p>
                </div>
                <Button size="lg" onClick={() => setWalkinOpen(true)}>
                  <PlusCircle /> Walk-in Booking
                </Button>
              </div>

              {/* Staff KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                {kpiCards.map(({ label, value, icon: Icon, highlight }) => (
                  <div
                    key={label}
                    className={`rounded-2xl border p-4 ${highlight ? "border-blood/50 bg-blood/[0.08]" : "border-white/10 bg-coal"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-tech text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</span>
                      <Icon className="h-4 w-4 shrink-0 text-blood-400" />
                    </div>
                    <p className="mt-3 font-display text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>

              {/* Console Visual Indicators */}
              <section className="space-y-3">
                <h3 className="font-display text-base font-black uppercase">Live Console Status</h3>
                <ConsolesManager consoles={overview.consoles} onUpdated={loadOverview} />
              </section>

              {/* Active Sessions */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-black uppercase">Current Active Sessions</h3>
                  <button
                    type="button"
                    onClick={() => setTab("active")}
                    className="font-tech text-xs font-bold uppercase tracking-wider text-blood-400 hover:text-blood-300"
                  >
                    Full View →
                  </button>
                </div>
                <ActiveSessionsList sessions={overview.activeSessions} onCompleted={loadOverview} />
              </section>

              {/* Upcoming Bookings Preview */}
              <section className="rounded-2xl border border-white/10 bg-coal p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-black uppercase">Upcoming Bookings</h3>
                  <button
                    type="button"
                    onClick={() => setTab("bookings")}
                    className="font-tech text-xs font-bold uppercase tracking-wider text-blood-400 hover:text-blood-300"
                  >
                    All Bookings →
                  </button>
                </div>
                {overview.upcomingBookings.length === 0 ? (
                  <p className="mt-3 text-sm text-white/55">No upcoming bookings scheduled.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {overview.upcomingBookings.slice(0, 6).map((b) => (
                      <div key={b.id} className="rounded-xl border border-white/10 bg-black/40 p-3.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-bold text-blood-300">{b.booking_code}</span>
                          <StatusBadge status={b.booking_status} />
                        </div>
                        <p className="mt-2 font-semibold">{b.customer_name}</p>
                        <p className="text-xs text-white/55">
                          {b.consoles?.console_type} · {b.booking_date} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "bookings" && overview && (
            <BookingsManager consoles={overview.consoles} onChanged={loadOverview} />
          )}

          {tab === "group" && <GroupBookingsManager onChanged={loadOverview} />}

          {tab === "walkins" && overview && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-coal p-5">
                <div>
                  <h2 className="font-display text-lg font-black uppercase">Walk-in Register</h2>
                  <p className="text-sm text-white/60">Create new walk-in sessions and verify today&apos;s entries.</p>
                </div>
                <Button onClick={() => setWalkinOpen(true)}>
                  <PlusCircle /> New Walk-in Booking
                </Button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-coal">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] bg-white/[0.03] font-tech text-xs uppercase text-white/50">
                    <tr>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Console</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Collected</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {walkins.map((w) => (
                      <tr key={w.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{w.customer_name}</p>
                          <p className="text-xs text-white/50">+91 {w.customer_phone}</p>
                        </td>
                        <td className="px-4 py-3 font-tech font-bold uppercase">{w.consoles?.name}</td>
                        <td className="px-4 py-3">{w.duration_minutes} mins</td>
                        <td className="px-4 py-3 font-display font-bold">
                          <Rupee />
                          {Number(w.amount_collected)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={w.payment_method} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={w.session_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "active" && overview && (
            <ActiveSessionsList sessions={overview.activeSessions} onCompleted={loadOverview} />
          )}

          {tab === "consoles" && overview && (
            <ConsolesManager consoles={overview.consoles} onUpdated={loadOverview} />
          )}

          {tab === "tournaments" && <TournamentsManager onChanged={loadOverview} />}
        </>
      )}

      {overview && (
        <WalkinBookingModal
          open={walkinOpen}
          onClose={() => setWalkinOpen(false)}
          consoles={overview.consoles}
          pricing={pricing}
          onCreated={loadOverview}
        />
      )}
    </PortalLayout>
  );
}

export function StaffPortal() {
  const { profile, loading } = useAuth();

  if (loading) return <PanelLoader label="Verifying staff session..." />;
  if (!profile) return <PortalLogin portal="staff" />;

  // Both 'staff' and 'admin' roles are permitted on /staff
  return <StaffContent />;
}
