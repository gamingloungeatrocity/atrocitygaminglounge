
import { useEffect, useState } from "react";
import { ArrowUp, Gamepad2, Phone } from "lucide-react";
import { useBooking } from "@/context/booking";
import { scrollToId, telHref, whatsappHref } from "@/lib/contact";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { WhatsAppIcon } from "./ui/icons";

export function FloatingActions() {
  const { openBooking } = useBooking();

  const [showTop, setShowTop] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  useEffect(() => {
    const heroBookNow = document.getElementById("hero-book-now");

    if (!heroBookNow) {
      console.warn("Hero Book Now button not found.");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show the floating bar when the Hero Book Now button
        // is no longer visible.
        setShowFloatingBar(!entry.isIntersecting);
      },
      {
        threshold: 0,
      },
    );

    observer.observe(heroBookNow);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      setShowTop(window.scrollY > 900);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    update();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Back to top */}
      <button
        type="button"
        aria-label="Back to top"
        onClick={() => scrollToId("home")}
        tabIndex={showTop ? 0 : -1}
        className={cn(
          "fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-blood/50 bg-black/80 text-white backdrop-blur transition-all duration-300 hover:scale-110 hover:bg-blood hover:shadow-[0_0_30px_rgba(229,9,20,0.7)] md:bottom-6 md:right-6",
          showTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      {/* Mobile floating action bar */}
      <div
        aria-hidden={!showFloatingBar}
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-all duration-300 md:hidden",
          showFloatingBar
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="grid grid-cols-[auto_auto_1fr] gap-2">
          <a
            href={telHref}
            aria-label="Call Atrocity Gaming Lounge"
            tabIndex={showFloatingBar ? 0 : -1}
            className="grid h-12 w-12 place-items-center rounded-lg border border-white/15 bg-white/[0.04] text-white transition-colors active:bg-blood/20"
          >
            <Phone className="h-5 w-5" />
          </a>

          <a
            href={whatsappHref(
              "Hi Atrocity Gaming Lounge! I'd like to check availability.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            tabIndex={showFloatingBar ? 0 : -1}
            className="grid h-12 w-12 place-items-center rounded-lg border border-white/15 bg-white/[0.04] text-white transition-colors active:bg-blood/20"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </a>

          <Button
            onClick={() => openBooking()}
            className="h-12 w-full"
            starBorder
            tabIndex={showFloatingBar ? 0 : -1}
          >
            <Gamepad2 /> Book Now
          </Button>
        </div>
      </div>
    </>
  );
}
