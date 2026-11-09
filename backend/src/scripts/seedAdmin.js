import "dotenv/config";
import { getSupabaseAdmin } from "../config/supabase.js";

/**
 * Creates the initial Admin user in Supabase Auth + `staff_profiles`
 * using credentials supplied via environment variables (never hardcoded!).
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=StrongPassword123! ADMIN_FULL_NAME="Owner" npm run seed:admin
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const fullName = (process.env.ADMIN_FULL_NAME || "Lounge Administrator").trim();

  if (!email || password.length < 8) {
    console.error("Set ADMIN_EMAIL and a strong ADMIN_PASSWORD (min 8 chars) in backend/.env or environment.");
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();

  const { data: existingProfile } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    console.log(`Admin profile already exists for ${email} (role: ${existingProfile.role}).`);
    process.exit(0);
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "admin" },
  });

  if (authErr || !authData?.user) {
    console.error("Failed to create Supabase Auth user:", authErr?.message);
    process.exit(1);
  }

  const { error: profErr } = await supabase.from("staff_profiles").insert({
    auth_user_id: authData.user.id,
    full_name: fullName,
    email,
    role: "admin",
    is_active: true,
  });

  if (profErr) {
    console.error("Failed to insert staff_profiles row:", profErr.message);
    await supabase.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  console.log(`Admin user created cleanly for ${email}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
