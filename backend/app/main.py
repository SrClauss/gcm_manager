import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import auth, fleet, intelligence, occurrences, patrol_reports, personnel

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(occurrences.router, prefix="/api/occurrences", tags=["occurrences"])
app.include_router(patrol_reports.router, prefix="/api/patrol-reports", tags=["patrol-reports"])
app.include_router(fleet.router, prefix="/api/fleet", tags=["fleet"])
app.include_router(personnel.router, prefix="/api/personnel", tags=["personnel"])
app.include_router(intelligence.router, prefix="/api/intelligence", tags=["intelligence"])


@app.on_event("startup")
async def startup():
    # Import all models so SQLAlchemy registers them before create_all
    from app.models import fleet, occurrence, patrol_report, personnel, user  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION, "app": settings.APP_NAME}
