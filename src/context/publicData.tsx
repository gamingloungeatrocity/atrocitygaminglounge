import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CONSOLES, GAMES, PRICING } from "@/data/site";
import { api, getApiBaseUrl, type ConsoleRecord, type GameRecord, type PricingRecord, type TournamentRecord } from "@/lib/api";

interface PublicDataState {
  consoles: ConsoleRecord[];
  pricing: PricingRecord[];
  tournaments: TournamentRecord[];
  games: GameRecord[];
  backendConnected: boolean;
  refresh: () => Promise<void>;
}

const FALLBACK_CONSOLES: ConsoleRecord[] = CONSOLES.map((c) => ({
  id: c.id,
  slug: c.id,
  name: c.name,
  console_type: c.short,
  description: c.description,
  specs: Object.fromEntries(c.specs.map((s) => [s.label.toLowerCase(), s.value])),
  status: "available",
  effective_status: "available",
}));

const FALLBACK_PRICING: PricingRecord[] = [
  ...PRICING.flatMap((p) => {
    const mins = p.id === "hourly" ? 60 : p.id === "pack3" ? 180 : 300;
    const bonus = p.id === "pack3" ? 15 : p.id === "daypass" ? 30 : 0;
    return [
      { id: `${p.id}-ps4`, category: "ps4" as const, label: p.name, duration_minutes: mins, bonus_minutes: bonus, price: p.ps4Price, is_active: true, sort_order: 1 },
      { id: `${p.id}-ps4pro`, category: "ps4pro" as const, label: p.name, duration_minutes: mins, bonus_minutes: bonus, price: p.ps4ProPrice, is_active: true, sort_order: 1 },
    ];
  }),
  { id: "wl-flat", category: "whole_lounge", label: "Whole Lounge (3 Hours)", duration_minutes: 180, bonus_minutes: 0, price: 2500, is_active: true, sort_order: 1 },
];

const FALLBACK_TOURNAMENTS: TournamentRecord[] = [];
const FALLBACK_GAMES: GameRecord[] = GAMES.map((g, index) => ({
  id: g.id,
  title: g.title,
  studio: g.studio,
  tag: g.tag,
  genres: g.genres,
  modes: g.modes,
  blurb: g.blurb,
  cover_image_url: g.image,
  is_published: true,
  sort_order: index,
}));

const PublicDataContext = createContext<PublicDataState>({
  consoles: FALLBACK_CONSOLES,
  pricing: FALLBACK_PRICING,
  tournaments: FALLBACK_TOURNAMENTS,
  games: FALLBACK_GAMES,
  backendConnected: false,
  refresh: async () => {},
});

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [consoles, setConsoles] = useState<ConsoleRecord[]>(FALLBACK_CONSOLES);
  const [pricing, setPricing] = useState<PricingRecord[]>(FALLBACK_PRICING);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>(FALLBACK_TOURNAMENTS);
  const [games, setGames] = useState<GameRecord[]>(FALLBACK_GAMES);
  const [backendConnected, setBackendConnected] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [c, p, t, g] = await Promise.all([
        api.public.getConsoles(),
        api.public.getPricing(),
        api.public.getTournaments(),
        api.public.getGames(),
      ]);
      if (Array.isArray(c)) setConsoles(c);
      if (Array.isArray(p)) setPricing(p);
      if (Array.isArray(t)) {
        setTournaments(
          t.filter(
            (tournament) =>
              !["fc27-knockout-cup", "mk11-fight-night", "wwe-2k-rumble"].includes(tournament.slug),
          ),
        );
      }
      if (Array.isArray(g)) setGames(g);
      setBackendConnected(true);
    } catch {
      setBackendConnected(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      void fetch(`${getApiBaseUrl()}/api/health`, { cache: "no-store" }).catch(() => {});
    }, 5 * 60 * 1000);
    return () => window.clearInterval(heartbeat);
  }, []);

  const value = useMemo(
    () => ({ consoles, pricing, tournaments, games, backendConnected, refresh }),
    [consoles, pricing, tournaments, games, backendConnected, refresh],
  );

  return <PublicDataContext.Provider value={value}>{children}</PublicDataContext.Provider>;
}

export function usePublicData() {
  return useContext(PublicDataContext);
}
