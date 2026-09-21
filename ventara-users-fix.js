/*
 * VENTARA — parche de usuarios
 * La creación de usuarios se ejecuta directamente desde saveUser() en index.html.
 * Se elimina la captura duplicada de clics para no bloquear el botón ni competir
 * con la lógica nativa. El guard de autenticación permanece intacto debajo.
 */
/*
 * VENTARA — guardia quirúrgica de autenticación.
 * Se mantiene dentro del parche externo ya cargado para NO tocar index.html.
 * No elimina sesiones ni llama signOut() durante un intento de login fallido.
 */
(() => {
  'use strict';

  const installLoginGuard = () => {
    if (window.__ventaraLoginGuardInstalled) return;
    if (typeof window.login !== 'function') return;

    const safeLogin = async (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
      }

      const usernameEl = document.getElementById('loginUsername');
      const passwordEl = document.getElementById('loginPassword');
      const msg = document.getElementById('loginMsg');
      const username = String(usernameEl?.value || '').trim().toLowerCase();
      const password = String(passwordEl?.value || '');

      if (!msg) return;
      if (!username || !password) {
        msg.textContent = 'Escribe usuario y contraseña.';
        return;
      }

      msg.textContent = 'Verificando…';

      try {
        let email = '';

        try {
          const { data: emailData } = await supabaseClient.rpc('ventara_auth_email', {
            p_username: username
          });
          email = (emailData?.email || emailData || '').toString().trim().toLowerCase();
        } catch (rpcError) {
          console.warn('RPC no disponible; probando correo técnico', rpcError);
        }

        if (!email) email = `${username}@login.ventara.app`;

        let { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error && email !== `${username}@login.ventara.app`) {
          const retry = await supabaseClient.auth.signInWithPassword({
            email: `${username}@login.ventara.app`,
            password
          });
          data = retry.data;
          error = retry.error;
        }

        if (error) throw error;
        if (!data?.session) throw new Error('Supabase no devolvió una sesión válida.');

        currentSession = data.session;

        /*
         * loadAccount() puede fallar por datos de cuenta/RLS/estado.
         * Ese error NO debe cerrar la sesión recién autenticada.
         */
        try {
          await loadAccount();
        } catch (accountError) {
          console.error('VENTARA login: autenticación correcta, pero no se pudo cargar la cuenta', accountError);
          msg.textContent = accountError?.message
            ? `Sesión autenticada, pero no se pudo cargar la cuenta: ${accountError.message}`
            : 'Sesión autenticada, pero no se pudo cargar la cuenta.';
          return;
        }

        msg.textContent = '';
        enterApp();
        if (typeof window.toast === 'function') window.toast('Sesión iniciada correctamente');
      } catch (e) {
        console.error('VENTARA login error:', e);

        /*
         * CRÍTICO: no ejecutar supabaseClient.auth.signOut() aquí.
         * Un error de credenciales/carga no debe borrar el token persistido.
         */
        const code = e?.code || '';
        const detail = e?.message || '';

        if (code === 'invalid_credentials' || code === 'invalid_grant') {
          msg.textContent = 'Usuario o contraseña incorrectos.';
        } else if (detail) {
          msg.textContent = `No se pudo iniciar sesión: ${detail}`;
        } else {
          msg.textContent = 'No se pudo iniciar sesión. Revisa la conexión con VENTARA.';
        }
      }
    };

    window.login = safeLogin;
    window.__ventaraLoginGuardInstalled = true;

    document.addEventListener('submit', (e) => {
      const form = e.target;
      if (!form?.closest?.('#loginScreen')) return;
      safeLogin(e);
    }, true);

    document.addEventListener('click', (e) => {
      const button = e.target?.closest?.('.login-btn, button[onclick*="login"]');
      if (!button) return;
      if (!button.closest('#loginScreen')) return;
      safeLogin(e);
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      if (!e.target?.closest?.('#loginScreen')) return;
      safeLogin(e);
    }, true);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installLoginGuard, { once: true });
  } else {
    installLoginGuard();
  }

  new MutationObserver(installLoginGuard).observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();
