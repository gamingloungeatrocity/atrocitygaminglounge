import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, Tag, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Rupee } from "@/components/ui/Rupee";
import { useToast } from "@/components/ui/Toast";
import { api, ApiClientError, type PricingRecord } from "@/lib/api";
import { PanelLoader, StatusBadge } from "@/components/dashboard/StatusBadge";

const CATEGORY_TITLES: Record<PricingRecord["category"], string> = {
  ps4: "PlayStation 4 Pricing",
  ps4pro: "PlayStation 4 Pro Pricing",
  whole_lounge: "Whole Lounge Pricing",
  tournament: "Tournament Entry Fee",
};

const EMPTY_PLAN = {
  id: "" as string | undefined,
  category: "ps4" as PricingRecord["category"],
  label: "",
  duration_minutes: 60,
  bonus_minutes: 0,
  price: 70,
  is_active: true,
  sort_order: 1,
};

export function AdminPricing({ onChanged }: { onChanged?: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState<PricingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [deleteTarget, setDeleteTarget] = useState<PricingRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.getPricing();
      setItems(data);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load pricing.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = (category: PricingRecord["category"]) => {
    setForm({ ...EMPTY_PLAN, id: undefined, category });
    setEditorOpen(true);
  };

  const openEdit = (p: PricingRecord) => {
    setForm({
      id: p.id,
      category: p.category,
      label: p.label,
      duration_minutes: p.duration_minutes,
      bonus_minutes: p.bonus_minutes,
      price: Number(p.price),
      is_active: p.is_active,
      sort_order: p.sort_order,
    });
    setEditorOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.upsertPricing({
        ...(form.id ? { id: form.id } : {}),
        category: form.category,
        label: form.label,
        duration_minutes: Number(form.duration_minutes),
        bonus_minutes: Number(form.bonus_minutes),
        price: Number(form.price),
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
      });
      toast.success("Pricing saved. Future bookings use the new rate; past bookings remain unchanged.");
      setEditorOpen(false);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save pricing rule.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.admin.deletePricing(deleteTarget.id);
      toast.success("Pricing rule deleted.");
      setDeleteTarget(null);
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete pricing rule.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PanelLoader label="Loading pricing matrix..." />;

  const categories: PricingRecord["category"][] = ["ps4", "ps4pro", "whole_lounge", "tournament"];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-coal p-4 text-sm text-white/65">
        Configure prices per duration directly in PostgreSQL without editing code. Previously confirmed bookings retain their original locked price.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {categories.map((cat) => {
          const rows = items.filter((p) => p.category === cat);
          return (
            <section key={cat} className="hud rounded-2xl border border-white/10 bg-coal p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Tag className="h-4 w-4 text-blood-400" />
                  <h3 className="font-display text-base font-black uppercase">{CATEGORY_TITLES[cat]}</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => openNew(cat)}>
                  <Plus /> Add Tier
                </Button>
              </div>

              <div className="mt-4 space-y-2.5">
                {rows.length === 0 ? (
                  <p className="text-sm text-white/45">No pricing tiers configured.</p>
                ) : (
                  rows.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/40 p-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-tech text-sm font-bold uppercase text-white">{p.label}</span>
                          <StatusBadge status={p.is_active ? "confirmed" : "disabled"} label={p.is_active ? "Active" : "Inactive"} />
                        </div>
                        <p className="mt-0.5 text-xs text-white/50">
                          {p.duration_minutes > 0 ? `${p.duration_minutes} mins` : "Flat fee"}
                          {p.bonus_minutes > 0 ? ` · +${p.bonus_minutes}m bonus` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-lg font-black text-blood-300">
                          <Rupee />
                          {Number(p.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          title="Edit"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/70 hover:border-blood hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          title="Delete"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-blood/35 bg-blood/10 text-blood-300 hover:bg-blood/25"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={form.id ? "Edit Pricing Tier" : "Add Pricing Tier"}>
        <form onSubmit={handleSave} className="space-y-4 p-6">
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as PricingRecord["category"] })}
              className="field mt-2"
            >
              <option value="ps4">PlayStation 4</option>
              <option value="ps4pro">PlayStation 4 Pro</option>
              <option value="whole_lounge">Whole Lounge Booking</option>
              <option value="tournament">Tournament Entry Fee</option>
            </select>
          </div>
          <div>
            <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Display Label</label>
            <input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="e.g. 2 Hours, 3 Hours Package"
              className="field mt-2"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Duration (min)</label>
              <input
                type="number"
                min={0}
                required
                value={form.duration_minutes}
                onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                className="field mt-2"
              />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Bonus (min)</label>
              <input
                type="number"
                min={0}
                required
                value={form.bonus_minutes}
                onChange={(e) => setForm({ ...form, bonus_minutes: Number(e.target.value) })}
                className="field mt-2"
              />
            </div>
            <div>
              <label className="block font-tech text-xs font-bold uppercase tracking-[0.2em] text-white/55">Price (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="field mt-2"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 accent-blood"
            />
            Active on public website &amp; walk-in calculator
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving..." : "Save Pricing"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Pricing Tier"
        message={`Delete "${deleteTarget?.label}" (₹${deleteTarget?.price})? Existing bookings remain unaffected.`}
        confirmLabel="Delete"
        busy={busy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
