import os
import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any

class User(BaseModel):
    id: str
    email: str

def verify_supabase_token(token: str) -> User:
    supabase_url = os.getenv("SUPABASE_URL")
    if not supabase_url:
        raise ValueError("SUPABASE_URL not set")
    
    url = f"{supabase_url}/auth/v1/user"
    headers = {"Authorization": f"Bearer {token}"}
    
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
        
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_data = response.json()
    return User(id=user_data.get("id"), email=user_data.get("email"))
