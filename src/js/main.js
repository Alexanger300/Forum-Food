import { initNav }              from './nav.js';
import { initPosts }            from './posts.js';
import { initAccount }          from './account.js';
import { initLogin, initRegister, initUrlParams } from './auth.js';

document.addEventListener('DOMContentLoaded', async function () {

  // Toujours actif
  await initNav();
  initUrlParams();

  // Pages spécifiques (détecté automatiquement via le DOM)
  await initPosts();
  await initAccount();
  initLogin();
  initRegister();

});
