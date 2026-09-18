(() => {
  'use strict';

  // VENTARA — parche aislado para Nuevo usuario.
  // No modifica index.html ni reemplaza la lógica global de autenticación.
  let isSubmitting = false;
  let installed = false;

  const getClient = () => {
    try { return window.supabaseClient || null; } catch (_) { return null; }
  };

  const getCurrentUser = () => {
    try { return window.currentUser || null; } catch (_) { return null; }
  };

  const get = (id) => document.getElementById(id);

  const findSaveButton = () => {
    const modal = get('modal');
    if (!modal || !modal.classList.contains('show')) return null;
    const box = get('modalbox') || modal;
    return [...box.querySelectorAll('button')].find((b) => {
      const text = (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text === 'guardar usuario' || text.includes('guardar usuario');
    }) || null;
  };

  const setSaving = (button, saving) => {
    if (!button) return;
    if (saving) {
      if (!button.dataset.ventaraOriginalText) {
        button.dataset.ventaraOriginalText = button.textContent;
      }
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.textContent = 'Guardando...';
    } else {
      button.disabled = false;
      button.removeAttribute('aria-disabled');
      if (button.dataset.ventaraOriginalText) {
        button.textContent = button.dataset.ventaraOriginalText;
        delete button.dataset.ventaraOriginalText;
      }
    }
  };

  const showError = (error) => {
    const message = error?.message || String(error || 'Error desconocido');
    console.error('VENTARA usuarios: error al crear usuario:', error);
    try {
      if (typeof window.toast === 'function') window.toast(message);
      else window.alert('No se pudo crear el usuario.\n\n' + message);
    } catch (_) {}
  };

  async function saveNewUser(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }

    if (isSubmitting) return false;

    const current = getCurrentUser();
    const currentRole = String(current?.role || '').trim().toLowerCase();
    // Acepta Administrador/admin sin importar mayúsculas. Si la sesión no expone rol,
    // no bloquea aquí: la autorización definitiva continúa en el Edge Function de Supabase.
    if (currentRole && currentRole !== 'administrador' && currentRole !== 'admin') {
      showError(new Error('Solo un Administrador puede crear usuarios'));
      return false;
    }

    const button = findSaveButton();

    const name = String(get('u_name')?.value || '').trim();
    const username = String(get('u_username')?.value || '').trim().toLowerCase();
    const password = String(get('u_password')?.value || '');
    const password2 = String(get('u_password2')?.value || '');
    const role = String(get('u_role')?.value || 'Cajero');
    const active = get('u_active')?.value === '1';

    // Validar antes de bloquear el formulario evita dejar "Guardando..." pegado
    // cuando el problema es simplemente un dato incompleto o inválido.
    if (!name) {
      showError(new Error('Escribe el nombre'));
      return false;
    }
    if (!/^[a-z0-9._-]{2,30}$/.test(username)) {
      showError(new Error('Usuario inválido'));
      return false;
    }
    if (password.length < 6) {
      showError(new Error('La contraseña debe tener mínimo 6 caracteres'));
      return false;
    }
    if (password !== password2) {
      showError(new Error('Las contraseñas no coinciden'));
      return false;
    }

    isSubmitting = true;
    setSaving(button, true);

    try {
      const client = getClient();
      if (!client) throw new Error('Sesión de VENTARA no disponible');

      // Se usa el Edge Function existente para que Supabase Auth, perfiles,
      // compañía y estado en la nube sigan las mismas reglas de seguridad.
      const { data, error } = await client.functions.invoke('create-ventara-user', {
        body: { username, fullName: name, password, role, active }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.userId) throw new Error('Supabase no devolvió el ID del usuario creado');

      const db = window.db;
      if (db && Array.isArray(db.users)) {
        db.users = db.users.filter((u) => u.id !== data.userId);
        db.users.push({
          id: data.userId,
          name,
          username,
          role,
          active
        });
      }

      if (typeof window.closeModal === 'function') window.closeModal();

      // Una sola actualización de la lista. No se fuerza location.reload().
      if (typeof window.renderUsers === 'function') window.renderUsers();

      if (typeof window.toast === 'function') {
        window.toast('Usuario creado correctamente en la nube');
      }

      return false;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      isSubmitting = false;
      setSaving(button, false);
    }
  }

  function install() {
    if (installed) return;
    const modal = get('modal');
    const box = get('modalbox');
    if (!modal || !box) return;

    installed = true;

    // Captura en fase de captura para bloquear cualquier submit antes de
    // que alcance otros listeners.
    document.addEventListener('submit', (e) => {
      const target = e.target;
      if (!target?.closest('#modalbox, #modal')) return;
      if (!get('u_name') || !get('u_username') || !get('u_password')) return;
      saveNewUser(e);
    }, true);

    document.addEventListener('click', (e) => {
      const button = e.target?.closest?.('button');
      if (!button) return;

      const text = (button.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!text.includes('guardar usuario')) return;
      if (!get('u_name') || !get('u_username') || !get('u_password')) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      saveNewUser(e);
    }, true);
  }

  const boot = () => {
    install();
    if (!installed) {
      new MutationObserver(install).observe(document.documentElement, {
        subtree: true,
        childList: true
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.ventaraUsersFix = {
    get isSubmitting() { return isSubmitting; },
    saveNewUser
  };
})();

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
