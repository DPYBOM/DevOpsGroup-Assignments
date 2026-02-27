FROM python:3.14.3-slim

# Set working directory inside container
WORKDIR /app

# Copy dependency file first (better layer caching)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy rest of the application
COPY . .

# Expose Flask port
EXPOSE 5000

# Run app with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]