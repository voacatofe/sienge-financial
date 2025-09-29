#!/bin/sh
# Cron sync script - Runs daily synchronization

echo "=========================================="
echo "Starting Daily Synchronization"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Calculate date range (last 7 days for daily sync)
END_DATE=$(date +%Y-%m-%d)
START_DATE=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d 2>/dev/null || date --date="7 days ago" +%Y-%m-%d 2>/dev/null || echo "$(date +%Y-%m-01)")

echo "Sync period: $START_DATE to $END_DATE"

# Run sync
cd /app
python sync_sienge.py --start-date "$START_DATE" --end-date "$END_DATE"

if [ $? -eq 0 ]; then
    echo "✓ Daily sync completed successfully"

    # Get counts for logging
    INCOME_COUNT=$(psql -h db -U sienge_app -d sienge_data -t -c "SELECT COUNT(*) FROM income_data WHERE sync_date >= CURRENT_DATE")
    OUTCOME_COUNT=$(psql -h db -U sienge_app -d sienge_data -t -c "SELECT COUNT(*) FROM outcome_data WHERE sync_date >= CURRENT_DATE")

    echo "Today's sync summary:"
    echo "  - Income records updated: $INCOME_COUNT"
    echo "  - Outcome records updated: $OUTCOME_COUNT"
else
    echo "✗ Daily sync failed"
    exit 1
fi

echo "=========================================="
echo "Daily sync finished at $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="