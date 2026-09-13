from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, SessionLocal, engine
from app.db.seed import seed_database
from app.routers import boards, invites, members, tasks, users, utility

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default data if needed
    Base.metadata.create_all(bind=engine)
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

@app.get("/")
def health_check():
    return {"status": "ok", "app": "Kanban Bro API", "persistence": "SQLAlchemy"}
