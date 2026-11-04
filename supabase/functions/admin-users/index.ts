import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const validRoles = ["admin", "vendedor", "consulta"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Faltan variables de entorno de Supabase." }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "No autorizado." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.active) {
    return json({ error: "Solo un administrador puede gestionar usuarios." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Cuerpo de la petición inválido." }, 400);
  }

  const action = String(body.action ?? "");

  if (action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const role = validRoles.includes(String(body.role)) ? String(body.role) : "consulta";

    if (!email || !password || password.length < 8) {
      return json(
        { error: "Correo y contraseña (mínimo 8 caracteres) son obligatorios." },
        400,
      );
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) return json({ error: error.message }, 400);

    const { error: profileError } = await admin
      .from("profiles")
      .update({ full_name: fullName, role, active: true })
      .eq("id", data.user.id);

    if (profileError) return json({ error: profileError.message }, 400);

    return json({ ok: true, id: data.user.id });
  }

  if (action === "update") {
    const id = String(body.id ?? "");
    if (!id) return json({ error: "Falta el id del usuario." }, 400);

    const patch: Record<string, unknown> = {};
    if (typeof body.fullName === "string") patch.full_name = body.fullName.trim();
    if (validRoles.includes(String(body.role))) patch.role = String(body.role);
    if (typeof body.active === "boolean") patch.active = body.active;

    if (Object.keys(patch).length === 0) {
      return json({ error: "No hay cambios para guardar." }, 400);
    }

    if (id === user.id && patch.active === false) {
      return json({ error: "No puedes desactivar tu propia cuenta." }, 400);
    }
    if (id === user.id && patch.role && patch.role !== "admin") {
      return json({ error: "No puedes quitarte el rol de administrador." }, 400);
    }

    const { error } = await admin.from("profiles").update(patch).eq("id", id);
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  }

  if (action === "reset-password") {
    const id = String(body.id ?? "");
    const password = String(body.password ?? "");

    if (!id || password.length < 8) {
      return json({ error: "La contraseña debe tener al menos 8 caracteres." }, 400);
    }

    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  }

  return json({ error: "Acción desconocida." }, 400);
});
