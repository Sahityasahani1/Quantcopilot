from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, Any, Optional
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db_pools, close_db_pools, get_pg_pool, get_redis_client
from app.routers import portfolio, websocket, nse_market, fno, strategy
from app.schemas import SystemHealthSchema, IndianMarketPayloadSchema
from app.services.news_scheduler import news_scheduler

import asyncio
from app.services.daily_gnn_service import compute_and_cache_daily_gnn, run_daily_gnn_scheduler
from app.services.live_market_service import live_market_service

async def run_live_market_scheduler():
    while True:
        try:
            await asyncio.sleep(60)
            await live_market_service.refresh_quotes(force=True)
            await websocket.connection_manager.sync_live_quotes_to_clients()
        except asyncio.CancelledError:
            break
        except Exception:
            pass

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await init_db_pools()
    await news_scheduler.start()
    asyncio.create_task(compute_and_cache_daily_gnn(force=False))
    gnn_scheduler_task = asyncio.create_task(run_daily_gnn_scheduler())
    
    # Initialize authentic live market quotes and sync WebSocket state
    websocket.connection_manager.update_from_live_service()
    asyncio.create_task(live_market_service.refresh_quotes(force=False))
    market_scheduler_task = asyncio.create_task(run_live_market_scheduler())

    yield

    market_scheduler_task.cancel()
    gnn_scheduler_task.cancel()
    await news_scheduler.stop()
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
app.include_router(strategy.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router)

@app.get(f"{settings.API_V1_STR}/market/tickers", response_model=IndianMarketPayloadSchema, tags=["Market Alias"])
async def market_tickers_alias(
    exchange: Optional[str] = None,
    redis_client = Depends(get_redis_client)
) -> IndianMarketPayloadSchema:
    """Compatibility alias route mapping /market/tickers to /nse/tickers."""
    return await nse_market.get_indian_market_tickers(exchange=exchange, redis_client=redis_client)

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
