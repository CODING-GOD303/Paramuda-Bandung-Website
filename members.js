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
    options: { data: { full_name: name } }  
  });

  if (authErr) {
    if (authErr.message.toLowerCase().includes('already registered')) {
      return { ok: false, error: 'Email sudah terdaftar. Silakan masuk.' };
    }
    return { ok: false, error: authErr.message };
  }

  const userId = authData.user.id;  

  const initials = name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const { data: member, error: dbErr } = await _sb
    .from('members')
    .insert({
      id:        userId,          
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      initials,
      status:    'pending',
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbErr) {
    await _sb.auth.admin?.deleteUser(userId).catch(() => {});
    return { ok: false, error: 'Gagal menyimpan data pendaftaran.' };
  }

  return { ok: true, member };
}

async function memberLogin(email, password) {
  const { data: authData, error: authErr } = await _sb.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr) {
    if (authErr.message === 'Email not confirmed') {
      return { ok: false, status: 'unconfirmed', error: 'Email belum dikonfirmasi.' };
    }
    return { ok: false, error: 'Email atau password salah.' };
  }

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

  sessionStorage.setItem(MEMBER_SESSION_KEY, JSON.stringify({
    id:       member.id,
    name:     member.name,
    email:    member.email,
    initials: member.initials,
  }));

  return { ok: true, member };
}

async function membersGetAll() {
  const { data, error } = await _sb
    .from('members')
    .select('*')
    .order('joined_at', { ascending: false });
  if (error) { console.error('membersGetAll:', error); return []; }
  return (data || []).map(_normMember);
}

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
  const { error } = await _sb.from('members').delete().eq('id', id);
  if (error) console.error('memberDelete:', error);
}

async function memberFindByEmail(email) {
  const { data } = await _sb
    .from('members')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  return data ?? null;
}

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
