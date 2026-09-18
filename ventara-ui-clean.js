(() => {
  'use strict';

  const hideFacturarButtons = () => {
    const pos = document.getElementById('pos');
    if (!pos) return;
    pos.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]').forEach((element) => {
      const text = (element.textContent || element.value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (['+ nuevo artículo','nuevo artículo','categorías','📂 categorías'].includes(text)) {
        element.style.setProperty('display', 'none', 'important');
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideFacturarButtons, { once: true });
  else hideFacturarButtons();

  new MutationObserver(hideFacturarButtons).observe(document.documentElement, { subtree: true, childList: true });
})();

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
  let isSubmittingUser = false;
  let lastUsersSignature = '';

  const client = () => { try { return supabaseClient; } catch (_) { return null; } };
  const appDb = () => { try { return db; } catch (_) { return null; } };
  const admin = () => { try { return currentUser?.role === 'Administrador'; } catch (_) { return false; } };
  const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  const refresh = () => { try { if (typeof renderUsers === 'function') renderUsers(); } catch (_) {} };

  async function syncUsersFromCloud() {
    if (syncingUsers || !admin()) return;
    const page = document.getElementById('users');
    if (!page || !page.classList.contains('active')) return;
    const c = client(), d = appDb();
    if (!c || !d) return;

    syncingUsers = true;
    try {
      const { data, error } = await c.from('ventara_state').select('state').maybeSingle();
      if (error) throw error;
      const users = data?.state?.users;
      if (!Array.isArray(users)) return;

      const normalizedUsers = users.map(u => ({
        ...u,
        permissions: ROLE_PERMISSIONS_VIEW[u.role] || []
      }));
      const signature = JSON.stringify(normalizedUsers.map(u => ({
        id:u.id, name:u.name, username:u.username, role:u.role, active:u.active
      })));

      if (signature === lastUsersSignature) return;
      lastUsersSignature = signature;
      d.users = normalizedUsers;
      refresh();
    } catch (e) {
      console.error('VENTARA usuarios: sincronización no disponible', e);
    } finally {
      syncingUsers = false;
    }
  }

  async function invoke(body) {
    const c = client();
    if (!c) throw new Error('Sesión de VENTARA no disponible');
    const { data, error } = await c.functions.invoke('create-ventara-user', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function editUser(userId) {
    if (!admin()) return toast('Solo un Administrador puede editar usuarios');
    const d = appDb(), user = d?.users?.find(u => u.id === userId);
    if (!user) return toast('No se encontró el usuario');

    openModal(
      '<h2>Editar usuario</h2>' +
      '<div class="form">' +
      '<div class="field"><label>Nombre</label><input id="eu_name" autocomplete="name" value="' + esc(user.name) + '"></div>' +
      '<div class="field"><label>Usuario de acceso</label><input id="eu_username" value="' + esc(user.username) + '" disabled></div>' +
      '<div class="field"><label>Rol</label><select id="eu_role">' +
      Object.keys(ROLE_PERMISSIONS_VIEW).map(r => '<option value="' + esc(r) + '"' + (r === user.role ? ' selected' : '') + '>' + esc(r) + '</option>').join('') +
      '</select></div>' +
      '<div class="field"><label>Activo</label><select id="eu_active">' +
      '<option value="1"' + (user.active ? ' selected' : '') + '>Sí</option><option value="0"' + (!user.active ? ' selected' : '') + '>No</option>' +
      '</select></div></div>' +
      '<p class="muted">El usuario de acceso y la contraseña no se modifican desde esta pantalla.</p>' +
      '<button class="btn primary" style="margin-top:15px" onclick="saveEditedUser(\'' + esc(user.id) + '\')">Guardar cambios</button>'
    );
  }

  async function saveEditedUser(userId) {
    if (!admin()) return toast('Solo un Administrador puede editar usuarios');
    const name = String(document.getElementById('eu_name')?.value || '').trim();
    const role = String(document.getElementById('eu_role')?.value || 'Cajero');
    const active = document.getElementById('eu_active')?.value === '1';
    if (!name) return toast('Escribe el nombre');

    try {
      await invoke({ action:'update', userId, fullName:name, role, active });
      const d = appDb(), u = d?.users?.find(x => x.id === userId);
      if (u) Object.assign(u, { name, role, active, permissions: ROLE_PERMISSIONS_VIEW[role] || [] });
      closeModal();
      refresh();
      toast('Usuario actualizado correctamente');
      setTimeout(syncUsersFromCloud, 50);
    } catch (e) {
      console.error(e);
      toast(e.message || 'No se pudo actualizar el usuario');
    }
  }

  async function deleteUser(userId) {
    if (!admin()) return toast('Solo un Administrador puede eliminar usuarios');
    try {
      const d = appDb(), u = d?.users?.find(x => x.id === userId);
      if (!u) return toast('No se encontró el usuario');
      if (u.id === currentUser?.id) return toast('No puedes eliminar tu propio usuario');

      if (!window.confirm('¿Eliminar al usuario "' + String(u.name || u.username || 'usuario') + '"?\n\nEsta acción elimina su acceso a VENTARA.')) return;

      await invoke({ action:'delete', userId });
      d.users = (d.users || []).filter(x => x.id !== userId);

      refresh();
      toast('Usuario eliminado correctamente');
      setTimeout(syncUsersFromCloud, 50);
    } catch (e) {
      console.error(e);
      toast(e.message || 'No se pudo eliminar el usuario');
    }
  }


  async function createUserWithoutGenericSave(event) {
    if (event?.preventDefault) event.preventDefault();
    if (isSubmittingUser) return;
    if (!admin()) return toast('Solo un Administrador puede crear usuarios');

    const submitButton = document.querySelector('#users .modalbox button.btn.primary, #users button.btn.primary');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute('aria-disabled', 'true');
    }
    isSubmittingUser = true;

    const role = String(document.getElementById('u_role')?.value || 'Cajero');
    const name = String(document.getElementById('u_name')?.value || '').trim();
    const username = String(document.getElementById('u_username')?.value || '').trim().toLowerCase();
    const password = String(document.getElementById('u_password')?.value || '');
    const password2 = String(document.getElementById('u_password2')?.value || '');
    const active = document.getElementById('u_active')?.value === '1';
    if (!name) return toast('Escribe el nombre');
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) return toast('Usuario inválido');
    if (password.length < 6) return toast('La contraseña debe tener mínimo 6 caracteres');
    if (password !== password2) return toast('Las contraseñas no coinciden');
    try {
      const data = await invoke({ username, fullName:name, password, role, active });
      const d = appDb();
      if (d) {
        d.users = (d.users || []).filter(u => u.id !== data.userId);
        d.users.push({ id:data.userId, name, username, role, active, permissions:ROLE_PERMISSIONS_VIEW[role] || [] });
        try { localSave(); } catch (_) {}
      }
      closeModal();
      lastUsersSignature = '';
      toast('Usuario creado correctamente en la nube');
      setTimeout(syncUsersFromCloud, 150);
    } catch (e) {
      console.error('VENTARA usuarios: creación', e);
      toast(e.message || 'No se pudo crear el usuario');
    } finally {
      isSubmittingUser = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-disabled');
      }
    }
  }

  window.saveUser = createUserWithoutGenericSave;

  window.editVentaraUser = editUser;
  window.saveEditedUser = saveEditedUser;
  window.deleteVentaraUser = deleteUser;

  function decorateUsersTable() {
    if (!admin()) return;
    const page = document.getElementById('users');
    if (!page || !page.classList.contains('active')) return;
    const tables = page.querySelectorAll('table');
    const table = tables[tables.length - 1];
    if (!table?.tHead || !table.tBodies[0]) return;

    const header = table.tHead.rows[0];
    if (!Array.from(header.cells).some(c => c.textContent.trim().toLowerCase() === 'acciones')) {
      const th = document.createElement('th');
      th.textContent = 'Acciones';
      header.appendChild(th);
    }

    const users = Array.isArray(appDb()?.users) ? appDb().users : [];
    Array.from(table.tBodies[0].rows).forEach((row, index) => {
      const user = users[index];
      if (!user) return;
      const existing = row.querySelector('[data-ventara-user-id]');
      if (existing) {
        existing.parentElement.dataset.ventaraUserActions = 'true';
        return;
      }

      const cell = row.insertCell(-1);
      cell.style.whiteSpace = 'nowrap';
      cell.innerHTML =
        '<button type="button" class="btn" style="margin-right:6px" data-ventara-user-id="' + esc(user.id) + '" onclick="editVentaraUser(\'' + esc(user.id) + '\')">✏️ Editar</button>' +
        '<button type="button" class="btn" onclick="deleteVentaraUser(\'' + esc(user.id) + '\')">🗑️ Eliminar</button>';
      row.dataset.ventaraUserActions = 'true';
    });
  }

  function installRenderHook() {
    if (originalRenderUsers || typeof window.renderUsers !== 'function') return;
    originalRenderUsers = window.renderUsers;
    window.renderUsers = function(...args) {
      const result = originalRenderUsers.apply(this, args);
      setTimeout(decorateUsersTable, 0);
      return result;
    };
  }

  function boot() {
    installRenderHook();
    setTimeout(() => { syncUsersFromCloud(); decorateUsersTable(); }, 0);
    setInterval(() => {
      if (document.getElementById('users')?.classList.contains('active')) {
        syncUsersFromCloud();
        decorateUsersTable();
      }
    }, 800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();

  new MutationObserver(() => {
    installRenderHook();
    if (document.getElementById('users')?.classList.contains('active')) {
      setTimeout(decorateUsersTable, 0);
    }
  }).observe(document.documentElement, { subtree:true, childList:true });
})();