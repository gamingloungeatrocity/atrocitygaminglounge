import type { ComponentType, ReactNode } from "react";
import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { BUSINESS } from "@/data/site";
import { useIstNow } from "@/hooks/useIstNow";
import { directionsHref, mailtoHref, mapEmbedSrc, telHref, whatsappHref } from "@/lib/contact";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { OpenStatus } from "./ui/OpenStatus";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";
import { WhatsAppIcon } from "./ui/icons";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface InfoCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}

function InfoCard({ icon: Icon, title, children }: InfoCardProps) {
  return (
    <div className="hud group flex gap-5 rounded-2xl border border-white/10 bg-coal p-5 transition-colors duration-300 hover:border-blood/40 sm:p-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blood/15 text-blood-400 transition-all duration-300 group-hover:bg-blood group-hover:text-white group-hover:shadow-[0_0_24px_rgba(229,9,20,0.6)]">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-tech text-xs font-bold uppercase tracking-[0.3em] text-white/45">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export function Contact() {
  const now = useIstNow();

  return (
    <section id="contact" aria-labelledby="contact-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid mask-radial" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="contact-title"
            eyebrow="Visit Us"
            title={
              <>
                Find <span className="text-blood text-glow-sm">Atrocity Gaming Lounge</span>
              </>
            }
            description="Right opposite Indian Overseas Bank on Erode Main Road, Four Road, Kavindapadi. Walk in, gear up and game on."
          />
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <Reveal>
              <InfoCard icon={MapPin} title="Address">
                <address className="not-italic leading-relaxed text-white/80">
                  <span className="block font-display text-sm font-bold uppercase tracking-wide text-white">{BUSINESS.name}</span>
                  {BUSINESS.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 font-tech text-sm font-bold uppercase tracking-[0.16em] text-blood-400 transition-colors hover:text-blood-300"
                >
                  <Navigation className="h-4 w-4" /> Get directions
                </a>
              </InfoCard>
            </Reveal>

            <Reveal delay={80}>
              <InfoCard icon={Phone} title="Mobile Number">
                <a
                  href={telHref}
                  className="font-display text-xl font-black tracking-wide text-white transition-colors hover:text-blood-400 sm:text-2xl"
                >
                  {BUSINESS.phoneDisplay}
                </a>
                <p className="mt-1 text-sm text-white/55">Call or WhatsApp for bookings &amp; enquiries</p>
              </InfoCard>
            </Reveal>

            <Reveal delay={160}>
              <InfoCard icon={Mail} title="Email">
                <a
                  href={mailtoHref}
                  className="break-all font-display text-base font-black tracking-wide text-white transition-colors hover:text-blood-400 sm:text-lg"
                >
                  {BUSINESS.email}
                </a>
                <p className="mt-1 text-sm text-white/55">For bookings, group events &amp; tournament enquiries</p>
              </InfoCard>
            </Reveal>

            <Reveal delay={220}>
              <InfoCard icon={Clock} title="Opening Hours">
                <p className="font-tech text-lg font-bold text-white">{BUSINESS.hoursLabel}</p>
                <div className="mt-3">
                  <OpenStatus />
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Open all seven days">
                  {WEEK_ORDER.map((d) => (
                    <span
                      key={d}
                      className={cn(
                        "rounded-md border py-1.5 text-center font-tech text-[11px] font-bold uppercase tracking-wider",
                        d === now.weekday
                          ? "border-blood bg-blood text-white shadow-[0_0_16px_-2px_rgba(229,9,20,0.7)]"
                          : "border-white/10 bg-white/[0.03] text-white/55",
                      )}
                    >
                      {DAY_NAMES[d]}
                    </span>
                  ))}
                </div>
              </InfoCard>
            </Reveal>

            <Reveal delay={280}>
              <div className="grid grid-cols-2 gap-3">
                <Button href={telHref}>
                  <Phone /> Call Now
                </Button>
                <Button
                  variant="outline"
                  href={whatsappHref("Hi Atrocity Gaming Lounge! I have a question.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <WhatsAppIcon /> WhatsApp
                </Button>
                <Button variant="outline" href={mailtoHref}>
                  <Mail /> Email
                </Button>
                <Button variant="outline" href={directionsHref} target="_blank" rel="noopener noreferrer">
                  <Navigation /> Directions
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal className="h-full" delay={120}>
            <div className="hud relative h-full min-h-[380px] overflow-hidden rounded-3xl border border-white/10 bg-coal">
              <iframe
                title="Map: Atrocity Gaming Lounge, opposite Indian Overseas Bank, Four Road, Kavindapadi, Erode"
                src={mapEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="map-dark absolute inset-0 h-full w-full border-0"
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-blood/10 mix-blend-color" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/85 p-3 backdrop-blur-md sm:right-auto sm:max-w-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blood shadow-[0_0_20px_rgba(229,9,20,0.6)]">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-xs font-bold uppercase tracking-wide">Atrocity Gaming Lounge</span>
                    <span className="block truncate text-xs text-white/60">Opp. IOB, Four Road, Kavindapadi</span>
                  </span>
                </span>
                <a
                  href={directionsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-white/15 px-3 py-2 font-tech text-xs font-bold uppercase tracking-[0.16em] transition-colors hover:border-blood hover:bg-blood/15"
                >
                  Directions
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
