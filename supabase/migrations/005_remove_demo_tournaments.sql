-- Remove the original demo tournaments. Admin-created tournaments are preserved.
DELETE FROM public.tournaments
WHERE slug IN ('fc27-knockout-cup', 'mk11-fight-night', 'wwe-2k-rumble')
  AND title IN ('FC27 Knockout Cup', 'MK11 Fight Night', 'WWE 2K Rumble');
