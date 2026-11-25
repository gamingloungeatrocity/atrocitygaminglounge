import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CONSOLES, GAMES } from "@/data/site";
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
  pricing: [],
  tournaments: FALLBACK_TOURNAMENTS,
  games: FALLBACK_GAMES,
  backendConnected: false,
  refresh: async () => {},
});

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [consoles, setConsoles] = useState<ConsoleRecord[]>(FALLBACK_CONSOLES);
  const [pricing, setPricing] = useState<PricingRecord[]>([]);
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
      setPricing([]);
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
