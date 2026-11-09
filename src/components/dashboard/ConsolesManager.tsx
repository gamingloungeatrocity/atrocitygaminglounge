import { useState, type FormEvent } from "react";
import { Calendar, Edit3, Gamepad2, Wrench } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type BookingRecord, type ConsoleRecord, type GroupBookingRecord } from "@/lib/api";
import { cn } from "@/utils/cn";
import { StatusBadge } from "./StatusBadge";

interface ConsolesManagerProps {
  consoles: ConsoleRecord[];
  onUpdated: () => void;
}

export function ConsolesManager({ consoles, onUpdated }: ConsolesManagerProps) {
  const { profile, permissions } = useAuth();
  const toast = useToast();
  const isAdmin = profile?.role === "admin";

  const [editItem, setEditItem] = useState<ConsoleRecord | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", maintenance_note: "" });
  const [scheduleConsole, setScheduleConsole] = useState<(ConsoleRecord & { schedule: { bookings: BookingRecord[]; groupBookings: GroupBookingRecord[] } }) | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const changeStatus = async (c: ConsoleRecord, status: ConsoleRecord["status"]) => {
    setBusyId(c.id);
    try {
      await api.staff.updateConsoleStatus(c.id, status);
      toast.success(`${c.name} marked as ${status}.`);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not update console status.");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (c: ConsoleRecord) => {
    setEditItem(c);
    setEditForm({
      name: c.name,
      description: c.description || "",
      maintenance_note: c.maintenance_note || "",
    });
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setBusyId(editItem.id);
    try {
      await api.admin.updateConsole(editItem.id, editForm);
      toast.success("Console details saved.");
      setEditItem(null);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update console.");
    } finally {
      setBusyId(null);
    }
  };

  const viewSchedule = async (c: ConsoleRecord) => {
    try {
      const data = await api.staff.getConsoleSchedule(c.id);
      setScheduleConsole(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to fetch console schedule.");
    }
  };

  const statusButtons: { id: ConsoleRecord["status"]; label: string; adminOnly?: boolean }[] = [
    { id: "available", label: "Available" },
    { id: "occupied", label: "Occupied" },
    { id: "maintenance", label: "Maintenance" },
    { id: "disabled", label: "Disabled", adminOnly: true },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {consoles.map((c) => {
          const eff = c.effective_status || c.status;
          return (
            <article key={c.id} className="hud rounded-2xl border border-white/10 bg-coal p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-blood/15 text-blood-400">
                    <Gamepad2 className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-tech text-xs font-bold uppercase tracking-[0.22em] text-white/45">{c.console_type}</p>
                    <h3 className="font-display text-xl font-black uppercase">{c.name}</h3>
                  </div>
                </div>
                <StatusBadge status={eff} />
              </div>

              <p className="mt-4 text-sm text-white/65">{c.description}</p>

              {c.has_active_reservation && (
                <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  Active reservation is currently holding this station.
                </p>
              )}

              {c.maintenance_note && (
                <p className="mt-3 flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
                  <Wrench className="h-3.5 w-3.5 shrink-0" /> {c.maintenance_note}
                </p>
              )}

              {/* Operational Status Switcher */}
              {permissions?.canUpdateConsoleStatus && (
                <div className="mt-5">
                  <p className="font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/45">Update Status</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {statusButtons
                      .filter((b) => !b.adminOnly || isAdmin)
                      .map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => changeStatus(c, btn.id)}
                          className={cn(
                            "rounded-lg border px-2 py-2 font-tech text-xs font-bold uppercase tracking-wider transition-all",
                            c.status === btn.id
                              ? "border-blood bg-blood text-white"
                              : "border-white/10 bg-black/40 text-white/65 hover:border-white/25 hover:text-white",
                          )}
                        >
                          {btn.label}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                <Button size="sm" variant="outline" onClick={() => viewSchedule(c)}>
                  <Calendar /> View Bookings Schedule
                </Button>
                {isAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                    <Edit3 /> Edit Details
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Edit Console Modal */}
      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)} title={`Edit ${editItem?.name || ""}`}>
        <form onSubmit={saveEdit} className="space-y-4 p-6">
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Display Name</label>
            <input
              required
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              className="field mt-2"
            />
          </div>
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              className="field mt-2 resize-none"
            />
          </div>
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Maintenance Note</label>
            <input
              value={editForm.maintenance_note}
              onChange={(e) => setEditForm((f) => ({ ...f, maintenance_note: e.target.value }))}
              placeholder="Optional note when under maintenance..."
              className="field mt-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busyId === editItem?.id}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Console Schedule Modal */}
      <Modal
        open={Boolean(scheduleConsole)}
        onClose={() => setScheduleConsole(null)}
        size="lg"
        title={`${scheduleConsole?.name || ""} — Current & Upcoming Schedule`}
      >
        {scheduleConsole && (
          <div className="space-y-5 p-6">
            <div>
              <h4 className="font-tech text-xs font-bold uppercase tracking-[0.22em] text-blood-400">
                Console Bookings &amp; Walk-ins ({scheduleConsole.schedule.bookings.length})
              </h4>
              {scheduleConsole.schedule.bookings.length === 0 ? (
                <p className="mt-2 text-sm text-white/50">No upcoming individual console bookings.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {scheduleConsole.schedule.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 text-sm">
                      <div>
                        <span className="font-display text-xs font-bold text-blood-300">{b.booking_code}</span>
                        <span className="mx-2 text-white/30">·</span>
                        <span className="font-semibold">{b.customer_name}</span>
                        <p className="text-xs text-white/55">
                          {b.booking_date} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)} ({b.booking_source})
                        </p>
                      </div>
                      <StatusBadge status={b.booking_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-tech text-xs font-bold uppercase tracking-[0.22em] text-sky-400">
                Confirmed Whole-Lounge Reservations ({scheduleConsole.schedule.groupBookings.length})
              </h4>
              {scheduleConsole.schedule.groupBookings.length === 0 ? (
                <p className="mt-2 text-sm text-white/50">No confirmed whole-lounge reservations.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {scheduleConsole.schedule.groupBookings.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-xl border border-sky-500/20 bg-sky-500/[0.06] p-3 text-sm">
                      <div>
                        <span className="font-display text-xs font-bold text-sky-300">{g.booking_code}</span>
                        <span className="mx-2 text-white/30">·</span>
                        <span className="font-semibold">{g.customer_name}</span>
                        <p className="text-xs text-white/55">
                          {g.booking_date} · {g.start_time.slice(0, 5)}–{g.end_time.slice(0, 5)} (Whole Lounge)
                        </p>
                      </div>
                      <StatusBadge status={g.booking_status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
