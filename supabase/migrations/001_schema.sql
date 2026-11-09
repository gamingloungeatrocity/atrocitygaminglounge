-- ============================================================================
-- Atrocity Gaming Lounge — Complete Supabase PostgreSQL Schema
-- Includes all 10 core tables, database-level conflict prevention (GiST
-- exclusion constraints + atomic transactional RPCs), indexes, and RLS.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- Helper: updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- Helper: convert local IST (Asia/Kolkata) date + time + duration -> tstzrange
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ist_slot_range(
  p_date date,
  p_start time,
  p_duration_minutes integer
)
RETURNS tstzrange
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT tstzrange(
    ((p_date::timestamp + p_start) AT TIME ZONE 'Asia/Kolkata'),
    ((p_date::timestamp + p_start) AT TIME ZONE 'Asia/Kolkata') + make_interval(mins => p_duration_minutes),
    '[)'
  );
$$;

-- ============================================================================
-- 1. staff_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  email text UNIQUE NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON public.staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_active ON public.staff_profiles(is_active);

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. consoles
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consoles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  console_type text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'disabled')),
  maintenance_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consoles_status ON public.consoles(status);

DROP TRIGGER IF EXISTS trg_consoles_updated_at ON public.consoles;
CREATE TRIGGER trg_consoles_updated_at
  BEFORE UPDATE ON public.consoles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. pricing (DB-driven rates for PS4, PS4 Pro, Whole Lounge, Tournaments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('ps4', 'ps4pro', 'whole_lounge', 'tournament')),
  label text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes >= 0),
  bonus_minutes integer NOT NULL DEFAULT 0 CHECK (bonus_minutes >= 0),
  price numeric(10, 2) NOT NULL CHECK (price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_active_cat_dur
  ON public.pricing(category, duration_minutes)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_pricing_category ON public.pricing(category, sort_order);

DROP TRIGGER IF EXISTS trg_pricing_updated_at ON public.pricing;
CREATE TRIGGER trg_pricing_updated_at
  BEFORE UPDATE ON public.pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- Lounge configurable settings (permissions & business rules)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lounge_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  lounge_name text NOT NULL DEFAULT 'Atrocity Gaming Lounge',
  opening_time time NOT NULL DEFAULT '10:00:00',
  closing_time time NOT NULL DEFAULT '22:00:00',
  staff_can_approve_group_bookings boolean NOT NULL DEFAULT false,
  staff_can_cancel_bookings boolean NOT NULL DEFAULT true,
  staff_can_update_console_status boolean NOT NULL DEFAULT true,
  staff_can_manage_tournaments boolean NOT NULL DEFAULT false,
  tournament_manual_approval boolean NOT NULL DEFAULT false,
  online_booking_auto_reserve_lounge boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_lounge_settings_updated_at ON public.lounge_settings;
CREATE TRIGGER trg_lounge_settings_updated_at
  BEFORE UPDATE ON public.lounge_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. bookings (Individual console bookings: online & walkin)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text UNIQUE NOT NULL,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  console_id uuid NOT NULL REFERENCES public.consoles(id) ON DELETE RESTRICT,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  bonus_minutes integer NOT NULL DEFAULT 0 CHECK (bonus_minutes >= 0),
  game_title text,
  players integer NOT NULL DEFAULT 1 CHECK (players BETWEEN 1 AND 8),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  booking_source text NOT NULL CHECK (booking_source IN ('online', 'walkin')),
  booking_status text NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  notes text,
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_booking_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_console_date ON public.bookings(console_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings(booking_source);

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. group_bookings (Whole lounge exclusive reservations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text UNIQUE NOT NULL,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  number_of_people integer NOT NULL DEFAULT 6 CHECK (number_of_people BETWEEN 2 AND 60),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  booking_status text NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  notes text,
  rejection_reason text,
  reviewed_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_group_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_group_bookings_date ON public.group_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_group_bookings_status ON public.group_bookings(booking_status);

DROP TRIGGER IF EXISTS trg_group_bookings_updated_at ON public.group_bookings;
CREATE TRIGGER trg_group_bookings_updated_at
  BEFORE UPDATE ON public.group_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. walkin_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.walkin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone text NOT NULL CHECK (char_length(trim(customer_phone)) >= 10),
  console_id uuid NOT NULL REFERENCES public.consoles(id) ON DELETE RESTRICT,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  start_time timestamptz NOT NULL,
  expected_end_time timestamptz NOT NULL,
  actual_end_time timestamptz,
  amount_collected numeric(10, 2) NOT NULL CHECK (amount_collected >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'upi')),
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  session_status text NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'cancelled')),
  staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_walkin_end_after_start CHECK (expected_end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_walkin_status ON public.walkin_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_walkin_console ON public.walkin_sessions(console_id);
CREATE INDEX IF NOT EXISTS idx_walkin_start ON public.walkin_sessions(start_time);

DROP TRIGGER IF EXISTS trg_walkin_sessions_updated_at ON public.walkin_sessions;
CREATE TRIGGER trg_walkin_sessions_updated_at
  BEFORE UPDATE ON public.walkin_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- CRITICAL: Cross-entity Database-Level Conflict Prevention Table
-- Prevents ANY overlap between individual bookings, walk-ins, and approved
-- whole-lounge reservations using PostgreSQL GiST exclusion constraints.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.console_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  console_id uuid NOT NULL REFERENCES public.consoles(id) ON DELETE CASCADE,
  slot_range tstzrange NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('booking', 'walkin', 'group_booking')),
  source_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_overlapping_console_reservations
    EXCLUDE USING gist (console_id WITH =, slot_range WITH &&)
    WHERE (is_active = true)
);

