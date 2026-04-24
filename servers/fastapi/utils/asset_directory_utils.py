import os
from typing import Optional
from urllib.parse import urlparse, unquote

from utils.get_env import get_app_data_directory_env, get_user_data_mount_path_env


def _get_user_base_dir(user_id: str) -> str:
    """Return the base directory for a user's data.

    Uses ``USER_DATA_MOUNT_PATH`` when set (Azure Files mount), otherwise
    falls back to ``APP_DATA_DIRECTORY / users / {user_id}``.
    """
    mount = get_user_data_mount_path_env()
    if mount:
        base = os.path.join(mount, user_id)
    else:
        base = os.path.join(get_app_data_directory_env() or "/tmp/presenton", "users", user_id)
    os.makedirs(base, exist_ok=True)
    return base


def get_user_images_directory(user_id: str) -> str:
    d = os.path.join(_get_user_base_dir(user_id), "images")
    os.makedirs(d, exist_ok=True)
    return d


def get_user_exports_directory(user_id: str) -> str:
    d = os.path.join(_get_user_base_dir(user_id), "exports")
    os.makedirs(d, exist_ok=True)
    return d


def get_user_uploads_directory(user_id: str) -> str:
    d = os.path.join(_get_user_base_dir(user_id), "uploads")
    os.makedirs(d, exist_ok=True)
    return d


def get_user_fonts_directory(user_id: str) -> str:
    d = os.path.join(_get_user_base_dir(user_id), "fonts")
    os.makedirs(d, exist_ok=True)
    return d


# ---------------------------------------------------------------------------
# Legacy / global helpers (kept for backward compatibility)
# ---------------------------------------------------------------------------

def get_images_directory():
    images_directory = os.path.join(get_app_data_directory_env(), "images")
    os.makedirs(images_directory, exist_ok=True)
    return images_directory


def get_exports_directory():
    export_directory = os.path.join(get_app_data_directory_env(), "exports")
    os.makedirs(export_directory, exist_ok=True)
    return export_directory


def get_uploads_directory():
    uploads_directory = os.path.join(get_app_data_directory_env(), "uploads")
    os.makedirs(uploads_directory, exist_ok=True)
    return uploads_directory


def resolve_image_path_to_filesystem(path_or_url: str) -> Optional[str]:
    """
    Resolve an image path or URL to an actual filesystem path.

    Handles:
    - /api/v1/ppt/user-files/images/... paths (user-scoped via proxy)
    - /app_data/images/... paths (legacy)
    - /static/... paths
    - HTTP URLs whose path component is an absolute filesystem path
    - Absolute filesystem paths
    - USER_DATA_MOUNT_PATH-based paths

    Returns the filesystem path if the file exists, else None.
    """
    if not path_or_url:
        return None
    # Extract path from HTTP URL if needed
    path = path_or_url
    if path_or_url.startswith("http"):
        try:
            parsed = urlparse(path_or_url)
            path = unquote(parsed.path)
        except Exception:
            return None

    # Handle /api/v1/ppt/user-files/{user_id}/{type}/{filename}
    if path.startswith("/api/v1/ppt/user-files/"):
        mount = get_user_data_mount_path_env()
        if mount:
            parts = path.split("/")
            # parts = ['', 'api', 'v1', 'ppt', 'user-files', user_id, type, filename...]
            if len(parts) >= 8:
                user_id = parts[5]
                file_type = parts[6]
                filename = "/".join(parts[7:])
                actual = os.path.join(mount, user_id, file_type, filename)
                return actual if os.path.isfile(actual) else None

    # Handle /app_data/images/
    if path.startswith("/app_data/images/"):
        relative = path[len("/app_data/images/"):]
        app_data = get_app_data_directory_env()
        if app_data:
            actual = os.path.join(app_data, "images", relative)
            if os.path.isfile(actual):
                return actual
        # Fallback: get_images_directory() + relative
        actual = os.path.join(get_images_directory(), relative)
        return actual if os.path.isfile(actual) else None
    # Handle /app_data/ (other subdirs)
    if path.startswith("/app_data/"):
        relative = path[len("/app_data/"):]
        app_data = get_app_data_directory_env()
        if app_data:
            actual = os.path.join(app_data, relative)
            return actual if os.path.isfile(actual) else None
    # Handle absolute filesystem path (e.g. from HTTP URL path on Mac)
    if path.startswith("/Users/") or path.startswith("/home/") or path.startswith("/var/"):
        return path if os.path.isfile(path) else None
    if "Application Support" in path or ("Library" in path and "images" in path):
        return path if os.path.isfile(path) else None

    # Handle USER_DATA_MOUNT_PATH-based absolute paths
    mount = get_user_data_mount_path_env()
    if mount and path.startswith(mount):
        return path if os.path.isfile(path) else None

    # Handle /static/
    if path.startswith("/static/"):
        relative = path[len("/static/"):]
        actual = os.path.join("static", relative)
        return actual if os.path.isfile(actual) else None
    # Absolute path as-is
    if os.path.isabs(path):
        return path if os.path.isfile(path) else None
    # Relative to images directory
    actual = os.path.join(get_images_directory(), path)
    return actual if os.path.isfile(actual) else None
