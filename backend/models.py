from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime

# User models
class UserCreate(BaseModel):
    email: str
    name: str
    google_id: str
    avatar_url: Optional[str] = None

class User(BaseModel):
    id: UUID
    email: str
    name: str
    google_id: str
    avatar_url: Optional[str]
    created_at: datetime

class UserInDB(User):
    pass

# Pillar models
class PillarCreate(BaseModel):
    category: str  # 'people', 'interests', 'life_events'
    name: str
    avatar_url: Optional[str] = None

class Pillar(BaseModel):
    id: UUID
    user_id: UUID
    category: str
    name: str
    avatar_url: Optional[str]
    created_at: datetime

# Memory models (updated)
class MemoryRequest(BaseModel):
    content: str
    photos: Optional[List[str]] = []  # List of base64 encoded images

class MemoryResponse(BaseModel):
    id: UUID
    content: str
    entities: List[str]
    categories: List[str]
    emotions: Dict[str, float]
    importance: float
    created_at: datetime
    photos: Optional[List[Dict[str, Any]]] = []
    similarity_score: Optional[float] = None

# Search models
class SearchRequest(BaseModel):
    query: str
    limit: int = 10

# Auth models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class GoogleAuthRequest(BaseModel):
    id_token: str

class OnboardingRequest(BaseModel):
    people: List[PillarCreate]
    interests: List[PillarCreate]
    life_events: List[PillarCreate]