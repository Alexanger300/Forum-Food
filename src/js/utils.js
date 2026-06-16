// ============================================================
// UTILITAIRES GLOBAUX
// ============================================================

export function formatTime(date) {
  const value = date ? new Date(date) : new Date();
  return value.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function escapeHtml(text) {
  const map = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export async function getLoggedUser() {
  if (!window.getCurrentUser) return null;
  const { user } = await window.getCurrentUser();
  return user || null;
}
