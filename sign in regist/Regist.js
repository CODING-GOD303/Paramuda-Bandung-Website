async function doRegister() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;
  const errorEl  = document.getElementById('regError');
  const btn      = document.querySelector('.btn-login');

  // Validation
  if (!name || !email || !password) {
    return showError(errorEl, 'Semua kolom wajib diisi.');
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return showError(errorEl, 'Format email tidak valid.');
  }
  if (password.length < 8) {
    return showError(errorEl, 'Password minimal 8 karakter.');
  }
  if (password !== confirm) {
    return showError(errorEl, 'Password tidak cocok.');
  }

  // Loading state
  btn.textContent = 'Mendaftar...';
  btn.disabled = true;
  errorEl.style.display = 'none';

  const result = await authRegister(name, email, password);

  if (!result.ok) {
    btn.textContent = 'Daftar →';
    btn.disabled = false;
    return showError(errorEl, result.error);
  }

  // Success — store session and redirect
  sessionStorage.setItem('paramuda_user', JSON.stringify(result.user));
  window.location.href = '/Hero Page/Hero Page.html';
}

function showError(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

function togglePw(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}