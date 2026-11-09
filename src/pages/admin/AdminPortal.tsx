import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  Clock,
  Footprints,
  Gamepad2,
  LayoutDashboard,
  PlusCircle,
  RefreshCw,
  Settings,
  Tag,
  Timer,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { BookingsManager } from "@/components/dashboard/BookingsManager";
import {
  ConsoleSplitCard,
  DailyRevenueChart,
  DistributionCard,
  MonthlyTrendChart,
  WeeklyBookingsChart,
} from "@/components/dashboard/Charts";
import { ConsolesManager } from "@/components/dashboard/ConsolesManager";
import { GroupBookingsManager } from "@/components/dashboard/GroupBookingsManager";
import { PortalLayout, type SidebarNavItem } from "@/components/dashboard/PortalLayout";
import { AccessDeniedView, PortalLogin } from "@/components/dashboard/PortalLogin";
import { PanelLoader, StatusBadge } from "@/components/dashboard/StatusBadge";
import { TournamentsManager } from "@/components/dashboard/TournamentsManager";
import { ActiveSessionsList, WalkinBookingModal } from "@/components/dashboard/WalkinManager";
import { Button } from "@/components/ui/Button";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type AdminDashboardData, type PricingRecord, type WalkinRecord } from "@/lib/api";
import { AdminPayments } from "./AdminPayments";
import { AdminPricing } from "./AdminPricing";
import { AdminSettings } from "./AdminSettings";
import { AdminStaff } from "./AdminStaff";
import { AdminGames } from "./AdminGames";

type AdminTab =
  | "dashboard"
  | "bookings"
  | "group"
  | "walkins"
  | "consoles"
  | "tournaments"
  | "games"
  | "pricing"
  | "staff"
  | "payments"
  | "analytics"
  | "settings";

