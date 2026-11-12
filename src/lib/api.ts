const TOKEN_KEY = "atrocity_auth_token";

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore storage quota issues
  }
}

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl !== undefined && envUrl !== "") return envUrl.replace(/\/+$/, "");
  if (typeof window !== "undefined") {
    const port = window.location.port;
    if (port === "5173" || port === "4173") return "http://localhost:5000";
  }
  return "";
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = false, headers: customHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    ...(rest.body && !(rest.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(customHeaders as Record<string, string>),
  };

  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...rest, headers });
  } catch {
    throw new ApiClientError(0, "NETWORK_ERROR", "Unable to reach the backend server. Ensure the Node.js API is running.");
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    if (!res.ok) throw new ApiClientError(res.status, "EXPORT_FAILED", "Failed to export CSV.");
    return (await res.text()) as unknown as T;
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    const err = payload?.error;
    throw new ApiClientError(
      res.status,
      err?.code || "REQUEST_FAILED",
      err?.message || `Request failed with status ${res.status}`,
    );
  }

  return payload.data as T;
}

/* ------------------------------------------------------------------ */
/* Shared Backend Types                                                */
/* ------------------------------------------------------------------ */
export type StaffRole = "admin" | "staff";

export interface StaffProfile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
}

export interface Permissions {
  canAccessAdmin: boolean;
  canAccessStaff: boolean;
  canApproveGroupBookings: boolean;
  canCancelBookings: boolean;
  canUpdateConsoleStatus: boolean;
  canManageTournaments: boolean;
  canManagePricing: boolean;
  canManageStaff: boolean;
  canModifySettings: boolean;
}

export interface ConsoleRecord {
  id: string;
  slug: string;
  name: string;
  console_type: string;
  description: string;
  specs: Record<string, string>;
  status: "available" | "occupied" | "maintenance" | "disabled";
  effective_status?: "available" | "occupied" | "maintenance" | "disabled";
  has_active_reservation?: boolean;
  maintenance_note?: string | null;
}

