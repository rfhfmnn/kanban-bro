import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_database
from app.routers import boards, invites, members, tasks, users, utility

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    Base.metadata.create_all(bind=engine)
    if os.getenv("AUTO_SEED", "false").lower() in ("true", "1", "yes"):
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    yield
    # Shutdown: clean up if needed

app = FastAPI(
    title="Kanban Bro Backend API",
    version="1.0.0",
    description="Backend API for Kanban Bro matching openapi.yaml specification with SQLAlchemy persistence.",
    lifespan=lifespan,
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(users.router)
app.include_router(boards.router)
app.include_router(members.router)
app.include_router(tasks.router)
app.include_router(invites.router)
app.include_router(utility.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "app": "Kanban Bro API",
        "persistence": "SQLAlchemy",
        "database": engine.dialect.name,
    }

def get_static_dir() -> Path | None:
    # 1. Explicit env var
    env_dir = os.getenv("STATIC_DIR")
    if env_dir:
        p = Path(env_dir).resolve()
        if p.is_dir():
            return p
    # 2. backend/static (packaged in Docker)
    pkg_static = Path(__file__).resolve().parent.parent / "static"
    if pkg_static.is_dir():
        return pkg_static
    # 3. frontend/dist (monorepo local build)
    frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
    if frontend_dist.is_dir():
        return frontend_dist
    return None

static_dir = get_static_dir()

if static_dir and (static_dir / "index.html").is_file():
    assets_dir = static_dir / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static-assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(static_dir / "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = static_dir / full_path
        if full_path and file_path.is_file():
            return FileResponse(file_path)
        index_file = static_dir / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="Not found")
else:
    @app.get("/")
    def fallback_health_check():
        return {"status": "ok", "app": "Kanban Bro API", "persistence": "SQLAlchemy"}

