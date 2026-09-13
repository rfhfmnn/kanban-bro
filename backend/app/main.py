from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import boards, invites, members, tasks, users, utility

app = FastAPI(
    title="Kanban Bro Backend API",
    version="1.0.0",
    description="Backend API for Kanban Bro matching openapi.yaml specification.",
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
    return {"status": "ok", "app": "Kanban Bro API"}
