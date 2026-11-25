export type OnlineBookingType = "console" | "group" | "tournament";
export type OnlinePaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface SavedBookingConfirmation {
  whatsappUrl: string;
  bookingCode: string;
  recordId: string;
  bookingType: OnlineBookingType;
  totalAmount: number;
  paymentStatus: OnlinePaymentStatus;
  customerPhone: string;
  summary: [string, string][];
  orderId?: string;
}

const STORAGE_KEY = "atrocity_booking_confirmation";

export function loadBookingConfirmation(): SavedBookingConfirmation | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as SavedBookingConfirmation;
    if (
      typeof value.recordId !== "string" ||
      typeof value.bookingCode !== "string" ||
      typeof value.customerPhone !== "string" ||
      typeof value.whatsappUrl !== "string" ||
      !Number.isFinite(value.totalAmount) ||
      !["console", "group", "tournament"].includes(value.bookingType) ||
      !["pending", "paid", "failed", "refunded"].includes(value.paymentStatus)
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const whatsappUrl = new URL(value.whatsappUrl);
    if (whatsappUrl.protocol !== "https:" || whatsappUrl.hostname !== "wa.me") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function saveBookingConfirmation(value: SavedBookingConfirmation) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The booking remains usable if browser storage is unavailable.
  }
}

export function clearBookingConfirmation() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The current confirmation remains available until the dialog closes.
  }
}
