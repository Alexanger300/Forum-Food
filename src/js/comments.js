import { formatTime, escapeHtml } from './utils.js';

// ============================================================
// SECTION COMMENTAIRES
// ============================================================

export function createCommentSection(post, userObj) {
  const commentToggle = document.createElement('button');
  commentToggle.className = 'comment-toggle-btn';
  commentToggle.innerHTML = `💬 <span class="comment-toggle-label">Commentaires</span>`;

  const commentSection = document.createElement('div');
  commentSection.className = 'comment-section';
  commentSection.style.display = 'none';

  const commentsList = document.createElement('div');
  commentsList.className = 'comments-list';

  const commentForm = document.createElement('form');
  commentForm.className = 'comment-form';
  commentForm.innerHTML = `
    <textarea class="comment-input" placeholder="Laisser un commentaire..." 
              rows="2" required></textarea>
    <button type="submit" class="comment-submit">Envoyer</button>
  `;

  commentSection.appendChild(commentsList);
  commentSection.appendChild(commentForm);

  // ---------- Chargement ----------
  async function loadComments() {
    if (!window.getComments) {
      commentsList.innerHTML = '<p class="no-comments">Fonctionnalité indisponible.</p>';
      return;
    }

    const comments = await window.getComments(post.id);
    commentsList.innerHTML = '';

    if (!comments || comments.length === 0) {
      commentsList.innerHTML = '<p class="no-comments">Aucun commentaire. Soyez le premier !</p>';
      return;
    }

    comments.forEach(c => {
      const isOwner = Boolean(userObj && c.user_id === userObj.id);
      const div = document.createElement('div');
      div.className = 'comment-item';
      div.dataset.id = c.id;

      div.innerHTML = `
        <div class="comment-item-header">
          <strong class="comment-author">${c.author || 'Anonyme'}</strong>
          <span class="comment-date">${formatTime(c.created_at || c.date)}</span>
        </div>
        <p class="comment-content">${escapeHtml(c.content)}</p>
        ${isOwner ? `
          <div class="comment-actions">
            <button class="btn-edit-comment"   data-id="${c.id}">✏️ Modifier</button>
            <button class="btn-delete-comment" data-id="${c.id}">🗑️ Supprimer</button>
          </div>
          <div class="comment-edit-form" id="comment-edit-${c.id}" style="display:none;">
            <textarea class="comment-edit-input" rows="3" 
                      data-id="${c.id}">${escapeHtml(c.content)}</textarea>
            <div class="comment-edit-actions">
              <button type="button" class="btn-save-comment"   data-id="${c.id}">
                💾 Enregistrer
              </button>
              <button type="button" class="btn-cancel-comment" data-id="${c.id}">
                ✖ Annuler
              </button>
            </div>
            <p class="comment-edit-status" style="display:none;"></p>
          </div>
        ` : ''}
      `;
      commentsList.appendChild(div);
    });

    attachCommentEvents();
  }

  // ---------- Événements ----------
  function attachCommentEvents() {
    // Modifier
    commentsList.querySelectorAll('.btn-edit-comment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const form = document.getElementById(`comment-edit-${btn.dataset.id}`);
        if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });
    });

    // Annuler
    commentsList.querySelectorAll('.btn-cancel-comment').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const form = document.getElementById(`comment-edit-${btn.dataset.id}`);
        if (form) form.style.display = 'none';
      });
    });

    // Sauvegarder
    commentsList.querySelectorAll('.btn-save-comment').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const commentId = btn.dataset.id;
        const form      = document.getElementById(`comment-edit-${commentId}`);
        const status    = form?.querySelector('.comment-edit-status');
        const textarea  = form?.querySelector('.comment-edit-input');
        const newContent = textarea?.value.trim();

        if (!newContent) return;

        btn.disabled    = true;
        btn.textContent = '⏳';

        if (window.updateComment) {
          const { error } = await window.updateComment(commentId, newContent);
          if (error) {
            if (status) {
              status.textContent = 'Erreur lors de la modification.';
              status.className   = 'login-alert login-alert--error';
              status.style.display = 'block';
            }
            btn.disabled    = false;
            btn.textContent = '💾 Enregistrer';
          } else {
            if (status) {
              status.textContent = 'Commentaire modifié !';
              status.className   = 'login-alert login-alert--success';
              status.style.display = 'block';
            }
            setTimeout(() => {
              form.style.display = 'none';
              loadComments();
            }, 800);
          }
        }
      });
    });

    // Supprimer
    commentsList.querySelectorAll('.btn-delete-comment').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;

        btn.disabled    = true;
        btn.textContent = '⏳';

        if (window.deleteComment) {
          const { error } = await window.deleteComment(btn.dataset.id);
          if (error) {
            btn.disabled    = false;
            btn.textContent = '🗑️ Supprimer';
          } else {
            await loadComments();
          }
        }
      });
    });
  }

  // Soumettre un commentaire
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!userObj) return;

    const textarea = commentForm.querySelector('.comment-input');
    const content  = textarea?.value.trim();
    if (!content) return;

    if (window.addComment) {
      const { error } = await window.addComment(post.id, userObj.id, content);
      if (!error) {
        textarea.value = '';
        await loadComments();
      }
    }
  });

  // Toggle
  commentToggle.addEventListener('click', async () => {
    const isOpen = commentSection.style.display !== 'none';
    commentSection.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) await loadComments();
  });

  return { commentToggle, commentSection };
}
