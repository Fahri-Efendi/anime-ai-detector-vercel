ANIME AI DETECTOR - PATCH NEON POSTGRESQL + RIWAYAT ANONIM

ISI PAKET
- app.py: backend Flask yang diperbarui dengan Neon PostgreSQL dan API riwayat anonim.
- templates/index.html: halaman deteksi ditambah menu dan bagian Riwayat.
- public/css/style.css: CSS asli yang dikirim pengguna, ditambah perbaikan preview dan style riwayat.
- public/js/script.js: JavaScript upload, preview, prediksi, dan riwayat.
- requirements.txt: dependency project termasuk psycopg dan python-dotenv.
- .gitignore: mengecualikan .env dan file lokal.
- .env.example: contoh nama environment variable, bukan kredensial aktif.
- database_schema.sql: SQL tabel riwayat (opsional; aplikasi juga membuat tabel jika belum ada).

SEBELUM MEMASANG
1. Backup folder project yang sedang dipakai.
2. Jangan menimpa ml_service.py. File ml_service.py milik pengguna tetap dipakai tanpa perubahan.
3. Jangan menimpa models/best_model.pth.
4. Buat/isi file .env di folder utama:
   DATABASE_URL="connection string Neon asli dengan sslmode=require"
   SECRET_KEY="secret acak yang dibuat sendiri"
5. Jangan pernah mengunggah .env ke GitHub atau membagikan isinya.

CARA MEMASANG
1. Salin app.py ke folder utama project, menggantikan app.py lama.
2. Salin requirements.txt ke folder utama, menggantikan requirements.txt lama.
3. Salin isi folder templates ke folder templates project (ganti index.html).
4. Salin folder public dari paket ini ke folder utama project.
   Aplikasi menggunakan folder public sebagai static folder. CSS/JS dapat dilayani di /css/... dan /js/....
5. Pertahankan ml_service.py dan models/best_model.pth yang sudah ada.
6. Pastikan .env berisi DATABASE_URL dan SECRET_KEY.

INSTALASI DEPENDENCY DI POWERSHELL (DENGAN .venv AKTIF)
python -m pip install -r requirements.txt

JALANKAN LOKAL
python app.py
Buka http://127.0.0.1:5000

PENGUJIAN
- Buka halaman; bagian Riwayat akan mencoba mengambil data dari Neon.
- Unggah gambar di bawah 4 MB dan lakukan prediksi.
- Jika prediksi berhasil dan database tersambung, riwayat akan disimpan.
- Refresh halaman: riwayat semestinya tetap ada pada browser yang sama.
- Coba hapus satu item dan hapus seluruh riwayat.
- Gunakan browser incognito untuk menguji bahwa visitor berbeda tidak melihat riwayat yang sama.

CATATAN TEKNIS
- app.py membuat tabel dan index dengan CREATE TABLE IF NOT EXISTS saat endpoint database dipakai.
- Prediksi tetap dikembalikan bila database gagal menyimpan riwayat; response memberi history_saved=false.
- Cookie Flask berisi session yang ditandatangani, bukan dienkripsi. Visitor ID bukan pengganti autentikasi akun.
- Pengguna dapat kehilangan akses ke riwayat anonim jika cookie browser dihapus atau berpindah browser/perangkat.
- Batas upload ditetapkan 4 MB agar sesuai batas request body Vercel 4.5 MB.
- Paket ini belum menjamin deployment Vercel berhasil. Ukuran dependency PyTorch harus diuji terhadap batas ukuran Function Vercel. Pertimbangkan ekspor ONNX bila paket terlalu besar.
