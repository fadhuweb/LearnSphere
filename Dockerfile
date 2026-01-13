# --- Stage 1: Build the Frontend ---
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Using legacy-peer-deps to ignore potential dependency conflicts in CI
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# --- Stage 2: Build the Backend & Runtime ---
FROM python:3.10-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libpq-dev \
    default-libmysqlclient-dev \
    libjpeg-dev \
    zlib1g-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files
COPY backend/ ./

# Copy built frontend assets to Django static directory
COPY --from=frontend-builder /app/frontend/dist/ ./static/
# Copy the index.html specifically to templates for Django's TemplateView
RUN mkdir -p templates && cp ./static/index.html ./templates/index.html

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=backend.settings

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000"]
