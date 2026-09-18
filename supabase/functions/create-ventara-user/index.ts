import { withSupabase } from 'npm:@supabase/server'

export default {
  fetch: withSupabase({ auth: 'user' }, async (req, ctx) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }

    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

    try {
      const { supabaseAdmin, userClaims } = ctx
      const callerId = userClaims?.sub
      if (!callerId) throw new Error('Sesión no válida')

      const { data: callerAccount, error: accountError } = await supabaseAdmin
        .from('ventara_accounts')
        .select('company_id, role, active')
        .eq('user_id', callerId)
        .single()

      if (accountError || !callerAccount?.active || callerAccount.role !== 'Administrador') {
        return new Response(JSON.stringify({ error: 'Solo un Administrador puede crear usuarios.' }), {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }

      const body = await req.json()
      const username = String(body.username || '').trim().toLowerCase()
      const fullName = String(body.fullName || '').trim()
      const password = String(body.password || '')
      const role = String(body.role || 'Cajero')
      const active = body.active !== false

      if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new Error('Usuario inválido')
      if (!fullName) throw new Error('El nombre es obligatorio')
      if (password.length < 6) throw new Error('La contraseña debe tener mínimo 6 caracteres')
      if (!['Administrador', 'Supervisor', 'Cajero', 'Inventario'].includes(role)) throw new Error('Rol inválido')

      const authEmail = `${username}@login.ventara.app`

      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          ventara_username: username,
          full_name: fullName,
          role,
          company_id: callerAccount.company_id,
        },
      })
      if (createError) throw createError

      const { error: insertError } = await supabaseAdmin.from('ventara_accounts').insert({
        user_id: created.user.id,
        company_id: callerAccount.company_id,
        username,
        full_name: fullName,
        role,
        active,
      })

      if (insertError) {
        await supabaseAdmin.auth.admin.deleteUser(created.user.id)
        throw insertError
      }

      return new Response(JSON.stringify({ ok: true, userId: created.user.id, username }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    } catch (e) {
      console.error('create-ventara-user error', e)
      return new Response(JSON.stringify({ error: e?.message || 'Error creando usuario' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
  }),
}
