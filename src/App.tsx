import { useCallback, useMemo, useState } from "react";
import type { BookingPrefill } from "@/data/site";
import { AuthProvider } from "@/context/auth";
import { BookingContext } from "@/context/booking";
import { PublicDataProvider } from "@/context/publicData";
import { useAppRoute } from "@/lib/router";
import { ToastProvider } from "@/components/ui/Toast";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Consoles } from "@/components/Consoles";
import { Games } from "@/components/Games";
// import { Racing } from "@/components/Racing";
import { Pricing } from "@/components/Pricing";
import { Events } from "@/components/Events";
import { FAQ } from "@/components/FAQ";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { FloatingActions } from "@/components/FloatingActions";
import { BookingModal } from "@/components/BookingModal";
import { AvailabilityModal } from "@/components/AvailabilityModal";
import { AdminPortal } from "@/pages/admin/AdminPortal";
import { StaffPortal } from "@/pages/staff/StaffPortal";

function PublicWebsite() {
  const [booking, setBooking] = useState<{ open: boolean; prefill: BookingPrefill }>({ open: false, prefill: {} });
  const [availabilityOpen, setAvailabilityOpen] = useState(false);

  const openBooking = useCallback((prefill: BookingPrefill = {}) => {
    setAvailabilityOpen(false);
    setBooking({ open: true, prefill });
  }, []);

  const openAvailability = useCallback(() => {
    setBooking((b) => ({ ...b, open: false }));
    setAvailabilityOpen(true);
  }, []);

  const closeBooking = useCallback(() => setBooking((b) => ({ ...b, open: false })), []);
  const closeAvailability = useCallback(() => setAvailabilityOpen(false), []);

  const ctx = useMemo(() => ({ openBooking, openAvailability }), [openBooking, openAvailability]);

  return (
    <PublicDataProvider>
      <BookingContext.Provider value={ctx}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-blood focus:px-4 focus:py-2 focus:font-tech focus:font-bold focus:uppercase focus:tracking-widest"
        >
          Skip to content
        </a>

        <Navbar />

        <main id="main" className="overflow-x-clip">
          <Hero />
          <Marquee />
          <Consoles />
          <Games />
          {/* <Racing /> */}
          <Pricing />
          <Events />
          <FAQ />
          <Contact />
        </main>

        <Footer />
        <FloatingActions />

        <BookingModal open={booking.open} prefill={booking.prefill} onClose={closeBooking} />
        <AvailabilityModal open={availabilityOpen} onClose={closeAvailability} />
      </BookingContext.Provider>
    </PublicDataProvider>
  );
}

export default function App() {
  const { route } = useAppRoute();

  return (
    <ToastProvider>
      <AuthProvider>
        {route === "admin" ? <AdminPortal /> : route === "staff" ? <StaffPortal /> : <PublicWebsite />}
      </AuthProvider>
    </ToastProvider>
  );
}
