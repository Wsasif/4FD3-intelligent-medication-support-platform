from dataclasses import dataclass
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

# Reads "Authorization: Bearer <token>" from the request.
bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: str            # Supabase user ID (same as profiles.id)
    email: str | None


def _auth_url() -> str:
    return get_settings().supabase_url.rstrip("/") + "/auth/v1"


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    # Downloads Supabase's public keys once and caches them
    return jwt.PyJWKClient(_auth_url() + "/.well-known/jwks.json", cache_keys=True)


def _unauthorized(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    """Return the logged-in user, or stop the request with 401."""
    if creds is None:
        raise _unauthorized("Not logged in")

    token = creds.credentials
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",     # only logged-in users
            issuer=_auth_url(),           # only tokens from OUR (4VD3) project
        )                                 # expiry is checked automatically
    except jwt.PyJWTError:
        raise _unauthorized("Invalid or expired token")

    return CurrentUser(id=claims["sub"], email=claims.get("email"))