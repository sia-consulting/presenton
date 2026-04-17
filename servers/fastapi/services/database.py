from collections.abc import AsyncGenerator
import os
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy import text
from sqlmodel import SQLModel

from models.sql.async_presentation_generation_status import (
    AsyncPresentationGenerationTaskModel,
)
from models.sql.image_asset import ImageAsset
from models.sql.key_value import KeyValueSqlModel
from models.sql.ollama_pull_status import OllamaPullStatus
from models.sql.presentation import PresentationModel
from models.sql.slide import SlideModel
from models.sql.presentation_layout_code import PresentationLayoutCodeModel
from models.sql.template import TemplateModel
from models.sql.webhook_subscription import WebhookSubscription
from utils.db_utils import get_database_url_and_connect_args, get_pool_kwargs


database_url, connect_args = get_database_url_and_connect_args()

# Apply connection-pool settings for server-class databases (PostgreSQL, MySQL).
# SQLite uses a file-lock model and ignores pool configuration, so we skip it.
_pool_kwargs = get_pool_kwargs() if "sqlite" not in database_url else {}

sql_engine: AsyncEngine = create_async_engine(
    database_url, connect_args=connect_args, **_pool_kwargs
)
async_session_maker = async_sessionmaker(sql_engine, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


# Container DB (Lives inside the container)
container_db_url = "sqlite+aiosqlite:////app/container.db"
container_db_engine: AsyncEngine = create_async_engine(
    container_db_url, connect_args={"check_same_thread": False}
)
container_db_async_session_maker = async_sessionmaker(
    container_db_engine, expire_on_commit=False
)


async def get_container_db_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with container_db_async_session_maker() as session:
        yield session


async def set_data_directory(path: str) -> None:
    """Reconfigure the main SQL engine to use a SQLite database inside *path*.

    This is intended for programmatic / library usage (e.g. an external MCP
    server that creates a temp directory per request).  Call this **before**
    ``create_db_and_tables()`` so the tables are created in the new location.

    The existing default behaviour (env var / static directory) is unchanged
    when this function is never called.
    """
    global sql_engine, async_session_maker, database_url, connect_args, _pool_kwargs

    os.makedirs(path, exist_ok=True)

    new_url = "sqlite+aiosqlite:///" + os.path.join(path, "fastapi.db")
    new_connect_args = {"check_same_thread": False}

    # Dispose the old engine before replacing it.
    await sql_engine.dispose()

    database_url = new_url
    connect_args = new_connect_args
    _pool_kwargs = {}

    sql_engine = create_async_engine(
        new_url, connect_args=new_connect_args, **_pool_kwargs
    )
    async_session_maker = async_sessionmaker(sql_engine, expire_on_commit=False)


# Create Database and Tables
async def create_db_and_tables():
    async with sql_engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: SQLModel.metadata.create_all(
                sync_conn,
                tables=[
                    PresentationModel.__table__,
                    SlideModel.__table__,
                    KeyValueSqlModel.__table__,
                    ImageAsset.__table__,
                    PresentationLayoutCodeModel.__table__,
                    TemplateModel.__table__,
                    WebhookSubscription.__table__,
                    AsyncPresentationGenerationTaskModel.__table__,
                ],
            )
        )
        # Lightweight schema migration for existing DBs: ensure `presentations.theme` exists.
        if database_url.startswith("sqlite"):
            result = await conn.execute(text("PRAGMA table_info(presentations)"))
            column_names = {row[1] for row in result.fetchall()}
            if "theme" not in column_names:
                await conn.execute(text("ALTER TABLE presentations ADD COLUMN theme JSON"))

    async with container_db_engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: SQLModel.metadata.create_all(
                sync_conn,
                tables=[OllamaPullStatus.__table__],
            )
        )


async def dispose_engines():
    """Dispose all engine connection pools.

    Call this during application shutdown (e.g. in a FastAPI ``shutdown``
    event or lifespan context) to release every connection back to the
    database and prevent stale / leaked connections.
    """
    await sql_engine.dispose()
    await container_db_engine.dispose()
