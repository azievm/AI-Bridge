# AI-Bridge

Bridge between the user and the neural network that converts requests into responses using an intuitive interface.

## Stack
- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + TypeScript + Vite + Tailwind
- **LLM:** Google Gemini (`gemini-2.5-flash-lite`)

## Auth system
The project now uses **JWT-based authorization**:
- `POST /auth/register` — create account and receive bearer token
- `POST /auth/login` — login and receive bearer token
- `GET /auth/me` — get current user profile by token
- `GET/POST/DELETE /requests` — available only for authenticated users

Each user has isolated request history in the database (`users` + `chat_requests`).

## Backend setup
```bash
cd backend
pip install -r requirements.txt
```

Create `backend/config.py` with your Gemini API key:

```python
API_KEY = "your_gemini_api_key"
```

Optional (recommended) environment variable for JWT signing:

```bash
export JWT_SECRET="your_strong_secret"
```

Run backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend setup
```bash
cd frontend
npm install
npm run dev
```

For production build (served by backend from `backend/static`), run:

```bash
npm run build
```
