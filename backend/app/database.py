from typing import Optional
import asyncpg
import redis.asyncio as aioredis
from app.config import settings
from app.db_init import initialize_database_schema

class DatabaseState:
    pg_pool: Optional[asyncpg.Pool] = None
    redis_pool: Optional[aioredis.Redis] = None

db_state: DatabaseState = DatabaseState()

async def init_db_pools() -> None:
    try:
        db_state.pg_pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        if db_state.pg_pool:
            async with db_state.pg_pool.acquire() as conn:
                await initialize_database_schema(conn)
    except Exception:
        db_state.pg_pool = None

    try:
        db_state.redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
    except Exception:
        db_state.redis_pool = None

async def close_db_pools() -> None:
    if db_state.pg_pool:
        await db_state.pg_pool.close()
    if db_state.redis_pool:
        await db_state.redis_pool.close()

async def get_pg_pool() -> Optional[asyncpg.Pool]:
    return db_state.pg_pool

async def get_redis_client() -> Optional[aioredis.Redis]:
    return db_state.redis_pool
