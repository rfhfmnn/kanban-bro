from typing import Optional
from fastapi import Header, HTTPException, status

def get_current_user(x_username: Optional[str] = Header(None, alias="X-Username")) -> str:
    """Extract authenticated username from X-Username header."""
    if not x_username or not x_username.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or empty X-Username header. Authentication required.",
        )
    return x_username.strip().lower()

def get_optional_user(x_username: Optional[str] = Header(None, alias="X-Username")) -> Optional[str]:
    """Extract optional username from X-Username header."""
    if x_username and x_username.strip():
        return x_username.strip().lower()
    return None
