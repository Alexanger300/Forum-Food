import { getLoggedUser } from './utils.js';

// ============================================================
// NAV : affichage login/logout
// ============================================================

export async function initNav() {
  const loginLink  = document.getElementById('loginLink');
  const logoutLink = document.getElementById('logoutLink');
  const currentUser = await getLoggedUser();

  if (loginLink)  loginLink.hidden  = Boolean(currentUser);
  if (logoutLink) logoutLink.hidden = !currentUser;

  if (logoutLink) {
    logoutLink.addEventListener('click', async function (e) {
      e.preventDefault();
      await window.logoutSupabase();
      localStorage.removeItem('cookimeUser');
      window.location.href = 'login.html';
    });
  }
}
