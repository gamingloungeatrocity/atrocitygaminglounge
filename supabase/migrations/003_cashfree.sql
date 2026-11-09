-- Migration 003: Add Cashfree Payment Gateway columns & update payment method constraint
-- Run in Supabase SQL editor if your database already ran 001_schema.sql

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cashfree_order_id text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cashfree_payment_id text;

CREATE INDEX IF NOT EXISTS idx_payments_cf_order ON public.payments(cashfree_order_id);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('cashfree', 'cash', 'upi'));

