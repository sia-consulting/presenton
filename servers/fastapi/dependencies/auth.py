"""FastAPI dependencies for extracting the authenticated user from the request."""

from fastapi import HTTPException, Request


def get_current_user(request: Request) -> dict:
    """Return the authenticated user dict set by the Entra JWT middleware.

    Raises 401 if the user is not authenticated.
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def get_current_user_id(request: Request) -> str:
    """Return the authenticated user's OID (object ID) from the JWT.

    This is the stable Azure AD identifier for the user, used for
    per-user data isolation.

    Raises 401 if the user is not authenticated.
    """
    user = get_current_user(request)
    oid = user.get("oid")
    if not oid:
        raise HTTPException(
            status_code=401,
            detail="User identity (oid) not found in token",
        )
    return oid
