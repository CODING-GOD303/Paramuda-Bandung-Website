const SUPABASE_URL = 'https://zirnkxkrwgifkjaimafq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_SZSKyiX5OU4KYhSUijEoVA_AsDNhGqa';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);


const MEMBER_SESSION_KEY = 'paramuda_member_session';



function memberGetSession() {
  const r = sessionStorage.getItem(MEMBER_SESSION_KEY);
  return r ? JSON.parse(r) : null;
}

function memberIsLoggedIn() {
  return !!memberGetSession();
}

function memberLogout() {
  sessionStorage.removeItem(MEMBER_SESSION_KEY);
  _sb.auth.signOut();
}


async function memberRegister({ name, email, password }) {
  const { data: authData, error: authErr } = await _sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }   // stored in auth.users.raw_user_meta_data
  });

  if (authErr) {
    if (authErr.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Email sudah terdaftar. Silakan masuk.' };
    }
    return { ok: false, error: authErr.message };
  }

  const userId = authData.user.id;   // UUID from Supabase Auth

  // 2. Insert into public.members
  const initials = name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const { data: member, error: dbErr } = await _sb
    .from('members')
    .insert({
      id:        userId,          // same UUID as auth.users
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      initials,
      status:    'pending',
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbErr) {
    // Rollback: delete the auth user so the email is freed
    await _sb.auth.admin?.deleteUser(userId).catch(() => {});
    return { ok: false, error: 'Gagal menyimpan data pendaftaran.' };
  }

  return { ok: true, member };
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
// Returns { ok, member?, status?, error? }

async function memberLogin(email, password) {
  // 1. Authenticate with Supabase Auth (password check happens server-side)
  const { data: authData, error: authErr } = await _sb.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr) {
    if (authErr.message === 'Email not confirmed') {
      return { ok: false, status: 'unconfirmed', error: 'Email belum dikonfirmasi.' };
    }
    // "Invalid login credentials" covers wrong email OR wrong password
    return { ok: false, error: 'Email atau password salah.' };
  }

  // 2. Fetch approval status from the members table
  const { data: member, error: dbErr } = await _sb
    .from('members')
    .select('id, name, email, initials, status, joined_at')
    .eq('id', authData.user.id)
    .single();

  if (dbErr || !member) {
    await _sb.auth.signOut();
    return { ok: false, error: 'Data anggota tidak ditemukan. Hubungi admin.' };
  }

  if (member.status === 'pending') {
    await _sb.auth.signOut();
    return { ok: false, status: 'pending', error: 'Akunmu sedang menunggu persetujuan admin.' };
  }

  if (member.status === 'rejected') {
    await _sb.auth.signOut();
    return { ok: false, status: 'rejected', error: 'Pendaftaranmu tidak disetujui. Hubungi admin.' };
  }

  // 3. Cache a lightweight session in sessionStorage
  sessionStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify({
    id:       member.id,
    name:     member.name,
    email:    member.email,
    initials: member.initials,
  }));

  return { ok: true, member };
}

// ── ADMIN: read all members ───────────────────────────────────────────────
// Returns plain array (for admin.html renderMembers())

async function membersGetAll() {
  const { data, error } = await _sb
    .from('members')
    .select('*')
    .order('joined_at', { ascending: false });
  if (error) { console.error('membersGetAll:', error); return []; }
  // Normalise snake_case → camelCase so existing admin.html code keeps working
  return (data || []).map(_normMember);
}

// ── ADMIN: approve / reject / delete ─────────────────────────────────────

async function memberApprove(id) {
  const { error } = await _sb
    .from('members')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('memberApprove:', error);
}

async function memberReject(id) {
  const { error } = await _sb
    .from('members')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('memberReject:', error);
}

async function memberDelete(id) {
  // Delete from public.members; the auth user can be cleaned up via a
  // Supabase Edge Function or manually in the Auth dashboard.
  const { error } = await _sb.from('members').delete().eq('id', id);
  if (error) console.error('memberDelete:', error);
}

// ── ADMIN: email-existence check (used in register.html validation) ───────

async function memberFindByEmail(email) {
  const { data } = await _sb
    .from('members')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return data ?? null;
}

// ── NAVBAR INJECTION ──────────────────────────────────────────────────────
// Still synchronous — reads from cached sessionStorage.

function injectMemberNav() {
  const el = document.getElementById('memberNav');
  if (!el) return;
  const session = memberGetSession();
  if (session) {
    el.innerHTML = `
      <div class="member-chip">
        <div class="member-avatar">${session.initials}</div>
        <span class="member-name">${session.name.split(' ')[0]}</span>
        <div class="member-dropdown">
          <button onclick="memberLogout(); window.location.reload();">Keluar</button>
        </div>
      </div>`;
  } else {
    el.innerHTML = `
      <a href="login.html" class="nav-link">Masuk</a>
      <a href="register.html" class="nav-link btn-nav">Daftar</a>`;
  }
}

// ── INTERNAL HELPERS ──────────────────────────────────────────────────────

function _normMember(m) {
  return {
    id:         m.id,
    name:       m.name,
    email:      m.email,
    initials:   m.initials,
    status:     m.status,
    joinedAt:   m.joined_at,
    approvedAt: m.approved_at  ?? null,
    rejectedAt: m.rejected_at  ?? null,
  };
}
