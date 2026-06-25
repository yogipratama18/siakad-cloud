// scripts/seed.js
// Membuat akun awal (admin, dosen, mahasiswa) dengan password YANG DIKETAHUI.
// (Password di db.json versi lama memakai hash bcrypt yang plaintext aslinya
// tidak diketahui siapapun, jadi tidak bisa dipindahkan langsung.)
//
// Jalankan: node scripts/seed.js   (pastikan MONGODB_URI sudah di .env)
// Aman dijalankan berkali-kali — user yang sudah ada akan dilewati, bukan dobel.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../db');
const User = require('../models/user');
const Mahasiswa = require('../models/mahasiswa');

async function upsertUser(data, plainPassword) {
  const existing = await User.findOne({ username: data.username });
  if (existing) {
    console.log(`↷ User "${data.username}" sudah ada, dilewati.`);
    return;
  }
  const password = await bcrypt.hash(plainPassword, 10);
  await User.create({ ...data, password });
  console.log(`✔ User "${data.username}" dibuat. Password: ${plainPassword}`);
}

async function main() {
  await connectDB();

  await upsertUser(
    { id: 'admin', username: 'admin', role: 'admin', nama: 'Administrator', color: '#3a3a3a' },
    'Admin123!'
  );

  await upsertUser(
    { id: 'dosen', username: 'dosen', role: 'dosen', nama: 'Dr. Hendra Wijaya', nidn: '0123456789', color: '#4a5a4a' },
    'Dosen123!'
  );

  // Mahasiswa contoh + akun login yang merujuk ke NIM yang sama
  const mhsExisting = await Mahasiswa.findOne({ nim: '2024001' });
  if (!mhsExisting) {
    await Mahasiswa.create({
      nim: '2024001', nama: 'Ahmad Rizal Pratama', prodi: 'Teknik Informatika',
      angkatan: 2024, semester: 2, email: 'ahmad@student.ac.id',
      telp: '081234567890', alamat: 'Jl. Merdeka No.1', ipk: 0, status: 'aktif',
    });
    console.log('✔ Data mahasiswa contoh (NIM 2024001) dibuat.');
  } else {
    console.log('↷ Mahasiswa NIM 2024001 sudah ada, dilewati.');
  }

  await upsertUser(
    { id: 'mahasiswa', username: '2024001', role: 'mahasiswa', nama: 'Ahmad Rizal Pratama', nim: '2024001', color: '#4a4a5a' },
    'Mhs123!'
  );

  console.log('\nSelesai. Gunakan kredensial berikut untuk login:');
  console.log('  Admin     : admin / Admin123!');
  console.log('  Dosen     : dosen / Dosen123!');
  console.log('  Mahasiswa : 2024001 / Mhs123!');
  console.log('\nPENTING: ganti semua password ini setelah login pertama di lingkungan produksi.');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed gagal:', err);
  process.exit(1);
});
