#!/bin/sh
# Initialization script for automatic sync on first deploy

echo "=========================================="
echo "Sienge Financial - Initialization Script"
echo "=========================================="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if pg_isready -h db -p 5432 -U sienge_app -d sienge_data > /dev/null 2>&1; then
        echo "✓ PostgreSQL is ready!"
        break
    fi
    echo "  Waiting for database... (attempt $((attempt + 1))/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "✗ Failed to connect to PostgreSQL after $max_attempts attempts"
    exit 1
fi

# Additional wait to ensure database is fully initialized
sleep 5

# Check if this is the first run
echo "Checking if this is the first deployment..."
RECORD_COUNT=$(psql -h db -U sienge_app -d sienge_data -t -c "SELECT COUNT(*) FROM income_data" 2>/dev/null || echo "0")
RECORD_COUNT=$(echo "$RECORD_COUNT" | tr -d '[:space:]')

if [ "$RECORD_COUNT" = "0" ] || [ -z "$RECORD_COUNT" ]; then
    echo "First deployment detected! Starting initial synchronization..."
    echo "=========================================="

    # Use dates from .env file, or fallback to defaults
    if [ -z "$SYNC_START_DATE" ]; then
        START_DATE=$(date -d "3 months ago" +%Y-%m-%d 2>/dev/null || date -v-3m +%Y-%m-%d 2>/dev/null || echo "2024-01-01")
    else
        START_DATE="$SYNC_START_DATE"
    fi

    if [ -z "$SYNC_END_DATE" ]; then
        END_DATE=$(date +%Y-%m-%d)
    else
        END_DATE="$SYNC_END_DATE"
    fi

    echo "Sync period: $START_DATE to $END_DATE"
    echo ""

    # Run Python sync script
    cd /app
    python sync_sienge.py --start-date "$START_DATE" --end-date "$END_DATE"

    if [ $? -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo "✓ Initial synchronization completed successfully!"

        # Show summary
        INCOME_COUNT=$(psql -h db -U sienge_app -d sienge_data -t -c "SELECT COUNT(*) FROM income_data")
        OUTCOME_COUNT=$(psql -h db -U sienge_app -d sienge_data -t -c "SELECT COUNT(*) FROM outcome_data")

        echo "Summary:"
        echo "  - Income records: $INCOME_COUNT"
        echo "  - Outcome records: $OUTCOME_COUNT"
        echo "=========================================="
    else
        echo "✗ Initial synchronization failed"
        exit 1
    fi
else
    echo "Database already contains data (found $RECORD_COUNT income records)"
    echo "Skipping initial synchronization"
    echo "To force a sync, run: python sync_sienge.py"
fi

echo ""
echo "Starting cron service for daily synchronization..."
service cron start

if [ $? -eq 0 ]; then
    echo "✓ Cron service started successfully"
    echo "✓ Daily sync scheduled for 2:00 AM"
else
    echo "⚠ Warning: Could not start cron service"
fi

echo ""
echo "=========================================="
echo "Container is ready!"
echo ""
echo "Available features:"
echo "  • Automatic daily sync at 2:00 AM"
echo "  • Manual sync: docker exec sienge_sync python sync_sienge.py"
echo "  • View logs: docker exec sienge_sync tail -f /var/log/cron.log"
echo "=========================================="
echo ""

# Keep container running and show cron logs
tail -f /var/log/cron.log /dev/null