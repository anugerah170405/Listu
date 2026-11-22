# 🎵 Listu — AI Audio & Music Studio

> **Listu** adalah studio musik cerdas berbasis web yang mengombinasikan antarmuka 3D interaktif modern dengan rangkaian model kecerdasan buatan (AI) mutakhir untuk pemisahan vokal, transkripsi & sinkronisasi lirik otomatis, serta transformasi aransemen musik ke berbagai genre.

---

## 👥 Anggota Kelompok

Proyek ini dikembangkan oleh:
* **Nanalis, Anatasya Finchy**
* **Kowal, Chelsea Mikha**
* **Tandilangi, Gavrila Balo**
* **Gari, Anugerah**

---

## ✨ Fitur Utama

1. **🎙️ AI Vocal & Instrumental Separation (Stems)**
   * Memisahkan trek vokal (*acapella*) dan instrumen (*karaoke backing track*) secara otomatis menggunakan model AI deep learning (BS-RoFormer / UVR / Demucs).
2. **📝 AI Lyrics Transcription & Word-Level Sync**
   * Mentranskripsikan audio menjadi lirik teks dan menyelaraskan penanda waktu (*time-stamped lyrics*) secara otomatis dan presisi menggunakan Whisper & `stable-ts`.
3. **🎸 AI Genre & Style Music Transformer**
   * Mengaransemen ulang musik ke berbagai genre (seperti *Jazz, Lo-fi, Rock, Synthwave, Acoustic, dsb.*) menggunakan `MusicGen-Melody` dengan pelestarian kontur vokal asli, dynamic sidechain ducking, dan audio mastering filter.
4. **🌊 Interactive 3D Liquid Canvas & Player**
   * Antarmuka pemutar musik 3D berbasis **Three.js** dengan kartu dinamis, efek visual *liquid shader*, tampilan lirik tersinkronisasi, dan Studio Panel kontrol terintegrasi.
5. **☁️ Cloud Authentication & Database Sync**
   * Sinkronisasi data trek pengguna secara *real-time* berbasis Google Firebase (Authentication & Cloud Firestore).

---

## 🛠️ Arsitektur & Tech Stack

| Lapisan | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS | Antarmuka web modern, ultra-responsif, dan modular |
| **3D & Visuals** | Three.js, Custom GLSL Shaders | Visualisasi kartu 3D dan liquid canvas interaktif |
| **Backend API** | Python 3.10+, FastAPI, Uvicorn | RESTful API asynchronous berkinerja tinggi |
| **AI Models** | PyTorch, Hugging Face Transformers | MusicGen-Melody (Meta), Faster-Whisper, Audio-Separator |
| **Audio Core** | FFmpeg (via `static-ffmpeg`), SoundFile, Librosa | Pemrosesan, decoding, dan filtering audio digital |
| **Database & Auth** | Google Firebase (Auth & Cloud Firestore) | Manajemen sesi pengguna dan penyimpanan metadata trek |

---

## 📋 Prasyarat Sistem

