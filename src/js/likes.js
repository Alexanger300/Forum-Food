// ============================================================
// SYSTÈME LIKE / DISLIKE
// ============================================================

export function createLikeBar(post, userObj, showStatus) {
  const likeBar = document.createElement('div');
  likeBar.className = 'post-like-bar';

  const likeBtn    = document.createElement('button');
  const dislikeBtn = document.createElement('button');
  likeBtn.className    = 'like-btn';
  dislikeBtn.className = 'dislike-btn';
  likeBtn.dataset.postId    = post.id;
  dislikeBtn.dataset.postId = post.id;

  let likesCount    = 0;
  let dislikesCount = 0;
  let userVote      = null;

  function renderButtons() {
    likeBtn.innerHTML    = `❤️ ${likesCount}`;
    dislikeBtn.innerHTML = `💔 ${dislikesCount}`;
    likeBtn.classList.toggle('active',    userVote === 'like');
    dislikeBtn.classList.toggle('active', userVote === 'dislike');
  }

  // Chargement initial
  (async () => {
    if (window.getLikes) {
      const { data } = await window.getLikes(post.id);
      if (data) {
        likesCount    = data.filter(v => v.type === 'like').length;
        dislikesCount = data.filter(v => v.type === 'dislike').length;
        if (userObj) {
          const vote = data.find(v => v.user_id === userObj.id);
          userVote = vote ? vote.type : null;
        }
      }
    }
    renderButtons();
  })();

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
      if (prevVote === 'like')    likesCount--;
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
        // Rollback
        userVote = prevVote;
        const { data } = await window.getLikes(post.id);
        if (data) {
          likesCount    = data.filter(v => v.type === 'like').length;
          dislikesCount = data.filter(v => v.type === 'dislike').length;
        }
        renderButtons();
        showStatus('Erreur lors du vote.', 'error');
      }
    }
  }

  likeBtn.addEventListener('click',    () => handleVote('like'));
  dislikeBtn.addEventListener('click', () => handleVote('dislike'));

  likeBar.appendChild(likeBtn);
  likeBar.appendChild(dislikeBtn);

  return likeBar;
}
