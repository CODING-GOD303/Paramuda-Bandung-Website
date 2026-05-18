/* =========================================
   PARAMUDA — db.js
   Client-side database via localStorage
   All pages import this script
   ========================================= */

const DB_KEY   = 'paramuda_articles';
const AUTH_KEY = 'paramuda_session';

// ── SEED DATA (shown on first ever load) ──────────────────────────────────
const SEED_ARTICLES = [
  {
    id: 1,
    title: "Peran AI dalam Transformasi Sistem Pendidikan di Indonesia",
    subtitle: "Eksplorasi mendalam tentang bagaimana kecerdasan buatan mulai mengubah lanskap pendidikan tinggi dan implikasinya bagi mahasiswa.",
    category: "Sains & Teknologi",
    author: "Rizky Pratama",
    authorInitials: "RP",
    authorRole: "Mahasiswa Teknik Informatika",
    date: "2025-04-10",
    dateLabel: "April 2025",
    readTime: "8",
    views: 1240,
    likes: 84,
    featured: true,
    body: `Dalam satu dekade terakhir, kecerdasan buatan (AI) telah bergerak dari laboratorium riset menuju ruang kelas nyata. Di Indonesia, fenomena ini mulai terasa — terutama di perguruan tinggi besar seperti ITB, UI, dan UGM — namun implementasinya masih jauh dari merata.

## Mengapa AI Relevan untuk Pendidikan Indonesia?

Indonesia memiliki lebih dari 4.500 perguruan tinggi yang melayani sekitar 8 juta mahasiswa aktif. Dengan keragaman geografis dan ketimpangan kualitas yang signifikan antara universitas di Jawa dan luar Jawa, AI hadir sebagai jembatan potensial.

Sistem pembelajaran adaptif berbasis AI mampu menyesuaikan materi dengan kemampuan masing-masing siswa. Alih-alih satu silabus untuk semua, setiap mahasiswa mendapat jalur belajar yang dipersonalisasi.

## Tiga Area Utama Transformasi

### 1. Personalisasi Pembelajaran

Algoritma machine learning dapat menganalisis pola belajar mahasiswa — kapan mereka aktif, topik apa yang membuat mereka stuck, dan metode apa yang paling efektif untuk mereka.

### 2. Deteksi Plagiarisme dan Integritas Akademik

Munculnya model bahasa besar (LLM) menciptakan dilema baru: mahasiswa kini bisa menghasilkan esai berkualitas tinggi dengan bantuan AI dalam hitungan menit.

### 3. Aksesibilitas bagi Mahasiswa Berkebutuhan Khusus

AI membuka pintu bagi mahasiswa dengan disabilitas. Transkripsi otomatis real-time dan terjemahan bahasa isyarat berbasis computer vision adalah contoh nyata dampak positif.

## Kesimpulan

AI tidak akan pergi. Pertanyaannya bukan lagi apakah kita harus mengadopsinya, melainkan bagaimana kita melakukannya dengan bijak, inklusif, dan berakar pada nilai-nilai pendidikan kita sendiri.`
  },
  {
    id: 2,
    title: "Urban Farming dan Ketahanan Pangan Kota Bandung",
    subtitle: "Analisis potensi pertanian perkotaan sebagai solusi ketahanan pangan di era urban.",
    category: "Sosial & Humaniora",
    author: "Sinta Dewi",
    authorInitials: "SD",
    authorRole: "Mahasiswi Sosiologi",
    date: "2025-03-15",
    dateLabel: "Maret 2025",
    readTime: "6",
    views: 870,
    likes: 61,
    featured: false,
    body: `Bandung, dengan kepadatan penduduk yang terus meningkat, menghadapi tantangan serius dalam menjamin ketahanan pangan warganya.

## Apa itu Urban Farming?

Urban farming adalah praktik bercocok tanam di lingkungan perkotaan — di atap gedung, lahan kosong, balkon, dan dinding vertikal. Di Bandung, gerakan ini mulai tumbuh di sejumlah kelurahan seperti Cicadas dan Antapani.

## Potensi dan Tantangan

Potensi urban farming sangat besar: mengurangi biaya pangan keluarga, memperpendek rantai distribusi, dan membangun kesadaran lingkungan. Namun tantangannya pun nyata — keterbatasan lahan, kurangnya pengetahuan teknis, dan minimnya dukungan kebijakan dari pemerintah kota.

## Rekomendasi

Pemerintah Kota Bandung perlu mengintegrasikan urban farming dalam rencana tata ruang kota, memberikan subsidi benih, dan menyelenggarakan pelatihan rutin bagi warga.`
  },
  {
    id: 3,
    title: "UMKM Digital: Peluang dan Tantangan di Era Pasca-Pandemi",
    subtitle: "Mengkaji adaptasi UMKM Bandung terhadap ekosistem digital yang terus berkembang.",
    category: "Ekonomi & Bisnis",
    author: "Ahmad Fauzi",
    authorInitials: "AF",
    authorRole: "Mahasiswa Manajemen Bisnis",
    date: "2025-03-01",
    dateLabel: "Maret 2025",
    readTime: "5",
    views: 640,
    likes: 47,
    featured: false,
    body: `Pandemi COVID-19 memaksa jutaan pelaku UMKM Indonesia untuk beradaptasi secara digital dalam waktu singkat. Kini, dua tahun setelah masa darurat berakhir, bagaimana kondisi mereka?

## Transformasi Digital yang Terpaksa

Banyak pelaku UMKM di Bandung yang awalnya skeptis terhadap platform digital kini justru mendapat 60-70% omzet mereka dari kanal online. Tokopedia, Shopee, dan Instagram menjadi tulang punggung penjualan.

## Tantangan yang Masih Ada

Meski angka adopsi meningkat, tantangan literasi digital, biaya logistik, dan persaingan dengan produk impor masih menjadi hambatan nyata bagi pelaku UMKM kecil.

## Peluang ke Depan

Dengan penetrasi internet yang terus meningkat dan tumbuhnya kepercayaan konsumen terhadap produk lokal, UMKM digital Indonesia memiliki potensi yang sangat besar untuk berkembang lebih jauh.`
  }
];

