import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  keepaliveToken: process.env.KEEPALIVE_TOKEN || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || "",
  // Backwards compatibility getters
  get supabaseAnonKey() {
    return this.supabasePublishableKey;
  },
  get supabaseServiceRoleKey() {
    return this.supabaseSecretKey;
  },
  cashfreeAppId: process.env.CASHFREE_APP_ID || process.env.CASHFREE_CLIENT_ID || "",
  cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY || process.env.CASHFREE_CLIENT_SECRET || "",
  cashfreeEnv: (process.env.CASHFREE_ENV || process.env.CASHFREE_MODE || "sandbox").toLowerCase(),
  cashfreeApiVersion: process.env.CASHFREE_API_VERSION || "2023-08-01",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey && env.supabasePublishableKey);
}

export function isCashfreeConfigured() {
  return Boolean(env.cashfreeAppId && env.cashfreeSecretKey);
}

let _adminClient = null;
let _authClient = null;

/**
 * Secret key Supabase client (replaces legacy service-role client) — strictly backend-only.
 * Bypasses RLS to execute atomic RPCs and protected administrative queries
 * AFTER backend JWT + RBAC authorization has passed.
 */
export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseSecretKey) {
    throw new Error("Supabase backend configuration missing: set SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env");
  }
  if (!_adminClient) {
    _adminClient = createClient(env.supabaseUrl, env.supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}

/**
 * Publishable key Supabase client (replaces legacy anon client) — used solely on backend for Supabase Auth user login/password flows.
 */
export function getSupabaseAuth() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase auth configuration missing: set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in backend/.env");
  }
  if (!_authClient) {
    _authClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _authClient;
}
