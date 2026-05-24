const SUPABASE_URL = 'https://zirnkxkrwgifkjaimafq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inppcm5reGtyd2dpZmtqYWltYWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MTc4NzgsImV4cCI6MjA5Mzk5Mzg3OH0.GTPZOHvnPJh5b6sib4urdTwyls9Q1-cg3xwvRJb-JD8';           
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ARTICLES ──────────────────────────────────────────────────

async function dbGetAll() {
  const { data, error } = await db
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function dbGetById(id) {
  const { data, error } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbAdd(article) {
  const { data, error } = await db
    .from('articles')
    .insert([article])
    .select()
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

async function dbUpdate(id, updates) {
  const { error } = await db
    .from('articles')
    .update(updates)
    .eq('id', id);
  if (error) console.error(error);
}

async function dbDelete(id) {
  const { error } = await db
    .from('articles')
    .delete()
    .eq('id', id);
  if (error) console.error(error);
}

// ── AUTH ──────────────────────────────────────────────────────

async function authRegister(name, email, password) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  if (error) return { ok: false, error: error.message };

  if (!data.user) return { ok: false, error: 'Email sudah terdaftar. Silakan masuk.' };

  await new Promise(r => setTimeout(r, 800));
  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return { ok: true, user: { ...data.user, ...profile } };
}

async function authLogin(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return { ok: true, user: { ...data.user, ...profile } };
}

async function authLogout() {
  await db.auth.signOut();
  sessionStorage.removeItem('paramuda_user');
}

async function authGetCurrentUser() {
  const { data } = await db.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return profile ? { ...data.user, ...profile } : null;
}

// ── CONTACT REQUESTS ─────────────────────────────────────────

/**
 * Submit a contact / request form from the public site.
 * Called by the #contactForm in Hero_Page.html.
 */
async function dbSubmitContact({ name, email, subject, message }) {
  const { data, error } = await db
    .from('contact_requests')
    .insert([{ name, email, subject, message, status: 'baru' }])
    .select()
    .single();
  if (error) { console.error(error); return { ok: false, error: error.message }; }
  return { ok: true, data };
}

/**
 * Fetch all contact requests (newest first).
 * Used by the Admin Panel.
 */
async function dbGetContactRequests() {
  const { data, error } = await db
    .from('contact_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

/**
 * Update a contact request's status or any other field.
 * status values: 'baru' | 'dibaca' | 'selesai'
 */
async function dbUpdateContactRequest(id, updates) {
  const { error } = await db
    .from('contact_requests')
    .update(updates)
    .eq('id', id);
  if (error) console.error(error);
}

/**
 * Hard-delete a contact request.
 */
async function dbDeleteContactRequest(id) {
  const { error } = await db
    .from('contact_requests')
    .delete()
    .eq('id', id);
  if (error) console.error(error);
}

// ── HELPERS ───────────────────────────────────────────────────

function catClass(cat) {
  const map = {
    'Sains & Teknologi':      'tag-sains',
    'Sosial & Humaniora':     'tag-sosial',
    'Ekonomi & Bisnis':       'tag-ekonomi',
    'Hukum & Kebijakan':      'tag-hukum',
    'Kesehatan & Lingkungan': 'tag-lingkungan',
    'Seni & Kreativitas':     'tag-seni',
  };
  return map[cat] || 'tag-sains';
}

function formatDateLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function toInitials(name) {
  return name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

// ── AVATAR STORAGE ────────────────────────────────────────────

async function uploadAvatar(userId, file) {
  const ext  = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;

  await db.storage.from('avatars').remove([path]);

  const { error } = await db.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return { ok: false, error: error.message };

  const { data } = db.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = data.publicUrl + '?t=' + Date.now();

  await db.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);

  return { ok: true, url: avatarUrl };
}

function getAvatarUrl(user) {
  return user?.avatar_url || null;
}

function bodyToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '', inList = false;
  for (let line of lines) {
    line = line.trim();
    if (!line) { if (inList) { html += '</ul>'; inList = false; } continue; }
    if (line.startsWith('### '))     html += `<h3>${line.slice(4)}</h3>`;
    else if (line.startsWith('## ')) html += `<h2>${line.slice(3)}</h2>`;
    else if (line.startsWith('- '))  { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${line.slice(2)}</li>`; }
    else if (line.startsWith('> '))  html += `<blockquote><p>${line.slice(2)}</p></blockquote>`;
    else { if (inList) { html += '</ul>'; inList = false; } html += `<p>${line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}</p>`; }
  }
  if (inList) html += '</ul>';
  return html;
}