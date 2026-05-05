import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.admin import router as admin_router
from .api.dependencies import require_admin_key, require_api_key
from .api.documents import router as documents_router
from .api.extractors import router as extractors_router
from .api.search import fields_router, router as search_router
from .core.embedder import Embedder
from .core.registry import Registry
from .database import make_engine


def create_app(registry: Registry, database_url: str, embedder: Embedder) -> FastAPI:
    engine = make_engine(database_url)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await engine.dispose()
        try:
            from joblib.externals.loky import get_reusable_executor
            get_reusable_executor().shutdown(wait=True, kill_workers=True)
        except Exception:
            pass

    app = FastAPI(title="Vector Search API", lifespan=lifespan)

    origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.registry = registry
    app.state.engine = engine
    app.state.embedder = embedder

    app.include_router(documents_router, dependencies=[Depends(require_api_key)])
    app.include_router(search_router, dependencies=[Depends(require_api_key)])
    app.include_router(fields_router, dependencies=[Depends(require_api_key)])
    app.include_router(extractors_router, dependencies=[Depends(require_api_key)])
    app.include_router(admin_router, dependencies=[Depends(require_admin_key)])

    return app
