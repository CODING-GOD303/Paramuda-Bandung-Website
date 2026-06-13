const SUPABASE_URL = 'https://zirnkxkrwgifkjaimafq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SZSKyiX5OU4KYhSUijEoVA_AsDNhGqa';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ARTICLES (public) ─────────────────────────────────────────
async function dbGetPublished() {
  // No 'body' column — cards only need metadata. Fetch body only in dbGetById.
  const { data, error } = await db
    .from('articles')
    .select('id,title,subtitle,author,author_initials,author_role,category,date,date_label,read_time,featured,views,likes,status,cover_image,created_at')
    .eq('status', 'published')
    .is('original_id', null)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
 
async function dbGetAll() {
  // Admin-only: fetches all columns including body, status, submitted_by.
  // Protected server-side by RLS (is_admin() policy).
  const { data, error } = await db
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
 
async function dbGetById(id) {
  const { data, error } = await db
    .from('articles').select('*').eq('id', id).single();
  if (error) { console.error(error); return null; }
  return data;
}
 
async function dbAdd(article) {
  const { data, error } = await db
    .from('articles').insert([article]).select().single();
  if (error) { console.error(error); return null; }
  return data;
}
 
async function dbUpdate(id, updates) {
  const { error } = await db.from('articles').update(updates).eq('id', id);
  if (error) { console.error(error); return { ok: false, error: error.message }; }
  return { ok: true };
}
 
async function dbDelete(id) {
  const { error } = await db.from('articles').delete().eq('id', id);
  if (error) { console.error(error); return { ok: false, error: error.message }; }
  return { ok: true };
}
 
// ── SUBMISSION WORKFLOW ───────────────────────────────────────
 
async function dbSubmitArticle(payload, status = 'pending') {
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Kamu harus login.' };
  const { data, error } = await db.from('articles').insert([{
    ...payload,
    status,
    submitted_by: userData.user.id,
    date: payload.date || new Date().toISOString().split('T')[0],
    date_label: payload.date
      ? new Date(payload.date).toLocaleDateString('id-ID', { month:'long', year:'numeric' })
      : new Date().toLocaleDateString('id-ID', { month:'long', year:'numeric' }),
    author_initials: toInitials(payload.author || ''),
  }]).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
 
async function dbSubmitEditRequest(originalId, payload) {
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Kamu harus login.' };
  const { data, error } = await db.from('articles').insert([{
    ...payload,
    status: 'pending_edit',
    submitted_by: userData.user.id,
    original_id: originalId,
    date_label: payload.date
      ? new Date(payload.date).toLocaleDateString('id-ID', { month:'long', year:'numeric' })
      : new Date().toLocaleDateString('id-ID', { month:'long', year:'numeric' }),
    author_initials: toInitials(payload.author || ''),
  }]).select().single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
 
async function dbGetMySubmissions() {
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) return [];
  const { data, error } = await db.from('articles').select('*')
    .eq('submitted_by', userData.user.id)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
 
async function dbGetPendingSubmissions() {
  const { data, error } = await db.from('articles').select('*')
    .in('status', ['pending', 'pending_edit'])
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
 
async function dbApproveSubmission(id) {
  const sub = await dbGetById(id);
  if (!sub) return { ok: false, error: 'Artikel tidak ditemukan.' };
  if (sub.status === 'pending') {
    await dbUpdate(id, { status: 'published', rejection_reason: null });
    return { ok: true };
  }
  if (sub.status === 'pending_edit') {
    const { original_id, status, submitted_by, rejection_reason, id: _id, created_at, original_id: _oid, ...editFields } = sub;
    await dbUpdate(sub.original_id, { ...editFields, status: 'published' });
    await dbDelete(id);
    return { ok: true };
  }
  return { ok: false, error: 'Status tidak valid.' };
}
 
async function dbRejectSubmission(id, reason = '') {
  await dbUpdate(id, { status: 'rejected', rejection_reason: reason });
  return { ok: true };
}
 
async function dbWithdrawSubmission(id) {
  const { error } = await db.from('articles').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
 
// ── CONTACT REQUESTS ─────────────────────────────────────────
 
async function dbSubmitContact({ name, email, subject, message }) {
  const { data, error } = await db.from('contact_requests')
    .insert([{ name, email, subject, message, status: 'baru' }]).select().single();
  if (error) { console.error(error); return { ok: false, error: error.message }; }
  return { ok: true, data };
}
 
async function dbGetContactRequests() {
  const { data, error } = await db.from('contact_requests')
    .select('*').order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}
 
async function dbUpdateContactRequest(id, updates) {
  const { error } = await db.from('contact_requests').update(updates).eq('id', id);
  if (error) console.error(error);
}
 
async function dbDeleteContactRequest(id) {
  const { error } = await db.from('contact_requests').delete().eq('id', id);
  if (error) console.error(error);
}
 
// ── AUTH ──────────────────────────────────────────────────────
 
async function authRegister(name, email, password) {
  const { data, error } = await db.auth.signUp({
    email, password, options: { data: { name } }
  });
  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: 'Email sudah terdaftar. Silakan masuk.' };
  await new Promise(r => setTimeout(r, 800));
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).single();
  return { ok: true, user: { ...data.user, ...profile } };
}
 
async function authLogin(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).single();
  return { ok: true, user: { ...data.user, ...profile } };
}
 
async function authLogout() {
  await db.auth.signOut();
  sessionStorage.clear();           // clear user cache and liked articles
}
 
async function authGetCurrentUser() {
  // Check session-level cache first — avoids a round-trip on every page load
  const cached = sessionStorage.getItem('paramuda_user');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Still verify the Supabase session is alive (lightweight check)
      const { data } = await db.auth.getSession();
      if (data.session && parsed.id) return parsed;
    } catch (_) { /* fall through to fresh fetch */ }
  }
 
  const { data } = await db.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await db.from('profiles').select('*').eq('id', data.user.id).single();
  const user = profile ? { ...data.user, ...profile } : null;
  if (user) sessionStorage.setItem('paramuda_user', JSON.stringify(user));
  return user;
}
 
 
// ── ARTICLE IMAGE UPLOAD ─────────────────────────────────────
 
/**
 * Upload a cover image to the article-images bucket.
 * File is stored at: {userId}/{timestamp}_{filename}
 * Returns the public URL on success.
 */
async function uploadArticleImage(file) {
  const { data: userData } = await db.auth.getUser();
  if (!userData.user) return { ok: false, error: 'Harus login.' };
 
  const ext       = file.name.split('.').pop().toLowerCase();
  const allowed   = ['jpg','jpeg','png','webp','gif'];
  if (!allowed.includes(ext)) return { ok: false, error: 'Format tidak didukung. Gunakan JPG, PNG, atau WebP.' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Ukuran maksimal 5 MB.' };
 
  const path = `${userData.user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
 
  const { error } = await db.storage
    .from('article-images')
    .upload(path, file, { upsert: false, contentType: file.type });
 
  if (error) return { ok: false, error: error.message };
 
  const { data } = db.storage.from('article-images').getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
 
// ── HELPERS ───────────────────────────────────────────────────
 
function catClass(cat) {
  const map = {
    'Sains & Teknologi':'tag-sains','Sosial & Humaniora':'tag-sosial',
    'Ekonomi & Bisnis':'tag-ekonomi','Hukum & Kebijakan':'tag-hukum',
    'Kesehatan & Lingkungan':'tag-lingkungan','Seni & Kreativitas':'tag-seni',
  };
  return map[cat] || 'tag-sains';
}
 
function formatDateLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('id-ID', { month:'long', year:'numeric' });
}
 
function toInitials(name) {
  if (!name) return '?';
  return name.trim().split(' ').slice(0,2).map(w => w[0].toUpperCase()).join('');
}
 
async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/avatar.${ext}`;
  await db.storage.from('avatars').remove([path]);
  const { error } = await db.storage.from('avatars')
    .upload(path, file, { upsert:true, contentType:file.type });
  if (error) return { ok:false, error:error.message };
  const { data } = db.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = data.publicUrl + '?t=' + Date.now();
  await db.from('profiles').update({ avatar_url:avatarUrl }).eq('id', userId);
  return { ok:true, url:avatarUrl };
}
 
function getAvatarUrl(user) { return user?.avatar_url || null; }
 
function bodyToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '', inList = false;
  for (let line of lines) {
    line = line.trim();
    if (!line) { if (inList) { html += '</ul>'; inList = false; } continue; }
    if (line.startsWith('### '))     html += `<h3>${line.slice(4)}</h3>`;
    else if (line.startsWith('## ')) html += `<h2>${line.slice(3)}</h2>`;
    else if (line.startsWith('- '))  { if (!inList){html+='<ul>';inList=true;} html+=`<li>${line.slice(2)}</li>`; }
    else if (line.startsWith('> '))  html += `<blockquote><p>${line.slice(2)}</p></blockquote>`;
    else { if(inList){html+='</ul>';inList=false;} html+=`<p>${line.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}</p>`; }
  }
  if (inList) html += '</ul>';
  return html;
}
// ── RECRUITMENT SETTINGS ─────────────────────────────────────
// Returns the most recent recruitment_settings row, or null if
// the table doesn't exist yet. Safe to call before the table is created.
async function dbGetRecruitment() {
  const { data, error } = await db
    .from('recruitment_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) { console.warn('dbGetRecruitment:', error.message); return null; }
  return data;
}

async function dbUpdateRecruitment(id, updates) {
  const { error } = await db
    .from('recruitment_settings')
    .update(updates)
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function dbUpsertRecruitment(payload) {
  // Inserts a new row if none exists, otherwise updates the latest one.
  const existing = await dbGetRecruitment();
  if (existing) return dbUpdateRecruitment(existing.id, payload);
  const { data, error } = await db
    .from('recruitment_settings')
    .insert([payload])
    .select()
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}