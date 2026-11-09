import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Gamepad2, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ApiClientError, api, type GameRecord } from "@/lib/api";
import { EmptyState, PanelLoader } from "@/components/dashboard/StatusBadge";
import { compressImageIfNeeded } from "@/utils/compressImage";

const GAME_COVER_WIDTH = 480;
const GAME_COVER_HEIGHT = 640;
const MAX_IMAGE_SIZE = 7 * 1024 * 1024;

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The selected file is not a valid image."));
    };
    image.src = url;
  });
}

const EMPTY = {
  title: "", studio: "", tag: "Premium Title", genres: "", modes: "", blurb: "",
  is_published: true, sort_order: 0, cover_image_url: null as string | null, cover_image_path: null as string | null,
};

export function AdminGames({ onChanged }: { onChanged?: () => void }) {
  const toast = useToast();
  const [items, setItems] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameRecord | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; size: number } | null>(null);
  const [imageWarning, setImageWarning] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await api.admin.getGames()); }
    catch (err) { toast.error(err instanceof ApiClientError ? err.message : "Failed to load games."); }
    finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const create = () => { setEditingId(null); setForm(EMPTY); setFile(null); setImageInfo(null); setImageWarning(null); setRemoveCover(false); setOpen(true); };
  const edit = (game: GameRecord) => {
    setEditingId(game.id);
    setForm({ title: game.title, studio: game.studio, tag: game.tag, genres: game.genres.join(", "), modes: game.modes.join(", "), blurb: game.blurb, is_published: game.is_published, sort_order: game.sort_order, cover_image_url: game.cover_image_url || null, cover_image_path: game.cover_image_path || null });
    setFile(null); setImageInfo(null); setImageWarning(null); setRemoveCover(false); setOpen(true);
  };
  const save = async (event: FormEvent, bypassImageWarning = false) => {
    event.preventDefault(); setBusy(true);
    try {
      let cover = {};
      if (file) {
        const dimensions = imageInfo || await getImageDimensions(file);
        if (dimensions.width !== GAME_COVER_WIDTH || dimensions.height !== GAME_COVER_HEIGHT) {
          if (!bypassImageWarning) {
            setImageWarning(dimensions);
            setBusy(false);
            return;
          }
        }
        const uploadFile = await compressImageIfNeeded(file, MAX_IMAGE_SIZE);
        const uploaded = await api.admin.uploadMedia(uploadFile, "games");
        cover = { cover_image_url: uploaded.url, cover_image_path: uploaded.path };
      }
      else if (removeCover) cover = { cover_image_url: null, cover_image_path: null };
      const payload = { ...form, ...cover, genres: form.genres.split(",").map((v) => v.trim()).filter(Boolean), modes: form.modes.split(",").map((v) => v.trim()).filter(Boolean), sort_order: Number(form.sort_order) };
      if (editingId) await api.admin.updateGame(editingId, payload);
      else await api.admin.createGame(payload);
      toast.success(editingId ? "Game updated." : "Game created."); setOpen(false); await load(); onChanged?.();
    } catch (err) { toast.error(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to save game."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return; setBusy(true);
    try { await api.admin.deleteGame(deleteTarget.id); toast.success("Game deleted."); setDeleteTarget(null); await load(); onChanged?.(); }
    catch (err) { toast.error(err instanceof ApiClientError ? err.message : "Failed to delete game."); }
    finally { setBusy(false); }
  };

  if (loading) return <PanelLoader label="Loading game library..." />;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><p className="text-sm text-white/60">{items.length} game(s) configured</p><Button size="sm" onClick={create}><Plus /> Add Game</Button></div>
      {items.length === 0 ? <EmptyState icon={<Gamepad2 className="h-6 w-6" />} title="No games configured" subtitle="Add premium games to publish them on the website." action={<Button size="sm" onClick={create}><Plus /> Add Game</Button>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((game) => (
            <article key={game.id} className="overflow-hidden rounded-2xl border border-white/10 bg-coal">
              <div className="aspect-[3/4] bg-black/50">{game.cover_image_url ? <img src={game.cover_image_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-6 text-center font-display text-xl font-black uppercase text-white/40">{game.title}</div>}</div>
              <div className="space-y-2 p-4"><p className="font-display font-black uppercase">{game.title}</p><p className="text-xs text-white/55">{game.studio} · {game.tag}</p><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => edit(game)}><Edit3 /></Button><Button size="sm" variant="outline" onClick={() => setDeleteTarget(game)}><Trash2 /></Button></div></div>
            </article>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit Game" : "Add Premium Game"}>
        <form onSubmit={save} className="space-y-4 p-6">
          <label className="block text-sm text-white/70">Game title<input required placeholder="Enter game title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field mt-1" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-white/70">Studio<input placeholder="Enter studio/developer" value={form.studio} onChange={(e) => setForm({ ...form, studio: e.target.value })} className="field mt-1" /></label><label className="block text-sm text-white/70">Category tag<input placeholder="Example: Open World" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} className="field mt-1" /></label></div>
          <label className="block text-sm text-white/70">Genres<input placeholder="Example: Open World, Action" value={form.genres} onChange={(e) => setForm({ ...form, genres: e.target.value })} className="field mt-1" /></label>
          <label className="block text-sm text-white/70">Game modes<input placeholder="Example: Story, Online" value={form.modes} onChange={(e) => setForm({ ...form, modes: e.target.value })} className="field mt-1" /></label>
          <label className="block text-sm text-white/70">Description<textarea rows={3} placeholder="Describe this game" value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} className="field mt-1 resize-none" /></label>
          <label className="block text-sm text-white/70">Cover image <span className="text-white/45">(recommended 480×640 px, maximum 7 MB; larger files are compressed)</span><input type="file" accept="image/*" onChange={async (e) => { const selected = e.target.files?.[0] || null; setFile(selected); setRemoveCover(false); if (!selected) { setImageInfo(null); return; } try { const dimensions = await getImageDimensions(selected); setImageInfo({ ...dimensions, size: selected.size }); } catch (err) { setImageInfo(null); toast.error(err instanceof Error ? err.message : "The selected file is not a valid image."); } }} className="field mt-1" /></label>
          {file && imageInfo && <p className="text-xs text-white/60">Selected: {file.name} · {imageInfo.width}×{imageInfo.height}px · {formatFileSize(imageInfo.size)}{imageInfo.size > MAX_IMAGE_SIZE ? " · Will be compressed before upload" : ""}</p>}
          {form.cover_image_url && <label className="flex items-center gap-2 text-xs text-white/60"><input type="checkbox" checked={removeCover} onChange={(e) => setRemoveCover(e.target.checked)} /> Remove current cover image</label>}
          <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published on website</label>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Saving..." : "Save Game"}</Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(imageWarning)}
        title="Image dimensions differ"
        message={imageWarning ? `This image is ${imageWarning.width}×${imageWarning.height}px. The recommended game cover size is ${GAME_COVER_WIDTH}×${GAME_COVER_HEIGHT}px. You can continue with this image or cancel and choose another one.` : ""}
        confirmLabel="Continue upload"
        danger={false}
        busy={busy}
        onConfirm={() => { setImageWarning(null); void save({ preventDefault() {} } as FormEvent, true); }}
        onCancel={() => setImageWarning(null)}
      />
      <ConfirmDialog open={Boolean(deleteTarget)} title="Delete Game" message={`Delete "${deleteTarget?.title}" and its cover image?`} confirmLabel="Delete" onConfirm={remove} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}
