// ============================================================
// PAGE LOGIN / REGISTER
// ============================================================

export function initLogin() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email      = document.getElementById('email');
    const pwd        = document.getElementById('password');
    const emailErr   = document.getElementById('emailError');
    const pwdErr     = document.getElementById('pwdError');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertMsg   = document.getElementById('alertMsg');
    const spinner    = document.getElementById('loginSpinner');
    const txt        = document.querySelector('.btn-login-text');
    const jp         = document.querySelector('.btn-login-jp');
    const btnLogin   = document.getElementById('btnLogin');

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

    // Suite de la logique login (window.loginSupabase, etc.)
  });
}

export function initRegister() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email      = document.getElementById('email');
    const username   = document.getElementById('username');
    const pwd        = document.getElementById('password');
    const confirmPwd = document.getElementById('confirmPassword');
    const emailErr   = document.getElementById('emailError');
    const usernameErr = document.getElementById('usernameError');
    const pwdErr     = document.getElementById('pwdError');
    const confirmErr = document.getElementById('confirmError');
    const spinner    = document.getElementById('registerSpinner');
    const btnText    = document.querySelector('.btn-login-text');

    if (emailErr)     emailErr.textContent    = '';
    if (usernameErr)  usernameErr.textContent = '';
    if (pwdErr)       pwdErr.textContent      = '';
    if (confirmErr)   confirmErr.textContent  = '';

    // Suite de la logique register (window.registerSupabase, etc.)
  });
}

export function initUrlParams() {
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
}
