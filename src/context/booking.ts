import { createContext, useContext } from "react";
import type { BookingPrefill } from "@/data/site";

export interface BookingContextValue {
  openBooking: (prefill?: BookingPrefill) => void;
  openAvailability: () => void;
}

export const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingContext.Provider>");
  return ctx;
}
