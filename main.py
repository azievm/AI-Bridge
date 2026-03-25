from fastapi import FastAPI 

app = FastAPI()

@app.get("/requests")
def get_my_requests():
    return "Hello world"
