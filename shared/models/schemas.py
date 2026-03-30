from pydantic import BaseModel
from typing import Optional, List

class UserRole:
    STUDENT = "student"
    PARENT = "parent"
    PARTNER = "partner"
    ADMIN = "admin"

class UserBase(BaseModel):
    user_id: str
    email: str
    role: str
    partner_id: Optional[str] = None

class ConceptNode(BaseModel):
    node_id: str
    title: str
    description: str
    parent_id: Optional[str] = None

class SocraticPrompt(BaseModel):
    agent_id: str
    concept_id: str
    prompt_text: str
    metadata: Optional[dict] = None

class SocraticResponse(BaseModel):
    user_id: str
    concept_id: str
    response_text: str
    confidence_delta: float
