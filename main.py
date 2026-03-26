from fastapi import FastAPI, Body, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from gemini_client import get_answer_from_gemini
from contextlib import asynccontextmanager
from db import Base, delete_user_requests, engine, get_user_requests, add_request_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    print("Все таблицы созданы")
    yield

app = FastAPI(
    title="AI Bridge",
    lifespan=lifespan
)

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
    user_requests = get_user_requests(ip_address=user_ip_address)
    return user_requests


@app.post("/requests")
def send_prompt(
    request: Request,
    prompt: str = Body(embed=True),
):
    user_ip_address = request.client.host
    answer = get_answer_from_gemini(prompt)
    add_request_data(
        ip_address=user_ip_address,
        prompt=prompt,
        response=answer,
    )

    return {"answer": answer}


@app.delete("/requests", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_requests(request: Request):

    user_ip_address = request.client.host
    
    deleted_count = delete_user_requests(ip_address=user_ip_address)
    
    if deleted_count == 0:
        pass
    else:
        print(f"Удалено {deleted_count} записей для IP: {user_ip_address}")
    
    return None
