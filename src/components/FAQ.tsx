import { useMemo, useState } from "react";
import { Phone, Plus } from "lucide-react";
import { BUSINESS, FAQS, FAQ_CATEGORIES, type FaqFilter, type FaqItem } from "@/data/site";
import { telHref, whatsappHref } from "@/lib/contact";
import { cn } from "@/utils/cn";
import { Button } from "./ui/Button";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";
import { Tabs } from "./ui/Tabs";
import { WhatsAppIcon } from "./ui/icons";

interface AccordionItemProps {
  item: FaqItem;
  id: string;
  open: boolean;
  onToggle: () => void;
}

function AccordionItem({ item, id, open, onToggle }: AccordionItemProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300",
        open
          ? "border-blood/50 bg-coal shadow-[0_20px_50px_-30px_rgba(229,9,20,0.7)]"
          : "border-white/10 bg-coal/50 hover:border-white/20",
      )}
    >
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left sm:px-6 sm:py-5"
        >
          <span className="min-w-0 break-words font-tech text-base font-bold leading-snug sm:text-lg">{item.q}</span>
          <span
            aria-hidden="true"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all duration-300",
              open ? "rotate-45 border-blood bg-blood text-white shadow-[0_0_16px_rgba(229,9,20,0.6)]" : "border-white/15 text-white/60",
            )}
          >
            <Plus className="h-4 w-4" />
          </span>
        </button>
      </h3>
      <div
        id={`${id}-a`}
        role="region"
        aria-labelledby={`${id}-q`}
        inert={!open}
        className={cn("grid transition-[grid-template-rows] duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
      >
        <div className="overflow-hidden">
          <p className="break-words px-5 pb-5 leading-relaxed text-white/65 sm:px-6 sm:pb-6">{item.a}</p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [category, setCategory] = useState<FaqFilter>("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const tabs = useMemo(
    () =>
      FAQ_CATEGORIES.map((c) => ({
        id: c,
        label: c,
        count: c === "All" ? FAQS.length : FAQS.filter((f) => f.category === c).length,
      })),
    [],
  );
  const items = category === "All" ? FAQS : FAQS.filter((f) => f.category === category);

  const changeCategory = (next: FaqFilter) => {
    setCategory(next);
    setOpenIndex(null);
  };

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative min-w-0 py-20 sm:py-28">
      <div className="mx-auto grid w-full min-w-0 max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:px-8">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <SectionHeading
              className="min-w-0"
              align="left"
              id="faq-title"
              eyebrow="FAQ"
              title={
                <>
                  Got <span className="text-blood text-glow-sm">Questions?</span>
                </>
              }
              description="Everything you need to know about bookings, walk-ins and our hardware. Can't find your answer? Just give us a shout."
            />
          </Reveal>
          <Reveal className="mt-8">
            <div className="hud min-w-0 rounded-2xl border border-white/10 bg-coal p-5 sm:p-6">
              <p className="font-display text-base font-black uppercase tracking-wide">Still need help?</p>
              <p className="mt-2 break-words text-sm text-white/60">
                Our team is available daily from 10:00 AM to 10:00 PM on {BUSINESS.phoneDisplay}.
              </p>
              <div className="mt-5 flex max-w-full flex-wrap gap-3">
                <Button size="sm" href={telHref} className="max-w-full">
                  <Phone /> Call us
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  href={whatsappHref("Hi Atrocity Gaming Lounge! I have a question.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="max-w-full"
                >
                  <WhatsAppIcon /> WhatsApp
                </Button>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="min-w-0">
          <Reveal className="min-w-0">
            <Tabs items={tabs} value={category} onChange={changeCategory} label="FAQ categories" idPrefix="faq" size="sm" className="min-w-0" />
          </Reveal>
          <div id="faq-panel" role="tabpanel" aria-labelledby={`faq-tab-${category}`} className="mt-6 space-y-3">
            {items.map((item, i) => (
              <div key={`${category}-${item.q}`} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                <AccordionItem
                  item={item}
                  id={`faq-${category}-${i}`.replace(/\s+/g, "")}
                  open={openIndex === i}
                  onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
