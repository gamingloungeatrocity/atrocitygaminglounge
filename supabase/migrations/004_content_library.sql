-- Content library management for the public games and tournament artwork.

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_path text,
  ADD COLUMN IF NOT EXISTS cover_fallback_text text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  studio text NOT NULL DEFAULT '',
  tag text NOT NULL DEFAULT 'Premium Title',
  genres text[] NOT NULL DEFAULT ARRAY[]::text[],
  modes text[] NOT NULL DEFAULT ARRAY[]::text[],
  blurb text NOT NULL DEFAULT '',
  cover_image_url text,
  cover_image_path text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_published_order ON public.games(is_published, sort_order);

DROP TRIGGER IF EXISTS trg_games_updated_at ON public.games;
CREATE TRIGGER trg_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published games"
  ON public.games FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admin manages games"
  ON public.games FOR ALL
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

INSERT INTO public.games (title, studio, tag, genres, modes, blurb, is_published, sort_order)
SELECT * FROM (VALUES
  ('Grand Theft Auto V', 'Rockstar Games', 'Open World', ARRAY['Open World']::text[], ARRAY['Story', 'Online']::text[], 'Pull off daring heists and tear through Los Santos in one of the biggest open worlds ever made.', true, 1),
  ('Red Dead Redemption 2', 'Rockstar Games', 'Western Epic', ARRAY['Open World']::text[], ARRAY['Story', 'Online']::text[], 'Ride with the Van der Linde gang across a breathtaking, living frontier in this cinematic western.', true, 2),
  ('WWE 2K', '2K', 'Wrestling', ARRAY['Sports', 'Fighting', 'Multiplayer']::text[], ARRAY['Versus', 'Local Multiplayer']::text[], 'Step into the squared circle — slam, pin and settle rivalries with friends in front of a roaring crowd.', true, 3),
  ('FC27', 'EA Sports', 'Football', ARRAY['Sports', 'Multiplayer']::text[], ARRAY['1v1', 'Local Multiplayer']::text[], 'Take the world''s top clubs onto the pitch — perfect for heated 1v1 derbies and co-op matches.', true, 4),
  ('Mortal Kombat 11', 'NetherRealm Studios', 'Fighting', ARRAY['Fighting', 'Multiplayer']::text[], ARRAY['1v1 Versus', 'Story']::text[], 'Brutal combos, iconic fighters and legendary Fatalities. Settle every argument the Kombat way.', true, 5),
  ('Spider-Man', 'Marvel''s · Insomniac Games', 'Action-Adventure', ARRAY['Open World']::text[], ARRAY['Story', 'Single Player']::text[], 'Swing through Manhattan as Peter Parker in a cinematic, high-flying superhero adventure.', true, 6)
) AS seed(title, studio, tag, genres, modes, blurb, is_published, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.games existing WHERE existing.title = seed.title);
