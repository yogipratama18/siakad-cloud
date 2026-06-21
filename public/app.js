// ========== API HELPER ==========
async function api(method, url, body) {
  const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
  return data;
}

// Semua fungsi CRUD sekarang panggil API:
async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value.trim();
  try {
    const data = await api('POST', '/api/auth/login', { username, password });
    currentUser = data.user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('user-name').textContent = currentUser.nama;
    document.getElementById('user-role').textContent = 
      currentUser.role === 'admin' ? 'Administrator' : 
      currentUser.role === 'dosen' ? 'Dosen' : 'Mahasiswa';
    document.getElementById('user-avatar').textContent = currentUser.nama[0];
    document.getElementById('user-avatar').style.background = currentUser.color || '#1a56db';
    await loadAllData();
    buildNav();
    navigate('dashboard');
  } catch(e) {
    showAlert('login-alert', e.message, 'danger');
  }
}

async function loadAllData() {
  const [mhs, mk, nilai, stats] = await Promise.all([
    api('GET', '/api/mahasiswa'),
    api('GET', '/api/matakuliah'),
    api('GET', '/api/nilai'),
    api('GET', '/api/stats'),
  ]);
  DB.mahasiswa = mhs;
  DB.matakuliah = mk;
  DB.nilai = nilai;
  DB.stats = stats;
  if (currentUser.role === 'admin') {
    DB.backups = await api('GET', '/api/backup');
  }
}

async function doLogout() {
  if (!confirm('Yakin ingin keluar?')) return;
  await api('POST', '/api/auth/logout');
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}