function AdminContent() {
  const toast = useToast();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [overview, setOverview] = useState<AdminDashboardData | null>(null);
  const [pricing, setPricing] = useState<PricingRecord[]>([]);
  const [walkins, setWalkins] = useState<WalkinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [walkinOpen, setWalkinOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      const [dash, priceList, walkinList] = await Promise.all([
        api.admin.getDashboard(),
        api.admin.getPricing(),
        api.staff.getWalkins(),
      ]);
      setOverview(dash);
      setPricing(priceList);
      setWalkins(walkinList);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load Admin Dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const navItems: SidebarNavItem<AdminTab>[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings", icon: Calendar },
    {
      id: "group",
      label: "Whole Lounge Bookings",
      icon: Users,
      badge: overview?.pendingGroupRequests.length,
    },
    {
      id: "walkins",
      label: "Walk-ins",
      icon: Footprints,
      badge: overview?.activeWalkins.length,
    },
    { id: "consoles", label: "Consoles", icon: Gamepad2 },
    { id: "tournaments", label: "Tournaments", icon: Trophy },
    { id: "games", label: "Premium Games", icon: Gamepad2 },
    { id: "pricing", label: "Pricing", icon: Tag },
    { id: "staff", label: "Staff Management", icon: UserCheck },
    { id: "payments", label: "Payments", icon: Wallet },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const currentTitle = navItems.find((n) => n.id === tab)?.label || "Dashboard";

  const kpiCards = overview
    ? [
        { label: "Total Bookings Today", value: overview.kpis.totalBookingsToday, icon: CalendarCheck },
        { label: "Individual Bookings", value: overview.kpis.totalIndividualBookings, icon: Gamepad2 },
        { label: "Whole Lounge Bookings", value: overview.kpis.totalWholeLoungeBookings, icon: Users },
        { label: "Walk-in Sessions", value: overview.kpis.totalWalkinSessions, icon: Footprints },
        { label: "Upcoming Bookings", value: overview.kpis.upcomingBookings, icon: Clock },
        { label: "Active Sessions", value: overview.kpis.activeGamingSessions, icon: Timer, highlight: true },
        { label: "Upcoming Tournaments", value: overview.kpis.upcomingTournaments, icon: Trophy },
        { label: "Tournament Regs", value: overview.kpis.tournamentRegistrations, icon: UserCheck },
        {
          label: "Today's Revenue",
          value: (
            <>
              <Rupee />
              {overview.kpis.todaysRevenue.toLocaleString("en-IN")}
            </>
          ),
          icon: Wallet,
          highlight: true,
        },
        {
          label: "Monthly Revenue",
          value: (
            <>
              <Rupee />
              {overview.kpis.monthlyRevenue.toLocaleString("en-IN")}
            </>
          ),
          icon: TrendingUp,
        },
      ]
    : [];

  return (
    <PortalLayout
      portal="admin"
      title={currentTitle}
      navItems={navItems}
      activeTab={tab}
      onSelectTab={setTab}
      headerActions={
        <>
          <Button size="sm" onClick={() => setWalkinOpen(true)}>
            <PlusCircle /> <span className="hidden sm:inline">Walk-in Session</span>
          </Button>
          <Button size="sm" variant="outline" onClick={loadOverview}>
            <RefreshCw />
          </Button>
        </>
      }
    >
      {loading && !overview ? (
        <PanelLoader label="Loading dashboard metrics..." />
      ) : (
        <>
          {tab === "dashboard" && overview && (
            <div className="space-y-8">
              {/* 10 KPI Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {kpiCards.map(({ label, value, icon: Icon, highlight }) => (
                  <div
                    key={label}
                    className={`rounded-2xl border p-4 transition-colors ${
                      highlight ? "border-blood/50 bg-blood/[0.08]" : "border-white/10 bg-coal"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-tech text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">{label}</span>
                      <Icon className="h-4 w-4 text-blood-400" />
                    </div>
                    <p className="mt-3 font-display text-2xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Console Live Status + Pending Group Alerts */}
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-white/10 bg-coal p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-black uppercase">Console Status</h2>
                    <button
                      type="button"
                      onClick={() => setTab("consoles")}
                      className="font-tech text-xs font-bold uppercase tracking-wider text-blood-400 hover:text-blood-300"
                    >
                      Manage →
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {overview.consoles.map((c) => (
                      <div key={c.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-display text-sm font-black uppercase">{c.name}</span>
                          <StatusBadge status={c.effective_status || c.status} />
                        </div>
                        <p className="mt-2 text-xs text-white/55">{c.console_type} Station</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-coal p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-base font-black uppercase">
                      Pending Whole-Lounge Requests ({overview.pendingGroupRequests.length})
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab("group")}
                      className="font-tech text-xs font-bold uppercase tracking-wider text-blood-400 hover:text-blood-300"
                    >
                      Review All →
                    </button>
                  </div>
                  {overview.pendingGroupRequests.length === 0 ? (
                    <p className="mt-4 text-sm text-white/50">No pending whole-lounge requests right now.</p>
                  ) : (
                    <div className="mt-4 space-y-2.5">
                      {overview.pendingGroupRequests.slice(0, 3).map((g) => (
                        <div key={g.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-sm">
                          <div>
                            <p className="font-semibold text-white">
                              {g.customer_name} · {g.booking_code}
                            </p>
                            <p className="text-xs text-white/55">
                              {g.booking_date} · {g.start_time.slice(0, 5)}–{g.end_time.slice(0, 5)} · {g.number_of_people} people
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => setTab("group")}>
                            Review
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Active Sessions */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-black uppercase">Active Gaming Sessions</h2>
                  <Button size="sm" onClick={() => setWalkinOpen(true)}>
                    <PlusCircle /> Start Walk-in
                  </Button>
                </div>
                <ActiveSessionsList sessions={overview.activeWalkins} onCompleted={loadOverview} />
              </section>

              {/* Visual Analytics Preview */}
              <div className="grid gap-6 lg:grid-cols-2">
                <DailyRevenueChart data={overview.analytics.dailyRevenueChart} />
                <WeeklyBookingsChart data={overview.analytics.weeklyBookingStats} />
              </div>
            </div>
          )}

          {tab === "bookings" && overview && (
            <BookingsManager consoles={overview.consoles} onChanged={loadOverview} />
          )}

          {tab === "group" && <GroupBookingsManager onChanged={loadOverview} />}

          {tab === "walkins" && overview && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blood/35 bg-linear-to-r from-blood/15 via-coal to-coal p-5">
                <div>
                  <h2 className="font-display text-lg font-black uppercase">Walk-in Sessions</h2>
                  <p className="text-sm text-white/60">Register walk-in visitors, collect Cash/UPI payments, and manage active timers.</p>
                </div>
                <Button onClick={() => setWalkinOpen(true)}>
                  <PlusCircle /> New Walk-in Booking
                </Button>
              </div>

              <div>
                <h3 className="mb-4 font-display text-base font-black uppercase">Live Active Sessions</h3>
                <ActiveSessionsList sessions={overview.activeWalkins} onCompleted={loadOverview} />
              </div>

              <div>
                <h3 className="mb-4 font-display text-base font-black uppercase">Recent Walk-in History</h3>
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-coal">
                  <table className="w-full min-w-[720px] text-left text-sm">
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
            </div>
          )}

          {tab === "consoles" && overview && (
            <ConsolesManager consoles={overview.consoles} onUpdated={loadOverview} />
          )}

          {tab === "tournaments" && <TournamentsManager onChanged={loadOverview} />}
          {tab === "games" && <AdminGames onChanged={loadOverview} />}

          {tab === "pricing" && <AdminPricing onChanged={loadOverview} />}

          {tab === "staff" && <AdminStaff />}

          {tab === "payments" && <AdminPayments />}

          {tab === "analytics" && overview && (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <DailyRevenueChart data={overview.analytics.dailyRevenueChart} />
                <WeeklyBookingsChart data={overview.analytics.weeklyBookingStats} />
              </div>
              <MonthlyTrendChart data={overview.analytics.monthlyBookingTrends} />
              <div className="grid gap-6 md:grid-cols-3">
                <ConsoleSplitCard data={overview.analytics.consoleStats} />
                <DistributionCard
                  eyebrow="Mix"
                  title="Booking Categories"
                  items={overview.analytics.categoryDistribution}
                />
                <DistributionCard
                  eyebrow="Collections"
                  title="Payment Methods"
                  items={overview.analytics.paymentMethodDistribution}
                  isCurrency
                />
              </div>
            </div>
          )}

          {tab === "settings" && <AdminSettings />}
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

export function AdminPortal() {
  const { profile, loading } = useAuth();

  if (loading) return <PanelLoader label="Verifying administrator session..." />;
  if (!profile) return <PortalLogin portal="admin" />;
  if (profile.role !== "admin") return <AccessDeniedView />;

  return <AdminContent />;
}
