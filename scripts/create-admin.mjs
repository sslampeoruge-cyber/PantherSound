// Crea (o actualiza) el primer administrador usando la service_role key.
//
// Uso:
//   SUPABASE_URL="https://xxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="..." \
//   ADMIN_EMAIL="cervantesbv@gmail.com" \
//   ADMIN_PASSWORD="una-contraseña-segura" \
//   ADMIN_NAME="Administrador" \
//   node scripts/create-admin.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const fullName = process.env.ADMIN_NAME ?? "Administrador";

if (!url || !serviceKey) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!email || password.length < 8) {
  console.error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres).");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("No se pudieron listar los usuarios:", listError.message);
  process.exit(1);
}

const existing = list.users.find((user) => user.email?.toLowerCase() === email);
let userId = existing?.id;

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    console.error("No se pudo actualizar el usuario:", error.message);
    process.exit(1);
  }
  console.log(`Usuario existente actualizado: ${email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) {
    console.error("No se pudo crear el usuario:", error?.message);
    process.exit(1);
  }
  userId = data.user.id;
  console.log(`Usuario creado: ${email}`);
}

const { error: profileError } = await admin
  .from("profiles")
  .update({ full_name: fullName, role: "admin", active: true })
  .eq("id", userId);

if (profileError) {
  console.error("No se pudo actualizar el perfil:", profileError.message);
  process.exit(1);
}

console.log("Administrador listo. Ya puedes iniciar sesión.");
