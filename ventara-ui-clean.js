(() => {
  'use strict';

  const hideFacturarButtons = () => {
    const pos = document.getElementById('pos');
    if (!pos) return;

    const candidates = pos.querySelectorAll(
      'button, a, [role="button"], input[type="button"], input[type="submit"]'
    );

    candidates.forEach((element) => {
      const text = (element.textContent || element.value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      if (
        text === '+ nuevo artículo' ||
        text === 'nuevo artículo' ||
        text === 'categorías' ||
        text === '📂 categorías'
      ) {
        element.style.setProperty('display', 'none', 'important');
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideFacturarButtons, { once: true });
  } else {
    hideFacturarButtons();
  }

  const observer = new MutationObserver(() => hideFacturarButtons());
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();


// VENTARA: mantener la lista de usuarios sincronizada con ventara_state sin tocar login/sesion.
(() => {
  'use strict';

  const USERS_SYNC_CLIENT_KEY = 'ventara-users-view-sync';
  const USERS_SYNC_URL = 'https://lszuhpgkinaoxzbiimig.supabase.co';
  const USERS_SYNC_PUBLISHABLE_KEY = 'sb_publishable_iJ1QaQTA9I8585QG2CwkdA_MHvdF7mE';
  const ROLE_PERMISSIONS_VIEW = {
    Administrador: ['dashboard','pos','sales','orders','products','inventory','purchases','suppliers','clients','receivables','quotes','cash','expenses','reports','users','catalog','settings'],
    Supervisor: ['dashboard','pos','sales','orders','products','inventory','purchases','suppliers','clients','receivables','quotes','cash','expenses','reports','catalog'],
    Cajero: ['dashboard','pos','sales','orders','products','inventory','clients','receivables','cash'],
    Inventario: ['dashboard','products','inventory','purchases','suppliers','reports']
  };

  let syncClient = null;
  let originalRenderUsers = null;
  let lastUsersSnapshot = '';

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const getSyncClient = () => {
    if (!syncClient && window.supabase?.createClient) {
      syncClient = window.supabase.createClient(USERS_SYNC_URL, USERS_SYNC_PUBLISHABLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
    }
    return syncClient;
  };

  const renderUsersFromCloudState = async () => {
    const page = document.getElementById('users');
    if (!page || !page.classList.contains('active')) return;

    const client = getSyncClient();
    if (!client) return;

    const { data, error } = await client
      .from('ventara_state')
      .select('state')
      .maybeSingle();

    if (error || !data?.state) return;

    const users = Array.isArray(data.state.users) ? data.state.users : [];
    const snapshot = JSON.stringify(users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      active: !!u.active
    })));

    if (snapshot === lastUsersSnapshot) return;
    lastUsersSnapshot = snapshot;

    const cards = page.querySelectorAll('.card');
    const usersCard = cards[cards.length - 1];
    if (!usersCard) return;

    usersCard.innerHTML = '<h3>Usuarios</h3>' +
      '<div class="tablewrap"><table class="table"><thead><tr>' +
      '<th>Usuario</th><th>Rol</th><th>Estado</th><th>Permisos</th>' +
      '</tr></thead><tbody>' +
      (users.length
        ? users.map((u) => '<tr><td>' + escapeHtml(u.name || u.username || '') +
          '</td><td><span class="badge">' + escapeHtml(u.role || '') +
          '</span></td><td>' + (u.active ? 'Activo' : 'Inactivo') +
          '</td><td>' + (ROLE_PERMISSIONS_VIEW[u.role] || []).length + ' módulos</td></tr>').join('')
        : '<tr><td colspan="4" class="empty">Sin usuarios registrados</td></tr>') +
      '</tbody></table></div>';
  };

  const installUsersRenderSync = () => {
    if (originalRenderUsers || typeof window.renderUsers !== 'function') return;
    originalRenderUsers = window.renderUsers;
    window.renderUsers = function (...args) {
      const result = originalRenderUsers.apply(this, args);
      setTimeout(renderUsersFromCloudState, 0);
      return result;
    };
  };

  const boot = () => {
    installUsersRenderSync();
    if (document.getElementById('users')?.classList.contains('active')) {
      renderUsersFromCloudState();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  const observer = new MutationObserver(() => {
    installUsersRenderSync();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
