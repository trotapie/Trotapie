import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Action = 'upsert' | 'remove' | 'get-role' | 'get-roles' | 'complete-first-login';

type Payload = {
  action?: Action;
  empleadoId?: number;
  email?: string;
  password?: string;
  nombre?: string;
  roleId?: number;
  empleadoIds?: number[];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ ok: false, message: 'Metodo no permitido.' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ ok: false, message: 'Faltan variables de entorno de Supabase.' }, 500);
    }

    const authorization = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: currentUserData, error: currentUserError } = await userClient.auth.getUser();
    const currentUser = currentUserData?.user;
    if (currentUserError || !currentUser) {
      return json({ ok: false, message: 'Sesion invalida.' }, 401);
    }

    const body = (await req.json()) as Payload;

    if (body.action === 'complete-first-login') {
      return await completeFirstLogin(adminClient, currentUser.id, body);
    }

  const { data: currentProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .maybeSingle();

    if (profileError || currentProfile?.role !== 'admin') {
      return json({ ok: false, message: 'No tienes permisos para administrar usuarios.' }, 403);
    }

    if (body.action === 'get-roles') {
      return await getEmployeesRoles(adminClient, body.empleadoIds ?? []);
    }

    const empleadoId = Number(body.empleadoId);
    if (!Number.isFinite(empleadoId) || empleadoId <= 0) {
      return json({ ok: false, message: 'Empleado invalido.' }, 400);
    }

    if (body.action === 'remove') {
      return await removeAccess(adminClient, empleadoId);
    }

    if (body.action === 'get-role') {
      return await getEmployeeRole(adminClient, empleadoId);
    }

    return await upsertAccess(adminClient, empleadoId, body);
  } catch (error) {
    return json({
      ok: false,
      message: error instanceof Error ? error.message : 'Error interno.',
    }, 500);
  }
});

async function upsertAccess(adminClient: any, empleadoId: number, body: Payload): Promise<Response> {
  const email = normalizeEmail(body.email);
  const nombre = String(body.nombre ?? '').trim() || email;
  const roleId = sanitizePositiveId(body.roleId);

  if (!isValidEmail(email)) {
    return json({ ok: false, message: 'Ingresa un correo valido.' }, 400);
  }

  const { data: empleado, error: empleadoError } = await adminClient
    .from('empleados')
    .select('id, nombre, email, auth_user_id, primera_vez_login')
    .eq('id', empleadoId)
    .maybeSingle();

  if (empleadoError || !empleado) {
    return json({ ok: false, message: 'No se encontro el empleado.' }, 404);
  }

  let userId = empleado.auth_user_id as string | null;
  let temporaryPassword: string | undefined;
  let shouldRequireFirstLogin = Boolean(empleado.primera_vez_login);
  let profileFirstLogin = false;

  if (userId) {
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('primera_vez_login')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;
    profileFirstLogin = Boolean(profile?.primera_vez_login);
    shouldRequireFirstLogin = shouldRequireFirstLogin || profileFirstLogin;
  }

  if (userId) {
    const updatePayload: Record<string, unknown> = {
      email,
      user_metadata: { name: nombre, full_name: nombre },
    };

    if (shouldRequireFirstLogin) {
      temporaryPassword = generateTemporaryPassword();
      updatePayload.password = temporaryPassword;
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(userId, updatePayload);
    if (error) throw error;
    userId = data.user.id;
  } else {
    const existingUser = await findUserByEmail(adminClient, email);

    if (existingUser) {
      userId = existingUser.id;
      const { data: profile, error: profileError } = await adminClient
        .from('profiles')
        .select('primera_vez_login')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      profileFirstLogin = Boolean(profile?.primera_vez_login);
      shouldRequireFirstLogin = shouldRequireFirstLogin || profileFirstLogin;

      const updatePayload: Record<string, unknown> = {
        user_metadata: { name: nombre, full_name: nombre },
      };

      if (shouldRequireFirstLogin) {
        temporaryPassword = generateTemporaryPassword();
        updatePayload.password = temporaryPassword;
      }

      const { error } = await adminClient.auth.admin.updateUserById(userId, updatePayload);
      if (error) throw error;
    } else {
      temporaryPassword = generateTemporaryPassword();
      shouldRequireFirstLogin = true;

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { name: nombre, full_name: nombre },
      });
      if (error) throw error;
      userId = data.user.id;
    }
  }

  const primaryRole = await resolveRoleKey(adminClient, roleId) ?? 'empleado';

  const { error: profileError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: userId,
        full_name: nombre,
        role: primaryRole,
        primera_vez_login: shouldRequireFirstLogin,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  if (profileError) throw profileError;

  const empleadoUpdate: Record<string, unknown> = {
    auth_user_id: userId,
    email,
    primera_vez_login: shouldRequireFirstLogin,
  };

  const { data: updatedEmpleado, error: updateEmpleadoError } = await adminClient
    .from('empleados')
    .update(empleadoUpdate)
    .eq('id', empleadoId)
    .select('id, nombre, estatus_id, email, auth_user_id, primera_vez_login')
    .single();

  if (updateEmpleadoError) throw updateEmpleadoError;

  return json({
    ok: true,
    empleado: updatedEmpleado,
    temporaryPassword,
  });
}

