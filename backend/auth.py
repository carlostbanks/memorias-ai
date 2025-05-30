from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from google.auth.transport import requests
from google.oauth2 import id_token
import os
from uuid import UUID
from models import User
from database import Database

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

security = HTTPBearer()

class AuthService:
    def __init__(self, database: Database):
        self.db = database
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return {"user_id": user_id}
        except JWTError:
            return None
    
    def verify_google_token(self, id_token_str: str) -> Optional[dict]:
        """Verify Google ID token"""
        try:
            # Verify the token
            idinfo = id_token.verify_oauth2_token(
                id_token_str, requests.Request(), GOOGLE_CLIENT_ID
            )
            
            # Verify the issuer
            if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
                raise ValueError('Wrong issuer.')
            
            return {
                'google_id': idinfo['sub'],
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'avatar_url': idinfo.get('picture', '')
            }
            
        except ValueError as e:
            print(f"Google token verification failed: {e}")
            return None
    
    def authenticate_user(self, google_token: str) -> Optional[User]:
        """Authenticate user with Google token"""
        # Verify Google token
        google_data = self.verify_google_token(google_token)
        if not google_data:
            return None
        
        # Check if user exists
        user = self.db.get_user_by_google_id(google_data['google_id'])
        
        if not user:
            # Create new user
            from models import UserCreate
            user_data = UserCreate(
                email=google_data['email'],
                name=google_data['name'],
                google_id=google_data['google_id'],
                avatar_url=google_data['avatar_url']
            )
            user = self.db.create_user(user_data)
        
        return user

# Dependency to get current user - Fixed for newer FastAPI
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current authenticated user"""
    # Import here to avoid circular imports
    from main import get_auth_service
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    auth_service = get_auth_service()
    token_data = auth_service.verify_token(credentials.credentials)
    if token_data is None:
        raise credentials_exception
    
    try:
        user_id = UUID(token_data["user_id"])
        user = auth_service.db.get_user_by_id(user_id)
        if user is None:
            raise credentials_exception
        return user
    except (ValueError, TypeError):
        raise credentials_exception

# Optional dependency for user (allows anonymous access)
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[User]:
    """Get current user if authenticated, otherwise None"""
    if not credentials:
        return None
    
    try:
        # Import here to avoid circular imports
        from main import get_auth_service
        
        auth_service = get_auth_service()
        token_data = auth_service.verify_token(credentials.credentials)
        if token_data is None:
            return None
        
        user_id = UUID(token_data["user_id"])
        return auth_service.db.get_user_by_id(user_id)
    except (ValueError, TypeError, JWTError):
        return None