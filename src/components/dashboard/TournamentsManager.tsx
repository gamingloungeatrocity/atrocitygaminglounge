import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Award, Download, Edit3, Plus, Search, Trash2, Trophy, Users } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/auth";
import { api, ApiClientError, type TournamentRecord, type TournamentRegistrationRecord } from "@/lib/api";
import { EmptyState, PanelLoader, StatusBadge } from "./StatusBadge";
import { compressImageIfNeeded } from "@/utils/compressImage";

const TOURNAMENT_COVER_WIDTH = 480;
const TOURNAMENT_COVER_HEIGHT = 720;
const MAX_IMAGE_SIZE = 7 * 1024 * 1024;

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getTournamentImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("The selected file is not a valid image.")); };
    image.src = url;
  });
}

const EMPTY_FORM = {
  title: "",
  game_name: "FC27",
  description: "",
  tournament_date: "",
  start_time: "16:00",
  registration_deadline: "",
  entry_fee: 100,
  max_participants: 16,
  format: "Knockout bracket",
  rules: "",
  status: "registration_open" as TournamentRecord["status"],
  is_published: true,
  winner_name: "",
  runner_up_name: "",
  results_notes: "",
  cover_image_url: null as string | null,
  cover_image_path: null as string | null,
  cover_fallback_text: "",
};

