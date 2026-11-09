import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Activity, Edit3, KeyRound, Plus, Power, UserCheck } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, type AuditLogRecord, type StaffProfile, type StaffRole } from "@/lib/api";
import { EmptyState, PanelLoader, StatusBadge } from "@/components/dashboard/StatusBadge";

export function AdminStaff() {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", phone: "", password: "", role: "staff" as StaffRole });

  const [editItem, setEditItem] = useState<StaffProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", role: "staff" as StaffRole });

  const [resetItem, setResetItem] = useState<StaffProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);

  const [activityStaff, setActivityStaff] = useState<StaffProfile | null>(null);
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getStaff();
      setStaff(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load staff accounts.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.createStaff(createForm);
      toast.success(`Created ${createForm.role} account for ${createForm.email}.`);
      setCreateOpen(false);
      setCreateForm({ full_name: "", email: "", phone: "", password: "", role: "staff" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create staff account.");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setBusy(true);
    try {
      await api.admin.updateStaff(editItem.id, editForm);
      toast.success("Staff details updated.");
      setEditItem(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update staff account.");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (member: StaffProfile) => {
    try {
      await api.admin.toggleStaffStatus(member.id, !member.is_active);
      toast.success(`${member.full_name} ${member.is_active ? "deactivated" : "activated"}.`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not change account status.");
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetItem) return;
    setBusy(true);
    try {
      const res = await api.admin.resetStaffPassword(resetItem.id, newPassword.trim() || undefined);
      if (res.recoveryLink) {
        setRecoveryLink(res.recoveryLink);
        toast.info("Recovery link generated securely.");
      } else {
        toast.success(`Credentials updated for ${resetItem.email}.`);
        setResetItem(null);
        setNewPassword("");
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reset credentials.");
    } finally {
      setBusy(false);
    }
  };

  const viewActivity = async (member: StaffProfile) => {
    setActivityStaff(member);
    try {
      const list = await api.admin.getStaffActivity(member.id);
      setLogs(list);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to fetch activity.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">Manage administrator and staff access via Supabase Auth + RBAC.</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> Add Staff Account
        </Button>
      </div>

      {loading ? (
        <PanelLoader label="Loading staff directory..." />
      ) : staff.length === 0 ? (
        <EmptyState icon={<UserCheck className="h-6 w-6" />} title="No Staff Profiles" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-coal">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-white/[0.08] bg-white/[0.03] font-tech text-xs uppercase tracking-[0.16em] text-white/50">
              <tr>
                <th className="px-4 py-3.5">Staff Member</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {staff.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-white">{m.full_name}</p>
                    <p className="text-xs text-white/50">{m.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={m.role} />
                  </td>
                  <td className="px-4 py-3.5 text-white/75">{m.phone || "—"}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={m.is_active ? "confirmed" : "disabled"} label={m.is_active ? "Active" : "Deactivated"} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => viewActivity(m)}
                        title="View Activity Logs"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                      >
                        <Activity className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditItem(m);
                          setEditForm({ full_name: m.full_name, phone: m.phone || "", role: m.role });
                        }}
                        title="Edit Details"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetItem(m);
                          setNewPassword("");
                          setRecoveryLink(null);
                        }}
                        title="Reset Credentials"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        title={m.is_active ? "Deactivate Account" : "Activate Account"}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-blood-300"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Staff */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Staff Account">
        <form onSubmit={handleCreate} className="space-y-4 p-6">
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Full Name</label>
            <input required minLength={2} value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} className="field mt-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Email</label>
              <input type="email" required value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Phone</label>
              <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="field mt-2" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Initial Password</label>
              <input type="password" required minLength={8} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Role</label>
              <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as StaffRole })} className="field mt-2">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Staff */}
      <Modal open={Boolean(editItem)} onClose={() => setEditItem(null)} title={`Edit ${editItem?.full_name || ""}`}>
        <form onSubmit={handleEdit} className="space-y-4 p-6">
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Full Name</label>
            <input required value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="field mt-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Phone</label>
              <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Role</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as StaffRole })} className="field mt-2">
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Credentials */}
      <Modal
        open={Boolean(resetItem)}
        onClose={() => setResetItem(null)}
        title={`Reset Credentials — ${resetItem?.full_name || ""}`}
        subtitle="Set a new temporary password or leave blank to generate a one-time Supabase recovery link."
      >
        <form onSubmit={handleResetPassword} className="space-y-4 p-6">
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">
              New Temporary Password (Optional, min 8 chars)
            </label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to generate recovery link"
              className="field mt-2"
            />
          </div>
          {recoveryLink && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs break-all text-emerald-200">
              <strong className="block mb-1">Secure Recovery Link:</strong>
              {recoveryLink}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setResetItem(null)}>
              Close
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Processing..." : newPassword ? "Update Password" : "Generate Recovery Link"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Staff Activity Audit Logs */}
      <Modal
        open={Boolean(activityStaff)}
        onClose={() => setActivityStaff(null)}
        size="lg"
        title={`Activity Log — ${activityStaff?.full_name || ""}`}
      >
        <div className="space-y-3 p-6">
          {logs.length === 0 ? (
            <p className="text-sm text-white/55">No recorded activity yet for this account.</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="rounded-xl border border-white/10 bg-black/40 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold text-blood-300">{l.action}</span>
                  <span className="text-white/45">{new Date(l.created_at).toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-1 text-white/65">
                  Entity: {l.entity_type} {l.entity_id ? `(${l.entity_id})` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
