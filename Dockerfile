# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build static bundle
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend & Static Hosting
# ==========================================
FROM python:3.12-slim AS final

# Install uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app/backend

# Configure Python and uv environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    STATIC_DIR=/app/backend/static \
    AUTO_SEED=true

# Cache and install backend dependencies
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Copy backend source code
COPY backend/ ./
RUN uv sync --frozen --no-dev

# Copy compiled frontend assets from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist /app/backend/static

# Add virtual environment to PATH
ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 8000

# Start FastAPI application with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
