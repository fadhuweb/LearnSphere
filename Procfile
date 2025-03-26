web: cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate && gunicorn myapp.wsgi:application --bind 0.0.0.0:$PORT
worker: cd frontend && npm install && npm run build && serve -s build
