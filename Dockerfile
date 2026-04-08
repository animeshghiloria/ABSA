# ── ABSA Backend — Hugging Face Spaces Docker ──────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY "ABSA backend/requirements.txt" .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY "ABSA backend/env/"       ./env/
COPY "ABSA backend/tasks/"     ./tasks/
COPY "ABSA backend/server.py"  .
COPY "ABSA backend/openenv.yaml" .

# Copy inference.py from repo root (where OpenEnv expects it)
COPY inference.py .

# HF Spaces uses port 7860
EXPOSE 7860

# Health check for HF Spaces validator
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
