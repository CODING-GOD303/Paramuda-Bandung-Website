// ── SUPABASE CONFIG ───────────────────────────────────────
const SUPABASE_URL = 'https://zirnkxkrwgifkjaimafq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SZSKyiX5OU4KYhSUijEoVA_AsDNhGqa';           
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ARTICLES ──────────────────────────────────────────────

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

// ── AUTH ──────────────────────────────────────────────────

async function authRegister(name, email, password) {
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { name } }   // passed to the trigger as raw_user_meta_data
  });
  if (error) return { ok: false, error: error.message };

  // Profile row is auto-created by the DB trigger.
  // Wait briefly then fetch it so we can return it.
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

  // Get role from profiles table
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

// ── HELPERS (unchanged) ───────────────────────────────────

function catClass(cat) {
  const map = {
    'Sains & Teknologi':     'tag-sains',
    'Sosial & Humaniora':    'tag-sosial',
    'Ekonomi & Bisnis':      'tag-ekonomi',
    'Hukum & Kebijakan':     'tag-hukum',
    'Kesehatan & Lingkungan':'tag-lingkungan',
    'Seni & Kreativitas':    'tag-seni',
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

// ── AVATAR STORAGE ────────────────────────────────────────
 
async function uploadAvatar(userId, file) {
  // Always save as {userId}/avatar + original extension
  const ext  = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
 
  // Remove old avatar first (ignore errors if it doesn't exist)
  await db.storage.from('avatars').remove([path]);
 
  const { error } = await db.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
 
  if (error) return { ok: false, error: error.message };
 
  // Get the public URL
  const { data } = db.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = data.publicUrl + '?t=' + Date.now(); // cache-bust
 
  // Save URL to profiles table
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