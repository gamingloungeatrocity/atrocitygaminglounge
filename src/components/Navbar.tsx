import { useEffect, useState, type MouseEvent } from "react";
import { ChevronRight, Clock, Gamepad2, Menu, Phone, X } from "lucide-react";
import { BUSINESS, NAV_LINKS, SPY_IDS } from "@/data/site";
import { useBooking } from "@/context/booking";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { scrollToId, telHref } from "@/lib/contact";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { Logo } from "./ui/Logo";
import { OpenStatus } from "./ui/OpenStatus";

export function Navbar() {
  const { openBooking } = useBooking();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const spy = useScrollSpy(SPY_IDS);
  const active = spy === "consoles" ? "home" : spy;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: lock scroll, close on Escape / desktop resize
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1280) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  const navigate = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setMenuOpen(false);
    requestAnimationFrame(() => scrollToId(id));
  };

  const book = () => {
    setMenuOpen(false);
    openBooking();
  };

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
          scrolled || menuOpen
            ? "border-white/[0.07] bg-black/80 shadow-[0_12px_40px_-16px_rgba(229,9,20,0.35)] backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8"
        >
          <a href="#home" onClick={navigate("home")} aria-label={`${BUSINESS.name} — home`} className="shrink-0 rounded-full">
            <Logo />
          </a>

          <ul className="hidden items-center gap-0.5 xl:flex">
            {NAV_LINKS.map((link) => {
              const isActive = active === link.id;
              return (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={navigate(link.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group relative block px-3 py-2 font-tech text-[15px] font-bold uppercase tracking-[0.12em] transition-colors duration-200",
                      isActive ? "text-white" : "text-white/55 hover:text-white",
                    )}
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full bg-blood shadow-[0_0_12px_#e50914] transition-transform duration-300",
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-50",
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hidden on phones so the longer "Gaming Lounge" wordmark fits; the sticky bar + menu keep booking one tap away. */}
            <Button size="sm" onClick={book} className="hidden px-3.5 sm:inline-flex sm:h-10 sm:px-5">
              <Gamepad2 className="hidden sm:block" />
              Book Now
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-white/[0.04] text-white transition-colors hover:border-blood xl:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile / tablet menu (rendered outside the blurred header so `fixed` uses the viewport) */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        className={cn(
          "fixed inset-x-0 bottom-0 top-16 z-40 transition-[visibility] duration-300 sm:top-20 xl:hidden",
          menuOpen ? "visible" : "invisible",
        )}
      >
        <div
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <nav
          aria-label="Mobile"
          className={cn(
            "relative max-h-full overflow-y-auto border-b border-white/10 bg-black/95 px-4 pb-8 pt-2 shadow-2xl transition-all duration-300 sm:px-6",
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
          )}
        >
          <ul className="divide-y divide-white/[0.06]">
            {NAV_LINKS.map((link, i) => {
              const isActive = active === link.id;
              return (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={navigate(link.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "group flex items-center justify-between py-4 font-tech text-xl font-bold uppercase tracking-wider transition-colors",
                      isActive ? "text-white" : "text-white/65 hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-4">
                      <span className={cn("font-display text-xs", isActive ? "text-blood-400" : "text-white/30")}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 transition-transform group-hover:translate-x-1",
                        isActive ? "text-blood" : "text-white/25",
                      )}
                    />
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button onClick={book}>
              <Gamepad2 /> Book Now
            </Button>
            <Button variant="outline" href={telHref}>
              <Phone /> Call Us
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <OpenStatus />
            <span className="flex items-center gap-2 font-tech text-sm text-white/50">
              <Clock className="h-4 w-4 text-blood-400" /> {BUSINESS.hoursShort}
            </span>
          </div>
        </nav>
      </div>
    </>
  );
}
