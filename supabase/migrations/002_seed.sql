-- ============================================================================
-- Atrocity Gaming Lounge — Seed Data
-- Run AFTER 001_schema.sql in your Supabase SQL Editor.
-- ============================================================================

-- 1. Default lounge settings
INSERT INTO public.lounge_settings (
  id, lounge_name, opening_time, closing_time,
  staff_can_approve_group_bookings,
  staff_can_cancel_bookings,
  staff_can_update_console_status,
  staff_can_manage_tournaments,
  tournament_manual_approval,
  online_booking_auto_reserve_lounge
) VALUES (
  1, 'Atrocity Gaming Lounge', '10:00:00', '22:00:00',
  false, true, true, false, false, false
)
ON CONFLICT (id) DO NOTHING;

-- 2. Consoles (1 PS4 + 1 PS4 Pro)
INSERT INTO public.consoles (slug, name, console_type, description, specs, status)
VALUES
  (
    'ps4',
    'PlayStation 4',
    'PS4',
    'Smooth Full HD gaming with DualShock 4 wireless controllers and full game library access.',
    '{"resolution":"1080p Full HD","gpu":"1.84 TFLOPS","memory":"8GB GDDR5","controller":"DualShock 4"}'::jsonb,
    'available'
  ),
  (
    'ps4pro',
    'PlayStation 4 Pro',
    'PS4 Pro',
    '4K-ready output with HDR and boosted frame rates on Pro-enhanced games.',
    '{"resolution":"Up to 4K","gpu":"4.2 TFLOPS","memory":"8GB + 1GB","visuals":"HDR · Boost Mode"}'::jsonb,
    'available'
  )
ON CONFLICT (slug) DO NOTHING;

-- 3. Dynamic Pricing Configuration
INSERT INTO public.pricing (category, label, duration_minutes, bonus_minutes, price, is_active, sort_order)
VALUES
  -- PlayStation 4 rates
  ('ps4', '30 Minutes', 30, 0, 40.00, true, 1),
  ('ps4', '1 Hour', 60, 0, 70.00, true, 2),
  ('ps4', '2 Hours', 120, 0, 140.00, true, 3),
  ('ps4', '3 Hours Package', 180, 15, 200.00, true, 4),
  ('ps4', '5 Hours Day Pass', 300, 30, 350.00, true, 5),

  -- PlayStation 4 Pro rates
  ('ps4pro', '30 Minutes', 30, 0, 55.00, true, 1),
  ('ps4pro', '1 Hour', 60, 0, 90.00, true, 2),
  ('ps4pro', '2 Hours', 120, 0, 180.00, true, 3),
  ('ps4pro', '3 Hours Package', 180, 15, 230.00, true, 4),
  ('ps4pro', '5 Hours Day Pass', 300, 30, 380.00, true, 5),

  -- Whole lounge reservation pricing
  ('whole_lounge', 'Whole Lounge (Flat / 3 Hours)', 180, 0, 2500.00, true, 1),
  ('whole_lounge', 'Whole Lounge (1 Hour Exclusive)', 60, 0, 2500.00, true, 2),

  -- Default tournament entry fee
  ('tournament', 'Standard Tournament Entry Fee', 0, 0, 100.00, true, 1)
ON CONFLICT DO NOTHING;
