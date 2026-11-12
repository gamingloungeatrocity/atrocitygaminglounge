import { useState } from "react";
import { ArrowRight, Crown, Info, PartyPopper, Phone, Swords, Target, Trophy, Users } from "lucide-react";
import heroImg from "@/assets/raw/hero.jpg";
import fc27Img from "@/assets/raw/fc24.jpg";
import mk11Img from "@/assets/raw/mk11.jpg";
import wweImg from "@/assets/raw/wwe.jpg";
import { GROUP_PERKS, GROUP_STEPS } from "@/data/site";
import { useBooking } from "@/context/booking";
import { usePublicData } from "@/context/publicData";
import type { TournamentRecord } from "@/lib/api";
import { telHref } from "@/lib/contact";
import { Button } from "./ui/Button";
import { PriceCounter } from "./ui/PriceCounter";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";
import { Tabs } from "./ui/Tabs";

type EventTab = "group" | "tournaments";

const TAB_ITEMS = [
  { id: "group" as const, label: "Group Events", icon: <Users className="h-4 w-4" /> },
  { id: "tournaments" as const, label: "Tournaments", icon: <Trophy className="h-4 w-4" /> },
];

function GroupPanel() {
  const { openBooking } = useBooking();
  const { pricing } = usePublicData();
  const wholeLoungePrice = pricing.find((p) => p.category === "whole_lounge" && p.is_active)?.price ?? 2500;
  return (
    <div className="grid animate-fade-up gap-6 lg:grid-cols-5">
      <article className="hud relative overflow-hidden rounded-3xl border border-white/10 lg:col-span-3">
        <img
          src={heroImg}
          alt="Atrocity Gaming Lounge with rows of gaming stations under red neon lights"
          width={1280}
          height={720}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-tr from-black via-black/85 to-black/40" />
        <div className="relative flex h-full flex-col p-6 sm:p-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blood/40 bg-blood/10 px-3 py-1 font-tech text-xs font-bold uppercase tracking-[0.24em] text-blood-300">
            <Crown className="h-3.5 w-3.5" /> Exclusive Whole Lounge Reservation
          </span>
          <h3 className="mt-5 font-display text-3xl font-black uppercase sm:text-4xl">
            Reserve the <span className="text-blood text-glow-sm">Whole Lounge</span>
          </h3>
          <p className="mt-4 max-w-lg leading-relaxed text-white/70">
            Reserve the entire gaming lounge exclusively for your crew for a selected duration — locking both our PS4 and PS4 Pro stations privately for your group.
          </p>
          <div className="mt-6 flex items-end gap-3">
            <span className="font-display text-5xl font-black leading-none">
              <PriceCounter value={Number(wholeLoungePrice)} rupeeClassName="text-[0.8em]" />
            </span>
            <span className="pb-1 font-tech text-sm font-bold uppercase tracking-[0.2em] text-white/60">Whole Lounge</span>
          </div>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {GROUP_PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-sm text-white/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-blood shadow-[0_0_8px_#e50914]" />
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => openBooking({ service: "group" })}>
              <PartyPopper /> Book Group Event
            </Button>
            <Button size="lg" variant="outline" href={telHref}>
              <Phone /> Call to Plan
            </Button>
          </div>
        </div>
      </article>

      <aside className="flex flex-col gap-6 lg:col-span-2">
        <div className="rounded-3xl border border-white/10 bg-coal p-6 sm:p-8">
          <h4 className="font-display text-base font-black uppercase tracking-wide">How it works</h4>
          <ol className="relative mt-6 space-y-6 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-linear-to-b before:from-blood before:to-white/5">
            {GROUP_STEPS.map((step, i) => (
              <li key={step.title} className="relative flex gap-4">
                <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blood/60 bg-black font-display text-xs font-black text-blood-400 shadow-[0_0_16px_-2px_rgba(229,9,20,0.6)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-tech text-base font-bold uppercase tracking-wider">{step.title}</p>
                  <p className="mt-0.5 text-sm text-white/55">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-3xl border border-white/10 bg-coal p-6 sm:p-8">
          <h4 className="font-display text-base font-black uppercase tracking-wide">Included Stations</h4>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Once your request is approved, both <strong className="text-white">PlayStation 4</strong> and{" "}
            <strong className="text-white">PlayStation 4 Pro</strong> stations are exclusively locked for your reservation window.
          </p>
        </div>
      </aside>
    </div>
  );
}

function pickTournamentArtwork(gameName: string) {
  const g = gameName.toLowerCase();
  if (g.includes("mk") || g.includes("mortal")) return mk11Img;
  if (g.includes("wwe")) return wweImg;
  return fc27Img;
}

function TournamentCard({ tournament }: { tournament: TournamentRecord }) {
  const { openBooking } = useBooking();
  const closed = tournament.status !== "registration_open" && tournament.status !== "upcoming";
  return (
    <article className="group relative flex min-h-[340px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 bg-coal transition-all duration-500 hover:-translate-y-1.5 hover:border-blood/60 hover:shadow-[0_24px_60px_-20px_rgba(229,9,20,0.6)]">
      <img
        src={tournament.cover_image_url || pickTournamentArtwork(tournament.game_name)}
        alt=""
        width={480}
        height={720}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-80"
      />
      {!tournament.cover_image_url && tournament.cover_fallback_text && (
        <div className="absolute inset-x-5 top-5 rounded-xl border border-white/15 bg-black/65 p-3 text-center font-tech text-xs font-bold uppercase tracking-[0.16em] text-white/75 backdrop-blur-sm">
          {tournament.cover_fallback_text}
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-black/10" />
      <div className="relative p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-blood px-2 py-1 font-tech text-[11px] font-bold uppercase tracking-[0.2em]">
            <Swords className="h-3 w-3" />
            {tournament.status.replace(/_/g, " ")}
          </span>
          {Number(tournament.entry_fee) > 0 && (
            <span className="rounded-md border border-white/15 bg-black/70 px-2 py-1 font-tech text-[11px] font-bold uppercase text-white">
              Entry ₹{Number(tournament.entry_fee)}
            </span>
          )}
        </div>
        <h4 className="mt-3 font-display text-lg font-black uppercase leading-tight">{tournament.title}</h4>
        <p className="mt-1 font-tech text-sm font-semibold uppercase tracking-[0.14em] text-white/55">
          {tournament.game_name} {tournament.tournament_date ? `· ${tournament.tournament_date}` : ""}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm text-white/75">
          <Target className="h-4 w-4 text-blood-400" />
          {tournament.format} · {tournament.registration_count ?? 0}/{tournament.max_participants} slots
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={closed}
          className="mt-5 w-full"
          onClick={() => openBooking({ service: "tournament", tournament: tournament.id })}
        >
          {closed ? tournament.status.replace(/_/g, " ") : "Register Now"} <ArrowRight />
        </Button>
      </div>
    </article>
  );
}

function TournamentPanel() {
  const { openBooking } = useBooking();
  const { tournaments } = usePublicData();
  return (
    <div className="animate-fade-up">
      <div className="relative overflow-hidden rounded-3xl border border-blood/30 bg-linear-to-r from-blood/20 via-coal to-coal p-6 sm:p-10">
        <Crown aria-hidden="true" className="absolute -right-6 -top-6 h-44 w-44 rotate-12 text-blood/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-tech text-sm font-bold uppercase tracking-[0.3em] text-blood-400">Local tournaments</p>
            <h3 className="mt-2 font-display text-2xl font-black uppercase sm:text-3xl">
              Compete. Conquer. <span className="text-blood text-glow-sm">Get Crowned.</span>
            </h3>
            <p className="mt-3 leading-relaxed text-white/65">
              Battle the best players in town across fan-favourite titles. Register online directly to lock your tournament spot.
            </p>
          </div>
          {tournaments.length > 0 && (
            <Button size="lg" onClick={() => openBooking({ service: "tournament" })} className="shrink-0">
              <Trophy /> Register Now
            </Button>
          )}
        </div>
      </div>

      {tournaments.length > 0 ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-blood-400/70" />
          <h4 className="mt-4 font-display text-xl font-black uppercase">No tournaments currently available</h4>
          <p className="mt-2 text-sm text-white/55">Check back soon for upcoming local tournaments.</p>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 text-sm text-white/45">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Tournament dates, entry fees and prizes are announced at the venue and shared directly with registered players.
      </p>
    </div>
  );
}

export function Events() {
  const [tab, setTab] = useState<EventTab>("group");

  return (
    <section id="events" aria-labelledby="events-title" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-black via-blood-950/70 to-black" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="events-title"
            eyebrow="Events & Tournaments"
            title={
              <>
                Group Events &amp; <span className="text-blood text-glow-sm">Tournaments</span>
              </>
            }
            description="Take over the whole venue with your crew, or step into the arena and battle for bragging rights."
          />
        </Reveal>

        <Reveal className="mt-10 flex justify-center">
          <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} label="Events and tournaments" idPrefix="events" />
        </Reveal>

        <div id="events-panel" role="tabpanel" aria-labelledby={`events-tab-${tab}`} className="mt-10">
          {tab === "tournaments" ? <TournamentPanel /> : <GroupPanel />}
        </div>
      </div>
    </section>
  );
}