async function resolveRoleKey(adminClient: any, roleId: number | null): Promise<string | null> {
  if (!Number.isFinite(roleId ?? NaN)) {
    return null;
  }

  const { data, error } = await adminClient
    .from('roles')
    .select('key')
    .eq('id', roleId)
    .maybeSingle();
  if (error) throw error;

  return data?.key ? String(data.key) : null;
}

async function getEmployeeRole(adminClient: any, empleadoId: number): Promise<Response> {
  const { data: empleado, error: empleadoError } = await adminClient
    .from('empleados')
    .select('auth_user_id')
    .eq('id', empleadoId)
    .maybeSingle();
  if (empleadoError) throw empleadoError;

  const userId = String(empleado?.auth_user_id ?? '').trim();
  if (!userId) {
    return json({ ok: true, roleId: null });
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const roleKey = String(profile?.role ?? '').trim();
  if (!roleKey) {
    return json({ ok: true, roleId: null });
  }

  const { data: role, error: roleError } = await adminClient
    .from('roles')
    .select('id')
    .eq('key', roleKey)
    .maybeSingle();
  if (roleError) throw roleError;

  return json({ ok: true, roleId: role?.id ?? null });
}

async function getEmployeesRoles(adminClient: any, empleadoIds: number[]): Promise<Response> {
  const ids = [...new Set(empleadoIds.map(Number).filter((id) => Number.isFinite(id) && id > 0))];
  if (!ids.length) {
    return json({ ok: true, roleIds: {} });
  }

  const { data: empleados, error: empleadosError } = await adminClient
    .from('empleados')
    .select('id, auth_user_id')
    .in('id', ids);
  if (empleadosError) throw empleadosError;

  const userIds = (empleados ?? [])
    .map((empleado: { auth_user_id?: string | null }) => String(empleado.auth_user_id ?? '').trim())
    .filter(Boolean);
  if (!userIds.length) {
    return json({ ok: true, roleIds: {} });
  }

  const { data: profiles, error: profilesError } = await adminClient
    .from('profiles')
    .select('id, role')
    .in('id', userIds);
  if (profilesError) throw profilesError;

  const roleKeys = [...new Set((profiles ?? []).map((profile: { role?: string | null }) => String(profile.role ?? '').trim()).filter(Boolean))];
  const { data: roles, error: rolesError } = roleKeys.length
    ? await adminClient.from('roles').select('id, key').in('key', roleKeys)
    : { data: [], error: null };
  if (rolesError) throw rolesError;

  const roleIdByKey = new Map((roles ?? []).map((role: { id: number; key: string }) => [role.key, role.id]));
  const roleKeyByUserId = new Map((profiles ?? []).map((profile: { id: string; role: string | null }) => [profile.id, profile.role]));
  const roleIds = Object.fromEntries((empleados ?? []).map((empleado: { id: number; auth_user_id: string | null }) => [
    empleado.id,
    roleIdByKey.get(String(roleKeyByUserId.get(empleado.auth_user_id ?? '') ?? '')) ?? null,
  ]));

  return json({ ok: true, roleIds });
}

async function removeAccess(adminClient: any, empleadoId: number): Promise<Response> {
  const { data: empleado, error: empleadoError } = await adminClient
    .from('empleados')
    .select('id, auth_user_id')
    .eq('id', empleadoId)
    .maybeSingle();

  if (empleadoError || !empleado) {
    return json({ ok: false, message: 'No se encontro el empleado.' }, 404);
  }

  const userId = empleado.auth_user_id as string | null;

  const { error: updateError } = await adminClient
    .from('empleados')
    .update({ auth_user_id: null, email: null, primera_vez_login: false })
    .eq('id', empleadoId);
  if (updateError) throw updateError;

  if (userId) {
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  }

  return json({ ok: true });
}

async function completeFirstLogin(adminClient: any, userId: string, body: Payload): Promise<Response> {
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ primera_vez_login: false, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: empleadoError } = await adminClient
    .from('empleados')
    .update({ primera_vez_login: false })
    .eq('auth_user_id', userId);
  if (empleadoError) throw empleadoError;

  return json({ ok: true });
}

async function findUserByEmail(adminClient: any, email: string): Promise<{ id: string } | null> {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const user = data.users.find((item: any) => normalizeEmail(item.email) === email);
    if (user) {
      return { id: user.id };
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const symbols = '!#$%*?';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const base = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
  const symbol = symbols[crypto.getRandomValues(new Uint8Array(1))[0] % symbols.length];
  return `${base}${symbol}1`;
}

function sanitizePositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
