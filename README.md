# CasePilot AI (Demo MVP)

CasePilot AI is an AI Legal Case Investigation Assistant that runs all intelligence tasks through a self-hosted or cloud LLM endpoint. Currently pre-configured to use **Groq** for high-speed, free-tier reasoning.

## Core Guarantee

- Model provider, endpoint, API key, and model name are controlled by environment variables.
- Deployed easily on Render.com with a multi-service configuration.

## Project Structure

```text
backend/
  api/
  routes/
  services/
    ai_service.py
    report_service.py
    pdf_service.py
    document_service.py
  models/
  utils/
  main.py

frontend/
  src/
    components/
    pages/
    services/
    hooks/
    layouts/
```

## Environment Variables

Backend (`backend/.env`):

```env
APP_NAME=CasePilot AI Backend
APP_HOST=0.0.0.0
APP_PORT=5001
APP_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

LLM_PROVIDER=groq
LLM_API_KEY=YOUR_GROQ_API_KEY
LLM_TIMEOUT_SECONDS=120
```

Frontend (`frontend/.env`):

```env
VITE_API_URL=http://localhost:5001/api
```

## Run Backend

```bash
# Setup backend dependencies (run once)
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Run backend server from the repository root
uvicorn backend.main:app --reload --host 0.0.0.0 --port 5001
```


## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

- `POST /api/followup` (multipart form: `incident_description`, `files[]`)
- `POST /api/analyze` (multipart form: `incident_description`, `answers_json`, `files[]`)
- `POST /api/report/pdf` (JSON body: report structure)
- `GET /api/health` (backend + llm diagnostics)
- `GET /health`

## Demo Flow

1. Describe incident.
2. Upload files (PDF/JPG/PNG/JPEG).
3. Generate follow-up questions from the LLM.
4. Answer questions one by one.
5. Generate structured legal report and complaint draft.
6. Download report as PDF.
