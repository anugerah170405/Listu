# Backend Template (FastAPI)

Template backend modular menggunakan Python **FastAPI**.

## 📁 Struktur Direktori

```
backend/
├── app/
│   ├── main.py              # Inisialisasi FastAPI, CORS, dan route register
│   ├── core/
│   │   └── config.py        # Konfigurasi & Environment variables
│   ├── api/
│   │   ├── router.py        # Central API Router
│   │   └── v1/
│   │       ├── health.py    # Endpoint health check
│   │       └── example.py   # Endpoint contoh (CRUD template)
│   ├── schemas/             # Pydantic models (Validasi request/response)
│   ├── models/              # Tempat file ORM/Database (misal: SQLAlchemy)
│   └── services/            # Business logic layer
├── .env.example
├── requirements.txt
└── README.md
```

## 🚀 Cara Menjalankan

### 1. Buat Virtual Environment
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate  # macOS / Linux
# atau .venv\Scripts\activate untuk Windows
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Jalankan Server
```bash
uvicorn app.main:app --reload --reload-dir app --port 8000
```
Server akan berjalan di `http://127.0.0.1:8000`.

- Dokumentasi Swagger UI: `http://127.0.0.1:8000/docs`
- Dokumentasi ReDoc: `http://127.0.0.1:8000/redoc`
- Health check: `http://127.0.0.1:8000/api/v1/health`
