import { dashboardRepository } from "../repositories/dashboard.repository.js";
import { availabilityService } from "./availability.service.js";
import { getIstTodayYmd } from "../utils/time.js";

function addDaysYmd(ymd, delta) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta, 12));
  return dt.toISOString().slice(0, 10);
}

function toIstDateYmd(isoStr) {
  if (!isoStr) return "";
  return getIstTodayYmd(new Date(isoStr)).ymd;
}

export const dashboardService = {
  async getAdminDashboard() {
    const today = getIstTodayYmd().ymd;
    const monthPrefix = today.slice(0, 7); // YYYY-MM
    const from30 = addDaysYmd(today, -29);
    const from14 = addDaysYmd(today, -13);
    const from7 = addDaysYmd(today, -6);

    const [snap, consolesLive] = await Promise.all([
      dashboardRepository.fetchAllOperationalSnapshots(from30),
      availabilityService.getConsolesWithLiveAvailability(),
    ]);

    const { bookings, groupBookings, walkins, tournaments, registrations, payments } = snap;

    const nonCancelledBookings = bookings.filter((b) => b.booking_status !== "cancelled");
    const nonCancelledGroups = groupBookings.filter((g) => !["cancelled", "rejected"].includes(g.booking_status));

    const todaysIndividual = nonCancelledBookings.filter((b) => b.booking_date === today && b.booking_source === "online");
    const todaysGroups = nonCancelledGroups.filter((g) => g.booking_date === today);
    const todaysWalkins = walkins.filter((w) => toIstDateYmd(w.start_time) === today && w.session_status !== "cancelled");

    const totalBookingsToday = todaysIndividual.length + todaysGroups.length + todaysWalkins.length;
    const totalIndividualBookings = nonCancelledBookings.filter((b) => b.booking_source === "online").length;
    const totalWholeLoungeBookings = nonCancelledGroups.length;
    const totalWalkinSessions = walkins.filter((w) => w.session_status !== "cancelled").length;

    const upcomingBookings =
      nonCancelledBookings.filter((b) => b.booking_date >= today && ["pending", "confirmed"].includes(b.booking_status)).length +
      nonCancelledGroups.filter((g) => g.booking_date >= today && ["pending", "confirmed"].includes(g.booking_status)).length;

    const activeWalkins = walkins.filter((w) => w.session_status === "active");
    const activeConsoleBookings = bookings.filter((b) => b.booking_status === "active" && b.booking_source === "online");
    const activeGamingSessions = activeWalkins.length + activeConsoleBookings.length;

    const upcomingTournaments = tournaments.filter((t) =>
      ["upcoming", "registration_open", "registration_closed", "ongoing"].includes(t.status),
    ).length;

    const activeRegistrations = registrations.filter((r) => ["pending", "approved"].includes(r.registration_status));
    const tournamentRegistrations = activeRegistrations.length;

    const paidPayments = payments.filter((p) => p.payment_status === "paid");
    const todaysRevenue = paidPayments
      .filter((p) => toIstDateYmd(p.paid_at || p.created_at) === today)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const monthlyRevenue = paidPayments
      .filter((p) => toIstDateYmd(p.paid_at || p.created_at).startsWith(monthPrefix))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 1. Daily Revenue Chart (last 14 days)
    const dailyRevenueMap = new Map();
    for (let i = 0; i < 14; i++) {
      dailyRevenueMap.set(addDaysYmd(from14, i), 0);
    }
    for (const p of paidPayments) {
      const d = toIstDateYmd(p.paid_at || p.created_at);
      if (dailyRevenueMap.has(d)) {
        dailyRevenueMap.set(d, dailyRevenueMap.get(d) + Number(p.amount || 0));
      }
    }
    const dailyRevenueChart = Array.from(dailyRevenueMap.entries()).map(([date, revenue]) => ({
      date,
      label: date.slice(5),
      revenue,
    }));

    // 2. Weekly Booking Statistics (last 7 days)
    const weeklyMap = new Map();
    for (let i = 0; i < 7; i++) {
      weeklyMap.set(addDaysYmd(from7, i), { date: addDaysYmd(from7, i), online: 0, walkin: 0, group: 0 });
    }
    for (const b of nonCancelledBookings) {
      if (weeklyMap.has(b.booking_date)) {
        const entry = weeklyMap.get(b.booking_date);
        if (b.booking_source === "walkin") entry.walkin += 1;
        else entry.online += 1;
      }
    }
    for (const g of nonCancelledGroups) {
      if (weeklyMap.has(g.booking_date)) {
        weeklyMap.get(g.booking_date).group += 1;
      }
    }
    const weeklyBookingStats = Array.from(weeklyMap.values()).map((row) => ({
      ...row,
      label: row.date.slice(5),
      total: row.online + row.walkin + row.group,
    }));

    // 3. Monthly Booking Trends (last 30 days)
    const monthlyMap = new Map();
    for (let i = 0; i < 30; i++) {
      const d = addDaysYmd(from30, i);
      monthlyMap.set(d, { date: d, label: d.slice(5), bookings: 0, revenue: 0 });
    }
    for (const b of nonCancelledBookings) {
      if (monthlyMap.has(b.booking_date)) monthlyMap.get(b.booking_date).bookings += 1;
    }
    for (const g of nonCancelledGroups) {
      if (monthlyMap.has(g.booking_date)) monthlyMap.get(g.booking_date).bookings += 1;
    }
    for (const p of paidPayments) {
      const d = toIstDateYmd(p.paid_at || p.created_at);
      if (monthlyMap.has(d)) monthlyMap.get(d).revenue += Number(p.amount || 0);
    }
    const monthlyBookingTrends = Array.from(monthlyMap.values());

    // 4. PS4 vs PS4 Pro statistics
    const ps4Bookings = nonCancelledBookings.filter((b) => b.consoles?.console_type === "PS4");
    const ps4ProBookings = nonCancelledBookings.filter((b) => b.consoles?.console_type === "PS4 Pro");
    const consoleStats = [
      {
        name: "PS4",
        bookings: ps4Bookings.length,
        revenue: ps4Bookings.filter((b) => b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount || 0), 0),
      },
      {
        name: "PS4 Pro",
        bookings: ps4ProBookings.length,
        revenue: ps4ProBookings.filter((b) => b.payment_status === "paid").reduce((s, b) => s + Number(b.total_amount || 0), 0),
      },
    ];

    // 5. Booking category distribution
    const categoryDistribution = [
      { name: "Online Console", value: nonCancelledBookings.filter((b) => b.booking_source === "online").length },
      { name: "Walk-in", value: totalWalkinSessions },
      { name: "Whole Lounge", value: totalWholeLoungeBookings },
      { name: "Tournament", value: tournamentRegistrations },
    ];

    // 6. Payment method distribution
    const methodTotals = { cash: 0, upi: 0, cashfree: 0 };
    for (const p of paidPayments) {
      if (methodTotals[p.payment_method] !== undefined) {
        methodTotals[p.payment_method] += Number(p.amount || 0);
      }
    }
    const paymentMethodDistribution = [
      { name: "Cash", value: methodTotals.cash },
      { name: "UPI", value: methodTotals.upi },
      { name: "Cashfree", value: methodTotals.cashfree },
    ];

    return {
      kpis: {
        totalBookingsToday,
        totalIndividualBookings,
        totalWholeLoungeBookings,
        totalWalkinSessions,
        upcomingBookings,
        activeGamingSessions,
        upcomingTournaments,
        tournamentRegistrations,
        todaysRevenue,
        monthlyRevenue,
      },
      analytics: {
        dailyRevenueChart,
        weeklyBookingStats,
        monthlyBookingTrends,
        consoleStats,
        categoryDistribution,
        paymentMethodDistribution,
      },
      consoles: consolesLive,
      recentBookings: nonCancelledBookings.slice(-8).reverse(),
      pendingGroupRequests: groupBookings.filter((g) => g.booking_status === "pending"),
      activeWalkins,
    };
  },

  async getStaffDashboard() {
    const today = getIstTodayYmd().ymd;
    const fromToday = addDaysYmd(today, -1);

    const [snap, consolesLive] = await Promise.all([
      dashboardRepository.fetchAllOperationalSnapshots(fromToday),
      availabilityService.getConsolesWithLiveAvailability(),
    ]);

    const { bookings, groupBookings, walkins, tournaments } = snap;
    const activeWalkins = walkins.filter((w) => w.session_status === "active");

    const todaysBookings = bookings.filter((b) => b.booking_date === today && b.booking_status !== "cancelled");
    const upcomingBookings = bookings.filter(
      (b) => b.booking_date >= today && ["pending", "confirmed"].includes(b.booking_status),
    );
    const todaysWalkins = walkins.filter((w) => toIstDateYmd(w.start_time) === today && w.session_status !== "cancelled");
    const pendingGroupRequests = groupBookings.filter((g) => g.booking_status === "pending");

    const availableConsoles = consolesLive.filter((c) => c.effective_status === "available");
    const occupiedConsoles = consolesLive.filter((c) => c.effective_status === "occupied");

    return {
      kpis: {
        todaysBookingsCount: todaysBookings.length,
        activeSessionsCount: activeWalkins.length,
        availableConsolesCount: availableConsoles.length,
        occupiedConsolesCount: occupiedConsoles.length,
        upcomingBookingsCount: upcomingBookings.length,
        todaysWalkinsCount: todaysWalkins.length,
        pendingGroupRequestsCount: pendingGroupRequests.length,
      },
      consoles: consolesLive,
      activeSessions: activeWalkins,
      todaysBookings,
      upcomingBookings: upcomingBookings.slice(0, 12),
      pendingGroupRequests,
      upcomingTournaments: tournaments.filter((t) =>
        ["upcoming", "registration_open", "ongoing"].includes(t.status),
      ),
    };
  },
};
