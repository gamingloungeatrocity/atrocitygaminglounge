import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { BUSINESS, NAV_LINKS } from "@/data/site";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact";
import { navigate } from "@/lib/router";
import { Logo } from "./ui/Logo";
import { WhatsAppIcon } from "./ui/icons";

const EXPERIENCES = [
  { label: "PS4 Gaming (₹70/hr)", href: "#consoles" },
  { label: "PS4 Pro Gaming (₹90/hr)", href: "#consoles" },
  { label: "Game Library", href: "#games" },
  { label: "Pricing Packages", href: "#pricing" },
  { label: "Group Events", href: "#events" },
  { label: "Tournaments", href: "#events" },
];

const COL_TITLE = "font-display text-sm font-black uppercase tracking-[0.2em] text-white";
const ICON_BTN =
  "grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-blood hover:bg-blood hover:text-white hover:shadow-[0_0_24px_rgba(229,9,20,0.6)]";

function FooterNav({ title, links }: { title: string; links: { label: string; href: string; isRoute?: boolean }[] }) {
  return (
    <nav aria-label={title}>
      <h3 className={COL_TITLE}>{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              onClick={
                link.isRoute
                  ? (e) => {
                      e.preventDefault();
                      navigate(link.href);
                    }
                  : undefined
              }
              className="group inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
            >
              <span className="h-px w-3 bg-blood/60 transition-all duration-300 group-hover:w-5 group-hover:bg-blood" />
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-linear-to-b from-black to-[#0a0001]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-blood to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-blood/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.3fr]">
          <div>
            <a href="#home" aria-label={`${BUSINESS.name} — back to top`} className="inline-block rounded-full">
              <Logo size="lg" />
            </a>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              Two dedicated gaming stations — PlayStation 4 (₹70/hr) and PlayStation 4 Pro (₹90/hr), group events and local
              tournaments — all under one roof in Kavindapadi, Erode.
            </p>
            <p className="mt-6 font-display text-sm font-black tracking-[0.3em] text-blood text-glow-sm">{BUSINESS.tagline}</p>
            <div className="mt-6 flex gap-3">
              <a href={telHref} aria-label="Call Atrocity Gaming Lounge" className={ICON_BTN}>
                <Phone className="h-5 w-5" />
              </a>
              <a
                href={whatsappHref("Hi Atrocity Gaming Lounge!")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat with Atrocity Gaming Lounge on WhatsApp"
                className={ICON_BTN}
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
              <a href={mailtoHref} aria-label="Email Atrocity Gaming Lounge" className={ICON_BTN}>
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <FooterNav
            title="Quick Links"
            links={[
              ...NAV_LINKS.map((l) => ({ label: l.label, href: `#${l.id}` })),
            ]}
          />
          <FooterNav title="Experiences" links={EXPERIENCES} />

          <div>
            <h3 className={COL_TITLE}>Contact</h3>
            <ul className="mt-5 space-y-4 text-sm text-white/65">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
                <address className="not-italic leading-relaxed">{BUSINESS.addressFull}</address>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
                <a href={telHref} className="transition-colors hover:text-white">
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
                <a href={mailtoHref} className="break-all transition-colors hover:text-white">
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blood-400" />
                <span>{BUSINESS.hoursLabel}</span>
              </li>
            </ul>
          </div>
        </div>

        <p
          aria-hidden="true"
          className="pointer-events-none mt-14 select-none text-center font-display text-[14vw] font-black leading-none tracking-tight text-outline lg:text-[10rem]"
        >
          ATROCITY
        </p>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/[0.07] pb-20 pt-8 text-center text-sm text-white/45 sm:flex-row sm:text-left md:pb-0">
          <p>© 2026 Atrocity Gaming Lounge. All rights reserved.</p>
          <p className="font-display text-xs font-bold tracking-[0.3em] text-white/60">
            PLAY <span className="text-blood">•</span> CONNECT <span className="text-blood">•</span> ENJOY
          </p>
        </div>
      </div>
    </footer>
  );
}
