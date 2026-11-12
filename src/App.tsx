import { useCallback, useMemo, useState } from "react";
import type { BookingPrefill } from "@/data/site";
import { AuthProvider } from "@/context/auth";
import { BookingContext } from "@/context/booking";
import { PublicDataProvider } from "@/context/publicData";
import { useAppRoute } from "@/lib/router";
import { ToastProvider } from "@/components/ui/Toast";
import { SiteBackdrop } from "@/components/SiteBackdrop";
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
import { BackNavigationProvider } from "@/context/backNavigation";
import { AppErrorBoundary, ErrorPage } from "@/components/ErrorPage";

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
        

        <SiteBackdrop />

        <Navbar />

        <main id="main" className="relative z-10 overflow-x-clip pb-20 md:pb-0">
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
    <AppErrorBoundary>
      <BackNavigationProvider>
        <ToastProvider>
          <AuthProvider>
            {route === "admin" ? <AdminPortal /> : route === "staff" ? <StaffPortal /> : route === "not-found" ? <ErrorPage kind="404" /> : <PublicWebsite />}
          </AuthProvider>
        </ToastProvider>
      </BackNavigationProvider>
    </AppErrorBoundary>
  );
}
