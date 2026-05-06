import os
from supabase import create_client, Client

def get_supabase_client() -> Client:
    url: str = os.environ.get("SUPABASE_URL", "")
    key: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
    
    if not url or not key:
        # Fallback to SUPABASE_ANON_KEY if SERVICE_KEY is not available
        key = os.environ.get("SUPABASE_ANON_KEY", "")
        
    if not url or not key:
        raise ValueError("Supabase URL and Key are required. Check your .env file.")
        
    return create_client(url, key)
