# Dockerfile for Sienge Sync Service
FROM python:3.11-slim

# Install PostgreSQL client, cron and utilities
RUN apt-get update && apt-get install -y \
    postgresql-client \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY sync_sienge.py .
COPY init_sync.sh .
COPY cron_sync.sh .
# Note: .env is NOT copied - use environment variables from docker-compose

# Make scripts executable
RUN chmod +x init_sync.sh cron_sync.sh

# Setup cron job for daily sync at 2 AM
RUN echo "0 2 * * * /bin/sh /app/cron_sync.sh >> /var/log/cron.log 2>&1" > /etc/cron.d/sienge-sync
RUN chmod 0644 /etc/cron.d/sienge-sync
RUN crontab /etc/cron.d/sienge-sync
RUN touch /var/log/cron.log

# Run initialization script
CMD ["/bin/sh", "/app/init_sync.sh"]