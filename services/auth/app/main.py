import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="GenEd Auth Service")

INVESTOR_DEMO = os.getenv("INVESTOR_DEMO", "false").lower() == "true"

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    partner_id: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "GenEd Auth Service Initialized", "demo_mode": INVESTOR_DEMO}

@app.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    if INVESTOR_DEMO:
        return {
            "access_token": "showcase_token_arjun",
            "role": "student",
            "partner_id": "amantya-demo"
        }
    # TODO: Implement actual JWT logic
    return {
        "access_token": "mock_token",
        "role": "student",
        "partner_id": "gened-main"
    }
