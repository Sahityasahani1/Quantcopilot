from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db_pools, close_db_pools, get_pg_pool, get_redis_client
from app.routers import portfolio, websocket, nse_market, fno
from app.schemas import SystemHealthSchema

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db_pools()
    yield
    await close_db_pools()

app: FastAPI = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router, prefix=settings.API_V1_STR)
app.include_router(nse_market.router, prefix=settings.API_V1_STR)
app.include_router(fno.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)

@app.get("/health", response_model=SystemHealthSchema)
async def health_check() -> SystemHealthSchema:
    pg_pool = await get_pg_pool()
    redis_client = await get_redis_client()
    return SystemHealthSchema(
        status="HEALTHY",
        postgres_connected=pg_pool is not None,
        redis_connected=redis_client is not None,
        version=settings.VERSION
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
