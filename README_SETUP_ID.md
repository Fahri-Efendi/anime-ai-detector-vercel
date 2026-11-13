# 🎌 Anime AI Detector — Patch Neon PostgreSQL & Riwayat Anonim

Pembaruan sistem untuk menambahkan integrasi database **Neon PostgreSQL** dan fitur **Riwayat Prediksi Anonim** berbasis sesi cookie pada aplikasi Anime AI Detector.

---

## 📦 Isi Paket

| File / Folder | Deskripsi |
| :--- | :--- |
| `app.py` | Backend Flask yang diperbarui dengan integrasi Neon PostgreSQL dan API riwayat anonim. |
| `templates/index.html` | Halaman utama deteksi yang dilengkapi menu navigasi dan bagian **Riwayat**. |
| `public/css/style.css` | CSS asli pengguna dengan penambahan perbaikan *preview* dan tampilan riwayat. |
| `public/js/script.js` | Logika JavaScript untuk *upload*, *preview*, prediksi, dan manajemen riwayat. |
| `requirements.txt` | Daftar dependensi proyek terbaru (termasuk `psycopg` dan `python-dotenv`). |
| `.gitignore` | Konfigurasi untuk mengecualikan `.env` dan file lokal lainnya dari Git. |
| `.env.example` | Templat contoh nama *environment variable* (bukan kredensial aktif). |
| `database_schema.sql` | Skema SQL untuk tabel riwayat *(opsional; aplikasi otomatis membuat tabel jika belum ada)*. |

---

## ⚠️ Sebelum Memasang

> [!IMPORTANT]
> Pastikan kamu melakukan langkah persiapan berikut sebelum menimpa file proyek yang ada:

- [ ] **Backup Proyek:** Cadangkan seluruh folder proyek yang sedang berjalan saat ini.
- [ ] **Pertahankan Model & ML Service:** **Jangan menimpa** file `ml_service.py` dan `models/best_model.pth` milikmu. Keduanya tetap digunakan tanpa perubahan.
- [ ] **Buat `SECRET_KEY` Acak:** Jalankan salah satu perintah berikut di terminal **PowerShell** untuk menghasilkan kunci rahasia (*cryptographically secure*):
  * **Menggunakan Python (Direkomendasikan):**
    ```powershell
    python -c "import secrets; print(secrets.token_hex(32))"
    ```
  * **Menggunakan OpenSSL (Jika terinstal):**
    ```powershell
    openssl rand -hex 32
    ```
  *(Salin deretan 64 karakter huruf dan angka yang muncul di layar).*

- [ ] **Konfigurasi Environment:** Buat atau isi file `.env` di folder utama proyek, lalu tempelkan *connection string* Neon dan hasil `SECRET_KEY` tadi:
  ```env
  DATABASE_URL="connection_string_neon_asli_dengan_sslmode=require"
  SECRET_KEY="tempel_hasil_generate_secret_key_di_sini"
  ```

> [!CAUTION]
> **Keamanan Kredensial:** Jangan pernah mengunggah file `.env` ke GitHub atau membagikan isinya kepada siapa pun. Pastikan `.env` sudah terdaftar di dalam `.gitignore`.

---

## 🛠️ Cara Memasang

Ikuti urutan langkah berikut untuk menerapkan *patch*:

1. **Salin Backend & Dependensi:** Salin `app.py` dan `requirements.txt` ke folder utama proyek (timpa file yang lama).
2. **Perbarui Template:** Salin isi folder `templates/` ke dalam folder `templates/` proyekmu (timpa `index.html`).
3. **Salin Aset Statis:** Salin folder `public/` ke folder utama proyek. Aplikasi menggunakan `public/` sebagai *static folder* sehingga aset dapat diakses melalui `/css/...` dan `/js/...`.
4. **Verifikasi File Inti:** Pastikan `ml_service.py`, `models/best_model.pth`, dan file `.env` sudah berada di posisi yang benar.

---

## 🚀 Instalasi & Menjalankan Lokal

Buka terminal **PowerShell** (pastikan *virtual environment* `.venv` sudah aktif), lalu jalankan perintah berikut:

### 1. Instal Dependensi
```powershell
python -m pip install -r requirements.txt
```

### 2. Jalankan Aplikasi
```powershell
python app.py
```

Setelah server berjalan, buka browser dan akses alamat: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## ✅ Daftar Pengujian (Testing Checklist)

Gunakan daftar periksa interaktif di bawah ini untuk memastikan semua fitur berjalan lancar:

- [ ] **Koneksi Awal:** Buka halaman utama; bagian **Riwayat** berhasil memuat data dari Neon tanpa *error*.
- [ ] **Unggah & Prediksi:** Unggah gambar berukuran di bawah **4 MB** dan jalankan proses prediksi.
- [ ] **Penyimpanan Otomatis:** Pastikan riwayat tersimpan jika prediksi berhasil dan database terhubung.
- [ ] **Persistensi Sesi:** Lakukan *refresh* halaman; riwayat sebelumnya harus tetap muncul pada browser yang sama.
- [ ] **Manajemen Riwayat:** Uji fitur hapus satu per satu (*delete single item*) dan hapus semua riwayat (*clear all*).
- [ ] **Isolasi Pengunjung:** Buka aplikasi menggunakan mode *Incognito / Private Window* untuk memastikan pengunjung berbeda tidak dapat melihat riwayat satu sama lain.

---

## 📝 Catatan Teknis

<details>
<summary><b>Klik untuk melihat detail teknis & batasan sistem</b></summary>

* **Inisialisasi Tabel Otomatis:** `app.py` secara otomatis mengeksekusi perintah `CREATE TABLE IF NOT EXISTS` beserta *index*-nya saat *endpoint* database pertama kali diakses.
* **Toleransi Kegagalan Database:** Hasil prediksi gambar tetap akan dikembalikan kepada pengguna meskipun penyimpanan ke database gagal (respons JSON akan menyertakan flag `history_saved=false`).
* **Mekanisme Cookie & Visitor ID:** Cookie Flask menyimpan data sesi yang ditandatangani (*signed*), bukan dienkripsi. *Visitor ID* hanya bersifat pelacakan sementara dan bukan pengganti sistem autentikasi akun. Pengguna akan kehilangan akses riwayat jika *cookie* dihapus atau berganti perangkat/browser.
* **Batasan Deployment Vercel:**
  * Batas ukuran unggahan gambar ditetapkan maksimal **4 MB** untuk menyesuaikan batas *request body* Vercel sebesar 4.5 MB.
  * *Patch* ini belum menjamin keberhasilan *deployment* di Vercel karena ukuran dependensi **PyTorch** yang besar dapat melewati batas kapasitas *Serverless Function*. Pertimbangkan untuk mengekspor model ke format **ONNX** jika ukuran paket terlalu besar.

</details>
