import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="md">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blood/15 text-blood-400">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <p className="text-sm leading-relaxed text-white/75">{message}</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? "primary" : "outline"}
            size="sm"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