export interface PricingRecord {
  id: string;
  category: "ps4" | "ps4pro" | "whole_lounge" | "tournament";
  label: string;
  duration_minutes: number;
  bonus_minutes: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface BookingRecord {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  console_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  bonus_minutes: number;
  game_title?: string | null;
  players: number;
  total_amount: number;
  booking_source: "online" | "walkin";
  booking_status: "pending" | "confirmed" | "active" | "completed" | "cancelled";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  notes?: string | null;
  created_at: string;
  consoles?: { id: string; name: string; console_type: string; slug?: string };
}

export interface GroupBookingRecord {
  id: string;
  booking_code: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  number_of_people: number;
  total_amount: number;
  booking_status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  notes?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  reviewer?: { id: string; full_name: string } | null;
}

export interface WalkinRecord {
  id: string;
  booking_id?: string | null;
  customer_name: string;
  customer_phone: string;
  console_id: string;
  duration_minutes: number;
  start_time: string;
  expected_end_time: string;
  actual_end_time?: string | null;
  amount_collected: number;
  payment_method: "cash" | "upi";
  payment_status: "pending" | "paid" | "refunded";
  session_status: "active" | "completed" | "cancelled";
  notes?: string | null;
  consoles?: { id: string; name: string; console_type: string; slug?: string };
  staff?: { id: string; full_name: string } | null;
}

export interface TournamentRecord {
  id: string;
  title: string;
  slug: string;
  game_name: string;
  description: string;
  tournament_date: string;
  start_time: string;
  registration_deadline: string;
  entry_fee: number;
  max_participants: number;
  format: string;
  rules: string;
  status: "upcoming" | "registration_open" | "registration_closed" | "ongoing" | "completed" | "cancelled";
  winner_name?: string | null;
  runner_up_name?: string | null;
  results_notes?: string | null;
  is_published: boolean;
  registration_count?: number;
  cover_image_url?: string | null;
  cover_image_path?: string | null;
  cover_fallback_text?: string;
}

export interface GameRecord {
  id: string;
  title: string;
  studio: string;
  tag: string;
  genres: string[];
  modes: string[];
  blurb: string;
  cover_image_url?: string | null;
  cover_image_path?: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface TournamentRegistrationRecord {
  id: string;
  registration_code: string;
  tournament_id: string;
  participant_name: string;
  phone: string;
  gamer_tag?: string | null;
  registration_date: string;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  registration_status: "pending" | "approved" | "rejected" | "cancelled";
  notes?: string | null;
  tournaments?: { id: string; title: string; game_name: string; entry_fee: number };
}

export interface PaymentRecord {
  id: string;
  booking_type: "console" | "group" | "walkin" | "tournament";
  booking_id?: string | null;
  group_booking_id?: string | null;
  walkin_session_id?: string | null;
  tournament_registration_id?: string | null;
  transaction_id: string;
  cashfree_order_id?: string | null;
  cashfree_payment_id?: string | null;
  amount: number;
  currency: string;
  payment_method: "cashfree" | "cash" | "upi";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  paid_at?: string | null;
  created_at: string;
  collected?: { id: string; full_name: string } | null;
}

export interface LoungeSettings {
  id: number;
  lounge_name: string;
  opening_time: string;
  closing_time: string;
  staff_can_approve_group_bookings: boolean;
  staff_can_cancel_bookings: boolean;
  staff_can_update_console_status: boolean;
  staff_can_manage_tournaments: boolean;
  tournament_manual_approval: boolean;
  online_booking_auto_reserve_lounge: boolean;
}

export interface AvailabilityResponse {
  date: string;
  durationMinutes: number;
  openingTime: string;
  closingTime: string;
  consoles: { id: string; slug: string; name: string; console_type: string; status: string }[];
  slots: {
    time: string;
    endTime: string;
    past: boolean;
    consoles: Record<string, { available: boolean; reason: string }>;
    wholeLoungeAvailable: boolean;
  }[];
}

export interface AdminDashboardData {
  kpis: {
    totalBookingsToday: number;
    totalIndividualBookings: number;
    totalWholeLoungeBookings: number;
    totalWalkinSessions: number;
    upcomingBookings: number;
    activeGamingSessions: number;
    upcomingTournaments: number;
    tournamentRegistrations: number;
    todaysRevenue: number;
    monthlyRevenue: number;
  };
  analytics: {
    dailyRevenueChart: { date: string; label: string; revenue: number }[];
    weeklyBookingStats: { date: string; label: string; online: number; walkin: number; group: number; total: number }[];
    monthlyBookingTrends: { date: string; label: string; bookings: number; revenue: number }[];
    consoleStats: { name: string; bookings: number; revenue: number }[];
    categoryDistribution: { name: string; value: number }[];
    paymentMethodDistribution: { name: string; value: number }[];
  };
  consoles: ConsoleRecord[];
  recentBookings: BookingRecord[];
  pendingGroupRequests: GroupBookingRecord[];
  activeWalkins: WalkinRecord[];
}

export interface StaffDashboardData {
  kpis: {
    todaysBookingsCount: number;
    activeSessionsCount: number;
    availableConsolesCount: number;
    occupiedConsolesCount: number;
    upcomingBookingsCount: number;
    todaysWalkinsCount: number;
    pendingGroupRequestsCount: number;
  };
  consoles: ConsoleRecord[];
  activeSessions: WalkinRecord[];
  todaysBookings: BookingRecord[];
  upcomingBookings: BookingRecord[];
  pendingGroupRequests: GroupBookingRecord[];
  upcomingTournaments: TournamentRecord[];
}

export interface AuditLogRecord {
  id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* API Client Methods                                                  */
/* ------------------------------------------------------------------ */
export const api = {
  auth: {
    login: (body: { email: string; password: string; portal?: "admin" | "staff" }) =>
      request<{ access_token: string; user: { id: string; email: string }; profile: StaffProfile; permissions: Permissions }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify(body) },
      ),
    logout: () => request<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST", auth: true }),
    me: () =>
      request<{ user: { id: string; email: string }; profile: StaffProfile; permissions: Permissions }>(
        "/api/auth/me",
        { auth: true },
      ),
  },

