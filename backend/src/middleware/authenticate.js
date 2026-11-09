import { getSupabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/errors.js";

export function extractBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return null;
}

/**
 * Verifies the Supabase Auth JWT independently on the server and loads the
 * corresponding active staff_profile + lounge_settings permissions.
 */
export function createAuthenticateMiddleware({
  verifyToken = async (token) => {
    const supabase = getSupabaseAdmin();
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) {
      throw new ApiError(401, "INVALID_TOKEN", "Session expired or invalid authentication token.");
    }
    const { data: profile, error: profErr } = await supabase
      .from("staff_profiles")
      .select("*")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle();

    if (profErr) throw profErr;
    if (!profile) {
      throw new ApiError(403, "NO_STAFF_PROFILE", "Account is not authorized for lounge operations.");
    }
    if (!profile.is_active) {
      throw new ApiError(403, "ACCOUNT_DEACTIVATED", "Your staff account has been deactivated by an administrator.");
    }

    const { data: settings } = await supabase.from("lounge_settings").select("*").eq("id", 1).maybeSingle();
    return { user: authData.user, profile, settings: settings || {} };
  },
} = {}) {
  return async function authenticate(req, _res, next) {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return next(new ApiError(401, "AUTH_REQUIRED", "Authentication token is required."));
      }
      const { user, profile, settings } = await verifyToken(token);
      req.accessToken = token;
      req.user = user;
      req.staffProfile = profile;
      req.loungeSettings = settings;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export const authenticate = createAuthenticateMiddleware();
