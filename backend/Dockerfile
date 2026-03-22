FROM python:3.11-slim

# Create non-root user
RUN groupadd -r harbor && useradd -r -g harbor harbor

WORKDIR /app

# Install system deps (curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown -R harbor:harbor /app/data

# Switch to non-root user
USER harbor

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
