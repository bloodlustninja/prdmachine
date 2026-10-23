FROM python:3.11-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Set PYTHONPATH so imports work across the app package
ENV PYTHONPATH=/app

EXPOSE 8000

# Use app.main:app if main.py is inside the app/ directory
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
