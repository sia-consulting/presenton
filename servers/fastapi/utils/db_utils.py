import os
from utils.get_env import get_app_data_directory_env, get_database_url_env
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import ssl


def _int_env(name: str, default: int) -> int:
    """Read an integer from an environment variable, falling back to *default*."""
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def get_pool_kwargs() -> dict:
    """Build SQLAlchemy engine pool keyword arguments from environment variables.

    Supported variables (all optional):
        DB_POOL_SIZE          – max persistent connections (default 5)
        DB_MAX_OVERFLOW       – extra connections above pool_size (default 10)
        DB_POOL_TIMEOUT       – seconds to wait for a connection (default 30)
        DB_POOL_RECYCLE       – seconds before a connection is recycled (default 1800)
        DB_POOL_PRE_PING      – enable connection liveness check (default true)

    For SQLite the pool settings are not applicable and an empty dict is
    returned, since SQLite uses ``StaticPool`` / ``NullPool`` by default.
    """
    return {
        "pool_size": _int_env("DB_POOL_SIZE", 5),
        "max_overflow": _int_env("DB_MAX_OVERFLOW", 10),
        "pool_timeout": _int_env("DB_POOL_TIMEOUT", 30),
        "pool_recycle": _int_env("DB_POOL_RECYCLE", 1800),
        "pool_pre_ping": os.getenv("DB_POOL_PRE_PING", "true").lower()
        not in ("false", "0", "no"),
    }


def _strip_password_from_url(url: str) -> str:
    """Remove the password component from a database URL."""
    split = urlsplit(url)
    if split.password:
        # Reconstruct netloc without password
        userinfo = split.username or ""
        netloc = f"{userinfo}@{split.hostname}"
        if split.port:
            netloc += f":{split.port}"
        return urlunsplit((split.scheme, netloc, split.path, split.query, split.fragment))
    return url


def _ensure_ssl_in_url(url: str) -> str:
    """Ensure ``sslmode=require`` is present in the URL query string.

    Azure Postgres Flexible Server requires SSL.  When using Managed Identity
    the URL often omits sslmode because there is no password to protect, but
    SSL is still mandatory.
    """
    split = urlsplit(url)
    params = parse_qsl(split.query, keep_blank_values=True)
    has_sslmode = any(k.lower() == "sslmode" for k, _ in params)
    if not has_sslmode:
        params.append(("sslmode", "require"))
        new_query = urlencode(params)
        return urlunsplit((split.scheme, split.netloc, split.path, new_query, split.fragment))
    return url


def get_database_url_and_connect_args() -> tuple[str, dict]:
    from utils.azure_db_auth import is_managed_identity_enabled

    database_url = get_database_url_env() or "sqlite:///" + os.path.join(
        get_app_data_directory_env() or "/tmp/presenton", "fastapi.db"
    )

    mi_enabled = is_managed_identity_enabled() and database_url.startswith("postgresql://")

    if mi_enabled:
        # Strip any password from the URL – the token will be injected at
        # connection time via the do_connect event.
        database_url = _strip_password_from_url(database_url)
        # Azure Postgres requires SSL
        database_url = _ensure_ssl_in_url(database_url)

    if database_url.startswith("sqlite://"):
        database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("mysql://"):
        database_url = database_url.replace("mysql://", "mysql+aiomysql://", 1)
    else:
        database_url = database_url

    connect_args = {}
    if "sqlite" in database_url:
        connect_args["check_same_thread"] = False

    try:
        split_result = urlsplit(database_url)
        if split_result.query:
            query_params = parse_qsl(split_result.query, keep_blank_values=True)
            driver_scheme = split_result.scheme
            for k, v in query_params:
                key_lower = k.lower()
                if key_lower == "sslmode" and "postgresql+asyncpg" in driver_scheme:
                    if v.lower() != "disable" and "sqlite" not in database_url:
                        connect_args["ssl"] = ssl.create_default_context()

            database_url = urlunsplit(
                (
                    split_result.scheme,
                    split_result.netloc,
                    split_result.path,
                    "",
                    split_result.fragment,
                )
            )
    except Exception:
        pass

    return database_url, connect_args
