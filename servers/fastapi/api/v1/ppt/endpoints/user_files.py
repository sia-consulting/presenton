"""Proxy endpoint for serving user-scoped files with authentication.

Instead of serving user data via static nginx aliases (which bypass auth),
this endpoint streams files from the user's scoped directory, ensuring the
authenticated user can only access their own files.
"""

import mimetypes
import os

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from dependencies.auth import get_current_user_id
from utils.asset_directory_utils import _get_user_base_dir

USER_FILES_ROUTER = APIRouter(prefix="/user-files", tags=["User Files"])

# Allowed subdirectory types to prevent path traversal
_ALLOWED_FILE_TYPES = {"images", "exports", "uploads", "fonts"}


@USER_FILES_ROUTER.get("/{user_id}/{file_type}/{file_path:path}")
async def get_user_file(
    user_id: str,
    file_type: str,
    file_path: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """Serve a file from the authenticated user's scoped directory.

    The ``user_id`` in the URL must match the authenticated user's OID.
    """
    # Ownership check
    if user_id != current_user_id:
        raise HTTPException(status_code=404, detail="File not found")

    if file_type not in _ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Prevent path traversal
    if ".." in file_path or file_path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid file path")

    base_dir = _get_user_base_dir(user_id)
    full_path = os.path.join(base_dir, file_type, file_path)

    # Normalise and verify the path stays within the user directory
    full_path = os.path.realpath(full_path)
    base_dir_real = os.path.realpath(base_dir)
    if not full_path.startswith(base_dir_real):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    media_type, _ = mimetypes.guess_type(full_path)
    return FileResponse(full_path, media_type=media_type or "application/octet-stream")