  public: {
    getConsoles: () => request<ConsoleRecord[]>("/api/consoles"),
    getPricing: () => request<PricingRecord[]>("/api/pricing"),
    getTournaments: () => request<TournamentRecord[]>("/api/tournaments"),
    getGames: () => request<GameRecord[]>("/api/games"),
    getAvailability: (date: string, duration = 60, step = 30) =>
      request<AvailabilityResponse>(`/api/availability?date=${encodeURIComponent(date)}&duration=${duration}&step=${step}`),
    createBooking: (body: {
      customer_name: string;
      customer_phone: string;
      console_type: string;
      booking_date: string;
      start_time: string;
      duration: number;
      pricing_id: string;
      game_title?: string | null;
      players?: number;
      notes?: string | null;
    }) => request<BookingRecord>("/api/bookings", { method: "POST", body: JSON.stringify(body) }),
    createGroupBooking: (body: {
      customer_name: string;
      customer_phone: string;
      booking_date: string;
      start_time: string;
      duration: number;
      number_of_people: number;
      notes?: string | null;
    }) => request<GroupBookingRecord>("/api/group-bookings", { method: "POST", body: JSON.stringify(body) }),
    registerTournament: (
      tournamentId: string,
      body: { participant_name: string; phone: string; gamer_tag?: string | null; notes?: string | null },
    ) =>
      request<TournamentRegistrationRecord>(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    createCashfreeOrder: (body: { booking_type: "console" | "group" | "tournament"; record_id: string }) =>
      request<{
        order_id: string;
        cf_order_id: string;
        payment_session_id: string;
        amount: number;
        currency: string;
        payment_id: string;
        environment: string;
      }>("/api/payments/cashfree/order", { method: "POST", body: JSON.stringify(body) }),
    verifyCashfreeOrder: (body: { order_id: string }) =>
      request<PaymentRecord>("/api/payments/cashfree/verify", { method: "POST", body: JSON.stringify(body) }),
  },

  staff: {
    getDashboard: () => request<StaffDashboardData>("/api/staff/dashboard", { auth: true }),
    getBookings: (params: Record<string, string> = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v))).toString();
      return request<BookingRecord[]>(`/api/bookings${q ? `?${q}` : ""}`, { auth: true });
    },
    updateBookingStatus: (id: string, booking_status: string) =>
      request<BookingRecord>(`/api/bookings/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ booking_status }),
      }),
    cancelBooking: (id: string) => request<BookingRecord>(`/api/bookings/${id}`, { method: "DELETE", auth: true }),
    getGroupBookings: (params: Record<string, string> = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v))).toString();
      return request<GroupBookingRecord[]>(`/api/group-bookings${q ? `?${q}` : ""}`, { auth: true });
    },
    approveGroupBooking: (id: string) =>
      request<GroupBookingRecord>(`/api/group-bookings/${id}/approve`, { method: "PATCH", auth: true }),
    rejectGroupBooking: (id: string, rejection_reason?: string) =>
      request<GroupBookingRecord>(`/api/group-bookings/${id}/reject`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ rejection_reason }),
      }),
    cancelGroupBooking: (id: string) =>
      request<GroupBookingRecord>(`/api/group-bookings/${id}/cancel`, { method: "PATCH", auth: true }),
    getWalkins: (params: Record<string, string> = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v))).toString();
      return request<WalkinRecord[]>(`/api/walkins${q ? `?${q}` : ""}`, { auth: true });
    },
    getActiveWalkins: () => request<WalkinRecord[]>("/api/walkins/active", { auth: true }),
    createWalkin: (body: {
      customer_name: string;
      customer_phone: string;
      console_id: string;
      duration_minutes: number;
      start_time?: string;
      payment_method: "cash" | "upi";
      amount_collected?: number;
      notes?: string | null;
    }) => request<{ walkin: WalkinRecord; booking: BookingRecord }>("/api/walkins", { method: "POST", auth: true, body: JSON.stringify(body) }),
    completeWalkin: (id: string) => request<WalkinRecord>(`/api/walkins/${id}/complete`, { method: "PATCH", auth: true }),
    updateConsoleStatus: (id: string, status: string, maintenance_note?: string | null) =>
      request<ConsoleRecord>(`/api/consoles/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status, maintenance_note }),
      }),
    getConsoleSchedule: (id: string) =>
      request<ConsoleRecord & { schedule: { bookings: BookingRecord[]; groupBookings: GroupBookingRecord[] } }>(`/api/consoles/${id}`, {
        auth: true,
      }),
    recordOfflinePayment: (body: { booking_type: "console" | "group" | "tournament"; record_id: string; payment_method: "cash" | "upi"; amount?: number }) =>
      request<PaymentRecord>("/api/payments/offline", { method: "POST", auth: true, body: JSON.stringify(body) }),
    getTournaments: () => request<TournamentRecord[]>("/api/admin/tournaments", { auth: true }),
    getTournamentRegistrations: (tournamentId: string, params: Record<string, string> = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v))).toString();
      return request<TournamentRegistrationRecord[]>(
        `/api/tournaments/${tournamentId}/registrations${q ? `?${q}` : ""}`,
        { auth: true },
      );
    },
    updateTournamentRegistration: (
      tournamentId: string,
      regId: string,
      body: { registration_status?: string; payment_status?: string; notes?: string | null },
    ) =>
      request<TournamentRegistrationRecord>(`/api/admin/tournaments/${tournamentId}/registrations/${regId}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(body),
      }),
  },

  admin: {
    getDashboard: () => request<AdminDashboardData>("/api/admin/dashboard", { auth: true }),
    rescheduleBooking: (
      id: string,
      body: { console_id?: string; booking_date?: string; start_time?: string; duration?: number },
    ) => request<BookingRecord>(`/api/bookings/${id}`, { method: "PUT", auth: true, body: JSON.stringify(body) }),
    updateConsole: (id: string, body: Partial<ConsoleRecord>) =>
      request<ConsoleRecord>(`/api/admin/consoles/${id}`, { method: "PUT", auth: true, body: JSON.stringify(body) }),
    createTournament: (body: Record<string, unknown>) =>
      request<TournamentRecord>("/api/admin/tournaments", { method: "POST", auth: true, body: JSON.stringify(body) }),
    updateTournament: (id: string, body: Record<string, unknown>) =>
      request<TournamentRecord>(`/api/admin/tournaments/${id}`, { method: "PUT", auth: true, body: JSON.stringify(body) }),
    updateTournamentStatus: (id: string, status: string) =>
      request<TournamentRecord>(`/api/admin/tournaments/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status }),
      }),
    deleteTournament: (id: string) =>
      request<{ deleted: boolean }>(`/api/admin/tournaments/${id}`, { method: "DELETE", auth: true }),
    getGames: () => request<GameRecord[]>("/api/admin/games", { auth: true }),
    uploadMedia: async (file: File, folder: "games" | "tournaments") => {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", folder);
      return request<{ url: string; path: string }>("/api/admin/media/upload", { method: "POST", auth: true, body });
    },
    createGame: (body: Partial<GameRecord>) =>
      request<GameRecord>("/api/admin/games", { method: "POST", auth: true, body: JSON.stringify(body) }),
    updateGame: (id: string, body: Partial<GameRecord>) =>
      request<GameRecord>(`/api/admin/games/${id}`, { method: "PUT", auth: true, body: JSON.stringify(body) }),
    deleteGame: (id: string) => request<{ deleted: boolean }>(`/api/admin/games/${id}`, { method: "DELETE", auth: true }),
    exportTournamentRegistrationsCsv: (tournamentId: string) =>
      request<string>(`/api/admin/tournaments/${tournamentId}/registrations/export`, { auth: true }),
    getPricing: () => request<PricingRecord[]>("/api/admin/pricing", { auth: true }),
    upsertPricing: (body: Partial<PricingRecord>) =>
      request<PricingRecord>("/api/admin/pricing", { method: "PUT", auth: true, body: JSON.stringify(body) }),
    deletePricing: (id: string) => request<{ deleted: boolean }>(`/api/admin/pricing/${id}`, { method: "DELETE", auth: true }),
    getStaff: () => request<StaffProfile[]>("/api/admin/staff", { auth: true }),
    createStaff: (body: { full_name: string; email: string; phone?: string; password: string; role: StaffRole }) =>
      request<StaffProfile>("/api/admin/staff", { method: "POST", auth: true, body: JSON.stringify(body) }),
    updateStaff: (id: string, body: { full_name?: string; phone?: string | null; role?: StaffRole }) =>
      request<StaffProfile>(`/api/admin/staff/${id}`, { method: "PUT", auth: true, body: JSON.stringify(body) }),
    toggleStaffStatus: (id: string, is_active: boolean) =>
      request<StaffProfile>(`/api/admin/staff/${id}/status`, { method: "PATCH", auth: true, body: JSON.stringify({ is_active }) }),
    resetStaffPassword: (id: string, newPassword?: string) =>
      request<{ reset: boolean; method: string; recoveryLink?: string | null }>(`/api/admin/staff/${id}/reset-password`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(newPassword ? { newPassword } : {}),
      }),
    getStaffActivity: (staffId = "all") => request<AuditLogRecord[]>(`/api/admin/staff/${staffId}/activity`, { auth: true }),
    getPayments: (params: Record<string, string> = {}) => {
      const q = new URLSearchParams(Object.entries(params).filter(([, v]) => Boolean(v))).toString();
      return request<PaymentRecord[]>(`/api/admin/payments${q ? `?${q}` : ""}`, { auth: true });
    },
    updatePaymentStatus: (id: string, payment_status: string) =>
      request<PaymentRecord>(`/api/admin/payments/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ payment_status }),
      }),
    getSettings: () => request<LoungeSettings>("/api/admin/settings", { auth: true }),
    updateSettings: (body: Partial<LoungeSettings>) =>
      request<LoungeSettings>("/api/admin/settings", { method: "PUT", auth: true, body: JSON.stringify(body) }),
    getAuditLogs: () => request<AuditLogRecord[]>("/api/admin/audit-logs", { auth: true }),
  },
};