// ── CRUD OPERATIONS ───────────────────────────────────────────────────────

function dbInit() {
  if (!localStorage.getItem(DB_KEY)) {
    localStorage.setItem(DB_KEY, JSON.stringify(SEED_ARTICLES));
  }
}

function dbGetAll() {
  dbInit();
  return JSON.parse(localStorage.getItem(DB_KEY)) || [];
}

function dbGetById(id) {
  return dbGetAll().find(a => a.id === Number(id));
}

function dbSave(articles) {
  localStorage.setItem(DB_KEY, JSON.stringify(articles));
}

function dbAdd(article) {
  const articles = dbGetAll();
  article.id = Date.now();
  article.views = 0;
  article.likes = 0;
  articles.unshift(article);
  dbSave(articles);
  return article;
}

function dbUpdate(id, updates) {
  const articles = dbGetAll();
  const i = articles.findIndex(a => a.id === Number(id));
  if (i !== -1) articles[i] = { ...articles[i], ...updates };
  dbSave(articles);
}

function dbDelete(id) {
  dbSave(dbGetAll().filter(a => a.id !== Number(id)));
}

// ── AUTH ──────────────────────────────────────────────────────────────────
// NOTE: Client-side password — suitable for a low-stakes PKM site.
// For real security, use a proper backend with hashed passwords.
const ADMIN_PASSWORD = 'paramuda2025'; // ← change this!

function authLogin(password) {
  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, '1');
    return true;
  }
  return false;
}
function authLogout() { sessionStorage.removeItem(AUTH_KEY); }
function authCheck()  { return sessionStorage.getItem(AUTH_KEY) === '1'; }

// ── HELPERS ───────────────────────────────────────────────────────────────

// Convert plain-text body (with ## headings and ### subheadings) → HTML
function bodyToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3>${line.slice(4)}</h3>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.slice(3)}</h2>`;
    } else if (line.startsWith('- ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${line.slice(2)}</li>`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote><p>${line.slice(2)}</p></blockquote>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      // Bold: **text**
      line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html += `<p>${line}</p>`;
    }
  }
  if (inList) html += '</ul>';
  return html;
}

// Category → CSS class
function catClass(cat) {
  const map = {
    'Sains & Teknologi':    'tag-sains',
    'Sosial & Humaniora':   'tag-sosial',
    'Ekonomi & Bisnis':     'tag-ekonomi',
    'Hukum & Kebijakan':    'tag-hukum',
    'Kesehatan & Lingkungan':'tag-lingkungan',
    'Seni & Kreativitas':   'tag-seni',
  };
  return map[cat] || 'tag-sains';
}

// Format date label from ISO string
function formatDateLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

// Auto-generate initials from name
function toInitials(name) {
  return name.trim().split(' ').slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

const USERS_KEY = 'paramuda_users';

function usersGetAll() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function usersSave(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function usersGetByEmail(email) {
  return usersGetAll().find(u => u.email === email.toLowerCase());
}

function usersRegister(name, email, password) {
  const users = usersGetAll();

  // Check if email already exists
  if (users.find(u => u.email === email.toLowerCase())) {
    return { ok: false, error: 'Email sudah terdaftar.' };
  }

  // Basic password hash (use a real library in production!)
  const hashed = btoa(password); // base64 — NOT secure, just for demo

  const newUser = {
    id:        Date.now(),
    name:      name.trim(),
    email:     email.toLowerCase().trim(),
    password:  hashed,
    role:      'member',        // 'admin' | 'member'
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  usersSave(users);
  return { ok: true, user: newUser };
}

function usersLogin(email, password) {
  const user = usersGetByEmail(email);
  if (!user) return { ok: false, error: 'Email tidak ditemukan.' };
  if (user.password !== btoa(password)) return { ok: false, error: 'Password salah.' };
  return { ok: true, user };
}

// Store the logged-in user in sessionStorage
function sessionSet(user) {
  sessionStorage.setItem('paramuda_user', JSON.stringify(user));
}
function sessionGet() {
  return JSON.parse(sessionStorage.getItem('paramuda_user') || 'null');
}
function sessionClear() {
  sessionStorage.removeItem('paramuda_user');
}