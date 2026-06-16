import { formatTime, getLoggedUser } from './utils.js';
import { createLikeBar }             from './likes.js';
import { createCommentSection }      from './comments.js';

// ============================================================
// PAGE POSTS
// ============================================================

export async function initPosts() {
  const postForm = document.getElementById('post-form');
  if (!postForm) return;

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

    // Header
    const header = document.createElement('div');
    header.className = 'post-card-header';
    header.innerHTML = `
      <div class="avatar">${(post.author || 'U').charAt(0).toUpperCase()}</div>
      <div>
        <div class="post-card-title">${post.title || 'Post'}</div>
        <div class="post-card-meta">
          Par ${post.author || 'Utilisateur'} • 
          ${post.category || ''} • 
          ${formatTime(post.created_at || post.date)}
        </div>
      </div>
    `;

    // Body
    const body = document.createElement('div');
    body.className = 'post-card-body';
    body.textContent = post.content || '';

    card.appendChild(header);
    card.appendChild(body);

    // Image
    if (post.image_url) {
      const image = document.createElement('img');
      image.src   = post.image_url;
      image.alt   = post.title || 'Image du post';
      image.style.cssText = 'max-width:20%;border-radius:10px;margin-top:12px;';
      card.appendChild(image);
    }

    // Likes
    const likeBar = createLikeBar(post, userObj, showStatus);
    card.appendChild(likeBar);

    // Commentaires
    const { commentToggle, commentSection } = createCommentSection(post, userObj);
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

  // Filtres catégories
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const activeCategory = btn.dataset.category;
      if (!window.getPosts) return;
      const { data, error } = await window.getPosts();
      if (error) { showStatus('Impossible de charger les publications.', 'error'); return; }
      const filtered = activeCategory === 'all'
        ? data || []
        : (data || []).filter(p =>
            (p.category || '').toLowerCase() === activeCategory.toLowerCase()
          );
      await renderPosts(filtered);
    });
  });

  // Création de post
  postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = await getLoggedUser();
    if (!user) { showStatus('Connectez-vous pour publier un post.', 'error'); return; }

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
        const file        = imageInput.files[0];
        const storagePath = `posts/${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

        const { data: uploadData, error: uploadError } =
          await window.supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          showStatus('Impossible de téléverser l\'image : ' + uploadError.message, 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        const { data: urlData } = window.supabaseClient.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        imageUrl = urlData?.publicUrl || null;
      }

      // Suite de la création du post (window.createPost, etc.)
      // À compléter selon votre implémentation existante

    } catch (err) {
      showStatus('Une erreur est survenue.', 'error');
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}
