from fastapi import FastAPI
from gemini_client import get_answer_from_gemini

app = FastAPI()

@app.get("/requests")
def get_my_requests():
    return "Hello world"


@app.post("/requests")
def send_my_prompt(
    prompt: str
):
    answer = get_answer_from_gemini(prompt)

    return {"answer": answer}
