import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import Body, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, Field

from db import (
    Base,
    add_request_data,
    create_user,
    delete_user_requests,
    engine,
    get_user_by_email,
    get_user_requests,
)
from gemini_client import get_answer_from_gemini


JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


class AuthRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: EmailStr


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


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return pwd_context.verify(password, hashed_password)


def create_access_token(user_id: int, email: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить токен",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        if user_id is None or email is None:
            raise credentials_error
    except JWTError as ex:
        raise credentials_error from ex

    user = get_user_by_email(email=email)
    if user is None or str(user.id) != str(user_id):
        raise credentials_error
    return user


@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(auth_data: AuthRequest):
    if get_user_by_email(auth_data.email):
        raise HTTPException(status_code=409, detail="Пользователь с таким email уже существует")

    user = create_user(
        email=auth_data.email,
        password_hash=hash_password(auth_data.password),
    )
    return TokenResponse(access_token=create_access_token(user.id, user.email))


@app.post("/auth/login", response_model=TokenResponse)
def login(auth_data: AuthRequest):
    user = get_user_by_email(auth_data.email)
    if user is None or not verify_password(auth_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    return TokenResponse(access_token=create_access_token(user.id, user.email))


@app.get("/auth/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return UserResponse(id=current_user.id, email=current_user.email)


@app.get("/requests")
def get_my_requests(current_user=Depends(get_current_user)):
    return get_user_requests(user_id=current_user.id)


@app.post("/requests")
def send_prompt(
    current_user=Depends(get_current_user),
    prompt: str = Body(embed=True),
):
    gemini_data = get_answer_from_gemini(prompt)

    add_request_data(
        user_id=current_user.id,
        prompt=prompt,
        response=json.dumps(gemini_data),
    )

    return gemini_data


@app.delete("/requests", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_requests(current_user=Depends(get_current_user)):
    delete_user_requests(user_id=current_user.id)
    return None


# Монтируем собранный React
static_dir = Path(__file__).parent / "static"

if static_dir.exists() and (static_dir / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Не перехватываем API-эндпоинты
        if full_path.startswith(("requests", "docs", "redoc", "openapi", "auth")):
            raise HTTPException(status_code=404, detail="Not found")
        # Для всех остальных путей отдаём React
        return FileResponse(static_dir / "index.html")
else:
    print("⚠️  Папка backend/static/index.html не найдена. Запусти 'npm run build' в папке frontend")
