from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import os
from datetime import timedelta
from uuid import UUID

# Import our modules
from memory_engine import MemoryEngine
from database import Database
from auth import AuthService, get_current_user, get_current_user_optional
from models import (
    NextAuthRequest, User, MemoryRequest, MemoryResponse, SearchRequest, Token, 
    GoogleAuthRequest, OnboardingRequest, PillarCreate
)

# Initialize FastAPI app
app = FastAPI(title="Memory Palace API", version="2.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "memoria"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

# Initialize services
try:
    database = Database(DB_CONFIG)
    memory_engine = MemoryEngine(DB_CONFIG)
    auth_service = AuthService(database)
    print("✅ Services initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize services: {e}")
    database = None
    memory_engine = None
    auth_service = None

# Dependency injection - Fixed for newer FastAPI
def get_database():
    if database is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    return database

def get_memory_engine():
    if memory_engine is None:
        raise HTTPException(status_code=500, detail="Memory engine not initialized")
    return memory_engine

def get_auth_service():
    if auth_service is None:
        raise HTTPException(status_code=500, detail="Auth service not initialized")
    return auth_service

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Memory Palace API v2.0 is running"}

# Authentication endpoints
@app.post("/auth/google", response_model=Token)
async def google_auth(
    request: GoogleAuthRequest,
    auth_svc: AuthService = Depends(get_auth_service)
):
    """Authenticate with Google OAuth"""
    user = auth_svc.authenticate_user(request.id_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    
    # Create access token
    access_token = auth_svc.create_access_token(
        data={"sub": str(user.id)}
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user
    )

@app.post("/auth/nextauth", response_model=Token)
async def nextauth_login(
    request: NextAuthRequest,
    auth_svc: AuthService = Depends(get_auth_service)
):
    """Authenticate with NextAuth session data"""
    try:
        # Check if user exists by email
        user = auth_svc.db.get_user_by_email(request.email)
        
        if not user:
            # Create new user from NextAuth data
            from models import UserCreate
            user_data = UserCreate(
                email=request.email,
                name=request.name,
                google_id=request.google_id,
                avatar_url=request.avatar_url
            )
            user = auth_svc.db.create_user(user_data)
            
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to create or find user"
            )
        
        # Create access token
        access_token = auth_svc.create_access_token(
            data={"sub": str(user.id)}
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user
        )
        
    except Exception as e:
        print(f"NextAuth authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

@app.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Onboarding endpoints
@app.post("/onboarding/pillars")
async def save_user_pillars(
    request: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    """Save user pillars during onboarding"""
    try:
        print(f"Received pillars data: {request}")  # Debug log
        
        # Combine all pillars and set categories
        all_pillars = []
        
        # Add people pillars
        for person in request.people:
            pillar = PillarCreate(name=person.name, category="people", avatar_url=person.avatar_url)
            all_pillars.append(pillar)
        
        # Add interest pillars
        for interest in request.interests:
            pillar = PillarCreate(name=interest.name, category="interests", avatar_url=interest.avatar_url)
            all_pillars.append(pillar)
        
        # Add life event pillars
        for event in request.life_events:
            pillar = PillarCreate(name=event.name, category="life_events", avatar_url=event.avatar_url)
            all_pillars.append(pillar)
        
        print(f"Created {len(all_pillars)} pillars to save")  # Debug log
        
        # Save to database
        created_pillars = db.create_pillars(current_user.id, all_pillars)
        
        print(f"Successfully saved {len(created_pillars)} pillars")  # Debug log
        
        return {
            "message": "Pillars saved successfully",
            "count": len(created_pillars)
        }
        
    except Exception as e:
        print(f"Error saving pillars: {e}")  # Debug log
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error saving pillars: {str(e)}")

@app.get("/pillars")
async def get_user_pillars(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    """Get user's pillars"""
    try:
        pillars = db.get_user_pillars(current_user.id)
        
        # Group by category
        grouped_pillars = {
            "people": [p for p in pillars if p.category == "people"],
            "interests": [p for p in pillars if p.category == "interests"],
            "life_events": [p for p in pillars if p.category == "life_events"]
        }
        
        return grouped_pillars
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting pillars: {str(e)}")

# Memory endpoints (updated with authentication)
@app.post("/memories", response_model=Dict[str, str])
async def add_memory(
    request: MemoryRequest,
    current_user: User = Depends(get_current_user),
    memory_engine: MemoryEngine = Depends(get_memory_engine),
    db: Database = Depends(get_database)
):
    """Add a new memory"""
    try:
        # Get user pillars for enhanced categorization
        user_pillars = db.get_user_pillars(current_user.id)
        
        # Add memory with user context
        memory_id = memory_engine.add_memory(
            text=request.content,
            user_id=str(current_user.id),
            user_pillars=user_pillars
        )
        
        if memory_id:
            return {"id": memory_id, "message": "Memory added successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to add memory")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding memory: {str(e)}")

@app.post("/memories/search", response_model=List[MemoryResponse])
async def search_memories(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    memory_engine: MemoryEngine = Depends(get_memory_engine)
):
    """Search for similar memories"""
    try:
        results = memory_engine.search_memories(
            query=request.query,
            user_id=str(current_user.id),
            limit=request.limit
        )
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching memories: {str(e)}")

@app.get("/memories/recent", response_model=List[MemoryResponse])
async def get_recent_memories(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    memory_engine: MemoryEngine = Depends(get_memory_engine)
):
    """Get recent memories for current user"""
    try:
        memories = memory_engine.get_recent_memories(
            user_id=str(current_user.id),
            limit=limit
        )
        return memories
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recent memories: {str(e)}")

@app.get("/memories/clusters", response_model=Dict[str, List[MemoryResponse]])
async def get_memory_clusters(
    current_user: User = Depends(get_current_user),
    memory_engine: MemoryEngine = Depends(get_memory_engine)
):
    """Get memories grouped by categories"""
    try:
        clusters = memory_engine.get_memory_clusters(str(current_user.id))
        return clusters
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting memory clusters: {str(e)}")

@app.get("/memories/calendar")
async def get_memory_calendar(
    year: int,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    memory_engine: MemoryEngine = Depends(get_memory_engine)
):
    """Get memory counts by date for calendar heat map"""
    try:
        # This will be implemented when we add the calendar feature
        # For now, return placeholder data
        return {
            "year": year,
            "month": month,
            "data": {},
            "message": "Calendar data endpoint - to be implemented"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting calendar data: {str(e)}")

@app.get("/onboarding/status")
async def check_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: Database = Depends(get_database)
):
    """Check if user has completed onboarding"""
    try:
        pillars = db.get_user_pillars(current_user.id)
        has_completed_onboarding = len(pillars) > 0
        
        return {
            "completed": has_completed_onboarding,
            "pillar_count": len(pillars)
        }
        
    except Exception as e:
        return {"completed": False, "pillar_count": 0}

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "services": {
            "database": "initialized" if database else "failed",
            "memory_engine": "initialized" if memory_engine else "failed",
            "auth_service": "initialized" if auth_service else "failed"
        },
        "total_memories": memory_engine.index.ntotal if memory_engine else 0
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Memory Palace API v2.0...")
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
    except Exception as e:
        print(f"Server failed to start: {e}")