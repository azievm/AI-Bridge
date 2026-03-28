from fastapi import FastAPI, Body, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from gemini_client import get_answer_from_gemini
from contextlib import asynccontextmanager
from db import Base, delete_user_requests, engine, get_user_requests, add_request_data
import json
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    print("Все таблицы созданы")
    yield

app = FastAPI(title="AI Bridge - Frontend Code Generator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/requests")
def get_my_requests(request: Request):
    user_ip_address = request.client.host
    return get_user_requests(ip_address=user_ip_address)


@app.post("/requests")
def send_prompt(request: Request, prompt: str = Body(embed=True)):
    user_ip_address = request.client.host

    gemini_data = get_answer_from_gemini(prompt)          # dict

    add_request_data(
        ip_address=user_ip_address,
        prompt=prompt,
        response=json.dumps(gemini_data)                  # сохраняем как JSON-строку
    )

    return gemini_data                                    # возвращаем сразу {description, code}


@app.delete("/requests", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_requests(request: Request):
    user_ip_address = request.client.host
    deleted_count = delete_user_requests(ip_address=user_ip_address)
    if deleted_count > 0:
        print(f"Удалён последний запрос для IP: {user_ip_address}")
    return None

# Монтируем собранный React
static_dir = Path(__file__).parent / "static"

if static_dir.exists() and (static_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Не перехватываем API-эндпоинты
        if full_path.startswith(("requests", "docs", "redoc", "openapi")):
            raise HTTPException(status_code=404, detail="Not found")
        # Для всех остальных путей отдаём React
        return FileResponse(static_dir / "index.html")
else:
    print("⚠️  Папка backend/static/index.html не найдена. Запусти 'npm run build' в папке frontend")