export function TournamentsManager({ onChanged }: { onChanged?: () => void }) {
  const { profile, permissions } = useAuth();
  const toast = useToast();
  const isAdmin = profile?.role === "admin";
  const canEdit = Boolean(permissions?.canManageTournaments);

  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TournamentRecord | null>(null);
  const [coverImageInfo, setCoverImageInfo] = useState<{ width: number; height: number; size: number } | null>(null);
  const [coverImageWarning, setCoverImageWarning] = useState<{ width: number; height: number } | null>(null);

  // Registrations drawer/modal
  const [regTournament, setRegTournament] = useState<TournamentRecord | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistrationRecord[]>([]);
  const [regSearch, setRegSearch] = useState("");
  const [regStatusFilter, setRegStatusFilter] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const [busy, setBusy] = useState(false);

  const loadTournaments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.staff.getTournaments();
      setTournaments(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load tournaments.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingId(null);
    setCoverFile(null);
    setCoverImageInfo(null);
    setCoverImageWarning(null);
    setRemoveCover(false);
    setForm({
      ...EMPTY_FORM,
      tournament_date: today,
      registration_deadline: `${today}T15:00`,
    });
    setEditorOpen(true);
  };

  const openEdit = (t: TournamentRecord) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      game_name: t.game_name,
      description: t.description || "",
      tournament_date: t.tournament_date,
      start_time: t.start_time.slice(0, 5),
      registration_deadline: t.registration_deadline ? t.registration_deadline.slice(0, 16) : "",
      entry_fee: Number(t.entry_fee),
      max_participants: t.max_participants,
      format: t.format,
      rules: t.rules || "",
      status: t.status,
      is_published: t.is_published,
      winner_name: t.winner_name || "",
      runner_up_name: t.runner_up_name || "",
      results_notes: t.results_notes || "",
      cover_image_url: t.cover_image_url || null,
      cover_image_path: t.cover_image_path || null,
      cover_fallback_text: t.cover_fallback_text || "",
    });
    setCoverFile(null);
    setCoverImageInfo(null);
    setCoverImageWarning(null);
    setRemoveCover(false);
    setEditorOpen(true);
  };

  const handleSave = async (e: FormEvent, bypassImageWarning = false) => {
    e.preventDefault();
    setBusy(true);
    try {
      let cover = {};
      if (coverFile) {
        const dimensions = coverImageInfo || await getTournamentImageDimensions(coverFile);
        if (dimensions.width !== TOURNAMENT_COVER_WIDTH || dimensions.height !== TOURNAMENT_COVER_HEIGHT) {
          if (!bypassImageWarning) {
            setCoverImageWarning(dimensions);
            setBusy(false);
            return;
          }
        }
        const uploadFile = await compressImageIfNeeded(coverFile, MAX_IMAGE_SIZE);
        const uploaded = await api.admin.uploadMedia(uploadFile, "tournaments");
        cover = { cover_image_url: uploaded.url, cover_image_path: uploaded.path };
      } else if (removeCover) {
        cover = { cover_image_url: null, cover_image_path: null };
      }
      const payload = {
        ...form,
        ...cover,
        entry_fee: Number(form.entry_fee),
        max_participants: Number(form.max_participants),
        registration_deadline: form.registration_deadline.includes("+") || form.registration_deadline.endsWith("Z")
          ? form.registration_deadline
          : `${form.registration_deadline}:00+05:30`,
        winner_name: form.winner_name || null,
        runner_up_name: form.runner_up_name || null,
        results_notes: form.results_notes || null,
      };
      if (editingId) {
        await api.admin.updateTournament(editingId, payload);
        toast.success("Tournament updated.");
      } else {
        await api.admin.createTournament(payload);
        toast.success("Tournament created.");
      }
      setEditorOpen(false);
      loadTournaments();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to save tournament.");
    } finally {
      setBusy(false);
    }
  };

  const handleQuickStatus = async (t: TournamentRecord, status: string) => {
    try {
      await api.admin.updateTournamentStatus(t.id, status);
      toast.success(`${t.title} marked ${status.replace(/_/g, " ")}.`);
      loadTournaments();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update tournament status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.admin.deleteTournament(deleteTarget.id);
      toast.success(`Deleted tournament "${deleteTarget.title}".`);
      setDeleteTarget(null);
      loadTournaments();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete tournament.");
    } finally {
      setBusy(false);
    }
  };

  const loadRegistrations = useCallback(
    async (t: TournamentRecord, searchVal = regSearch, statusVal = regStatusFilter) => {
      setRegLoading(true);
      try {
        const list = await api.staff.getTournamentRegistrations(t.id, {
          search: searchVal,
          registration_status: statusVal,
        });
        setRegistrations(list);
      } catch (err) {
        toast.error(err instanceof ApiClientError ? err.message : "Failed to load participants.");
      } finally {
        setRegLoading(false);
      }
    },
    [regSearch, regStatusFilter, toast],
  );

  const openRegistrations = (t: TournamentRecord) => {
    setRegTournament(t);
    setRegSearch("");
    setRegStatusFilter("");
    loadRegistrations(t, "", "");
  };

  const updateReg = async (reg: TournamentRegistrationRecord, patch: { registration_status?: string; payment_status?: string }) => {
    if (!regTournament) return;
    try {
      await api.staff.updateTournamentRegistration(regTournament.id, reg.id, patch);
      toast.success("Participant registration updated.");
      loadRegistrations(regTournament);
      loadTournaments();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update registration.");
    }
  };

  const exportCsv = async () => {
    if (!regTournament) return;
    try {
      const csv = await api.admin.exportTournamentRegistrationsCsv(regTournament.id);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${regTournament.slug || "tournament"}-participants.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to export participant list.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          {tournaments.length} tournament(s) configured
        </p>
        {canEdit && (
          <Button size="sm" onClick={openCreate}>
            <Plus /> Create Tournament
          </Button>
        )}
      </div>

      {loading ? (
        <PanelLoader label="Loading tournaments..." />
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="No Tournaments Yet"
          subtitle="Create a tournament to publish schedules and accept participant registrations."
          action={
            canEdit && (
              <Button size="sm" onClick={openCreate}>
                <Plus /> Create Tournament
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {tournaments.map((t) => (
            <article key={t.id} className="hud rounded-2xl border border-white/10 bg-coal p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="font-tech text-xs font-bold uppercase tracking-[0.22em] text-blood-400">
                    {t.game_name} · {t.format}
                  </span>
                  <h3 className="mt-1 font-display text-xl font-black uppercase">{t.title}</h3>
                  <p className="mt-1 text-xs text-white/55">
                    {t.tournament_date} at {t.start_time.slice(0, 5)} · {t.is_published ? "Published" : "Draft"}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-sm">
                <div>
                  <p className="text-[11px] uppercase text-white/45">Entry Fee</p>
                  <p className="font-display font-bold">
                    <Rupee />
                    {Number(t.entry_fee)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-white/45">Participants</p>
                  <p className="font-display font-bold">
                    {t.registration_count ?? 0} / {t.max_participants}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-white/45">Winner</p>
                  <p className="truncate font-semibold text-amber-300">{t.winner_name || "TBD"}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
                <Button size="sm" variant="outline" onClick={() => openRegistrations(t)}>
                  <Users /> Participants ({t.registration_count ?? 0})
                </Button>

                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Update status for ${t.title}`}
                      value={t.status}
                      onChange={(e) => handleQuickStatus(t, e.target.value)}
                      className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1.5 font-tech text-xs font-bold uppercase text-white"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="registration_open">Registration Open</option>
                      <option value="registration_closed">Registration Closed</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      title="Edit Tournament / Results"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        title="Delete Tournament"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-blood/35 bg-blood/10 text-blood-300 hover:bg-blood/25"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit / Results Modal */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={editingId ? "Edit Tournament & Results" : "Create Tournament"}
      >
        <form onSubmit={handleSave} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Tournament Name</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Cover Image <span className="text-white/40">(recommended 480×720 px, maximum 7 MB; larger files are compressed)</span></label>
              <input type="file" accept="image/*" onChange={async (e) => { const selected = e.target.files?.[0] || null; setCoverFile(selected); setRemoveCover(false); if (!selected) { setCoverImageInfo(null); return; } try { const dimensions = await getTournamentImageDimensions(selected); setCoverImageInfo({ ...dimensions, size: selected.size }); } catch (err) { setCoverImageInfo(null); toast.error(err instanceof Error ? err.message : "The selected file is not a valid image."); } }} className="field mt-2" />
              {coverFile && coverImageInfo && <p className="mt-2 text-xs text-white/60">Selected: {coverFile.name} · {coverImageInfo.width}×{coverImageInfo.height}px · {formatFileSize(coverImageInfo.size)}{coverImageInfo.size > MAX_IMAGE_SIZE ? " · Will be compressed before upload" : ""}</p>}
              <input
                value={form.cover_fallback_text}
                onChange={(e) => setForm({ ...form, cover_fallback_text: e.target.value })}
                placeholder="Fallback text shown when no image is available"
                className="field mt-2"
              />
              {form.cover_image_url && (
                <label className="mt-2 flex items-center gap-2 text-xs text-white/60">
                  <input type="checkbox" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} />
                  Remove current cover image
                </label>
              )}
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Game Name</label>
              <input required value={form.game_name} onChange={(e) => setForm({ ...form, game_name: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Tournament Date</label>
              <input type="date" required value={form.tournament_date} onChange={(e) => setForm({ ...form, tournament_date: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Start Time</label>
              <input type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Registration Deadline</label>
              <input
                type="datetime-local"
                required
                value={form.registration_deadline}
                onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })}
                className="field mt-2"
              />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Format</label>
              <input required value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Entry Fee (₹)</label>
              <input type="number" min={0} required value={form.entry_fee} onChange={(e) => setForm({ ...form, entry_fee: Number(e.target.value) })} className="field mt-2" />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Max Participants</label>
              <input type="number" min={2} required value={form.max_participants} onChange={(e) => setForm({ ...form, max_participants: Number(e.target.value) })} className="field mt-2" />
            </div>
          </div>

          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="field mt-2 resize-none" />
          </div>
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Rules</label>
            <textarea rows={2} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} className="field mt-2 resize-none" />
          </div>

          {editingId && (
            <div className="grid gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 font-tech text-xs font-bold uppercase tracking-[0.2em] text-amber-300 sm:col-span-2">
                <Award className="h-4 w-4" /> Results &amp; Winners
              </div>
              <div>
                <label className="block text-xs text-white/60">Winner Name</label>
                <input value={form.winner_name} onChange={(e) => setForm({ ...form, winner_name: e.target.value })} className="field mt-1" />
              </div>
              <div>
                <label className="block text-xs text-white/60">Runner-up Name</label>
                <input value={form.runner_up_name} onChange={(e) => setForm({ ...form, runner_up_name: e.target.value })} className="field mt-1" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="h-4 w-4 accent-blood"
              />
              Publish on public website
            </label>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Saving..." : "Save Tournament"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(coverImageWarning)}
        title="Image dimensions differ"
        message={coverImageWarning ? `This image is ${coverImageWarning.width}×${coverImageWarning.height}px. The recommended tournament cover size is ${TOURNAMENT_COVER_WIDTH}×${TOURNAMENT_COVER_HEIGHT}px. You can continue with this image or cancel and choose another one.` : ""}
        confirmLabel="Continue upload"
        danger={false}
        busy={busy}
        onConfirm={() => { setCoverImageWarning(null); void handleSave({ preventDefault() {} } as FormEvent, true); }}
        onCancel={() => setCoverImageWarning(null)}
      />

      {/* Participant Registrations Modal */}
      <Modal
        open={Boolean(regTournament)}
        onClose={() => setRegTournament(null)}
        size="lg"
        title={regTournament ? `${regTournament.title} — Participants` : "Participants"}
        subtitle={regTournament ? `Capacity: ${regTournament.registration_count ?? 0}/${regTournament.max_participants} · Entry: ₹${regTournament.entry_fee}` : ""}
      >
        {regTournament && (
          <div className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap gap-2">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    value={regSearch}
                    onChange={(e) => {
                      setRegSearch(e.target.value);
                      loadRegistrations(regTournament, e.target.value, regStatusFilter);
                    }}
                    placeholder="Search participant, phone, gamer tag..."
                    className="field pl-9 text-sm"
                  />
                </div>
                <select
                  value={regStatusFilter}
                  onChange={(e) => {
                    setRegStatusFilter(e.target.value);
                    loadRegistrations(regTournament, regSearch, e.target.value);
                  }}
                  className="field w-44 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={exportCsv}>
                  <Download /> Export CSV
                </Button>
              )}
            </div>

            {regLoading ? (
              <PanelLoader label="Loading participants..." />
            ) : registrations.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title="No Registrations Found" />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-white/[0.03] font-tech text-xs uppercase text-white/50">
                    <tr>
                      <th className="px-3 py-2.5">Code</th>
                      <th className="px-3 py-2.5">Participant</th>
                      <th className="px-3 py-2.5">Gamer Tag</th>
                      <th className="px-3 py-2.5">Payment</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {registrations.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2.5 font-display text-xs text-blood-300">{r.registration_code}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-semibold">{r.participant_name}</p>
                          <p className="text-xs text-white/50">+91 {r.phone}</p>
                        </td>
                        <td className="px-3 py-2.5 text-white/75">{r.gamer_tag || "—"}</td>
                        <td className="px-3 py-2.5">
                          <select
                            value={r.payment_status}
                            onChange={(e) => updateReg(r, { payment_status: e.target.value })}
                            className="rounded border border-white/15 bg-black/60 px-2 py-1 text-xs uppercase"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={r.registration_status}
                            onChange={(e) => updateReg(r, { registration_status: e.target.value })}
                            className="rounded border border-white/15 bg-black/60 px-2 py-1 text-xs uppercase"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Tournament"
        message={`Delete "${deleteTarget?.title}" and all its registrations permanently?`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
