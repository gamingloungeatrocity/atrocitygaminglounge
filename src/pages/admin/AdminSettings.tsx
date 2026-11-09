import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Save, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type LoungeSettings } from "@/lib/api";
import { PanelLoader } from "@/components/dashboard/StatusBadge";

const TOGGLES: { key: keyof LoungeSettings; title: string; desc: string }[] = [
  {
    key: "staff_can_approve_group_bookings",
    title: "Staff Can Approve / Reject Whole Lounge Bookings",
    desc: "When disabled, only administrators can approve or reject whole-lounge reservations.",
  },
  {
    key: "staff_can_cancel_bookings",
    title: "Staff Can Cancel Confirmed Bookings",
    desc: "Allows staff members to cancel bookings when customers request cancellation.",
  },
  {
    key: "staff_can_update_console_status",
    title: "Staff Can Update Operational Console Status",
    desc: "Allows staff to toggle consoles between Available, Occupied, and Maintenance.",
  },
  {
    key: "staff_can_manage_tournaments",
    title: "Staff Can Create & Edit Tournaments",
    desc: "Allows staff to modify tournament configurations (disabled by default).",
  },
  {
    key: "tournament_manual_approval",
    title: "Require Manual Approval for Tournament Registrations",
    desc: "New tournament sign-ups start as pending until approved by Admin/Staff.",
  },
  {
    key: "online_booking_auto_reserve_lounge",
    title: "Auto-Reserve Entire Lounge on Individual Booking",
    desc: "Keep disabled in normal operations so PS4 and PS4 Pro can be booked independently.",
  },
];

export function AdminSettings() {
  const toast = useToast();
  const { refresh } = useAuth();
  const [settings, setSettings] = useState<LoungeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getSettings();
      setSettings(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    try {
      const updated = await api.admin.updateSettings({
        lounge_name: settings.lounge_name,
        opening_time: settings.opening_time.slice(0, 5),
        closing_time: settings.closing_time.slice(0, 5),
        staff_can_approve_group_bookings: settings.staff_can_approve_group_bookings,
        staff_can_cancel_bookings: settings.staff_can_cancel_bookings,
        staff_can_update_console_status: settings.staff_can_update_console_status,
        staff_can_manage_tournaments: settings.staff_can_manage_tournaments,
        tournament_manual_approval: settings.tournament_manual_approval,
        online_booking_auto_reserve_lounge: settings.online_booking_auto_reserve_lounge,
      });
      setSettings(updated);
      await refresh();
      toast.success("Lounge settings & staff permissions updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save settings.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !settings) return <PanelLoader label="Loading lounge settings..." />;

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      <div className="hud rounded-2xl border border-white/10 bg-coal p-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-5 w-5 text-blood-400" />
          <h3 className="font-display text-lg font-black uppercase">Operating Hours &amp; Lounge Info</h3>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Lounge Name</label>
            <input
              value={settings.lounge_name}
              onChange={(e) => setSettings({ ...settings, lounge_name: e.target.value })}
              className="field mt-2"
            />
          </div>
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Opening Time</label>
            <input
              type="time"
              value={settings.opening_time.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, opening_time: e.target.value })}
              className="field mt-2"
            />
          </div>
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Closing Time</label>
            <input
              type="time"
              value={settings.closing_time.slice(0, 5)}
              onChange={(e) => setSettings({ ...settings, closing_time: e.target.value })}
              className="field mt-2"
            />
          </div>
        </div>
      </div>

      <div className="hud rounded-2xl border border-white/10 bg-coal p-6">
        <h3 className="font-display text-lg font-black uppercase">Role Permissions &amp; Booking Rules</h3>
        <div className="mt-5 divide-y divide-white/[0.06]">
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex cursor-pointer items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="font-tech text-base font-bold uppercase text-white">{t.title}</p>
                <p className="mt-0.5 text-sm text-white/55">{t.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings[t.key])}
                onChange={(e) => setSettings({ ...settings, [t.key]: e.target.checked })}
                className="mt-1 h-5 w-5 shrink-0 accent-blood"
              />
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" size="lg" disabled={busy}>
        <Save /> {busy ? "Saving Settings..." : "Save Configuration"}
      </Button>
    </form>
  );
}