CREATE INDEX IF NOT EXISTS idx_console_reservations_source ON public.console_reservations(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_console_reservations_range ON public.console_reservations USING gist (slot_range);

-- ============================================================================
-- 7. tournaments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  game_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  tournament_date date NOT NULL,
  start_time time NOT NULL,
  registration_deadline timestamptz NOT NULL,
  entry_fee numeric(10, 2) NOT NULL DEFAULT 0 CHECK (entry_fee >= 0),
  max_participants integer NOT NULL DEFAULT 16 CHECK (max_participants >= 2),
  format text NOT NULL DEFAULT 'Knockout bracket',
  rules text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled')),
  winner_name text,
  runner_up_name text,
  results_notes text,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_date ON public.tournaments(tournament_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_published ON public.tournaments(is_published);

DROP TRIGGER IF EXISTS trg_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 8. tournament_registrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_code text UNIQUE NOT NULL,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  participant_name text NOT NULL CHECK (char_length(trim(participant_name)) >= 2),
  phone text NOT NULL CHECK (char_length(trim(phone)) >= 10),
  gamer_tag text,
  registration_date timestamptz NOT NULL DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  registration_status text NOT NULL DEFAULT 'approved' CHECK (registration_status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes text,
  reviewed_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tournament_phone UNIQUE (tournament_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_tourn_reg_tournament ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tourn_reg_status ON public.tournament_registrations(registration_status);

DROP TRIGGER IF EXISTS trg_tourn_reg_updated_at ON public.tournament_registrations;
CREATE TRIGGER trg_tourn_reg_updated_at
  BEFORE UPDATE ON public.tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 9. payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_type text NOT NULL CHECK (booking_type IN ('console', 'group', 'walkin', 'tournament')),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  group_booking_id uuid REFERENCES public.group_bookings(id) ON DELETE SET NULL,
  walkin_session_id uuid REFERENCES public.walkin_sessions(id) ON DELETE SET NULL,
  tournament_registration_id uuid REFERENCES public.tournament_registrations(id) ON DELETE SET NULL,
  transaction_id text UNIQUE NOT NULL,
  cashfree_order_id text,
  cashfree_payment_id text,
  amount numeric(10, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL CHECK (payment_method IN ('cashfree', 'cash', 'upi')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at timestamptz,
  collected_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_cf_order ON public.payments(cashfree_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_group ON public.payments(group_booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_walkin ON public.payments(walkin_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_tourn_reg ON public.payments(tournament_registration_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON public.payments(paid_at);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. audit_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  actor_email text,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================================
-- ATOMIC TRANSACTIONAL RPC FUNCTIONS (Conflict Prevention)
-- ============================================================================

-- 1) Create individual console booking atomically
CREATE OR REPLACE FUNCTION public.create_console_booking_atomic(
  p_booking_code text,
  p_customer_name text,
  p_customer_phone text,
  p_console_id uuid,
  p_booking_date date,
  p_start_time time,
  p_duration integer,
  p_bonus_minutes integer,
  p_game_title text,
  p_players integer,
  p_total_amount numeric,
  p_booking_source text,
  p_booking_status text,
  p_payment_status text,
  p_notes text,
  p_created_by uuid
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_console public.consoles%ROWTYPE;
  v_settings public.lounge_settings%ROWTYPE;
  v_end_time time;
  v_slot tstzrange;
  v_booking public.bookings%ROWTYPE;
  v_other_console public.consoles%ROWTYPE;
BEGIN
  SELECT * INTO v_console FROM public.consoles WHERE id = p_console_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Console not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_console.status IN ('maintenance', 'disabled') THEN
    RAISE EXCEPTION 'Console is currently unavailable (% status)', v_console.status USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_settings FROM public.lounge_settings WHERE id = 1;
  v_end_time := (p_start_time + make_interval(mins => p_duration))::time;
  IF v_end_time <= p_start_time OR p_start_time < v_settings.opening_time OR v_end_time > v_settings.closing_time THEN
    RAISE EXCEPTION 'Selected time falls outside lounge operating hours' USING ERRCODE = 'P0001';
  END IF;

  v_slot := public.ist_slot_range(p_booking_date, p_start_time, p_duration);

  INSERT INTO public.bookings (
    booking_code, customer_name, customer_phone, console_id, booking_date,
    start_time, end_time, duration, bonus_minutes, game_title, players,
    total_amount, booking_source, booking_status, payment_status, notes, created_by
  ) VALUES (
    p_booking_code, trim(p_customer_name), trim(p_customer_phone), p_console_id, p_booking_date,
    p_start_time, v_end_time, p_duration, COALESCE(p_bonus_minutes, 0), p_game_title, COALESCE(p_players, 1),
    p_total_amount, p_booking_source, p_booking_status, p_payment_status, p_notes, p_created_by
  )
  RETURNING * INTO v_booking;

  INSERT INTO public.console_reservations (console_id, slot_range, source_type, source_id, is_active)
  VALUES (p_console_id, v_slot, 'booking', v_booking.id, true);

  -- Only reserve the entire lounge if explicitly configured by admin settings
  IF COALESCE(v_settings.online_booking_auto_reserve_lounge, false) = true THEN
    FOR v_other_console IN SELECT * FROM public.consoles WHERE id <> p_console_id AND status NOT IN ('maintenance', 'disabled') FOR UPDATE LOOP
      INSERT INTO public.console_reservations (console_id, slot_range, source_type, source_id, is_active)
      VALUES (v_other_console.id, v_slot, 'booking', v_booking.id, true);
    END LOOP;
  END IF;

  RETURN v_booking;
END;
$$;

-- 2) Create walk-in session atomically (blocks console immediately + checks existing bookings)
CREATE OR REPLACE FUNCTION public.create_walkin_session_atomic(
  p_booking_code text,
  p_customer_name text,
  p_customer_phone text,
  p_console_id uuid,
  p_duration_minutes integer,
  p_start_timestamptz timestamptz,
  p_amount_collected numeric,
  p_payment_method text,
  p_staff_id uuid,
  p_notes text,
  p_transaction_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_console public.consoles%ROWTYPE;
  v_settings public.lounge_settings%ROWTYPE;
  v_local_start timestamp;
  v_booking_date date;
  v_start_time time;
  v_end_time time;
  v_expected_end timestamptz;
  v_slot tstzrange;
  v_booking public.bookings%ROWTYPE;
  v_walkin public.walkin_sessions%ROWTYPE;
  v_payment public.payments%ROWTYPE;
BEGIN
  SELECT * INTO v_console FROM public.consoles WHERE id = p_console_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Console not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_console.status IN ('maintenance', 'disabled') THEN
    RAISE EXCEPTION 'Cannot start walk-in on console in % status', v_console.status USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_settings FROM public.lounge_settings WHERE id = 1;
  v_expected_end := p_start_timestamptz + make_interval(mins => p_duration_minutes);
  v_local_start := p_start_timestamptz AT TIME ZONE 'Asia/Kolkata';
  v_booking_date := v_local_start::date;
  v_start_time := v_local_start::time;
  v_end_time := ((p_start_timestamptz + make_interval(mins => p_duration_minutes)) AT TIME ZONE 'Asia/Kolkata')::time;

  IF (p_start_timestamptz + make_interval(mins => p_duration_minutes))::date <> p_start_timestamptz::date
     AND v_end_time <= v_start_time THEN
    RAISE EXCEPTION 'Walk-in duration crosses midnight closing boundary' USING ERRCODE = 'P0001';
  END IF;

  v_slot := tstzrange(p_start_timestamptz, v_expected_end, '[)');

  INSERT INTO public.bookings (
    booking_code, customer_name, customer_phone, console_id, booking_date,
    start_time, end_time, duration, bonus_minutes, players, total_amount,
    booking_source, booking_status, payment_status, notes, created_by
  ) VALUES (
    p_booking_code, trim(p_customer_name), trim(p_customer_phone), p_console_id, v_booking_date,
    v_start_time, v_end_time, p_duration_minutes, 0, 1, p_amount_collected,
    'walkin', 'active', 'paid', p_notes, p_staff_id
  )
  RETURNING * INTO v_booking;

  INSERT INTO public.walkin_sessions (
    booking_id, customer_name, customer_phone, console_id, duration_minutes,
    start_time, expected_end_time, amount_collected, payment_method, payment_status,
    session_status, staff_id, notes
  ) VALUES (
    v_booking.id, trim(p_customer_name), trim(p_customer_phone), p_console_id, p_duration_minutes,
    p_start_timestamptz, v_expected_end, p_amount_collected, p_payment_method, 'paid',
    'active', p_staff_id, p_notes
  )
  RETURNING * INTO v_walkin;

  INSERT INTO public.console_reservations (console_id, slot_range, source_type, source_id, is_active)
  VALUES (p_console_id, v_slot, 'walkin', v_walkin.id, true);

  INSERT INTO public.payments (
    booking_type, booking_id, walkin_session_id, transaction_id, amount,
    payment_method, payment_status, paid_at, collected_by
  ) VALUES (
    'walkin', v_booking.id, v_walkin.id, p_transaction_id, p_amount_collected,
    p_payment_method, 'paid', now(), p_staff_id
  )
  RETURNING * INTO v_payment;

  IF p_start_timestamptz <= now() + interval '5 minutes' AND v_expected_end > now() THEN
    UPDATE public.consoles SET status = 'occupied' WHERE id = p_console_id;
  END IF;

  RETURN jsonb_build_object('booking', to_jsonb(v_booking), 'walkin', to_jsonb(v_walkin), 'payment', to_jsonb(v_payment));
END;
$$;

-- 3) Complete walk-in session atomically (frees console immediately)
CREATE OR REPLACE FUNCTION public.complete_walkin_session_atomic(
  p_walkin_id uuid
)
RETURNS public.walkin_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_walkin public.walkin_sessions%ROWTYPE;
  v_has_other_active boolean;
BEGIN
  SELECT * INTO v_walkin FROM public.walkin_sessions WHERE id = p_walkin_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Walk-in session not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.walkin_sessions
  SET session_status = 'completed',
      actual_end_time = now()
  WHERE id = p_walkin_id
  RETURNING * INTO v_walkin;

  IF v_walkin.booking_id IS NOT NULL THEN
    UPDATE public.bookings SET booking_status = 'completed' WHERE id = v_walkin.booking_id;
  END IF;

  UPDATE public.console_reservations
  SET is_active = false
  WHERE source_type = 'walkin' AND source_id = p_walkin_id;

  SELECT EXISTS (
    SELECT 1 FROM public.console_reservations
    WHERE console_id = v_walkin.console_id AND is_active = true AND slot_range @> now()
  ) INTO v_has_other_active;

  IF NOT v_has_other_active THEN
    UPDATE public.consoles
    SET status = 'available'
    WHERE id = v_walkin.console_id AND status = 'occupied';
  END IF;

  RETURN v_walkin;
END;
$$;

-- 4) Approve whole-lounge booking atomically (blocks BOTH PS4 and PS4 Pro)
CREATE OR REPLACE FUNCTION public.approve_group_booking_atomic(
  p_group_booking_id uuid,
  p_reviewer_id uuid
)
RETURNS public.group_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.group_bookings%ROWTYPE;
  v_console public.consoles%ROWTYPE;
  v_slot tstzrange;
  v_console_count integer := 0;
BEGIN
  SELECT * INTO v_group FROM public.group_bookings WHERE id = p_group_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Whole lounge booking request not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_group.booking_status = 'confirmed' THEN
    RETURN v_group;
  END IF;

  IF v_group.booking_status NOT IN ('pending') THEN
    RAISE EXCEPTION 'Only pending whole-lounge requests can be approved (current status: %)', v_group.booking_status USING ERRCODE = 'P0001';
  END IF;

  v_slot := public.ist_slot_range(v_group.booking_date, v_group.start_time, v_group.duration);

  FOR v_console IN SELECT * FROM public.consoles ORDER BY console_type FOR UPDATE LOOP
    v_console_count := v_console_count + 1;
    IF v_console.status IN ('maintenance', 'disabled') THEN
      RAISE EXCEPTION 'Cannot approve whole-lounge booking while % is in % status', v_console.name, v_console.status USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.console_reservations (console_id, slot_range, source_type, source_id, is_active)
    VALUES (v_console.id, v_slot, 'group_booking', v_group.id, true);
  END LOOP;

  IF v_console_count = 0 THEN
    RAISE EXCEPTION 'No consoles configured in database' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.group_bookings
  SET booking_status = 'confirmed',
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  WHERE id = p_group_booking_id
  RETURNING * INTO v_group;

  RETURN v_group;
END;
$$;

-- 5) Reschedule console booking atomically (prevents self-conflict and validates new slot)
CREATE OR REPLACE FUNCTION public.reschedule_booking_atomic(
  p_booking_id uuid,
  p_console_id uuid,
  p_booking_date date,
  p_start_time time,
  p_duration integer
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_console public.consoles%ROWTYPE;
  v_settings public.lounge_settings%ROWTYPE;
  v_end_time time;
  v_slot tstzrange;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Cannot reschedule a % booking', v_booking.booking_status USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_console FROM public.consoles WHERE id = p_console_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Console not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_console.status IN ('maintenance', 'disabled') THEN
    RAISE EXCEPTION 'Target console is currently in % status', v_console.status USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_settings FROM public.lounge_settings WHERE id = 1;
  v_end_time := (p_start_time + make_interval(mins => p_duration))::time;
  IF v_end_time <= p_start_time OR p_start_time < v_settings.opening_time OR v_end_time > v_settings.closing_time THEN
    RAISE EXCEPTION 'Selected schedule is outside lounge hours' USING ERRCODE = 'P0001';
  END IF;

  -- Temporarily deactivate existing reservation for this booking inside the transaction
  UPDATE public.console_reservations
  SET is_active = false
  WHERE source_type = 'booking' AND source_id = p_booking_id AND is_active = true;

  v_slot := public.ist_slot_range(p_booking_date, p_start_time, p_duration);

  -- Exclusion constraint checks all OTHER active bookings / walk-ins / group bookings
  INSERT INTO public.console_reservations (console_id, slot_range, source_type, source_id, is_active)
  VALUES (p_console_id, v_slot, 'booking', p_booking_id, true);

  UPDATE public.bookings
  SET console_id = p_console_id,
      booking_date = p_booking_date,
      start_time = p_start_time,
      end_time = v_end_time,
      duration = p_duration
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

-- 6) Release reservations when cancelling/completing a console or group booking
CREATE OR REPLACE FUNCTION public.sync_booking_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status IN ('cancelled', 'completed') THEN
    UPDATE public.console_reservations
    SET is_active = false
    WHERE source_type = 'booking' AND source_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_res ON public.bookings;
CREATE TRIGGER trg_sync_booking_res
  AFTER UPDATE OF booking_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_reservation_status();

CREATE OR REPLACE FUNCTION public.sync_group_booking_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status IN ('rejected', 'cancelled', 'completed') THEN
    UPDATE public.console_reservations
    SET is_active = false
    WHERE source_type = 'group_booking' AND source_id = NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_group_booking_res ON public.group_bookings;
CREATE TRIGGER trg_sync_group_booking_res
  AFTER UPDATE OF booking_status ON public.group_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_group_booking_reservation_status();

-- 7) Atomic tournament registration (prevents exceeding max_participants under concurrency)
CREATE OR REPLACE FUNCTION public.register_tournament_atomic(
  p_registration_code text,
  p_tournament_id uuid,
  p_participant_name text,
  p_phone text,
  p_gamer_tag text,
  p_payment_status text,
  p_notes text
)
RETURNS public.tournament_registrations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tourn public.tournaments%ROWTYPE;
  v_settings public.lounge_settings%ROWTYPE;
  v_count integer;
  v_status text;
  v_reg public.tournament_registrations%ROWTYPE;
BEGIN
  SELECT * INTO v_tourn FROM public.tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_tourn.is_published OR v_tourn.status <> 'registration_open' THEN
    RAISE EXCEPTION 'Registration is not open for this tournament' USING ERRCODE = 'P0001';
  END IF;

  IF now() > v_tourn.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.tournament_registrations
  WHERE tournament_id = p_tournament_id AND registration_status IN ('pending', 'approved');

  IF v_count >= v_tourn.max_participants THEN
    RAISE EXCEPTION 'Tournament is full (%/% slots filled)', v_count, v_tourn.max_participants USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_settings FROM public.lounge_settings WHERE id = 1;
  v_status := CASE WHEN COALESCE(v_settings.tournament_manual_approval, false) THEN 'pending' ELSE 'approved' END;

  INSERT INTO public.tournament_registrations (
    registration_code, tournament_id, participant_name, phone, gamer_tag,
    payment_status, registration_status, notes
  ) VALUES (
    p_registration_code, p_tournament_id, trim(p_participant_name), trim(p_phone),
    NULLIF(trim(COALESCE(p_gamer_tag, '')), ''), COALESCE(p_payment_status, 'pending'),
    v_status, p_notes
  )
  RETURNING * INTO v_reg;

  RETURN v_reg;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Public anon clients cannot inspect private customer/staff/payment data.
-- Authenticated staff/admin access via backend JWT verification + DB policies.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin', 'staff') AND is_active = true
  );
$$;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consoles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.walkin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.console_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read-only access ONLY to non-sensitive catalog tables
CREATE POLICY "Public can view consoles" ON public.consoles FOR SELECT USING (true);
CREATE POLICY "Public can view active pricing" ON public.pricing FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view published tournaments" ON public.tournaments FOR SELECT USING (is_published = true);

-- Staff/Admin policies
CREATE POLICY "Staff can read own profile or admin reads all"
  ON public.staff_profiles FOR SELECT
  USING (auth_user_id = auth.uid() OR public.is_active_admin());

CREATE POLICY "Admin manages staff profiles"
  ON public.staff_profiles FOR ALL
  USING (public.is_active_admin()) WITH CHECK (public.is_active_admin());

CREATE POLICY "Staff & admin read operational data"
  ON public.bookings FOR SELECT USING (public.is_active_staff());
CREATE POLICY "Staff & admin read group bookings"
  ON public.group_bookings FOR SELECT USING (public.is_active_staff());
CREATE POLICY "Staff & admin read walkins"
  ON public.walkin_sessions FOR SELECT USING (public.is_active_staff());
CREATE POLICY "Staff & admin read reservations"
  ON public.console_reservations FOR SELECT USING (public.is_active_staff());
CREATE POLICY "Staff & admin read registrations"
  ON public.tournament_registrations FOR SELECT USING (public.is_active_staff());
CREATE POLICY "Admin reads payments"
  ON public.payments FOR SELECT USING (public.is_active_admin());
CREATE POLICY "Admin reads audit logs"
  ON public.audit_logs FOR SELECT USING (public.is_active_admin());
CREATE POLICY "Staff reads lounge settings"
  ON public.lounge_settings FOR SELECT USING (public.is_active_staff());
CREATE POLICY "Admin updates lounge settings"
  ON public.lounge_settings FOR UPDATE USING (public.is_active_admin());
