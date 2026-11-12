import { useMemo, useState } from "react";
import { ArrowRight, Disc3 } from "lucide-react";
import { GAME_FILTERS, GAMES, type Game, type GameFilter } from "@/data/site";
import { useBooking } from "@/context/booking";
import { usePublicData } from "@/context/publicData";
import { whatsappHref } from "@/lib/contact";
import { Button } from "./ui/Button";
import { Reveal } from "./ui/Reveal";
import { SectionHeading } from "./ui/SectionHeading";
import { Tabs } from "./ui/Tabs";
import { WhatsAppIcon } from "./ui/icons";

const GAME_GENRE_TAGS = ["Open World", "Sports", "Fighting", "Multiplayer"] as const;

/** Keeps only the genre tags the "Game" type allows, dropping "All" and unknown values. */
const toGameGenres = (genres: string[]): Game["genres"] => GAME_GENRE_TAGS.filter((tag) => genres.includes(tag));

const matches = (game: Game, filter: GameFilter) => filter === "All" || (game.genres as GameFilter[]).includes(filter);

function GameCard({ game, index }: { game: Game & { image: string }; index: number }) {
  const { openBooking } = useBooking();
  return (
    <article
      style={{ animationDelay: `${index * 70}ms` }}
      className="hud group relative aspect-[3/4] animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-coal transition-[translate,border-color,box-shadow] duration-500 hover:-translate-y-2 hover:border-blood/70 hover:shadow-[0_24px_60px_-18px_rgba(229,9,20,0.65)] focus-within:border-blood/70"
    >
      <img
        src={game.image}
        alt={`${game.title} themed artwork`}
        width={480}
        height={853}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black via-black/45 to-black/5" />
      <div aria-hidden="true" className="absolute inset-0 bg-blood/0 transition-colors duration-500 group-hover:bg-blood/10" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-full w-2/3 -skew-x-12 bg-linear-to-r from-transparent via-white/15 to-transparent transition-[left] duration-1000 ease-out group-hover:left-[140%]"
      />

      <span className="absolute left-3 top-3 rounded-md border border-white/15 bg-black/60 px-2 py-1 font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm sm:left-4 sm:top-4 sm:text-[11px]">
        {game.tag}
      </span>

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
        <p className="font-tech text-[10px] font-bold uppercase tracking-[0.2em] text-blood-400 sm:text-xs">{game.studio}</p>
        <h3 className="mt-1 font-display text-sm font-black uppercase leading-tight text-white sm:text-lg lg:text-xl">{game.title}</h3>
        <div className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
          {game.modes.map((mode) => (
            <span key={mode} className="rounded-md bg-white/10 px-2 py-0.5 font-tech text-[11px] font-semibold uppercase tracking-wider text-white/80">
              {mode}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-out group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr]">
          <div className="overflow-hidden">
            <p className="pt-3 text-sm leading-relaxed text-white/75">{game.blurb}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 font-tech text-sm font-bold uppercase tracking-[0.16em] text-blood-400">
              Book &amp; Play <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </div>

      {/* Stretched action: whole card is clickable */}
      <button
        type="button"
        onClick={() => openBooking({ game: game.title })}
        aria-label={`Book a session to play ${game.title}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-offset-[-3px]"
      />
    </article>
  );
}

export function Games() {
  const [filter, setFilter] = useState<GameFilter>("All");
  const { games: records } = usePublicData();
  const gamesData: (Game & { image: string })[] = records.map((game) => ({
    ...game,
    image: game.cover_image_url || GAMES.find((fallback) => fallback.title === game.title)?.image || "",
    genres: toGameGenres(game.genres),
  }));
  const gamesSource = gamesData;
  const tabs = useMemo(
    () => GAME_FILTERS.map((f) => ({ id: f, label: f, count: gamesSource.filter((g) => matches(g, f)).length })),
    [gamesSource],
  );
  const games = gamesSource.filter((g) => matches(g, filter));

  return (
    <section id="games" aria-labelledby="games-title" className="relative py-20 sm:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_top,rgba(229,9,20,0.14),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            id="games-title"
            eyebrow="Game Library"
            title={
              <>
                Premium <span className="text-blood text-glow-sm">Game Library</span>
              </>
            }
            description="From open-world epics to late-night fight clubs — jump into the biggest PlayStation titles with crystal-clear graphics and immersive gameplay."
          />
        </Reveal>

        <Reveal className="mt-10 flex justify-center">
          <Tabs items={tabs} value={filter} onChange={setFilter} label="Filter games by genre" idPrefix="games" />
        </Reveal>

        <div
          id="games-panel"
          role="tabpanel"
          aria-labelledby={`games-tab-${filter}`}
          className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3"
        >
          {games.map((game, i) => (
            <GameCard key={`${filter}-${game.id}`} game={game} index={i} />
          ))}
        </div>

        <Reveal className="mt-8">
          <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blood/15 text-blood-400">
                <Disc3 className="h-6 w-6 animate-spin-slow" />
              </span>
              <div>
                <p className="font-display text-base font-bold uppercase tracking-wide">+ Many more titles in our library</p>
                <p className="mt-1 text-sm text-white/55">Looking for a specific game? Ask us for the full list before you visit.</p>
              </div>
            </div>
            <Button
              variant="outline"
              href={whatsappHref("Hi Atrocity Gaming Lounge! Could you share your full PS4 game list?")}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon /> Ask for the list
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
