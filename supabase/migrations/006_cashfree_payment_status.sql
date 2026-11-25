-- Apply Cashfree payment transitions and their linked booking status atomically.
CREATE OR REPLACE FUNCTION public.apply_cashfree_payment_status(
  p_payment_id uuid,
  p_payment_status text,
  p_cashfree_payment_id text DEFAULT NULL,
  p_paid_at timestamptz DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF p_payment_status IS NULL OR p_payment_status NOT IN ('pending', 'paid', 'failed') THEN
    RAISE EXCEPTION 'Invalid Cashfree payment status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND payment_method = 'cashfree'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cashfree payment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.payment_status IN ('paid', 'refunded')
     OR (v_payment.payment_status = 'failed' AND p_payment_status = 'pending') THEN
    RETURN v_payment;
  END IF;

  UPDATE public.payments
  SET payment_status = p_payment_status,
      cashfree_payment_id = COALESCE(p_cashfree_payment_id, cashfree_payment_id),
      paid_at = CASE WHEN p_payment_status = 'paid' THEN COALESCE(p_paid_at, now()) ELSE paid_at END,
      metadata = metadata || COALESCE(p_metadata, '{}'::jsonb),
      updated_at = now()
  WHERE id = p_payment_id
  RETURNING * INTO v_payment;

  IF v_payment.booking_type = 'console' AND v_payment.booking_id IS NOT NULL THEN
    UPDATE public.bookings
    SET payment_status = p_payment_status
    WHERE id = v_payment.booking_id AND payment_status NOT IN ('paid', 'refunded');
  ELSIF v_payment.booking_type = 'group' AND v_payment.group_booking_id IS NOT NULL THEN
    UPDATE public.group_bookings
    SET payment_status = p_payment_status
    WHERE id = v_payment.group_booking_id AND payment_status NOT IN ('paid', 'refunded');
  ELSIF v_payment.booking_type = 'tournament' AND v_payment.tournament_registration_id IS NOT NULL THEN
    UPDATE public.tournament_registrations
    SET payment_status = p_payment_status
    WHERE id = v_payment.tournament_registration_id AND payment_status NOT IN ('paid', 'refunded');
  END IF;

  RETURN v_payment;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_cashfree_payment_status(uuid, text, text, timestamptz, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_cashfree_payment_status(uuid, text, text, timestamptz, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_cashfree_payment_status(uuid, text, text, timestamptz, jsonb) TO service_role;
