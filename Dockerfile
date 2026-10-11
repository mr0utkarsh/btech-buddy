# Railway build context is the repo root, so this Dockerfile
# assembles the backend from backend/ requirements + app code.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

# Railway injects PORT at runtime; default to 8000 for local/Docker use.
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD python -c "import httpx,os; httpx.get('http://127.0.0.1:'+os.environ.get('PORT','8000')+'/api/health', timeout=5).raise_for_status()" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
