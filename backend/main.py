from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from memory_engine import MemoryEngine

# Pydantic models for API
class MemoryRequest(BaseModel):
    content: str
    user_id: str = "default"

class SearchRequest(BaseModel):
    query: str
    user_id: str = "default"
    limit: int = 10

class MemoryResponse(BaseModel):
    id: str
    content: str
    entities: List[str]
    categories: List[str]
    emotions: Dict[str, float]
    importance: float
    created_at: str
    similarity_score: Optional[float] = None

# Initialize FastAPI app
app = FastAPI(title="Memory Palace API", version="1.0.0")

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database configuration - update with your PostgreSQL settings
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432"),
    "database": os.getenv("DB_NAME", "memoria"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

# Initialize memory engine
try:
    memory_engine = MemoryEngine(DB_CONFIG)
except Exception as e:
    print(f"Failed to initialize memory engine: {e}")
    memory_engine = None

@app.get("/")
async def root():
    return {"message": "Memory Palace API is running"}

@app.post("/memories", response_model=Dict[str, str])
async def add_memory(request: MemoryRequest):
    """Add a new memory"""
    if not memory_engine:
        raise HTTPException(status_code=500, detail="Memory engine not initialized")
    
    try:
        memory_id = memory_engine.add_memory(request.content, request.user_id)
        if memory_id:
            return {"id": memory_id, "message": "Memory added successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to add memory")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding memory: {str(e)}")

@app.post("/memories/search", response_model=List[MemoryResponse])
async def search_memories(request: SearchRequest):
    """Search for similar memories"""
    if not memory_engine:
        raise HTTPException(status_code=500, detail="Memory engine not initialized")
    
    try:
        results = memory_engine.search_memories(
            request.query, 
            request.user_id, 
            request.limit
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching memories: {str(e)}")

@app.get("/memories/recent", response_model=List[MemoryResponse])
async def get_recent_memories(user_id: str = "default", limit: int = 20):
    """Get recent memories for a user"""
    if not memory_engine:
        raise HTTPException(status_code=500, detail="Memory engine not initialized")
    
    try:
        memories = memory_engine.get_recent_memories(user_id, limit)
        return memories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recent memories: {str(e)}")

@app.get("/memories/clusters", response_model=Dict[str, List[MemoryResponse]])
async def get_memory_clusters(user_id: str = "default"):
    """Get memories grouped by categories"""
    if not memory_engine:
        raise HTTPException(status_code=500, detail="Memory engine not initialized")
    
    try:
        clusters = memory_engine.get_memory_clusters(user_id)
        return clusters
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting memory clusters: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "memory_engine": "initialized" if memory_engine else "failed",
        "total_memories": memory_engine.index.ntotal if memory_engine else 0
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
    except Exception as e:
        print(f"Server failed to start: {e}")