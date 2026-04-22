// One-shot, idempotent bootstrap for the SMS Gateway admin.
// Creates the Supabase Auth user (email-confirmed) and grants the 'admin' role.
// Safe to call multiple times; returns { ok: true, user_id }.
//
// Protected by a shared secret header so it can't be abused after deploy.
//   Header: x-bootstrap-token: <BOOTSTRAP_ADMIN_TOKEN>
//
// You can drop this function later; it's only here so we don't need to ask the
// user to click through the Cloud Users panel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
};

const ADMIN_EMAIL = "prakash.chinnadurai@gmail.com";
const ADMIN_PASSWORD = "Chandra@1408";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("BOOTSTRAP_ADMIN_TOKEN");
  const provided = req.headers.get("x-bootstrap-token") || "";
  if (!expected || provided !== expected) {
    return json(401, { error: "Unauthorized" });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Find or create the user
  let userId: string | null = null;
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing?.users?.find((u) => (u.email || "").toLowerCase() === ADMIN_EMAIL);
  if (found) {
    userId = found.id;
    // Make sure password matches and email is confirmed
    await admin.auth.admin.updateUserById(found.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return json(500, { error: createErr?.message || "Failed to create admin user" });
    }
    userId = created.user.id;
  }

  // 2. Ensure the 'admin' role assignment exists
  const { error: roleErr } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) return json(500, { error: roleErr.message });

  return json(200, { ok: true, user_id: userId });
});
