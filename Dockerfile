# Use Python for Django backend
FROM python:3.10
WORKDIR /Introduction to software assignment

# Install dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy backend files
COPY backend/ .

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000
CMD ["gunicorn", "myapp.wsgi:application", "--bind", "0.0.0.0:8000"]
