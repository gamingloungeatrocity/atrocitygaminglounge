import { useEffect, useState } from "react";
import backgroundGif from "@/assets/background-gif-2.gif";
import { cn } from "@/utils/cn";

/** Section that arms the backdrop — the Consoles & Hardware section. */
const TRIGGER_SECTION_ID = "consoles";
/** Preload the GIF once the trigger section is this close to the viewport. */
const PRELOAD_ROOT_MARGIN = "400px 0px";
/**
 * Collapses the observer root to a zero-height line at the middle of the
 * viewport, so "intersecting" means the section has crossed the 50% mark.
 */
const MIDLINE_ROOT_MARGIN = "-50% 0px -50% 0px";

/**
 * Fixed animated GIF layer that stays hidden on the landing page and fades in
 * once the Consoles & Hardware section crosses the middle of the viewport.
 * Decorative only: no pointer events, no layout impact, hidden from assistive tech.
 */
export function SiteBackdrop() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = document.getElementById(TRIGGER_SECTION_ID);
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      setVisible(true);
      return;
    }

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          preloadObserver.disconnect();
        }
      },
      { rootMargin: PRELOAD_ROOT_MARGIN },
    );
    preloadObserver.observe(section);

    const midlineObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          setVisible(true);
          return;
        }
        // Not on the midline: keep it up if we scrolled past, drop it if we're back at the top.
        setVisible(entry.boundingClientRect.top < 0);
      },
      { rootMargin: MIDLINE_ROOT_MARGIN, threshold: 0 },
    );
    midlineObserver.observe(section);

    return () => {
      preloadObserver.disconnect();
      midlineObserver.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden transition-opacity duration-1000 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="absolute left-1/2 top-[12vh] w-[min(1150px,94vw)] -translate-x-1/2 sm:top-[16vh]">
        {shouldLoad && (
          <img
            src={backgroundGif}
            alt=""
            decoding="async"
            className="h-auto w-full object-contain opacity-40 motion-reduce:hidden"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-black/35" />
    </div>
  );
}
