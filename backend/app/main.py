"""FastAPI application entrypoint for Legiferam.ro."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ai, amendments, auth, projects, validator

app = FastAPI(
    title="Legiferam.ro API",
    description="Platformă publică pentru scrierea colaborativă de legislație.",
    version="0.1.0",
)

# In compose, the web app calls the API same-origin via the nginx /api proxy.
# CORS is permissive for local-native dev (vite on :5173 → api on :8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(validator.router)
app.include_router(ai.router)
app.include_router(amendments.router)