Sebelum menjalankan proyek, pastikan perangkat Anda memiliki:
* **Node.js** v18.0 atau lebih baru ([Unduh Node.js](https://nodejs.org/))
* **Python** v3.10 hingga v3.12 ([Unduh Python](https://www.python.org/))
* **Git** ([Unduh Git](https://git-scm.com/))
* *(Opsional)* Kartu grafis **NVIDIA GPU dengan CUDA** (jika ingin akselerasi inferensi AI 5x–15x lebih cepat). CPU standar tetap didukung penuh.

---

## 🚀 Panduan Menjalankan Proyek

### 1. Clone Repository

```bash
git clone https://github.com/username/listu.git
cd listu
```

---

### 2. Setup Backend (FastAPI & AI Engines)

1. **Masuk ke folder backend:**
   ```bash
   cd backend
   ```

2. **Buat dan aktifkan Virtual Environment:**
   * **macOS / Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```
   * **Windows:**
     ```bash
     python -m venv .venv
     .venv\Scripts\activate
     ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   > 💡 *Catatan:* Proyek ini sudah dilengkapi `static-ffmpeg`, sehingga FFmpeg otomatis terkonfigurasi tanpa perlu instalasi terpisah di sistem operasi.

4. **Konfigurasi Environment Backend:**
   * Buat salinan `.env` dari `.env.example`:
     ```bash
     cp .env.example .env
     ```
   * Letakkan file kredensial Firebase Service Account Anda di folder `backend/` dengan nama:
     ```
     backend/serviceAccountKey.json
     ```

5. **Jalankan Server Backend:**
   ```bash
   uvicorn app.main:app --reload --reload-dir app --port 8000
   ```
   * Backend akan aktif di: `http://127.0.0.1:8000`
   * Dokumentasi Swagger API: `http://127.0.0.1:8000/docs`

---

### 3. Setup Frontend (React + Vite)

Buka jendela terminal baru:

1. **Masuk ke folder frontend:**
   ```bash
   cd frontend
   ```

2. **Install Node Packages:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Frontend:**
   * Buat salinan file `.env` dari `.env.example`:
     ```bash
     cp .env.example .env
     ```
   * Buka file `.env` dan masukkan kredensial Firebase Web App Anda:
     ```env
     VITE_FIREBASE_API_KEY=your_api_key_here
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project
     VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

4. **Jalankan Frontend Dev Server:**
   ```bash
   npm run dev
   ```
   * Buka browser dan akses antarmuka Listu di: `http://localhost:5173`

---

## 🌐 Tips: Menjalankan di 2 Laptop Terpisah (Hemat Resource)

Karena proses pemodelan AI dilakukan di backend, Anda dapat membagi beban kerja ke dua laptop:
* **Laptop A (Spesifikasi Kuat / Server AI):** Menjalankan Backend.
* **Laptop B (Laptop Harian / Klien):** Menjalankan Frontend.

**Langkah:**
1. Pastikan kedua laptop terhubung ke jaringan Wi-Fi / LAN yang sama.
2. Di **Laptop A (Backend)**, atur host ke `0.0.0.0` dan jalankan:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *(Ketahui IP lokal Laptop A, misal: `192.168.1.50`)*
3. Di **Laptop B (Frontend)**, edit `frontend/vite.config.ts`, ganti target proxy `127.0.0.1` ke IP Laptop A:
   ```ts
   proxy: {
     '/api': { target: 'http://192.168.1.50:8000', changeOrigin: true },
     '/output': { target: 'http://192.168.1.50:8000', changeOrigin: true },
   }
   ```
4. Jalankan `npm run dev` di Laptop B dan akses `http://localhost:5173`. Laptop B Anda akan tetap dingin dan hemat baterai!

---

## 📁 Struktur Direktori

```
listu/
├── backend/
│   ├── app/
│   │   ├── api/             # Endpoint REST API (tracks, separator, transformer, lyrics)
│   │   ├── core/            # Konfigurasi sistem & inisialisasi Firebase
│   │   ├── schemas/         # Validasi tipe request & response Pydantic
│   │   └── services/        # Engine AI (Vocal Separator, Whisper, MusicGen, Job Queue)
│   ├── output/              # Direktori output file audio & cover
│   ├── requirements.txt     # Dependensi Python
│   └── serviceAccountKey.json # Kredensial Firebase Admin SDK
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Komponen StudioPanel, Scene 3D, Shaders, UI Navigation
│   │   ├── hooks/           # Custom React hooks (usePlayback, useTaskSync)
│   │   ├── services/        # Client API & Firebase Auth
│   │   ├── types/           # Definisi TypeScript
│   │   └── utils/           # Formatters & helper audio/lirik
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 📄 Lisensi & Kontribusi

Proyek ini dikembangkan untuk tujuan akademis dan demonstrasi teknologi audio kecerdasan buatan. Hak cipta milik seluruh kontributor kelompok yang tercantum di atas.
