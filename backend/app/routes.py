from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth import verify_supabase_token, User

router = APIRouter()
security = HTTPBearer()

@router.get("/me", response_model=User)
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = verify_supabase_token(token)
    return user
