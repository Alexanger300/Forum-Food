import { getLoggedUser } from './utils.js';

// ============================================================
// PAGE ACCOUNT
// ============================================================

export async function initAccount() {
  const accountCard = document.querySelector('.account-card');
  if (!accountCard) return;

  const nameEl        = document.querySelector('.account-meta .name');
  const emailEl       = document.querySelector('.account-meta .email');
  const inputName     = document.getElementById('display_name');
  const inputEmail    = document.getElementById('email');
  const accountForm   = document.getElementById('accountForm');
  const accountStatus = document.getElementById('accountStatus');
  const myPostsDiv    = document.getElementById('my-posts');

  function showAccountStatus(msg, type) {
    if (!accountStatus) return;
    accountStatus.textContent = msg;
    accountStatus.className = type === 'success'
      ? 'login-alert login-alert--success'
      : 'login-alert login-alert--error';
    accountStatus.style.display = 'block';
    setTimeout(() => { accountStatus.style.display = 'none'; }, 4000);
  }

  const user = await getLoggedUser();

  if (!user) {
    if (nameEl)  nameEl.textContent  = 'Visiteur';
    if (emailEl) emailEl.textContent = 'Connectez-vous pour gérer votre compte.';
    showAccountStatus('Vous devez être connecté pour modifier votre profil.', 'error');
    return;
  }

  if (nameEl)     nameEl.textContent  = user.username || 'Utilisateur';
  if (emailEl)    emailEl.textContent = user.email    || '';
  if (inputName)  inputName.value     = user.username || '';
  if (inputEmail) inputEmail.value    = user.email    || '';

  // Mes posts
  async function loadMyPosts() {
    if (!myPostsDiv || !window.getPosts) return;
    myPostsDiv.innerHTML = '<p>Chargement...</p>';

    const { data, error } = await window.getPosts();
    if (error) { myPostsDiv.innerHTML = '<p>Erreur de chargement.</p>'; return; }

    const myPosts = (data || []).filter(p =>
      p.user_id === user.id ||
      p.author  === user.username ||
      p.author  === user.email
    );

    if (myPosts.length === 0) {
      myPostsDiv.innerHTML = '<p class="no-posts">Vous n\'avez pas encore publié de post.</p>';
      return;
    }

    myPostsDiv.innerHTML = '';
    myPosts.forEach(post => {
      const card = document.createElement('div');
      card.className = 'my-post-card';
      card.dataset.id = post.id;
      card.innerHTML = `
        <p><strong>${post.title || ''}</strong></p>
        <p>${post.content || ''}</p>
        <div class="my-post-actions">
          <button class="btn-edit-post"   data-id="${post.id}">✏️ Modifier</button>
          <button class="btn-delete-post" data-id="${post.id}">🗑️ Supprimer</button>
        </div>
        <div class="edit-form" id="edit-form-${post.id}" style="display:none;">
          <label>Titre</label>
          <input class="edit-title" type="text" value="${post.title || ''}" required />
          <label>Catégorie</label>
          <input class="edit-category" type="text" value="${post.category || ''}" />
          <label>Contenu</label>
          <textarea class="edit-content" rows="4" required>${post.content || ''}</textarea>
          <div class="edit-form-btns">
            <button type="button" class="btn-save-post"   data-id="${post.id}">
              💾 Enregistrer
            </button>
            <button type="button" class="btn-cancel-edit" data-id="${post.id}">
              ✖ Annuler
            </button>
          </div>
          <p class="edit-post-status" style="display:none;"></p>
        </div>
      `;
      myPostsDiv.appendChild(card);
    });
  }

  await loadMyPosts();

  // Délégation d'événements
  if (myPostsDiv) {
    myPostsDiv.addEventListener('click', async (e) => {
      // Modifier
      if (e.target.closest('.btn-edit-post')) {
        const postId = e.target.closest('.btn-edit-post').dataset.id;
        const form   = document.getElementById(`edit-form-${postId}`);
        if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
      }

      // Annuler
      if (e.target.closest('.btn-cancel-edit')) {
        const postId = e.target.closest('.btn-cancel-edit').dataset.id;
        const form   = document.getElementById(`edit-form-${postId}`);
        if (form) form.style.display = 'none';
      }

      // Sauvegarder
      if (e.target.closest('.btn-save-post')) {
        const btn        = e.target.closest('.btn-save-post');
        const postId     = btn.dataset.id;
        const form       = document.getElementById(`edit-form-${postId}`);
        const status     = form?.querySelector('.edit-post-status');
        const newTitle   = form?.querySelector('.edit-title')?.value.trim();
        const newCat     = form?.querySelector('.edit-category')?.value;
        const newContent = form?.querySelector('.edit-content')?.value.trim();

        if (!newTitle || !newContent) return;

        btn.disabled    = true;
        btn.textContent = '⏳';

        if (window.updatePost) {
          const { error } = await window.updatePost(postId, {
            title: newTitle, category: newCat, content: newContent
          });
          if (error) {
            if (status) {
              status.textContent   = 'Erreur lors de la modification.';
              status.className     = 'login-alert login-alert--error';
              status.style.display = 'block';
            }
            btn.disabled    = false;
            btn.textContent = '💾 Enregistrer';
          } else {
            form.style.display = 'none';
            await loadMyPosts();
          }
        }
      }
    });
  }

  // Mise à jour profil
  if (accountForm) {
    accountForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newUsername = inputName?.value.trim();
      const newEmail    = inputEmail?.value.trim();
      const submitBtn   = accountForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      if (window.updateUser) {
        const { data: updatedUser, error } = await window.updateUser(user.id, {
          username: newUsername,
          email: newEmail
        });

        if (error) {
          showAccountStatus('Erreur lors de la mise à jour du profil.', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        if (updatedUser) {
          localStorage.setItem('cookimeUser', JSON.stringify(updatedUser));
          if (nameEl)     nameEl.textContent  = updatedUser.username || 'Utilisateur';
          if (emailEl)    emailEl.textContent = updatedUser.email    || '';
          if (inputName)  inputName.value     = updatedUser.username || '';
          if (inputEmail) inputEmail.value    = updatedUser.email    || '';
          showAccountStatus('Profil mis à jour avec succès.', 'success');
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}
