document.getElementById('signinForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = this.querySelector('button[type="submit"]');

  // Loading state
  btn.textContent = 'Masuk...';
  btn.disabled = true;

  const result = await authLogin(email, password);

  if (!result.ok) {
    btn.textContent = 'Sign In';
    btn.disabled = false;
    alert(result.error || 'Email atau password salah.');
    return;
  }

  // Store session and redirect
  sessionStorage.setItem('paramuda_user', JSON.stringify(result.user));

  // Admins go to the admin panel, members go to the home page
  if (result.user.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = '/Hero Page/Hero Page.html';
  }
});