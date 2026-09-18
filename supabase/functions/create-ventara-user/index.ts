import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = ["Administrador", "Supervisor", "Cajero", "Inventario"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) throw new Error("No autenticado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuración de Supabase incompleta");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: caller }, error: callerError } = await adminClient.auth.getUser(token);
    if (callerError || !caller) throw new Error("Sesión no válida");

    const { data: callerAccount, error: callerAccountError } = await adminClient
      .from("ventara_accounts")
      .select("id, company_id, role, active")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (callerAccountError) throw callerAccountError;
    if (!callerAccount || !callerAccount.active || callerAccount.role !== "Administrador") {
      throw new Error("Solo un Administrador puede administrar usuarios");
    }

    const body = await req.json();
    const action = String(body.action || "create");

    if (action === "create") {
      const username = String(body.username || "").trim().toLowerCase();
      const fullName = String(body.fullName || "").trim();
      const password = String(body.password || "");
      const role = String(body.role || "Cajero");
      const active = body.active !== false;

      if (!username) throw new Error("El usuario es obligatorio");
      if (!fullName) throw new Error("El nombre es obligatorio");
      if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error("Usuario inválido");
      if (password.length < 6) throw new Error("La contraseña debe tener mínimo 6 caracteres");
      if (!allowedRoles.includes(role)) throw new Error("Rol inválido");

      const { data: existingAccount, error: existingError } = await adminClient
        .from("ventara_accounts").select("id").eq("username", username).maybeSingle();
      if (existingError) throw existingError;
      if (existingAccount) throw new Error("Ese usuario ya existe");

      const authEmail = `${username}@login.ventara.app`;
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, username },
      });
      if (createUserError || !createdUser.user) {
        throw createUserError || new Error("No se pudo crear el usuario en Supabase Auth");
      }

      const newUserId = createdUser.user.id;
      const { error: accountError } = await adminClient.from("ventara_accounts").insert({
        user_id: newUserId,
        company_id: callerAccount.company_id,
        username,
        full_name: fullName,
        role,
        active,
      });

      if (accountError) {
        await adminClient.auth.admin.deleteUser(newUserId);
        throw accountError;
      }

      return new Response(JSON.stringify({
        success: true, action: "create", userId: newUserId, username, fullName, role, active,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = String(body.userId || "").trim();
    if (!userId) throw new Error("Usuario objetivo no especificado");
    if (userId === caller.id) throw new Error("No puedes modificar o eliminar tu propio usuario");

    const { data: targetAccount, error: targetError } = await adminClient
      .from("ventara_accounts")
      .select("id, user_id, company_id, username, full_name, role, active")
      .eq("user_id", userId)
      .eq("company_id", callerAccount.company_id)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!targetAccount) throw new Error("El usuario no existe en esta empresa");

    if (action === "update") {
      const fullName = String(body.fullName ?? targetAccount.full_name ?? "").trim();
      const role = String(body.role ?? targetAccount.role);
      const active = body.active !== false;

      if (!fullName) throw new Error("El nombre es obligatorio");
      if (!allowedRoles.includes(role)) throw new Error("Rol inválido");

      const { error: updateError } = await adminClient
        .from("ventara_accounts")
        .update({ full_name: fullName, role, active, updated_at: new Date().toISOString() })
        .eq("id", targetAccount.id)
        .eq("company_id", callerAccount.company_id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({
        success: true, action: "update", userId, username: targetAccount.username,
        fullName, role, active,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      await adminClient.from("company_users").delete()
        .eq("user_id", userId).eq("company_id", callerAccount.company_id);

      const { error: accountDeleteError } = await adminClient
        .from("ventara_accounts").delete()
        .eq("id", targetAccount.id).eq("company_id", callerAccount.company_id);
      if (accountDeleteError) throw accountDeleteError;

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        await adminClient.from("ventara_accounts").insert({
          id: targetAccount.id,
          user_id: targetAccount.user_id,
          company_id: targetAccount.company_id,
          username: targetAccount.username,
          full_name: targetAccount.full_name,
          role: targetAccount.role,
          active: targetAccount.active,
        });
        throw authDeleteError;
      }

      return new Response(JSON.stringify({
        success: true, action: "delete", userId, username: targetAccount.username,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Acción no válida");
  } catch (error) {
    console.error("create-ventara-user:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "No se pudo administrar el usuario",
    }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});