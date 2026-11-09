import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, RefreshCw, ShieldAlert, Users, Wallet, X } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type GroupBookingRecord } from "@/lib/api";
import { EmptyState, PanelLoader, StatusBadge } from "./StatusBadge";

export function GroupBookingsManager({ onChanged }: { onChanged?: () => void }) {
  const { permissions } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<GroupBookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [rejectItem, setRejectItem] = useState<GroupBookingRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payItem, setPayItem] = useState<GroupBookingRecord | null>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "upi">("cash");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.staff.getGroupBookings({ status: statusFilter });
      setItems(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load whole lounge bookings.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (item: GroupBookingRecord) => {
    setBusyId(item.id);
    try {
      await api.staff.approveGroupBooking(item.id);
      toast.success(`Approved ${item.booking_code}: both PS4 and PS4 Pro are now blocked for this slot.`);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : "Cannot approve: one or both consoles have a conflicting reservation during this period.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!rejectItem) return;
    setBusyId(rejectItem.id);
    try {
      await api.staff.rejectGroupBooking(rejectItem.id, rejectReason);
      toast.info(`Rejected whole-lounge request ${rejectItem.booking_code}.`);
      setRejectItem(null);
      setRejectReason("");
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reject request.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (item: GroupBookingRecord) => {
    setBusyId(item.id);
    try {
      await api.staff.cancelGroupBooking(item.id);
      toast.info(`Cancelled reservation ${item.booking_code} and released both consoles.`);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to cancel reservation.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!payItem) return;
    setBusyId(payItem.id);
    try {
      await api.staff.recordOfflinePayment({
        booking_type: "group",
        record_id: payItem.id,
        payment_method: payMethod,
      });
      toast.success(`Collected ₹${payItem.total_amount} via ${payMethod.toUpperCase()}.`);
      setPayItem(null);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to record payment.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-coal p-4">
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field w-48 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending Requests</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {!permissions?.canApproveGroupBookings && (
            <span className="hidden items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 sm:inline-flex">
              <ShieldAlert className="h-3.5 w-3.5" /> Approval requires Admin permission
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      {loading ? (
        <PanelLoader label="Loading whole-lounge reservations..." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No Whole Lounge Bookings"
          subtitle="Whole-lounge reservation requests from the public site will appear here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="hud rounded-2xl border border-white/10 bg-coal p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-display text-xs font-bold text-blood-300">{item.booking_code}</span>
                  <h3 className="mt-1 font-display text-lg font-black uppercase">{item.customer_name}</h3>
                  <p className="text-xs text-white/55">+91 {item.customer_phone} · {item.number_of_people} people</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <StatusBadge status={item.booking_status} />
                  <StatusBadge status={item.payment_status} label={`Pay: ${item.payment_status}`} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase text-white/45">Date</p>
                  <p className="font-semibold">{item.booking_date}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-white/45">Time Window</p>
                  <p className="font-semibold">
                    {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)} ({item.duration}m)
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-white/45">Total Price</p>
                  <p className="font-display font-black">
                    <Rupee />
                    {Number(item.total_amount)}
                  </p>
                </div>
              </div>

              {item.notes && <p className="mt-3 text-xs text-white/60">Note: {item.notes}</p>}
              {item.rejection_reason && (
                <p className="mt-2 text-xs text-blood-300">Rejection reason: {item.rejection_reason}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                {item.booking_status === "pending" && permissions?.canApproveGroupBookings && (
                  <>
                    <Button size="sm" disabled={busyId === item.id} onClick={() => handleApprove(item)}>
                      <Check /> Approve &amp; Lock Both Consoles
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => setRejectItem(item)}
                    >
                      <X /> Reject
                    </Button>
                  </>
                )}

                {item.payment_status !== "paid" && ["pending", "confirmed"].includes(item.booking_status) && (
                  <Button size="sm" variant="outline" onClick={() => setPayItem(item)}>
                    <Wallet /> Mark Paid
                  </Button>
                )}

                {item.booking_status === "confirmed" && permissions?.canCancelBookings && (
                  <Button size="sm" variant="ghost" disabled={busyId === item.id} onClick={() => handleCancel(item)}>
                    Cancel Reservation
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal
        open={Boolean(rejectItem)}
        onClose={() => setRejectItem(null)}
        title={`Reject ${rejectItem?.booking_code || ""}`}
      >
        <form onSubmit={handleReject} className="space-y-4 p-6">
          <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
            Reason (Optional)
          </label>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Time slot unavailable due to scheduled maintenance or tournament..."
            className="field resize-none"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setRejectItem(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busyId === rejectItem?.id}>
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal
        open={Boolean(payItem)}
        onClose={() => setPayItem(null)}
        title="Collect Whole-Lounge Payment"
        subtitle={`${payItem?.booking_code || ""} · ₹${payItem?.total_amount || 0}`}
      >
        <form onSubmit={handlePay} className="space-y-4 p-6">
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
            <Button type="submit" size="sm">
              Confirm Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
