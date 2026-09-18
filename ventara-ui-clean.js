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

// VENTARA: administración quirúrgica de usuarios.
// No toca login/sesión; utiliza la sesión ya abierta por VENTARA.
(() => {
  'use strict';

  const ROLE_PERMISSIONS_VIEW = {
    Administrador: ['dashboard','pos','sales','orders','products','inventory','purchases','suppliers','clients','receivables','quotes','cash','expenses','reports','users','catalog','settings'],
    Supervisor: ['dashboard','pos','sales','orders','products','inventory','purchases','suppliers','clients','receivables','quotes','cash','expenses','reports','catalog'],
    Cajero: ['dashboard','pos','sales','orders','products','inventory','clients','receivables','cash'],
    Inventario: ['dashboard','products','inventory','purchases','suppliers','reports']
  };

  let originalRenderUsers = null;
  let syncingUsers = false;
  let decorating = false;

  const getAppClient = () => {
    try {
      return supabaseClient;
    } catch (_) {
      return null;
    }
  };

  const getAppDb = () => {
    try {
      return db;
    } catch (_) {
      return null;
    }
  };

  const isAdmin = () => {
    try {
      return currentUser?.role === 'Administrador';
    } catch (_) {
      return false;
    }
  };

  const persist = () => {
    try {
      save();
    } catch (_) {}
  };

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const refreshUsers = () => {
    try {
      if (typeof renderUsers === 'function') renderUsers();
    } catch (_) {}
  };

  const syncUsersFromCloud = async () => {
    if (syncingUsers || !isAdmin()) return;

    const page = document.getElementById('users');
    if (!page || !page.classList.contains('active')) return;

    const client = getAppClient();
    const appDb = getAppDb();
    if (!client || !appDb) return;

    syncingUsers = true;

    try {
      const { data, error } = await client
        .from('ventara_state')
        .select('state')
        .maybeSingle();

      if (error || !data?.state || !Array.isArray(data.state.users)) return;

      const cloudUsers = data.state.users.map((u) => ({
        ...u,
        permissions: ROLE_PERMISSIONS_VIEW[u.role] || []
      }));

      appDb.users = cloudUsers;
      refreshUsers();
    } catch (error) {
      console.error('VENTARA usuarios: no se pudo sincronizar la lista', error);
    } finally {
      syncingUsers = false;
    }
  };

  const invokeUserAction = async (body) => {
    const client = getAppClient();
    if (!client) throw new Error('Sesión de VENTARA no disponible');

    const { data, error } = await client.functions.invoke('create-ventara-user', {
      body
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  };

  const editUser = (userId) => {
    if (!isAdmin()) return toast('Solo un Administrador puede editar usuarios');

    const appDb = getAppDb();
    const user = appDb?.users?.find((item) => item.id === userId);

    if (!user) return toast('No se encontró el usuario');

    const roles = Object.keys(ROLE_PERMISSIONS_VIEW);

    openModal(
      '<h2>Editar usuario</h2>' +
      '<div class="form">' +
      '<div class="field"><label>Nombre</label>' +
      '<input id="eu_name" autocomplete="name" value="' + escapeHtml(user.name || '') + '"></div>' +
      '<div class="field"><label>Usuario de acceso</label>' +
      '<input id="eu_username" value="' + escapeHtml(user.username || '') + '" disabled></div>' +
      '<div class="field"><label>Rol</label>' +
      '<select id="eu_role">' +
      roles.map((role) =>
        '<option value="' + escapeHtml(role) + '"' +
        (role === user.role ? ' selected' : '') + '>' +
        escapeHtml(role) + '</option>'
      ).join('') +
      '</select></div>' +
      '<div class="field"><label>Activo</label>' +
      '<select id="eu_active">' +
      '<option value="1"' + (user.active ? ' selected' : '') + '>Sí</option>' +
      '<option value="0"' + (!user.active ? ' selected' : '') + '>No</option>' +
      '</select></div>' +
      '</div>' +
      '<p class="muted">El usuario de acceso no se modifica desde aquí. La contraseña tampoco se muestra ni se guarda en VENTARA.</p>' +
      '<button class="btn primary" style="margin-top:15px" onclick="saveEditedUser(\'' +
      escapeHtml(user.id) +
      '\')">Guardar cambios</button>'
    );
  };

  const saveEditedUser = async (userId) => {
    if (!isAdmin()) return toast('Solo un Administrador puede editar usuarios');

    const name = String(document.getElementById('eu_name')?.value || '').trim();
    const role = String(document.getElementById('eu_role')?.value || 'Cajero');
    const active = document.getElementById('eu_active')?.value === '1';

    if (!name) return toast('Escribe el nombre');

    try {
      await invokeUserAction({
        action: 'update',
        userId,
        fullName: name,
        role,
        active
      });

      const appDb = getAppDb();
      const user = appDb?.users?.find((item) => item.id === userId);

      if (user) {
        user.name = name;
        user.role = role;
        user.active = active;
        user.permissions = ROLE_PERMISSIONS_VIEW[role] || [];
      }

      persist();
      closeModal();
      refreshUsers();
      toast('Usuario actualizado correctamente');
    } catch (error) {
      console.error(error);
      toast(error.message || 'No se pudo actualizar el usuario');
    }
  };

  const deleteUser = async (userId) => {
    if (!isAdmin()) return toast('Solo un Administrador puede eliminar usuarios');

    let appDb;
    try {
      appDb = getAppDb();
      const user = appDb?.users?.find((item) => item.id === userId);

      if (!user) return toast('No se encontró el usuario');

      if (user.id === currentUser?.id) {
        return toast('No puedes eliminar tu propio usuario');
      }

      const confirmed = window.confirm(
        '¿Eliminar al usuario "' +
        String(user.name || user.username || 'usuario') +
        '"?\n\nEsta acción elimina su acceso a VENTARA.'
      );

      if (!confirmed) return;

      await invokeUserAction({
        action: 'delete',
        userId
      });

      appDb.users = (appDb.users || []).filter((item) => item.id !== userId);

      persist();
      refreshUsers();
      toast('Usuario eliminado correctamente');
    } catch (error) {
      console.error(error);
      toast(error.message || 'No se pudo eliminar el usuario');
    }
  };

  window.editVentaraUser = editUser;
  window.saveEditedUser = saveEditedUser;
  window.deleteVentaraUser = deleteUser;

  const decorateUsersTable = () => {
    if (decorating || !isAdmin()) return;

    const page = document.getElementById('users');
    if (!page || !page.classList.contains('active')) return;

    const tables = page.querySelectorAll('table');
    const table = tables[tables.length - 1];
    if (!table || !table.tHead || !table.tBodies[0]) return;

    const headerRow = table.tHead.rows[0];
    if (!headerRow) return;

    const hasActionsHeader = Array.from(headerRow.cells).some(
      (cell) => String(cell.textContent || '').trim().toLowerCase() === 'acciones'
    );

    if (!hasActionsHeader) {
      const th = document.createElement('th');
      th.textContent = 'Acciones';
      headerRow.appendChild(th);
    }

    const appDb = getAppDb();
    const users = Array.isArray(appDb?.users) ? appDb.users : [];

    Array.from(table.tBodies[0].rows).forEach((row, index) => {
      if (row.dataset.ventaraUserActions === 'true') return;

      const user = users[index];
      if (!user) return;

      const cell = row.insertCell(-1);
      cell.style.whiteSpace = 'nowrap';
      cell.innerHTML =
        '<button type="button" class="btn" style="margin-right:6px" ' +
        'onclick="editVentaraUser(\'' + escapeHtml(user.id) + '\')" ' +
        'title="Editar usuario">✏️ Editar</button>' +
        '<button type="button" class="btn" ' +
        'onclick="deleteVentaraUser(\'' + escapeHtml(user.id) + '\')" ' +
        'title="Eliminar usuario">🗑️ Eliminar</button>';

      row.dataset.ventaraUserActions = 'true';
    });
  };

  const installRenderHook = () => {
    if (originalRenderUsers || typeof window.renderUsers !== 'function') return;

    originalRenderUsers = window.renderUsers;

    window.renderUsers = function (...args) {
      const result = originalRenderUsers.apply(this, args);
      setTimeout(decorateUsersTable, 0);
      return result;
    };
  };

  const boot = () => {
    installRenderHook();
    setTimeout(() => {
      syncUsersFromCloud();
      decorateUsersTable();
    }, 0);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  const observer = new MutationObserver(() => {
    installRenderHook();
    if (!document.getElementById('users')?.classList.contains('active')) return;
    setTimeout(decorateUsersTable, 0);
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true
  });
})();