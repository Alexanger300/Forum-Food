document.addEventListener('DOMContentLoaded', async function () {

  // ============================================================
  // UTILITAIRES GLOBAUX
  // ============================================================

  function formatTime(date) {
    const value = date ? new Date(date) : new Date();
    return value.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  async function getLoggedUser() {
    if (!window.getCurrentUser) return null;
    const { user } = await window.getCurrentUser();
    return user || null;
  }

  // ============================================================
  // NAV : affichage login/logout
  // ============================================================

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

  // ============================================================
  // PAGE POSTS
  // ============================================================

  const postForm = document.getElementById('post-form');
  if (postForm) {
    const STORAGE_BUCKET = 'cookime-image-posts';
    const feed      = document.getElementById('posts-feed');
    const statusBox = document.getElementById('postStatus');

    function showStatus(message, type) {
      if (!statusBox) return;
      statusBox.textContent = message;
      statusBox.className = type === 'success'
        ? 'login-alert login-alert--success'
        : 'login-alert login-alert--error';
      statusBox.style.display = 'block';
    }

    async function createPostCard(post) {
      const stored = localStorage.getItem('cookimeUser');
      let userObj = null;
      try { userObj = stored ? JSON.parse(stored) : null; } catch (e) {}

      const card = document.createElement('article');
      card.className = 'post-card';

      const header = document.createElement('div');
      header.className = 'post-card-header';
      header.innerHTML = `
        <div class="avatar">${(post.author || 'U').charAt(0).toUpperCase()}</div>
        <div>
          <div class="post-card-title">${post.title || 'Post'}</div>
          <div class="post-card-meta">
            Par ${post.author || 'Utilisateur'} • ${post.category || ''} • ${formatTime(post.created_at || post.date)}
          </div>
        </div>
      `;

      const body = document.createElement('div');
      body.className = 'post-card-body';
      body.textContent = post.content || '';

      card.appendChild(header);
      card.appendChild(body);

      if (post.image_url) {
        const image = document.createElement('img');
        image.src = post.image_url;
        image.alt = post.title || 'Image du post';
        image.style.cssText = 'max-width:100%;border-radius:10px;margin-top:12px;';
        card.appendChild(image);
      }

      // ============================================================
      // ❤️💔 SYSTÈME LIKE / DISLIKE
      // ============================================================

      const likeBar = document.createElement('div');
      likeBar.className = 'post-like-bar';

      const likeBtn = document.createElement('button');
      likeBtn.className = 'like-btn';
      likeBtn.dataset.postId = post.id;

      const dislikeBtn = document.createElement('button');
      dislikeBtn.className = 'dislike-btn';
      dislikeBtn.dataset.postId = post.id;

      let likesCount = 0;
      let dislikesCount = 0;
      let userVote = null;

      // Charger les votes existants
      if (window.getLikes) {
        const { data } = await window.getLikes(post.id);
        if (data) {
          likesCount = data.filter(v => v.type === 'like').length;
          dislikesCount = data.filter(v => v.type === 'dislike').length;

          if (userObj) {
            const myVote = data.find(v => v.user_id === userObj.id);
            if (myVote) userVote = myVote.type;
          }
        }
      }

      // Affichage des boutons
      function renderButtons() {
        likeBtn.innerHTML = `❤️ <span>${likesCount}</span>`;
        dislikeBtn.innerHTML = `💔 <span>${dislikesCount}</span>`;
        likeBtn.classList.toggle('active', userVote === 'like');
        dislikeBtn.classList.toggle('active', userVote === 'dislike');
      }

      renderButtons();

      // Gestion du vote
      async function handleVote(type) {
        if (!userObj) {
          showStatus('Connectez-vous pour voter.', 'error');
          return;
        }

        const prevVote = userVote;

        // Optimistic UI
        if (prevVote === type) {
          userVote = null;
          if (type === 'like') likesCount--;
          else dislikesCount--;
        } else {
          if (prevVote === 'like') likesCount--;
          if (prevVote === 'dislike') dislikesCount--;
          userVote = type;
          if (type === 'like') likesCount++;
          else dislikesCount++;
        }

        renderButtons();

        // Mise à jour Supabase
        if (window.toggleLike) {
          const { error } = await window.toggleLike(post.id, userObj.id, type);
          if (error) {
            // rollback
            userVote = prevVote;
            const { data } = await window.getLikes(post.id);
            if (data) {
              likesCount = data.filter(v => v.type === 'like').length;
              dislikesCount = data.filter(v => v.type === 'dislike').length;
            }
            renderButtons();
            showStatus('Erreur lors du vote.', 'error');
          }
        }
      }

      likeBtn.addEventListener('click', () => handleVote('like'));
      dislikeBtn.addEventListener('click', () => handleVote('dislike'));

      likeBar.appendChild(likeBtn);
      likeBar.appendChild(dislikeBtn);
      card.appendChild(likeBar);

      // -------------------------------------------------------
      // Section commentaires (toggle)
      // -------------------------------------------------------
      const commentToggle = document.createElement('button');
      commentToggle.className = 'comment-toggle-btn';
      commentToggle.innerHTML = `💬 <span class="comment-toggle-label">Commentaires</span>`;

      const commentSection = document.createElement('div');
      commentSection.className = 'comment-section';
      commentSection.style.display = 'none';

      // Liste des commentaires
      const commentsList = document.createElement('div');
      commentsList.className = 'comments-list';

      // Formulaire
      const commentForm = document.createElement('form');
      commentForm.className = 'comment-form';
      commentForm.innerHTML = `
        <textarea class="comment-input" placeholder="Laisser un commentaire..." rows="2" required></textarea>
        <button type="submit" class="comment-submit">Envoyer</button>
      `;

      commentSection.appendChild(commentsList);
      commentSection.appendChild(commentForm);

      // Charger et afficher les commentaires
      async function loadComments() {
        if (!window.db?.getComments) return;
        const comments = await window.db.getComments(post.id);
        commentsList.innerHTML = '';

        if (!comments || comments.length === 0) {
          commentsList.innerHTML = '<p class="no-comments">Aucun commentaire.</p>';
          return;
        }

        comments.forEach(c => {
          const div = document.createElement('div');
          div.className = 'comment-item';
          div.innerHTML = `
            <strong>${c.author || 'Anonyme'}</strong>
            <span class="comment-date">${new Date(c.date || c.created_at).toLocaleString('fr-FR')}</span>
            <p>${c.content}</p>
          `;
          commentsList.appendChild(div);
        });
      }

      // Toggle ouverture/fermeture
      commentToggle.addEventListener('click', async () => {
        const isOpen = commentSection.style.display !== 'none';
        commentSection.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) await loadComments();
      });

      // Soumission commentaire
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = commentForm.querySelector('.comment-input');
        const text = textarea.value.trim();
        if (!text) return;

        if (!userObj) {
          showStatus('Connectez-vous pour commenter.', 'error');
          return;
        }

        if (window.db?.createComment) {
          await window.db.createComment(post.id, text);
          textarea.value = '';
          await loadComments();
        }
      });

      card.appendChild(commentToggle);
      card.appendChild(commentSection);

      return card;
    }

    async function renderPosts(posts) {
      if (!feed) return;
      feed.innerHTML = '';
      if (!posts || posts.length === 0) {
        feed.innerHTML = '<div class="empty-feed">Aucune publication pour le moment.</div>';
        return;
      }
      const cards = await Promise.all(posts.map(post => createPostCard(post)));
      cards.forEach(card => feed.appendChild(card));
    }

    async function loadPosts() {
      if (!window.getPosts) return;
      const { data, error } = await window.getPosts();
      if (error) { showStatus('Impossible de charger les publications.', 'error'); return; }
      await renderPosts(data || []);
    }

    await loadPosts();

    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = await getLoggedUser();
      if (!user) {
        showStatus('Connectez-vous pour publier un post.', 'error');
        return;
      }

      const title      = document.getElementById('title')?.value.trim();
      const content    = document.getElementById('content')?.value.trim();
      const category   = document.getElementById('category')?.value;
      const imageInput = document.getElementById('image');

      if (!title || !content || !category) {
        showStatus('Le titre, le contenu et la catégorie sont obligatoires.', 'error');
        return;
      }

      const submitBtn = postForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        let imageUrl = null;

        if (imageInput?.files?.length > 0) {
          const file = imageInput.files[0];
          const storagePath = `posts/${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

          const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            showStatus('Impossible de téléverser l\'image : ' + uploadError.message, 'error');
            if (submitBtn) submitBtn.disabled = false;
            return;
          }

          const { data: publicUrlData } = window.supabaseClient.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(uploadData.path);

          imageUrl = publicUrlData?.publicUrl || null;
        }

        const { error } = await window.createPost({
          user_id:    user.id,
          title,
          content,
          category,
          author:     user.username || user.email || 'Utilisateur',
          date:       new Date().toISOString().slice(0, 10),
          created_at: new Date().toISOString(),
          image_url:  imageUrl,
        });

        if (error) {
          showStatus(error.message || 'Erreur lors de la publication.', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        showStatus('Post publié avec succès !', 'success');
        postForm.reset();
        await loadPosts();
      } catch (err) {
        showStatus('Une erreur est survenue.', 'error');
      }

      if (submitBtn) submitBtn.disabled = false;
    });
  }

  // ============================================================
  // PAGE LOGIN
  // ============================================================

  const togglePwd = document.getElementById('togglePwd');
  if (togglePwd) {
    togglePwd.addEventListener('click', function () {
      const input = document.getElementById('password');
      input.type = input.type === 'password' ? 'text' : 'password';
      this.textContent = input.type === 'password' ? '👁' : '🙈';
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email    = document.getElementById('email');
      const pwd      = document.getElementById('password');
      const emailErr = document.getElementById('emailError');
      const pwdErr   = document.getElementById('pwdError');
      const alertError   = document.getElementById('alertError');
      const alertSuccess = document.getElementById('alertSuccess');
      const alertMsg     = document.getElementById('alertMsg');
      const spinner  = document.getElementById('loginSpinner');
      const txt      = document.querySelector('.btn-login-text');
      const jp       = document.querySelector('.btn-login-jp');
      const btnLogin = document.getElementById('btnLogin');

      if (emailErr) emailErr.textContent = '';
      if (pwdErr)   pwdErr.textContent   = '';
      if (alertError)   alertError.style.display   = 'none';
      if (alertSuccess) alertSuccess.style.display = 'none';

      let valid = true;
      if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        if (emailErr) emailErr.textContent = 'Adresse e-mail invalide.';
        valid = false;
      }
      if (!pwd.value || pwd.value.length < 6) {
        if (pwdErr) pwdErr.textContent = 'Le mot de passe doit comporter au moins 6 caractères.';
        valid = false;
      }
      if (!valid) return;

      if (spinner)  spinner.style.display = 'inline-block';
      if (txt) txt.style.opacity = '0';
      if (jp)  jp.style.opacity  = '0';
      if (btnLogin) btnLogin.disabled = true;

      const { user, error } = await window.loginSupabase(email.value.trim(), pwd.value);

      if (error || !user) {
        if (alertError) alertError.style.display = 'flex';
        if (alertMsg)   alertMsg.textContent = 'Email ou mot de passe incorrect.';
        if (spinner)  spinner.style.display = 'none';
        if (txt) txt.style.opacity = '1';
        if (jp)  jp.style.opacity  = '1';
        if (btnLogin) btnLogin.disabled = false;
        return;
      }

      localStorage.setItem('cookimeUser', JSON.stringify(user));
      if (alertSuccess) alertSuccess.style.display = 'flex';
      setTimeout(() => window.location.href = 'posts.html', 800);
    });
  }

  // ============================================================
  // PAGE REGISTER
  // ============================================================

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {

    function hideAlerts() {
      const err = document.getElementById('alertError');
      const suc = document.getElementById('alertSuccess');
      if (err) err.style.display = 'none';
      if (suc) suc.style.display = 'none';
    }
    function showError(msg) {
      hideAlerts();
      const err      = document.getElementById('alertError');
      const alertMsg = document.getElementById('alertMsg');
      if (err)      err.style.display    = 'flex';
      if (alertMsg) alertMsg.textContent = msg;
    }
    function showSuccess(msg) {
      hideAlerts();
      const suc        = document.getElementById('alertSuccess');
      const successMsg = document.getElementById('successMsg');
      if (suc)        suc.style.display       = 'flex';
      if (successMsg) successMsg.textContent  = msg;
    }

    hideAlerts();

    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const email       = document.getElementById('email');
      const username    = document.getElementById('username');
      const pwd         = document.getElementById('password');
      const confirmPwd  = document.getElementById('confirmPassword');
      const emailErr    = document.getElementById('emailError');
      const usernameErr = document.getElementById('usernameError');
      const pwdErr      = document.getElementById('pwdError');
      const confirmErr  = document.getElementById('confirmError');
      const spinner     = document.getElementById('registerSpinner');
      const btnText     = document.querySelector('.btn-login-text');

      if (emailErr)    emailErr.textContent    = '';
      if (usernameErr) usernameErr.textContent = '';
      if (pwdErr)      pwdErr.textContent      = '';
      if (confirmErr)  confirmErr.textContent  = '';
      hideAlerts();

      let valid = true;
      if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        if (emailErr) emailErr.textContent = 'Adresse e-mail invalide.';
        valid = false;
      }
      if (!username.value.trim()) {
        if (usernameErr) usernameErr.textContent = 'Le nom d\'utilisateur est obligatoire.';
        valid = false;
      }
      if (!pwd.value || pwd.value.length < 6) {
        if (pwdErr) pwdErr.textContent = 'Le mot de passe doit comporter au moins 6 caractères.';
        valid = false;
      }
      if (pwd.value !== confirmPwd.value) {
        if (confirmErr) confirmErr.textContent = 'Les mots de passe ne correspondent pas.';
        valid = false;
      }
      if (!valid) return;

      if (spinner) spinner.hidden = false;
      if (btnText) btnText.style.opacity = '0';

      const { user, error } = await window.registerSupabase(
        email.value.trim(),
        pwd.value,
        username.value.trim()
      );

      if (error || !user) {
        showError(error?.message || 'Erreur lors de l\'inscription.');
        if (spinner) spinner.hidden = true;
        if (btnText) btnText.style.opacity = '1';
        return;
      }

      showSuccess('Compte créé avec succès ! Vous pouvez vous connecter.');
      if (spinner) spinner.hidden = true;
      if (btnText) btnText.style.opacity = '1';
      registerForm.reset();
    });
  }

  // ============================================================
  // PAGE ACCOUNT
  // ============================================================

  const accountCard = document.querySelector('.account-card');
  if (accountCard) {
    const nameEl        = document.querySelector('.account-meta .name');
    const emailEl       = document.querySelector('.account-meta .email');
    const inputName     = document.getElementById('display_name');
    const inputEmail    = document.getElementById('email');
    const accountForm   = document.getElementById('accountForm');
    const accountStatus = document.getElementById('accountStatus');

    function showAccountStatus(msg, type) {
      if (!accountStatus) return;
      accountStatus.textContent = msg;
      accountStatus.className = type === 'success'
        ? 'login-alert login-alert--success'
        : 'login-alert login-alert--error';
      accountStatus.style.display = 'block';
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

    if (accountForm) {
      accountForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username        = document.getElementById('display_name').value.trim();
        const email           = document.getElementById('email').value.trim().toLowerCase();
        const password        = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || !email) {
          showAccountStatus('Le nom affiché et l\'e-mail sont obligatoires.', 'error'); return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          showAccountStatus('Veuillez saisir une adresse e-mail valide.', 'error'); return;
        }
        if (password && password.length < 6) {
          showAccountStatus('Le mot de passe doit contenir au moins 6 caractères.', 'error'); return;
        }
        if (password && password !== confirmPassword) {
          showAccountStatus('Les mots de passe ne correspondent pas.', 'error'); return;
        }

        const submitBtn = accountForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        const { user: updatedUser, error } = await window.updateUserProfile(user.id, {
          username,
          email,
          password: password || undefined,
        });

        if (submitBtn) submitBtn.disabled = false;

        if (error) {
          showAccountStatus(error.message || 'Erreur lors de la mise à jour.', 'error'); return;
        }

        if (updatedUser) {
          localStorage.setItem('cookimeUser', JSON.stringify(updatedUser));
          if (nameEl)     nameEl.textContent  = updatedUser.username || 'Utilisateur';
          if (emailEl)    emailEl.textContent = updatedUser.email    || '';
          if (inputName)  inputName.value     = updatedUser.username || '';
          if (inputEmail) inputEmail.value    = updatedUser.email    || '';
          showAccountStatus('Profil mis à jour avec succès.', 'success');
        }
      });
    }
  }

  // ============================================================
  // PARAMS URL (erreurs serveur)
  // ============================================================

  const params = new URLSearchParams(window.location.search);
  if (params.get('error') === '1') {
    const alertError = document.getElementById('alertError');
    const alertMsg   = document.getElementById('alertMsg');
    if (alertError) alertError.style.display = 'flex';
    if (alertMsg)   alertMsg.textContent = 'Email ou mot de passe incorrect.';
  }
  if (params.get('success') === '1') {
    const alertSuccess = document.getElementById('alertSuccess');
    if (alertSuccess) alertSuccess.style.display = 'flex';
  }

});
