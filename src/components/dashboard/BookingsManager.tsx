import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Calendar, CalendarClock, Eye, Filter, RefreshCw, Search, Wallet, XCircle } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type BookingRecord, type ConsoleRecord } from "@/lib/api";
import { EmptyState, PanelLoader, StatusBadge } from "./StatusBadge";

interface BookingsManagerProps {
  consoles: ConsoleRecord[];
  onChanged?: () => void;
}

export function BookingsManager({ consoles, onChanged }: BookingsManagerProps) {
  const { profile, permissions } = useAuth();
  const toast = useToast();
  const isAdmin = profile?.role === "admin";

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [consoleFilter, setConsoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  // Modals
  const [detailItem, setDetailItem] = useState<BookingRecord | null>(null);
  const [cancelItem, setCancelItem] = useState<BookingRecord | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<BookingRecord | null>(null);
  const [reschedForm, setReschedForm] = useState({ console_id: "", booking_date: "", start_time: "", duration: 60 });
  const [payItem, setPayItem] = useState<BookingRecord | null>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "upi">("cash");
  const [busy, setBusy] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.staff.getBookings({
        date: dateFilter,
        console_id: consoleFilter,
        booking_status: statusFilter,
        payment_status: paymentFilter,
        search,
      });
      setBookings(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [dateFilter, consoleFilter, statusFilter, paymentFilter, search, toast]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (id: string, nextStatus: string) => {
    try {
      await api.staff.updateBookingStatus(id, nextStatus);
      toast.success(`Booking status updated to ${nextStatus}.`);
      fetchBookings();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update status.");
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelItem) return;
    setBusy(true);
    try {
      await api.staff.cancelBooking(cancelItem.id);
      toast.success(`Booking ${cancelItem.booking_code} cancelled.`);
      setCancelItem(null);
      fetchBookings();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to cancel booking.");
    } finally {
      setBusy(false);
    }
  };

  const openReschedule = (b: BookingRecord) => {
    setRescheduleItem(b);
    setReschedForm({
      console_id: b.console_id,
      booking_date: b.booking_date,
      start_time: b.start_time.slice(0, 5),
      duration: b.duration,
    });
  };

  const handleReschedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!rescheduleItem) return;
    setBusy(true);
    try {
      await api.admin.rescheduleBooking(rescheduleItem.id, reschedForm);
      toast.success(`Booking ${rescheduleItem.booking_code} rescheduled successfully.`);
      setRescheduleItem(null);
      fetchBookings();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Schedule conflicts with an existing booking.");
    } finally {
      setBusy(false);
    }
  };

  const handleCollectPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!payItem) return;
    setBusy(true);
    try {
      await api.staff.recordOfflinePayment({
        booking_type: "console",
        record_id: payItem.id,
        payment_method: payMethod,
      });
      toast.success(`Payment of ₹${payItem.total_amount} collected via ${payMethod.toUpperCase()}.`);
      setPayItem(null);
      fetchBookings();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to record payment.");
    } finally {
      setBusy(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setDateFilter("");
    setConsoleFilter("");
    setStatusFilter("");
    setPaymentFilter("");
  };

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="rounded-2xl border border-white/10 bg-coal p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or booking ID..."
              className="field pl-10 text-sm"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by date"
            className="field text-sm"
          />
          <select value={consoleFilter} onChange={(e) => setConsoleFilter(e.target.value)} className="field text-sm">
            <option value="">All Consoles</option>
            {consoles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field text-sm">
            <option value="">All Booking Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="field text-sm">
            <option value="">All Payment Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blood-400" />
            Showing {bookings.length} individual console booking(s)
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={clearFilters} className="font-tech font-bold uppercase tracking-wider hover:text-white">
              Reset Filters
            </button>
            <button
              type="button"
              onClick={fetchBookings}
              className="inline-flex items-center gap-1 font-tech font-bold uppercase tracking-wider text-blood-400 hover:text-blood-300"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <PanelLoader label="Loading console bookings..." />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No Matching Bookings"
          subtitle="Adjust your filters or wait for new customer / walk-in sessions."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-coal">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] font-tech text-xs uppercase tracking-[0.16em] text-white/50">
              <tr>
                <th className="px-4 py-3.5">Booking ID</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Console</th>
                <th className="px-4 py-3.5">Schedule</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {bookings.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 font-display text-xs font-bold text-blood-300">{b.booking_code}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-white">{b.customer_name}</p>
                    <p className="text-xs text-white/50">+91 {b.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3.5 font-tech font-bold uppercase">{b.consoles?.console_type || "Console"}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-white">{b.booking_date}</p>
                    <p className="text-xs text-white/55">
                      {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)} ({b.duration}m)
                    </p>
                  </td>
                  <td className="px-4 py-3.5 font-display font-bold">
                    <Rupee />
                    {Number(b.total_amount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={b.booking_source} label={b.booking_source === "online" ? "Website" : "Walk-in"} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={b.payment_status} />
                  </td>
                  <td className="px-4 py-3.5">
                    {b.booking_status !== "cancelled" ? (
                      <select
                        aria-label={`Change booking status for ${b.booking_code}`}
                        value={b.booking_status}
                        onChange={(e) => handleStatusChange(b.id, e.target.value)}
                        className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 font-tech text-xs font-bold uppercase tracking-wider text-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    ) : (
                      <StatusBadge status="cancelled" />
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailItem(b)}
                        title="View Details"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {b.payment_status !== "paid" && b.booking_status !== "cancelled" && (
                        <button
                          type="button"
                          onClick={() => setPayItem(b)}
                          title="Collect Cash/UPI Payment"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        >
                          <Wallet className="h-4 w-4" />
                        </button>
                      )}
                      {isAdmin && b.booking_status !== "cancelled" && b.booking_status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => openReschedule(b)}
                          title="Reschedule Booking"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      )}
                      {permissions?.canCancelBookings && b.booking_status !== "cancelled" && b.booking_status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => setCancelItem(b)}
                          title="Cancel Booking"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-blood/35 bg-blood/10 text-blood-300 hover:bg-blood/25"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      <Modal
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        title={detailItem ? `Booking ${detailItem.booking_code}` : "Booking Details"}
      >
        {detailItem && (
          <div className="space-y-4 p-6">
            <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm">
              <div>
                <dt className="text-xs text-white/45">Customer</dt>
                <dd className="font-semibold">{detailItem.customer_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Phone</dt>
                <dd>+91 {detailItem.customer_phone}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Console</dt>
                <dd>{detailItem.consoles?.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Date & Time</dt>
                <dd>
                  {detailItem.booking_date} · {detailItem.start_time.slice(0, 5)}–{detailItem.end_time.slice(0, 5)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Duration</dt>
                <dd>
                  {detailItem.duration} mins {detailItem.bonus_minutes > 0 && `(+${detailItem.bonus_minutes}m bonus)`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Total Amount</dt>
                <dd className="font-display font-bold">
                  <Rupee />
                  {Number(detailItem.total_amount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Game / Players</dt>
                <dd>
                  {detailItem.game_title || "At lounge"} · {detailItem.players} player(s)
                </dd>
              </div>
              <div>
                <dt className="text-xs text-white/45">Source</dt>
                <dd className="uppercase">{detailItem.booking_source}</dd>
              </div>
            </dl>
            {detailItem.notes && (
              <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/70">
                <span className="block text-xs uppercase text-white/40">Notes</span>
                {detailItem.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reschedule Modal (Admin) */}
      <Modal
        open={Boolean(rescheduleItem)}
        onClose={() => setRescheduleItem(null)}
        title={`Reschedule ${rescheduleItem?.booking_code || ""}`}
        subtitle="Conflicts with bookings, walk-ins & whole-lounge reservations are automatically blocked."
      >
        <form onSubmit={handleReschedule} className="space-y-4 p-6">
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Console</label>
            <select
              value={reschedForm.console_id}
              onChange={(e) => setReschedForm((f) => ({ ...f, console_id: e.target.value }))}
              className="field mt-2"
            >
              {consoles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Date</label>
              <input
                type="date"
                required
                value={reschedForm.booking_date}
                onChange={(e) => setReschedForm((f) => ({ ...f, booking_date: e.target.value }))}
                className="field mt-2"
              />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Start Time</label>
              <input
                type="time"
                required
                value={reschedForm.start_time}
                onChange={(e) => setReschedForm((f) => ({ ...f, start_time: e.target.value }))}
                className="field mt-2"
              />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Duration (min)</label>
              <input
                type="number"
                min={30}
                step={30}
                max={720}
                required
                value={reschedForm.duration}
                onChange={(e) => setReschedForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                className="field mt-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={() => setRescheduleItem(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Validating..." : "Save Schedule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal
        open={Boolean(payItem)}
        onClose={() => setPayItem(null)}
        title="Collect Payment at Lounge"
        subtitle={`Booking ${payItem?.booking_code || ""} · ₹${payItem?.total_amount || 0}`}
      >
        <form onSubmit={handleCollectPayment} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            {(["cash", "upi"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPayMethod(m)}
                className={`rounded-xl border py-3 font-tech text-sm font-bold uppercase tracking-wider ${
                  payMethod === m ? "border-blood bg-blood text-white" : "border-white/10 bg-black/40 text-white/70"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPayItem(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Recording..." : `Mark ₹${payItem?.total_amount || 0} Paid`}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelItem)}
        title="Cancel Booking"
        message={`Are you sure you want to cancel booking ${cancelItem?.booking_code} for ${cancelItem?.customer_name}? This will immediately free the console slot.`}
        confirmLabel="Cancel Booking"
        busy={busy}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelItem(null)}
      />
    </div>
  );
}
