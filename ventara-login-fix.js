/**
 * Ventara POS - Self-contained Login Repair Patch
 * Resuelve errores de sintaxis previos y fuerza binding explícito en window.login
 */
(function () {
  async function executeLogin() {
    const username = document.getElementById('loginUsername')?.value.trim().toLowerCase();
    const password = document.getElementById('loginPassword')?.value;
    const msg = document.getElementById('loginMsg');

    if (!username || !password) {
      if (msg) msg.textContent = 'Escribe usuario y contraseña.';
      return;
    }

    if (msg) msg.textContent = 'Verificando…';

    try {
      let email = `${username}@login.ventara.app`;

      if (typeof supabaseClient !== 'undefined' && supabaseClient.auth) {
        let { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data?.session) throw new Error('Sesión no devuelta por Supabase.');

        window.currentSession = data.session;
        window.currentUser = data.session.user;
      }

      if (typeof loadAccount === 'function') await loadAccount();
      if (typeof loadCloudState === 'function') await loadCloudState();

      if (msg) msg.textContent = '';

      const loginScreen = document.getElementById('loginScreen');
      const mainApp = document.getElementById('mainApp');
      if (loginScreen) loginScreen.style.display = 'none';
      if (mainApp) mainApp.style.display = 'flex';

      if (typeof enterApp === 'function') enterApp();

    } catch (e) {
      console.error('Error en autenticación:', e);
      if (msg) msg.textContent = e.message || 'Usuario o contraseña incorrectos.';
    }
  }

  // Vincular globalmente para responder al evento onclick del HTML
  window.login = executeLogin;

  // Garantizar listener directo sobre los botones
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.includes('Iniciar sesión')) {
        btn.onclick = (e) => {
          e.preventDefault();
          executeLogin();
        };
      }
    });
  });
})();
